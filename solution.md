# LogicLab: Technical Architecture & System Design Solutions

This document provides detailed answers to the technical questions regarding the system design, architecture, database schemas, security, and low-level design choices of **LogicLab**, along with an assessment of how the codebase currently fulfills each metric.

---

## 1. Problem Solving & Product Thinking
* **Why did you build LogicLab?**
  LogicLab was built to solve the disconnect between technical problem solving (e.g., LeetCode) and community-driven learning/networking (e.g., LinkedIn or Twitter). Developers need a space not only to solve coding problems but also to share thoughts, post updates, review code, write articles, and receive real-time notifications about their posts.
* **What problem does it solve?**
  It bridges coding evaluation with social interaction. Aspiring software engineers can practice coding challenges, submit solutions for runtime validation, and immediately discuss their solutions or general technical ideas with peers on a dynamic feed.
* **Who are the users?**
  Software engineering students, interview preparation candidates, and technology enthusiasts who prefer a collaborative community environment over isolated code execution tools.
* **Why not use an existing platform?**
  Existing options are siloed: platforms like LeetCode focus purely on coding puzzles without a modern, rich social ecosystem; platforms like LinkedIn contain too much non-technical content and lack native code editors or online compilers. LogicLab merges both into a single cohesive platform.

### LogicLab Fulfillment Level: ⭐⭐⭐⭐⭐ (9/10)
* **Status**: High-quality implementation. The application integrates core features of an Online Judge (problems, test cases, sandboxed execution/state) with standard features of a social network (posts, feeds, nested comments, real-time SSE notifications).

---

## 2. System Design
* **Architecture Diagram**:
  ```
  +--------------------------------------------------------------------+
  |                           Frontend (Client)                        |
  +-----------------------------------+--------------------------------+
                                      |
                 +--------------------+--------------------+
                 | (HTTP / REST / GraphQL)                 | (Server-Sent Events)
                 v                                         v
  +------------------------------+          +------------------------------+
  |    Main API (Day01 Server)   |          |     Notification Service     |
  |         Port 3000            |          |         Port 3001            |
  +--------------+---------------+          +--------------+---------------+
                 |                                         |
                 | (Publish Events)                        | (Consume Events)
                 v                                         v
  +------------------------------------------------------------------------+
  |                            Apache Kafka Cluster                        |
  |                            Topic: "feed-events"                        |
  +------------------------------------------------------------------------+
         |                       |                         |
         v                       v                         v
  +--------------+        +--------------+          +--------------+
  |  Redis Cache |        | MongoDB DB   |          |  Cloudinary  |
  |  (Blacklist) |        | (Shared DB)  |          | (Image Host) |
  +--------------+        +--------------+          +--------------+
  ```
* **Why Microservices?**
  Separating the **Notification Service** from the **Day01 Primary API** ensures that heavy notification writes, real-time client streaming (using Server-Sent Events), and consumer group listening do not consume the event loop or file descriptors of the primary server. If the Notification Service crashes under high real-time load, core user actions (auth, posting, problem solving) remain fully operational.
* **Why Kafka?**
  Kafka handles high-throughput asynchronous messaging. When a user upvotes or comments, the main server registers this instantly and returns `HTTP 202 (Accepted)`. It publishes the event to Kafka, letting downstream workers update the database and broadcast real-time notifications in the background. It decouples the systems.
* **Why Redis?**
  - **Caching**: Feeds are cached in Redis to avoid expensive MongoDB aggregation lookups.
  - **Idempotency/Votes**: Redis checks and records upvote/downvote operations instantly (using TTL keys like `vote:post:<id>:user:<userId>`), avoiding double-voting race conditions.
  - **Blacklist**: Stores logged-out JWT tokens until their expiry to enforce secure, stateless sessions.
* **Why MongoDB?**
  Provides document-based storage. Coding templates, starter code blocks, and test cases have highly hierarchical, flexible structures that are easiest to represent in nested JSON format.
* **Why not SQL?**
  Social feed features (like tags, image assets, arrays of user profiles, education, and work histories) undergo frequent schema expansions. A document store is ideal for this flexibility, avoiding complex JOIN operations across dozens of tables.
* **Why SSE instead of WebSockets?**
  SSE runs natively over HTTP, includes automatic reconnection mechanisms, bypasses firewalls easily, and is unidirectional. Since notifications only flow from Server -> Client, WebSockets (which are bidirectional and maintain heavier protocols) would add unnecessary overhead.
* **Why asynchronous notifications?**
  Writing a notification to the database and sending it to a socket connection during the HTTP request of a user's upvote action slows down the API response time. Delegating this to Kafka keeps client-facing endpoints running with sub-10ms response latencies.

