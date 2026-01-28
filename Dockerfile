# Build stage
FROM node:20-slim AS build

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# Production stage
FROM node:20-slim AS production

WORKDIR /usr/src/app

# Create non-root user for security
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs

COPY package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /usr/src/app/dist ./dist

# Change ownership to non-root user
RUN chown -R nodejs:nodejs /usr/src/app

USER nodejs

# Cloud Run uses PORT env variable (default 8080)
ENV PORT=8080
EXPOSE 8080

# Use exec form for proper signal handling
CMD ["node", "dist/server.js"]

