import { useCallback } from 'react';
import { useToast } from '../components/ui/Toast';

interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  fallbackMessage?: string;
}

export const useErrorHandler = () => {
  const { showError } = useToast();

  const handleError = useCallback((
    error: unknown,
    context?: string,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showToast = true,
      logError = true,
      fallbackMessage = 'An unexpected error occurred'
    } = options;

    // Log error for debugging
    if (logError) {
      console.error(`Error${context ? ` in ${context}` : ''}:`, error);
    }

    // Extract error message
    let errorMessage = fallbackMessage;
    let errorTitle = 'Error';

    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Customize error titles based on error types
      if (error.message.includes('network') || error.message.includes('fetch')) {
        errorTitle = 'Network Error';
        errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
      } else if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
        errorTitle = 'Authentication Error';
        errorMessage = 'Your session has expired. Please sign in again.';
      } else if (error.message.includes('permission') || error.message.includes('forbidden')) {
        errorTitle = 'Permission Error';
        errorMessage = 'You do not have permission to perform this action.';
      } else if (error.message.includes('validation')) {
        errorTitle = 'Validation Error';
      } else if (error.message.includes('timeout')) {
        errorTitle = 'Timeout Error';
        errorMessage = 'The request took too long to complete. Please try again.';
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    // Show toast notification
    if (showToast) {
      showError(errorTitle, errorMessage);
    }

    return {
      title: errorTitle,
      message: errorMessage,
      originalError: error
    };
  }, [showError]);

  const handleAsyncError = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    context?: string,
    options?: ErrorHandlerOptions
  ): Promise<T | null> => {
    try {
      return await asyncFn();
    } catch (error) {
      handleError(error, context, options);
      return null;
    }
  }, [handleError]);

  return {
    handleError,
    handleAsyncError
  };
};