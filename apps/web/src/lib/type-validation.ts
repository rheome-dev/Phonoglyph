/**
 * Runtime Type Validation Service
 * Provides comprehensive validation for audio processing data at runtime
 */

import {
  isAudioFeatureData,
  isCachedStemAnalysis,
  isAudioAnalysisData,
  isLiveMIDIData,
  isPerformanceMetrics,
  isDetailedPerformanceMetrics,
  isPerformanceAlert,
  isDeviceCapabilities,
  validateAndTransform,
  safeValidate,
  assertType
} from '@/types/type-guards';

import {
  AudioFeatureData,
  CachedStemAnalysis,
  AudioAnalysisData,
  LiveMIDIData,
  PerformanceMetrics,
  DetailedPerformanceMetrics,
  PerformanceAlert,
  DeviceCapabilities
} from '@/types/audio';

export interface ValidationError {
  field: string;
  message: string;
  value: unknown;
  expectedType: string;
}

export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors: ValidationError[];
}

export class TypeValidationService {
  private static validationErrors: ValidationError[] = [];
  private static strictMode = process.env.NODE_ENV === 'development';

  /**
   * Enable or disable strict validation mode
   */
  static setStrictMode(enabled: boolean): void {
    this.strictMode = enabled;
  }

  /**
   * Get all validation errors
   */
  static getValidationErrors(): ValidationError[] {
    return [...this.validationErrors];
  }

  /**
   * Clear validation errors
   */
  static clearValidationErrors(): void {
    this.validationErrors = [];
  }

  /**
   * Log validation error
   */
  private static logValidationError(error: ValidationError): void {
    this.validationErrors.push(error);
    
    if (this.strictMode) {
      console.error('Type validation error:', error);
    } else {
      console.warn('Type validation warning:', error);
    }
  }

  /**
   * Validate audio feature data with comprehensive error reporting
   */
  static validateAudioFeatureData(value: unknown, context = 'AudioFeatureData'): ValidationResult<AudioFeatureData> {
    const errors: ValidationError[] = [];

    if (!isAudioFeatureData(value)) {
      const error: ValidationError = {
        field: context,
        message: 'Invalid AudioFeatureData structure',
        value,
        expectedType: 'AudioFeatureData'
      };
      
      this.logValidationError(error);
      errors.push(error);

      return { isValid: false, errors };
    }

    return { isValid: true, data: value, errors: [] };
  }

  /**
   * Validate cached stem analysis
   */
  static validateCachedStemAnalysis(value: unknown, context = 'CachedStemAnalysis'): ValidationResult<CachedStemAnalysis> {
    const errors: ValidationError[] = [];

    if (!isCachedStemAnalysis(value)) {
      const error: ValidationError = {
        field: context,
        message: 'Invalid CachedStemAnalysis structure',
        value,
        expectedType: 'CachedStemAnalysis'
      };
      
      this.logValidationError(error);
      errors.push(error);

      return { isValid: false, errors };
    }

    return { isValid: true, data: value, errors: [] };
  }

  /**
   * Validate audio analysis data
   */
  static validateAudioAnalysisData(value: unknown, context = 'AudioAnalysisData'): ValidationResult<AudioAnalysisData> {
    const errors: ValidationError[] = [];

    if (!isAudioAnalysisData(value)) {
      const error: ValidationError = {
        field: context,
        message: 'Invalid AudioAnalysisData structure',
        value,
        expectedType: 'AudioAnalysisData'
      };
      
      this.logValidationError(error);
      errors.push(error);

      return { isValid: false, errors };
    }

    return { isValid: true, data: value, errors: [] };
  }

  /**
   * Validate MIDI data
   */
  static validateLiveMIDIData(value: unknown, context = 'LiveMIDIData'): ValidationResult<LiveMIDIData> {
    const errors: ValidationError[] = [];

    if (!isLiveMIDIData(value)) {
      const error: ValidationError = {
        field: context,
        message: 'Invalid LiveMIDIData structure',
        value,
        expectedType: 'LiveMIDIData'
      };
      
      this.logValidationError(error);
      errors.push(error);

      return { isValid: false, errors };
    }

    return { isValid: true, data: value, errors: [] };
  }

  /**
   * Validate performance metrics
   */
  static validatePerformanceMetrics(value: unknown, context = 'PerformanceMetrics'): ValidationResult<PerformanceMetrics> {
    const errors: ValidationError[] = [];

    if (!isPerformanceMetrics(value)) {
      const error: ValidationError = {
        field: context,
        message: 'Invalid PerformanceMetrics structure',
        value,
        expectedType: 'PerformanceMetrics'
      };
      
      this.logValidationError(error);
      errors.push(error);

      return { isValid: false, errors };
    }

    return { isValid: true, data: value, errors: [] };
  }

