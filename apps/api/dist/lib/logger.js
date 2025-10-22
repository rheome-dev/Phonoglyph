"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
// Backend logging utility to control console spam
const DEBUG_ENABLED = process.env.NODE_ENV === 'development' &&
    process.env.DEBUG_LOGGING === 'true';
exports.logger = {
    log: (...args) => {
        if (DEBUG_ENABLED) {
            console.log(...args);
        }
    },
    warn: (...args) => {
        if (DEBUG_ENABLED) {
            console.warn(...args);
        }
    },
    error: (...args) => {
        // Always log errors regardless of debug setting
        console.error(...args);
    },
    info: (...args) => {
        if (DEBUG_ENABLED) {
            console.info(...args);
        }
    },
    debug: (...args) => {
        if (DEBUG_ENABLED) {
            console.log('🔍', ...args);
        }
    },
    auth: (...args) => {
        if (DEBUG_ENABLED) {
            console.log('🔐', ...args);
        }
    }
};
//# sourceMappingURL=logger.js.map