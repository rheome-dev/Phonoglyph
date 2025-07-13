'use client';

import { useEffect, useState } from 'react';

export default function WorkerTestPage() {
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testWorker = async () => {
    setLoading(true);
    setTestResult(null);

    try {
      // Test simple worker first
      console.log('🧪 Testing simple worker...');
      const simpleWorker = new Worker('/workers/simple-test-worker.js');
      
      const simpleResult = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Simple worker test timeout'));
        }, 5000);

        simpleWorker.onmessage = (event) => {
          clearTimeout(timeout);
          resolve(event.data);
        };

        simpleWorker.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };
      });

      console.log('✅ Simple worker result:', simpleResult);
      
      // Send ping to simple worker
      simpleWorker.postMessage({ type: 'PING' });
      
      const pongResult = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Pong timeout'));
        }, 5000);

        simpleWorker.onmessage = (event) => {
          clearTimeout(timeout);
          resolve(event.data);
        };
      });

      simpleWorker.terminate();

      // Test Meyda worker
      console.log('🧪 Testing Meyda worker...');
      const meydaWorker = new Worker('/workers/test-meyda-worker.js');
      
      const meydaResult = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Meyda worker test timeout'));
        }, 5000);

        meydaWorker.onmessage = (event) => {
          clearTimeout(timeout);
          resolve(event.data);
        };

        meydaWorker.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };
      });

      meydaWorker.terminate();

      setTestResult({
        simple: simpleResult,
        pong: pongResult,
        meyda: meydaResult
      });
    } catch (error) {
      setTestResult({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Worker Test Page</h1>
      
      <button 
        onClick={testWorker}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test Worker'}
      </button>

      {testResult && (
        <div className="mt-4 p-4 border rounded">
          <h2 className="font-bold mb-2">Test Results:</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm">
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 