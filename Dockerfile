# ============================================
# FLIXIFY V2 - HTTP Mode Production Build
# ============================================

FROM node:20-alpine

WORKDIR /app

# Build arguments for environment variables
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_URL=/api

# Set as environment variables for build
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
ENV VITE_API_URL=${VITE_API_URL}
ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install ALL dependencies (ignore NODE_ENV)
RUN npm install --include=dev

# Copy source code
COPY . .

# Build React app - Environment variables will be injected here
RUN npm run build

# Verify build output exists
RUN ls -la dist/ && ls -la dist/index.html

# Install express and http-proxy-middleware
RUN npm install express http-proxy-middleware

# Expose port 3000
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start combined server
CMD ["node", "server.js"]
