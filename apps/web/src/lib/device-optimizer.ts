// Device Optimizer for Story 5.2: Device-specific Optimizations
// Intelligent device capability detection and optimization system

import { StemProcessorConfig, AnalysisConfig, VisualizationFeature } from '@/types/stem-audio-analysis';

// Declare webkit audio context for compatibility
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

export interface DeviceCapabilities {
  // Hardware
  cpuCores: number;
  estimatedCpuPower: 'low' | 'medium' | 'high';
  availableMemory: number;
  
  // Platform
  platform: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  operatingSystem: 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown';
  browser: 'chrome' | 'firefox' | 'safari' | 'edge' | 'unknown';
  
  // Performance indicators
  batteryLevel?: number;
  isLowPowerMode?: boolean;
  networkSpeed: 'slow' | 'medium' | 'fast' | 'unknown';
  
  // Audio capabilities
  audioContextSupport: boolean;
  webAudioFeatures: {
    workletSupport: boolean;
    offlineAudioContext: boolean;
    mediaStreamSupport: boolean;
  };
  
  // Worker capabilities
  workerSupport: boolean;
  sharedArrayBufferSupport: boolean;
  
  // Storage
  availableStorage: number; // MB
}

export interface OptimizationProfile {
  name: 'ultra-low' | 'low' | 'medium' | 'high' | 'ultra-high';
  description: string;
  
  // Analysis settings
  maxConcurrentStems: number;
  bufferSize: number;
  frameRate: number;
  featureCount: number;
  
     // Quality settings
   analysisQuality: 'low' | 'medium' | 'high';
  enableWorkers: boolean;
  enableCaching: boolean;
  
  // Memory management
  maxMemoryUsage: number; // MB
  enableGarbageCollection: boolean;
  cacheSize: number; // MB
  
  // Battery optimization (mobile)
  batteryOptimizations: {
    reducedFrameRate: boolean;
    aggressiveGC: boolean;
    disableNonEssentialFeatures: boolean;
    backgroundThrottling: boolean;
  };
}

export class DeviceOptimizer {
  private capabilities: DeviceCapabilities;
  private currentProfile: OptimizationProfile;
  private adaptiveMode: boolean = true;
  private performanceHistory: number[] = [];
  private lastDegradationTime: number = 0;
  private degradationCooldown: number = 30000; // 30 seconds cooldown
  private consecutivePoorPerformance: number = 0;
  private requiredPoorPerformanceCount: number = 10; // Require 10 consecutive poor measurements
  
  // Optimization profiles for different device classes
  private optimizationProfiles: Record<OptimizationProfile['name'], OptimizationProfile> = {
    'ultra-low': {
      name: 'ultra-low',
      description: 'Emergency mode for severely constrained devices',
      maxConcurrentStems: 1,
      bufferSize: 4096,
      frameRate: 10,
      featureCount: 2,
             analysisQuality: 'low',
      enableWorkers: false,
      enableCaching: false,
      maxMemoryUsage: 20,
      enableGarbageCollection: true,
      cacheSize: 0,
      batteryOptimizations: {
        reducedFrameRate: true,
        aggressiveGC: true,
        disableNonEssentialFeatures: true,
        backgroundThrottling: true
      }
    },
    
    'low': {
      name: 'low',
      description: 'Optimized for low-end mobile devices',
      maxConcurrentStems: 2,
      bufferSize: 2048,
      frameRate: 15,
      featureCount: 3,
      analysisQuality: 'low',
      enableWorkers: false,
      enableCaching: true,
      maxMemoryUsage: 40,
      enableGarbageCollection: true,
      cacheSize: 5,
      batteryOptimizations: {
        reducedFrameRate: true,
        aggressiveGC: true,
        disableNonEssentialFeatures: true,
        backgroundThrottling: true
      }
    },
    
    'medium': {
      name: 'medium',
      description: 'Balanced performance for mid-range devices',
      maxConcurrentStems: 3,
      bufferSize: 1024,
      frameRate: 30,
      featureCount: 5,
      analysisQuality: 'medium',
      enableWorkers: true,
      enableCaching: true,
      maxMemoryUsage: 80,
      enableGarbageCollection: true,
      cacheSize: 10,
      batteryOptimizations: {
        reducedFrameRate: false,
        aggressiveGC: false,
        disableNonEssentialFeatures: false,
        backgroundThrottling: true
      }
    },
    
    'high': {
      name: 'high',
      description: 'High performance for modern devices',
      maxConcurrentStems: 5,
      bufferSize: 512,
      frameRate: 60,
      featureCount: 8,
      analysisQuality: 'high',
      enableWorkers: true,
      enableCaching: true,
      maxMemoryUsage: 150,
      enableGarbageCollection: false,
      cacheSize: 20,
      batteryOptimizations: {
        reducedFrameRate: false,
        aggressiveGC: false,
        disableNonEssentialFeatures: false,
        backgroundThrottling: false
      }
    },
    
    'ultra-high': {
      name: 'ultra-high',
      description: 'Maximum performance for high-end desktops',
      maxConcurrentStems: 8,
      bufferSize: 256,
      frameRate: 120,
      featureCount: 12,
             analysisQuality: 'high',
      enableWorkers: true,
      enableCaching: true,
      maxMemoryUsage: 300,
      enableGarbageCollection: false,
      cacheSize: 50,
      batteryOptimizations: {
        reducedFrameRate: false,
        aggressiveGC: false,
        disableNonEssentialFeatures: false,
        backgroundThrottling: false
      }
    }
  };

