# price_tracker

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

## Deploy (recommended: GCP free VM)

Use a **small VM for Node only** plus **free managed** Mongo and Redis. No Render, no Kafka, no heavy Docker stack on the VM.

### 1. Managed services (free tier)

| Service | Provider |
|---------|----------|
| MongoDB | [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) M0 |
| Redis | **Local on VM** (recommended) or [Upstash](https://upstash.com/) |

**Oracle / GCP VM:** install Redis on the same machine to avoid Upstash’s free-tier command limit (~500k/month). The scheduler used to poll Redis every second while idle; use local Redis or pull the latest `scheduler.js` (sleeps until the next scheduled crawl).

**Docker on VM** (recommended): `docker-compose.ext.yml` includes a Redis container — set in `.env`:

```bash
REDIS_URL=redis://redis:6379
```

Do **not** put your Upstash URL here; the free tier caps at ~500k commands/month and the old scheduler polled every second.

**Bare metal** (`npm run workers` without Docker): install Redis on the host:

```bash
sudo apt install -y redis-server
sudo systemctl enable --now redis-server
# .env → REDIS_URL=redis://127.0.0.1:6379
```

Do **not** expose port 6379 in your cloud firewall.

In Atlas: create cluster → Database Access user → Network Access allow your VM IP (or `0.0.0.0/0` for testing).

In Upstash: create Redis database → copy the TLS URL (`rediss://...`).

### 2. GCP Compute Engine VM

1. [Google Cloud Console](https://console.cloud.google.com/) → **Compute Engine** → **Create instance**.
2. **Region:** `us-central1`, `us-east1`, or `us-west1` (Always Free `e2-micro` regions).
3. **Machine type:** `e2-micro` (1 GB RAM).
4. **Boot disk:** Ubuntu 22.04 LTS, 30 GB.
5. **Firewall:** allow HTTP/HTTPS if you want the UI on the internet.
6. Create → note the **external IP**.

SSH in:

```bash
gcloud compute ssh YOUR_INSTANCE_NAME --zone YOUR_ZONE
```

Or use the browser SSH button in the console.

### 3. Install Node on the VM

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 4. Deploy the app

```bash
git clone https://github.com/YOUR_USER/price_tracker.git
cd price_tracker
npm install
npm run build:client

# .env → MONGO_URL, REDIS_URL=redis://redis:6379, NODE_ENV=production, PORT=3000
docker compose -f docker-compose.ext.yml --env-file .env up --build -d
docker compose -f docker-compose.ext.yml --env-file .env --profile seed run --build --rm seed
```

Open `http://EXTERNAL_IP:3000` (add firewall rule for port 3000, or use HTTPS below).

### 5. Keep it running (optional)

Use **systemd** so workers and web restart after reboot. Example `/etc/systemd/system/price-tracker.service`:

```ini
[Unit]
Description=Price Tracker
After=network.target

[Service]
Type=simple
User=YOUR_USER
WorkingDirectory=/home/YOUR_USER/price_tracker
Environment=MONGO_URL=mongodb+srv://...
Environment=REDIS_URL=rediss://...
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm run workers
Restart=always

[Install]
WantedBy=multi-user.target
```

Run web in a second service or combine with a small shell wrapper.

### 6. HTTPS (optional)

Install Caddy, point a domain’s A record to the VM, reverse proxy to `localhost:3000`. Only expose **80/443** in GCP firewall — not Redis or Mongo.

### Oracle Cloud instead of GCP

Same steps on an **E2.Micro** (1 GB) or **A1** instance if you can provision one. Use Oracle Linux or Ubuntu, `firewalld` or security lists for ports 22 and 80/443.

### Docker on VM with external DBs

```bash
# .env on the VM
MONGO_URL=mongodb+srv://...
REDIS_URL=rediss://...
NODE_ENV=production

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

### Seed seems to do nothing

Seed only writes to **Redis** (`crawl_schedule`). Workers must use the **same** `REDIS_URL` as seed.

| You ran | Workers use | Result |
|---------|-------------|--------|
| `docker compose --profile seed run seed` | `docker-compose.ext.yml` + `.env` (Upstash) | **Broken** — seed hits local Redis, workers hit Upstash |
| `npm run seed` without `.env` loaded | Upstash in Docker | **Broken** — seed hits `localhost` |

**Fix** — seed with the same compose file and env as your workers:

```bash
docker compose -f docker-compose.ext.yml --env-file .env --profile seed run --build --rm seed
```

Or locally (`.env` is loaded via `dotenv` in `redisClient.js`):

```bash
npm run seed
```

Then confirm the pipeline is running (seed alone is not enough):

```bash
docker compose -f docker-compose.ext.yml --env-file .env up -d scheduler listing-worker product-worker
```

Check scheduler logs for `Dispatch listing job`. Products appear in the UI only after **product-worker** writes to Mongo (`MONGO_URL` must be set).

## Troubleshooting

### Upstash command limit exceeded (`ERR max requests limit exceeded`)

Your Upstash free tier is exhausted. Remove `REDIS_URL` from `.env` or set:

```bash
REDIS_URL=redis://redis:6379
```

Then recreate containers so nothing still points at Upstash:

```bash
docker compose -f docker-compose.ext.yml --env-file .env down
docker compose -f docker-compose.ext.yml --env-file .env up --build -d --force-recreate
docker compose -f docker-compose.ext.yml --env-file .env --profile seed run --build --rm seed
```

Verify seed logs show `redisHost: "redis"` (not an `upstash.io` hostname).

### Scheduled crawl never starts

1. **Workers must be running** (seed only writes to Redis):

```bash
docker compose -f docker-compose.ext.yml --env-file .env ps
docker compose -f docker-compose.ext.yml --env-file .env logs --tail=50 scheduler listing-worker product-worker
```

All three should be `Up`. Look for `Listing scrape` / `Scraped product` in logs.

2. **Same Redis everywhere** — seed, scheduler, and workers must share `REDIS_URL` (default `redis://redis:6379` in Docker).

3. **Inspect Redis** (from the VM):

```bash
docker compose -f docker-compose.ext.yml --env-file .env exec redis redis-cli ZRANGE crawl_schedule 0 -1 WITHSCORES
docker compose -f docker-compose.ext.yml --env-file .env exec redis redis-cli LLEN queue:listing_jobs
docker compose -f docker-compose.ext.yml --env-file .env exec redis redis-cli LLEN queue:product_jobs
```

4. **Re-seed** (updates schedule and enqueues a listing job immediately):

```bash
docker compose -f docker-compose.ext.yml --env-file .env --profile seed run --build --rm seed
docker compose -f docker-compose.ext.yml --env-file .env logs -f listing-worker
```

5. **Mongo** — listing crawl runs without Mongo, but the UI only updates when `product-worker` has a valid `MONGO_URL`.

### Vite: `Cannot find module @rollup/rollup-darwin-arm64`

```bash
cd client && rm -rf node_modules package-lock.json && npm install
```

Use Node.js 20 LTS if issues persist.
