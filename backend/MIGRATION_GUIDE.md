# PostgreSQL Migration Guide - CouplesAI

This guide covers moving from SQLite (development) to PostgreSQL (production) and managing encrypted fields.

## Quick Start: Docker Compose

The simplest path for local PostgreSQL development:

```bash
docker-compose up -d
```

This starts:
- PostgreSQL 16 (db): `postgres://couplesai:couplesai_password@localhost:5432/couplesai`
- Redis 7 (redis): `redis://localhost:6379` (db 0, 1, 2)
- Backend (optional): runs migrations automatically

## Fresh PostgreSQL Setup (Manual)

### 1. Set Database URL

Create or update `backend/.env`:

```env
DATABASE_URL=postgres://user:password@localhost:5432/couplesai
DJANGO_SETTINGS_MODULE=config.settings.production
```

Replace `user`, `password`, and host as needed. For Docker Compose, use the default values above.

### 2. Run Migrations

```bash
cd backend
uv run python manage.py migrate
```

This creates all database tables and indexes. Check `backend/apps/*/migrations/` for schema details.

### 3. Create Superuser (Optional)

```bash
uv run python manage.py createsuperuser
```

## Fernet Encryption Keys

Five models use `EncryptedTextField` (djfernet): **Chat**, **Consents**, **Audio**, **Patterns**, **Safety**.

### Generate a New Key

```bash
uv run python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Output example: `Tw6IKPg_AApN_RVtLWwmCGM20q3sUkURg7LwWvjClSA=`

### Set in Environment

Add to `backend/.env`:

```env
FERNET_KEYS=Tw6IKPg_AApN_RVtLWwmCGM20q3sUkURg7LwWvjClSA=
```

For key rotation, provide a list (newest first):

```env
FERNET_KEYS=NewKey1,OldKey2,OldKey3
```

Django will encrypt with the first key and decrypt with any in the list.

**Production:** Generate unique keys and store securely (never commit to git).

## Redis Database Layout

Redis is partitioned by database number:

- **db 0**: Channels (WebSocket layer)
- **db 1**: Celery (async tasks)
- **db 2**: Cache (Django cache backend)

Set in `backend/.env`:

```env
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/1
CACHE_REDIS_URL=redis://localhost:6379/2
```

Docker Compose provides these defaults automatically.

## Development: SQLite

SQLite is the default for local development (no setup required).

When `DATABASE_URL` is **not set**, Django uses:
```
sqlite:///db.sqlite3
```

To use SQLite:
1. Remove `DATABASE_URL` from `backend/.env`
2. Use `DJANGO_SETTINGS_MODULE=config.settings.base` (or leave unset for DEBUG=True default)

## Switching Back to SQLite

If you've been using PostgreSQL and want to return to SQLite for local development:

```bash
# In backend/.env, remove or unset DATABASE_URL
unset DATABASE_URL
```

Restart your server. Django will automatically use SQLite.

**Note:** This loses all PostgreSQL data. Export data first if needed:

```bash
uv run python manage.py dumpdata > backup.json
```

To restore to SQLite after switching back:

```bash
uv run python manage.py migrate  # Create schema
uv run python manage.py loaddata backup.json
```

## Troubleshooting

### "PostgreSQL is not ready"

Wait for the health check to pass:

```bash
docker-compose ps
```

All services should show `healthy`.

### "No such table" with PostgreSQL

Migrations weren't run. Execute:

```bash
uv run python manage.py migrate
```

### Encrypted fields show garbled data

Wrong `FERNET_KEYS` value. Regenerate and re-encrypt:

```bash
# Backup first
uv run python manage.py dumpdata > backup.json

# Generate new key and update .env
uv run python manage.py shell
# In shell: regenerate encrypted field data
```

### Redis connection refused

Verify Redis is running and listening:

```bash
redis-cli ping
# Should return: PONG
```

If using Docker:

```bash
docker-compose logs redis
```

## Environment Checklist

Before running the backend:

- [ ] `DATABASE_URL` set (PostgreSQL) or unset (SQLite)
- [ ] `DJANGO_SECRET_KEY` generated and set
- [ ] `FERNET_KEYS` generated and set
- [ ] `REDIS_URL`, `CELERY_BROKER_URL`, `CACHE_REDIS_URL` configured
- [ ] `LLM_PROVIDER` and API keys set (OpenRouter, OpenAI, etc.)
- [ ] Migrations applied: `uv run python manage.py migrate`

## Production Deployment

In production, use the Docker images with environment variables:

```bash
docker-compose -f docker-compose.yml up -d
```

The entrypoint script (`entrypoint.sh`) automatically:
1. Waits for PostgreSQL readiness
2. Runs migrations
3. Collects static files
4. Starts the service (Daphne, Celery Worker, or Celery Beat)

All configuration comes from environment variables (via `.env` or secrets manager).
