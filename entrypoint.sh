#!/bin/sh
# entrypoint.sh - a dedicated file used by Docker: The ENTRYPOINT instruction is used to configure the executables that will always run after the container is initiated.
set -e

echo "==> Environment: $NODE_ENV"

# 1. Run migrations using your package.json script
echo "==> Running Drizzle Migrations..."
# using raw cmd here instead of my "db:push" script as I don't want to use --force everytime;
# but on cloud services, you won't be able to reply to Y/N warnings so for now, going with this on render
# possibly something to improve, especially as running --force in prod could be risky, might be better to deploy to prod via a terminal
# (but then you break the staging & production identical-deploy steps rule)
npx drizzle-kit push --force

# 2. Start the application
echo "==> Starting Application..."
exec npm run start