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

- **PowerShell (Windows):**
  ```powershell
  $bytes = [byte[]]::new(32); [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes); [Convert]::ToBase64String($bytes)
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
- Single origin: `Cors__AllowedOrigins__0="https://app.dailyactivitytracker.com"`
- Multiple origins: `Cors__AllowedOrigins__0="https://app.dailyactivitytracker.com"`, `Cors__AllowedOrigins__1="https://admin.dailyactivitytracker.com"`
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

### 5. Running Tests

From the repository root:

```bash
# Backend unit tests
dotnet test backend/DailyActivityTracker.sln
```


## Production Configuration Guide

### Overview
In production environments, all sensitive credentials, database connection strings, and domain-specific URLs must be supplied using environment variables or cloud secret managers. Never commit production secrets, database credentials, or private keys to source control.

### Required Backend Environment Variables

When running in production (`ASPNETCORE_ENVIRONMENT=Production`):

| Variable | Description | Example / Format | Required / Secret |
| :--- | :--- | :--- | :--- |
| `ASPNETCORE_ENVIRONMENT` | Configures ASP.NET Core hosting environment. | `Production` | Required (Non-secret) |
| `ConnectionStrings__DefaultConnection` | PostgreSQL connection string for EF Core. | `Host=db.internal;Port=5432;Database=dailyactivitytracker;Username=app_user;Password=SECURE_PASSWORD;SSL Mode=Require;` | Required (**Secret**) |
| `JwtSettings__SecretKey` | Cryptographic secret for signing JWT bearer tokens. Must be at least 32 UTF-8 bytes (256 bits). | Base64-encoded string or 32+ character random secret | Required (**Secret**) |
| `JwtSettings__Issuer` | Expected issuer for JWT tokens. Must match token issuing authority. | `https://api.yourdomain.com` | Required (Non-secret) |
| `JwtSettings__Audience` | Expected audience for JWT tokens. Typically the frontend client application. | `https://app.yourdomain.com` | Required (Non-secret) |
| `Cors__AllowedOrigins__0` | Allowed browser origins for CORS. Wildcards (`*`) and paths are forbidden. | `https://app.yourdomain.com` | Required (Non-secret) |
| `Cors__AllowedOrigins__1` | Additional allowed browser origins (if multi-origin/admin). | `https://admin.yourdomain.com` | Optional (Non-secret) |

> **Note on ASP.NET Core Environment Syntax:** Double underscores (`__`) map to nested JSON hierarchy (e.g. `ConnectionStrings__DefaultConnection` maps to `ConnectionStrings:DefaultConnection`, and `Cors__AllowedOrigins__0` maps to `Cors:AllowedOrigins[0]`).

### Production Configuration Files (`appsettings.Production.json`)
The repository includes a template `backend/src/DailyActivityTracker.Api/appsettings.Production.json` containing structural defaults and placeholder hostnames. In containerized or cloud environments (e.g. Docker, Kubernetes, AWS, Azure), override placeholders with environment variables or cloud secret stores.

### Health Check Endpoints
In production, container orchestrators and load balancers should be configured with the following unauthenticated health endpoints:
- **Liveness Probe:** `GET /health/live` (Checks if API process is running; does not query database)
- **Readiness Probe:** `GET /health/ready` (Verifies PostgreSQL database connectivity)

### Frontend Production Configuration (`VITE_API_BASE_URL`)
The frontend is a client-side SPA (Single Page Application). Environment variables prefixed with `VITE_` are statically replaced and baked into the JavaScript bundle at build time.

- **Build-Time Environment File:** A template is provided at `frontend/.env.production`.
  ```env
  VITE_API_BASE_URL=https://api.yourdomain.com
  ```
- **CI/CD Pipeline Build:** Pass the backend API URL as an environment variable during `npm run build`:
  ```bash
  VITE_API_BASE_URL=https://api.yourdomain.com npm run build
  ```
- **Fail-Fast Production Resolver:** In Production builds (`import.meta.env.PROD`), if `VITE_API_BASE_URL` is omitted or empty, the application throws an explicit error (`Missing required environment variable: VITE_API_BASE_URL`) rather than silently defaulting to `localhost`.
- **Rebuild Requirement:** Changing `VITE_API_BASE_URL` or any frontend environment variable requires rebuilding the client bundle (`npm run build`). Updating `.env` files on a running web server without rebuilding has no effect.
- **Security Notice:** Do not place API keys, private credentials, or secrets in `VITE_*` environment variables or `.env` files. Everything compiled into the frontend bundle is publicly readable in client browsers.

