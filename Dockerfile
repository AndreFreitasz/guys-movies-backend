FROM node:20-bookworm AS builder

WORKDIR /usr/src/app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build

RUN npm prune --omit=dev


FROM node:20-bookworm-slim AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/package.json ./package.json

EXPOSE 3005

CMD ["node", "dist/main"]
