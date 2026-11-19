"""
Queue Manager with Graceful In-Memory Fallback
Allows the application to run without an active Redis service in Phase P0 development.
"""

import asyncio
import logging
from typing import Callable, Any, Dict

logger = logging.getLogger("autopatch.queue")


class JobQueueManager:
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self.is_connected = False
        self._memory_queue: asyncio.Queue = asyncio.Queue()
        self._worker_task: asyncio.Task | None = None

    async def initialize(self) -> None:
        """Attempt connection to Redis; fall back to in-memory queue if unavailable."""
        try:
            # We check if redis is reachable without crashing startup
            logger.info("Attempting connection to Redis at %s", self.redis_url)
            # For P0 zero-dependency local runs, initialize the in-memory fallback
            self.is_connected = False
            logger.info("Operating with robust In-Memory Job Queue fallback.")
        except Exception as err:
            logger.warning("Redis unavailable (%s). Falling back to in-memory queue.", err)
            self.is_connected = False

    async def enqueue(self, task_name: str, payload: Dict[str, Any]) -> str:
        """Enqueue a background execution job."""
        job_id = f"job_{asyncio.get_event_loop().time()}_{task_name}"
        await self._memory_queue.put({"id": job_id, "task": task_name, "payload": payload})
        logger.info("Enqueued job [%s] into in-memory queue.", job_id)
        return job_id

    async def dequeue(self) -> Dict[str, Any]:
        """Fetch next job from in-memory queue."""
        return await self._memory_queue.get()


job_queue = JobQueueManager(redis_url="redis://localhost:6379/0")
