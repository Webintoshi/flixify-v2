# ============================================
# FLIXIFY V2 - Frontend + Proxy Combined
# ============================================
# Bu Dockerfile hem React frontend'i hem de 
# IPTV proxy server'ı aynı container'da çalıştırır.
# ============================================

FROM node:20-alpine

# Install nginx ve supervisor
RUN apk add --no-cache nginx supervisor

# Work directory
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build React app
RUN npm run build

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
