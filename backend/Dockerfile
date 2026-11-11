# ==========================================
# Build & Publish Stage (SDK)
# ==========================================
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src

# Copy project files first for optimal NuGet layer caching
COPY backend/src/DailyActivityTracker.Domain/DailyActivityTracker.Domain.csproj backend/src/DailyActivityTracker.Domain/
COPY backend/src/DailyActivityTracker.Application/DailyActivityTracker.Application.csproj backend/src/DailyActivityTracker.Application/
COPY backend/src/DailyActivityTracker.Infrastructure/DailyActivityTracker.Infrastructure.csproj backend/src/DailyActivityTracker.Infrastructure/
COPY backend/src/DailyActivityTracker.Api/DailyActivityTracker.Api.csproj backend/src/DailyActivityTracker.Api/

# Restore dependencies for API project
RUN dotnet restore backend/src/DailyActivityTracker.Api/DailyActivityTracker.Api.csproj

# Copy remaining source code (excluding tests, local config, bin/obj via .dockerignore)
COPY backend/src/ backend/src/

# Build and publish the release package
WORKDIR /src/backend/src/DailyActivityTracker.Api
RUN dotnet publish -c Release -o /app/publish --no-restore

# ==========================================
# Final Runtime Stage (.NET 8 ASP.NET Alpine)
# ==========================================
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS runtime
WORKDIR /app

# Configure Kestrel to listen on non-root port 8080 and bind to all network interfaces
ENV ASPNETCORE_HTTP_PORTS=8080 \
    DOTNET_EnableDiagnostics=0

# Expose Kestrel unprivileged port
EXPOSE 8080

# Copy compiled artifacts from build stage
COPY --from=build --chown=app:app /app/publish .

# Run as built-in non-root unprivileged user (UID 1654 in .NET 8 Alpine)
USER app

# Entrypoint to launch the web API
ENTRYPOINT ["dotnet", "DailyActivityTracker.Api.dll"]
