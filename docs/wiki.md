# PMS Microservices — GitHub Wiki

---

## Table of Contents

- [Home](#home)
- [Architecture](#architecture)
- [Local Development](#local-development)
- [Docker Compose](#docker-compose)
- [Authentication & Keycloak](#authentication--keycloak)
- [API Reference](#api-reference)
- [Database](#database)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Troubleshooting](#troubleshooting)

---

# Home

Welcome to the official wiki for the **Project Management System (PMS)** built on a microservices architecture.

This system provides full employee and project management through two independent REST APIs, secured by Keycloak OIDC authentication, fronted by an Nginx reverse proxy, and backed by a MySQL 8 database — all containerised with Docker Compose and ready for Kubernetes deployment.

---

# Architecture

## Overview

All external traffic enters through a single Nginx reverse proxy. No backend service is directly reachable from outside the Docker network or Kubernetes cluster.

```
Browser
  │
  ▼
Nginx (port 80)
  │
  ├── /api/admin/*        →  admin-service:5000       (strips /api prefix)
  ├── /api/management/*   →  management-service:5001  (strips /api prefix)
  ├── /realms/*           →  keycloak:8080
  ├── ~ ^/admin/.+        →  keycloak:8080            (admin console, regex)
  ├── /resources/, /js/   →  keycloak:8080            (static assets)
  └── / (catch-all)       →  pms-client:2407          (React SPA)
```

## Services

| Service | Image | Internal Port | Exposed to Host |
|---|---|---|---|
| nginx | nginx:alpine | 80 | Yes — 80:80 |
| keycloak | keycloak:26.5.1 | 8080 | Yes — 8080:8080 (local dev) |
| keycloak-postgres | postgres:16-alpine | 5432 | No |
| pms-mysql | mysql:8.0 | 3306 | No |
| admin-service | custom build | 5000 | No |
| management-service | custom build | 5001 | No |
| pms-client | custom build | 2407 | No |

## Key Architectural Decisions

### Nginx as the Single Entry Point

All API calls, auth redirects, and frontend assets go through Nginx on port 80. Backend services are on an isolated Docker bridge network (`pms-network`) and are never directly reachable.

### CORS at the Nginx Level

CORS headers are added by Nginx using a `map` directive. Backend services have no CORS middleware — this avoids the `origin: '*'` + `credentials: true` browser rejection that is invalid per the CORS spec.

### JWT Authentication (RS256)

Both backend services verify JWTs issued by Keycloak using RS256. The RSA public key is baked into the service at build time via the `PUBLICKEY` environment variable. No service-to-service calls to Keycloak happen at request time.

### Shared MySQL Instance

Both `admin-service` and `management-service` connect to a single `pms-mysql` instance (`pms_db` schema). The schema is initialised automatically on first container start via `/docker-entrypoint-initdb.d/seed.sql`.

### Build-time Frontend Config

`VITE_*` environment variables are baked into the React bundle at Docker build time. Changing them requires a rebuild — not just a restart.

### Startup Ordering

Docker Compose uses `depends_on` with `condition: service_healthy` to gate startup. The full chain is:

```
keycloak-postgres (healthy)
  → keycloak (healthy)
    → pms-mysql (healthy)
      → admin-service (healthy)
      → management-service (healthy)
        → pms-client (started)
          → nginx (started)
```

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 7, React Router 7, Axios, keycloak-js |
| Backend | Node.js 20, Express 4, TypeScript 5, mysql2, jsonwebtoken, Pino |
| Auth | Keycloak 26.5.1 (OIDC, RS256 JWT) |
| Business DB | MySQL 8.0 |
| Auth DB | PostgreSQL 16 |
| Proxy | Nginx Alpine |
| Containerisation | Docker Compose, multi-stage Dockerfiles |
| Kubernetes | Deployments, Services, Ingress, ConfigMaps, Secrets, PVCs |

---

# Local Development

## Prerequisites

- Docker Desktop (running)
- Node.js 20+
- npm 9+

## Two Modes

### Mode 1 — Full Docker Compose

Everything runs in containers. Access the app at `http://localhost`. See the [Docker Compose](#docker-compose) section for full instructions.

### Mode 2 — Frontend local, backends in Docker

The React dev server runs on your machine with hot reload. All backend services run in Docker. This is the recommended mode for UI development.

## Running the Frontend Locally

### Step 1 — Start backend services in Docker

```bash
docker compose up -d keycloak-postgres keycloak pms-mysql admin-service management-service nginx
```

Wait until all containers are healthy:

```bash
docker compose ps
```

### Step 2 — Configure the local env

`pms-client/.env` should contain:

```env
VITE_ENV=Development
VITE_API_URL=http://localhost/api
VITE_KEYCLOAK_URL=http://localhost:8080/
VITE_KEYCLOAK_REALM=projectManagementSystem
VITE_KEYCLOAK_CLIENT_ID=pmsWebApp
```

> `VITE_KEYCLOAK_URL` points directly to Keycloak on port 8080, bypassing Nginx. `VITE_API_URL` goes through Nginx on port 80.

### Step 3 — Start the dev server

```bash
cd pms-client
npm install
npm run dev
```

App is available at `http://localhost:2407`.

## Project Structure

```
pms-microservices/
├── docker-compose.yml
├── .env                            # Docker / production env vars
├── nginx/nginx.conf                # Volume-mounted — no rebuild needed
├── mysql/seed.sql                  # Auto-runs on first MySQL start
├── keycloak/
│   ├── realm-export.json           # Auto-imported on first Keycloak start
│   └── themes/pms/login/           # Custom login theme
├── k8/
│   ├── deploy.sh
│   └── base/                       # Kubernetes manifests (00–11)
├── pms-client/                     # React 19 + Vite + TypeScript
│   ├── .env                        # Local dev env
│   └── src/
│       ├── container/admin/        # Employee CRUD screen
│       ├── container/projects/     # Project CRUD screen
│       ├── services/api.tsx        # All API functions + TypeScript types
│       └── services/client.tsx     # Axios instance with token interceptor
└── pms-server/
    ├── admin-service/              # Express/TypeScript, port 5000
    └── management-service/         # Express/TypeScript, port 5001
```

## Making Backend Code Changes

Backend Dockerfiles use multi-stage builds with `COPY` — no volume mounts. Code changes require a rebuild:

```bash
docker compose build --no-cache admin-service
docker compose up -d admin-service
```

## Making Frontend Changes in Docker

`VITE_*` vars are baked at build time — a rebuild is required:

```bash
docker compose build --no-cache pms-client
docker compose up -d pms-client
```

## Updating nginx.conf

The Nginx config is volume-mounted — no rebuild needed:

```bash
docker compose restart nginx
```

---

# Docker Compose

## First-time Setup

```bash
# Create the external volume (only needed once)
docker volume create keycloak-postgres-data

# Start everything
docker compose up -d
```

All containers start in dependency order. The full startup takes ~60–90 seconds on first run due to Keycloak initialisation.

Access the app at **http://localhost**.

## Checking Status

```bash
docker compose ps
```

All services should show `healthy` except `pms-client` which shows `Up`.

## Common Operations

### Rebuild a service after code changes
```bash
docker compose build --no-cache <service-name>
docker compose up -d <service-name>
```

### Restart Nginx after nginx.conf changes
```bash
docker compose restart nginx
```

> No rebuild needed — `nginx.conf` is volume-mounted.

### Apply env var changes to a service
```bash
docker compose up -d <service-name> --force-recreate
```

> `docker compose restart` reuses the old container and does not pick up env var changes.

### View logs
```bash
docker compose logs -f nginx
docker compose logs -f admin-service
docker compose logs -f management-service
docker compose logs -f keycloak
```

### Tear down (keeps volumes)
```bash
docker compose down
```

### Tear down and remove all data
```bash
docker compose down -v
docker volume rm keycloak-postgres-data
```

## Environment Variables

### Keycloak PostgreSQL

| Variable | Default |
|---|---|
| POSTGRES_DB | keycloak |
| POSTGRES_USER | keycloak |
| POSTGRES_PASSWORD | keycloak_password |

### Keycloak

| Variable | Value |
|---|---|
| KC_DB | postgres |
| KC_DB_URL | jdbc:postgresql://keycloak-postgres:5432/keycloak |
| KC_DB_USERNAME | keycloak |
| KC_DB_PASSWORD | keycloak_password |
| KC_BOOTSTRAP_ADMIN_USERNAME | admin |
| KC_BOOTSTRAP_ADMIN_PASSWORD | admin |

### MySQL

| Variable | Default |
|---|---|
| MYSQL_ROOT_PASSWORD | pms_root_password |
| MYSQL_USER | pms_user |
| MYSQL_PASSWORD | pms_password |
| MYSQL_HOST | pms-mysql |
| MYSQL_PORT | 3306 |
| MYSQL_DATABASE | pms_db |

### Admin Service

| Variable | Description |
|---|---|
| ADMIN_SERVICE_PORT | 5000 |
| ADMIN_SERVICE_ENV | production |
| ADMIN_SERVICE_PUBLICKEY | RSA public key from Keycloak (RS256) |
| ADMIN_SERVICE_LOG_LEVEL | info |

### Management Service

| Variable | Description |
|---|---|
| MANAGEMENT_SERVICE_PORT | 5001 |
| MANAGEMENT_SERVICE_ENV | production |
| MANAGEMENT_SERVICE_PUBLICKEY | RSA public key from Keycloak (RS256) |
| MANAGEMENT_SERVICE_LOG_LEVEL | info |

### Frontend (build-time)

| Variable | Docker | Local Dev |
|---|---|---|
| VITE_API_URL | /api | http://localhost/api |
| VITE_KEYCLOAK_URL | http://localhost/ | http://localhost:8080/ |
| VITE_KEYCLOAK_REALM | projectManagementSystem | projectManagementSystem |
| VITE_KEYCLOAK_CLIENT_ID | pmsWebApp | pmsWebApp |

---

# Authentication & Keycloak

## Overview

Authentication is handled entirely by Keycloak using the OIDC Authorization Code flow. The frontend uses `keycloak-js` and the backend services verify JWTs independently using the Keycloak realm's RS256 public key — no service-to-service calls to Keycloak happen at request time.

## Auth Flow

```
1.  Browser loads React app
2.  keycloak.init({ onLoad: "login-required" })
3.  Redirect to Keycloak login page
4.  User submits credentials
5.  Keycloak redirects back with auth code
6.  keycloak-js exchanges code for access + refresh tokens
7.  AuthContext extracts roles and email from JWT payload
8.  Axios interceptor injects Authorization: Bearer <token> on every request
9.  Token auto-refreshed 30 seconds before expiry
10. Backend middleware verifies JWT signature with RS256 public key
```

## Keycloak Configuration

| Setting | Value |
|---|---|
| Realm | projectManagementSystem |
| Client ID | pmsWebApp |
| Client Type | Public (no client secret) |
| Flow | Standard (Authorization Code) |
| Valid Redirect URIs | http://localhost/*, http://localhost:2407/* |
| Web Origins | http://localhost, http://localhost:2407 |
| KC_HOSTNAME_STRICT | false (dynamic hostname) |
| KC_PROXY_HEADERS | xforwarded |

## Role-Based Access Control

Roles are read from `realm_access.roles` in the JWT. The frontend `ProtectedRoute` component checks roles before rendering a page — users without the required role are redirected to `/forbidden`.

## Accessing the Keycloak Admin Console

```
http://localhost/admin/master/console/
```

> The `/admin` path alone routes to the React frontend. Keycloak's console is only accessible at `/admin/master/console/` or deeper subpaths — enforced by Nginx regex location `~ ^/admin/.+`.

Default credentials: `admin` / `admin`

## Realm Import

On first start, Keycloak automatically imports `keycloak/realm-export.json` via the `--import-realm` flag. This sets up the realm, client, and redirect URIs without any manual configuration.

## Rotating the RS256 Public Key

If Keycloak regenerates its signing key (e.g. after a realm reset):

### Step 1 — Get the new public key

Keycloak Admin Console → **Realm Settings** → **Keys** → find the RS256 row → click **Public key**

Copy the key value (without PEM headers).

### Step 2 — Update .env

```env
ADMIN_SERVICE_PUBLICKEY=<new-key>
MANAGEMENT_SERVICE_PUBLICKEY=<new-key>
```

### Step 3 — Rebuild both services

```bash
docker compose build --no-cache admin-service management-service
docker compose up -d admin-service management-service
```

## Token Refresh

The Axios client (`pms-client/src/services/client.tsx`) calls `keycloak.updateToken(30)` before every request. If the token expires in less than 30 seconds it is silently refreshed. Users are never logged out mid-session due to token expiry.

## Signing Out

Clicking **Logout** in the sidebar calls `keycloak.logout()`, ends the Keycloak session, clears local tokens, and redirects the user back to the login page.

---

# API Reference

All API requests go through Nginx at `http://localhost/api`. Nginx strips the `/api` prefix before forwarding to the backend service.

Both services require a valid Keycloak JWT in the `Authorization: Bearer <token>` header. The `/health` endpoints are unauthenticated.

---

## Admin Service — Employees

Base path: `/api/admin`

### GET /api/admin

Returns all employees ordered by creation date descending.

**Response 200**
```json
[
  {
    "id": 1,
    "name": "Ashwath Kumaran",
    "email": "ashwath.kumaran@psiog.com",
    "role": "Engineering Manager",
    "department": "Engineering",
    "status": "active",
    "created_at": "2026-04-21T10:00:00.000Z",
    "updated_at": "2026-04-21T10:00:00.000Z"
  }
]
```

### GET /api/admin/:id

Returns a single employee by ID.

**Response 200** — employee object
**Response 404** — `{ "message": "Employee not found" }`

### POST /api/admin

Creates a new employee.

**Request body**
```json
{
  "name": "Jane Doe",
  "email": "jane.doe@example.com",
  "role": "Senior Developer",
  "department": "Engineering",
  "status": "active"
}
```

Required fields: `name`, `email`, `role`, `department`
`status` defaults to `active` if omitted.

**Response 201** — created employee object
**Response 400** — missing required fields
**Response 409** — duplicate email

### PUT /api/admin/:id

Updates an existing employee. All fields are optional — only provided fields are updated.

**Response 200** — updated employee object
**Response 404** — employee not found
**Response 409** — duplicate email

### DELETE /api/admin/:id

Deletes an employee by ID.

**Response 204** — no content
**Response 404** — employee not found

### GET /api/admin/health _(no auth required)_

```json
{ "service": "admin-service", "status": "UP" }
```

---

## Management Service — Projects

Base path: `/api/management`

### GET /api/management

Returns all projects ordered by creation date descending.

**Response 200**
```json
[
  {
    "id": 1,
    "name": "PMS Microservices",
    "description": "Project Management System built with microservices architecture",
    "status": "active",
    "assigned_to": "ashwath.kumaran@psiog.com",
    "deadline": "2026-12-31T00:00:00.000Z",
    "created_at": "2026-04-21T10:00:00.000Z",
    "updated_at": "2026-04-21T10:00:00.000Z"
  }
]
```

### GET /api/management/:id

Returns a single project by ID.

**Response 200** — project object
**Response 404** — `{ "message": "Project not found" }`

### POST /api/management

Creates a new project.

**Request body**
```json
{
  "name": "New Feature",
  "description": "Optional description",
  "status": "active",
  "assigned_to": "jane.doe@example.com",
  "deadline": "2026-12-31"
}
```

Required fields: `name`
`status` defaults to `active`. `assigned_to` and `deadline` are optional.

**Response 201** — created project object
**Response 400** — missing name

### PUT /api/management/:id

Updates an existing project. All fields are optional.

**Response 200** — updated project object
**Response 404** — project not found

### DELETE /api/management/:id

Deletes a project by ID.

**Response 204** — no content
**Response 404** — project not found

### GET /api/management/health _(no auth required)_

```json
{ "service": "management-service", "status": "UP" }
```

---

## Status Enums

### Employee status

| Value | Description |
|---|---|
| active | Currently employed |
| inactive | Inactive / departed |

### Project status

| Value | Description |
|---|---|
| active | In progress |
| on-hold | Paused |
| completed | Finished |

---

# Database

## Overview

| Database | Engine | Purpose |
|---|---|---|
| pms_db | MySQL 8.0 | Business data (employees, projects) |
| keycloak | PostgreSQL 16 | Keycloak realm, users, sessions |

Both databases are on the internal `pms-network` and are never directly reachable from the host.

## MySQL — Business Data

### Connection Details

| Setting | Value |
|---|---|
| Host | pms-mysql |
| Port | 3306 |
| Database | pms_db |
| User | pms_user |
| Password | from .env MYSQL_PASSWORD |

### Auto-Initialisation

On first container start, MySQL automatically runs `mysql/seed.sql` via the `/docker-entrypoint-initdb.d/` mechanism. This creates all tables and inserts seed data.

> The seed only runs on a fresh data volume. If `pms-mysql-data` already exists the SQL is not re-run.

### Schema — employees

| Column | Type | Notes |
|---|---|---|
| id | INT AUTO_INCREMENT | Primary key |
| name | VARCHAR(100) | Required |
| email | VARCHAR(150) | Required, unique |
| role | VARCHAR(100) | Required |
| department | VARCHAR(100) | Required |
| status | ENUM('active','inactive') | Default: active |
| created_at | TIMESTAMP | Auto-set on insert |
| updated_at | TIMESTAMP | Auto-updated on change |

### Schema — projects

| Column | Type | Notes |
|---|---|---|
| id | INT AUTO_INCREMENT | Primary key |
| name | VARCHAR(150) | Required |
| description | TEXT | Optional |
| status | ENUM('active','on-hold','completed') | Default: active |
| assigned_to | VARCHAR(150) | Optional |
| deadline | DATE | Optional |
| created_at | TIMESTAMP | Auto-set on insert |
| updated_at | TIMESTAMP | Auto-updated on change |

### Connecting Manually

```bash
docker exec -it pms-mysql mysql -u pms_user -ppms_password pms_db
```

## PostgreSQL — Keycloak

Managed entirely by Keycloak. No manual interaction required.

```bash
docker exec -it keycloak-postgres psql -U keycloak -d keycloak
```

## Resetting the Database

### MySQL only

```bash
docker compose down
docker volume rm pms-microservices_pms-mysql-data
docker compose up -d
```

### Full reset (all data including Keycloak)

```bash
docker compose down
docker volume rm pms-microservices_pms-mysql-data
docker volume rm keycloak-postgres-data
docker volume create keycloak-postgres-data
docker compose up -d
```

---

# Kubernetes Deployment

## Overview

The `k8/` directory contains 12 numbered manifests and a `deploy.sh` script that handles building, pushing, and deploying the entire stack to any Kubernetes cluster.

## Prerequisites

- `kubectl` configured against your target cluster
- Docker (for building images)
- A container registry (Docker Hub, ECR, GCR, ACR, etc.)
- An Ingress controller installed in the cluster

### Installing nginx-ingress controller

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.1/deploy/static/provider/cloud/deploy.yaml
```

## Manifests

| File | Resource | Description |
|---|---|---|
| 00-namespace.yaml | Namespace | `pms` namespace |
| 01-secrets.yaml | Secrets | DB passwords, Keycloak credentials, RS256 public keys |
| 02-configmaps.yaml | ConfigMaps | nginx.conf + MySQL seed SQL |
| 03-persistent-volumes.yaml | PVCs | 2Gi for Postgres, 5Gi for MySQL |
| 04-keycloak-postgres.yaml | Deployment + Service | PostgreSQL 16, headless service |
| 05-mysql.yaml | Deployment + Service | MySQL 8.0, seed from ConfigMap |
| 06-keycloak.yaml | Deployment + Service | Keycloak 26.5.1, initContainer waits for Postgres |
| 07-admin-service.yaml | Deployment + Service | 2 replicas, initContainer waits for MySQL |
| 08-management-service.yaml | Deployment + Service | 2 replicas, initContainer waits for MySQL |
| 09-pms-client.yaml | Deployment + Service | 2 replicas |
| 10-nginx.yaml | Deployment + Service | 2 replicas, ConfigMap-mounted nginx.conf |
| 11-ingress.yaml | Ingress | Routes external traffic to nginx Service |

## deploy.sh

### Usage

```bash
cd k8

# Build images, push, and deploy
./deploy.sh --registry docker.io/yourorg --build

# Deploy only (images already in registry)
./deploy.sh --registry docker.io/yourorg --tag v1.2.0

# Preview manifests without applying
./deploy.sh --registry docker.io/yourorg --dry-run

# Tear down everything
./deploy.sh --destroy
```

### Options

| Flag | Description |
|---|---|
| --registry | Container registry prefix (e.g. docker.io/myorg) |
| --tag | Image tag — defaults to git short SHA |
| --build | Build and push images before deploying |
| --destroy | Delete the entire `pms` namespace |
| --dry-run | Print manifests without applying |

### What the script does

1. Builds and pushes `pms-admin-service`, `pms-management-service`, `pms-client` (if `--build`)
2. Reads public keys from root `.env` and base64-encodes them into the Secrets manifest
3. Creates `keycloak-realm-config` ConfigMap from `keycloak/realm-export.json`
4. Substitutes `REGISTRY` and `TAG` placeholders across all manifests
5. Applies all manifests in numbered order (00 → 11)
6. Waits for each Deployment rollout to complete
7. Prints a summary of pods, services, and ingress

## Before Deploying

### Set your domain in the Ingress

Edit `k8/base/11-ingress.yaml`:

```yaml
rules:
  - host: your-actual-domain.com
```

### Update secrets for production

```bash
echo -n "your-password" | base64
```

Replace the placeholder base64 values in `k8/base/01-secrets.yaml`.

### Adjust storage sizes if needed

Edit `k8/base/03-persistent-volumes.yaml` to change PVC sizes.

## After Deploying

### Get the external IP

```bash
kubectl get ingress pms-ingress -n pms
```

### Quick local test

```bash
echo "<EXTERNAL-IP> your-domain.com" | sudo tee -a /etc/hosts
```

### Check pod status

```bash
kubectl get pods -n pms
```

### Stream logs

```bash
kubectl logs -f deployment/nginx -n pms
kubectl logs -f deployment/admin-service -n pms
kubectl logs -f deployment/management-service -n pms
kubectl logs -f deployment/keycloak -n pms
```

### Describe a failing pod

```bash
kubectl describe pod <pod-name> -n pms
```

## Scaling

```bash
kubectl scale deployment admin-service --replicas=4 -n pms
kubectl scale deployment management-service --replicas=4 -n pms
kubectl scale deployment nginx --replicas=3 -n pms
```

## Startup Order

initContainers enforce dependency ordering at the pod level:

```
keycloak-postgres (readiness probe: pg_isready)
  └── keycloak (initContainer waits for postgres:5432)

pms-mysql (readiness probe: mysqladmin ping)
  ├── admin-service (initContainer waits for mysql:3306)
  └── management-service (initContainer waits for mysql:3306)
```

---

# Troubleshooting

## Docker Compose

### http://localhost shows nothing / connection refused

```bash
docker compose ps
docker logs nginx
docker inspect nginx --format '{{json .State.Health}}'
```

### Nginx 502 Bad Gateway

Nginx resolved an upstream to a stale or public IP. Restart Nginx to re-resolve DNS:

```bash
docker compose restart nginx
```

### Keycloak login page blank or fails to load

1. Check Keycloak is healthy: `docker compose ps`
2. Check logs: `docker logs keycloak`
3. Verify realm was imported: Keycloak Admin → Realms dropdown → `projectManagementSystem` should exist

### 401 from backend (JWT verification fails)

The RS256 public key in `.env` does not match what Keycloak is currently signing with.

1. Get the current key: **Keycloak Admin → Realm Settings → Keys → RS256 → Public key**
2. Update `ADMIN_SERVICE_PUBLICKEY` and `MANAGEMENT_SERVICE_PUBLICKEY` in `.env`
3. Rebuild: `docker compose build --no-cache admin-service management-service`

### Env var changes not taking effect

`docker compose restart` reuses the existing container. Use:

```bash
docker compose up -d <service-name> --force-recreate
```

### Frontend not reflecting VITE_* changes

Frontend env vars are baked at build time. Rebuild:

```bash
docker compose build --no-cache pms-client
docker compose up -d pms-client
```

### MySQL seed data missing

The seed only runs on a fresh volume. To re-seed:

```bash
docker compose down
docker volume rm pms-microservices_pms-mysql-data
docker compose up -d
```

### admin-service or management-service keeps restarting

Check logs for a stale image with old MongoDB references:

```bash
docker logs admin-service
```

If you see `getaddrinfo ENOTFOUND`, rebuild from scratch:

```bash
docker compose build --no-cache admin-service management-service
docker compose up -d admin-service management-service
```

---

## Kubernetes

### Pods stuck in Init state

```bash
kubectl describe pod <pod-name> -n pms
```

Check the `Init Containers` section — the initContainer is waiting for a dependency (Postgres or MySQL) to accept connections.

### ImagePullBackOff

```bash
kubectl describe pod <pod-name> -n pms | grep -A5 "Events:"
```

Add registry credentials if needed:

```bash
kubectl create secret docker-registry regcred \
  --docker-server=<registry> \
  --docker-username=<username> \
  --docker-password=<password> \
  --namespace=pms
```

Then add `imagePullSecrets` to the affected Deployment spec.

### Ingress returns 404

- Verify the Ingress controller is running: `kubectl get pods -n ingress-nginx`
- Check the Ingress resource: `kubectl describe ingress pms-ingress -n pms`
- Ensure the `host` in the Ingress matches the domain you are requesting

### Keycloak public keys not injected into Secrets

Run `deploy.sh` from inside the `k8/` directory so it can locate the root `.env`:

```bash
cd k8
./deploy.sh --registry your-registry
```

### Pod OOMKilled

Increase memory limits in the relevant manifest and reapply:

```bash
kubectl apply -f k8/base/07-admin-service.yaml
kubectl rollout restart deployment/admin-service -n pms
```
