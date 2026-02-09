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

# Run migrations
echo "Running migrations..."
python manage.py migrate --noinput

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Execute the main command (daphne, celery worker, or celery beat)
echo "Starting: $@"
exec "$@"
