import React from 'react';
import { Loader2, Play } from 'lucide-react';

interface PreviewLoadingStateProps {
  message?: string;
  showProgress?: boolean;
  progress?: number;
  className?: string;
}

export const PreviewLoadingState: React.FC<PreviewLoadingStateProps> = ({
  message = 'Loading preview...',
  showProgress = false,
  progress = 0,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <div className="relative">
        {/* Spinning loader */}
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        
        {/* Play icon overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Play className="h-6 w-6 text-blue-600" fill="currentColor" />
        </div>
      </div>
      
      {/* Loading message */}
      <p className="mt-4 text-sm text-stone-300 text-center">
        {message}
      </p>
      
      {/* Progress bar */}
      {showProgress && (
        <div className="mt-3 w-48">
          <div className="w-full bg-stone-700 rounded-full h-1">
            <div 
              className="bg-blue-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </div>
          <p className="text-xs text-stone-400 text-center mt-1">
            {Math.round(progress)}%
          </p>
        </div>
      )}
      
      {/* Pulsing dots */}
      <div className="flex space-x-1 mt-4">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
      </div>
    </div>
  );
};

export default PreviewLoadingState;