# pms-microservices

Microservices-based Project Management System with React 19 + Vite frontend, Nginx reverse proxy, BFF (Backend For Frontend) service, two Express/TypeScript REST APIs, Keycloak 26 OIDC authentication with RS256 JWT verification, Redis session store, MySQL 8 business data store, and PostgreSQL-backed Keycloak realm — fully containerized via Docker Compose with health-check-gated startup ordering.

## Table of Contents

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Running with Docker Compose](#running-with-docker-compose)
- [Local Frontend Development](#local-frontend-development)
- [Authentication](#authentication)
- [API Reference](#api-reference)
- [Database](#database)
- [Directory Structure](#directory-structure)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Tech Stack](#tech-stack)
- [Troubleshooting](#troubleshooting)

## Architecture

The system uses a layered architecture with Nginx as the single entry point and a BFF service that owns the OIDC session server-side:

```
Browser (no token ever reaches JS)
  │
  ▼
Nginx (port 80)
  │
  ├── /bff/*             → bff-service (port 4000)   BFF: owns OIDC session + Redis
  ├── /api/admin/*       → admin-service (port 5000)  strips /api prefix
  ├── /api/management/*  → management-service (port 5001) strips /api prefix
  ├── /realms/*          → keycloak (port 8080)
  ├── ~ ^/admin/.+       → keycloak (port 8080)       admin console (regex)
  ├── /resources/, /js/  → keycloak (port 8080)       static assets
  └── / (catch-all)      → pms-client (port 2407)     React SPA
```

### Services

| Service | Image | Port | Exposed | Purpose |
|---------|-------|------|---------|---------|
| **nginx** | nginx:alpine | 80 | Yes (80:80) | Reverse proxy, load balancer, CORS handling |
| **bff-service** | custom build | 4000 | No | BFF: OIDC login/callback, Redis sessions, API proxy |
| **pms-redis** | redis:7-alpine | 6379 | No | HttpOnly session store for BFF |
| **keycloak** | keycloak:26.5.1 | 8080 | Yes (8080:8080) | OIDC identity provider, JWT token issuer |
| **keycloak-postgres** | postgres:16-alpine | 5432 | No | Keycloak's data store |
| **pms-mysql** | mysql:8.0 | 3306 | No | Business data store for admin/management services |
| **admin-service** | custom build | 5000 | No | REST API for employee operations |
| **management-service** | custom build | 5001 | No | REST API for project operations |
| **pms-client** | custom build | 2407 | No | React frontend SPA |

### Key Design Decisions

- **BFF pattern** — tokens never reach the browser; the BFF stores JWT in Redis and issues an HttpOnly session cookie
- **HttpOnly cookie** — `pms_session` cookie is inaccessible to JavaScript; eliminates XSS token theft
- **SameSite=Strict** — session cookie not sent on cross-origin requests; eliminates CSRF
- **Defense in depth** — backend services still verify RS256 JWT independently; if a rogue internal caller has no valid token, they get 401
- **Confidential OIDC client** — `pmsWebApp-bff` holds a `client_secret`; code exchange is server-to-server, browser never sees the token
- **Backend services NOT exposed to host** — only accessible through Nginx and BFF
- **CORS handled at Nginx level** — backend services do not include CORS middleware
- **Nginx config is volume-mounted** — changes take effect on `docker compose restart nginx`
- **VITE_* env vars are baked at build time** — frontend changes require `docker compose build --no-cache pms-client`

## Prerequisites

- **Docker** & **Docker Compose** (v2.0+)
- **Node.js 20+** (for local frontend development only)
- **kubectl** + Kubernetes cluster (for k8s deployment only)
- **Container registry** (for k8s deployment only; Docker Hub, ECR, GCR, etc.)

## Quick Start

### Docker Compose (All Services)

```bash
# First time only — create external PostgreSQL volume
docker volume create keycloak-postgres-data

# Start all services
docker compose up -d

# Wait for services to be healthy (typically 60–90 seconds)
# Then open http://localhost in your browser
```

**Default Keycloak credentials** (from `.env`):
- Admin Console: http://localhost:8080 → login with `admin` / `admin`

**Default app user** (pre-seeded in realm-export.json):
- Username: `user@example.com`
- Password: `password`

### Local Frontend + Docker Backend

```bash
# Ensure these are running in Docker
docker compose up -d keycloak-postgres keycloak pms-redis bff-service nginx admin-service management-service

# In pms-client directory
cd pms-client
npm install
npm run dev

# Frontend runs at http://localhost:2407
# BFF at http://localhost/bff
# APIs proxied through BFF
```

## Environment Variables

### Root `.env` (Docker Compose)

| Variable | Example | Description |
|----------|---------|-------------|
| **PostgreSQL** | | |
| `POSTGRES_DB` | `keycloak` | Keycloak database name |
| `POSTGRES_USER` | `keycloak` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `keycloak_password` | PostgreSQL password |
| **Keycloak** | | |
| `KC_DB` | `postgres` | Database provider |
| `KC_DB_URL` | `jdbc:postgresql://keycloak-postgres:5432/keycloak` | JDBC connection string |
| `KC_DB_USERNAME` | `keycloak` | Keycloak's DB user |
| `KC_DB_PASSWORD` | `keycloak_password` | Keycloak's DB password |
| `KC_BOOTSTRAP_ADMIN_USERNAME` | `admin` | Keycloak admin username |
| `KC_BOOTSTRAP_ADMIN_PASSWORD` | `admin` | Keycloak admin password |
| **MySQL** | | |
| `MYSQL_ROOT_PASSWORD` | `pms_root_password` | MySQL root password |
| `MYSQL_USER` | `pms_user` | MySQL application user |
| `MYSQL_PASSWORD` | `pms_password` | MySQL application user password |
| `MYSQL_DATABASE` | `pms_db` | Business database name |
| `MYSQL_HOST` | `pms-mysql` | Database host (Docker hostname) |
| `MYSQL_PORT` | `3306` | Database port |
| **BFF Service** | | |
| `BFF_SERVICE_PORT` | `4000` | BFF listening port |
| `KEYCLOAK_URL` | `http://keycloak:8080` | Internal Keycloak URL (container-to-container) |
| `KEYCLOAK_PUBLIC_URL` | `http://localhost` | Public Keycloak URL (browser-visible, used in login redirect) |
| `KEYCLOAK_REALM` | `projectManagementSystem` | Keycloak realm name |
| `KEYCLOAK_CLIENT_ID` | `pmsWebApp-bff` | Confidential client ID |
| `KEYCLOAK_CLIENT_SECRET` | `changeme-...` | Client secret (rotate after first boot) |
| `BFF_ORIGIN` | `http://localhost` | Public-facing origin for callback URI |
| `ADMIN_SERVICE_URL` | `http://admin-service:5000` | Internal admin-service URL |
| `MANAGEMENT_SERVICE_URL` | `http://management-service:5001` | Internal management-service URL |
| **Redis** | | |
| `REDIS_HOST` | `pms-redis` | Redis hostname |
| `REDIS_PORT` | `6379` | Redis port |
| **Admin Service** | | |
| `ADMIN_SERVICE_PORT` | `5000` | Port |
| `ADMIN_SERVICE_PUBLICKEY` | `MIIBIjAN...` | RS256 public key from Keycloak |
| `ADMIN_SERVICE_LOG_LEVEL` | `info` | Pino log level |
| **Management Service** | | |
| `MANAGEMENT_SERVICE_PORT` | `5001` | Port |
| `MANAGEMENT_SERVICE_PUBLICKEY` | `MIIBIjAN...` | RS256 public key from Keycloak |
| `MANAGEMENT_SERVICE_LOG_LEVEL` | `info` | Pino log level |
| **Frontend (Build-time)** | | |
| `VITE_ENV` | `production` | Vite environment |
| `VITE_API_URL` | `/bff` | BFF base URL (all API calls go through BFF) |

### Local Dev `.env` (`pms-client/.env`)

```env
VITE_ENV=Development
VITE_API_URL=http://localhost/bff
```

## Running with Docker Compose

### Common Commands

```bash
# Start all services
docker compose up -d

# Follow logs of a specific service
docker compose logs -f bff-service
docker compose logs -f admin-service

# Stop all containers (keep volumes)
docker compose down

# Remove containers and volumes
docker compose down -v
docker volume rm keycloak-postgres-data
```

### After Code Changes

```bash
# Backend service or BFF
docker compose build --no-cache <service-name>
docker compose up -d <service-name>

# Frontend (VITE_* vars are build-time)
docker compose build --no-cache pms-client
docker compose up -d pms-client

# Nginx config (no rebuild — volume-mounted)
docker compose restart nginx

# Env var changes (no rebuild needed)
docker compose up -d <service-name> --force-recreate
```

## Local Frontend Development

```bash
# Start required backend containers
docker compose up -d keycloak-postgres keycloak pms-redis bff-service nginx admin-service management-service

cd pms-client
npm install
npm run dev
# http://localhost:2407
```

- Hot module reloading enabled
- Uses `pms-client/.env` (NOT root `.env`)
- Login redirects through BFF at `http://localhost/bff/login` → Keycloak → `http://localhost/bff/callback`

## Authentication

### Overview

The system implements the **BFF (Backend For Frontend)** pattern with Keycloak 26 OIDC and RS256 JWT verification.

**The fundamental security property:** the access token never reaches the browser. It lives in Redis on the server. The browser only holds an opaque `pms_session` UUID cookie that JS cannot read.

### OIDC Flow (step by step)

```
1. Browser loads app
   → GET /bff/session (sends pms_session cookie if exists)
   → BFF checks Redis → no session → { isAuthenticated: false }
   → AuthContext redirects: window.location.href = /bff/login

2. GET /bff/login
   → BFF sets bff_state cookie (CSRF nonce, HttpOnly)
   → BFF 302 → Keycloak login page
     redirect_uri = http://localhost/bff/callback  ← points to BFF

3. User submits credentials on Keycloak login page
   → Keycloak 302 → /bff/callback?code=abc&state=xyz

4. GET /bff/callback (server-to-server)
   → BFF validates state == bff_state cookie (CSRF check)
   → BFF POST keycloak/token { code, client_secret }
   → Keycloak returns { access_token, refresh_token }
   → TOKEN NEVER REACHES BROWSER
   → BFF stores session in Redis (TTL 1h)
   → BFF sets: Set-Cookie: pms_session=<uuid>; HttpOnly; SameSite=Strict
   → BFF 302 → /

5. Browser loads app again
   → GET /bff/session (cookie auto-sent)
   → BFF Redis lookup → { isAuthenticated: true, email, roles }
   → React renders authenticated app

6. API call (e.g. GET /bff/admin)
   → Browser sends pms_session cookie (auto, HttpOnly)
   → BFF Redis lookup → gets access_token
   → If token near expiry: BFF silently refreshes (server-side)
   → BFF → admin-service: GET /admin  Authorization: Bearer eyJ...
   → admin-service verifies RS256 signature → queries MySQL
   → Response: admin-service → BFF → Browser
```

### Security Properties

| Property | Mechanism |
|----------|-----------|
| Token never in browser JS | BFF stores JWT in Redis; browser only gets opaque UUID cookie |
| XSS cannot steal session | `pms_session` cookie has `HttpOnly` flag |
| CSRF protection | `SameSite=Strict` cookie + `bff_state` nonce validation |
| Defense in depth | admin-service/management-service still verify RS256 JWT independently |
| Confidential client | `client_secret` known only to BFF; code exchange is server-to-server |

### Keycloak Clients

| Client | Type | Used By |
|--------|------|---------|
| `pmsWebApp` | Public | Legacy (kept for reference) |
| `pmsWebApp-bff` | Confidential | BFF service — owns the OIDC session |

### Rotating the Keycloak Client Secret

After first boot, rotate the `KEYCLOAK_CLIENT_SECRET`:

1. Go to Keycloak Admin → `projectManagementSystem` realm → Clients → `pmsWebApp-bff` → Credentials
2. Click **Regenerate**
3. Copy the new secret into root `.env`: `KEYCLOAK_CLIENT_SECRET=<new-secret>`
4. Recreate the BFF container: `docker compose up -d --force-recreate bff-service`

### Rotating the RS256 Public Key

If Keycloak rotates its signing key:

1. Keycloak Admin → Realm Settings → Keys → RS256 → **Public Key**
2. Update `.env`: `ADMIN_SERVICE_PUBLICKEY=<new-key>` and `MANAGEMENT_SERVICE_PUBLICKEY=<new-key>`
3. Rebuild: `docker compose build --no-cache admin-service management-service && docker compose up -d admin-service management-service`

### Role-Based Access Control (RBAC)

Roles come from `realm_access.roles` in the JWT, surfaced to the frontend via `GET /bff/session`:

```tsx
// ProtectedRoutes.tsx
<ProtectedRoute requiredRoles={["admin"]} />
```

Backend services can check `req.user.realm_access.roles` in route handlers.

## API Reference

All API calls from the browser go through the BFF. The BFF injects the Bearer token transparently.

### BFF Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/bff/login` | Initiates OIDC login — redirects to Keycloak |
| GET | `/bff/callback` | OIDC callback — exchanges code, creates session |
| GET | `/bff/session` | Returns `{ isAuthenticated, email, roles }` — never the token |
| POST | `/bff/logout` | Deletes Redis session, clears cookie, ends Keycloak SSO |
| GET | `/bff/health` | Health check |

### Health Checks (No Auth Required)

```
GET /api/admin/health
GET /api/management/health
GET /bff/health
```

### Admin Service — Employee CRUD

All requests go via `GET /bff/admin` (browser) → BFF → `GET /admin` (admin-service).

| Method | Path | Description | Body |
|--------|------|-------------|------|
| GET | `/bff/admin` | List all employees | — |
| GET | `/bff/admin/:id` | Get employee by ID | — |
| POST | `/bff/admin` | Create employee | `{ name, email, role, department, status }` |
| PUT | `/bff/admin/:id` | Update employee | `{ name?, email?, role?, department?, status? }` |
| DELETE | `/bff/admin/:id` | Delete employee | — |

**Employee fields:** `id`, `name`, `email`, `role`, `department`, `status` (`active`/`inactive`), `created_at`, `updated_at`

### Management Service — Project CRUD

| Method | Path | Description | Body |
|--------|------|-------------|------|
| GET | `/bff/management` | List all projects | — |
| GET | `/bff/management/:id` | Get project by ID | — |
| POST | `/bff/management` | Create project | `{ name, description, status, assigned_to?, deadline? }` |
| PUT | `/bff/management/:id` | Update project | `{ name?, description?, status?, assigned_to?, deadline? }` |
| DELETE | `/bff/management/:id` | Delete project | — |

**Project fields:** `id`, `name`, `description`, `status` (`active`/`on-hold`/`completed`), `assigned_to`, `deadline`, `created_at`, `updated_at`

## Database

### MySQL 8.0 (Business Data)

Single shared instance (`pms-mysql`) for both admin-service and management-service.

- **Host:** `pms-mysql` (Docker hostname)
- **Port:** 3306 (internal only)
- **Database:** `pms_db`

`mysql/seed.sql` auto-executes on first container start — creates tables and inserts 5 sample employees + 5 projects.

```bash
# Connect directly for debugging
docker compose exec pms-mysql mysql -u root -p$MYSQL_ROOT_PASSWORD pms_db
```

### Redis 7 (BFF Session Store)

Single instance (`pms-redis`) used exclusively by bff-service.

- **Host:** `pms-redis`
- **Port:** 6379 (internal only)
- **Key format:** `session:<uuid>` → JSON session object (TTL: 3600s)
- Persistence disabled (`--save "" --appendonly no`) — sessions are ephemeral by design

```bash
# Inspect sessions (debugging only)
docker compose exec pms-redis redis-cli keys "session:*"
docker compose exec pms-redis redis-cli get "session:<uuid>"
```

### PostgreSQL 16 (Keycloak)

Separate instance (`keycloak-postgres`) manages Keycloak's realm data.

- **Volume:** `keycloak-postgres-data` (external, must be pre-created)
- Not accessed by application services directly

## Directory Structure

```
pms-microservices/
├── README.md
├── docker-compose.yml
├── .env                          # Root env (Docker/production)
├── nginx/
│   └── nginx.conf                # Reverse proxy config (volume-mounted)
├── mysql/
│   └── seed.sql                  # Auto-executed on first MySQL start
├── keycloak/
│   ├── realm-export.json         # Realm config — includes pmsWebApp-bff client
│   └── themes/pms/login/         # Custom FreeMarker login theme
├── k8/
│   ├── deploy.sh                 # Kubernetes deploy script
│   └── base/
│       ├── 00-namespace.yaml
│       ├── 01-secrets.yaml       # JWT keys, DB creds, BFF client secret
│       ├── 02-configmaps.yaml    # nginx.conf (with /bff/ route), seed.sql
│       ├── 03-persistent-volumes.yaml
│       ├── 04-keycloak-postgres.yaml
│       ├── 05-mysql.yaml
│       ├── 06-keycloak.yaml
│       ├── 07-admin-service.yaml
│       ├── 08-management-service.yaml
│       ├── 09-pms-client.yaml
│       ├── 10-redis.yaml         # Redis session store
│       ├── 11-bff-service.yaml   # BFF: OIDC + session proxy
│       ├── 12-nginx.yaml
│       └── 13-ingress.yaml
├── pms-client/                   # React 19 + Vite + TypeScript
│   ├── .env                      # Local dev: VITE_API_URL=http://localhost/bff
│   ├── Dockerfile
│   └── src/
│       ├── context/
│       │   └── AuthContext.tsx   # Polls /bff/session — no keycloak-js
│       ├── services/
│       │   ├── client.tsx        # Axios with withCredentials:true (sends cookie)
│       │   └── api.tsx           # API calls via /bff/admin, /bff/management
│       ├── components/
│       │   ├── sideBar.tsx
│       │   ├── button.tsx
│       │   └── loader.tsx
│       └── container/
│           ├── applayout/
│           ├── admin/            # Employee CRUD screen
│           ├── projects/         # Project CRUD screen
│           ├── unauthorized/
│           ├── forbidden/
│           └── pagenotfound/
└── pms-server/
    ├── bff-service/              # BFF — Express + TypeScript, port 4000
    │   ├── Dockerfile
    │   └── src/
    │       ├── server.ts         # Connects Redis, starts Express
    │       ├── app.ts            # cookieParser + routes mounted at /bff
    │       ├── routes/
    │       │   ├── auth.route.ts # /login /callback /session /logout /health
    │       │   └── proxy.route.ts # /admin/* /management/* (injects Bearer)
    │       └── session/
    │           └── store.ts      # Redis get/set/delete session
    ├── admin-service/            # Express + TypeScript, port 5000
    │   └── src/
    │       ├── adminRouter.ts
    │       ├── adminController.ts
    │       ├── config/db.ts      # mysql2 connection pool
    │       └── middleware/
    │           └── authenticate.ts # RS256 JWT verify (defense in depth)
    └── management-service/       # Express + TypeScript, port 5001
        └── src/
            ├── managementRouter.ts
            ├── managementController.ts
            ├── config/db.ts
            └── middleware/
                └── authenticate.ts
```

## Kubernetes Deployment

### Prerequisites

- `kubectl` configured against your cluster
- Container registry (Docker Hub, ECR, GCR, etc.)
- Ingress controller installed (nginx-ingress recommended)
- Sufficient cluster resources (4+ CPU, 6+ GB memory recommended)

### Deploy

```bash
cd k8

# Build, push, and deploy all images
./deploy.sh --registry docker.io/yourorg --build

# Deploy pre-built images at a specific tag
./deploy.sh --registry docker.io/yourorg --tag v1.0.0

# Dry run — print manifests without applying
./deploy.sh --registry docker.io/yourorg --dry-run

# Tear down
./deploy.sh --destroy
```

The script:
1. Builds `pms-admin-service`, `pms-management-service`, `pms-bff-service`, `pms-client`
2. Reads `ADMIN_SERVICE_PUBLICKEY`, `MANAGEMENT_SERVICE_PUBLICKEY`, `KEYCLOAK_CLIENT_SECRET` from root `.env`
3. Base64-encodes and patches them into `01-secrets.yaml`
4. Creates `keycloak-realm-config` ConfigMap from `realm-export.json`
5. Applies all 14 manifests in numbered order
6. Waits for all deployments to be healthy

### Before Deploying — Update Domain References

In `k8/base/11-bff-service.yaml`, replace the placeholder domain:

```yaml
- name: KEYCLOAK_PUBLIC_URL
  value: http://your-domain.com   # ← your real domain
- name: BFF_ORIGIN
  value: http://your-domain.com   # ← your real domain
```

In `k8/base/13-ingress.yaml`:

```yaml
spec:
  rules:
  - host: your-domain.com
```

Also update Keycloak's `pmsWebApp-bff` client redirect URI via Admin Console to match your domain.

### What Gets Deployed

| Manifest | Component | Type |
|----------|-----------|------|
| 00 | pms namespace | Namespace |
| 01 | DB creds, JWT keys, BFF secret | Secrets |
| 02 | nginx.conf, seed.sql | ConfigMaps |
| 03 | PVC storage classes | PersistentVolumes |
| 04 | keycloak-postgres | StatefulSet + PVC |
| 05 | pms-mysql | Deployment + PVC |
| 06 | keycloak | Deployment + Service |
| 07 | admin-service | Deployment + Service |
| 08 | management-service | Deployment + Service |
| 09 | pms-client | Deployment + Service |
| 10 | pms-redis | Deployment + Service |
| 11 | bff-service | Deployment + Service |
| 12 | nginx | Deployment + Service |
| 13 | pms-ingress | Ingress |

### Post-Deployment

```bash
kubectl get pods -n pms
kubectl get ingress pms-ingress -n pms

# Stream logs
kubectl logs -f deployment/bff-service -n pms
kubectl logs -f deployment/admin-service -n pms
kubectl logs -f deployment/nginx -n pms
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript 5, Vite 7, React Router 7, Axios |
| **BFF** | Node.js 20, Express 4, TypeScript 5, ioredis, axios, cookie-parser, uuid |
| **Backend** | Node.js 20, Express 4, TypeScript 5, mysql2, jsonwebtoken, Pino |
| **Authentication** | Keycloak 26.5.1 — OIDC Authorization Code flow, RS256 JWT, confidential client |
| **Session Store** | Redis 7 — HttpOnly session store for BFF |
| **Business DB** | MySQL 8.0 — shared by both backend services |
| **Auth DB** | PostgreSQL 16 — Keycloak realm state |
| **Reverse Proxy** | Nginx (Alpine) — routing, rate limiting, security headers |
| **Containerization** | Docker, Docker Compose, multi-stage Dockerfiles |
| **Orchestration** | Kubernetes manifests (14 resources, deploy.sh for any cluster) |

## Troubleshooting

### Login redirects to `keycloak:8080` (host not found)

`KEYCLOAK_PUBLIC_URL` in `.env` must be the **browser-visible** hostname, not the Docker container name.

```env
KEYCLOAK_PUBLIC_URL=http://localhost     # correct for local Docker
KEYCLOAK_URL=http://keycloak:8080        # internal Docker only — never shown to browser
```

After changing: `docker compose up -d --force-recreate bff-service`

### "Client not found" on Keycloak login page

The `pmsWebApp-bff` client was added to `realm-export.json` after Keycloak first imported the realm. Register it via the Admin API:

```bash
TOKEN=$(curl -s -X POST "http://localhost:8080/realms/master/protocol/openid-connect/token" \
  -d "username=admin&password=admin&grant_type=password&client_id=admin-cli" \
  -H "Content-Type: application/x-www-form-urlencoded" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

curl -X POST "http://localhost:8080/admin/realms/projectManagementSystem/clients" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "pmsWebApp-bff",
    "enabled": true,
    "publicClient": false,
    "standardFlowEnabled": true,
    "clientAuthenticatorType": "client-secret",
    "secret": "changeme-replace-after-keycloak-setup",
    "redirectUris": ["http://localhost/bff/callback"],
    "webOrigins": ["http://localhost"],
    "defaultClientScopes": ["web-origins","acr","roles","profile","basic","email"]
  }'
```

### API returns 502 after login

The BFF is missing `ADMIN_SERVICE_URL` or `MANAGEMENT_SERVICE_URL`. Check env vars:

```bash
docker compose exec bff-service printenv | grep SERVICE_URL
# Should show:
# ADMIN_SERVICE_URL=http://admin-service:5000
# MANAGEMENT_SERVICE_URL=http://management-service:5001
```

If missing: add to `.env`, then `docker compose up -d --force-recreate bff-service`.

### API returns 401

```bash
# Check BFF logs — will show "Invalid token" if RS256 key mismatch
docker compose logs bff-service
docker compose logs admin-service

# Verify RS256 public key in .env matches Keycloak's active key
# Keycloak Admin → Realm Settings → Keys → RS256 → Public Key
```

### Session lost after BFF restart

Redis data is in-memory (no persistence). All sessions are cleared on `pms-redis` restart. Users need to log in again — this is expected behaviour for an ephemeral session store.

### Containers not starting

```bash
docker compose ps
docker compose logs -f

# Full reset
docker compose down -v
docker volume rm keycloak-postgres-data
docker volume create keycloak-postgres-data
docker compose up -d
```

### Frontend env vars not updated

`VITE_*` vars are build-time only:

```bash
docker compose build --no-cache pms-client
docker compose up -d pms-client
```

### Kubernetes pod stuck in Pending

```bash
kubectl describe pod <pod-name> -n pms
kubectl get events -n pms --sort-by='.lastTimestamp'
kubectl get pvc -n pms
```

## License

Proprietary — see LICENSE file for details.
