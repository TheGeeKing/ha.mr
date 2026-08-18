FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json copy-static.mjs generate-dictionaries.mjs compression-dictionaries.json ./
COPY docs/ ./docs/
COPY src/ ./src/
COPY tests/ ./tests/
RUN npm test

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ /usr/share/nginx/html/
