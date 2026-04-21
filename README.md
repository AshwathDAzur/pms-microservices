# pms-microservices

Microservices-based Project Management System with React 19 + Vite frontend, Nginx reverse proxy, two Express/TypeScript REST APIs, Keycloak 26 OIDC authentication with RS256 JWT verification, MySQL 8 business data store, and PostgreSQL-backed Keycloak realm — fully containerized via Docker Compose with health-check-gated startup ordering.

## Table of Contents

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Running with Docker Compose](#running-with-docker-compose)
- [Local Frontend Development](#local-frontend-development)
- [API Reference](#api-reference)
- [Authentication](#authentication)
- [Database](#database)
- [Directory Structure](#directory-structure)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Tech Stack](#tech-stack)
- [Troubleshooting](#troubleshooting)

## Architecture

The system uses a layered architecture with Nginx as the single entry point:

```
Browser
  │
  ▼
Nginx (port 80) ── reverse proxy / load balancer
  │
  ├── /api/admin/*       → admin-service (port 5000)   strips /api prefix
  ├── /api/management/*  → management-service (port 5001) strips /api prefix
  ├── /realms/*          → keycloak (port 8080)
  ├── ~ ^/admin/.+       → keycloak (port 8080)  admin console (regex, NOT /admin alone)
  ├── /resources/, /js/  → keycloak (port 8080)  static assets
  └── / (catch-all)      → pms-client (port 2407)  React SPA
```

### Services

| Service | Image | Port | Exposed | Purpose |
|---------|-------|------|---------|---------|
| **nginx** | nginx:alpine | 80 | Yes (80:80) | Reverse proxy, load balancer, CORS handling |
| **keycloak** | keycloak:26.5.1 | 8080 | Yes (8080:8080) | OIDC identity provider, JWT token issuer |
| **keycloak-postgres** | postgres:16-alpine | 5432 | No | Keycloak's data store |
| **pms-mysql** | mysql:8.0 | 3306 | No | Business data store for admin/management services |
| **admin-service** | custom build | 5000 | No | REST API for employee/admin operations |
| **management-service** | custom build | 5001 | No | REST API for project/management operations |
| **pms-client** | custom build | 2407 | No | React frontend SPA |

### Key Design Decisions

- **Backend services are NOT exposed to host** — only accessible through Nginx reverse proxy
- **Keycloak is directly exposed** for local development (`npm run dev` at :2407)
- **CORS is handled at Nginx level** — backend services do not include CORS middleware
- **Nginx config is volume-mounted** — changes take effect on `docker compose restart nginx` without rebuild
- **Backend Dockerfiles use multi-stage builds** — code changes require `docker compose build --no-cache <service>`
- **VITE_* env vars are baked at build time** (not runtime) — frontend changes require `docker compose build --no-cache pms-client`

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

# Wait for services to be healthy (typically 30–60 seconds)
# Then open http://localhost in your browser
```

**Default Keycloak credentials** (from `.env`):
- Admin Console: http://localhost:8080 → login with configured `KC_BOOTSTRAP_ADMIN_USERNAME` / `KC_BOOTSTRAP_ADMIN_PASSWORD`

**Default app user** (pre-seeded in realm-export.json):
- Username: `user@example.com`
- Password: `password`

### Local Frontend + Docker Backend

```bash
# Ensure keycloak, nginx, admin-service, management-service are running
docker compose up -d keycloak-postgres keycloak nginx admin-service management-service

# In pms-client directory
cd pms-client
npm install
npm run dev

# Frontend runs at http://localhost:2407
# APIs proxied through Nginx at http://localhost/api
# Keycloak at http://localhost:8080
```

## Environment Variables

### Root `.env` (Docker Compose)

All services read build args and runtime environment from the root `.env`:

| Variable | Example | Description |
|----------|---------|-------------|
| **PostgreSQL** | | |
| `POSTGRES_DB` | `keycloak` | Keycloak database name |
| `POSTGRES_USER` | `keycloak_user` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `secure_pg_password` | PostgreSQL password |
| **Keycloak** | | |
| `KC_DB` | `postgres` | Database provider |
| `KC_DB_URL` | `jdbc:postgresql://keycloak-postgres:5432/keycloak` | JDBC connection string |
| `KC_DB_USERNAME` | `keycloak_user` | Keycloak's DB user |
| `KC_DB_PASSWORD` | `secure_pg_password` | Keycloak's DB password |
| `KC_BOOTSTRAP_ADMIN_USERNAME` | `admin` | Keycloak admin username |
| `KC_BOOTSTRAP_ADMIN_PASSWORD` | `admin_password` | Keycloak admin password |
| `KC_HOSTNAME_STRICT` | `false` | Allow dynamic hostname (required for dev + Docker modes) |
| `KC_PROXY_HEADERS` | `xforwarded` | Trust X-Forwarded-* headers from Nginx |
| **MySQL** | | |
| `MYSQL_ROOT_PASSWORD` | `root_password` | MySQL root password |
| `MYSQL_USER` | `pms_user` | MySQL application user |
| `MYSQL_PASSWORD` | `pms_password` | MySQL application user password |
| `MYSQL_DATABASE` | `pms_db` | Business database name |
| `MYSQL_HOST` | `pms-mysql` | Database host (Docker hostname) |
| `MYSQL_PORT` | `3306` | Database port (internal, not exposed) |
| **Admin Service** | | |
| `ADMIN_SERVICE_PORT` | `5000` | Port (must match Dockerfile EXPOSE) |
| `ADMIN_SERVICE_ENV` | `production` | Node environment |
| `ADMIN_SERVICE_PUBLICKEY` | `-----BEGIN PUBLIC KEY-----...` | RS256 public key from Keycloak |
| `ADMIN_SERVICE_LOG_LEVEL` | `info` | Pino log level (debug, info, warn, error) |
| **Management Service** | | |
| `MANAGEMENT_SERVICE_PORT` | `5001` | Port (must match Dockerfile EXPOSE) |
| `MANAGEMENT_SERVICE_ENV` | `production` | Node environment |
| `MANAGEMENT_SERVICE_PUBLICKEY` | `-----BEGIN PUBLIC KEY-----...` | RS256 public key from Keycloak |
| `MANAGEMENT_SERVICE_LOG_LEVEL` | `info` | Pino log level (debug, info, warn, error) |
| **Frontend (Build-time)** | | |
| `VITE_ENV` | `production` | Vite environment |
| `VITE_API_URL` | `/api` | API base URL (relative in Docker, absolute in dev) |
| `VITE_KEYCLOAK_URL` | `http://localhost/` | Keycloak URL (through Nginx in Docker) |
| `VITE_KEYCLOAK_REALM` | `projectManagementSystem` | Keycloak realm name |
| `VITE_KEYCLOAK_CLIENT_ID` | `pmsWebApp` | Client ID in Keycloak |

### Local Dev `.env` (`pms-client/.env`)

For `npm run dev`:

```env
VITE_API_URL=http://localhost/api
VITE_KEYCLOAK_URL=http://localhost:8080/
VITE_KEYCLOAK_REALM=projectManagementSystem
VITE_KEYCLOAK_CLIENT_ID=pmsWebApp
```

Note: `VITE_KEYCLOAK_URL` points directly to Keycloak (bypassing Nginx) to work with the Vite dev server.

## Running with Docker Compose

### Common Commands

```bash
# Start all services in background
docker compose up -d

# Follow logs of all services
docker compose logs -f

# Follow logs of a specific service
docker compose logs -f admin-service

# Stop all containers (keep volumes)
docker compose stop

# Stop and remove containers (keep volumes)
docker compose down

# Remove containers and volumes
docker compose down -v

# Tear down including external volumes
docker compose down -v
docker volume rm keycloak-postgres-data
```

### After Code Changes

#### Backend Service Code

```bash
# Rebuild and restart a service
docker compose build --no-cache <service-name>
docker compose up -d <service-name>

# Example: Update admin-service
docker compose build --no-cache admin-service
docker compose up -d admin-service
```

#### Frontend Code

```bash
# Rebuild and restart frontend
docker compose build --no-cache pms-client
docker compose up -d pms-client
```

#### Nginx Configuration

```bash
# No rebuild needed — just restart
docker compose restart nginx
```

#### Environment Variables

```bash
# Force container recreation to pick up new env vars
docker compose up -d <service-name> --force-recreate
```

## Local Frontend Development

For faster iteration during frontend development, run `npm run dev` locally while services run in Docker.

### Prerequisites

Ensure these containers are running:

```bash
docker compose up -d keycloak-postgres keycloak nginx admin-service management-service
```

### Start Dev Server

```bash
cd pms-client
npm install
npm run dev
```

Frontend runs at **http://localhost:2407**

- Keycloak (direct): http://localhost:8080
- APIs (through Nginx): http://localhost/api

### Key Points

- Hot module reloading enabled — changes reflect instantly
- Uses `pms-client/.env` (NOT root `.env`)
- TypeScript strict mode enabled
- Source maps included for debugging
- Vite dev server runs on port 2407 (configured in `vite.config.ts`)

## API Reference

### Health Checks (No Auth Required)

Both services expose health endpoints without JWT verification:

```
GET /api/admin/health
GET /api/management/health
```

Response:
```json
{
  "service": "admin-service",
  "status": "UP"
}
```

### Admin Service — `/api/admin` (JWT Required)

Manages employees and user accounts.

| Method | Path | Description | Request Body |
|--------|------|-------------|--------------|
| GET | `/api/admin` | List all employees | — |
| GET | `/api/admin/:id` | Get employee by ID | — |
| POST | `/api/admin` | Create new employee | `{ name, email, role, department, status }` |
| PUT | `/api/admin/:id` | Update employee | `{ name, email, role, department, status }` |
| DELETE | `/api/admin/:id` | Delete employee | — |

**Employee Fields:**
- `id` (number) — unique identifier
- `name` (string) — full name
- `email` (string) — email address
- `role` (string) — job role or title
- `department` (string) — department assignment
- `status` (string) — `active` or `inactive`
- `created_at` (timestamp) — creation timestamp
- `updated_at` (timestamp) — last update timestamp

**Example Request:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost/api/admin
```

### Management Service — `/api/management` (JWT Required)

Manages projects and work assignments.

| Method | Path | Description | Request Body |
|--------|------|-------------|--------------|
| GET | `/api/management` | List all projects | — |
| GET | `/api/management/:id` | Get project by ID | — |
| POST | `/api/management` | Create new project | `{ name, description, status, assigned_to, deadline }` |
| PUT | `/api/management/:id` | Update project | `{ name, description, status, assigned_to, deadline }` |
| DELETE | `/api/management/:id` | Delete project | — |

**Project Fields:**
- `id` (number) — unique identifier
- `name` (string) — project name
- `description` (string) — project description
- `status` (string) — `active`, `on-hold`, or `completed`
- `assigned_to` (number) — employee ID assigned to project
- `deadline` (date) — project deadline
- `created_at` (timestamp) — creation timestamp
- `updated_at` (timestamp) — last update timestamp

**Example Request:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost/api/management
```

## Authentication

### Overview

The system uses **Keycloak 26** (OIDC protocol) with **RS256 JWT tokens**.

- **Realm:** `projectManagementSystem`
- **Client:** `pmsWebApp` (public client, standard flow)
- **Token Expiry:** configurable (default 300s access, 1800s refresh)
- **Key Rotation:** RS256 keys managed by Keycloak

### Frontend Flow

1. User accesses http://localhost
2. React app initializes `keycloak-js` with `onLoad: "login-required"`
3. User redirected to Keycloak login page (http://localhost/auth/realms/projectManagementSystem/protocol/openid-connect/auth)
4. After login, Keycloak redirects back with auth code
5. `keycloak-js` exchanges code for access + refresh tokens
6. **AuthContext** extracts:
   - `realm_access.roles` → user roles
   - `email` → email claim
   - `preferred_username` → username
7. Axios interceptor auto-refreshes token 30s before expiry and adds `Authorization: Bearer {token}` header
8. All API calls are protected

### Backend Verification

**Admin Service** (`src/middleware/authenticate.ts`):
- Verifies JWT signature using RS256 public key from `ADMIN_SERVICE_PUBLICKEY` env var
- Extracts user claims and attaches to `req.user`
- Returns 401 Unauthorized if token is invalid or missing
- **Status:** ENABLED (active in production)

**Management Service** (`src/middleware/authenticate.ts`):
- Same JWT verification logic
- **Status:** ENABLED (active in production)

### Role-Based Access Control (RBAC)

Roles are stored in the JWT claim `realm_access.roles`.

Frontend protection:
```typescript
<ProtectedRoute requiredRoles={["admin", "manager"]} />
```

Backend can be extended to check `req.user.roles` in route handlers.

### Rotating Public Keys

If Keycloak rotates its RS256 signing key:

1. **Get the new public key:**
   - Open Keycloak Admin Console: http://localhost:8080
   - Navigate to: **Realm Settings** → **Keys** → find **RS256** active key
   - Click **Public Key** button to view/copy the key

2. **Update `.env`:**
   ```bash
   ADMIN_SERVICE_PUBLICKEY="-----BEGIN PUBLIC KEY-----\nMIIBIjANBg..."
   MANAGEMENT_SERVICE_PUBLICKEY="-----BEGIN PUBLIC KEY-----\nMIIBIjANBg..."
   ```

3. **Rebuild backend services:**
   ```bash
   docker compose build --no-cache admin-service management-service
   docker compose up -d admin-service management-service
   ```

4. **Verify:**
   ```bash
   docker compose logs admin-service | grep "JWT verification"
   ```

### Valid Redirect URIs

Keycloak client `pmsWebApp` is configured with redirect URIs:
- `http://localhost/*`
- `http://localhost:2407/*`

To add more (e.g., production domains), update `keycloak/realm-export.json` and reimport or use Admin Console.

## Database

### MySQL 8.0 (Business Data)

Single shared instance (`pms-mysql`) for both admin-service and management-service.

**Connection Details:**
- **Host:** `pms-mysql` (Docker hostname)
- **Port:** 3306 (internal, not exposed)
- **Database:** `pms_db` (from `MYSQL_DATABASE` env var)
- **User:** `pms_user` (from `MYSQL_USER`)
- **Password:** `pms_password` (from `MYSQL_PASSWORD`)

### Automatic Initialization

On first container start, `mysql/seed.sql` is auto-executed:

```sql
CREATE TABLE employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(100),
  department VARCHAR(100),
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status ENUM('active', 'on-hold', 'completed') DEFAULT 'active',
  assigned_to INT,
  deadline DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_to) REFERENCES employees(id)
);
```

Sample data is inserted on first run.

### Connecting to MySQL

```bash
# From host (requires port mapping, which is currently internal-only)
# To access MySQL, either:
# 1. Run queries through the services' API endpoints
# 2. Exec into the container:
docker compose exec pms-mysql mysql -u root -p$MYSQL_ROOT_PASSWORD pms_db
```

### PostgreSQL 16 (Keycloak)

Separate instance (`keycloak-postgres`) manages Keycloak's realm data.

- **Volume:** `keycloak-postgres-data` (must be pre-created)
- **Database:** `keycloak` (from `POSTGRES_DB`)
- **User:** `keycloak_user` (from `POSTGRES_USER`)

This is NOT directly accessed by application services — Keycloak manages it internally.

## Directory Structure

```
pms-microservices/
├── README.md                     # This file
├── docker-compose.yml            # Container orchestration
├── .env                          # Environment vars (Docker & production)
├── nginx/
│   └── nginx.conf                # Reverse proxy config (volume-mounted)
├── mysql/
│   └── seed.sql                  # Auto-executed on first MySQL start
├── keycloak/
│   ├── realm-export.json         # Realm config (auto-imported on first start)
│   └── themes/pms/login/         # Custom FreeMarker login theme
├── k8/
│   ├── deploy.sh                 # Kubernetes deploy script
│   └── base/
│       ├── 00-namespace.yaml     # pms namespace
│       ├── 01-secrets.yaml       # JWT public keys, DB credentials
│       ├── 02-configmaps.yaml    # nginx.conf, seed.sql
│       ├── 03-persistent-volumes.yaml
│       ├── 04-keycloak-postgres.yaml   # StatefulSet + PVC
│       ├── 05-mysql.yaml         # Deployment + PVC
│       ├── 06-keycloak.yaml      # Deployment + Service
│       ├── 07-admin-service.yaml # Deployment + Service + HPA
│       ├── 08-management-service.yaml  # Deployment + Service + HPA
│       ├── 09-pms-client.yaml    # Deployment + Service
│       ├── 10-nginx.yaml         # Deployment + Service
│       └── 11-ingress.yaml       # Ingress controller
├── pms-client/                   # React 19 + Vite + TypeScript frontend
│   ├── .env                      # Local dev environment
│   ├── Dockerfile                # Multi-stage build
│   ├── vite.config.ts            # Dev server on port 2407
│   ├── package.json              # Dependencies
│   ├── tsconfig.json
│   └── src/
│       ├── main.tsx              # Entry point
│       ├── App.tsx               # BrowserRouter + AuthProvider setup
│       ├── AppRouter.tsx         # Route definitions
│       ├── ProtectedRoutes.tsx   # Auth + RBAC guard
│       ├── keycloak.ts           # Keycloak JS initialization
│       ├── index.css             # Global styles (dark theme)
│       ├── context/
│       │   └── AuthContext.tsx   # Auth state + token refresh
│       ├── services/
│       │   ├── client.tsx        # Axios instance with interceptor
│       │   └── api.tsx           # API functions + types
│       ├── components/
│       │   ├── sideBar.tsx       # Navigation sidebar
│       │   ├── button.tsx        # Glassmorphism button
│       │   └── loader.tsx        # Loading spinner
│       ├── container/
│       │   ├── applayout/        # Main layout component
│       │   ├── home/             # Home/dashboard page
│       │   ├── admin/            # Admin (employees) page
│       │   ├── projects/         # Projects page
│       │   ├── unauthorized/     # 401 error page
│       │   ├── forbidden/        # 403 error page
│       │   └── pagenotfound/     # 404 error page
│       ├── constant/
│       │   └── routes.json       # Route path constants
│       ├── hooks/
│       │   └── useAuth.ts        # useAuth hook
│       └── assets/               # Icons and images
└── pms-server/
    ├── admin-service/            # Express.js + TypeScript microservice
    │   ├── Dockerfile            # Multi-stage build, port 5000
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       ├── server.ts         # Entry: dotenv + app.listen
    │       ├── app.ts            # Express setup: middleware, routes
    │       ├── adminRouter.ts    # Route definitions
    │       ├── adminController.ts # Request handlers
    │       ├── middleware/
    │       │   └── authenticate.ts   # JWT RS256 verification
    │       ├── routes/
    │       │   └── health.route.ts   # GET /health (no auth)
    │       └── logger/
    │           └── logger.ts     # Pino logger
    └── management-service/       # Express.js + TypeScript (identical structure)
        ├── Dockerfile            # Multi-stage build, port 5001
        ├── package.json
        ├── tsconfig.json
        └── src/
            ├── server.ts
            ├── app.ts
            ├── managementRouter.ts
            ├── managementController.ts
            ├── middleware/
            │   └── authenticate.ts
            ├── routes/
            │   └── health.route.ts
            └── logger/
                └── logger.ts
```

## Kubernetes Deployment

Deploy the entire stack to a Kubernetes cluster using provided manifests.

### Prerequisites

- `kubectl` configured against your cluster
- Container registry (Docker Hub, ECR, GCR, etc.)
- Ingress controller installed (nginx-ingress recommended)
- Sufficient cluster resources (4+ CPU, 4+ GB memory recommended)

### Deploy

#### Option 1: Build and Push Images, Then Deploy

```bash
cd k8
./deploy.sh --registry docker.io/yourorg --build
```

This:
1. Builds `pms-admin-service`, `pms-management-service`, `pms-client` images
2. Pushes to registry at `docker.io/yourorg`
3. Reads `ADMIN_SERVICE_PUBLICKEY` and `MANAGEMENT_SERVICE_PUBLICKEY` from root `.env`
4. Creates Kubernetes Secrets with base64-encoded public keys
5. Applies all 12 manifests in order
6. Waits for Deployments to be ready

#### Option 2: Deploy Existing Images

```bash
cd k8
./deploy.sh --registry docker.io/yourorg --tag v1.0.0
```

Uses pre-built images tagged as `docker.io/yourorg/pms-admin-service:v1.0.0`, etc.

#### Option 3: Preview Manifests (Dry Run)

```bash
cd k8
./deploy.sh --registry docker.io/yourorg --dry-run
```

Prints all manifests without applying.

#### Option 4: Tear Down

```bash
cd k8
./deploy.sh --destroy
```

Removes all `pms` namespace resources.

### What Gets Deployed

| Component | Type | Details |
|-----------|------|---------|
| **pms** | Namespace | Isolation for all PMS resources |
| **JWT Secrets** | Secret | `admin-service-secret`, `management-service-secret` with public keys |
| **ConfigMaps** | ConfigMap | `nginx-config`, `keycloak-config`, `mysql-seed` |
| **keycloak-postgres** | StatefulSet + PVC | PostgreSQL for Keycloak realm data |
| **keycloak** | Deployment + Service | Keycloak OIDC provider, ClusterIP service |
| **pms-mysql** | Deployment + PVC | MySQL for business data, ClusterIP service |
| **admin-service** | Deployment + Service + HPA | REST API, 2 replicas, auto-scales to 5 |
| **management-service** | Deployment + Service + HPA | REST API, 2 replicas, auto-scales to 5 |
| **pms-client** | Deployment + Service | React frontend, 2 replicas |
| **nginx** | Deployment + Service | Reverse proxy, ClusterIP service, can be scaled |
| **pms-ingress** | Ingress | Routes external traffic to Nginx |

### Post-Deployment

```bash
# Check deployment status
kubectl get deployments -n pms
kubectl get pods -n pms

# Get Ingress external IP
kubectl get ingress pms-ingress -n pms
# Output example:
# NAME          CLASS    HOSTS                 ADDRESS         PORTS
# pms-ingress   nginx    pms.example.com       203.0.113.1     80

# Update /etc/hosts for local testing
echo "203.0.113.1 pms.example.com" | sudo tee -a /etc/hosts

# Access the app
open http://pms.example.com

# Stream logs
kubectl logs -f deployment/admin-service -n pms
kubectl logs -f deployment/nginx -n pms

# Exec into a pod for debugging
kubectl exec -it pod/admin-service-abc123 -n pms -- /bin/sh
```

### Updating Deployed Services

```bash
# After pushing a new image
kubectl set image deployment/admin-service \
  admin-service=docker.io/yourorg/pms-admin-service:v1.1.0 \
  -n pms

# Monitor rollout
kubectl rollout status deployment/admin-service -n pms
```

### Customization

Edit `k8/base/11-ingress.yaml` before deploying to set your domain:

```yaml
spec:
  rules:
  - host: your-domain.com  # Change this
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: nginx
            port:
              number: 80
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript 5, Vite 7, React Router 7, Axios, keycloak-js |
| **Backend** | Node.js 20 LTS, Express 4, TypeScript 5, mysql2, jsonwebtoken, Pino (logger), dotenv |
| **Authentication** | Keycloak 26.5.1 (OIDC, OpenID Connect, RS256 JWT) |
| **Business Database** | MySQL 8.0 (shared by both backend services) |
| **Auth Database** | PostgreSQL 16 (Keycloak realm state) |
| **Reverse Proxy** | Nginx (Alpine) — CORS, routing, static assets |
| **Containerization** | Docker, Docker Compose, multi-stage Dockerfiles |
| **Orchestration** | Kubernetes, Helm-compatible (if k8s/Kustomize needed) |

## Troubleshooting

### Containers not starting

```bash
# View logs
docker compose logs -f

# Check service health
docker compose ps

# Restart all
docker compose restart

# Rebuild from scratch
docker compose down -v
docker volume rm keycloak-postgres-data
docker volume create keycloak-postgres-data
docker compose up -d
```

### Keycloak login page blank

- Ensure Keycloak is fully started: `docker compose logs keycloak | grep "UP AND RUNNING"`
- Check browser console for JS errors
- Try incognito mode (clear cookies)
- Verify `KC_HOSTNAME_STRICT=false` in `.env`

### API returns 401 Unauthorized

- Verify token is valid: decode at https://jwt.io
- Check `ADMIN_SERVICE_PUBLICKEY` matches Keycloak's current RS256 key
- Ensure `authenticate.ts` middleware is enabled (not commented out)
- Check logs: `docker compose logs admin-service`

### JWT verification fails after key rotation

```bash
# Get new public key from Keycloak Admin Console
# Update ADMIN_SERVICE_PUBLICKEY and MANAGEMENT_SERVICE_PUBLICKEY in .env

# Rebuild and restart
docker compose build --no-cache admin-service management-service
docker compose up -d admin-service management-service
```

### Frontend env vars not updated after `.env` change

- **Root cause:** `VITE_*` vars are build-time only
- **Solution:** Rebuild the frontend container
  ```bash
  docker compose build --no-cache pms-client
  docker compose up -d pms-client
  ```

### Nginx config changes not taking effect

- **Root cause:** `nginx.conf` is volume-mounted, but needs restart to reload
- **Solution:**
  ```bash
  docker compose restart nginx
  ```

### Local dev: APIs return CORS errors

- Ensure Nginx is running: `docker compose ps`
- Check `VITE_API_URL=http://localhost/api` in `pms-client/.env`
- Verify backend services are healthy: `docker compose logs admin-service`

### MySQL connection refused

```bash
# Check if MySQL is running
docker compose ps pms-mysql

# View MySQL logs
docker compose logs pms-mysql

# Verify connection string matches env vars
# MYSQL_HOST=pms-mysql (Docker hostname, not localhost)
# MYSQL_PORT=3306
# MYSQL_DATABASE=pms_db
```

### Kubernetes pod stuck in Pending

```bash
# Check resource requests/limits vs available capacity
kubectl describe pod <pod-name> -n pms

# View events
kubectl get events -n pms --sort-by='.lastTimestamp'

# Check PVC status
kubectl get pvc -n pms
```

### Ingress not accessible

```bash
# Verify Ingress is created
kubectl get ingress -n pms

# Check if controller can see it
kubectl get svc -n ingress-nginx

# Test DNS resolution
nslookup pms.example.com

# Check Nginx service is ready
kubectl get svc nginx -n pms
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Open a pull request

## License

Proprietary — see LICENSE file for details.
