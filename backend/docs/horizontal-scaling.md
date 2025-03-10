# Horizontal Scaling Strategy for Queen of Spades Backend

## Overview

This document outlines the strategy for scaling the Queen of Spades backend horizontally across multiple pods or servers. When scaling a Socket.IO application horizontally, we need to address several challenges:

1. **Session Persistence**: Ensuring users remain connected to the same game even if they connect to different server instances
2. **State Management**: Maintaining consistent game state across all server instances
3. **Real-time Communication**: Enabling real-time communication between users connected to different server instances

## Socket.IO Adapter Options

Socket.IO provides several adapter options for horizontal scaling:

### 1. Redis Adapter

The [Socket.IO Redis Adapter](https://socket.io/docs/v4/redis-adapter/) is the most common solution for horizontal scaling.

#### Implementation Plan:

1. **Install Dependencies**:
   ```bash
   npm install @socket.io/redis-adapter redis
   ```

2. **Configure Redis Adapter**:
   ```typescript
   import { createAdapter } from '@socket.io/redis-adapter';
   import { createClient } from 'redis';

   const pubClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
   const subClient = pubClient.duplicate();

   Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
     io.adapter(createAdapter(pubClient, subClient));
     console.log('Socket.IO Redis adapter initialized');
   });
   ```

3. **Store Game State in Redis**:
   ```typescript
   // Example of storing game state in Redis
   async function saveGameState(gameCode: string, gameState: GameState): Promise<void> {
     await pubClient.set(`game:${gameCode}`, JSON.stringify(gameState));
   }

   async function getGameState(gameCode: string): Promise<GameState | null> {
     const gameStateStr = await pubClient.get(`game:${gameCode}`);
     if (!gameStateStr) return null;
     return JSON.parse(gameStateStr) as GameState;
   }
   ```

### 2. MongoDB Adapter

For applications already using MongoDB, the [Socket.IO MongoDB Adapter](https://github.com/socketio/socket.io-mongo-adapter) can be a good alternative.

#### Implementation Plan:

1. **Install Dependencies**:
   ```bash
   npm install @socket.io/mongo-adapter mongodb
   ```

2. **Configure MongoDB Adapter**:
   ```typescript
   import { createAdapter } from '@socket.io/mongo-adapter';
   import { MongoClient } from 'mongodb';

   const mongoClient = new MongoClient(process.env.MONGO_URI || 'mongodb://localhost:27017/queen-of-spades');
   
   mongoClient.connect().then(() => {
     const mongoCollection = mongoClient.db().collection('socket.io-adapter-events');
     io.adapter(createAdapter(mongoCollection));
     console.log('Socket.IO MongoDB adapter initialized');
   });
   ```

### 3. Cluster Adapter

For deployments on a single machine with multiple CPU cores, the [Socket.IO Cluster Adapter](https://socket.io/docs/v4/cluster-adapter/) can be used.

#### Implementation Plan:

1. **Install Dependencies**:
   ```bash
   npm install @socket.io/cluster-adapter
   ```

2. **Configure Cluster Adapter**:
   ```typescript
   import { createAdapter } from '@socket.io/cluster-adapter';
   
   io.adapter(createAdapter());
   ```

## Recommended Approach: Redis Adapter with State Management

For the Queen of Spades game, we recommend using the Redis Adapter combined with Redis for state management. This approach provides:

1. **Scalability**: Redis can handle high throughput and is designed for real-time applications
2. **Persistence**: Game state can be persisted in Redis with optional disk persistence
3. **Performance**: Redis is an in-memory data store, providing fast access to game state
4. **Pub/Sub**: Redis pub/sub capabilities align well with Socket.IO's event-based architecture

## Implementation Architecture

![Architecture Diagram](https://mermaid.ink/img/pako:eNp1kU1PwzAMhv9KlBOgSf3YpE1w2A6bBBJiB8QOXNzEa6M1SZUPbVSI_07abmxs4hT7ffzYsXdQWkdQQWMbp9-tRLWRVjnTWS-VQV96VIZKNKjJGtRkjNxgZ6lEjkZbJT3VaA05Z5Rlk-mMZ9NpNp9lPJ9lPOPZfJJNJnzKJ9MJn_HZhE_5_Oo6Gy_4VfZ4_3R7c_dwf3t3c_94f_MwHjzDHjvnpSGDVqKTTYCPQXpN1kkTYIte9gE-O9mhDvDFWdMHWDvZ9gE2TtZ9gDsnmz7Axsn9wCEoaLxvUcGLbTqhYKVBBe_WNKhgb7pGKnizrVCwc7pGBVvXCgUb1wkFa2c6oWDlrFSwdJ1UsHC2Uwrm1kkFM9spBVfWKwVTa7VSMKFWKxj_wv8BhpzWdw?type=png)

### Components:

1. **Load Balancer**: Distributes incoming connections across multiple backend instances
2. **Backend Pods**: Multiple instances of the Queen of Spades backend
3. **Redis**: Serves as both the Socket.IO adapter and state store
4. **Database** (Optional): For persistent storage of user accounts, game history, etc.

## Code Refactoring Required

To implement this architecture, we need to refactor our current implementation:

1. **GameManager Class**: Modify to use Redis for state storage instead of in-memory Map
   ```typescript
   export class GameManager {
     // Replace in-memory maps with Redis operations
     private redisClient: RedisClient;
     
     constructor(redisClient: RedisClient) {
       this.redisClient = redisClient;
     }
     
     async createGame(playerName: string, socketId: string, targetScore: number = 75): Promise<{ 
       gameCode: string; 
       player: Player;
     }> {
       const gameCode = nanoid(6);
       const game = new Game(gameCode, targetScore);
       const player = game.addPlayer(playerName, socketId);
       
       // Store game in Redis
       await this.redisClient.set(`game:${gameCode}`, JSON.stringify(game.getState()));
       await this.redisClient.set(`player:${player.id}:game`, gameCode);
       
       return { gameCode, player };
     }
     
     // Other methods similarly refactored...
   }
   ```

2. **Socket.IO Event Handlers**: Update to use the Redis-backed GameManager
   ```typescript
   // Initialize Redis clients
   const pubClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
   const subClient = pubClient.duplicate();
   
   // Initialize GameManager with Redis client
   const gameManager = new GameManager(pubClient);
   
   // Configure Socket.IO with Redis adapter
   io.adapter(createAdapter(pubClient, subClient));
   ```

## Deployment Considerations

1. **Kubernetes Deployment**:
   - Deploy multiple backend pods with auto-scaling
   - Use Redis StatefulSet or managed Redis service
   - Configure health checks and readiness probes

2. **Docker Compose** (for development/testing):
   ```yaml
   version: '3'
   services:
     backend:
       build: .
       ports:
         - "3000:3000"
       environment:
         - REDIS_URL=redis://redis:6379
       depends_on:
         - redis
       deploy:
         replicas: 3
     
     redis:
       image: redis:alpine
       ports:
         - "6379:6379"
       volumes:
         - redis-data:/data
   
   volumes:
     redis-data:
   ```

3. **Environment Variables**:
   - `REDIS_URL`: Connection string for Redis
   - `NODE_ENV`: Environment (development, production)
   - `PORT`: Server port
   - `LOG_LEVEL`: Logging verbosity

## Monitoring and Scaling

1. **Metrics to Monitor**:
   - Active connections per instance
   - Redis operation latency
   - Memory usage
   - CPU usage

2. **Auto-scaling Triggers**:
   - Number of active connections
   - CPU utilization
   - Memory utilization

3. **Logging Strategy**:
   - Centralized logging with unique instance identifiers
   - Correlation IDs for tracking requests across instances
   - Structured logging format (JSON)

## Fallback and Recovery

1. **Connection Recovery**:
   - Implement Socket.IO reconnection logic on the client
   - Store session information in Redis to handle reconnections to different instances

2. **State Recovery**:
   - Implement periodic state snapshots in Redis
   - Use Redis persistence (RDB or AOF) for disaster recovery

## Conclusion

By implementing the Redis Adapter for Socket.IO and storing game state in Redis, the Queen of Spades backend can scale horizontally across multiple instances while maintaining consistent state and real-time communication capabilities.

This architecture provides a robust foundation for handling increased load and ensures high availability of the game service.

## Next Steps

1. Implement Redis Adapter integration
2. Refactor GameManager to use Redis for state storage
3. Update Socket.IO event handlers to work with the new GameManager
4. Set up Docker Compose for local testing of the scaled architecture
5. Implement monitoring and logging
6. Test scaling and failover scenarios 