# CLAUDE.md - Project Management System (PMS) Microservices

## Project Overview

A **Project Management System** built as a microservices architecture with a React frontend, Express.js backend services, Keycloak authentication, and Nginx reverse proxy. All services are containerized with Docker Compose.

## Architecture

```
Browser
  |
  v
Nginx (port 80) ── reverse proxy / load balancer
  |
  ├── /api/admin/*       → admin-service (port 5000)   ── rewrite: strips /api prefix
  ├── /api/management/*  → management-service (port 5001) ── rewrite: strips /api prefix
  ├── /realms/*          → keycloak (port 8080)         ── 1:1 proxy
  ├── ~ ^/admin/.+       → keycloak (port 8080)         ── admin console (regex, NOT /admin alone)
  ├── /resources/, /js/  → keycloak (port 8080)         ── static assets
  └── / (catch-all)      → pms-client (port 2407)       ── React SPA
```

### Key architectural decisions
- Backend services are NOT exposed to the host; only accessible through Nginx
- Keycloak port 8080 IS exposed to host for local dev (`npm run dev` at :2407)
- CORS is handled at the Nginx level (not in backend services)
- Nginx config is volume-mounted (changes take effect on `docker compose restart nginx`)
- Backend Dockerfiles use multi-stage builds with COPY (no volume mounts) — code changes require `docker compose build --no-cache <service>`
- VITE_* env vars are baked at Docker build time (not runtime) — frontend changes require `docker compose build --no-cache pms-client`

## Directory Structure

```
pms-microservices/
├── docker-compose.yml          # All services orchestration
├── .env                        # Root env (Docker/production): DB creds, Keycloak config, service keys, VITE_* vars
├── CLAUDE.md                   # This file
├── nginx/
│   └── nginx.conf              # Reverse proxy config (volume-mounted, read-only)
├── keycloak/
│   ├── realm-export.json       # Keycloak realm config (auto-imported on first start)
│   └── themes/pms/login/       # Custom login theme (FreeMarker templates + CSS)
├── pms-client/                 # React frontend (Vite + TypeScript)
│   ├── .env                    # Local dev env (different from root .env)
│   ├── dockerfile              # Multi-stage: build with Vite, serve with `serve`
│   ├── vite.config.ts          # Dev server on port 2407
│   ├── package.json            # React 19, axios, keycloak-js, react-router-dom 7
│   └── src/
│       ├── main.tsx            # Entry point
│       ├── App.tsx             # BrowserRouter + AuthProvider wrapper
│       ├── AppRouter.tsx       # Route definitions with ProtectedRoute
│       ├── ProtectedRoutes.tsx # Auth + RBAC guard (checks roles from Keycloak)
│       ├── keycloak.ts         # Keycloak JS instance initialization
│       ├── context/
│       │   └── AuthContext.tsx  # Auth state: isAuthenticated, roles, email, signOut
│       ├── services/
│       │   ├── client.tsx      # Axios instance with Keycloak token interceptor
│       │   └── api.tsx         # API functions (e.g., getAllEmployees)
│       ├── components/
│       │   ├── sideBar.tsx     # Navigation sidebar (nav buttons + logout)
│       │   ├── button.tsx      # Reusable glassmorphism button
│       │   └── loader.tsx      # Loading spinner component
│       ├── container/
│       │   ├── applayout/      # Main layout: sidebar (fixed 5rem) + content (flex: 1)
│       │   ├── home/           # Home page (fetches employees via API)
│       │   ├── admin/          # Admin page (placeholder)
│       │   ├── unauthorized/   # 401 error page (space-themed animation)
│       │   ├── forbidden/      # 403 error page (space-themed animation)
│       │   └── pagenotfound/   # 404 error page (space-themed animation)
│       ├── constant/
│       │   └── routes.json     # Route path constants: HOME="/", ADMIN="/admin", DASHBOARD="/dashboard"
│       ├── hooks/
│       │   └── useAuth.ts      # Standalone auth hook (alternative to AuthContext)
│       ├── assets/NotFound/    # SVG assets for error pages
│       └── index.css           # Global styles: dark theme, scrollbar, box-sizing
└── pms-server/
    ├── admin-service/          # Express + TypeScript microservice
    │   ├── Dockerfile          # Multi-stage build, port 5000
    │   ├── package.json        # express, jsonwebtoken, pino, cors, dotenv
    │   └── src/
    │       ├── server.ts       # Entry: listens on PORT env var
    │       ├── app.ts          # Express app setup: JSON, urlencoded, cors, routes
    │       ├── adminRouter.ts  # Routes: GET / → getUser
    │       ├── adminController.ts  # Controller: returns user data from req.user
    │       ├── middleware/
    │       │   └── authenticate.ts # JWT verification with RS256 + PUBLICKEY env var
    │       ├── routes/
    │       │   └── health.route.ts # GET /health → { service, status: "UP" }
    │       └── logger/
    │           └── logger.ts   # Pino logger (LOG_LEVEL from env)
    └── management-service/     # Identical structure to admin-service
        ├── Dockerfile          # Multi-stage build, port 5001
        └── src/                # Same structure: server, app, router, controller, middleware
```

