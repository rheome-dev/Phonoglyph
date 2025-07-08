// Credit System Types

export interface ResourceUsage {
  computeTimeSeconds: number;
  storageGigabytes: number;
  gpuUtilization: number;
  memoryGigabytes?: number;
  networkGigabytes?: number;
}

export interface CreditCalculationParams {
  operationType: 'stem_separation' | 'video_rendering';
  audioLength?: number; // in seconds
  videoLength?: number; // in seconds
  resolution?: '720p' | '1080p' | '4K';
  complexity?: 'basic' | 'medium' | 'complex';
  priority?: 'normal' | 'high';
  timing?: 'immediate' | 'off_peak';
}

export interface CreditCalculationResult {
  baseCredits: number;
  lengthMultiplier: number;
  complexityMultiplier: number;
  priorityMultiplier: number;
  timingDiscount: number;
  totalCredits: number;
  breakdown: {
    base: number;
    length: number;
    complexity: number;
    priority: number;
    timing: number;
  };
}

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number; // Positive for refunds, negative for deductions
  operationType: 'stem_separation' | 'video_rendering' | 'refund' | 'purchase';
  resourceUsage?: ResourceUsage;
  batchId?: string;
  jobId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface CreditBalance {
  userId: string;
  balance: number;
  lastUpdated: Date;
  pendingTransactions: number; // Credits reserved for ongoing jobs
}

export interface BatchJob {
  id: string;
  userId: string;
  jobType: 'stem_separation' | 'video_rendering';
  priority: 'normal' | 'high';
  timing: 'immediate' | 'off_peak';
  status: 'queued' | 'processing' | 'complete' | 'failed' | 'cancelled';
  estimatedCredits: number;
  actualCredits?: number;
  jobData: {
    inputFileId?: string;
    outputFileIds?: string[];
    parameters?: Record<string, any>;
  };
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
}

export interface CostTracking {
  id: string;
  operationType: 'stem_separation' | 'video_rendering';
  awsCosts: {
    compute: number;
    storage: number;
    network: number;
    total: number;
  };
  resourceUsage: ResourceUsage;
  creditsCharged: number;
  profitMargin: number;
  timestamp: Date;
  jobId?: string;
  batchId?: string;
}

export interface CreditPricing {
  stemSeparation: {
    baseCredits: number;
    perMinuteCredits: number;
    complexityMultipliers: {
      basic: number;
      medium: number;
      complex: number;
    };
  };
  videoRendering: {
    baseCredits: number;
    perMinuteCredits: {
      '720p': number;
      '1080p': number;
      '4K': number;
    };
    complexityMultipliers: {
      basic: number;
      medium: number;
      complex: number;
    };
  };
  modifiers: {
    priorityMultipliers: {
      normal: number;
      high: number;
    };
    timingDiscounts: {
      immediate: number;
      off_peak: number;
    };
  };
}

export interface CreditSystemConfig {
  pricing: CreditPricing;
  limits: {
    maxCreditsPerJob: number;
    maxPendingCredits: number;
    minimumBalance: number;
  };
  costThresholds: {
    profitMarginWarning: number; // e.g., 0.4 for 40%
    profitMarginCritical: number; // e.g., 0.2 for 20%
  };
  batchProcessing: {
    maxBatchSize: number;
    offPeakHours: number[]; // Hours in UTC
    queueProcessingIntervalMs: number;
  };
}

export interface CreditSystemAlert {
  id: string;
  type: 'low_profit_margin' | 'high_cost_variance' | 'failed_transaction' | 'queue_backlog';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  metadata: Record<string, any>;
  timestamp: Date;
  acknowledged: boolean;
}

// API Interfaces
export interface DeductCreditsRequest {
  userId: string;
  amount: number;
  operationType: 'stem_separation' | 'video_rendering';
  jobId: string;
  resourceUsage?: ResourceUsage;
}

export interface RefundCreditsRequest {
  userId: string;
  amount: number;
  originalTransactionId: string;
  reason: string;
}

export interface CreditBalanceResponse {
  balance: number;
  pendingTransactions: number;
  availableBalance: number;
  lastUpdated: Date;
}

export interface BatchJobRequest {
  jobType: 'stem_separation' | 'video_rendering';
  priority: 'normal' | 'high';
  timing: 'immediate' | 'off_peak';
  jobData: {
    inputFileId: string;
    parameters?: Record<string, any>;
  };
}

export interface BatchStatusResponse {
  status: 'queued' | 'processing' | 'complete' | 'failed' | 'cancelled';
  estimatedCredits: number;
  actualCredits?: number;
  position?: number; // Position in queue
  estimatedStartTime?: Date;
  progress?: number; // 0-100
}