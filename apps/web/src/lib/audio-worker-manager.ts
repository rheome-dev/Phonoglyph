// Audio Worker Manager for Story 5.2: Efficient Worker Processing
import { StemAnalysis, PerformanceMetrics } from '@/types/stem-audio-analysis';

interface WorkerMessage {
  type: string;
  data?: any;
  stemType?: string;
  analysis?: StemAnalysis;
  error?: string;
  metrics?: PerformanceMetrics;
}

export class AudioWorkerManager {
  private worker: Worker | null = null;
  private isInitialized = false;
  private pendingOperations = new Map<string, { resolve: Function; reject: Function }>();
  private stemAnalysisCallback: ((stemType: string, analysis: StemAnalysis) => void) | null = null;
  private performanceCallback: ((metrics: PerformanceMetrics) => void) | null = null;
  private fallbackMode = false;

  constructor() {
    this.initializeWorker();
  }

  private async initializeWorker(): Promise<void> {
    try {
      // Check if Web Workers are supported
      if (typeof Worker === 'undefined') {
        console.warn('⚠️ Web Workers not supported, using fallback mode');
        this.fallbackMode = true;
        return;
      }

      // Create worker
      this.worker = new Worker('/workers/audio-analysis-worker.js');
      
      // Set up message handling
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = this.handleWorkerError.bind(this);
      
      // Initialize worker
      await this.sendMessage('INIT_WORKER', {
        timestamp: Date.now()
      });

      console.log('🔧 Audio Worker Manager initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize worker:', error);
      this.fallbackMode = true;
    }
  }

  private handleWorkerMessage(event: MessageEvent<WorkerMessage>): void {
    const { type, data, stemType, analysis, error, metrics } = event.data;

    switch (type) {
      case 'WORKER_READY':
        this.isInitialized = true;
        this.resolveOperation('init', data);
        console.log('✅ Audio worker ready with capabilities:', data);
        break;

      case 'STEM_ANALYSIS':
        if (stemType && analysis && this.stemAnalysisCallback) {
          this.stemAnalysisCallback(stemType, analysis);
        }
        break;

      case 'PERFORMANCE_METRICS':
        if (metrics && this.performanceCallback) {
          this.performanceCallback(metrics);
        }
        break;

      case 'STEM_SETUP_COMPLETE':
        this.resolveOperation(`setup-${stemType}`, data);
        break;

      case 'ANALYSIS_STARTED':
        this.resolveOperation('start', data);
        break;

      case 'ANALYSIS_STOPPED':
        this.resolveOperation('stop', data);
        break;

      case 'QUALITY_UPDATED':
        this.resolveOperation('quality', data);
        break;

      case 'ERROR':
      case 'WORKER_ERROR':
      case 'STEM_SETUP_ERROR':
      case 'ANALYSIS_ERROR':
        this.handleError(error || 'Unknown worker error', type);
        break;

      default:
        console.warn('🔧 Unknown worker message type:', type);
    }
  }

  private handleWorkerError(error: ErrorEvent): void {
    console.error('❌ Worker error:', error);
    this.fallbackMode = true;
    this.rejectAllPending('Worker error: ' + error.message);
  }

