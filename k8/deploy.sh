#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# PMS Kubernetes Deploy Script
#
# Usage:
#   ./deploy.sh [OPTIONS]
#
# Options:
#   --registry   <registry>   Container registry prefix  (required for build+push)
#   --tag        <tag>        Image tag                  (default: git short SHA)
#   --namespace  <ns>         Kubernetes namespace       (default: pms)
#   --build                   Build and push images before deploying
#   --destroy                 Tear down the entire deployment
#   --dry-run                 Print manifests without applying
#
# Examples:
#   ./deploy.sh --registry docker.io/myorg --build
#   ./deploy.sh --registry 123456789.dkr.ecr.us-east-1.amazonaws.com --tag v1.2.0
#   ./deploy.sh --destroy
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MANIFESTS_DIR="$SCRIPT_DIR/base"

REGISTRY=""
TAG="${TAG:-$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || echo "latest")}"
NAMESPACE="pms"
BUILD=false
DESTROY=false
DRY_RUN=false

# ── Argument parsing ──────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --registry)  REGISTRY="$2";   shift 2 ;;
    --tag)       TAG="$2";        shift 2 ;;
    --namespace) NAMESPACE="$2";  shift 2 ;;
    --build)     BUILD=true;      shift   ;;
    --destroy)   DESTROY=true;    shift   ;;
    --dry-run)   DRY_RUN=true;    shift   ;;
    *) echo "Unknown option: $1"; exit 1  ;;
  esac
done

KUBECTL="kubectl"
if [[ "$DRY_RUN" == "true" ]]; then
  KUBECTL="kubectl --dry-run=client"
fi

# ── Helpers ───────────────────────────────────────────────────────────────────
info()    { echo -e "\033[1;34m[INFO]\033[0m  $*"; }
success() { echo -e "\033[1;32m[OK]\033[0m    $*"; }
warn()    { echo -e "\033[1;33m[WARN]\033[0m  $*"; }
error()   { echo -e "\033[1;31m[ERROR]\033[0m $*"; exit 1; }

require() {
  command -v "$1" &>/dev/null || error "'$1' is not installed or not in PATH"
}

# ── Teardown ──────────────────────────────────────────────────────────────────
if [[ "$DESTROY" == "true" ]]; then
  warn "Destroying all PMS resources in namespace '$NAMESPACE'..."
  kubectl delete namespace "$NAMESPACE" --ignore-not-found
  success "Namespace '$NAMESPACE' deleted."
  exit 0
fi

# ── Pre-flight checks ─────────────────────────────────────────────────────────
require kubectl
require docker

info "Checking kubectl cluster connection..."
kubectl cluster-info --request-timeout=5s &>/dev/null || error "Cannot reach Kubernetes cluster. Check your kubeconfig."
success "Cluster reachable."

# ── Build & push images ───────────────────────────────────────────────────────
if [[ "$BUILD" == "true" ]]; then
  [[ -z "$REGISTRY" ]] && error "--registry is required when using --build"

  info "Building and pushing images (tag: $TAG)..."

  services=(
    "pms-admin-service:$ROOT_DIR/pms-server/admin-service"
    "pms-management-service:$ROOT_DIR/pms-server/management-service"
    "pms-client:$ROOT_DIR/pms-client"
  )

  for entry in "${services[@]}"; do
    name="${entry%%:*}"
    context="${entry##*:}"
    full_image="$REGISTRY/$name:$TAG"

    info "Building $full_image ..."
    docker build --no-cache -t "$full_image" "$context"
    info "Pushing $full_image ..."
    docker push "$full_image"
    success "$full_image pushed."
  done
fi

# ── Encode the Keycloak public key into Secrets ───────────────────────────────
PUBLICKEY_FILE="$ROOT_DIR/.env"
if [[ -f "$PUBLICKEY_FILE" ]]; then
  ADMIN_PK=$(grep '^ADMIN_SERVICE_PUBLICKEY=' "$PUBLICKEY_FILE" | cut -d'=' -f2-)
  MGMT_PK=$(grep '^MANAGEMENT_SERVICE_PUBLICKEY=' "$PUBLICKEY_FILE" | cut -d'=' -f2-)

  if [[ -n "$ADMIN_PK" && -n "$MGMT_PK" ]]; then
    info "Injecting public keys from .env into secrets..."
    ADMIN_PK_B64=$(echo -n "$ADMIN_PK" | base64 | tr -d '\n')
    MGMT_PK_B64=$(echo -n "$MGMT_PK" | base64 | tr -d '\n')

    # Patch the secrets YAML in-place (temp file) before applying
    sed "s|REPLACE_WITH_BASE64_ENCODED_PUBLICKEY|$ADMIN_PK_B64|1" \
        "$MANIFESTS_DIR/01-secrets.yaml" | \
    sed "s|REPLACE_WITH_BASE64_ENCODED_PUBLICKEY|$MGMT_PK_B64|1" \
        > /tmp/pms-secrets-patched.yaml

    SECRETS_FILE="/tmp/pms-secrets-patched.yaml"
    success "Public keys encoded and ready."
  else
    warn "Could not extract public keys from .env — skipping key injection."
    SECRETS_FILE="$MANIFESTS_DIR/01-secrets.yaml"
  fi
