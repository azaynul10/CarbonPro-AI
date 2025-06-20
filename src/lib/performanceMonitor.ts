/**
 * Advanced Performance Monitoring System
 * Real-time performance tracking and optimization
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface PerformanceThresholds {
  apiResponseTime: number;
  orderProcessingTime: number;
  predictionTime: number;
  errorRate: number;
  memoryUsage: number;
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private thresholds: PerformanceThresholds;
  private alerts: Array<{ type: string; message: string; timestamp: number }> = [];
  private observers: Map<string, Function[]> = new Map();

  constructor(thresholds: Partial<PerformanceThresholds> = {}) {
    this.thresholds = {
      apiResponseTime: 1000, // 1 second
      orderProcessingTime: 500, // 500ms
      predictionTime: 2000, // 2 seconds
      errorRate: 5, // 5%
      memoryUsage: 80, // 80% of available memory
      ...thresholds
    };

    this.startSystemMonitoring();
  }

  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number, metadata?: Record<string, any>) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricArray = this.metrics.get(name)!;
    metricArray.push(metric);

    // Keep only last 1000 metrics per type
    if (metricArray.length > 1000) {
      metricArray.splice(0, metricArray.length - 1000);
    }

    // Check thresholds
    this.checkThresholds(name, value);

    // Notify observers
    this.notifyObservers(name, metric);
  }

  /**
   * Measure function execution time
   */
  measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    
    return fn().then(
      (result) => {
        const duration = performance.now() - startTime;
        this.recordMetric(name, duration, { status: 'success' });
        return result;
      },
      (error) => {
        const duration = performance.now() - startTime;
        this.recordMetric(name, duration, { status: 'error', error: error.message });
        this.recordMetric(`${name}_errors`, 1);
        throw error;
      }
    );
  }

  /**
   * Measure synchronous function execution time
   */
  measureSync<T>(name: string, fn: () => T): T {
    const startTime = performance.now();
    
    try {
      const result = fn();
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration, { status: 'success' });
      return result;
    } catch (error: any) {
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration, { status: 'error', error: error.message });
      this.recordMetric(`${name}_errors`, 1);
      throw error;
    }
  }

  /**
   * Get performance statistics for a metric
   */
  getStats(name: string, timeWindow?: number): {
    count: number;
    average: number;
    median: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
  } | null {
    const metrics = this.metrics.get(name);
    if (!metrics || metrics.length === 0) return null;

    let filteredMetrics = metrics;
    if (timeWindow) {
      const cutoff = Date.now() - timeWindow;
      filteredMetrics = metrics.filter(m => m.timestamp >= cutoff);
    }

    if (filteredMetrics.length === 0) return null;

    const values = filteredMetrics.map(m => m.value).sort((a, b) => a - b);
    const count = values.length;

    return {
      count,
      average: values.reduce((sum, val) => sum + val, 0) / count,
      median: values[Math.floor(count / 2)],
      p95: values[Math.floor(count * 0.95)],
      p99: values[Math.floor(count * 0.99)],
      min: values[0],
      max: values[count - 1]
    };
  }

  /**
   * Get error rate for a metric
   */
  getErrorRate(name: string, timeWindow: number = 300000): number { // 5 minutes default
    const successMetrics = this.metrics.get(name) || [];
    const errorMetrics = this.metrics.get(`${name}_errors`) || [];

    const cutoff = Date.now() - timeWindow;
    
    const recentSuccess = successMetrics.filter(m => 
      m.timestamp >= cutoff && m.metadata?.status === 'success'
    ).length;
    
    const recentErrors = errorMetrics.filter(m => m.timestamp >= cutoff).length;
    
    const total = recentSuccess + recentErrors;
    return total > 0 ? (recentErrors / total) * 100 : 0;
  }

  /**
   * Check performance thresholds and generate alerts
   */
  private checkThresholds(name: string, value: number) {
    let threshold: number | undefined;
    let alertType: string | undefined;

    if (name.includes('api_response')) {
      threshold = this.thresholds.apiResponseTime;
      alertType = 'API_SLOW';
    } else if (name.includes('order_processing')) {
      threshold = this.thresholds.orderProcessingTime;
      alertType = 'ORDER_SLOW';
    } else if (name.includes('prediction')) {
      threshold = this.thresholds.predictionTime;
      alertType = 'PREDICTION_SLOW';
    }

    if (threshold && value > threshold) {
      this.addAlert(alertType!, `${name} exceeded threshold: ${value}ms > ${threshold}ms`);
    }

    // Check error rates
    const errorRate = this.getErrorRate(name);
    if (errorRate > this.thresholds.errorRate) {
      this.addAlert('HIGH_ERROR_RATE', `${name} error rate: ${errorRate.toFixed(2)}%`);
    }
  }

  /**
   * Add performance alert
   */
  private addAlert(type: string, message: string) {
    const alert = {
      type,
      message,
      timestamp: Date.now()
    };

    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.splice(0, this.alerts.length - 100);
    }

    console.warn(`Performance Alert [${type}]: ${message}`);
  }

  /**
   * Start system-level monitoring
   */
  private startSystemMonitoring() {
    // Monitor memory usage
    if (typeof window !== 'undefined' && 'memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        const usedPercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        this.recordMetric('memory_usage_percent', usedPercent);
        
        if (usedPercent > this.thresholds.memoryUsage) {
          this.addAlert('HIGH_MEMORY', `Memory usage: ${usedPercent.toFixed(2)}%`);
        }
      }, 10000); // Check every 10 seconds
    }

    // Monitor frame rate (if in browser)
    if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
      let lastTime = performance.now();
      let frameCount = 0;

      const measureFPS = () => {
        const currentTime = performance.now();
        frameCount++;

        if (currentTime - lastTime >= 1000) {
          const fps = frameCount;
          this.recordMetric('fps', fps);
          
          if (fps < 30) {
            this.addAlert('LOW_FPS', `Low frame rate: ${fps} FPS`);
          }

          frameCount = 0;
          lastTime = currentTime;
        }

        requestAnimationFrame(measureFPS);
      };

      requestAnimationFrame(measureFPS);
    }
  }

  /**
   * Subscribe to performance events
   */
  subscribe(metricName: string, callback: (metric: PerformanceMetric) => void) {
    if (!this.observers.has(metricName)) {
      this.observers.set(metricName, []);
    }
    this.observers.get(metricName)!.push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.observers.get(metricName);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Notify observers of new metrics
   */
  private notifyObservers(metricName: string, metric: PerformanceMetric) {
    const callbacks = this.observers.get(metricName);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(metric);
        } catch (error) {
          console.error('Performance observer error:', error);
        }
      });
    }
  }

  /**
   * Get recent alerts
   */
  getAlerts(timeWindow: number = 300000): Array<{ type: string; message: string; timestamp: number }> {
    const cutoff = Date.now() - timeWindow;
    return this.alerts.filter(alert => alert.timestamp >= cutoff);
  }

  /**
   * Generate performance report
   */
  generateReport(): {
    summary: Record<string, any>;
    metrics: Record<string, any>;
    alerts: Array<{ type: string; message: string; timestamp: number }>;
    recommendations: string[];
  } {
    const summary: Record<string, any> = {};
    const metrics: Record<string, any> = {};
    const recommendations: string[] = [];

    // Generate summary for each metric type
    for (const [name, metricArray] of this.metrics.entries()) {
      if (metricArray.length > 0) {
        const stats = this.getStats(name, 300000); // Last 5 minutes
        if (stats) {
          metrics[name] = stats;
          
          // Generate recommendations based on performance
          if (name.includes('api_response') && stats.average > 500) {
            recommendations.push(`Optimize ${name} - average response time is ${stats.average.toFixed(2)}ms`);
          }
          
          if (name.includes('prediction') && stats.average > 1000) {
            recommendations.push(`Optimize prediction engine - average time is ${stats.average.toFixed(2)}ms`);
          }
        }
      }
    }

    // System summary
    summary.totalMetrics = this.metrics.size;
    summary.totalAlerts = this.alerts.length;
    summary.recentAlerts = this.getAlerts().length;
    summary.timestamp = new Date().toISOString();

    return {
      summary,
      metrics,
      alerts: this.getAlerts(),
      recommendations
    };
  }

  /**
   * Clear old metrics and alerts
   */
  cleanup(maxAge: number = 3600000) { // 1 hour default
    const cutoff = Date.now() - maxAge;

    // Clean metrics
    for (const [name, metricArray] of this.metrics.entries()) {
      const filtered = metricArray.filter(m => m.timestamp >= cutoff);
      this.metrics.set(name, filtered);
    }

    // Clean alerts
    this.alerts = this.alerts.filter(alert => alert.timestamp >= cutoff);
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = React.useState<Record<string, any>>({});
  const [alerts, setAlerts] = React.useState<Array<{ type: string; message: string; timestamp: number }>>([]);

  React.useEffect(() => {
    const updateMetrics = () => {
      const report = performanceMonitor.generateReport();
      setMetrics(report.metrics);
      setAlerts(report.alerts);
    };

    // Update every 5 seconds
    const interval = setInterval(updateMetrics, 5000);
    updateMetrics(); // Initial update

    return () => clearInterval(interval);
  }, []);

  return {
    metrics,
    alerts,
    recordMetric: performanceMonitor.recordMetric.bind(performanceMonitor),
    measureAsync: performanceMonitor.measureAsync.bind(performanceMonitor),
    measureSync: performanceMonitor.measureSync.bind(performanceMonitor)
  };
}