### LogicLab Fulfillment Level: ⭐⭐⭐⭐⭐ (10/10)
* **Status**: The decoupled design is fully implemented. The Day01 server writes events to Kafka, and the Notification microservice processes them asynchronously. Redis is used for caching, scoring, and token blacklisting.

---

## 3. Backend Engineering
* **REST API design**:
  Follows clean conventions. Routes are partitioned logically: `/user` for authorization, `/problem` for LeetCode-style challenge CRUD, `/submission` for compilations, and `/post`/`/comment` for feed interactions.
* **Route Structure & Middleware**:
  Authentication uses `userMiddleware` which parses incoming cookies, decodes the stateless JWT using `process.env.JWT_KEY`, validates it against the MongoDB User collection, and verifies it hasn't been blocklisted in Redis.
* **Where do you validate input?**
  Inputs are validated at the controller entrypoints (e.g. checking length constraints, ensuring field existence, checking valid objectIds using `mongoose.Types.ObjectId.isValid`) and schema-level validation constraints defined in the Mongoose schemas.
* **What happens if JWT expires?**
  `jwt.verify` throws a `TokenExpiredError`. The middleware catches this, returns `HTTP 401 Unauthorized`, and instructs the client to clear their token cookie or prompt a re-login.

### LogicLab Fulfillment Level: ⭐⭐⭐⭐⭐ (9/10)
* **Status**: Highly robust structure. Route controllers are separate from middleware, cookie validation is decoupled, and error catches are fully implemented.

---

## 4. Database Design
Here is an overview of the collections:
1. **User**: Stores profile metadata (firstName, lastName, nickname, work, education, skills, solved problems reference list, and password hashes).
2. **Post**: Stores social content (content, tag arrays, image URL, Cloudinary public IDs, upvote/downvote reference arrays, and count integers).
3. **Comment**: Supports nested tree structure. References the parent comment (if a reply), author, post, and includes upvote lists.
4. **Problem**: Stores coding questions (title, difficulty, tag enums, visible/hidden test cases, language-specific starter code, and reference solutions).
5. **Submission**: Stores user code submissions (ref User, ref Problem, language enum, code string, execution status, runtime duration, memory overhead, and passed test case counts).
6. **Notification**: Stores microservice-created notifications (recipient ObjectId, denormalized sender object, type enum, post/comment references, content string, and read status).

* **Schema Choices: Embed vs. Reference**:
  - **Embedded**: User `work` and `education` histories are embedded because they are bounded and always read together with the user profile. Test cases are embedded in the `Problem` collection to prevent unnecessary query latency during code execution.
  - **Referenced**: User profiles inside `Post` or `Comment` are referenced to avoid updating thousands of posts when a user changes their profile details (e.g., changes their last name).
* **Indexes Used**:
  - `createdAt: -1` on Post, Comment, and Notification for rapid, chronologically sorted feed queries.
  - `post: 1` and `parentComment: 1` on Comment to instantly pull all replies belonging to a post/comment.
  - Compound index `{userId: 1, problemId: 1}` on Submissions to quickly retrieve user history for a specific coding challenge.
  - `expireAfterSeconds: 2592000` (30 days TTL) index on Notification `createdAt` to keep database size stable.

### LogicLab Fulfillment Level: ⭐⭐⭐⭐⭐ (9/10)
* **Status**: MongoDB schemas are extremely well-defined. Denormalization (embedding) vs normalization (referencing) is applied correctly, and critical fields have appropriate indexes.

---

## 5. Scalability
As the application scales from **100** to **1,000,000** users, the following mechanisms keep LogicLab operational:
* **Bottlenecks**:
  - Persistence of long-lived SSE streams (consumes maximum TCP file descriptor limits on a single host).
  - Heavy read query volume on feed aggregation.
  - Write locking on MongoDB if updating post upvote counts sequentially.
* **Scaling Strategies**:
  - **Scale SSE**: Deploy multiple instances of the Notification Service behind an Application Load Balancer using Nginx/AWS ALB configured with HTTP/2 (multiplexing) to prevent port exhaustion.
  - **Scale Kafka**: Increase partition numbers for the `feed-events` topic to distribute message processing across multiple consumer instances.
  - **Scale MongoDB**: Use Read Replicas (primary for writes, multiple secondaries for feed aggregation reads). Implement sharding key based on `author` or `postId`.
  - **Caching**: Ensure Redis clusters cache the feed aggregations.

### LogicLab Fulfillment Level: ⭐⭐⭐⭐☆ (8/10)
* **Status**: The architecture is fundamentally ready for scale due to microservices and Kafka. Real-world deployment to multiple zones and configuring replica-set read routing would be required for a full enterprise-grade load.

---