  /**
   * Validate detailed performance metrics
   */
  static validateDetailedPerformanceMetrics(value: unknown, context = 'DetailedPerformanceMetrics'): ValidationResult<DetailedPerformanceMetrics> {
    const errors: ValidationError[] = [];

    if (!isDetailedPerformanceMetrics(value)) {
      const error: ValidationError = {
        field: context,
        message: 'Invalid DetailedPerformanceMetrics structure',
        value,
        expectedType: 'DetailedPerformanceMetrics'
      };
      
      this.logValidationError(error);
      errors.push(error);

      return { isValid: false, errors };
    }

    return { isValid: true, data: value, errors: [] };
  }

  /**
   * Validate performance alert
   */
  static validatePerformanceAlert(value: unknown, context = 'PerformanceAlert'): ValidationResult<PerformanceAlert> {
    const errors: ValidationError[] = [];

    if (!isPerformanceAlert(value)) {
      const error: ValidationError = {
        field: context,
        message: 'Invalid PerformanceAlert structure',
        value,
        expectedType: 'PerformanceAlert'
      };
      
      this.logValidationError(error);
      errors.push(error);

      return { isValid: false, errors };
    }

    return { isValid: true, data: value, errors: [] };
  }

  /**
   * Validate device capabilities
   */
  static validateDeviceCapabilities(value: unknown, context = 'DeviceCapabilities'): ValidationResult<DeviceCapabilities> {
    const errors: ValidationError[] = [];

    if (!isDeviceCapabilities(value)) {
      const error: ValidationError = {
        field: context,
        message: 'Invalid DeviceCapabilities structure',
        value,
        expectedType: 'DeviceCapabilities'
      };
      
      this.logValidationError(error);
      errors.push(error);

      return { isValid: false, errors };
    }

    return { isValid: true, data: value, errors: [] };
  }

  /**
   * Safe transformation with fallback
   */
  static safeTransform<T>(
    value: unknown,
    validator: (value: unknown) => ValidationResult<T>,
    fallback: T,
    context?: string
  ): T {
    try {
      const result = validator(value);
      if (result.isValid && result.data) {
        return result.data;
      }
      
      if (context) {
        console.warn(`Using fallback for ${context} due to validation failure:`, result.errors);
      }
      
      return fallback;
    } catch (error) {
      if (context) {
        console.error(`Validation error in ${context}:`, error);
      }
      return fallback;
    }
  }

  /**
   * Validate array of items
   */
  static validateArray<T>(
    value: unknown,
    itemValidator: (item: unknown, index: number) => ValidationResult<T>,
    context = 'Array'
  ): ValidationResult<T[]> {
    const errors: ValidationError[] = [];

    if (!Array.isArray(value)) {
      const error: ValidationError = {
        field: context,
        message: 'Expected array',
        value,
        expectedType: 'Array'
      };
      
      this.logValidationError(error);
      errors.push(error);

      return { isValid: false, errors };
    }

    const validatedItems: T[] = [];
    let hasErrors = false;

    value.forEach((item, index) => {
      const result = itemValidator(item, index);
      if (result.isValid && result.data) {
        validatedItems.push(result.data);
      } else {
        hasErrors = true;
        errors.push(...result.errors);
      }
    });

    return {
      isValid: !hasErrors,
      data: hasErrors ? undefined : validatedItems,
      errors
    };
  }

  /**
   * Create a validation middleware for API endpoints
   */
  static createValidationMiddleware<T>(
    validator: (value: unknown) => ValidationResult<T>
  ) {
    return (req: any, res: any, next: any) => {
      const result = validator(req.body);
      
      if (!result.isValid) {
        return res.status(400).json({
          error: 'Validation failed',
          details: result.errors
        });
      }
      
      req.validatedBody = result.data;
      next();
    };
  }

  /**
   * Generate validation report
   */
  static generateValidationReport(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsByField: Record<string, number>;
    recentErrors: ValidationError[];
  } {
    const errors = this.getValidationErrors();
    const errorsByType: Record<string, number> = {};
    const errorsByField: Record<string, number> = {};

    errors.forEach(error => {
      errorsByType[error.expectedType] = (errorsByType[error.expectedType] || 0) + 1;
      errorsByField[error.field] = (errorsByField[error.field] || 0) + 1;
    });

    return {
      totalErrors: errors.length,
      errorsByType,
      errorsByField,
      recentErrors: errors.slice(-10) // Last 10 errors
    };
  }
}
