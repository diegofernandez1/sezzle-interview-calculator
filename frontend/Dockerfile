# Build stage: installs dependencies and builds the static site.
FROM node:22-alpine AS build
WORKDIR /app

# Dependencies first, in their own layer, so a source change does not
# install them again.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# VITE_API_URL is left empty on purpose: the browser calls /api on the same
# address that served the page, and nginx forwards it to the service.
RUN npm run build

# Final stage: nginx serves the built files and forwards /api to the service.
FROM nginx:stable-alpine

# Where nginx forwards /api. The image's entrypoint substitutes this into the
# template below when the container starts.
ENV CALC_SERVICE_URL=http://calculate-service:8080

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --start-period=3s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
