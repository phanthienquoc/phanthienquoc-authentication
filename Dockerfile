FROM node:24-alpine AS build
WORKDIR /app

COPY package.json ./
RUN npm install --package-lock-only --ignore-scripts --no-audit --no-fund \
 && npm ci --ignore-scripts --no-audit --no-fund

COPY nest-cli.json tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:24-alpine AS production
ENV NODE_ENV=production
WORKDIR /app

COPY package.json ./
RUN npm install --package-lock-only --ignore-scripts --no-audit --no-fund \
 && npm ci --omit=dev --ignore-scripts --no-audit --no-fund \
 && npm cache clean --force

COPY --from=build /app/dist ./dist
USER node
EXPOSE 4010
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4010/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
