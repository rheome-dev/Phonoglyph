# Start from a slim Python 3.9 base image
FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Spleeter and FastAPI dependencies
RUN pip install spleeter fastapi uvicorn boto3

# Pre-warm Spleeter models with better error handling
RUN echo "Pre-warming Spleeter models..." && \
    # Create a minimal dummy audio file
    ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 0.1 -q:a 9 -acodec pcm_s16le /tmp/dummy.wav && \
    # Run Spleeter with timeout and error handling
    timeout 300 spleeter separate -p spleeter:4stems -o /tmp/output /tmp/dummy.wav || \
    (echo "Spleeter model download failed, will download on first run" && exit 0) && \
    # Clean up
    rm -f /tmp/dummy.wav && rm -rf /tmp/output && \
    echo "Spleeter setup completed."

WORKDIR /app
COPY main.py /app/main.py

EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
