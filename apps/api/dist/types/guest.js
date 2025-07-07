"use strict";
/**
 * Guest User Types for API
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidGuestSession = exports.isGuestUser = exports.createGuestUserFromSession = exports.extractGuestSession = void 0;
/**
 * Extract guest session from request headers
 */
function extractGuestSession(req) {
    // Check for guest session in headers
    const guestSessionHeader = req.headers['x-guest-session'];
    if (guestSessionHeader && typeof guestSessionHeader === 'string') {
        return { sessionId: guestSessionHeader };
    }
    // Check for guest session in cookies
    const cookies = req.headers.cookie;
    if (cookies) {
        const guestSessionMatch = cookies.match(/guest_session_id=([^;]+)/);
        if (guestSessionMatch) {
            return { sessionId: guestSessionMatch[1] };
        }
    }
    return null;
}
exports.extractGuestSession = extractGuestSession;
/**
 * Create guest user from session
 */
function createGuestUserFromSession(sessionId) {
    return {
        id: `guest_${sessionId}`,
        isGuest: true,
        sessionId,
        createdAt: new Date().toISOString(),
        tempData: {
            projects: [],
            preferences: {}
        }
    };
}
exports.createGuestUserFromSession = createGuestUserFromSession;
/**
 * Check if user is a guest user
 */
function isGuestUser(user) {
    return user && user.isGuest === true;
}
exports.isGuestUser = isGuestUser;
/**
 * Validate guest session format
 */
function isValidGuestSession(sessionId) {
    // Basic validation - guest sessions should be in format: timestamp_randomstring
    const parts = sessionId.split('_');
    if (parts.length < 2)
        return false;
    // Check if first part is a valid timestamp
    const timestampStr = parts[0];
    if (!timestampStr)
        return false;
    const timestamp = parseInt(timestampStr);
    if (isNaN(timestamp) || timestamp <= 0)
        return false;
    // Check if session is not too old (7 days)
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    const sessionAge = Date.now() - timestamp;
    return sessionAge <= maxAge;
}
exports.isValidGuestSession = isValidGuestSession;
//# sourceMappingURL=guest.js.map