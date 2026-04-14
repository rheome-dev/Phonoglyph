# Remotion Lambda Logs

Check CloudWatch logs for Remotion Lambda renders to debug rendering issues.

## Usage

**Slash Command:** `/remotion-logs`

**Trigger:** When user asks to check Lambda logs, debug render issues, or check why a render failed.

## AWS Lambda Functions

There are multiple Remotion Lambda functions (check which one is active):

| Function Name | Memory | Timeout |
|--------------|--------|---------|
| remotion-render-4-0-436-mem3008mb-disk2048mb-300sec | 3008MB | 300s |
| remotion-render-4-0-390-mem3008mb-disk2048mb-300sec | 3008MB | 300s |
| remotion-render-4-0-390-mem3008mb-disk2048mb-120sec | 3008MB | 120s |

**Note:** The function being used can be found in the render error message. Look for patterns like `remotion-render-4-0-XXX` in the error output.

## Default Log Group

For the 300-second timeout function (most common for full videos):
```
/aws/lambda/remotion-render-4-0-436-mem3008mb-disk2048mb-300sec
```

## Log Analysis Steps

### 1. Check for Recent Renders

First, check if there are recent Lambda invocations:
```bash
# Get recent logs (last few hours) - use the 436 function
aws logs filter-log-events \
  --log-group-name "/aws/lambda/remotion-render-4-0-436-mem3008mb-disk2048mb-300sec" \
  --start-time $(date -v-2H +%s)000 \
  --limit 50
```

### 2. Search for Errors

Search for ERROR patterns:
```bash
aws logs filter-log-events \
  --log-group-name "/aws/lambda/remotion-render-4-0-436-mem3008mb-disk2048mb-300sec" \
  --start-time $(date -v-2H +%s)000 \
  --filter-pattern "ERROR" \
  --limit 100
```

### 3. Check for Timeout Errors

```bash
aws logs filter-log-events \
  --log-group-name "/aws/lambda/remotion-render-4-0-436-mem3008mb-disk2048mb-300sec" \
  --start-time $(date -v-2H +%s)000 \
  --filter-pattern "timeout" \
  --limit 50
```

### 4. Check Encoding Issues

Look for "encoded 0 frames" which indicates encoding failures:
```bash
aws logs filter-log-events \
  --log-group-name "/aws/lambda/remotion-render-4-0-436-mem3008mb-disk2048mb-300sec" \
  --start-time $(date -v-2H +%s)000 \
  --filter-pattern "encoded" \
  --limit 50
```

### 5. Check for DelayRender Timeouts

```bash
aws logs filter-log-events \
  --log-group-name "/aws/lambda/remotion-render-4-0-436-mem3008mb-disk2048mb-300sec" \
  --start-time $(date -v-2H +%s)000 \
  --filter-pattern "delayRender" \
  --limit 50
```

## Common Issues

| Issue | Log Pattern | Solution |
|-------|-------------|----------|
| Lambda timeout | "Function is about to time out" | Reduce framesPerLambda |
| Encoding failure | "encoded 0 frames" | Check video codec settings |
| Component loading | "delayRender() timeout" | Check root component loads |
| WebGL errors | "gles2_cmd_decoder" | Expected with swangle, not blocking |

## Python Helper Script

For quick analysis, use the helper:
```bash
# Check latest render errors
python3 -c "
import subprocess
import json
import sys

# Get current timestamp and subtract 2 hours
import time
start_time = int((time.time() - 7200) * 1000)

result = subprocess.run([
    'aws', 'logs', 'filter-log-events',
    '--log-group-name', '/aws/lambda/remotion-render-4-0-390-mem3008mb-disk2048mb-120sec',
    '--start-time', str(start_time),
    '--limit', '100'
], capture_output=True, text=True)

data = json.loads(result.stdout)
errors = [e for e in data.get('events', []) if 'ERROR' in e.get('message', '')]
for e in errors[:20]:
    print(e['message'].strip()[:200])
"
```

## AWS CLI Path

The AWS CLI is installed at:
```
/Library/Frameworks/Python.framework/Versions/3.11/bin/aws
```

## Required IAM Permissions

The remotion-user needs these CloudWatch Logs permissions:
```json
{
  "Sid": "ReadLogs",
  "Effect": "Allow",
  "Action": [
    "logs:DescribeLogGroups",
    "logs:DescribeLogStreams",
    "logs:GetLogEvents",
    "logs:FilterLogEvents"
  ],
  "Resource": [
    "arn:aws:logs:*:*:log-group:/aws/lambda/remotion-*:*"
  ]
}
```
