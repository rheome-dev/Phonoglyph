import { 
  CreditCalculationParams, 
  CreditCalculationResult, 
  CreditPricing, 
  CreditSystemConfig 
} from '../types/credit-system';

export class CreditCalculator {
  private config: CreditSystemConfig;
  
  constructor(config: CreditSystemConfig) {
    this.config = config;
  }
  
  /**
   * Calculate credits required for a job
   */
  calculateCredits(params: CreditCalculationParams): CreditCalculationResult {
    const { operationType, audioLength, videoLength, resolution, complexity, priority, timing } = params;
    
    let baseCredits = 0;
    let lengthMultiplier = 0;
    let complexityMultiplier = 1;
    
    // Calculate base credits and length multiplier based on operation type
    if (operationType === 'stem_separation') {
      baseCredits = this.config.pricing.stemSeparation.baseCredits;
      const lengthMinutes = Math.ceil((audioLength || 0) / 60);
      lengthMultiplier = lengthMinutes * this.config.pricing.stemSeparation.perMinuteCredits;
      
      if (complexity) {
        complexityMultiplier = this.config.pricing.stemSeparation.complexityMultipliers[complexity] || 1;
      }
    } else if (operationType === 'video_rendering') {
      baseCredits = this.config.pricing.videoRendering.baseCredits;
      const lengthMinutes = Math.ceil((videoLength || 0) / 60);
      
      if (resolution && this.config.pricing.videoRendering.perMinuteCredits[resolution]) {
        lengthMultiplier = lengthMinutes * this.config.pricing.videoRendering.perMinuteCredits[resolution];
      }
      
      if (complexity) {
        complexityMultiplier = this.config.pricing.videoRendering.complexityMultipliers[complexity] || 1;
      }
    }
    
    // Apply modifiers
    const priorityMultiplier = priority 
      ? this.config.pricing.modifiers.priorityMultipliers[priority] || 1 
      : 1;
    
    const timingDiscount = timing 
      ? this.config.pricing.modifiers.timingDiscounts[timing] || 1 
      : 1;
    
    // Calculate breakdown
    const breakdown = {
      base: baseCredits,
      length: lengthMultiplier,
      complexity: (baseCredits + lengthMultiplier) * (complexityMultiplier - 1),
      priority: (baseCredits + lengthMultiplier) * complexityMultiplier * (priorityMultiplier - 1),
      timing: (baseCredits + lengthMultiplier) * complexityMultiplier * priorityMultiplier * (1 - timingDiscount)
    };
    
    const totalCredits = Math.ceil(
      (baseCredits + lengthMultiplier) * complexityMultiplier * priorityMultiplier * timingDiscount
    );
    
    const result: CreditCalculationResult = {
      baseCredits,
      lengthMultiplier,
      complexityMultiplier,
      priorityMultiplier,
      timingDiscount,
      totalCredits,
      breakdown
    };
    
    // Credit calculation completed
    
    return result;
  }
  
  /**
   * Calculate credits for stem separation
   */
  calculateStemSeparationCredits(audioLengthSeconds: number, complexity: 'basic' | 'medium' | 'complex' = 'medium'): number {
    const params: CreditCalculationParams = {
      operationType: 'stem_separation',
      audioLength: audioLengthSeconds,
      complexity,
      priority: 'normal',
      timing: 'immediate'
    };
    
    return this.calculateCredits(params).totalCredits;
  }
  
  /**
   * Calculate credits for video rendering
   */
  calculateVideoRenderingCredits(
    videoLengthSeconds: number,
    resolution: '720p' | '1080p' | '4K' = '1080p',
    complexity: 'basic' | 'medium' | 'complex' = 'medium'
  ): number {
    const params: CreditCalculationParams = {
      operationType: 'video_rendering',
      videoLength: videoLengthSeconds,
      resolution,
      complexity,
      priority: 'normal',
      timing: 'immediate'
    };
    
    return this.calculateCredits(params).totalCredits;
  }
  
  /**
   * Estimate credits with bulk discount for multiple jobs
   */
  calculateBulkCredits(jobs: CreditCalculationParams[]): {
    totalCredits: number;
    individualCredits: number[];
    bulkDiscount: number;
    savings: number;
  } {
    const individualCredits = jobs.map(job => this.calculateCredits(job).totalCredits);
    const totalIndividual = individualCredits.reduce((sum, credits) => sum + credits, 0);
    
    // Apply bulk discount based on number of jobs
    let bulkDiscount = 1;
    if (jobs.length >= 10) {
      bulkDiscount = 0.85; // 15% discount
    } else if (jobs.length >= 5) {
      bulkDiscount = 0.90; // 10% discount
    } else if (jobs.length >= 3) {
      bulkDiscount = 0.95; // 5% discount
    }
    
    const totalCredits = Math.ceil(totalIndividual * bulkDiscount);
    const savings = totalIndividual - totalCredits;
    
    // Bulk credit calculation completed
    
    return {
      totalCredits,
      individualCredits,
      bulkDiscount,
      savings
    };
  }
  
