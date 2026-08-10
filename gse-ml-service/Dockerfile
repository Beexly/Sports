# gse-ml-service — experimental research sidecar (NOT production).
# See README.md for the non-production banner and integration-path checklist
# before this image is ever deployed anywhere a real request could reach it.

FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

# Run as a non-root user — this is a research sidecar, not a hardened
# production image, but there's no reason to default to root.
RUN useradd --no-create-home --uid 10001 gseml && chown -R gseml /app
USER gseml

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
