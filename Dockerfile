# ============================================
# FLIXIFY V2 - Simple Combined Server
# ============================================

FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (ignore NODE_ENV)
RUN npm install --include=dev

# Copy source code
COPY . .

# Build React app (ignore NODE_ENV)
RUN npm run build

# Install express and http-proxy-middleware
RUN npm install express http-proxy-middleware

# Expose port 3000
EXPOSE 3000

# Start combined server
CMD ["node", "server.js"]
