# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Kopier package files
COPY package*.json ./
COPY apps/admin/package*.json ./apps/admin/
COPY packages/shared/package*.json ./packages/shared/

# Installer avhengigheter
RUN npm ci --workspace=@klimaoslo-kart/admin --workspace=@klimaoslo-kart/shared

# Kopier kildekode
COPY packages/shared ./packages/shared
COPY apps/admin ./apps/admin

# Bygg (environment variables settes ved deploy)
ARG VITE_API_URL
ARG VITE_AZURE_CLIENT_ID
ARG VITE_AZURE_TENANT_ID
ARG VITE_REDIRECT_URI
ARG VITE_SKIP_AUTH

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_AZURE_CLIENT_ID=$VITE_AZURE_CLIENT_ID
ENV VITE_AZURE_TENANT_ID=$VITE_AZURE_TENANT_ID
ENV VITE_REDIRECT_URI=$VITE_REDIRECT_URI
ENV VITE_SKIP_AUTH=$VITE_SKIP_AUTH

RUN npm run build -w apps/admin

# Production stage - serve med nginx
FROM nginx:alpine AS runner

# Kopier nginx-konfigurasjon
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf

# Kopier bygget app
COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
