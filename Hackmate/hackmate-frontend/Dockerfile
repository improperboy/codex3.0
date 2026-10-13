# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Cache dependencies
COPY package*.json ./
RUN npm ci

# Copy source files and build
COPY . .

# VITE_API_BASE_URL can be overridden at build time via --build-arg
ARG VITE_API_BASE_URL=https://hackmateapi.dulify.in
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# ── Stage 2: Production Runner ───────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Default backend URL for dynamic Nginx template substitution
ENV BACKEND_URL=https://hackmateapi.dulify.in

# Clean default assets
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx configuration template (automatically processed by docker-entrypoint with envsubst)
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Fallback static config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:80/health > /dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
