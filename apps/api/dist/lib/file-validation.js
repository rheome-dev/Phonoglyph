"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUploadRateLimit = exports.isExecutableFile = exports.getFileExtension = exports.sanitizeFileName = exports.validateFile = exports.validateFileHeader = exports.validateFileSize = exports.validateMimeType = exports.validateFileExtension = exports.FileUploadSchema = exports.imageValidation = exports.videoValidation = exports.MAGIC_BYTES = exports.ALLOWED_EXTENSIONS = exports.ALLOWED_MIME_TYPES = exports.FILE_SIZE_LIMITS = void 0;
const zod_1 = require("zod");
// File size limits from environment variables - EXTENDED
exports.FILE_SIZE_LIMITS = {
    midi: parseInt(process.env.MAX_MIDI_FILE_SIZE || '5242880'), // 5MB
    audio: parseInt(process.env.MAX_AUDIO_FILE_SIZE || '52428800'), // 50MB
    video: parseInt(process.env.MAX_VIDEO_FILE_SIZE || '524288000'), // 500MB
    image: parseInt(process.env.MAX_IMAGE_FILE_SIZE || '26214400'), // 25MB
};
// Allowed MIME types - EXTENDED
exports.ALLOWED_MIME_TYPES = {
    midi: [
        'audio/midi',
        'audio/x-midi',
        'application/x-midi',
        'audio/mid',
    ],
    audio: [
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/wave',
        'audio/x-wav',
    ],
    video: [
        'video/mp4',
        'video/mov',
        'video/quicktime',
        'video/webm',
    ],
    image: [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
    ],
};
// Allowed file extensions - EXTENDED
exports.ALLOWED_EXTENSIONS = {
    midi: ['.mid', '.midi'],
    audio: ['.mp3', '.wav'],
    video: ['.mp4', '.mov', '.webm'],
    image: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
};
// Magic bytes for file header validation - EXTENDED
exports.MAGIC_BYTES = {
    midi: [
        [0x4d, 0x54, 0x68, 0x64], // "MThd" - Standard MIDI file header
    ],
    mp3: [
        [0xff, 0xfb], // MPEG-1 Layer 3
        [0xff, 0xf3], // MPEG-2 Layer 3
        [0xff, 0xf2], // MPEG-2.5 Layer 3
        [0x49, 0x44, 0x33], // ID3 tag
    ],
    wav: [
        [0x52, 0x49, 0x46, 0x46], // "RIFF" header
    ],
    mp4: [
        [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70], // MP4 signature
        [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // Alternative MP4
    ],
    webm: [
        [0x1a, 0x45, 0xdf, 0xa3], // WebM/Matroska signature
    ],
    jpeg: [
        [0xff, 0xd8, 0xff], // JPEG signature
    ],
    png: [
        [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], // PNG signature
    ],
    gif: [
        [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
        [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
    ],
    webp: [
        [0x52, 0x49, 0x46, 0x46], // RIFF container for WebP
    ],
};
// Validation configurations for new file types
exports.videoValidation = {
    maxSize: 500 * 1024 * 1024, // 500MB
    allowedTypes: [
        'video/mp4',
        'video/mov',
        'video/quicktime',
        'video/webm'
    ],
    maxDuration: 600, // 10 minutes max
    maxResolution: {
        width: 3840, // 4K max
        height: 2160
    }
};
exports.imageValidation = {
    maxSize: 25 * 1024 * 1024, // 25MB
    allowedTypes: [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp'
    ],
    maxResolution: {
        width: 8192, // 8K max
        height: 8192
    }
};
// Zod schema for file upload input - EXTENDED
exports.FileUploadSchema = zod_1.z.object({
    fileName: zod_1.z.string().min(1, 'File name is required').max(255, 'File name too long'),
    fileSize: zod_1.z.number().positive('File size must be positive'),
    mimeType: zod_1.z.string().min(1, 'MIME type is required'),
});
// Validate file extension - EXTENDED
function validateFileExtension(fileName) {
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    if (exports.ALLOWED_EXTENSIONS.midi.includes(extension)) {
        return 'midi';
    }
    if (exports.ALLOWED_EXTENSIONS.audio.includes(extension)) {
        return 'audio';
    }
    if (exports.ALLOWED_EXTENSIONS.video.includes(extension)) {
        return 'video';
    }
    if (exports.ALLOWED_EXTENSIONS.image.includes(extension)) {
        return 'image';
    }
    return null;
}
exports.validateFileExtension = validateFileExtension;
// Validate MIME type
function validateMimeType(mimeType, fileType) {
    return exports.ALLOWED_MIME_TYPES[fileType].includes(mimeType);
}
exports.validateMimeType = validateMimeType;
// Validate file size
function validateFileSize(fileSize, fileType) {
    return fileSize <= exports.FILE_SIZE_LIMITS[fileType];
}
exports.validateFileSize = validateFileSize;
// Validate file header (magic bytes) - EXTENDED
function validateFileHeader(buffer, fileType) {
    const uint8Array = new Uint8Array(buffer.slice(0, 12)); // Check first 12 bytes
    switch (fileType) {
        case 'midi':
            // Check for MIDI "MThd" header
            return [0x4d, 0x54, 0x68, 0x64].every((byte, i) => uint8Array[i] === byte);
        case 'audio':
            // For audio, we need to check the actual extension/mime type
            if (buffer.byteLength < 4)
                return false;
            // Check for MP3
            if ([0xff, 0xfb].every((byte, i) => uint8Array[i] === byte) ||
                [0xff, 0xf3].every((byte, i) => uint8Array[i] === byte) ||
                [0xff, 0xf2].every((byte, i) => uint8Array[i] === byte) ||
                [0x49, 0x44, 0x33].every((byte, i) => uint8Array[i] === byte)) {
                return true;
            }
            // Check for WAV
            if ([0x52, 0x49, 0x46, 0x46].every((byte, i) => uint8Array[i] === byte) &&
                uint8Array.length >= 12 &&
                [0x57, 0x41, 0x56, 0x45].every((byte, i) => uint8Array[i + 8] === byte)) {
                return true;
            }
            return false;
        case 'video':
            if (buffer.byteLength < 8)
                return false;
            // Check for MP4
            if (uint8Array.length >= 8 &&
                ([0x66, 0x74, 0x79, 0x70].every((byte, i) => uint8Array[i + 4] === byte))) {
                return true;
            }
            // Check for WebM
            if ([0x1a, 0x45, 0xdf, 0xa3].every((byte, i) => uint8Array[i] === byte)) {
                return true;
            }
            return false;
        case 'image':
            if (buffer.byteLength < 8)
                return false;
            // Check for JPEG
            if ([0xff, 0xd8, 0xff].every((byte, i) => uint8Array[i] === byte)) {
                return true;
            }
            // Check for PNG
            if ([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, i) => uint8Array[i] === byte)) {
                return true;
            }
            // Check for GIF
            if ([0x47, 0x49, 0x46, 0x38].every((byte, i) => uint8Array[i] === byte) &&
                (uint8Array[4] === 0x37 || uint8Array[4] === 0x39) &&
                uint8Array[5] === 0x61) {
                return true;
            }
            // Check for WebP (RIFF container)
            if ([0x52, 0x49, 0x46, 0x46].every((byte, i) => uint8Array[i] === byte) &&
                uint8Array.length >= 12 &&
                [0x57, 0x45, 0x42, 0x50].every((byte, i) => uint8Array[i + 8] === byte)) {
                return true;
            }
            return false;
        default:
            return false;
    }
}
exports.validateFileHeader = validateFileHeader;
// Main file validation function - UPDATED
function validateFile(input) {
    const errors = [];
    const { fileName, fileSize, mimeType } = input;
    // Validate file extension and determine type
    const fileType = validateFileExtension(fileName);
    if (!fileType) {
        errors.push('Invalid file type. Allowed types: .mid, .midi, .mp3, .wav, .mp4, .mov, .webm, .jpg, .jpeg, .png, .gif, .webp');
    }
    let result = {
        fileName,
        fileType: fileType || 'midi', // Default to midi to avoid type errors
        mimeType,
        fileSize,
        isValid: false,
        errors,
    };
    if (!fileType) {
        return result;
    }
    // Update result with determined file type
    result.fileType = fileType;
    // Validate MIME type
    if (!validateMimeType(mimeType, fileType)) {
        errors.push(`Invalid MIME type for ${fileType} file. Allowed types: ${exports.ALLOWED_MIME_TYPES[fileType].join(', ')}`);
    }
    // Validate file size
    if (!validateFileSize(fileSize, fileType)) {
        const maxSizeMB = exports.FILE_SIZE_LIMITS[fileType] / (1024 * 1024);
        errors.push(`File size exceeds limit. Maximum size for ${fileType} files: ${maxSizeMB}MB`);
    }
    // Validate file name
    if (fileName.length > 255) {
        errors.push('File name is too long (maximum 255 characters)');
    }
    result.errors = errors;
    result.isValid = errors.length === 0;
    return result;
}
exports.validateFile = validateFile;
// Sanitize file name for storage
function sanitizeFileName(fileName) {
    // Replace unsafe characters with underscores
    return fileName
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/_{2,}/g, '_') // Replace multiple underscores with single
        .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
}
exports.sanitizeFileName = sanitizeFileName;
// Get file extension
function getFileExtension(fileName) {
    return fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
}
exports.getFileExtension = getFileExtension;
// Check if file is executable (security check)
function isExecutableFile(fileName) {
    const executableExtensions = [
        '.exe', '.bat', '.cmd', '.com', '.scr', '.pif',
        '.sh', '.bash', '.zsh', '.csh', '.fish',
        '.ps1', '.vbs', '.js', '.jar', '.app',
    ];
    const extension = getFileExtension(fileName);
    return executableExtensions.includes(extension);
}
exports.isExecutableFile = isExecutableFile;
// Rate limiting helper for uploads
function createUploadRateLimit() {
    const uploads = new Map();
    const WINDOW_MS = 60 * 1000; // 1 minute
    const MAX_UPLOADS = 10; // Max uploads per minute per user
    return {
        checkRateLimit: (userId) => {
            const now = Date.now();
            const userUploads = uploads.get(userId) || [];
            // Remove old timestamps
            const recentUploads = userUploads.filter(timestamp => now - timestamp < WINDOW_MS);
            // Check if under limit
            if (recentUploads.length >= MAX_UPLOADS) {
                return false;
            }
            // Add current upload
            recentUploads.push(now);
            uploads.set(userId, recentUploads);
            return true;
        },
        getRemainingUploads: (userId) => {
            const now = Date.now();
            const userUploads = uploads.get(userId) || [];
            const recentUploads = userUploads.filter(timestamp => now - timestamp < WINDOW_MS);
            return Math.max(0, MAX_UPLOADS - recentUploads.length);
        }
    };
}
exports.createUploadRateLimit = createUploadRateLimit;
//# sourceMappingURL=file-validation.js.map