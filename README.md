# price_tracker

Tracks prices on a retail website and displays them in a frontend.

Scrapes listing and product pages, tracks prices in Mongo. Jobs flow through **Redis queues** (schedule, dedupe, and work queues) — no Kafka.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) with Docker Compose for local full stack
- Node.js 20+ and npm for local dev or VM deploy

## Run locally with Docker (full stack)

Starts Redis, Mongo, workers, and web UI.

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000).

Seed crawl schedule (optional):

```bash
docker compose --profile seed run --build --rm seed
```

```bash
docker compose down          # stop
docker compose down -v       # stop and wipe Mongo data
```

## Run locally (Node on your machine)

```bash
docker compose up -d redis mongo
npm install
npm run seed                 # optional
npm run workers              # scheduler + listing + product
npm run build:client && npm run web   # API + UI on :3000
```

Defaults: `redis://localhost:6379`, `mongodb://localhost:27017`.

## docker-compose.yml vs docker-compose.ext.yml

docker-compose.yml = full local stack; docker-compose.ext.yml = lean VM deploy with external Mongo and a small Redis container.

```bash
# .env → MONGO_URL, REDIS_URL=redis://redis:6379, NODE_ENV=production, PORT=3000
docker compose -f docker-compose.ext.yml --env-file .env up --build -d
docker compose -f docker-compose.ext.yml --env-file .env --profile seed run --build --rm seed
```

## Architecture

```
scheduler ──► Redis queue:listing_jobs ──► listing-worker
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    ▼                                                   ▼
         Redis queue:product_jobs                          queue:listing_jobs (pages)
                    │
                    ▼
              product-worker ──► Mongo (products, price_history)

web (Express) ── reads Mongo, serves React UI
```

Redis also holds `crawl_schedule` (sorted set) and dedupe keys.
