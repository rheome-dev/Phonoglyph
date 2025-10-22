export declare class QueueWorker {
    private static isRunning;
    private static readonly POLL_INTERVAL;
    /**
     * Start the queue worker
     */
    static start(): Promise<void>;
    /**
     * Stop the queue worker
     */
    static stop(): void;
}
//# sourceMappingURL=queue-worker.d.ts.map