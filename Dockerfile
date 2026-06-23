# Mindlockresidence — Node app (statische site + dashboard API)
FROM node:22-slim

WORKDIR /app

# Alleen manifesten eerst (betere build-cache)
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# App-code
COPY . .

# Persistente data (db + uploads) leeft hier; mount dit als volume in Coolify
ENV DATA_DIR=/app/data
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
