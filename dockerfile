# Stage 1: Build Angular Application (Node 16 natively supports Webpack 4 / Angular 11 OpenSSL 1.1 hashes)
FROM node:16-alpine AS builder
WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

COPY . .
RUN npm run build -- --configuration production

# Stage 2: Serve static files with unprivileged Nginx
FROM nginxinc/nginx-unprivileged:alpine-slim

# Copy built dist files
COPY --from=builder /usr/src/app/dist/rpsgame/ /usr/share/nginx/html

# Copy unprivileged Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose non-root port 8080
EXPOSE 8080

USER 10001
CMD ["nginx", "-g", "daemon off;"]