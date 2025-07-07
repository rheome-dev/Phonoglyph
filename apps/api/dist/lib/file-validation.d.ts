import { z } from 'zod';
export type FileType = 'midi' | 'audio' | 'video' | 'image';
export interface VideoMetadata {
    duration: number;
    width: number;
    height: number;
    frameRate: number;
    codec: string;
    bitrate: number;
    aspectRatio: string;
}
export interface ImageMetadata {
    width: number;
    height: number;
    colorProfile: string;
    orientation: number;
    hasAlpha: boolean;
    fileFormat: string;
}
export interface ValidatedFile {
    fileName: string;
    fileType: FileType;
    mimeType: string;
    fileSize: number;
    isValid: boolean;
    errors: string[];
}
export declare const FILE_SIZE_LIMITS: {
    readonly midi: number;
    readonly audio: number;
    readonly video: number;
    readonly image: number;
};
export declare const ALLOWED_MIME_TYPES: {
    midi: string[];
    audio: string[];
    video: string[];
    image: string[];
};
export declare const ALLOWED_EXTENSIONS: {
    readonly midi: readonly [".mid", ".midi"];
    readonly audio: readonly [".mp3", ".wav"];
    readonly video: readonly [".mp4", ".mov", ".webm"];
    readonly image: readonly [".jpg", ".jpeg", ".png", ".gif", ".webp"];
};
export declare const MAGIC_BYTES: {
    readonly midi: readonly [readonly [77, 84, 104, 100]];
    readonly mp3: readonly [readonly [255, 251], readonly [255, 243], readonly [255, 242], readonly [73, 68, 51]];
    readonly wav: readonly [readonly [82, 73, 70, 70]];
    readonly mp4: readonly [readonly [0, 0, 0, 32, 102, 116, 121, 112], readonly [0, 0, 0, 24, 102, 116, 121, 112]];
    readonly webm: readonly [readonly [26, 69, 223, 163]];
    readonly jpeg: readonly [readonly [255, 216, 255]];
    readonly png: readonly [readonly [137, 80, 78, 71, 13, 10, 26, 10]];
    readonly gif: readonly [readonly [71, 73, 70, 56, 55, 97], readonly [71, 73, 70, 56, 57, 97]];
    readonly webp: readonly [readonly [82, 73, 70, 70]];
};
export declare const videoValidation: {
    maxSize: number;
    allowedTypes: string[];
    maxDuration: number;
    maxResolution: {
        width: number;
        height: number;
    };
};
export declare const imageValidation: {
    maxSize: number;
    allowedTypes: string[];
    maxResolution: {
        width: number;
        height: number;
    };
};
export declare const FileUploadSchema: z.ZodObject<{
    fileName: z.ZodString;
    fileSize: z.ZodNumber;
    mimeType: z.ZodString;
}, "strip", z.ZodTypeAny, {
    fileName: string;
    fileSize: number;
    mimeType: string;
}, {
    fileName: string;
    fileSize: number;
    mimeType: string;
}>;
export type FileUploadInput = z.infer<typeof FileUploadSchema>;
export declare function validateFileExtension(fileName: string): FileType | null;
export declare function validateMimeType(mimeType: string, fileType: FileType): boolean;
export declare function validateFileSize(fileSize: number, fileType: FileType): boolean;
export declare function validateFileHeader(buffer: ArrayBuffer, fileType: FileType): boolean;
export declare function validateFile(input: FileUploadInput): ValidatedFile;
export declare function sanitizeFileName(fileName: string): string;
export declare function getFileExtension(fileName: string): string;
export declare function isExecutableFile(fileName: string): boolean;
export declare function createUploadRateLimit(): {
    checkRateLimit: (userId: string) => boolean;
    getRemainingUploads: (userId: string) => number;
};
//# sourceMappingURL=file-validation.d.ts.map