  constructor() {
    this.capabilities = this.detectDeviceCapabilities();
    this.currentProfile = this.selectOptimalProfile();
    
    console.log('🔧 Device Optimizer initialized:', {
      platform: this.capabilities.platform,
      profile: this.currentProfile.name,
      memory: this.capabilities.availableMemory
    });
    
    // Set up adaptive monitoring
    this.setupAdaptiveMonitoring();
  }

  // Device capability detection
  private detectDeviceCapabilities(): DeviceCapabilities {
    return {
      // Hardware detection
      cpuCores: navigator.hardwareConcurrency || 4,
      estimatedCpuPower: this.estimateCpuPower(),
      availableMemory: this.getAvailableMemory(),
      
      // Platform detection
      platform: this.detectPlatform(),
      operatingSystem: this.detectOS(),
      browser: this.detectBrowser(),
      
      // Performance indicators
      batteryLevel: undefined, // Will be updated asynchronously
      isLowPowerMode: this.detectLowPowerMode(),
      networkSpeed: this.getNetworkSpeed(),
      
      // Audio capabilities
      audioContextSupport: typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined',
      webAudioFeatures: {
        workletSupport: 'AudioWorklet' in window,
        offlineAudioContext: typeof OfflineAudioContext !== 'undefined',
        mediaStreamSupport: 'getUserMedia' in navigator.mediaDevices
      },
      
      // Worker capabilities
      workerSupport: typeof Worker !== 'undefined',
      sharedArrayBufferSupport: typeof SharedArrayBuffer !== 'undefined',
      
      // Storage
      availableStorage: this.getAvailableStorage()
    };
  }

  private estimateCpuPower(): 'low' | 'medium' | 'high' {
    const cores = this.capabilities?.cpuCores || navigator.hardwareConcurrency || 4;
    const platform = this.detectPlatform();
    
    // CPU power estimation based on cores and platform
    if (platform === 'mobile') {
      return cores >= 8 ? 'medium' : 'low';
    } else if (platform === 'tablet') {
      return cores >= 6 ? 'medium' : 'low';
    } else {
      // Desktop
      if (cores >= 8) return 'high';
      if (cores >= 4) return 'medium';
      return 'low';
    }
  }

  private detectPlatform(): DeviceCapabilities['platform'] {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/iphone|ipod/.test(userAgent)) return 'mobile';
    if (/ipad/.test(userAgent)) return 'tablet';
    if (/android/.test(userAgent)) {
      // Distinguish between mobile and tablet Android
      return /mobile/.test(userAgent) ? 'mobile' : 'tablet';
    }
    if (/mobile|phone/.test(userAgent)) return 'mobile';
    
