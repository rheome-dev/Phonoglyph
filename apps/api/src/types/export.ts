// Export Configuration System Types
export interface ExportConfiguration {
  id: string;
  name: string;
  compositionId: string;
  format: ExportFormat;
  quality: QualitySettings;
  audio: AudioSettings;
  branding?: BrandingSettings;
  socialMedia?: SocialMediaSettings;
}

export interface ExportFormat {
  container: 'mp4' | 'webm' | 'mov' | 'gif';
  videoCodec: 'h264' | 'h265' | 'vp9' | 'av1';
  audioCodec: 'aac' | 'mp3' | 'opus';
  preset: FormatPreset;
}

export type FormatPreset = 
  | 'youtube_1080p'
  | 'youtube_4k'
  | 'instagram_square'
  | 'instagram_story'
  | 'tiktok_vertical'
  | 'twitter_landscape'
  | 'custom';

export interface QualitySettings {
  resolution: {
    width: number;
    height: number;
  };
  framerate: 24 | 30 | 60;
  bitrate: number; // kbps
  crf?: number; // Constant Rate Factor for quality
  profile?: 'baseline' | 'main' | 'high';
}

export interface AudioSettings {
  enabled: boolean;
  bitrate: number; // kbps
  sampleRate: 44100 | 48000;
  channels: 1 | 2;
  normalization: boolean;
  fadeIn?: number; // seconds
  fadeOut?: number; // seconds
}

export interface BrandingSettings {
  watermark?: {
    imageUrl: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity: number;
    scale: number;
  };
  endCard?: {
    duration: number; // seconds
    backgroundColor: string;
    logoUrl?: string;
    text?: string;
  };
}

export interface SocialMediaSettings {
  platform: 'youtube' | 'instagram' | 'tiktok' | 'twitter';
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:5';
  maxDuration?: number; // seconds
  requirements: {
    maxFileSize: number; // bytes
    recommendedBitrate: number; // kbps
    supportedFormats: string[];
  };
}

export interface ExportJob {
  id: string;
  userId: string;
  compositionId: string;
  config: ExportConfiguration;
  status: ExportStatus;
  progress: number; // 0-1
  error?: string;
  downloadUrl?: string;
  fileSize?: number;
  durationSeconds?: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export type ExportStatus = 'queued' | 'rendering' | 'uploading' | 'completed' | 'failed' | 'cancelled';

// Predefined export presets
export const EXPORT_PRESETS: Record<FormatPreset, ExportConfiguration> = {
  youtube_1080p: {
    id: 'youtube_1080p',
    name: 'YouTube 1080p',
    compositionId: '',
    format: {
      container: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      preset: 'youtube_1080p'
    },
    quality: {
      resolution: { width: 1920, height: 1080 },
      framerate: 30,
      bitrate: 8000,
      crf: 18,
      profile: 'high'
    },
    audio: {
      enabled: true,
      bitrate: 192,
      sampleRate: 48000,
      channels: 2,
      normalization: true
    },
    socialMedia: {
      platform: 'youtube',
      aspectRatio: '16:9',
      requirements: {
        maxFileSize: 128 * 1024 * 1024 * 1024, // 128GB
        recommendedBitrate: 8000,
        supportedFormats: ['mp4', 'mov', 'webm']
      }
    }
  },
  
  youtube_4k: {
    id: 'youtube_4k',
    name: 'YouTube 4K',
    compositionId: '',
    format: {
      container: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      preset: 'youtube_4k'
    },
    quality: {
      resolution: { width: 3840, height: 2160 },
      framerate: 30,
      bitrate: 35000,
      crf: 16,
      profile: 'high'
    },
    audio: {
      enabled: true,
      bitrate: 320,
      sampleRate: 48000,
      channels: 2,
      normalization: true
    },
    socialMedia: {
      platform: 'youtube',
      aspectRatio: '16:9',
      requirements: {
        maxFileSize: 128 * 1024 * 1024 * 1024, // 128GB
        recommendedBitrate: 35000,
        supportedFormats: ['mp4', 'mov', 'webm']
      }
    }
  },
  
  instagram_square: {
    id: 'instagram_square',
    name: 'Instagram Square',
    compositionId: '',
    format: {
      container: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      preset: 'instagram_square'
    },
    quality: {
      resolution: { width: 1080, height: 1080 },
      framerate: 30,
      bitrate: 3500,
      crf: 20,
      profile: 'main'
    },
    audio: {
      enabled: true,
      bitrate: 128,
      sampleRate: 44100,
      channels: 2,
      normalization: true
    },
    socialMedia: {
      platform: 'instagram',
      aspectRatio: '1:1',
      maxDuration: 60,
      requirements: {
        maxFileSize: 4 * 1024 * 1024 * 1024, // 4GB
        recommendedBitrate: 3500,
        supportedFormats: ['mp4']
      }
    }
  },
  
  instagram_story: {
    id: 'instagram_story',
    name: 'Instagram Story',
    compositionId: '',
    format: {
      container: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      preset: 'instagram_story'
    },
    quality: {
      resolution: { width: 1080, height: 1920 },
      framerate: 30,
      bitrate: 3500,
      crf: 20,
      profile: 'main'
    },
    audio: {
      enabled: true,
      bitrate: 128,
      sampleRate: 44100,
      channels: 2,
      normalization: true
    },
    socialMedia: {
      platform: 'instagram',
      aspectRatio: '9:16',
      maxDuration: 15,
      requirements: {
        maxFileSize: 4 * 1024 * 1024 * 1024, // 4GB
        recommendedBitrate: 3500,
        supportedFormats: ['mp4']
      }
    }
  },
  
  tiktok_vertical: {
    id: 'tiktok_vertical',
    name: 'TikTok Vertical',
    compositionId: '',
    format: {
      container: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      preset: 'tiktok_vertical'
    },
    quality: {
      resolution: { width: 1080, height: 1920 },
      framerate: 30,
      bitrate: 2000,
      crf: 22,
      profile: 'main'
    },
    audio: {
      enabled: true,
      bitrate: 128,
      sampleRate: 44100,
      channels: 2,
      normalization: true
    },
    socialMedia: {
      platform: 'tiktok',
      aspectRatio: '9:16',
      maxDuration: 180,
      requirements: {
        maxFileSize: 287.6 * 1024 * 1024, // 287.6MB
        recommendedBitrate: 2000,
        supportedFormats: ['mp4']
      }
    }
  },
  
  twitter_landscape: {
    id: 'twitter_landscape',
    name: 'Twitter Landscape',
    compositionId: '',
    format: {
      container: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      preset: 'twitter_landscape'
    },
    quality: {
      resolution: { width: 1920, height: 1080 },
      framerate: 30,
      bitrate: 5000,
      crf: 19,
      profile: 'main'
    },
    audio: {
      enabled: true,
      bitrate: 128,
      sampleRate: 44100,
      channels: 2,
      normalization: true
    },
    socialMedia: {
      platform: 'twitter',
      aspectRatio: '16:9',
      maxDuration: 140,
      requirements: {
        maxFileSize: 512 * 1024 * 1024, // 512MB
        recommendedBitrate: 5000,
        supportedFormats: ['mp4']
      }
    }
  },
  
  custom: {
    id: 'custom',
    name: 'Custom Settings',
    compositionId: '',
    format: {
      container: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      preset: 'custom'
    },
    quality: {
      resolution: { width: 1920, height: 1080 },
      framerate: 30,
      bitrate: 8000,
      crf: 18,
      profile: 'high'
    },
    audio: {
      enabled: true,
      bitrate: 192,
      sampleRate: 48000,
      channels: 2,
      normalization: true
    }
  }
};