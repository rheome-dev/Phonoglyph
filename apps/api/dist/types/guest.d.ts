/**
 * Guest User Types for API
 */
export interface GuestUser {
    id: string;
    isGuest: true;
    sessionId: string;
    createdAt: string;
    tempData?: {
        projects: any[];
        preferences: Record<string, any>;
    };
}
export interface GuestProject {
    id: string;
    name: string;
    guestUserId: string;
    tempData: any;
    createdAt: string;
    expiresAt: string;
}
export interface GuestSession {
    sessionId: string;
    createdAt: string;
    expiresAt: string;
    ipAddress?: string;
    userAgent?: string;
}
/**
 * Extract guest session from request headers
 */
export declare function extractGuestSession(req: any): {
    sessionId: string;
} | null;
/**
 * Create guest user from session
 */
export declare function createGuestUserFromSession(sessionId: string): GuestUser;
/**
 * Check if user is a guest user
 */
export declare function isGuestUser(user: any): user is GuestUser;
/**
 * Validate guest session format
 */
export declare function isValidGuestSession(sessionId: string): boolean;
//# sourceMappingURL=guest.d.ts.map