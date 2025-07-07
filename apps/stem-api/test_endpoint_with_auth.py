import requests
import json
import sys
import os

def test_endpoint_with_auth():
    # Read the base64 audio file
    with open('small_test.b64', 'r') as f:
        audio_b64 = f.read().strip()
    
    # Prepare the payload
    payload = {
        "audio_b64": audio_b64,
        "filename": "small_test.wav",
        "id": "small-test-001"
    }
    
    # Send request to your RunPod endpoint
    url = "https://api.runpod.ai/v2/s0qpwr9fskmbyj/run"
    
    # Get API key from environment or prompt user
    api_key = 'rpa_0ECFVN927F7D4HBHIQDHYCOXYV481C0SEKO4V5PA1cxh7v'
    if not api_key:
        print("🔑 RunPod API Key not found in environment.")
        print("Please set your API key:")
        print("export RUNPOD_API_KEY='your-api-key-here'")
        print("\nOr enter it now (it won't be saved):")
        api_key = input("API Key: ").strip()
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    
    try:
        print("Sending request to:", url)
        print("Payload size:", len(audio_b64), "characters")
        print("Using API key:", api_key[:10] + "..." if api_key else "None")
        
        response = requests.post(url, json=payload, headers=headers, timeout=300)
        
        print(f"Status Code: {response.status_code}")
        print("Response Headers:", dict(response.headers))
        
        # Try to get response content
        try:
            response_json = response.json()
            print("Response JSON:")
            print(json.dumps(response_json, indent=2))
        except json.JSONDecodeError:
            print("Response Text (not JSON):")
            print(response.text)
        
        if response.status_code == 401:
            print("\n🔐 Still getting 401 Unauthorized!")
            print("Check your API key at: https://runpod.io/console/user/settings")
            print("Make sure your endpoint is configured correctly.")
        
    except requests.exceptions.RequestException as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_endpoint_with_auth() 