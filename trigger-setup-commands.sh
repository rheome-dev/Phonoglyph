#!/bin/bash
# Trigger.dev setup for Phonoglyph

# 1. Install Trigger.dev CLI and SDK
cd apps/api
npm install @trigger.dev/sdk @trigger.dev/cli

# 2. Initialize Trigger.dev in your project
npx trigger.dev@latest init

# 3. Create trigger directory structure
mkdir -p src/trigger/jobs
mkdir -p src/trigger/lib

# 4. Add environment variables to .env
echo "TRIGGER_API_KEY=your_trigger_api_key" >> .env
echo "TRIGGER_API_URL=https://api.trigger.dev" >> .env

# 5. Update package.json scripts
npm pkg set scripts.trigger:dev="npx trigger.dev@latest dev"
npm pkg set scripts.trigger:deploy="npx trigger.dev@latest deploy"

# 6. Create Trigger.dev client configuration
cat > src/trigger/client.ts << 'EOF'
import { TriggerClient } from "@trigger.dev/sdk";

export const client = new TriggerClient({
  id: "phonoglyph-api",
  apiKey: process.env.TRIGGER_API_KEY!,
  apiUrl: process.env.TRIGGER_API_URL,
});
EOF

echo "✅ Trigger.dev setup complete!"
echo "Next steps:"
echo "1. Sign up at https://trigger.dev"
echo "2. Create a new project"
echo "3. Copy your API key to .env"
echo "4. Run 'npm run trigger:dev' to start development"
