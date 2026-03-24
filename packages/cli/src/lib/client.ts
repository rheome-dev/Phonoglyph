import { requireApiKey, getApiUrl } from './config';

/**
 * Lightweight tRPC HTTP client that doesn't require importing API source types.
 * Uses the tRPC v10 HTTP protocol directly.
 */
export class RayboxClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.apiKey = requireApiKey();
    this.baseUrl = `${getApiUrl()}/api/trpc`;
  }

  private async request(path: string, method: 'GET' | 'POST', input?: any): Promise<any> {
    const url = method === 'GET' && input
      ? `${this.baseUrl}/${path}?input=${encodeURIComponent(JSON.stringify(input))}`
      : `${this.baseUrl}/${path}`;

    const response = await fetch(url, {
      method: method === 'GET' ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: method === 'POST' ? JSON.stringify(input) : undefined,
    });

    if (!response.ok) {
      const text = await response.text();
      let message: string;
      try {
        const parsed = JSON.parse(text);
        message = parsed?.error?.message || parsed?.message || text;
      } catch {
        message = text;
      }
      throw new Error(`API error (${response.status}): ${message}`);
    }

    const json: any = await response.json();

    // tRPC wraps results in { result: { data: ... } }
    if (json?.result?.data !== undefined) {
      return json.result.data;
    }
    return json;
  }

  /** tRPC query (GET) */
  async query(path: string, input?: any): Promise<any> {
    return this.request(path, 'GET', input);
  }

  /** tRPC mutation (POST) */
  async mutate(path: string, input?: any): Promise<any> {
    return this.request(path, 'POST', input);
  }
}

let _client: RayboxClient | null = null;

export function getClient(): RayboxClient {
  if (!_client) {
    _client = new RayboxClient();
  }
  return _client;
}
