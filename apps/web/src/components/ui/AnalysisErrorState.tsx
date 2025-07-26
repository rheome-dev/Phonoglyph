import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';

interface AnalysisErrorStateProps {
  error: string;
  onRetry: () => void;
  isRetrying?: boolean;
}

export function AnalysisErrorState({ error, onRetry, isRetrying }: AnalysisErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
      <h3 className="text-lg font-semibold mb-2">Audio Analysis Unavailable</h3>
      <p className="text-muted-foreground mb-4 max-w-md">
        {error.includes('Meyda') 
          ? 'Audio analysis library failed to load. Please check your connection and try again.'
          : 'Unable to analyze audio data. The file may be corrupted or in an unsupported format.'
        }
      </p>
      <Button onClick={onRetry} disabled={isRetrying} className="flex items-center gap-2">
        <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
        {isRetrying ? 'Retrying...' : 'Try Again'}
      </Button>
    </div>
  );
}