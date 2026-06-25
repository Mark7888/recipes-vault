# Stage 1: Build frontend
FROM node:24-alpine AS frontend-build
ARG ENVIRONMENT=production
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN if [ "$ENVIRONMENT" = "development" ]; then npm run build:dev; else npm run build; fi

# Stage 2: Install backend deps and build
FROM node:24-alpine AS backend-build
WORKDIR /build/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npx prisma generate
RUN npm run build

# Stage 3: Production runtime
FROM node:24-alpine AS production
RUN apk add --no-cache dumb-init
WORKDIR /app
ENV NODE_ENV=production
COPY --from=backend-build /build/backend/dist ./dist
COPY --from=backend-build /build/backend/node_modules ./node_modules
COPY --from=backend-build /build/backend/package.json ./
COPY --from=backend-build /build/backend/prisma ./prisma
COPY --from=frontend-build /build/frontend/dist ./public
RUN mkdir -p /data/images
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "npx prisma db push && node dist/server.js"]