  private async sendMessage(type: string, data?: any): Promise<any> {
    if (!this.worker || this.fallbackMode) {
      throw new Error('Worker not available or in fallback mode');
    }

    return new Promise((resolve, reject) => {
      const operationId = `${type}-${Date.now()}-${Math.random()}`;
      this.pendingOperations.set(operationId, { resolve, reject });

      this.worker!.postMessage({ type, data });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.pendingOperations.has(operationId)) {
          this.pendingOperations.delete(operationId);
          reject(new Error(`Worker operation timeout: ${type}`));
        }
      }, 5000);
    });
  }

  private resolveOperation(key: string, data: any): void {
    // Find and resolve matching operation
    for (const [operationId, { resolve }] of this.pendingOperations.entries()) {
      if (operationId.startsWith(key)) {
        this.pendingOperations.delete(operationId);
        resolve(data);
        break;
      }
    }
  }

  private rejectAllPending(error: string): void {
    this.pendingOperations.forEach(({ reject }) => {
      reject(new Error(error));
    });
    this.pendingOperations.clear();
  }

  private handleError(error: string, type: string): void {
    console.error(`❌ Worker error (${type}):`, error);
    
    // For critical errors, switch to fallback mode
    if (type === 'WORKER_ERROR') {
      this.fallbackMode = true;
    }

    // Reject relevant pending operations
    this.rejectAllPending(error);
  }

  // Public API methods
  async setupStemAnalysis(stemType: string, audioBuffer: ArrayBuffer, config: any): Promise<void> {
    if (this.fallbackMode) {
      throw new Error('Worker in fallback mode');
    }

    try {
      // Transfer audio buffer to worker
      // Note: In production, you'd handle transferable objects properly
      await this.sendMessage('SETUP_STEM_ANALYSIS', {
        stemType,
        audioBufferData: audioBuffer, // In real implementation, use transferable objects
        config
      });

      console.log(`🔧 Stem analysis setup complete for ${stemType}`);
    } catch (error) {
      console.error(`❌ Failed to setup stem analysis for ${stemType}:`, error);
      throw error;
    }
  }

  async startAnalysis(): Promise<void> {
    if (this.fallbackMode) {
      throw new Error('Worker in fallback mode');
    }

    try {
      await this.sendMessage('START_ANALYSIS');
      console.log('🎵 Worker analysis started');
    } catch (error) {
      console.error('❌ Failed to start worker analysis:', error);
      throw error;
    }
  }

  async stopAnalysis(): Promise<void> {
    if (this.fallbackMode) {
      return; // Silently succeed in fallback mode
    }

    try {
      await this.sendMessage('STOP_ANALYSIS');
      console.log('⏹️ Worker analysis stopped');
    } catch (error) {
      console.error('❌ Failed to stop worker analysis:', error);
    }
  }

  async updateQuality(quality: 'low' | 'medium' | 'high'): Promise<void> {
    if (this.fallbackMode) {
      throw new Error('Worker in fallback mode');
    }

    try {
      await this.sendMessage('UPDATE_QUALITY', { quality });
      console.log(`🔧 Worker quality updated to ${quality}`);
    } catch (error) {
      console.error('❌ Failed to update worker quality:', error);
      throw error;
    }
  }

  requestMetrics(): void {
    if (this.fallbackMode || !this.worker) {
      return;
    }

    this.worker.postMessage({ type: 'GET_METRICS' });
  }

  // Callback setters
  setStemAnalysisCallback(callback: (stemType: string, analysis: StemAnalysis) => void): void {
    this.stemAnalysisCallback = callback;
  }

  setPerformanceCallback(callback: (metrics: PerformanceMetrics) => void): void {
    this.performanceCallback = callback;
  }

  // Status methods
  isWorkerReady(): boolean {
    return this.isInitialized && !this.fallbackMode;
  }

  isFallbackMode(): boolean {
    return this.fallbackMode;
  }

  getWorkerStatus(): {
    initialized: boolean;
    fallbackMode: boolean;
    workerSupported: boolean;
    pendingOperations: number;
  } {
    return {
      initialized: this.isInitialized,
      fallbackMode: this.fallbackMode,
      workerSupported: typeof Worker !== 'undefined',
      pendingOperations: this.pendingOperations.size
    };
  }

  // Performance monitoring
  startPerformanceMonitoring(intervalMs: number = 1000): void {
    if (this.fallbackMode) return;

    setInterval(() => {
      this.requestMetrics();
    }, intervalMs);
  }

  // Cleanup
  dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    this.pendingOperations.clear();
    this.stemAnalysisCallback = null;
    this.performanceCallback = null;
    this.isInitialized = false;

    console.log('🧹 Audio Worker Manager disposed');
  }

  // Fallback methods (for when worker is not available)
  async setupFallbackAnalysis(stems: Record<string, ArrayBuffer>): Promise<void> {
    if (!this.fallbackMode) return;

    console.log('🔄 Setting up fallback analysis for', Object.keys(stems).length, 'stems');
    
    // In fallback mode, we'd use the main thread AudioProcessor
    // This is a simplified implementation
    setTimeout(() => {
      Object.keys(stems).forEach(stemType => {
        if (this.stemAnalysisCallback) {
          // Generate mock analysis data
          const mockAnalysis: StemAnalysis = {
            stemId: `${stemType}-fallback-${Date.now()}`,
            stemType: stemType as StemAnalysis['stemType'],
            features: {
              rhythm: [],
              pitch: [],
              intensity: [],
              timbre: []
            },
            metadata: {
              bpm: 120,
              key: 'C',
              energy: 0.5,
              clarity: 0.8
            }
          };
          
          this.stemAnalysisCallback(stemType, mockAnalysis);
        }
      });
    }, 100);
  }
}