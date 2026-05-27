# FRX Arcade backend — build from repository root:
#   docker build -f apps/backend/Dockerfile -t frx-backend .
#
# Railway: Root Directory = repo root, Dockerfile path = apps/backend/Dockerfile

FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/
COPY packages/shared/package.json packages/shared/
RUN npm ci --include-workspace-root --workspace=@frx/backend --workspace=@frx/shared

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/backend apps/backend
RUN npm run build --workspace=@frx/shared
WORKDIR /app/apps/backend
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
RUN apk add --no-cache wget

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/
COPY packages/shared/package.json packages/shared/
RUN npm ci --include-workspace-root --workspace=@frx/backend --workspace=@frx/shared --omit=dev

COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --from=build /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/node_modules/prisma ./node_modules/prisma
COPY apps/backend/docker-entrypoint.sh ./apps/backend/docker-entrypoint.sh
RUN chmod +x ./apps/backend/docker-entrypoint.sh

WORKDIR /app/apps/backend
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-4000}/health" || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
