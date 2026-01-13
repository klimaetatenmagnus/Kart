# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Kopier package files
COPY package*.json ./
COPY apps/widget/package*.json ./apps/widget/
COPY packages/shared/package*.json ./packages/shared/

# Installer avhengigheter
RUN npm ci --workspace=@klimaoslo-kart/widget --workspace=@klimaoslo-kart/shared

# Kopier kildekode
COPY packages/shared ./packages/shared
COPY apps/widget ./apps/widget

# Bygg
ARG VITE_API_URL
ARG VITE_GOOGLE_MAPS_API_KEY

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY

RUN npm run build -w apps/widget

# Production stage
FROM nginx:alpine AS runner

COPY apps/widget/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/widget/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
