# DailyActivityTracker

DailyActivityTracker is a full-stack activity tracking application built with a React/TypeScript frontend and an ASP.NET Core backend.

## Architecture

- **Frontend:** React 19, TypeScript 6, Vite 8, Tailwind CSS, ESLint 10.
- **Backend:** ASP.NET Core (.NET 8), Entity Framework Core 8, PostgreSQL via Npgsql.

## Getting Started

### Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js](https://nodejs.org/) (v20+) and `npm`
- [Docker](https://www.docker.com/) (for PostgreSQL)

### 1. Database Setup

1. Copy the environment template for local development:
   ```bash
   cp .env.example .env
   ```
   *(Optionally customize `POSTGRES_PASSWORD` in `.env`)*

2. Start the local PostgreSQL service:
   ```bash
   docker compose up -d postgres
   ```

### 2. Backend Configuration

#### A. JWT Secret Setup

The application uses HMAC-SHA256 for signing JWT bearer tokens. A cryptographically random secret of at least 32 UTF-8 bytes (256 bits) is required for `JwtSettings:SecretKey`.

> **Important Security Notice:** Never commit real secrets or credentials into source control. `JwtSettings:SecretKey` is intentionally omitted from tracked configuration files.

**Generating a Secure Secret Key:**

- **PowerShell (Windows - compatible with Windows PowerShell 5.1 and PowerShell 7+):**
  *(Note: Windows PowerShell 5.1 does not support `[System.Security.Cryptography.RandomNumberGenerator]::Fill`. The following command uses `Create()` and `GetBytes()` for compatibility across all PowerShell versions)*
  ```powershell
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $bytes = New-Object byte[] 32
  $rng.GetBytes($bytes)
  [Convert]::ToBase64String($bytes)
  $rng.Dispose()
  ```
- **Bash / macOS / Linux:**
  ```bash
  openssl rand -base64 32
  ```

**Configuring for Local Development (.NET User Secrets):**
```bash
dotnet user-secrets set "JwtSettings:SecretKey" "<your-generated-32+-byte-secret>" --project backend/src/DailyActivityTracker.Api
```

**Configuring for Production Environments:**
- **Environment Variable:** `JwtSettings__SecretKey` (ASP.NET Core maps double underscores `__` to nested configuration keys).
- **Secret Managers:** Azure Key Vault, AWS Secrets Manager, or Kubernetes Secrets injected as environment variables.

#### B. CORS Allowed Origins Setup

The API restricts cross-origin browser requests to explicitly configured frontend origins under `Cors:AllowedOrigins`. Wildcards (`*`), path components, and query parameters are strictly rejected at startup.

**Local Development:**
Configured by default in `backend/src/DailyActivityTracker.Api/appsettings.Development.json`:
```json
{
  "Cors": {
    "AllowedOrigins": [
      "http://localhost:5173"
    ]
  }
}
```

**Production Environments:**
Supply production frontend origins via environment variables or hosting configuration:
- Primary frontend origin: `Cors__AllowedOrigins__0="https://app.example.com"`
- Multiple origins (optional — e.g., if a separate hypothetical admin frontend is added in the future; not required by the current single-frontend app): `Cors__AllowedOrigins__0="https://app.example.com"`, `Cors__AllowedOrigins__1="https://admin.example.com"`
- Alternatively, define the `Cors:AllowedOrigins` array in production deployment configuration (e.g. `appsettings.Production.json` or cloud application settings).

### 3. Running the Backend API

From the repository root:

```bash
# Build the solution
dotnet build backend/DailyActivityTracker.sln

# Run the API with HTTPS profile
dotnet run --project backend/src/DailyActivityTracker.Api/DailyActivityTracker.Api.csproj --launch-profile https
```

### 4. Running the Frontend

From the `frontend/` directory:

```bash
cd frontend
npm install
npm run dev
```

#### Dependency & Security Verification

After running `npm install`, you may optionally verify dependencies and security advisories:

```bash
npm audit
```

If vulnerabilities are reported and npm indicates that compatible, non-breaking fixes are available, apply them using:

```bash
npm audit fix
```

Then verify the resolved state and test the production build:

```bash
npm audit
npm run build
```

> **Important Notes on npm Output & Security:**
> - `npm audit fix` only applies semver-compatible dependency updates. Not every vulnerability can always be resolved automatically without breaking changes or upstream package releases.
> - **Do not use `npm audit fix --force`** without thoroughly reviewing breaking changes, as it can install major version bumps that break project dependencies.
> - Informational messages such as npm funding notices (`npm fund`) or notices indicating newer npm versions are available are normal informational messages, not installation errors. Upgrading npm globally is not required.

### 5. Running Tests

From the repository root:

```bash
# Backend unit tests
dotnet test backend/DailyActivityTracker.sln
```


## Production Configuration Guide

### Overview
In production environments, all sensitive credentials, database connection strings, and domain-specific URLs must be supplied using environment variables or cloud secret managers. Never commit production secrets, database credentials, or private keys to source control.

> **Placeholder Notice:** `example.com` (`https://app.example.com` and `https://api.example.com`) is a reserved placeholder domain used across tracked configuration templates. The actual frontend domain, API domain, DNS records, TLS certificates, Cloud Run region/ingress, Forwarded Headers proxy trust, Cloud SQL connectivity, and Secret Manager entries remain deferred until the target deployment topology is finalized.

### Authentication & Refresh Cookie Architecture
- **Access Token:** Held in frontend memory only (never stored in `localStorage`, `sessionStorage`, or cookies).
- **Refresh Token:** Stored in an `HttpOnly` cookie managed by the backend with refresh token rotation.
- **Production Cookie Settings (`AuthCookie`):**
  - `CookieName`: `refreshToken`
  - `Path`: `/api/Auth`
  - `Domain`: `null` (host-only cookie scoped strictly to the API host)
  - `SameSite`: `Lax`
  - `Secure`: `Always`
  - `HttpOnly`: `true`
  - `ExpirationDays`: `7`
- **Client Requests & CSRF Protection:** Frontend authentication requests (`login`, `refresh`, `logout`) include `credentials: 'include'`. The backend `ValidateOriginAttribute` enforces strict `Origin` (and non-cross-site `Referer` fallback) validation against `Cors:AllowedOrigins` on state-changing cookie endpoints (`/api/Auth/refresh` and `/api/Auth/logout`).
- **`SameSite=Lax` & Subdomain Topology:**
  - `SameSite=Lax` supports `fetch` requests from the frontend to the API when both are served over HTTPS under the same registrable domain as same-site sibling subdomains (e.g., `https://app.example.com` calling `https://api.example.com`).
  - Because `app.example.com` and `api.example.com` are still distinct origins (cross-origin), exact CORS configuration (`Cors:AllowedOrigins`) and `credentials: 'include'` remain required.
  - If the frontend and API are hosted on different registrable domains (e.g., `*.web.app` calling `*.run.app` directly without a shared custom domain or same-origin proxy), browsers classify the requests as **cross-site**, and `SameSite=Lax` will not send the refresh cookie on `fetch` requests.
  - Always perform live browser verification of refresh cookie storage and transmission after selecting the final domain and hosting topology.

### Required Backend Environment Variables

When running in production (`ASPNETCORE_ENVIRONMENT=Production`):

| Variable | Description | Example / Format | Required / Secret |
| :--- | :--- | :--- | :--- |
| `ASPNETCORE_ENVIRONMENT` | Configures ASP.NET Core hosting environment. | `Production` | Required (Non-secret) |
| `ConnectionStrings__DefaultConnection` | PostgreSQL connection string for EF Core. | `Host=db.internal;Port=5432;Database=dailyactivitytracker;Username=app_user;Password=SECURE_PASSWORD;SSL Mode=Require;` | Required (**Secret**) |
| `JwtSettings__SecretKey` | Cryptographic secret for signing JWT bearer tokens. Must be at least 32 UTF-8 bytes (256 bits). | Base64-encoded string or 32+ character random secret | Required (**Secret**) |
| `JwtSettings__Issuer` | Expected issuer for JWT tokens. Identifies the backend API token authority (replace placeholder with real API domain). | `https://api.example.com` | Required (Non-secret) |
| `JwtSettings__Audience` | Expected audience for JWT tokens. Stable API resource identifier independent of the frontend domain or cloud provider. | `urn:dailyactivitytracker:api` | Required (Non-secret) |
| `Cors__AllowedOrigins__0` | Allowed browser origin for the primary frontend application (CORS and `ValidateOriginAttribute`). Wildcards (`*`) and paths are forbidden. | `https://app.example.com` | Required (Non-secret) |
| `Cors__AllowedOrigins__1` | Hypothetical optional second origin (only if a separate admin or secondary frontend is introduced in the future; not required for the current application). | `https://admin.example.com` | Optional (Non-secret) |

> **Note on ASP.NET Core Environment Syntax:** Double underscores (`__`) map to nested JSON hierarchy (e.g. `ConnectionStrings__DefaultConnection` maps to `ConnectionStrings:DefaultConnection`, and `Cors__AllowedOrigins__0` maps to `Cors:AllowedOrigins[0]`).

### Production Configuration Files (`appsettings.Production.json`)
The repository includes a template `backend/src/DailyActivityTracker.Api/appsettings.Production.json` containing structural defaults (`JwtSettings:Audience = "urn:dailyactivitytracker:api"`, host-only `AuthCookie` settings, and `example.com` placeholders). In containerized or cloud environments (e.g. Google Cloud Run, Docker, AWS, Azure), override domain placeholders and inject secrets via environment variables or cloud secret stores.

### Health Check Endpoints
In production, container orchestrators and load balancers should be configured with the following unauthenticated health endpoints:
- **Liveness Probe:** `GET /health/live` (Checks if API process is running; does not query database)
- **Readiness Probe:** `GET /health/ready` (Verifies PostgreSQL database connectivity)

### Frontend Production Configuration (`VITE_API_BASE_URL`)
The frontend is a client-side SPA (Single Page Application) and installable PWA. `VITE_API_BASE_URL` is a **build-time** environment variable that Vite statically embeds into the compiled JavaScript bundle during `npm run build`.

- **Build-Time Environment File (`frontend/.env.production`):**
  ```env
  VITE_API_BASE_URL=https://api.example.com
  ```
- **Supported Deployment Models:**
  - **Direct API Subdomain Model:** Set `VITE_API_BASE_URL=https://api.example.com` (replacing `api.example.com` with your real API domain before building) when the frontend (`https://app.<domain>`) calls a separate API subdomain (`https://api.<domain>`).
    ```bash
    VITE_API_BASE_URL=https://api.example.com npm run build
    ```
  - **Same-Origin Reverse Proxy Model:** Set `VITE_API_BASE_URL=/` (or empty string `""`) when the frontend and `/api` requests share the same origin through a reverse proxy (such as the local Nginx proxy in `docker-compose.prod.yml`). `resolveApiBaseUrl` normalizes `""` and `"/"` to `""` so requests target `/api/...` on the current origin.
    ```bash
    VITE_API_BASE_URL=/ npm run build
    ```
- **Omitted vs. Empty Value Resolver Behavior:** In Production builds (`import.meta.env.PROD`), `resolveApiBaseUrl` throws an explicit error (`Missing required environment variable: VITE_API_BASE_URL`) only if `VITE_API_BASE_URL` is omitted (`undefined` or `null`), preventing accidental fallback to `https://localhost:7127`. An intentionally empty string `""` or `"/"` is valid and resolves to `""` for same-origin proxy deployments.
- **Rebuild Requirement:** Changing a hosting environment variable after the frontend has already been built does **not** change the API URL embedded in `dist/`. Updating `VITE_API_BASE_URL` requires re-running `npm run build` and redeploying `frontend/dist/`.
- **Security Notice:** `VITE_API_BASE_URL` is a public build-time endpoint configuration, not a secret. Do not place API keys, private credentials, or secrets in `VITE_*` variables or `.env` files.

### Local Production-like Docker Compose Testing (`docker-compose.prod.yml`)
To test the containerized production stack locally on a single host (where the Nginx `frontend` container proxies `/api/` to `http://backend:8080` over the internal Docker network):

1. Create an untracked `.env.prod` file in the repository root (ignored by `.gitignore` and `.dockerignore`). Do **not** commit `.env.prod`.
2. Supply local secrets (`POSTGRES_PASSWORD` and a 32+ byte `JWT_SECRET_KEY`) along with the local proxy and origin overrides:
   ```env
   POSTGRES_DB=DailyActivityTracker
   POSTGRES_USER=app_user
   POSTGRES_PASSWORD=<YOUR_LOCAL_TEST_DB_PASSWORD>
   JWT_SECRET_KEY=<YOUR_LOCAL_32+_BYTE_TEST_JWT_SECRET>
   VITE_API_BASE_URL=/
   FRONTEND_PORT=8088
   CORS_ALLOWED_ORIGIN=http://localhost:8088
   ```
   - `VITE_API_BASE_URL=/` directs the compiled frontend bundle to send API requests to `/api/...` through the same-origin Nginx reverse proxy.
   - `FRONTEND_PORT=8088` publishes the Nginx container on host port `8088`.
   - `CORS_ALLOWED_ORIGIN=http://localhost:8088` sets `Cors__AllowedOrigins__0` to match the exact browser `Origin` header (scheme, hostname, and non-default port) checked by `ValidateOriginAttribute` on `/api/Auth/refresh` and `/api/Auth/logout`.
   - Production HTTPS defaults and `Secure=Always` cookie settings remain untouched in tracked files. (Chromium and Firefox allow `Secure` cookies on `http://localhost` as a potentially trustworthy origin).
3. Build and start the stack:
   ```powershell
   docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
   ```

---

## Production Deployment Runbook

### 1. Pre-Deployment Checklist
- [ ] Target domain names and topology selected for Backend API (replacing placeholder `https://api.example.com`) and Frontend Web App (replacing placeholder `https://app.example.com`).
- [ ] DNS records and valid SSL/TLS certificates configured for HTTPS on both endpoints.
- [ ] Cloud Run / container ingress and Forwarded Headers trusted proxy configuration finalized for the target reverse proxy topology.
- [ ] PostgreSQL production database instance provisioned (e.g., Cloud SQL for PostgreSQL 16) and connection strategy configured.
- [ ] Cryptographic signing secret generated for `JwtSettings:SecretKey` (at least 32 UTF-8 bytes / 256 bits).
- [ ] Cloud secret manager (Google Secret Manager, Azure Key Vault, AWS Secrets Manager, or Kubernetes Secrets) configured to inject backend secrets as environment variables.

### 2. Backend Deployment Setup

1. **Set Environment Variables on Host/Container:**
   ```bash
   ASPNETCORE_ENVIRONMENT=Production
   ConnectionStrings__DefaultConnection="Host=prod-db.internal;Port=5432;Database=dailyactivitytracker;Username=app_user;Password=<STRONG_PASSWORD>;SSL Mode=Require;"
   JwtSettings__SecretKey="<SECURE_BASE64_OR_32+_CHAR_SECRET>"
   JwtSettings__Issuer="https://api.example.com"
   JwtSettings__Audience="urn:dailyactivitytracker:api"
   Cors__AllowedOrigins__0="https://app.example.com"
   ```
   *(Replace `https://api.example.com` and `https://app.example.com` with your actual production API and frontend domains.)*
2. **Apply Database Migrations:**
   Ensure database schema migrations are applied using an out-of-band EF Core CLI migration bundle or pre-deployment migration job (rather than migrating automatically on every web instance startup):
   ```bash
   dotnet ef database update --project backend/src/DailyActivityTracker.Infrastructure --startup-project backend/src/DailyActivityTracker.Api
   ```
3. **Verify Security Middlewares:**
   - **HSTS:** Automatically enabled in Production (`app.UseHsts()`) returning `Strict-Transport-Security: max-age=...; includeSubDomains`.
   - **Defensive Headers:** Automatically emitted on all responses:
     - `X-Content-Type-Options: nosniff`
     - `X-Frame-Options: DENY`
     - `Referrer-Policy: strict-origin-when-cross-origin`
   - **Swagger:** Disabled in Production mode.

### 3. Frontend Deployment Setup

1. **Build Client Bundle with Intended API URL:**
   ```bash
   cd frontend
   npm ci
   VITE_API_BASE_URL="https://api.example.com" npm run build
   ```
   *(Supply your actual production API URL in place of `https://api.example.com`, or `/` for a same-origin reverse proxy deployment, prior to running `npm run build`.)*
2. **Deploy Static Assets:**
   Deploy the contents of `frontend/dist/` to your static web host or CDN (e.g., Firebase Hosting, AWS S3 + CloudFront, Azure Static Web Apps, or Nginx).
3. **Configure SPA Routing (Fallback to `index.html`):**
   Ensure all client-side navigation paths (e.g., `/activities`, `/activities/new`, `/admin/audit-logs`) are rewritten to `/index.html` with HTTP 200 by your web server or CDN.

### 4. Post-Deployment Verification Steps

1. **Verify Liveness Probe:**
   ```bash
   curl -i https://api.example.com/health/live
   # Expect HTTP 200 with {"status":"Healthy"}
   ```
2. **Verify Readiness Probe:**
   ```bash
   curl -i https://api.example.com/health/ready
   # Expect HTTP 200 with {"status":"Healthy"} confirming PostgreSQL connection
   ```
3. **Verify Security Headers:**
   ```bash
   curl -i -X OPTIONS https://api.example.com/health/live
   # Confirm X-Content-Type-Options: nosniff, X-Frame-Options: DENY, and Referrer-Policy headers
   ```
4. **Verify CORS and Refresh Cookie Integration:**
   Open the deployed frontend web app in a browser (`https://app.example.com`) and confirm login, silent session refresh (`refreshToken` HttpOnly cookie across HTTPS sibling subdomains), logout, and activity data loading execute without cross-origin errors.

### 5. Common Troubleshooting & FAQs

- **API Fails at Startup (`InvalidOperationException: JwtSettings:SecretKey is missing or empty`):**
  - Ensure `JwtSettings__SecretKey` is defined in the host's environment variables and is at least 32 bytes long.
- **API Fails at Startup (`InvalidOperationException: Cors:AllowedOrigins is missing or empty`):**
  - Ensure `Cors__AllowedOrigins__0` is defined with the exact frontend protocol and domain (e.g., `https://app.example.com` without trailing slash).
- **Refresh or Logout Returns `403 Forbidden`:**
  - `ValidateOriginAttribute` rejected the request `Origin`. Verify that `Cors__AllowedOrigins__0` matches the exact browser origin (including scheme, hostname, and port, such as `http://localhost:8088` in local Docker Compose testing or `https://app.<domain>` in production).
- **Frontend Fails with `Missing required environment variable: VITE_API_BASE_URL`:**
  - The frontend was compiled with `VITE_API_BASE_URL` undefined. Supply `VITE_API_BASE_URL` in `.env.production` or as a build-time environment variable during `npm run build` (use `https://api.<domain>` for subdomain deployments or `/` for same-origin proxy deployments).
- **CORS Error in Browser:**
  - Verify that the URL in the browser address bar matches the value in `Cors__AllowedOrigins__0` (including protocol `https://` and port if non-standard).
- **Changes to `.env` or Hosting Variables Have No Effect on Frontend API URL:**
  - Vite embeds `VITE_API_BASE_URL` into the static JavaScript files at build time. Re-run `npm run build` with the updated value and re-deploy `dist/`.
