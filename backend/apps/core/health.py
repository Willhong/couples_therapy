"""Health check endpoints for container orchestration."""

import logging
import os
from typing import Any, Dict

from django.conf import settings
from django.utils import timezone
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
    checks: Dict[str, Any] = {}
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
        channel_backend = settings.CHANNEL_LAYERS.get('default', {}).get('BACKEND', '')
        if 'Redis' in channel_backend:
            import redis

            channel_config = settings.CHANNEL_LAYERS.get('default', {}).get('CONFIG', {})
            redis_hosts = channel_config.get('hosts') if channel_config else None
            if not redis_hosts:
                raise ValueError('CHANNEL_LAYERS Redis host is not configured.')

            redis_url = redis_hosts[0]
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
        {
            'status': 'ok' if healthy else 'unhealthy',
            'checks': checks,
            'service_version': os.getenv('APP_VERSION', 'local'),
            'timestamp': timezone.now().isoformat(),
        },
        status=status_code,
    )
