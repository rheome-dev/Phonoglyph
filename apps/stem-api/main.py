import os
import base64
import tempfile
import shutil
import subprocess
import boto3

# --- Configuration for R2 Storage ---
# These must be set as environment variables in your RunPod endpoint settings.
R2_ENDPOINT = os.environ.get("R2_ENDPOINT")
R2_ACCESS_KEY_ID = os.environ.get("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.environ.get("R2_SECRET_ACCESS_KEY")
R2_BUCKET = os.environ.get("R2_BUCKET")

# --- S3 Client Setup for R2 ---
# This client is configured to communicate with a Cloudflare R2 bucket.
s3 = boto3.client(
    "s3",
    endpoint_url=R2_ENDPOINT,
    aws_access_key_id=R2_ACCESS_KEY_ID,
    aws_secret_access_key=R2_SECRET_ACCESS_KEY,
    region_name="auto",
)

def handler(job):
    input_data = job.get('input', {})
    audio_b64 = input_data.get('audio_b64')
    filename = input_data.get('filename', 'input.wav')
    job_id = input_data.get('id', job.get('id', 'job'))
    file_base = os.path.splitext(filename)[0]
    job_dir = tempfile.mkdtemp(prefix=f"{job_id}_")
    input_path = os.path.join(job_dir, filename)
    output_dir = os.path.join(job_dir, "output")
    os.makedirs(output_dir, exist_ok=True)

    try:
        # 1. Decode and save audio
        with open(input_path, "wb") as f:
            f.write(base64.b64decode(audio_b64))

        # 2. Run Spleeter
        spleeter_cmd = [
            "spleeter", "separate", "-p", "spleeter:4stems",
            "-o", output_dir, input_path
        ]
        subprocess.run(spleeter_cmd, check=True, capture_output=True)

        # 3. Upload stems to R2
        stems = ["vocals", "drums", "bass", "other"]
        urls = {}
        for stem in stems:
            stem_path = os.path.join(output_dir, file_base, f"{stem}.wav")
            if not os.path.exists(stem_path):
                continue
            key = f"stems/{file_base}/{stem}.wav"
            with open(stem_path, "rb") as f:
                s3.put_object(Bucket=R2_BUCKET, Key=key, Body=f, ContentType="audio/wav")
            hostname = R2_ENDPOINT.split("//")[-1]
            urls[stem] = f"https://{hostname}/{R2_BUCKET}/{key}"

        return {"stems": urls}
    except Exception as e:
        return {"error": "Stem separation failed.", "details": str(e)}
    finally:
        shutil.rmtree(job_dir, ignore_errors=True)
