# ==========================================
# Build Stage (Node.js Alpine)
# ==========================================
FROM node:20-alpine AS build
WORKDIR /app

# Accept VITE_API_BASE_URL as build argument
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Copy package descriptors first for layer caching
COPY frontend/package.json frontend/package-lock.json ./

# Install exact dependencies
RUN npm ci

# Copy frontend source code
COPY frontend/ ./

# Build production bundle (will fail-fast if VITE_API_BASE_URL is missing or empty)
RUN npm run build

# ==========================================
# Runtime Stage (Unprivileged Nginx Alpine)
# ==========================================
FROM nginxinc/nginx-unprivileged:alpine AS runtime

# Copy custom Nginx configuration with SPA routing and security headers
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static assets from build stage
COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Expose unprivileged non-root port 8080
EXPOSE 8080

# Launch Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
