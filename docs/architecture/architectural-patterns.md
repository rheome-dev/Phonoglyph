# Architectural Patterns

* **Jamstack Architecture:** Static site generation with serverless APIs for optimal performance and scalability.
* **Component-Based UI:** Reusable React components with TypeScript for maintainability and type safety.
* **API Gateway Pattern:** A single entry point for all API calls to handle centralized auth, rate limiting, and routing.
* **Message Queue Pattern:** Decouples the API from the video processing service, enabling resilience and independent scaling.
* **Pub/Sub Pattern:** Used via Redis to push real-time render progress updates to the client without polling.