else
  warn ".env not found — secrets will use placeholder values."
  SECRETS_FILE="$MANIFESTS_DIR/01-secrets.yaml"
fi

# ── Create Keycloak realm ConfigMap from realm-export.json ───────────────────
REALM_FILE="$ROOT_DIR/keycloak/realm-export.json"
if [[ -f "$REALM_FILE" ]]; then
  info "Creating keycloak-realm-config ConfigMap from realm-export.json..."
  $KUBECTL create configmap keycloak-realm-config \
    --from-file=realm-export.json="$REALM_FILE" \
    --namespace="$NAMESPACE" \
    --dry-run=client -o yaml | kubectl apply -f -
  success "keycloak-realm-config applied."
else
  error "keycloak/realm-export.json not found. Cannot configure Keycloak realm."
fi

# ── Substitute image references ───────────────────────────────────────────────
if [[ -n "$REGISTRY" ]]; then
  info "Substituting image registry ($REGISTRY) and tag ($TAG) in manifests..."
  PATCHED_DIR="/tmp/pms-k8s-patched"
  rm -rf "$PATCHED_DIR" && mkdir -p "$PATCHED_DIR"

  for f in "$MANIFESTS_DIR"/*.yaml; do
    filename=$(basename "$f")
    sed \
      -e "s|REGISTRY/pms-admin-service:TAG|$REGISTRY/pms-admin-service:$TAG|g" \
      -e "s|REGISTRY/pms-management-service:TAG|$REGISTRY/pms-management-service:$TAG|g" \
      -e "s|REGISTRY/pms-client:TAG|$REGISTRY/pms-client:$TAG|g" \
      "$f" > "$PATCHED_DIR/$filename"
  done

  # Copy secrets (already patched above)
  cp "$SECRETS_FILE" "$PATCHED_DIR/01-secrets.yaml"
  APPLY_DIR="$PATCHED_DIR"
else
  warn "No --registry specified — images will use REGISTRY/...:TAG placeholders."
  APPLY_DIR="$MANIFESTS_DIR"
fi

# ── Apply manifests ───────────────────────────────────────────────────────────
info "Applying manifests to namespace '$NAMESPACE'..."

# Apply in numbered order for deterministic dependency resolution
for manifest in "$APPLY_DIR"/[0-9]*.yaml; do
  filename=$(basename "$manifest")

  # Skip secrets file from dir — already handled above
  [[ "$filename" == "01-secrets.yaml" && "$APPLY_DIR" == "$MANIFESTS_DIR" ]] && \
    manifest="$SECRETS_FILE"

  info "  Applying $filename..."
  $KUBECTL apply -f "$manifest"
done

success "All manifests applied."

# ── Wait for rollouts ─────────────────────────────────────────────────────────
if [[ "$DRY_RUN" == "false" ]]; then
  info "Waiting for deployments to become ready..."

  deployments=(
    keycloak-postgres
    pms-mysql
    keycloak
    admin-service
    management-service
    pms-client
    nginx
  )

  for dep in "${deployments[@]}"; do
    info "  Waiting: $dep ..."
    kubectl rollout status deployment/"$dep" \
      --namespace="$NAMESPACE" \
      --timeout=300s || warn "$dep rollout timed out — check: kubectl get pods -n $NAMESPACE"
  done

  # ── Summary ─────────────────────────────────────────────────────────────────
  echo ""
  success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  success " PMS deployed successfully!"
  success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  info "Pods:"
  kubectl get pods -n "$NAMESPACE"
  echo ""
  info "Services:"
  kubectl get svc -n "$NAMESPACE"
  echo ""
  info "Ingress:"
  kubectl get ingress -n "$NAMESPACE"
  echo ""
  info "To get the external IP:"
  echo "  kubectl get ingress pms-ingress -n $NAMESPACE"
  echo ""
  info "To stream logs:"
  echo "  kubectl logs -f deployment/nginx -n $NAMESPACE"
  echo "  kubectl logs -f deployment/admin-service -n $NAMESPACE"
  echo "  kubectl logs -f deployment/management-service -n $NAMESPACE"
fi
