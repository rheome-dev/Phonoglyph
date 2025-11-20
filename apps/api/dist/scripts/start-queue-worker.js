"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const queue_worker_1 = require("../services/queue-worker");
const logger_1 = require("../lib/logger");
logger_1.logger.log('Starting queue worker...');
queue_worker_1.QueueWorker.start().catch(error => {
    logger_1.logger.error('Queue worker failed:', error);
    process.exit(1);
});
//# sourceMappingURL=start-queue-worker.js.map