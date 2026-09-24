# System Overview & Execution Lifecycles

## 1. Startup Sequence & Dependency Graph
NexusOps is initialized via `server.js` which orchestrates a strict bootstrap sequence:
1. **Environment Load:** `config/env.js` parses and validates environment variables strictly using `envalid`. If invalid, the process fatally exits immediately.
2. **Infrastructure Connections:** 
   - Establishes connection to **MongoDB Atlas** (`config/db.js`).
   - Establishes connection to **Redis Cluster** (`config/redis.js`).
3. **Core Event Registration:** Loads `platform/events/EventBus.js` and mounts required listeners.
4. **Bootstrap Seeding:** `OrganizationBootstrapRegistry.js` awaits the `TENANT_PROVISIONED` event.
5. **Express App Binding:** Loads `app.js`, mounting global middleware (CORS, body-parser) followed by modular API routes (`/api/v1/*`).
6. **Error Handling:** Global `errorHandler.js` is mounted as the final middleware.
7. **Server Listen:** `server.listen()` is invoked and the port is logged.

## 2. Request Lifecycle & Middleware Order
Every HTTP request traverses a rigid gauntlet of middleware:
1. **`express.json()`**: Parses incoming JSON payload.
2. **`rateLimiter`**: Sliding window token bucket validation via Redis.
3. **`auth`**: Extracts JWT from `Authorization` header, verifies cryptographic signature, checks token revocation in Redis, and populates `req.user`.
4. **`tenant`**: Takes `req.user.organizationId` and binds it to `req.tenantContext` using AsyncLocalStorage.
5. **`featureFlag('moduleName')`**: Checks the active tenant's feature flag cache.
6. **`hasPermission('namespace.action')`**: Evaluates effective permissions via `RbacService`. Throws 403 if insufficient.
7. **`validate(schema)`**: Validates request parameters and payload against a defined Zod schema. Throws 400 on failure.
8. **Controller `try/catch`**: The route's Controller invokes the target Service.
9. **Service Execution**: The Service executes business logic and interacts with Repositories.
10. **Controller JSON Response**: Successful data payload returned to client.
11. **`errorHandler`**: If any step throws an error, the catch block passes it to `next(err)` to be formatted as a standard JSON error response.

## 3. Transaction Lifecycle
Multi-document database updates must use ACID transactions.
1. The Service calls `runInTransaction(async (session) => { ... })` located on the `BaseRepository`.
2. A new MongoDB ClientSession is created.
3. Operations inside the callback are executed. If any throw, `session.abortTransaction()` is called, and the error bubbles up.
4. Upon success, `session.commitTransaction()` executes atomically.
5. Emitting domain events (via `EventBus`) only happens *after* a successful commit.

## 4. Cache Lifecycle
1. **Reads**: The `CacheService` acts as a write-through layer. Data fetched from Redis. If missing, it queries MongoDB, sets it in Redis (with TTL), and returns it.
2. **Invalidations**: Any state mutation (e.g., `updateRole`) must forcefully delete the related cache key (e.g., `rbac:<orgId>:<userId>`).

## 5. Audit Lifecycle
The `AuditLog` collection is an immutable compliance ledger.
- An Audit log is automatically created within the same ClientSession transaction as the state mutation.
- The `AuditLog` Mongoose schema employs `pre('save')`, `pre('updateOne')`, and `pre('deleteOne')` hooks that unconditionally throw a fatal error to prevent any modification after creation.

## 6. Event Lifecycle (EventBus)
NexusOps uses a native Node.js `EventEmitter` for asynchronous decoupling.
1. Service successfully commits a transaction.
2. Service calls `EventBus.emit('namespace.action', payload)`.
3. The event listener (registered at startup) triggers asynchronously.
4. **Resiliency**: All event listeners are wrapped in top-level `try/catch` blocks to ensure background failures do not crash the primary Node process or return a 500 to the original HTTP request.
