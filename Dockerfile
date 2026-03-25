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

# Default container port; override PORT at runtime if needed
ENV PORT=8181
EXPOSE 8181

# Use exec form for proper signal handling
CMD ["node", "dist/server.js"]
