# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Kopier package files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/shared/package*.json ./packages/shared/

# Installer avhengigheter
RUN npm ci --workspace=@klimaoslo-kart/backend --workspace=@klimaoslo-kart/shared

# Kopier kildekode
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

# Bygg
RUN npm run build -w apps/backend

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Kopier kun nodvendige filer
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/apps/backend/package*.json ./apps/backend/
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/node_modules ./node_modules

# Sett miljovariable
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Start server
CMD ["node", "apps/backend/dist/index.js"]
