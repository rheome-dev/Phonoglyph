'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export function ApiTest() {
  const [testResults, setTestResults] = useState<{
    health: 'pending' | 'success' | 'error';
    sandboxTest: 'pending' | 'success' | 'error';
    sandboxAuth: 'pending' | 'success' | 'error';
  }>({
    health: 'pending',
    sandboxTest: 'pending',
    sandboxAuth: 'pending',
  });

  const healthQuery = trpc.health.check.useQuery(undefined, {
    retry: false,
    onSuccess: () => {
      setTestResults(prev => ({ ...prev, health: 'success' }));
    },
    onError: () => {
      setTestResults(prev => ({ ...prev, health: 'error' }));
    },
  });

  const sandboxTestQuery = trpc.audioAnalysisSandbox.test.useQuery(undefined, {
    retry: false,
    onSuccess: () => {
      setTestResults(prev => ({ ...prev, sandboxTest: 'success' }));
    },
    onError: () => {
      setTestResults(prev => ({ ...prev, sandboxTest: 'error' }));
    },
  });

  const sandboxAuthQuery = trpc.audioAnalysisSandbox.getSandboxAnalyses.useQuery(
    { limit: 1 },
    {
      retry: false,
      onSuccess: () => {
        setTestResults(prev => ({ ...prev, sandboxAuth: 'success' }));
      },
      onError: () => {
        setTestResults(prev => ({ ...prev, sandboxAuth: 'error' }));
      },
    }
  );

  const getStatusIcon = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'pending':
        return <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
    }
  };

  const getStatusBadge = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-600/20 text-yellow-400 border-yellow-600';
      case 'success':
        return 'bg-green-600/20 text-green-400 border-green-600';
      case 'error':
        return 'bg-red-600/20 text-red-400 border-red-600';
    }
  };

  const getStatusText = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'pending':
        return 'Testing...';
      case 'success':
        return 'Connected';
      case 'error':
        return 'Failed';
    }
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          API Connection Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(testResults.health)}
              <span className="text-slate-300">Health Check</span>
            </div>
            <Badge variant="outline" className={getStatusBadge(testResults.health)}>
              {getStatusText(testResults.health)}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(testResults.sandboxTest)}
              <span className="text-slate-300">Sandbox Router</span>
            </div>
            <Badge variant="outline" className={getStatusBadge(testResults.sandboxTest)}>
              {getStatusText(testResults.sandboxTest)}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(testResults.sandboxAuth)}
              <span className="text-slate-300">Sandbox Auth</span>
            </div>
            <Badge variant="outline" className={getStatusBadge(testResults.sandboxAuth)}>
              {getStatusText(testResults.sandboxAuth)}
            </Badge>
          </div>
        </div>

        {testResults.health === 'error' && (
          <div className="p-3 bg-red-900/20 border border-red-600/50 rounded-lg">
            <p className="text-sm text-red-400">
              API server is not responding. Please check:
            </p>
            <ul className="text-xs text-red-300 mt-2 space-y-1">
              <li>• API server is running on the correct port</li>
              <li>• NEXT_PUBLIC_API_URL is set correctly</li>
              <li>• No firewall blocking the connection</li>
            </ul>
          </div>
        )}

        {testResults.sandboxTest === 'error' && testResults.health === 'success' && (
          <div className="p-3 bg-red-900/20 border border-red-600/50 rounded-lg">
            <p className="text-sm text-red-400">
              Health check passed but sandbox router failed. Check if the router is properly registered.
            </p>
          </div>
        )}

        {testResults.sandboxAuth === 'error' && testResults.sandboxTest === 'success' && (
          <div className="p-3 bg-yellow-900/20 border border-yellow-600/50 rounded-lg">
            <p className="text-sm text-yellow-400">
              Sandbox router is working but authentication failed. Make sure you're logged in.
            </p>
          </div>
        )}

        {testResults.health === 'success' && testResults.sandboxTest === 'success' && testResults.sandboxAuth === 'success' && (
          <div className="p-3 bg-green-900/20 border border-green-600/50 rounded-lg">
            <p className="text-sm text-green-400">
              All API endpoints are working correctly! The sandbox is ready to use.
            </p>
          </div>
        )}

        <Button
          onClick={() => {
            setTestResults({ health: 'pending', sandboxTest: 'pending', sandboxAuth: 'pending' });
            healthQuery.refetch();
            sandboxTestQuery.refetch();
            sandboxAuthQuery.refetch();
          }}
          variant="outline"
          className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
        >
          Retry Tests
        </Button>
      </CardContent>
    </Card>
  );
}
