"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const queue_worker_1 = require("../services/queue-worker");
console.log('Starting queue worker...');
queue_worker_1.QueueWorker.start().catch(error => {
    console.error('Queue worker failed:', error);
    process.exit(1);
});
//# sourceMappingURL=start-queue-worker.js.map