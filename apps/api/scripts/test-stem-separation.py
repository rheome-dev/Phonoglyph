import os
import sys
import time
from pathlib import Path
from typing import Dict, Optional
import runpod
from dotenv import load_dotenv

load_dotenv()

RUNPOD_API_KEY = os.getenv('RUNPOD_API_KEY')
if not RUNPOD_API_KEY:
    raise ValueError('RUNPOD_API_KEY environment variable is required')

runpod.api_key = RUNPOD_API_KEY

# RTX 4090 Pod Template Configuration
POD_CONFIG = {
    'name': 'stem-separation-test',
    'image_name': 'runpod/pytorch:2.1.0-py3.10-cuda11.8-devel-ubuntu22.04',
    'gpu_type_id': 'NVIDIA RTX 4090',  # Specific GPU type
    'gpu_count': 1,
    'volume_in_gb': 40,
    'container_disk_in_gb': 40,
    'ports': '8888/http,22/tcp',  # Jupyter + SSH ports
    'volume_mount_path': '/workspace'
}

class StemSeparationTest:
    def __init__(self, audio_path: str):
        self.audio_path = Path(audio_path)
        if not self.audio_path.exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")
        
        # Define model configurations
        self.configs = [
            {
                'model': 'spleeter',
                'setup_commands': [
                    'pip install spleeter',
                    'apt-get update && apt-get install -y ffmpeg'
                ],
                'separation_command': 'spleeter separate -p spleeter:4stems -o /workspace/output {input_file}'
            },
            {
                'model': 'demucs',
                'setup_commands': [
                    'pip install demucs',
                    'apt-get update && apt-get install -y ffmpeg'
                ],
                'separation_command': 'demucs --mp3 --two-stems=vocals {input_file} -o /workspace/output'
            }
        ]
        
        self.output_dir = Path(__file__).parent.parent / 'test-output'
        self.output_dir.mkdir(exist_ok=True)

    async def setup_pod(self) -> str:
        """Create and start a RunPod instance."""
        print("Starting RunPod instance...")
        pod = runpod.create_pod(**POD_CONFIG)
        pod_id = pod['id']
        print(f"Pod created with ID: {pod_id}")
        
        # Wait for pod to be ready
        while True:
            status = runpod.get_pod(pod_id)['status']
            if status == 'RUNNING':
                break
            print(f"Waiting for pod to be ready... (status: {status})")
            time.sleep(5)
        
        return pod_id

    async def test_model(self, pod_id: str, config: Dict) -> Optional[Dict]:
        model = config['model']
        print(f"\nTesting {model}...")
        start_time = time.time()
        
        try:
            # Upload audio file
            print("Uploading audio file...")
            input_path = f"/workspace/input/{self.audio_path.name}"
            runpod.upload_file(pod_id, str(self.audio_path), input_path)

            # Run setup commands
            print("Setting up model environment...")
            for cmd in config['setup_commands']:
                runpod.exec(pod_id, cmd)

            # Run separation
            print("Running stem separation...")
            separation_cmd = config['separation_command'].format(input_file=input_path)
            result = runpod.exec(pod_id, separation_cmd)

            # Download results
            print("Downloading results...")
            model_output_dir = self.output_dir / model
            model_output_dir.mkdir(exist_ok=True)
            
            output_path = f"/workspace/output/{self.audio_path.stem}"
            runpod.download_file(pod_id, output_path, str(model_output_dir))

            duration = time.time() - start_time
            return {
                'model': model,
                'duration': duration,
                'output_dir': str(model_output_dir)
            }

        except Exception as e:
            print(f"Error testing {model}:", e)
            return None

    async def run_tests(self):
        print("Starting stem separation test...")
        start_time = time.time()

        try:
            # Create and setup pod
            pod_id = await self.setup_pod()
            
            results = []
            for config in self.configs:
                result = await self.test_model(pod_id, config)
                if result:
                    results.append(result)

            # Cleanup
            print("\nCleaning up...")
            runpod.terminate_pod(pod_id)

            total_duration = time.time() - start_time
            print(f"\nTotal test duration: {total_duration:.2f} seconds")
            print(f"Total cost estimate: ${(total_duration / 3600) * 0.69:.3f}")
            
            return results

        except Exception as e:
            print("Error during testing:", e)
            if 'pod_id' in locals():
                runpod.terminate_pod(pod_id)
            return []

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python test-stem-separation.py <audio_file>")
        sys.exit(1)

    import asyncio
    audio_path = sys.argv[1]
    tester = StemSeparationTest(audio_path)
    results = asyncio.run(tester.run_tests())

    # Print summary
    print("\nTest Summary:")
    for result in results:
        print(f"\n{result['model']}:")
        print(f"  Processing time: {result['duration']:.2f} seconds")
        print(f"  Output directory: {result['output_dir']}") 