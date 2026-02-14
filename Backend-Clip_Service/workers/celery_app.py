from celery import Celery
from app.config import settings

# Create Celery app
celery_app = Celery(
    'clipscutter',
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=['workers.tasks']
)

# Celery configuration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour max
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=50,
    broker_connection_retry_on_startup=True,
)

# Task routes
celery_app.conf.task_routes = {
    'workers.tasks.process_clip': {'queue': 'clips'},
}
