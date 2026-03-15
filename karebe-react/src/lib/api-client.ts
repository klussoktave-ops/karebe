/**
 * Enhanced API Client with Retry Logic and Error Handling
 * Provides automatic retry for transient failures and consistent error handling
 */

import { isErrorRetryable, getErrorDisplay, getBackoffDelay, type ErrorDisplay } from './error-handler';

export interface RetryConfig {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  retryableStatuses?: number[];
  onRetry?: (attempt: number, error: unknown) => void;
}

export interface ApiRequestConfig extends RequestInit {
  retry?: RetryConfig | boolean;
  timeout?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ErrorDisplay;
  status?: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

function isStatusRetryable(status: number, config: RetryConfig): boolean {
  const retryableStatuses = config.retryableStatuses || DEFAULT_RETRY_CONFIG.retryableStatuses!;
  return retryableStatuses.includes(status);
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function apiFetch<T = unknown>(
  url: string,
  config: ApiRequestConfig = {}
): Promise<ApiResponse<T>> {
  const { retry, timeout, ...fetchOptions } = config;

  if (retry === false) {
    return executeRequest<T>(url, fetchOptions, timeout);
  }

  const retryConfig: RetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...(typeof retry === 'object' ? retry : {}),
  };

  let lastError: unknown;

  for (let attempt = 0; attempt < retryConfig.maxAttempts!; attempt++) {
    try {
      const result = await executeRequest<T>(url, fetchOptions, timeout);

      if (!result.success && result.status && isStatusRetryable(result.status, retryConfig)) {
        lastError = new Error(`HTTP ${result.status}`);

        if (attempt < retryConfig.maxAttempts! - 1) {
          const delay = getBackoffDelay(attempt, retryConfig.baseDelay, retryConfig.maxDelay);
          retryConfig.onRetry?.(attempt + 1, lastError);
          console.log(`[API] Retry attempt ${attempt + 1}/${retryConfig.maxAttempts} after ${delay}ms (status ${result.status})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }

      return result;
    } catch (error) {
      lastError = error;

      if (!isErrorRetryable(error) || attempt === retryConfig.maxAttempts! - 1) {
        return {
          success: false,
          error: getErrorDisplay(error),
        };
      }

      const delay = getBackoffDelay(attempt, retryConfig.baseDelay, retryConfig.maxDelay);
      retryConfig.onRetry?.(attempt + 1, error);
      console.log(`[API] Retry attempt ${attempt + 1}/${retryConfig.maxAttempts} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    error: getErrorDisplay(lastError),
  };
}

async function executeRequest<T>(
  url: string,
  options: RequestInit | undefined,
  timeout?: number
): Promise<ApiResponse<T>> {
  let response: Response;

  try {
    if (timeout) {
      response = await fetchWithTimeout(url, options || {}, timeout);
    } else {
      response = await fetch(url, options);
    }
  } catch (error) {
    return {
      success: false,
      error: getErrorDisplay(error),
    };
  }

  let data: T | undefined;
  let parseError: unknown;

  try {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text() as unknown as T;
    }
  } catch (error) {
    parseError = error;
  }

  if (!response.ok) {
    return {
      success: false,
      status: response.status,
      error: {
        title: `HTTP ${response.status}`,
        message: (data as Record<string, unknown>)?.message as string || response.statusText,
        retryable: isStatusRetryable(response.status, DEFAULT_RETRY_CONFIG),
        code: `HTTP_${response.status}`,
      },
    };
  }

  if (parseError) {
    return {
      success: false,
      error: getErrorDisplay(parseError),
    };
  }

  return {
    success: true,
    data,
    status: response.status,
  };
}
