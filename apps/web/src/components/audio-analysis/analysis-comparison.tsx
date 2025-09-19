'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ComparisonData {
  transients: { sandbox: number; cached: number; difference: number };
  chroma: { sandbox: number; cached: number; difference: number };
  rms: { sandbox: number; cached: number; difference: number };
}

interface AnalysisComparisonProps {
  comparison: ComparisonData;
  onSaveToCache?: () => void;
  onLoadFromCache?: () => void;
  isSaving?: boolean;
  isLoading?: boolean;
}

export function AnalysisComparison({
  comparison,
  onSaveToCache,
  onLoadFromCache,
  isSaving = false,
  isLoading = false
}: AnalysisComparisonProps) {
  const getTrendIcon = (difference: number) => {
    if (difference > 0) return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (difference < 0) return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  const getTrendColor = (difference: number) => {
    if (difference > 0) return 'text-green-400';
    if (difference < 0) return 'text-red-400';
    return 'text-slate-400';
  };

  const getTrendBadge = (difference: number) => {
    if (difference > 0) return 'bg-green-600/20 text-green-400 border-green-600';
    if (difference < 0) return 'bg-red-600/20 text-red-400 border-red-600';
    return 'bg-slate-600/20 text-slate-400 border-slate-600';
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Analysis Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Comparison Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Transients Comparison */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">Transients</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Sandbox</span>
                <Badge variant="outline" className="text-blue-400 border-blue-600">
                  {comparison.transients.sandbox}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Cached</span>
                <Badge variant="outline" className="text-slate-400 border-slate-600">
                  {comparison.transients.cached}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Difference</span>
                <div className="flex items-center gap-2">
                  {getTrendIcon(comparison.transients.difference)}
                  <Badge 
                    variant="outline" 
                    className={getTrendBadge(comparison.transients.difference)}
                  >
                    {comparison.transients.difference > 0 ? '+' : ''}{comparison.transients.difference}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Chroma Comparison */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">Chroma</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Sandbox</span>
                <Badge variant="outline" className="text-blue-400 border-blue-600">
                  {comparison.chroma.sandbox}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Cached</span>
                <Badge variant="outline" className="text-slate-400 border-slate-600">
                  {comparison.chroma.cached}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Difference</span>
                <div className="flex items-center gap-2">
                  {getTrendIcon(comparison.chroma.difference)}
                  <Badge 
                    variant="outline" 
                    className={getTrendBadge(comparison.chroma.difference)}
                  >
                    {comparison.chroma.difference > 0 ? '+' : ''}{comparison.chroma.difference}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* RMS Comparison */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">RMS</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Sandbox</span>
                <Badge variant="outline" className="text-blue-400 border-blue-600">
                  {comparison.rms.sandbox}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Cached</span>
                <Badge variant="outline" className="text-slate-400 border-slate-600">
                  {comparison.rms.cached}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Difference</span>
                <div className="flex items-center gap-2">
                  {getTrendIcon(comparison.rms.difference)}
                  <Badge 
                    variant="outline" 
                    className={getTrendBadge(comparison.rms.difference)}
                  >
                    {comparison.rms.difference > 0 ? '+' : ''}{comparison.rms.difference}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="p-4 bg-slate-700/50 rounded-lg">
          <h4 className="text-sm font-semibold text-white mb-2">Summary</h4>
          <div className="text-sm text-slate-300 space-y-1">
            {comparison.transients.difference > 0 && (
              <p>• Sandbox detected {comparison.transients.difference} more transients</p>
            )}
            {comparison.transients.difference < 0 && (
              <p>• Cached analysis has {Math.abs(comparison.transients.difference)} more transients</p>
            )}
            {comparison.chroma.difference > 0 && (
              <p>• Sandbox detected {comparison.chroma.difference} more chroma events</p>
            )}
            {comparison.chroma.difference < 0 && (
              <p>• Cached analysis has {Math.abs(comparison.chroma.difference)} more chroma events</p>
            )}
            {comparison.rms.difference > 0 && (
              <p>• Sandbox has {comparison.rms.difference} more RMS samples</p>
            )}
            {comparison.rms.difference < 0 && (
              <p>• Cached analysis has {Math.abs(comparison.rms.difference)} more RMS samples</p>
            )}
            {comparison.transients.difference === 0 && comparison.chroma.difference === 0 && comparison.rms.difference === 0 && (
              <p>• No differences detected between analysis methods</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={onSaveToCache}
            disabled={isSaving}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isSaving ? 'Saving...' : 'Save to Cache'}
          </Button>
          <Button
            onClick={onLoadFromCache}
            disabled={isLoading}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            {isLoading ? 'Loading...' : 'Load from Cache'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


