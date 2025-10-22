export interface StemProcessingResult {
    success: boolean;
    error?: string;
    stems?: {
        drums: string;
        bass: string;
        vocals: string;
        other: string;
    };
    processingDuration?: number;
}
export declare class StemProcessor {
    private static readonly SPLEETER_IMAGE;
    private static readonly OUTPUT_DIR;
    /**
     * Process audio file and separate into stems
     */
    static processStemSeparation(fileMetadataId: string, userId: string): Promise<StemProcessingResult>;
    /**
     * Run Spleeter in Docker container
     */
    private static runSpleeter;
    /**
     * Upload stems to R2 storage and create metadata records for them.
     */
    private static uploadStems;
    /**
     * Upload a single stem file to R2 and create its metadata record
     */
    private static uploadStem;
}
//# sourceMappingURL=stem-processor.d.ts.map