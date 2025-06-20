import { useState, useEffect, useCallback } from 'react';
import { performanceMonitor } from '../lib/performanceMonitor';
import { OptimizedCache } from '../lib/optimizedCache';

interface QueryOptions {
  cache?: OptimizedCache<any>;
  cacheKey?: string;
  cacheTTL?: number;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
}

interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Optimized query hook with caching, retries, and performance monitoring
 */
export function useOptimizedQuery<T>(
  queryFn: () => Promise<T>,
  dependencies: any[] = [],
  options: QueryOptions = {}
): QueryState<T> {
  const {
    cache,
    cacheKey,
    cacheTTL,
    retryAttempts = 3,
    retryDelay = 1000,
    timeout = 10000
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const executeQuery = useCallback(async () => {
    const queryName = queryFn.name || 'anonymous_query';
    
    try {
      setLoading(true);
      setError(null);

      // Check cache first
      if (cache && cacheKey) {
        const cachedData = cache.get(cacheKey);
        if (cachedData !== null) {
          setData(cachedData);
          setLoading(false);
          performanceMonitor.recordMetric(`${queryName}_cache_hit`, 1);
          return;
        }
        performanceMonitor.recordMetric(`${queryName}_cache_miss`, 1);
      }

      // Execute query with performance monitoring
      const result = await performanceMonitor.measureAsync(
        `query_${queryName}`,
        async () => {
          return await executeWithRetry(queryFn, retryAttempts, retryDelay, timeout);
        }
      );

      // Cache the result
      if (cache && cacheKey) {
        cache.set(cacheKey, result, cacheTTL);
      }

      setData(result);
    } catch (err: any) {
      setError(err);
      performanceMonitor.recordMetric(`${queryName}_error`, 1);
    } finally {
      setLoading(false);
    }
  }, [queryFn, cache, cacheKey, cacheTTL, retryAttempts, retryDelay, timeout]);

  const refetch = useCallback(async () => {
    // Clear cache before refetching
    if (cache && cacheKey) {
      cache.delete(cacheKey);
    }
    await executeQuery();
  }, [executeQuery, cache, cacheKey]);

  useEffect(() => {
    executeQuery();
  }, dependencies);

  return { data, loading, error, refetch };
}

/**
 * Execute function with retry logic and timeout
 */
async function executeWithRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number,
  delay: number,
  timeout: number
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await Promise.race([
        fn(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), timeout)
        )
      ]);
    } catch (error: any) {
      lastError = error;
      
      if (attempt === maxAttempts) {
        throw lastError;
      }

      // Exponential backoff
      const backoffDelay = delay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }

  throw lastError!;
}

/**
 * Optimized mutation hook with performance monitoring
 */
export function useOptimizedMutation<T, P>(
  mutationFn: (params: P) => Promise<T>,
  options: {
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
    invalidateCache?: Array<{ cache: OptimizedCache<any>; key: string }>;
  } = {}
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (params: P): Promise<T | null> => {
    const mutationName = mutationFn.name || 'anonymous_mutation';
    
    try {
      setLoading(true);
      setError(null);

      const result = await performanceMonitor.measureAsync(
        `mutation_${mutationName}`,
        () => mutationFn(params)
      );

      // Invalidate specified cache entries
      if (options.invalidateCache) {
        options.invalidateCache.forEach(({ cache, key }) => {
          cache.delete(key);
        });
      }

      options.onSuccess?.(result);
      return result;
    } catch (err: any) {
      setError(err);
      options.onError?.(err);
      performanceMonitor.recordMetric(`${mutationName}_error`, 1);
      return null;
    } finally {
      setLoading(false);
    }
  }, [mutationFn, options]);

  return { mutate, loading, error };
}