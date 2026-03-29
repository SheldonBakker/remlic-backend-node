FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

FROM node:24-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps \
  && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER node

EXPOSE 8181

CMD ["node", "dist/server.js"]