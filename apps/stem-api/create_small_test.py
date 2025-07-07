import base64
import subprocess
import os

def create_small_test_audio():
    """Create a small test audio file and convert to base64"""
    
    # Create a 1-second test audio file using ffmpeg
    test_file = "small_test.wav"
    
    # Generate a simple sine wave
    cmd = [
        "ffmpeg", "-f", "lavfi", 
        "-i", "sine=frequency=440:duration=1", 
        "-acodec", "pcm_s16le", 
        test_file, "-y"
    ]
    
    try:
        subprocess.run(cmd, check=True, capture_output=True)
        print(f"Created test audio file: {test_file}")
        
        # Convert to base64
        with open(test_file, "rb") as f:
            audio_data = f.read()
            audio_b64 = base64.b64encode(audio_data).decode('utf-8')
        
        # Save base64 to file
        with open("small_test.b64", "w") as f:
            f.write(audio_b64)
        
        print(f"Created small_test.b64 ({len(audio_b64)} characters)")
        print("You can now test with:")
        print("curl -X POST http://localhost:8080/ \\")
        print("  -H \"Content-Type: application/json\" \\")
        print("  -d @small_test_payload.json")
        
        # Create JSON payload file
        payload = {
            "audio_b64": audio_b64,
            "filename": "small_test.wav",
            "id": "small-test-001"
        }
        
        import json
        with open("small_test_payload.json", "w") as f:
            json.dump(payload, f)
        
        print("Created small_test_payload.json")
        
    except subprocess.CalledProcessError as e:
        print(f"Error creating test audio: {e}")
        print("Make sure ffmpeg is installed")

if __name__ == "__main__":
    create_small_test_audio() 