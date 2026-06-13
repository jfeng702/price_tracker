#!/bin/sh
set -e

node scheduler.js &
node listing-worker.js &
node product-worker.js &

wait
