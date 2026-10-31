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

Start the local PostgreSQL service:

```bash
docker compose up -d postgres
```

### 2. Backend Configuration & JWT Secret Setup

The application uses HMAC-SHA256 for signing JWT bearer tokens. A cryptographically random secret of at least 32 UTF-8 bytes (256 bits) is required for `JwtSettings:SecretKey`.

> **Important Security Notice:** Never commit real secrets or credentials into source control. `JwtSettings:SecretKey` is intentionally omitted from `appsettings.json` and `appsettings.Development.json`.

#### Generating a Secure Secret Key

You can generate a cryptographically random, base64-encoded 32-byte (256-bit) secret using PowerShell or Bash:

**PowerShell (Windows):**
```powershell
$bytes = [byte[]]::new(32); [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes); [Convert]::ToBase64String($bytes)
```

**Bash / macOS / Linux:**
```bash
openssl rand -base64 32
```

#### Configuring for Local Development (.NET User Secrets)

For local development, configure `JwtSettings:SecretKey` using .NET User Secrets targeting the API project:

```bash
dotnet user-secrets set "JwtSettings:SecretKey" "<your-generated-32+-byte-secret>" --project backend/src/DailyActivityTracker.Api
```

#### Configuring for Production Environments

In production, supply the secret via environment variables or your hosting platform's secret manager:

- **Environment Variable:** `JwtSettings__SecretKey` (ASP.NET Core automatically maps double underscores `__` to nested configuration keys).
- **Secret Managers:** Azure Key Vault, AWS Secrets Manager, or Kubernetes Secrets injected into container environment variables.

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

