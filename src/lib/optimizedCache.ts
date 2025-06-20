/**
 * Advanced Caching System with LRU and TTL
 * High-performance caching for trading data
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  hitRate: number;
}

export class OptimizedCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder: string[] = [];
  private maxSize: number;
  private defaultTTL: number;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
    hitRate: 0
  };

  constructor(maxSize: number = 1000, defaultTTL: number = 300000) { // 5 minutes default
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    
    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.stats.misses++;
      this.stats.size = this.cache.size;
      this.updateHitRate();
      return null;
    }

    // Update access information
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.updateAccessOrder(key);
    
    this.stats.hits++;
    this.updateHitRate();
    
    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const entryTTL = ttl || this.defaultTTL;

    // If cache is full, evict least recently used
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: now,
      ttl: entryTTL,
      accessCount: 1,
      lastAccessed: now
    };

    this.cache.set(key, entry);
    this.updateAccessOrder(key);
    this.stats.size = this.cache.size;
  }

  /**
   * Get or set with factory function
   */
  async getOrSet(
    key: string, 
    factory: () => Promise<T>, 
    ttl?: number
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Delete from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.removeFromAccessOrder(key);
      this.stats.size = this.cache.size;
    }
    return deleted;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.stats.size = 0;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;

    const lruKey = this.accessOrder[0];
    this.cache.delete(lruKey);
    this.accessOrder.shift();
    this.stats.evictions++;
  }

  /**
   * Update access order for LRU
   */
  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  /**
   * Remove key from access order
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
    });

    this.stats.size = this.cache.size;
  }
}

// Specialized caches for different data types
export const orderBookCache = new OptimizedCache<any>(100, 30000); // 30 seconds TTL
export const marketDataCache = new OptimizedCache<any>(500, 60000); // 1 minute TTL
export const predictionCache = new OptimizedCache<any>(1000, 300000); // 5 minutes TTL
export const userDataCache = new OptimizedCache<any>(200, 600000); // 10 minutes TTL

// Cache manager for coordinated caching
export class CacheManager {
  private caches = new Map<string, OptimizedCache<any>>();

  constructor() {
    this.caches.set('orderBook', orderBookCache);
    this.caches.set('marketData', marketDataCache);
    this.caches.set('predictions', predictionCache);
    this.caches.set('userData', userDataCache);
  }

  /**
   * Get cache by name
   */
  getCache(name: string): OptimizedCache<any> | undefined {
    return this.caches.get(name);
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
  }

  /**
   * Get combined statistics
   */
  getAllStats(): Record<string, CacheStats> {
    const stats: Record<string, CacheStats> = {};
    
    for (const [name, cache] of this.caches.entries()) {
      stats[name] = cache.getStats();
    }
    
    return stats;
  }

  /**
   * Warm up caches with common data
   */
  async warmUp(): Promise<void> {
    // Implement cache warming logic here
    console.log('Warming up caches...');
    
    // Example: Pre-load common market data
    // await this.preloadMarketData();
  }
}

export const cacheManager = new CacheManager();