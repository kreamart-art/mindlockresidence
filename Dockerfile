# Mindlockresidence — Node app (statische site + dashboard API)
# node:24-slim => node:sqlite werkt zonder --experimental-sqlite flag (unflagged sinds 23.4 / 22.13).
FROM node:24-slim

WORKDIR /app

# Alleen manifesten eerst (betere build-cache)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# App-code
COPY . .

# Persistente data (db + uploads) leeft BUITEN de app-map zodat de statische
# server de database nooit kan uitleveren. Mount het Coolify-volume op /data.
ENV DATA_DIR=/data
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
