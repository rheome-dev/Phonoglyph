import { z } from 'zod';
export declare const StemSeparationConfigSchema: z.ZodObject<{
    model: z.ZodLiteral<"spleeter">;
    modelVariant: z.ZodEnum<["2stems", "4stems", "5stems"]>;
    stems: z.ZodObject<{
        drums: z.ZodOptional<z.ZodBoolean>;
        bass: z.ZodOptional<z.ZodBoolean>;
        vocals: z.ZodDefault<z.ZodBoolean>;
        other: z.ZodDefault<z.ZodBoolean>;
        piano: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        vocals: boolean;
        other: boolean;
        drums?: boolean | undefined;
        bass?: boolean | undefined;
        piano?: boolean | undefined;
    }, {
        drums?: boolean | undefined;
        bass?: boolean | undefined;
        vocals?: boolean | undefined;
        other?: boolean | undefined;
        piano?: boolean | undefined;
    }>;
    quality: z.ZodObject<{
        sampleRate: z.ZodDefault<z.ZodEnum<["44100", "48000"]>>;
        outputFormat: z.ZodDefault<z.ZodEnum<["wav", "mp3"]>>;
        bitrate: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        sampleRate: "44100" | "48000";
        outputFormat: "wav" | "mp3";
        bitrate?: number | undefined;
    }, {
        sampleRate?: "44100" | "48000" | undefined;
        outputFormat?: "wav" | "mp3" | undefined;
        bitrate?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    model: "spleeter";
    modelVariant: "2stems" | "4stems" | "5stems";
    stems: {
        vocals: boolean;
        other: boolean;
        drums?: boolean | undefined;
        bass?: boolean | undefined;
        piano?: boolean | undefined;
    };
    quality: {
        sampleRate: "44100" | "48000";
        outputFormat: "wav" | "mp3";
        bitrate?: number | undefined;
    };
}, {
    model: "spleeter";
    modelVariant: "2stems" | "4stems" | "5stems";
    stems: {
        drums?: boolean | undefined;
        bass?: boolean | undefined;
        vocals?: boolean | undefined;
        other?: boolean | undefined;
        piano?: boolean | undefined;
    };
    quality: {
        sampleRate?: "44100" | "48000" | undefined;
        outputFormat?: "wav" | "mp3" | undefined;
        bitrate?: number | undefined;
    };
}>;
export type StemSeparationConfig = z.infer<typeof StemSeparationConfigSchema>;
export interface StemSeparationJob {
    id: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    config: StemSeparationConfig;
    progress: number;
    estimatedTimeRemaining?: number;
    results?: {
        stems: Record<string, string>;
    };
    error?: string;
}
export declare class StemSeparator {
    private static jobs;
    /**
     * Create a new stem separation job
     */
    static createJob(config: StemSeparationConfig): StemSeparationJob;
    /**
     * Get job status
     */
    static getJob(jobId: string): StemSeparationJob | undefined;
    /**
     * Process audio file using Spleeter
     */
    static processStem(jobId: string, fileKey: string, outputDir: string): Promise<void>;
}
//# sourceMappingURL=stem-separator.d.ts.map