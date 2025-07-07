'use client'

import React from 'react'
import { trpc } from '@/lib/trpc'

export function TrpcTest() {
  // Test the health endpoint
  const { data: healthData, isLoading: healthLoading, error: healthError } = trpc.health.check.useQuery();
  
  if (healthLoading) {
    return <div>Loading...</div>;
  }

  if (healthError) {
    return (
      <div>
        <h3>tRPC React Integration Test - Error</h3>
        <p><strong>Health Error:</strong> {healthError.message}</p>
      </div>
    );
  }

  return (
    <div>
      <h3>tRPC React Integration Test - Success</h3>
      <p><strong>Health:</strong> {JSON.stringify(healthData)}</p>
    </div>
  );
} 