---

## Production Deployment Runbook

### 1. Pre-Deployment Checklist
- [ ] Registered public domain names for Backend API (e.g., `https://api.yourdomain.com`) and Frontend Web App (e.g., `https://app.yourdomain.com`).
- [ ] Valid SSL/TLS certificates configured for HTTPS on both endpoints.
- [ ] PostgreSQL production database instance provisioned (with SSL required and distinct application user credentials).
- [ ] Cryptographic signing secret generated for `JwtSettings:SecretKey` (at least 32 UTF-8 bytes / 256 bits).
- [ ] Cloud secret manager (Azure Key Vault, AWS Secrets Manager, HashiCorp Vault, or Kubernetes Secrets) configured to inject backend secrets as environment variables.

### 2. Backend Deployment Setup

1. **Set Environment Variables on Host/Container:**
   ```bash
   ASPNETCORE_ENVIRONMENT=Production
   ConnectionStrings__DefaultConnection="Host=prod-db.internal;Port=5432;Database=dailyactivitytracker;Username=app_user;Password=<STRONG_PASSWORD>;SSL Mode=Require;"
   JwtSettings__SecretKey="<SECURE_BASE64_OR_32+_CHAR_SECRET>"
   JwtSettings__Issuer="https://api.yourdomain.com"
   JwtSettings__Audience="https://app.yourdomain.com"
   Cors__AllowedOrigins__0="https://app.yourdomain.com"
   ```
2. **Apply Database Migrations:**
   Ensure database schema migrations are applied using EF Core CLI bundles or pre-deployment migration jobs:
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

1. **Build Client Bundle with Explicit API URL:**
   ```bash
   cd frontend
   npm ci
   VITE_API_BASE_URL="https://api.yourdomain.com" npm run build
   ```
2. **Deploy Static Assets:**
   Deploy the contents of `frontend/dist/` to a CDN, static web host (e.g., AWS S3 + CloudFront, Azure Static Web Apps, Nginx, or Netlify).
3. **Configure SPA Routing (Fallback to `index.html`):**
   Ensure all client-side navigation paths (e.g., `/audit`, `/activities`, `/login`) are rewritten to `/index.html` with HTTP 200 by your web server or CDN.

### 4. Post-Deployment Verification Steps

1. **Verify Liveness Probe:**
   ```bash
   curl -i https://api.yourdomain.com/health/live
   # Expect HTTP 200 with {"status":"Healthy"}
   ```
2. **Verify Readiness Probe:**
   ```bash
   curl -i https://api.yourdomain.com/health/ready
   # Expect HTTP 200 with {"status":"Healthy"} confirming PostgreSQL connection
   ```
3. **Verify Security Headers:**
   ```bash
   curl -i -X OPTIONS https://api.yourdomain.com/health/live
   # Confirm X-Content-Type-Options: nosniff, X-Frame-Options: DENY, and Referrer-Policy headers
   ```
4. **Verify CORS Integration:**
   Open the deployed frontend web app in a browser (`https://app.yourdomain.com`) and confirm API authentication and data loading execute without cross-origin errors in the browser console.

### 5. Common Troubleshooting & FAQs

- **API Fails at Startup (`InvalidOperationException: JwtSettings:SecretKey is missing or empty`):**
  - Ensure `JwtSettings__SecretKey` is defined in the host's environment variables and is at least 32 bytes long.
- **API Fails at Startup (`InvalidOperationException: Cors:AllowedOrigins is missing or empty`):**
  - Ensure `Cors__AllowedOrigins__0` is defined with the exact frontend protocol and domain (e.g., `https://app.yourdomain.com` without trailing slash).
- **Frontend Fails with `Missing required environment variable: VITE_API_BASE_URL`:**
  - The frontend was compiled without `VITE_API_BASE_URL`. Supply `VITE_API_BASE_URL` in `.env.production` or as an environment variable during `npm run build`.
- **CORS Error in Browser:**
  - Verify that the URL in the browser address bar matches the value in `Cors__AllowedOrigins__0` (including protocol `https://` and port if non-standard).
- **Changes to `.env` Have No Effect on Production:**
  - Vite embeds environment variables into the static JavaScript files at build time. Re-run `npm run build` and re-deploy `dist/`.
