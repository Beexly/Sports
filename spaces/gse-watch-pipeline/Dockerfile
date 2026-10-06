FROM python:3.11-slim

# System deps for opencv-headless + ultralytics.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Bake the YOLO weights into the image — NO runtime downloads.
# (~6 MB for yolov8n.pt; keeps cold starts deterministic on ZeroGPU.)
RUN python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"

COPY app.py .

EXPOSE 7860

# Single worker: per-game tracklet state lives in-process and must not be
# sharded across workers. Scale by adding capture inputs, not replicas.
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "1"]
