"""Health check endpoints for container orchestration."""

import logging

from django.db import connection
from django.http import JsonResponse

logger = logging.getLogger(__name__)


def liveness(request):
    """Liveness probe - returns 200 if the process is running.

    Used by container orchestrators to determine if the process
    should be restarted.
    """
    return JsonResponse({'status': 'ok'})


def readiness(request):
    """Readiness probe - returns 200 if all dependencies are available.

    Checks database and Redis connectivity.
    Used by load balancers to determine if traffic should be routed here.
    """
    checks = {}
    healthy = True

    # Check database
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
        checks['database'] = 'ok'
    except Exception as e:
        checks['database'] = str(e)
        healthy = False
        logger.warning(f"Health check: database unhealthy: {e}")

    # Check Redis (channel layer)
    try:
        from django.conf import settings
        channel_backend = settings.CHANNEL_LAYERS.get('default', {}).get('BACKEND', '')
        if 'Redis' in channel_backend:
            import redis
            redis_url = settings.CHANNEL_LAYERS['default']['CONFIG']['hosts'][0]
            r = redis.from_url(redis_url)
            r.ping()
            checks['redis'] = 'ok'
        else:
            checks['redis'] = 'skipped (in-memory layer)'
    except Exception as e:
        checks['redis'] = str(e)
        healthy = False
        logger.warning(f"Health check: redis unhealthy: {e}")

    status_code = 200 if healthy else 503
    return JsonResponse(
        {'status': 'ok' if healthy else 'unhealthy', 'checks': checks},
        status=status_code,
    )
