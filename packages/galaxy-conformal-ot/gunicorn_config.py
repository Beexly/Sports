"""Gunicorn production configuration for GSI Research API (`gsi_research_api_wrapper:app`)."""
import multiprocessing

bind = "0.0.0.0:8085"
workers = max(2, multiprocessing.cpu_count())
worker_class = "uvicorn.workers.UvicornWorker"
timeout = 60
keepalive = 5
accesslog = "-"
errorlog = "-"
loglevel = "info"
