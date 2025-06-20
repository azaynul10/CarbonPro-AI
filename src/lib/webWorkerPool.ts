/**
 * Web Worker Pool for Heavy Computations
 * Offload intensive tasks to background threads
 */

interface WorkerTask {
  id: string;
  type: string;
  data: any;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

interface WorkerPoolOptions {
  maxWorkers: number;
  workerScript: string;
  taskTimeout: number;
}

export class WebWorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private taskQueue: WorkerTask[] = [];
  private activeTasks = new Map<string, WorkerTask>();
  private options: WorkerPoolOptions;

  constructor(options: Partial<WorkerPoolOptions> = {}) {
    this.options = {
      maxWorkers: navigator.hardwareConcurrency || 4,
      workerScript: '/workers/carbon-worker.js',
      taskTimeout: 30000, // 30 seconds
      ...options
    };

    this.initializeWorkers();
  }

  /**
   * Initialize worker pool
   */
  private initializeWorkers() {
    for (let i = 0; i < this.options.maxWorkers; i++) {
      try {
        const worker = new Worker(this.options.workerScript);
        
        worker.onmessage = (event) => {
          this.handleWorkerMessage(worker, event.data);
        };

        worker.onerror = (error) => {
          console.error('Worker error:', error);
          this.handleWorkerError(worker, error);
        };

        this.workers.push(worker);
        this.availableWorkers.push(worker);
      } catch (error) {
        console.error('Failed to create worker:', error);
      }
    }
  }

  /**
   * Execute task in worker
   */
  async executeTask<T>(type: string, data: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const task: WorkerTask = {
        id: this.generateTaskId(),
        type,
        data,
        resolve,
        reject,
        timestamp: Date.now()
      };

      this.taskQueue.push(task);
      this.processQueue();

      // Set timeout for task
      setTimeout(() => {
        if (this.activeTasks.has(task.id)) {
          this.activeTasks.delete(task.id);
          reject(new Error(`Task ${task.id} timed out`));
        }
      }, this.options.taskTimeout);
    });
  }

  /**
   * Process task queue
   */
  private processQueue() {
    while (this.taskQueue.length > 0 && this.availableWorkers.length > 0) {
      const task = this.taskQueue.shift()!;
      const worker = this.availableWorkers.shift()!;

      this.activeTasks.set(task.id, task);

      worker.postMessage({
        taskId: task.id,
        type: task.type,
        data: task.data
      });
    }
  }

  /**
   * Handle worker message
   */
  private handleWorkerMessage(worker: Worker, message: any) {
    const { taskId, result, error } = message;
    const task = this.activeTasks.get(taskId);

    if (!task) return;

    this.activeTasks.delete(taskId);
    this.availableWorkers.push(worker);

    if (error) {
      task.reject(new Error(error));
    } else {
      task.resolve(result);
    }

    // Process next task in queue
    this.processQueue();
  }

  /**
   * Handle worker error
   */
  private handleWorkerError(worker: Worker, error: any) {
    // Find and reject all tasks assigned to this worker
    for (const [taskId, task] of this.activeTasks.entries()) {
      task.reject(new Error('Worker error: ' + error.message));
      this.activeTasks.delete(taskId);
    }

    // Remove worker from available list
    const index = this.availableWorkers.indexOf(worker);
    if (index > -1) {
      this.availableWorkers.splice(index, 1);
    }

    // Create new worker to replace the failed one
    try {
      const newWorker = new Worker(this.options.workerScript);
      
      newWorker.onmessage = (event) => {
        this.handleWorkerMessage(newWorker, event.data);
      };

      newWorker.onerror = (error) => {
        this.handleWorkerError(newWorker, error);
      };

      this.availableWorkers.push(newWorker);
    } catch (error) {
      console.error('Failed to create replacement worker:', error);
    }
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      totalWorkers: this.workers.length,
      availableWorkers: this.availableWorkers.length,
      activeTasks: this.activeTasks.size,
      queuedTasks: this.taskQueue.length
    };
  }

  /**
   * Terminate all workers
   */
  terminate() {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.availableWorkers = [];
    this.taskQueue = [];
    this.activeTasks.clear();
  }
}

// Global worker pool instance
export const workerPool = new WebWorkerPool();

// Specialized functions for carbon calculations
export const CarbonWorkerTasks = {
  /**
   * Calculate carbon prediction in worker
   */
  async calculatePrediction(consumptionData: any, period: string): Promise<any> {
    return workerPool.executeTask('carbon_prediction', {
      consumptionData,
      period
    });
  },

  /**
   * Process market data in worker
   */
  async processMarketData(rawData: any[]): Promise<any> {
    return workerPool.executeTask('market_data_processing', {
      data: rawData
    });
  },

  /**
   * Calculate order book analytics in worker
   */
  async calculateOrderBookAnalytics(orderBook: any): Promise<any> {
    return workerPool.executeTask('orderbook_analytics', {
      orderBook
    });
  },

  /**
   * Generate performance report in worker
   */
  async generatePerformanceReport(metrics: any): Promise<any> {
    return workerPool.executeTask('performance_report', {
      metrics
    });
  }
};