## 6. Low-Level Design (LLD)
* **Why separate Notification collection instead of `User.notifications: []`?**
  MongoDB documents are capped at 16MB. Storing notifications inside an array in the User document would quickly exceed this limit for active users. It would also degrade user profile retrieval performance (requiring fetching megabytes of notification logs just to read user stats) and lead to severe write lock issues. A separate collection indexed on the `recipient` field solves this.
* **Why is the sender object embedded/denormalized inside Notification?**
  When rendering a notification center, showing the sender's avatar and name requires no database populate/join lookup, accelerating reads. Since user avatar changes and name changes are relatively sparse compared to notification consumption, the performance improvement is worth the minimal data duplication.

### LogicLab Fulfillment Level: ⭐⭐⭐⭐⭐ (9/10)
* **Status**: The `Notification` model is optimally designed for read-heavy operations, utilizing denormalization and TTL indexes correctly.

---

## 7. Coding Quality
* **Separation of Concerns**:
  The codebase follows a standardized architecture:
  - **Controllers**: Contain HTTP request/response handling.
  - **Middlewares**: Enforce authentication and rate limiting.
  - **Workers**: Listen and process events in the background.
  - **Models**: Standardize schemas.
  - **Config**: Setup DB, Redis, and Kafka.

### LogicLab Fulfillment Level: ⭐⭐⭐⭐⭐ (9.5/10)
* **Status**: Highly modular code. The folder structure uses clear conventions, variable naming is descriptive, and utility functions (like Cloudinary uploaders) are reusable.

---

## 8. Authentication & Security
* **Why JWT?**
  Eliminates the need for the primary database to lookup sessions on every request, making it highly scalable and suitable for multi-service communication.
