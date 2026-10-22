#!/usr/bin/env bash
# Run against a disposable local database only. Migrations modify the database.
set -euo pipefail
image="${1:-youcongress:ci}"
container="youcongress-smoke-${GITHUB_RUN_ID:-$$}"
settings=(
  --network host
  -e DATABASE_URL=ecto://postgres:postgres@localhost/you_congress
  -e DATABASE_SSL=false
  -e BASE_URL=http://localhost:4000
  -e LIVEVIEW_TRANSPORT=longpoll
  -e SECRET_KEY_BASE=ci-only-secret-key-base-not-for-production-0123456789abcdef0123456789
  -e SENDGRID_API_KEY=ci-placeholder
)
cleanup() {
  docker logs "$container" 2>&1 || true
  docker rm -f "$container" >/dev/null 2>&1 || true
}
trap cleanup EXIT
docker run --rm "${settings[@]}" "$image" /app/bin/migrate
docker run --detach --name "$container" "${settings[@]}" "$image"
for attempt in {1..60}; do
  if curl --fail --silent http://localhost:4000/about > /tmp/youcongress-smoke.html; then
    grep -q '<html' /tmp/youcongress-smoke.html
    echo 'Production release served /about successfully.'
    PHOENIX_ORIGIN=http://localhost:4000 node scripts/build-vercel.mjs
    node scripts/check-liveview.cjs
    exit 0
  fi
  if [ "$(docker inspect -f '{{.State.Running}}' "$container")" != true ]; then
    echo '::error::Production release exited before serving HTTP.'
    exit 1
  fi
  sleep 2
done
echo '::error::Production release did not serve /about within 120 seconds.'
exit 1
