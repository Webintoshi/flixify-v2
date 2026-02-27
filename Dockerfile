# ============================================
# FLIXIFY V2 - Simple Combined Server
# ============================================

FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build React app
ENV NODE_ENV=development
RUN npm run build
ENV NODE_ENV=production

# Install express and http-proxy-middleware for production
RUN npm install express http-proxy-middleware

# Expose port 3000
EXPOSE 3000

# Start combined server
CMD ["node", "server.js"]
