# Matches the pin, and every non-node image is left alone.
FROM node:20-alpine AS base
FROM --platform=linux/amd64 node:20.20.2 AS pinned-patch
FROM base AS builder
FROM ghcr.io/shopify/toxiproxy:2.9.0 AS proxy
FROM node:${SOME_VAR} AS interpolated
