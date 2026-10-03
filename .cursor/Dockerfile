# Galaxy Sports Edge — Cloud Agent base image.
#
# Adds the full local stack the repo's Path C documents (QUICKSTART.md):
# PostgreSQL + Redis, on top of Node 22 (package.json engines: node >=20).
# The default Cursor image has neither Postgres nor Redis, and Cloud Agents
# run as a non-root user that cannot apt-install them at runtime, so the
# system services belong here in the image.
#
# x86_64 Debian bookworm. The repository is checked out separately by Cursor,
# so nothing is COPYed in and the build context stays tiny (.cursor).
FROM node:22-bookworm

ENV DEBIAN_FRONTEND=noninteractive

# System packages: Postgres + Redis servers, plus git/curl and build basics
# for native module compilation and the repo's Python helper scripts.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      git \
      curl \
      ca-certificates \
      build-essential \
      python3 \
      postgresql \
      postgresql-contrib \
      redis-server \
 && rm -rf /var/lib/apt/lists/*

# Debian installs the Postgres server binaries under /usr/lib/postgresql/<ver>/bin,
# which is not on PATH. Symlink the ones start.sh needs into /usr/local/bin so
# they resolve for every user and shell (login or not).
RUN set -eux; \
    PGBIN="$(ls -d /usr/lib/postgresql/*/bin | sort -V | tail -n1)"; \
    for b in initdb pg_ctl postgres createdb psql pg_isready; do \
      ln -sf "$PGBIN/$b" "/usr/local/bin/$b"; \
    done

# The node:22 image ships an unprivileged `node` user (uid 1000) with a home
# directory. Postgres refuses to run as root, so Cloud Agents run as `node`
# (see environment.json "user") and the local Postgres data dir lives under
# /home/node. Make sure the home dir is owned by node.
RUN mkdir -p /home/node && chown -R node:node /home/node

USER node
WORKDIR /home/node
