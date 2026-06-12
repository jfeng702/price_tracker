# price_tracker

Price scraping pipeline: scheduler enqueues listing jobs, workers scrape listings and product pages, results land in Mongo. Tracks price changes for a gardening store.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) with Docker Compose

For running workers on your machine instead of in containers:

- Node.js 20+
- npm

## Run with Docker Compose (recommended)

Starts Redis, Kafka, Mongo, and all workers. Workers run in development mode (pretty logs, code mounted from your working tree).

```bash
docker compose up --build
```

Add `-d` to run in the background:

```bash
docker compose up --build -d
```

After editing code, restart the affected worker (or the whole stack). There is no auto-reload yet.

Open the React web UI at [http://localhost:3000](http://localhost:3000) — product table and price-over-time charts. The `web` service builds the client on startup.

### Seed data (optional)

```bash
docker compose --profile seed run --rm seed
```

### Useful commands

```bash
# Follow logs for one service
docker compose logs -f product-worker

# Stop everything
docker compose down

# Stop and remove volumes (clears Mongo/Kafka data)
docker compose down -v
```

## Run locally (workers on your machine)

Use Docker only for infrastructure, then run Node processes locally.

```bash
# Start infra
docker compose up -d redis zookeeper kafka mongo

# Install dependencies
npm install

# Optional: seed
npm run seed

# Run each worker in a separate terminal
npm run scheduler
npm run listing
npm run product

# Web UI — build React client, then start API (http://localhost:3000)
npm run build:client
npm run web

# Or run frontend dev server with hot reload (API on :3000, UI on :5173)
npm run web
npm run dev:client
```

When connecting to Kafka from the host, use port `9093` (not `9092`):

```bash
export KAFKA_BROKER=localhost:9093
```

Redis and Mongo default to `localhost` (`redis://localhost:6379`, `mongodb://localhost:27017`).

Stop infra when done:

```bash
docker compose down
```

## Troubleshooting

### `Cannot find module @rollup/rollup-darwin-arm64` (Vite / `npm run dev:client`)

npm sometimes skips Rollup’s platform-specific optional dependency. Fix:

```bash
cd client
rm -rf node_modules package-lock.json
npm install
npm run dev
```

If `rm` fails on `node_modules/nanoid/.claude`, remove that folder first:

```bash
chmod -R u+w node_modules/nanoid 2>/dev/null; rm -rf node_modules package-lock.json
```

If npm reports cache permission errors:

```bash
sudo chown -R "$(whoami)" ~/.npm
```

Use **Node.js 20 LTS** if issues persist (Node 25 is not tested with this project).
