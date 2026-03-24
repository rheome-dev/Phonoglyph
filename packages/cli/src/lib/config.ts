import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG_DIR = join(homedir(), '.raybox');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export interface CliConfig {
  apiUrl: string;
  apiKey: string;
}

const DEFAULT_CONFIG: CliConfig = {
  apiUrl: 'https://api.phonoglyph.rheome.tools',
  apiKey: '',
};

export function loadConfig(): CliConfig {
  if (!existsSync(CONFIG_FILE)) {
    return DEFAULT_CONFIG;
  }
  try {
    const raw = readFileSync(CONFIG_FILE, 'utf-8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: Partial<CliConfig>): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  const current = loadConfig();
  const merged = { ...current, ...config };
  writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2));
}

export function requireApiKey(): string {
  const config = loadConfig();
  const key = process.env.RAYBOX_API_KEY || config.apiKey;
  if (!key) {
    console.error(
      'No API key configured. Set RAYBOX_API_KEY env var or run:\n' +
      '  raybox config --api-key <your-key>\n\n' +
      'Generate an API key at https://raybox.fm/settings'
    );
    process.exit(1);
  }
  return key;
}

export function getApiUrl(): string {
  const config = loadConfig();
  return process.env.RAYBOX_API_URL || config.apiUrl;
}