## Two Environment Modes

### Docker deployment (all containers via `docker compose up`)
- **Root `.env`** is used by docker-compose for build args and runtime env
- `VITE_API_URL=/api` (relative — resolves to same origin, e.g., `http://localhost/api`)
- `VITE_KEYCLOAK_URL=http://localhost/` (through Nginx)
- All traffic goes through Nginx on port 80

### Local development (`npm run dev` in pms-client)
- **`pms-client/.env`** is used by Vite dev server
- `VITE_API_URL=http://localhost/api` (absolute — points to Nginx on port 80)
- `VITE_KEYCLOAK_URL=http://localhost:8080/` (direct to Keycloak, bypassing Nginx)
- Frontend runs on `localhost:2407`, Keycloak on `localhost:8080`, APIs through Nginx on `localhost:80`
- Requires at minimum: keycloak-postgres, keycloak, nginx, admin-service, management-service to be running

## Authentication Flow

1. **Frontend init**: `keycloak.init({ onLoad: "login-required" })` in `AuthContext.tsx`
2. **Redirect to Keycloak**: User sent to Keycloak login page
3. **Post-login**: Keycloak redirects back with auth code, keycloak-js exchanges for tokens
4. **Token extraction**: `AuthContext` reads `realm_access.roles` and `email` from JWT
5. **API calls**: Axios interceptor in `client.tsx` auto-refreshes token (30s threshold) and adds `Authorization: Bearer {token}`
6. **Backend verification**: `authenticate.ts` middleware verifies JWT with RS256 using `PUBLICKEY` env var
7. **Route protection**: `ProtectedRoutes.tsx` checks `isAuthenticated` and optionally `requiredRoles`

### Keycloak configuration
- **Realm**: `projectManagementSystem`
- **Client**: `pmsWebApp` (public client, standard flow)
- **Valid redirect URIs**: `http://localhost/*`, `http://localhost:2407/*`
- **Web origins**: `http://localhost`, `http://localhost:2407`
- `KC_HOSTNAME_STRICT: "false"` — Keycloak uses the request's host (works for both `:8080` direct and `:80` via Nginx)
- `KC_PROXY_HEADERS: xforwarded` — trusts X-Forwarded-* headers from Nginx

### PUBLICKEY
- The RSA public key from Keycloak realm is stored in root `.env` as `ADMIN_SERVICE_PUBLICKEY` and `MANAGEMENT_SERVICE_PUBLICKEY`
- If Keycloak rotates keys, the `.env` PUBLICKEY must be updated and containers rebuilt
- Get current key from: Keycloak Admin Console → Realm Settings → Keys → RS256

## Frontend Patterns

### Styling approach
- **Inline styles** for all components (no CSS modules, no Tailwind, no styled-components)
- **Dark theme**: background gradient `#0f172a` → `#111827`, text `#e5e7eb`
- **Glassmorphism**: semi-transparent backgrounds with `backdropFilter: blur(10px)`, subtle borders, box shadows
- **Global CSS** (`index.css`): radial gradient background `#1b264d` → `#000f2b`, custom scrollbar, box-sizing
- **Error pages**: separate CSS files with space-themed animations (rocket, earth, moon, astronaut)

### Layout system
- `AppLayout`: flexbox row — fixed-width sidebar (`5rem`, `flexShrink: 0`) + fluid content (`flex: 1`)
- Full viewport: `100vh` x `100vw` with `0.4rem` padding and gap
- Content area has `overflow: auto` for scrolling

### Component conventions
- **Functional components** only (no class components)
- **No props interfaces** — inline type annotations: `{text: string, onClickFunction: () => void}`
- **Container pattern**: pages live in `container/<name>/index.tsx`
- **Reusable components**: live in `components/` — currently `button.tsx`, `sideBar.tsx`, `loader.tsx`
- Route paths defined in `constant/routes.json` and imported where needed

### Adding a new page
1. Create `src/container/<pagename>/index.tsx`
2. Add route path to `src/constant/routes.json`
3. Add `<Route>` in `AppRouter.tsx` wrapped in `<ProtectedRoute>` if auth is needed
4. The route element should be `<AppLayout screen={<YourPage />} title="PageName" />`
5. If role-based: `<ProtectedRoute requiredRoles={["role-name"]}/>`

