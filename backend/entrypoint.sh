#!/bin/bash
set -e

# Safety check: ensure settings module is configured
if [ -z "$DJANGO_SETTINGS_MODULE" ]; then
    echo "ERROR: DJANGO_SETTINGS_MODULE is not set"
    exit 1
fi

# Wait for PostgreSQL to be ready
if [ -n "$DATABASE_URL" ]; then
    echo "Waiting for PostgreSQL..."
    while ! pg_isready -h "${DB_HOST:-db}" -p "${DB_PORT:-5432}" -q 2>/dev/null; do
        echo "PostgreSQL not ready, retrying in 2s..."
        sleep 2
    done
    echo "PostgreSQL is ready!"
fi

# Only the main backend (daphne) should run migrations and collectstatic
# to avoid race conditions when multiple services start simultaneously.
if echo "$@" | grep -q "daphne"; then
    echo "Running migrations..."
    python manage.py migrate --noinput

    # Collect static files (non-fatal in dev)
    echo "Collecting static files..."
    python manage.py collectstatic --noinput || echo "WARNING: collectstatic failed, continuing..."
else
    echo "Skipping migrations (handled by backend service)..."
    # Wait a bit for backend to finish migrations
    sleep 5
fi

# Execute the main command (daphne, celery worker, or celery beat)
echo "Starting: $@"
exec "$@"
