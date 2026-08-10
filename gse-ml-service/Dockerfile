# syntax=docker/dockerfile:1
#
# gse-ml-service — CPU-only FastAPI sidecar.
#
# Base: python:3.11-slim. NOT 3.10 — 3.11.15 is the interpreter this service's 328-test
# suite was actually verified on, and 3.11 is what the CI workflow installs. Keep the
# three in step; moving the base image means re-running the suite on it first.
#
# WHY MULTI-STAGE (the toolchain question, answered honestly)
# ----------------------------------------------------------
# ripser 0.6.15 is a C++ extension. It DOES publish cp311 manylinux_2_28 and musllinux
# wheels for both x86_64 and aarch64 (checked against its PyPI file list), so on an
# ordinary linux/amd64 or linux/arm64 build nothing is compiled and the compilers below
# go unused. They are here for the cases where the wheel does not apply — an unusual
# libc/arch, or a private index mirroring only the sdist — where pip silently falls back
# to building ripser from source and fails with "unable to execute 'gcc'".
#
# A multi-stage build makes that insurance free: build-essential lives in the builder
# stage only, and the runtime stage receives nothing but the finished virtualenv. The
# single-stage alternative (apt install ... && pip install ... && apt purge ... in one
# RUN) also keeps the layer small, but it leaves the purge as a thing to get right by
# hand and cannot un-install what the toolchain pulled in transitively. Copying a venv
# out of a throwaway stage is the version that cannot rot.
#
# Build & run:
#   docker build -t gse-ml-service:local gse-ml-service/
#   docker run --rm -p 8000:8000 gse-ml-service:local
#   curl localhost:8000/health
#
# NOT VERIFIED HERE: the development sandbox this file was written in has the docker
# CLI but no running daemon, so this image has never been built. Everything it installs
# — the exact pin set, `pip install --no-deps -r requirements.txt`, the test suite, and
# a live `uvicorn app.main:app` serving /health — was verified in a clean Python 3.11
# virtualenv instead. Build it once before trusting it in a pipeline.

# ---------------------------------------------------------------------------
# Stage 1: builder — compilers allowed, nothing here reaches the final image
# ---------------------------------------------------------------------------
FROM python:3.11-slim AS builder

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONDONTWRITEBYTECODE=1

# build-essential = gcc/g++/make, the fallback path for any sdist-only dependency.
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /srv
COPY requirements.txt ./

# --no-deps is REQUIRED: requirements.txt is a complete lock, and resolving deps would
# drag in persim -> hopcroftkarp (sdist-only, compiled at install time) plus the whole
# matplotlib stack, none of which this service imports. See requirements.txt's header.
# The --extra-index-url for the CPU torch wheel lives inside requirements.txt.
RUN pip install --no-deps -r requirements.txt

# ---------------------------------------------------------------------------
# Stage 2: runtime — no compilers, no apt caches, non-root
# ---------------------------------------------------------------------------
FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

# libgomp1: the OpenMP runtime. The numpy/scipy/scikit-learn/torch wheels normally ship
# their own copy inside the package, so this is belt-and-braces rather than a known
# failure — it is ~100 KB and removes an entire class of "libgomp.so.1: cannot open
# shared object file" at import time.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --uid 10001 --shell /usr/sbin/nologin app

COPY --from=builder /opt/venv /opt/venv

WORKDIR /srv
# The package tree is deliberately __init__.py-free; WORKDIR=/srv puts the namespace
# package root on sys.path (uvicorn inserts the CWD, and app/main.py inserts its own
# parent as a belt-and-braces measure), so `app.main` and `app.models.*` both resolve.
# conftest.py is copied so the suite can also be run inside the image:
#   docker run --rm gse-ml-service:local pytest app/tests -q
COPY --chown=app:app conftest.py ./conftest.py
COPY --chown=app:app app ./app

USER app

EXPOSE 8000

# Uses the same /health endpoint an operator would curl. stdlib only — no curl in slim.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD ["python", "-c", "import urllib.request, sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4).status == 200 else 1)"]

# Single worker on purpose: every endpoint is CPU-bound numerics, so extra workers
# multiply memory (a torch process is not cheap) without adding throughput on a small
# instance. Scale with replicas, or raise this deliberately after measuring.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
