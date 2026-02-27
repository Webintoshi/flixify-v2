# ============================================
# FLIXIFY V2 - Multi-stage Build
# ============================================

# STAGE 1: Build (with devDependencies)
FROM node:20-alpine AS builder

# Override NODE_ENV for build
ENV NODE_ENV=development

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (devDependencies included)
RUN npm install

# Copy source code
COPY . .

# Build React app
RUN npm run build

# ============================================
# STAGE 2: Production (runtime only)
FROM node:20-alpine AS production

# Install nginx and supervisor
RUN apk add --no-cache nginx supervisor

WORKDIR /app

# Copy built app from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/proxy-server.js ./
COPY --from=builder /app/package*.json ./

# Install production dependencies only
RUN npm install --production

# Create supervisor config directory
RUN mkdir -p /etc/supervisor/conf.d

# Nginx config - SPA routing + Proxy
RUN echo 'server { \
    listen 3000; \
    root /app/dist; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /proxy { \
        proxy_pass http://localhost:3001; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
    } \
}' > /etc/nginx/http.d/default.conf

# Supervisor config - both services
RUN echo '[supervisord] \
nodaemon=true \
user=root \
 \
[program:proxy] \
command=node /app/proxy-server.js \
autostart=true \
autorestart=true \
stdout_logfile=/dev/stdout \
stderr_logfile=/dev/stderr \
 \
[program:nginx] \
command=nginx -g "daemon off;" \
autostart=true \
autorestart=true \
stdout_logfile=/dev/stdout \
stderr_logfile=/dev/stderr' > /etc/supervisor/conf.d/supervisord.conf

# Expose port 3000
EXPOSE 3000

# Start supervisor (nginx + proxy)
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
