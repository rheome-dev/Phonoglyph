'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { CheckCircle, XCircle, Loader2, User, UserCheck } from 'lucide-react';

export function AuthStatus() {
  const sessionQuery = trpc.auth.session.useQuery();
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
  });

  const getStatusIcon = (isLoading: boolean, isError: boolean, isSuccess: boolean) => {
    if (isLoading) return <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />;
    if (isError) return <XCircle className="w-4 h-4 text-red-400" />;
    if (isSuccess) return <CheckCircle className="w-4 h-4 text-green-400" />;
    return <User className="w-4 h-4 text-slate-400" />;
  };

  const getStatusBadge = (isLoading: boolean, isError: boolean, isSuccess: boolean) => {
    if (isLoading) return 'bg-yellow-600/20 text-yellow-400 border-yellow-600';
    if (isError) return 'bg-red-600/20 text-red-400 border-red-600';
    if (isSuccess) return 'bg-green-600/20 text-green-400 border-green-600';
    return 'bg-slate-600/20 text-slate-400 border-slate-600';
  };

  const getStatusText = (isLoading: boolean, isError: boolean, isSuccess: boolean) => {
    if (isLoading) return 'Checking...';
    if (isError) return 'Not authenticated';
    if (isSuccess) return 'Authenticated';
    return 'Unknown';
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <UserCheck className="w-5 h-5" />
          Authentication Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(sessionQuery.isLoading, sessionQuery.isError, sessionQuery.isSuccess)}
              <span className="text-slate-300">Session Check</span>
            </div>
            <Badge variant="outline" className={getStatusBadge(sessionQuery.isLoading, sessionQuery.isError, sessionQuery.isSuccess)}>
              {getStatusText(sessionQuery.isLoading, sessionQuery.isError, sessionQuery.isSuccess)}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(meQuery.isLoading, meQuery.isError, meQuery.isSuccess)}
              <span className="text-slate-300">Protected Endpoint</span>
            </div>
            <Badge variant="outline" className={getStatusBadge(meQuery.isLoading, meQuery.isError, meQuery.isSuccess)}>
              {getStatusText(meQuery.isLoading, meQuery.isError, meQuery.isSuccess)}
            </Badge>
          </div>
        </div>

        {sessionQuery.data && (
          <div className="p-3 bg-slate-700/50 rounded-lg">
            <h4 className="text-sm font-semibold text-white mb-2">Session Info</h4>
            <div className="text-xs text-slate-300 space-y-1">
              <p>Authenticated: {sessionQuery.data.authenticated ? 'Yes' : 'No'}</p>
              {sessionQuery.data.user && (
                <>
                  <p>User ID: {sessionQuery.data.user.id}</p>
                  <p>Email: {sessionQuery.data.user.email}</p>
                  <p>Name: {sessionQuery.data.user.name}</p>
                </>
              )}
            </div>
          </div>
        )}

        {meQuery.data && (
          <div className="p-3 bg-green-900/20 border border-green-600/50 rounded-lg">
            <h4 className="text-sm font-semibold text-white mb-2">User Details</h4>
            <div className="text-xs text-green-300 space-y-1">
              <p>ID: {meQuery.data.user.id}</p>
              <p>Email: {meQuery.data.user.email}</p>
              <p>Name: {meQuery.data.user.name}</p>
            </div>
          </div>
        )}

        {sessionQuery.isError && (
          <div className="p-3 bg-red-900/20 border border-red-600/50 rounded-lg">
            <p className="text-sm text-red-400">
              Session check failed. This might indicate a connection issue.
            </p>
          </div>
        )}

        {meQuery.isError && sessionQuery.isSuccess && (
          <div className="p-3 bg-yellow-900/20 border border-yellow-600/50 rounded-lg">
            <p className="text-sm text-yellow-400">
              Session exists but protected endpoint failed. This suggests an authentication token issue.
            </p>
            <p className="text-xs text-yellow-300 mt-2">
              Try logging out and logging back in to refresh your authentication token.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}





