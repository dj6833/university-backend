#!/bin/sh
# entrypoint.sh - a dedicated file used by Docker: The ENTRYPOINT instruction is used to configure the executables that will always run after the container is initiated.
set -e

echo "==> Environment: $NODE_ENV"

# 1. Run migrations using your package.json script
echo "==> Running Drizzle Migrations..."
npm run db:migrate

# 2. Start the application
echo "==> Starting Application..."
exec npm run start