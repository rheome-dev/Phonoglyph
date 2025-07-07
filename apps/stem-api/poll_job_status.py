import requests
import time

api_key = 'your-api-key-here'  # <-- Put your API key here
job_id = '3c43a678-8104-4b8f-a3b0-d558a6650c12-u1'  # <-- Put your job ID here
url = f"https://api.runpod.ai/v2/s0qpwr9fskmbyj/status/{job_id}"
headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

while True:
    resp = requests.get(url, headers=headers)
    print(f"HTTP {resp.status_code}")
    try:
        data = resp.json()
        print(data)
        if data.get("status") == "COMPLETED":
            print("Job completed! Result:")
            print(data)
            break
        elif data.get("status") == "FAILED":
            print("Job failed.")
            break
        else:
            print("Still processing...")
    except Exception as e:
        print("Could not decode JSON. Raw response:")
        print(resp.text)
        print("Error:", e)
        break
    time.sleep(5)