  /**
   * Validate if credits are within system limits
   */
  validateCreditAmount(credits: number): {
    valid: boolean;
    reason?: string;
  } {
    if (credits <= 0) {
      return { valid: false, reason: 'Credits must be positive' };
    }
    
    if (credits > this.config.limits.maxCreditsPerJob) {
      return { 
        valid: false, 
        reason: `Exceeds maximum credits per job (${this.config.limits.maxCreditsPerJob})` 
      };
    }
    
    return { valid: true };
  }
  
  /**
   * Get current pricing configuration
   */
  getPricing(): CreditPricing {
    return { ...this.config.pricing };
  }
  
  /**
   * Update pricing configuration
   */
  updatePricing(newPricing: Partial<CreditPricing>): void {
    this.config.pricing = { ...this.config.pricing, ...newPricing };
  }
  
  /**
   * Get credit cost estimate with detailed breakdown
   */
  getDetailedEstimate(params: CreditCalculationParams): {
    estimate: CreditCalculationResult;
    description: string;
    factors: string[];
  } {
    const estimate = this.calculateCredits(params);
    const factors: string[] = [];
    
    // Build description
    let description = `${params.operationType.replace('_', ' ')} job`;
    
    if (params.audioLength) {
      const minutes = Math.ceil(params.audioLength / 60);
      description += ` (${minutes} min audio)`;
      factors.push(`${minutes} minutes of audio processing`);
    }
    
    if (params.videoLength) {
      const minutes = Math.ceil(params.videoLength / 60);
      description += ` (${minutes} min video, ${params.resolution})`;
      factors.push(`${minutes} minutes of ${params.resolution} video rendering`);
    }
    
    if (params.complexity && params.complexity !== 'medium') {
      factors.push(`${params.complexity} complexity processing`);
    }
    
    if (params.priority === 'high') {
      factors.push('high priority processing');
    }
    
    if (params.timing === 'off_peak') {
      factors.push('off-peak timing discount applied');
    }
    
    return {
      estimate,
      description,
      factors
    };
  }
  
  /**
   * Calculate effective cost per credit for monitoring
   */
  calculateEffectiveCostPerCredit(
    totalAwsCost: number,
    totalCreditsCharged: number
  ): {
    costPerCredit: number;
    profitMargin: number;
    recommendedCreditValue: number;
  } {
    const costPerCredit = totalCreditsCharged > 0 ? totalAwsCost / totalCreditsCharged : 0;
    
    // Assume 1 credit = $0.10 target value
    const targetCreditValue = 0.10;
    const profitMargin = costPerCredit > 0 ? (targetCreditValue - costPerCredit) / targetCreditValue : 1;
    
    // Recommend credit value to maintain 40% profit margin
    const recommendedCreditValue = costPerCredit / 0.6; // 40% margin
    
    return {
      costPerCredit,
      profitMargin,
      recommendedCreditValue
    };
  }
}

// Default configuration for production use
export const getDefaultCreditConfig = (): CreditSystemConfig => ({
  pricing: {
    stemSeparation: {
      baseCredits: 10,
      perMinuteCredits: 5,
      complexityMultipliers: {
        basic: 0.8,
        medium: 1.0,
        complex: 1.5
      }
    },
    videoRendering: {
      baseCredits: 20,
      perMinuteCredits: {
        '720p': 8,
        '1080p': 15,
        '4K': 30
      },
      complexityMultipliers: {
        basic: 0.7,
        medium: 1.0,
        complex: 1.8
      }
    },
    modifiers: {
      priorityMultipliers: {
        normal: 1.0,
        high: 1.5
      },
      timingDiscounts: {
        immediate: 1.0,
        off_peak: 0.8 // 20% discount for off-peak
      }
    }
  },
  limits: {
    maxCreditsPerJob: 1000,
    maxPendingCredits: 500,
    minimumBalance: 0
  },
  costThresholds: {
    profitMarginWarning: 0.4, // 40%
    profitMarginCritical: 0.2  // 20%
  },
  batchProcessing: {
    maxBatchSize: 50,
    offPeakHours: [22, 23, 0, 1, 2, 3, 4, 5], // UTC hours
    queueProcessingIntervalMs: 30000 // 30 seconds
  }
});