# GraphicEditor Template API

Real-time collaborative design template backend built with NestJS, PostgreSQL, and Socket.IO.

## Features

- **Template Management**: CRUD operations for design templates with JSONB storage
- **Real-time Collaboration**: WebSocket-based multi-user editing with presence tracking
- **Partial Updates**: Operation-based incremental updates with optimistic locking
- **Template Relationships**: Support for forks, variants, and inheritance
- **Component Library**: Reusable design components (coming soon)
- **PostgreSQL JSONB**: Hybrid relational + document database approach

## Tech Stack

- **Runtime**: Bun
- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL 14+ with JSONB
- **ORM**: TypeORM
- **Real-time**: Socket.IO
- **Cache**: Redis (optional)
- **API Documentation**: Swagger/OpenAPI 3.0

## Prerequisites

- [Bun](https://bun.sh/) (>= 1.0)
- [Docker](https://www.docker.com/) & Docker Compose (for local development)

## Quick Start

### 1. Install Dependencies

```bash
cd api
bun install
```

### 2. Start Database Services

```bash
docker-compose up -d
```

This starts PostgreSQL and Redis in Docker containers.

### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

The default values should work for local development.

### 4. Run Migrations

```bash
bun run migration:run
```

### 5. Start Development Server

```bash
bun run start:dev
```

The API will be available at:
- **API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api/docs
- **WebSocket**: ws://localhost:3000/collaboration

## Project Structure

```
api/
├── src/
│   ├── main.ts                      # Application entry point
│   ├── app.module.ts                # Root module
│   ├── config/
│   │   └── typeorm.config.ts        # TypeORM configuration
│   ├── common/
│   │   └── types/
│   │       └── design.types.ts      # Shared type definitions
│   ├── database/
│   │   └── migrations/              # Database migrations
│   └── modules/
│       ├── templates/               # Template CRUD & operations
│       │   ├── entities/
│       │   ├── dto/
│       │   ├── services/
│       │   ├── templates.controller.ts
│       │   └── templates.module.ts
│       ├── operations/              # Operation executor
│       │   ├── entities/
│       │   ├── services/
│       │   └── operations.module.ts
│       ├── collaboration/           # WebSocket gateway
│       │   ├── collaboration.gateway.ts
│       │   └── collaboration.module.ts
│       ├── components/              # Component library
│       ├── variants/                # Template variants
│       └── relationships/           # Template relationships
├── docker-compose.yml               # Local database services
├── Dockerfile                       # Container build
└── package.json
```

## API Endpoints

### Templates

- `POST /api/v1/templates` - Create a new template
- `GET /api/v1/templates` - List templates (with filters)
- `GET /api/v1/templates/:id` - Get template by ID
- `PATCH /api/v1/templates/:id` - Update template metadata
- `DELETE /api/v1/templates/:id` - Soft delete template
- `POST /api/v1/templates/:id/operations` - Apply partial updates
- `POST /api/v1/templates/:id/fork` - Fork a template
- `GET /api/v1/templates/:id/relationships` - Get related templates

Full API documentation available at `/api/docs` when the server is running.

## WebSocket Events

### Client → Server

- `join_room` - Join a template editing room
- `leave_room` - Leave a template editing room
- `apply_operations` - Broadcast operations to other users
- `cursor_move` - Share cursor position
- `element_selected` - Share element selection

### Server → Client

- `room_state` - Current users in room (on join)
- `user_joined` - New user joined room
- `user_left` - User left room
- `operations_applied` - Operations from other users
- `cursor_updated` - Cursor position from other users
- `element_selection_changed` - Element selection from other users

## Database Schema

### Templates Table

Stores design templates with metadata and JSONB content.

```sql
CREATE TABLE templates (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  author_id UUID,
  parent_id UUID REFERENCES templates(id),  -- For forks
  variant_group_id UUID,
  category VARCHAR(100),

  -- JSONB columns for flexible content
  design_data JSONB NOT NULL,  -- { canvas, pages, audioLayers }
  metadata JSONB,               -- { tags, linkedComponents, syncSettings }

  -- Optimistic locking
  version INTEGER DEFAULT 1,

  -- Metadata
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  rating FLOAT DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Indexes for fast queries
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_tags USING GIN ((metadata->'tags'));
```

## Development

### Running Tests

```bash
bun run test
```

### Linting

```bash
bun run lint
```

### Code Formatting

```bash
bun run format
```

### Generate Migration

```bash
bun run migration:generate src/database/migrations/MigrationName
```

### Revert Migration

```bash
bun run migration:revert
```

## Production Build

```bash
bun run build
bun run start:prod
```

## Docker Deployment

Build and run the entire stack:

```bash
docker-compose up --build
```

## Architecture Decisions

### Why PostgreSQL with JSONB?

- **Single database**: No sync issues between relational + document DB
- **ACID transactions**: Atomic updates across metadata + content
- **Rich JSON operations**: Query/update nested JSONB efficiently
- **Indexing**: GIN indexes on JSONB fields for fast queries
- **Cost-effective**: Single database to manage vs. MongoDB + PostgreSQL

### Why Operation-Based Updates?

- **97% payload reduction**: Send only operations, not full state (120KB/sec → 3.6KB/sec)
- **Real-time collaboration**: Broadcast small operations instead of entire documents
- **Undo/redo support**: Reverse operations for undo
- **Audit trail**: Complete operation log in `template_operations` table
- **Conflict detection**: Optimistic locking with version numbers

### Why Socket.IO?

- **Real-time**: Low latency for collaborative editing
- **Automatic reconnection**: Built-in reconnection logic
- **Room support**: Isolate users by template
- **Fallback support**: Falls back to polling if WebSocket unavailable

## Performance Considerations

### Operation Batching

The frontend should batch operations to reduce network traffic:

- **During drag**: 1 operation per frame instead of 60 ops/sec
- **During multi-select**: Batch element updates
- **Transaction mode**: Batch multiple related operations

### Optimistic Locking

Templates use version-based optimistic locking:

```typescript
// Client sends baseVersion with operations
POST /api/v1/templates/:id/operations
{
  "baseVersion": 5,
  "operations": [...]
}

// Server responds with conflict if version mismatch
409 Conflict
{
  "error": "VERSION_CONFLICT",
  "currentVersion": 7,
  "requestedVersion": 5
}
```

### Caching Strategy

- **Redis**: Cache frequently accessed templates
- **IndexedDB (frontend)**: Local cache for offline support
- **PostgreSQL**: Connection pooling for performance

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps

# View PostgreSQL logs
docker-compose logs postgres

# Restart services
docker-compose restart
```

### Migration Errors

```bash
# Drop database and restart (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d
bun run migration:run
```

### WebSocket Connection Issues

- Check CORS settings in `.env`
- Verify `CORS_ORIGIN` matches frontend URL
- Check firewall/proxy settings

## Future Roadmap

- [ ] Component library implementation
- [ ] Variant comparison API
- [ ] Template sync from parent (for forks)
- [ ] User authentication & authorization
- [ ] Rate limiting
- [ ] Redis Pub/Sub for horizontal scaling
- [ ] Event sourcing with CRDT/OT
- [ ] Template versioning & rollback
- [ ] Asset storage (S3/CDN integration)

## License

MIT