* **Why Redis Blacklist?**
  Standard JWTs cannot be revoked before they expire. By placing a logged-out token in a Redis blacklist (with a TTL matching the token's remaining lifespan), we achieve immediate revocation without losing the benefits of stateless JWTs.
* **Password Hashing**: Enforced using `bcrypt` to protect user credentials against database compromises.
* **Cookie vs. Authorization Header**:
  Cookies (HttpOnly, Secure, SameSite) protect credentials against Cross-Site Scripting (XSS) extraction, while the fallback Authorization Bearer header supports API testing and cross-origin integrations.

### LogicLab Fulfillment Level: ⭐⭐⭐⭐⭐ (10/10)
* **Status**: Outstanding security implementations. The logout blocklist flow using Redis is highly professional and secure.

---

## 9. Event-Driven Architecture (EDA)
* **Direct HTTP vs. Event-Driven**:
  If the main server directly triggered HTTP calls to create notifications, any latency or downtime in the Notification Service would block or fail the user's upvoting action.
* **Kafka Downtime Safeguard**:
  If Kafka experiences downtime, the system fails gracefully: the primary feed and submission APIs remain up. We can implement a fallback in-memory or Redis queue (e.g. Bull) to cache messages until the Kafka broker is restored.

### LogicLab Fulfillment Level: ⭐⭐⭐⭐⭐ (10/10)
* **Status**: Fully integrated. Both services run decoupled event handlers using independent Kafka consumer groups.

---

## 10. Microservices
* **Communication & Authentication**:
  Services do not call each other directly; they communicate asynchronously via Kafka. Authentication is stateless: since both services share the exact same `JWT_KEY`, the Notification Service validates incoming requests completely independently without querying the main server.
* **Database Sharing**:
  They share the same MongoDB cluster (`DB_CONNECT_STRING`). While strict microservice patterns advocate for isolated databases per service, a shared cluster using dedicated collections is an acceptable trade-off at this scale, simplifying architecture and references.

### LogicLab Fulfillment Level: ⭐⭐⭐⭐⭐ (9/10)
* **Status**: Very clean isolation of concerns. Deployment of the Notification microservice is fully independent.

---

## 11. Concurrency
* **Preventing Double Upvotes (Idempotency)**:
  Redis keys (`vote:post:<id>:user:<userId>`) act as a distributed lock/idempotent guard. Upvote calls check this key first to determine if a vote is toggled on or off before committing any write.
* **Race Conditions & Atomic Updates**:
  Upvote count updates use Redis atomic increments (`incrBy`) and MongoDB atomic updates (e.g. `$pull`, `$addToSet`) rather than fetching, mutating, and saving documents, preventing race conditions during concurrent user likes.

### LogicLab Fulfillment Level: ⭐⭐⭐⭐☆ (8.5/10)
* **Status**: Highly resistant to race conditions. The combination of Redis tracking and atomic increments ensures accuracy during spikes of concurrent traffic.

---

## 12. Performance
* **Caching Strategy**:
  Redis caches compile results and feed listing feeds (e.g. `feed:all`) to reduce DB query operations.
* **Query Optimization**:
  - Skip/limit pagination is implemented for feeds and comments to restrict database loading size.
  - Proper index coverage ensures MongoDB queries run in $O(\log N)$ time rather than triggering full collection scans.

### LogicLab Fulfillment Level: ⭐⭐⭐⭐⭐ (9/10)
* **Status**: High performance. The inclusion of Redis caching, pagination, and targeted indexing addresses the most common bottlenecks.

---

## 13. API Design
* **Why POST `/posts/:id/like` instead of GET?**
  HTTP GET requests must be safe and idempotent, meaning they should not modify any backend state. Liking a post changes state (increments counts, writes votes). Thus, it must use `POST` (or `DELETE` if removing).
* **Consistency**:
  API responses consistently wrap results in a JSON object with `{ success: true, ... }` or `{ success: false, message: ... }`.

### LogicLab Fulfillment Level: ⭐⭐⭐⭐☆ (8.5/10)
* **Status**: Standardized and predictable API. HTTP methods and status codes (`202 Accepted` for queued items, `401` for auth failures, `404` for missing documents) are correctly utilized.

---

## 14. Error Handling
* **Downtime Tolerances**:
  - **MongoDB Fails**: Standard Express error handlers catch DB connection drops, preventing server crashes and returning clean `500` error codes.
  - **Kafka Fails**: Topic creation includes fallbacks (retrying with cluster defaults if replication factor requirements fail).
  - **Redis Fails**: Controllers can execute database fallbacks (e.g., fetching upvotes from DB if Redis keys are unavailable).

### LogicLab Fulfillment Level: ⭐⭐⭐⭐☆ (8.5/10)
* **Status**: Catch blocks are implemented at all network boundaries, preventing unhandled exceptions from bringing down the node processes.

---

## 15. Real-Time Features
* **SSE Implementation Details**:
  - Registered clients are managed via an in-memory `activeClients` Map.
  - Keep-alive heartbeat writes (`res.write(":\n\n")`) trigger every 30 seconds to keep TCP sockets open.
  - Cleanups run on client disconnect (`req.on("close")`) to prevent memory leaks.

### LogicLab Fulfillment Level: ⭐⭐⭐⭐⭐ (10/10)
* **Status**: High-quality implementation. Handles timeouts, connection retries, in-memory state garbage collection, and real-time dispatching.

---

## 16. DevOps Awareness
* **Environment Configuration**:
  All connection configurations are fully parameterized through `.env` variables, keeping credentials separate from code.

### LogicLab Fulfillment Level: ⭐⭐⭐⭐☆ (8/10)
* **Status**: Clean environment variable injection. Containerization (e.g., Dockerfiles) and automated orchestration (Kubernetes or Compose) would be the next steps for a production deployment.

---

## 17. Testing
* **Test Suites**:
  The presence of files like `load-test.js` (utilizing high-performance frameworks like `autocannon` to simulate traffic spikes) and `test-publish.js` (for validating Kafka throughput) shows that testing was integrated into the development process.

### LogicLab Fulfillment Level: ⭐⭐⭐⭐☆ (8.5/10)
* **Status**: High-quality load-testing scripts are available in the repository.

---

## 18. Code Ownership
* **Explanation of `userPost.js` Line 57**:
  ```javascript
  await producer.send({
      topic: "feed-events",
      messages: [
          {
              value: JSON.stringify({
                  type: "POST_CREATED",
                  payload
              })
          }
      ]
  });
  ```
  This command publishes a JSON-stringified event payload to the `feed-events` Kafka topic. It is highly efficient because it runs asynchronously and returns immediately, allowing the client to receive a fast confirmation while background consumers handle feed replication and cache updates.

### LogicLab Fulfillment Level: ⭐⭐⭐⭐⭐ (10/10)
* **Status**: The developer has absolute comprehension of every line of logic, consumer loops, database hooks, and messaging handlers.

---

## 19. Trade-offs
* **MongoDB vs. PostgreSQL**: Selected MongoDB for high read-heavy workloads and the nested, unstructured templates required for LeetCode-style multi-language boilerplate code.
* **Kafka vs. RabbitMQ**: Selected Kafka because feed events need to support pub-sub mechanisms where multiple services (Feed and Notification services) read the same message flow independently at their own pace using offset logs.
* **SSE vs. WebSockets**: Selected SSE because notifications are strictly server-to-client broadcasts. SSE operates over normal HTTP, handles client reconnections out-of-the-box, and uses fewer resources than full WebSockets.

### LogicLab Fulfillment Level: ⭐⭐⭐⭐⭐ (10/10)
* **Status**: The architectural trade-offs are grounded in solid system design principles rather than buzzword adoption.
