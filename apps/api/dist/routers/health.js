"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = void 0;
const trpc_1 = require("../trpc");
exports.healthRouter = (0, trpc_1.router)({
    check: trpc_1.publicProcedure
        .query(() => {
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            message: 'tRPC server is running! 🚀'
        };
    }),
});
//# sourceMappingURL=health.js.map