    return 'desktop';
  }

  private detectOS(): DeviceCapabilities['operatingSystem'] {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
    if (/android/.test(userAgent)) return 'android';
    if (/windows/.test(userAgent)) return 'windows';
    if (/mac/.test(userAgent)) return 'macos';
    if (/linux/.test(userAgent)) return 'linux';
    
    return 'unknown';
  }

  private detectBrowser(): DeviceCapabilities['browser'] {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/chrome/.test(userAgent) && !/edg/.test(userAgent)) return 'chrome';
    if (/firefox/.test(userAgent)) return 'firefox';
    if (/safari/.test(userAgent) && !/chrome/.test(userAgent)) return 'safari';
    if (/edg/.test(userAgent)) return 'edge';
    
    return 'unknown';
  }

  private detectLowPowerMode(): boolean {
    // Heuristics for detecting low power mode
    const isMobile = this.detectPlatform() === 'mobile';
    const lowCores = (navigator.hardwareConcurrency || 4) <= 2;
    const limitedMemory = this.getAvailableMemory() < 100;
    
    return isMobile && (lowCores || limitedMemory);
  }

  private getNetworkSpeed(): DeviceCapabilities['networkSpeed'] {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const effectiveType = connection.effectiveType;
      
      switch (effectiveType) {
        case 'slow-2g':
        case '2g':
          return 'slow';
        case '3g':
          return 'medium';
        case '4g':
        case '5g':
          return 'fast';
        default:
          return 'unknown';
      }
    }
    
    return 'unknown';
  }

  private getAvailableMemory(): number {
    // Use Performance Memory API if available
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return Math.round(memory.jsHeapSizeLimit / (1024 * 1024));
    }
    
    // Fallback estimation based on device type
    const platform = this.detectPlatform();
    switch (platform) {
      case 'mobile':
        return 512; // Conservative estimate for mobile
      case 'tablet':
        return 1024;
      case 'desktop':
        return 2048;
      default:
        return 1024;
    }
  }

  private getAvailableStorage(): number {
    // Estimate based on platform (simplified)
    const platform = this.detectPlatform();
    switch (platform) {
      case 'mobile':
        return 100; // MB available for audio caching
      case 'tablet':
        return 200;
      case 'desktop':
        return 500;
      default:
        return 100;
    }
  }

  // Profile selection and optimization
  private selectOptimalProfile(): OptimizationProfile {
    const caps = this.capabilities;
    
    // Emergency mode for severely constrained devices
    if (caps.availableMemory < 30 || caps.estimatedCpuPower === 'low' && caps.platform === 'mobile') {
      return this.optimizationProfiles['ultra-low'];
    }
    
    // Low-end mobile devices
    if (caps.platform === 'mobile' && caps.estimatedCpuPower === 'low') {
      return this.optimizationProfiles['low'];
    }
    
    // Mid-range devices
    if (caps.platform === 'mobile' || caps.estimatedCpuPower === 'medium') {
      return this.optimizationProfiles['medium'];
    }
    
    // High-end devices
    if (caps.platform === 'desktop' && caps.estimatedCpuPower === 'high' && caps.availableMemory > 200) {
      return this.optimizationProfiles['ultra-high'];
    }
    
    // Default to high performance
    return this.optimizationProfiles['high'];
  }

  // Public API methods
  getOptimizedConfig(): StemProcessorConfig {
    const profile = this.currentProfile;
    
    return {
      bufferSize: profile.bufferSize,
      analysisResolution: this.getAnalysisResolution(),
      deviceOptimization: this.capabilities.platform === 'mobile' ? 'mobile' : 'desktop',
      maxConcurrentStems: profile.maxConcurrentStems
    };
  }

  getAnalysisConfig(): AnalysisConfig {
    const profile = this.currentProfile;
    
         return {
       features: new Set(this.getOptimizedFeatures() as VisualizationFeature[]),
       bufferSize: profile.bufferSize,
       frameRate: this.getOptimizedFrameRate(),
       quality: profile.analysisQuality,
       enableCrossStemAnalysis: profile.name !== 'ultra-low'
     };
  }

  private getAnalysisResolution(): number {
    // Adjust analysis resolution based on device capabilities
    switch (this.currentProfile.name) {
      case 'ultra-low':
        return 0.25; // Quarter resolution
      case 'low':
        return 0.5; // Half resolution
      case 'medium':
        return 0.75;
      case 'high':
      case 'ultra-high':
        return 1.0; // Full resolution
      default:
        return 1.0;
    }
  }

  private getOptimizedFeatures(): string[] {
    const baseFeatures = ['rms', 'spectralCentroid'];
    const profile = this.currentProfile;
    
    const featuresByCount: Record<number, string[]> = {
      2: baseFeatures,
      3: [...baseFeatures, 'loudness'],
      5: [...baseFeatures, 'loudness', 'spectralRolloff', 'spectralFlux'],
      8: [...baseFeatures, 'loudness', 'spectralRolloff', 'spectralFlux', 'perceptualSpread', 'mfcc', 'energy'],
      12: [...baseFeatures, 'loudness', 'spectralRolloff', 'spectralFlux', 'perceptualSpread', 'mfcc', 'energy', 'chromaVector', 'zcr', 'amplitudeSpectrum', 'powerSpectrum']
    };
    
    return featuresByCount[profile.featureCount] || baseFeatures;
  }

  private getOptimizedFrameRate(): number {
    let frameRate = this.currentProfile.frameRate;
    
    // Apply battery optimizations for mobile
    if (this.capabilities.platform === 'mobile') {
      if (this.capabilities.batteryLevel !== undefined && this.capabilities.batteryLevel < 20) {
        frameRate = Math.min(frameRate, 15); // Reduce to 15fps on low battery
      }
      
      if (this.capabilities.isLowPowerMode) {
        frameRate = Math.min(frameRate, 20); // Reduce to 20fps in low power mode
      }
    }
    
    return frameRate;
  }

  // Adaptive optimization
  updatePerformanceMetrics(fps: number, latency: number, memoryUsage: number): void {
    this.performanceHistory.push(fps);
    
    // Keep only recent history
    if (this.performanceHistory.length > 30) {
      this.performanceHistory.shift();
    }
    
    if (this.adaptiveMode) {
      this.adaptToPerformance(fps, latency, memoryUsage);
    }
  }

  private adaptToPerformance(fps: number, latency: number, memoryUsage: number): void {
    const targetFps = this.currentProfile.frameRate;
    const avgFps = this.performanceHistory.reduce((sum, f) => sum + f, 0) / this.performanceHistory.length;
    
    // Check if performance is poor
    const isPoorPerformance = avgFps < targetFps * 0.7 || latency > 100 || memoryUsage > this.currentProfile.maxMemoryUsage;
    
    if (isPoorPerformance) {
      this.consecutivePoorPerformance++;
    } else {
      this.consecutivePoorPerformance = 0;
    }
    
    // Only degrade if we have sustained poor performance and enough time has passed
    const timeSinceLastDegradation = Date.now() - this.lastDegradationTime;
    if (this.consecutivePoorPerformance >= this.requiredPoorPerformanceCount && 
        timeSinceLastDegradation > this.degradationCooldown) {
      this.degradePerformance();
    }
    
    // Performance is good, try to improve quality (less aggressive)
    else if (avgFps > targetFps * 0.95 && latency < 30 && memoryUsage < this.currentProfile.maxMemoryUsage * 0.8) {
      this.improvePerformance();
    }
  }

  private degradePerformance(): void {
    const currentIndex = Object.keys(this.optimizationProfiles).indexOf(this.currentProfile.name);
    
    if (currentIndex > 0) {
      const newProfileName = Object.keys(this.optimizationProfiles)[currentIndex - 1] as OptimizationProfile['name'];
      this.currentProfile = this.optimizationProfiles[newProfileName];
      
      this.lastDegradationTime = Date.now();
      this.consecutivePoorPerformance = 0; // Reset counter
      
      console.log(`🔻 Performance degraded to ${this.currentProfile.name} profile`);
    }
  }

  private improvePerformance(): void {
    const currentIndex = Object.keys(this.optimizationProfiles).indexOf(this.currentProfile.name);
    const maxIndex = Object.keys(this.optimizationProfiles).length - 1;
    
    if (currentIndex < maxIndex) {
      const newProfileName = Object.keys(this.optimizationProfiles)[currentIndex + 1] as OptimizationProfile['name'];
      
      // Don't upgrade beyond device capabilities
      const newProfile = this.optimizationProfiles[newProfileName];
      if (newProfile.maxMemoryUsage <= this.capabilities.availableMemory) {
        this.currentProfile = newProfile;
        console.log(`🔺 Performance improved to ${this.currentProfile.name} profile`);
      }
    }
  }

  // Battery and power management
  async updateBatteryStatus(): Promise<void> {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        this.capabilities.batteryLevel = Math.round(battery.level * 100);
        
        // Adjust profile based on battery level
        if (this.capabilities.platform === 'mobile') {
          this.applyBatteryOptimizations();
        }
      } catch (error) {
        // Battery API not available
      }
    }
  }

  private applyBatteryOptimizations(): void {
    if (!this.capabilities.batteryLevel) return;
    
    const batteryLevel = this.capabilities.batteryLevel;
    const profile = this.currentProfile;
    
    // Critical battery level (< 10%)
    if (batteryLevel < 10 && profile.name !== 'ultra-low') {
      this.currentProfile = this.optimizationProfiles['ultra-low'];
      console.log('🔋 Critical battery: switched to ultra-low profile');
    }
    
    // Low battery level (< 20%)
    else if (batteryLevel < 20 && ['high', 'ultra-high'].includes(profile.name)) {
      this.currentProfile = this.optimizationProfiles['medium'];
      console.log('🔋 Low battery: switched to medium profile');
    }
  }

  // Setup and monitoring
  private setupAdaptiveMonitoring(): void {
    // Update battery status every 30 seconds
    setInterval(() => {
      this.updateBatteryStatus();
    }, 30000);
    
    // Initial battery status check
    this.updateBatteryStatus();
    
    // Monitor visibility changes for background throttling
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.currentProfile.batteryOptimizations.backgroundThrottling) {
        // Could implement background throttling here
        console.log('🔇 Background throttling enabled');
      }
    });
  }

  // Public getters
  getDeviceCapabilities(): DeviceCapabilities {
    return { ...this.capabilities };
  }

  getCurrentProfile(): OptimizationProfile {
    return { ...this.currentProfile };
  }

  setProfile(profileName: OptimizationProfile['name']): void {
    if (this.optimizationProfiles[profileName]) {
      this.currentProfile = this.optimizationProfiles[profileName];
      console.log(`🔧 Manually set profile to ${profileName}`);
    }
  }

  enableAdaptiveMode(enabled: boolean): void {
    this.adaptiveMode = enabled;
    console.log(`🤖 Adaptive mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  getPerformanceRecommendations(): string[] {
    const recommendations: string[] = [];
    const caps = this.capabilities;
    const profile = this.currentProfile;
    
    // Platform-specific recommendations
    if (caps.platform === 'mobile') {
      recommendations.push('Enable mobile-specific audio optimizations');
      
      if (caps.batteryLevel !== undefined && caps.batteryLevel < 30) {
        recommendations.push('Consider battery optimization mode');
      }
    }
    
    // Memory recommendations
    if (caps.availableMemory < 100) {
      recommendations.push('Enable aggressive memory management');
    }
    
    // Worker recommendations
    if (!caps.workerSupport && profile.enableWorkers) {
      recommendations.push('Workers not supported, using main thread processing');
    }
    
    // Audio recommendations
    if (!caps.webAudioFeatures.workletSupport) {
      recommendations.push('Audio Worklets not supported, using fallback processing');
    }
    
    return recommendations;
  }
}