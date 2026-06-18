FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY client/package*.json ./client/
RUN npm ci --prefix client --include=dev

COPY . .
RUN npm run build --prefix client

CMD ["node", "scheduler.js"]