### Adding a new API call
1. Add the function in `src/services/api.tsx` using the `api` client from `client.tsx`
2. The client auto-injects the Keycloak Bearer token
3. Base URL comes from `VITE_API_URL` env var
4. API paths are relative: e.g., `api.get('/admin')` → `{VITE_API_URL}/admin`

## Backend Patterns

### Service structure (both services are identical in structure)
```
src/
├── server.ts           # Entry: dotenv.config(), app.listen(PORT)
├── app.ts              # Express app: middleware setup, route mounting
├── <name>Router.ts     # Express Router with route definitions
├── <name>Controller.ts # Request handlers (RequestHandler type)
├── middleware/
│   └── authenticate.ts # JWT RS256 verification
├── routes/
│   └── health.route.ts # Health check endpoint
└── logger/
    └── logger.ts       # Pino logger
```

### Route mounting
- admin-service: `app.use('/admin', adminRouter)` → `GET /admin/` calls `getUser`
- management-service: `app.use('/management', managementRouter)` → `GET /management/` calls `getUser`
- Health: `app.use('/health', healthRoute)` → `GET /health` (no auth required, mounted before authenticate middleware)

### Adding a new backend route
1. Add route handler in the controller file
2. Add the route in the router file
3. Route is automatically protected by the `authenticate` middleware (if enabled)

### Authentication middleware state
- **admin-service**: `app.use(authenticate)` — ENABLED (active)
- **management-service**: `// app.use(authenticate)` — DISABLED (commented out)

## Nginx Configuration

### API routing
- `/api/admin/*` → `rewrite ^/api(.*)$ $1 break` → admin-service gets `/admin/*`
- `/api/management/*` → `rewrite ^/api(.*)$ $1 break` → management-service gets `/management/*`
- The `/api` prefix is stripped by Nginx; backend services never see `/api`

### CORS handling
- CORS is handled at the Nginx level using a `map` directive
- Allowed origins: `http://localhost`, `http://localhost:2407`
- Nginx adds `Access-Control-Allow-*` headers and handles OPTIONS preflight with 204
- `proxy_hide_header` strips any CORS headers from upstream to prevent duplicates
- Backend services should NOT have their own CORS middleware

### Keycloak routing conflict
- React app has a `/admin` route (for the Admin page)
- Keycloak admin console is at `/admin/master/console/`
- Nginx uses regex `location ~ ^/admin/.+` to only proxy paths with subpaths to Keycloak
- `/admin` and `/admin/` alone go to the React frontend (catch-all)

## Docker Compose Services

| Service | Image | Port | Exposed to host? |
|---------|-------|------|-------------------|
| nginx | nginx:alpine | 80 | Yes (80:80) |
| keycloak | keycloak:26.5.1 | 8080 | Yes (8080:8080, for local dev) |
| keycloak-postgres | postgres:16-alpine | 5432 | No |
| admin-service | custom build | 5000 | No |
| management-service | custom build | 5001 | No |
| pms-client | custom build | 2407 | No |

### Important Docker behaviors
- Nginx is independent (no `depends_on`) — it can start/restart without other services
- Backend services depend on Keycloak being healthy
- pms-client depends on Keycloak + both backend services being healthy
- Volume `keycloak-postgres-data` is external (must be created before first run: `docker volume create keycloak-postgres-data`)
- Volume `nginx-logs` stores Nginx access/error logs

## Common Operations

### Rebuild a specific service after code changes
```bash
docker compose build --no-cache <service-name>
docker compose up -d <service-name>
```

### Restart Nginx after nginx.conf changes (no rebuild needed — volume mounted)
```bash
docker compose restart nginx
```

### Recreate a service after docker-compose.yml env changes
```bash
docker compose up -d <service-name> --force-recreate
```

### Run frontend locally for development
```bash
cd pms-client
npm run dev
# Requires keycloak + nginx + backend services running in Docker
```

## Gotchas and Known Issues

1. **VITE_* vars are build-time only**: Changing VITE_* in `.env` requires `docker compose build --no-cache pms-client`, not just restart
2. **PUBLICKEY must match Keycloak**: If Keycloak's realm keys change, update PUBLICKEY in root `.env` and rebuild backend services
3. **`origin: '*'` with `credentials: true` is invalid**: This CORS combination is rejected by browsers per the spec. CORS is now handled by Nginx.
4. **Docker env vars need recreate, not restart**: `docker compose restart` reuses the old container. Use `--force-recreate` for env var changes.
5. **`/admin` route conflict**: The React `/admin` route and Keycloak `/admin/master/...` admin console overlap. Nginx regex `^/admin/.+` resolves this.
6. **Keycloak hostname**: `KC_HOSTNAME_STRICT: "false"` without `KC_HOSTNAME` makes Keycloak dynamic — it uses whatever host it receives the request on. This is required for dual-mode (local dev at :8080 + Docker via Nginx at :80).
