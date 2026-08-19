# --- Stage 1: build frontend (web/) ---
FROM node:20-slim AS web-build
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ .
RUN npm run build

# --- Stage 2: build backend (server/) ---
FROM node:20-slim AS server-build
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /server
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/ .
RUN npx prisma generate
RUN npm run build

# --- Stage 3: runtime image ---
FROM node:20-slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Server: dist compilado, node_modules (incluye prisma CLI y tsx para el CMD), package.json,
# prisma/ (schema + migrations + seed.ts) y src/ (seed.ts importa "../src/lib/prisma" via tsx)
COPY --from=server-build /server/dist ./dist
COPY --from=server-build /server/node_modules ./node_modules
COPY --from=server-build /server/package.json ./package.json
COPY --from=server-build /server/prisma ./prisma
COPY --from=server-build /server/src ./src

# Frontend compilado: sibling de dist/ (ver server/src/index.ts, que resuelve
# __dirname/../web/dist para servir los estáticos)
COPY --from=web-build /web/dist ./web/dist

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE $PORT

CMD ["sh", "-c", "mkdir -p /app/data && npx prisma db push --skip-generate --accept-data-loss && npm run seed && node dist/index.js"]
