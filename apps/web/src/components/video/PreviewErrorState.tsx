import React from 'react';
import { AlertTriangle, RefreshCw, Bug, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface PreviewErrorStateProps {
  error: Error;
  onRetry?: () => void;
  onReport?: () => void;
  showDetails?: boolean;
  className?: string;
}

export const PreviewErrorState: React.FC<PreviewErrorStateProps> = ({
  error,
  onRetry,
  onReport,
  showDetails = false,
  className = ''
}) => {
  const [showFullError, setShowFullError] = React.useState(false);
  
  const getErrorType = (error: Error) => {
    if (error.name.includes('Network')) return 'network';
    if (error.name.includes('Media') || error.message.includes('codec')) return 'media';
    if (error.name.includes('Permission')) return 'permission';
    return 'unknown';
  };
  
  const getErrorMessage = (error: Error) => {
    const type = getErrorType(error);
    
    switch (type) {
      case 'network':
        return 'Network connection failed. Please check your internet connection.';
      case 'media':
        return 'Media format not supported or corrupted file.';
      case 'permission':
        return 'Permission denied. Please check browser permissions.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  };
  
  const getErrorIcon = (error: Error) => {
    const type = getErrorType(error);
    
    switch (type) {
      case 'network':
        return '🌐';
      case 'media':
        return '🎬';
      case 'permission':
        return '🔒';
      default:
        return '⚠️';
    }
  };
  
  const getErrorSuggestions = (error: Error) => {
    const type = getErrorType(error);
    
    switch (type) {
      case 'network':
        return [
          'Check your internet connection',
          'Try reloading the page',
          'Disable browser extensions that might block content'
        ];
      case 'media':
        return [
          'Try a different media file',
          'Check file format compatibility',
          'Ensure the file is not corrupted'
        ];
      case 'permission':
        return [
          'Allow necessary browser permissions',
          'Check if content is blocked by browser',
          'Try refreshing the page'
        ];
      default:
        return [
          'Try refreshing the page',
          'Clear browser cache and cookies',
          'Report this issue if it persists'
        ];
    }
  };
  
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <Card className="bg-red-50 border-red-200 p-6 max-w-md">
        {/* Error Icon */}
        <div className="flex items-center justify-center mb-4">
          <div className="text-4xl">{getErrorIcon(error)}</div>
          <AlertTriangle className="h-8 w-8 text-red-500 ml-2" />
        </div>
        
        {/* Error Title */}
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          Preview Error
        </h3>
        
        {/* Error Message */}
        <p className="text-sm text-red-600 mb-4">
          {getErrorMessage(error)}
        </p>
        
        {/* Error Suggestions */}
        <div className="mb-4">
          <p className="text-xs text-red-500 font-medium mb-2">Try these solutions:</p>
          <ul className="text-xs text-red-600 text-left space-y-1">
            {getErrorSuggestions(error).map((suggestion, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-2">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          {onRetry && (
            <Button 
              onClick={onRetry}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
          
          <div className="flex gap-2">
            {showDetails && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFullError(!showFullError)}
                className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
              >
                <Bug className="h-4 w-4 mr-1" />
                {showFullError ? 'Hide' : 'Show'} Details
              </Button>
            )}
            
            {onReport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReport}
                className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Report Issue
              </Button>
            )}
          </div>
        </div>
        
        {/* Detailed Error Information */}
        {showFullError && showDetails && (
          <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded text-left">
            <p className="text-xs font-mono text-red-800 mb-2">
              <strong>Error Name:</strong> {error.name}
            </p>
            <p className="text-xs font-mono text-red-800 mb-2">
              <strong>Message:</strong> {error.message}
            </p>
            {error.stack && (
              <details className="text-xs">
                <summary className="cursor-pointer text-red-600 hover:text-red-800">
                  Stack Trace
                </summary>
                <pre className="mt-2 text-xs font-mono text-red-700 whitespace-pre-wrap bg-red-50 p-2 rounded">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        )}
        
        {/* Timestamp */}
        <div className="mt-4 pt-3 border-t border-red-200">
          <p className="text-xs text-red-400">
            Error occurred at {new Date().toLocaleTimeString()}
          </p>
        </div>
      </Card>
    </div>
  );
};

export default PreviewErrorState;