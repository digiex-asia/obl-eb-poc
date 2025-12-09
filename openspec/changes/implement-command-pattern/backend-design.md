# Backend Design Document: Operations API

## Overview

This document details the backend architecture to support the Command Pattern in the GraphicEditor frontend. The backend provides operation-based partial updates, version management, conflict resolution, and operation history tracking.

## Architecture Principles

1. **Hybrid Approach**: Current state in templates table + bounded operation log for history
2. **PostgreSQL + JSONB**: Relational structure with flexible JSON storage
3. **Idempotent Operations**: Safe to replay operations without side effects
4. **Atomic Batches**: All operations in a request succeed or fail together
5. **Conflict Detection**: Compare operation targets to identify concurrent edits
6. **Incremental Migration**: Feature-flagged rollout with backward compatibility

---

## Database Schema

### Templates Table (Enhanced)

```sql
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  tags JSONB DEFAULT '[]',
  is_public BOOLEAN DEFAULT false,

  -- Design content (JSONB for flexibility)
  design_data JSONB NOT NULL,
  -- Structure: { "canvas": {...}, "pages": [...], "audioLayers": [...] }

  -- Versioning
  version INTEGER NOT NULL DEFAULT 1,
  version_hash VARCHAR(64),  -- SHA256 for integrity checks

  -- Ownership
  author_id UUID REFERENCES users(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,  -- Soft delete

  -- Indexes
  INDEX idx_templates_author (author_id),
  INDEX idx_templates_version (version)
);
```

### Template Operations Table (New)

```sql
CREATE TABLE template_operations (
  id BIGSERIAL PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  operation_id VARCHAR(64) UNIQUE NOT NULL,  -- From frontend command
  batch_id VARCHAR(64),  -- Group concurrent operations

  -- Operation details
  operation_type VARCHAR(50) NOT NULL,
  operation_target JSONB NOT NULL,
  operation_payload JSONB NOT NULL,

  -- Versioning
  base_version INTEGER NOT NULL,
  resulting_version INTEGER NOT NULL,

  -- Metadata
  user_id UUID REFERENCES users(id),
  client_id VARCHAR(64),
  session_sequence INTEGER,
  client_timestamp BIGINT,
  server_timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes
  INDEX idx_ops_template_version (template_id, resulting_version DESC),
  INDEX idx_ops_operation_id (operation_id),
  INDEX idx_ops_target_gin USING GIN (operation_target),
  INDEX idx_ops_batch (batch_id)
);
```

### Template Snapshots Table (New)

```sql
CREATE TABLE template_snapshots (
  id BIGSERIAL PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  design_data JSONB NOT NULL,
  design_hash VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(50),  -- 'auto' | 'manual' | 'revert'
  reason TEXT,

  UNIQUE (template_id, version),
  INDEX idx_snapshots_template_version (template_id, version DESC)
);
```

### Template Sessions Table (New)

```sql
CREATE TABLE template_sessions (
  id VARCHAR(64) PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  last_known_version INTEGER NOT NULL,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  connection_id VARCHAR(100),
  is_connected BOOLEAN DEFAULT true,

  INDEX idx_sessions_template (template_id),
  INDEX idx_sessions_activity (last_activity)
);
```

---

## API Endpoints

### POST /api/v1/templates/:id/operations

Apply batch operations to a template.

**Request:**
```typescript
{
  operations: [
    {
      id: "op-abc123",
      type: "add_element",
      target: { pageId: "page-1", elementId: "el-1" },
      payload: { type: "rect", x: 100, y: 100, ... },
      timestamp: 1704067200000
    }
  ],
  baseVersion: 42,
  clientId: "client-xyz",
  sessionSequence: 15,
  force?: false,
  merge?: false
}
```

**Success Response (200):**
```typescript
{
  template: { id: "...", name: "...", design_data: {...}, version: 43, ... },
  appliedOps: ["op-abc123"],
  newVersion: 43,
  serverTimestamp: 1704067205000
}
```

**Conflict Response (409):**
```typescript
{
  error: "VERSION_CONFLICT",
  currentVersion: 45,
  requestedVersion: 42,
  serverState: { canvas: {...}, pages: [...], audioLayers: [...] },
  serverOperations: [
    { id: "op-server1", type: "move_element", ... },
    { id: "op-server2", type: "resize_element", ... }
  ],
  conflictingOps: ["op-abc123"],
  suggestedResolution: "server-wins",
  resolutionOptions: {
    autoMerge: {
      available: false,
      reason: "Conflicting modifications to same element"
    },
    strategies: [
      { strategy: "client-wins", description: "Keep your changes", warning: "Server changes will be lost" },
      { strategy: "server-wins", description: "Use server version", warning: "Your changes will be lost" },
      { strategy: "manual", description: "Resolve manually" }
    ]
  }
}
```

### GET /api/v1/templates/:id/operations

Get operation history for a template.

**Query Parameters:**
```
?fromVersion=10&toVersion=20&limit=100&includePayload=true
```

**Response:**
```typescript
{
  operations: [
    {
      id: "op-1",
      type: "add_element",
      target: { pageId: "page-1", elementId: "el-1" },
      payload: { ... },  // Only if includePayload=true
      baseVersion: 9,
      resultingVersion: 10,
      userId: "user-123",
      clientId: "client-xyz",
      sessionSequence: 5,
      clientTimestamp: 1704067200000,
      serverTimestamp: "2024-01-01T00:00:00Z"
    }
  ],
  pagination: {
    total: 150,
    fromVersion: 10,
    toVersion: 20,
    hasMore: true
  }
}
```

### GET /api/v1/templates/:id/snapshot/:version

Get template state at a specific version.

**Response:**
```typescript
{
  template: { id: "...", design_data: {...}, version: 20, ... },
  version: 20,
  createdAt: "2024-01-01T00:00:00Z"
}
```

### POST /api/v1/templates/:id/revert

Revert template to a previous version.

**Request:**
```typescript
{
  targetVersion: 35,
  reason: "Undo accidental deletion"
}
```

**Response:**
```typescript
{
  template: { ... },
  revertedFrom: 42,
  revertedTo: 35,
  operationsRolledBack: 7
}
```

### POST /api/v1/templates/:id/resolve-conflict

Resolve a conflict with chosen strategy.

**Request:**
```typescript
{
  resolution: "client-wins",  // | "server-wins" | "manual"
  clientOperations: [ ... ],   // For client-wins
  manualState: { ... },        // For manual resolution
  baseVersion: 42
}
```

**Response:**
```typescript
{
  template: { ... },
  newVersion: 43,
  resolvedAt: "2024-01-01T00:00:00Z"
}
```

---

## Operation Processing Flow

```
┌─────────────────┐
│ POST /operations│
└────────┬────────┘
         │
    ┌────▼────┐
    │ Validate│
    │ Request │
    └────┬────┘
         │
    ┌────▼──────────┐
    │ Check Version │
    │  Match?       │
    └────┬──────────┘
         │
    ┌────▼────┬────────────┐
    │         │            │
   YES       NO          FORCE
    │         │            │
    │    ┌────▼─────┐      │
    │    │ Detect   │      │
    │    │ Conflict │      │
    │    └────┬─────┘      │
    │         │            │
    │    ┌────▼─────┐      │
    │    │ Return   │      │
    │    │ 409      │      │
    │    └──────────┘      │
    │                      │
    └───────┬──────────────┘
            │
    ┌───────▼────────┐
    │ Begin TX       │
    └───────┬────────┘
            │
    ┌───────▼────────┐
    │ Check          │
    │ Idempotency    │
    └───────┬────────┘
            │
    ┌───────▼────────┐
    │ Apply Ops      │
    │ to JSONB       │
    └───────┬────────┘
            │
    ┌───────▼────────┐
    │ Insert Ops     │
    │ to Log         │
    └───────┬────────┘
            │
    ┌───────▼────────┐
    │ Increment      │
    │ Version        │
    └───────┬────────┘
            │
    ┌───────▼────────┐
    │ Create         │
    │ Snapshot?      │
    └───────┬────────┘
            │
    ┌───────▼────────┐
    │ Commit TX      │
    └───────┬────────┘
            │
    ┌───────▼────────┐
    │ Return 200     │
    └────────────────┘
```

---

## Operation Applier Implementation

```typescript
class OperationApplier {
  apply(designData: DesignData, operation: Operation): DesignData {
    switch (operation.type) {
      case 'add_element':
        return this.addElement(designData, operation);
      case 'move_element':
        return this.moveElement(designData, operation);
      case 'resize_element':
        return this.resizeElement(designData, operation);
      case 'rotate_element':
        return this.rotateElement(designData, operation);
      case 'delete_element':
        return this.deleteElement(designData, operation);
      case 'update_element_props':
        return this.updateElementProps(designData, operation);
      case 'add_page':
        return this.addPage(designData, operation);
      case 'update_page':
        return this.updatePage(designData, operation);
      case 'delete_page':
        return this.deletePage(designData, operation);
      case 'reorder_pages':
        return this.reorderPages(designData, operation);
      case 'add_audio_clip':
        return this.addAudioClip(designData, operation);
      case 'update_audio_clip':
        return this.updateAudioClip(designData, operation);
      case 'delete_audio_clip':
        return this.deleteAudioClip(designData, operation);
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  private addElement(data: DesignData, op: Operation): DesignData {
    const pageIndex = data.pages.findIndex(p => p.id === op.target.pageId);
    if (pageIndex === -1) {
      throw new Error(`Page not found: ${op.target.pageId}`);
    }

    return {
      ...data,
      pages: data.pages.map((p, i) =>
        i === pageIndex
          ? { ...p, elements: [...p.elements, op.payload] }
          : p
      ),
    };
  }

  private moveElement(data: DesignData, op: Operation): DesignData {
    return this.updateElementFields(data, op.target, {
      x: op.payload.x,
      y: op.payload.y,
    });
  }

  private resizeElement(data: DesignData, op: Operation): DesignData {
    return this.updateElementFields(data, op.target, {
      x: op.payload.x,
      y: op.payload.y,
      width: op.payload.width,
      height: op.payload.height,
    });
  }

  private rotateElement(data: DesignData, op: Operation): DesignData {
    return this.updateElementFields(data, op.target, {
      rotation: op.payload.rotation,
    });
  }

  private deleteElement(data: DesignData, op: Operation): DesignData {
    const pageIndex = data.pages.findIndex(p => p.id === op.target.pageId);
    if (pageIndex === -1) {
      throw new Error(`Page not found: ${op.target.pageId}`);
    }

    return {
      ...data,
      pages: data.pages.map((p, i) =>
        i === pageIndex
          ? {
              ...p,
              elements: p.elements.filter(e => e.id !== op.target.elementId),
            }
          : p
      ),
    };
  }

  private updateElementFields(
    data: DesignData,
    target: OperationTarget,
    fields: Record<string, any>
  ): DesignData {
    const pageIndex = data.pages.findIndex(p => p.id === target.pageId);
    if (pageIndex === -1) {
      throw new Error(`Page not found: ${target.pageId}`);
    }

    const page = data.pages[pageIndex];
    const elementIndex = page.elements.findIndex(e => e.id === target.elementId);
    if (elementIndex === -1) {
      throw new Error(`Element not found: ${target.elementId}`);
    }

    return {
      ...data,
      pages: data.pages.map((p, i) =>
        i === pageIndex
          ? {
              ...p,
              elements: p.elements.map((e, j) =>
                j === elementIndex ? { ...e, ...fields } : e
              ),
            }
          : p
      ),
    };
  }

  private deleteAudioClip(data: DesignData, op: Operation): DesignData {
    const layerIndex = data.audioLayers.findIndex(
      l => l.id === op.target.audioLayerId
    );
    if (layerIndex === -1) {
      throw new Error(`Audio layer not found: ${op.target.audioLayerId}`);
    }

    return {
      ...data,
      audioLayers: data.audioLayers.map((layer, i) =>
        i === layerIndex
          ? {
              ...layer,
              clips: layer.clips.filter(c => c.id !== op.target.clipId),
            }
          : layer
      ),
    };
  }
}
```

---

## Conflict Detection Algorithm

```typescript
interface ConflictDetectionResult {
  hasConflict: boolean;
  conflictType: 'concurrent_edit' | 'deleted_target' | null;
  conflictingOperations: string[];  // Operation IDs
  serverOperations: Operation[];
}

class ConflictDetector {
  detect(
    clientOps: Operation[],
    serverOps: Operation[]
  ): ConflictDetectionResult {
    const clientTargets = this.groupByTarget(clientOps);
    const serverTargets = this.groupByTarget(serverOps);

    const conflicts: string[] = [];

    // Check for overlapping targets
    for (const [targetKey, clientOpsForTarget] of clientTargets) {
      const serverOpsForTarget = serverTargets.get(targetKey);

      if (serverOpsForTarget) {
        // Same target modified by both client and server
        if (this.hasSemanticConflict(clientOpsForTarget, serverOpsForTarget)) {
          conflicts.push(...clientOpsForTarget.map(op => op.id));
        }
      }
    }

    // Check for deleted targets
    const deletedTargets = this.findDeletedTargets(serverOps);
    for (const op of clientOps) {
      const targetKey = this.getTargetKey(op.target);
      if (deletedTargets.has(targetKey) && !op.type.startsWith('add_')) {
        conflicts.push(op.id);
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflictType: conflicts.length > 0 ? 'concurrent_edit' : null,
      conflictingOperations: conflicts,
      serverOperations: serverOps,
    };
  }

  private groupByTarget(ops: Operation[]): Map<string, Operation[]> {
    const groups = new Map<string, Operation[]>();

    for (const op of ops) {
      const key = this.getTargetKey(op.target);
      const existing = groups.get(key) || [];
      groups.set(key, [...existing, op]);
    }

    return groups;
  }

  private getTargetKey(target: OperationTarget): string {
    const parts: string[] = [];
    if (target.pageId) parts.push(`page:${target.pageId}`);
    if (target.elementId) parts.push(`element:${target.elementId}`);
    if (target.audioLayerId) parts.push(`layer:${target.audioLayerId}`);
    if (target.clipId) parts.push(`clip:${target.clipId}`);
    return parts.join('|');
  }

  private hasSemanticConflict(clientOps: Operation[], serverOps: Operation[]): boolean {
    // Add operations never conflict (different IDs)
    if (clientOps.every(op => op.type.startsWith('add_'))) {
      return false;
    }

    // Delete conflicts with any modification
    const hasDelete =
      clientOps.some(op => op.type.startsWith('delete_')) ||
      serverOps.some(op => op.type.startsWith('delete_'));
    if (hasDelete) return true;

    // Position/size changes can be auto-merged (last-write-wins)
    const transformTypes = ['move_element', 'resize_element', 'rotate_element'];
    if (
      clientOps.every(op => transformTypes.includes(op.type)) &&
      serverOps.every(op => transformTypes.includes(op.type))
    ) {
      return false;  // These can be merged
    }

    // Property updates on same properties conflict
    const clientProps = new Set(
      clientOps.flatMap(op => Object.keys(op.payload || {}))
    );
    const serverProps = new Set(
      serverOps.flatMap(op => Object.keys(op.payload || {}))
    );

    for (const prop of clientProps) {
      if (serverProps.has(prop)) return true;
    }

    return false;
  }

  private findDeletedTargets(ops: Operation[]): Set<string> {
    const deleted = new Set<string>();

    for (const op of ops) {
      if (op.type.startsWith('delete_')) {
        deleted.add(this.getTargetKey(op.target));
      }
    }

    return deleted;
  }
}
```

---

## Service Layer Architecture

```typescript
// operations.service.ts
class OperationsService {
  constructor(
    private operationsRepo: OperationsRepository,
    private templatesRepo: TemplatesRepository,
    private snapshotsRepo: SnapshotsRepository,
    private applier: OperationApplier,
    private conflictDetector: ConflictDetector
  ) {}

  async applyOperations(
    templateId: string,
    request: ApplyOperationsRequest,
    userId: string
  ): Promise<ApplyOperationsResponse | ConflictResponse> {
    // 1. Get current template
    const template = await this.templatesRepo.findById(templateId);
    if (!template) {
      throw new NotFoundError(`Template ${templateId} not found`);
    }

    // 2. Check authorization
    if (template.authorId !== userId) {
      throw new ForbiddenError('Not authorized to modify this template');
    }

    // 3. Check version match (unless force=true)
    if (!request.force && template.version !== request.baseVersion) {
      return await this.handleVersionConflict(
        template,
        request,
        userId
      );
    }

    // 4. Filter out already-applied operations (idempotency)
    const newOperations = await this.filterNewOperations(
      templateId,
      request.operations
    );

    if (newOperations.length === 0) {
      // All operations already applied
      return {
        template,
        appliedOps: request.operations.map(op => op.id),
        newVersion: template.version,
        serverTimestamp: Date.now(),
      };
    }

    // 5. Apply operations within transaction
    return await this.applyOperationsTransaction(
      template,
      newOperations,
      request,
      userId
    );
  }

  private async handleVersionConflict(
    template: Template,
    request: ApplyOperationsRequest,
    userId: string
  ): Promise<ConflictResponse> {
    // Get server operations since client's base version
    const serverOps = await this.operationsRepo.findByVersionRange(
      template.id,
      request.baseVersion + 1,
      template.version
    );

    // Detect conflicts
    const conflictResult = this.conflictDetector.detect(
      request.operations,
      serverOps
    );

    // Attempt auto-merge if requested
    let autoMergeResult: { available: boolean; result?: DesignData } = {
      available: false,
    };

    if (request.merge && !conflictResult.hasConflict) {
      // No conflicts - can auto-merge
      let mergedState = template.designData;
      for (const op of request.operations) {
        try {
          mergedState = this.applier.apply(mergedState, op);
        } catch (e) {
          // Skip operations that fail
        }
      }
      autoMergeResult = { available: true, result: mergedState };
    }

    return {
      error: 'VERSION_CONFLICT',
      message: `Version mismatch: expected ${request.baseVersion}, got ${template.version}`,
      currentVersion: template.version,
      requestedVersion: request.baseVersion,
      serverState: template.designData,
      serverOperations: serverOps,
      conflictingOps: conflictResult.conflictingOperations,
      suggestedResolution: conflictResult.hasConflict ? 'server-wins' : 'client-wins',
      resolutionOptions: {
        autoMerge: autoMergeResult,
        strategies: [
          {
            strategy: 'client-wins',
            description: 'Keep your changes',
            warning: conflictResult.hasConflict
              ? 'Server changes will be overwritten'
              : undefined,
          },
          {
            strategy: 'server-wins',
            description: 'Use server version',
            warning: 'Your changes will be lost',
          },
          {
            strategy: 'manual',
            description: 'Resolve conflicts manually',
          },
        ],
      },
    };
  }

  private async applyOperationsTransaction(
    template: Template,
    operations: Operation[],
    request: ApplyOperationsRequest,
    userId: string
  ): Promise<ApplyOperationsResponse> {
    return await this.templatesRepo.transaction(async (tx) => {
      let currentState = template.designData;
      let currentVersion = template.version;

      // Apply each operation
      for (const op of operations) {
        // Validate operation
        const validation = this.applier.validate(currentState, op);
        if (!validation.valid) {
          throw new ValidationError(
            `Operation ${op.id} validation failed: ${validation.errors.join(', ')}`
          );
        }

        // Apply operation
        currentState = this.applier.apply(currentState, op);
        currentVersion++;

        // Store in operations log
        await this.operationsRepo.create(
          {
            templateId: template.id,
            operationId: op.id,
            batchId: request.batchId || null,
            operationType: op.type,
            operationTarget: op.target,
            operationPayload: op.payload,
            baseVersion: currentVersion - 1,
            resultingVersion: currentVersion,
            userId,
            clientId: request.clientId,
            sessionSequence: request.sessionSequence,
            clientTimestamp: op.timestamp,
          },
          tx
        );
      }

      // Update template
      const updatedTemplate = await this.templatesRepo.update(
        template.id,
        {
          designData: currentState,
          version: currentVersion,
          versionHash: this.hashDesignData(currentState),
          updatedAt: new Date(),
        },
        tx
      );

      // Create snapshot if needed
      if (await this.shouldCreateSnapshot(template.id, currentVersion)) {
        await this.snapshotsRepo.create(
          {
            templateId: template.id,
            version: currentVersion,
            designData: currentState,
            designHash: this.hashDesignData(currentState),
            createdBy: 'auto',
            reason: 'Automatic snapshot',
          },
          tx
        );
      }

      return {
        template: updatedTemplate,
        appliedOps: operations.map(op => op.id),
        newVersion: currentVersion,
        serverTimestamp: Date.now(),
      };
    });
  }
}
```

---

## Migration Strategy

### Phase 1: Infrastructure (Week 1-2)
```sql
-- Add new tables
CREATE TABLE template_operations (...);
CREATE TABLE template_snapshots (...);
CREATE TABLE template_sessions (...);

-- Add indexes
CREATE INDEX ...;

-- Add feature flag column
ALTER TABLE templates ADD COLUMN use_operations_v2 BOOLEAN DEFAULT false;
```

### Phase 2: Dual-Write (Week 3-4)
```typescript
// Feature flag check
if (FEATURE_FLAGS.ENABLE_OPERATION_LOG) {
  // Write to both old and new patterns
  await Promise.all([
    this.updateTemplateOldWay(template, updates),
    this.logOperationsNewWay(template, operations),
  ]);

  // Validate consistency
  await this.validateConsistency(templateId);
}
```

### Phase 3: Read from New (Week 5-6)
```typescript
// Use operation log for history
const history = FEATURE_FLAGS.USE_OPERATION_HISTORY
  ? await this.operationsRepo.findHistory(templateId)
  : await this.getHistoryOldWay(templateId);
```

### Phase 4: New Primary (Week 7-8)
```typescript
// Operations-based writes become primary
const result = await this.applyOperations(templateId, operations);

// Old pattern becomes backup
if (!result.success) {
  await this.fallbackToOldPattern(templateId, updates);
}
```

### Phase 5: Cleanup (Week 9+)
```typescript
// Remove old code
// Optimize queries
// Enable automatic pruning
```

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Apply 10 operations | <100ms | p99 latency |
| Apply 50 operations | <500ms | p99 latency |
| Query 100 operations | <100ms | p95 latency |
| Conflict detection | <50ms | Average |
| Snapshot creation | <200ms | Average |
| Template read (cached) | <10ms | p95 |
| Template read (uncached) | <50ms | p95 |

---

## Security Considerations

1. **SQL Injection**: Use parameterized queries for all database operations
2. **Authorization**: Verify user owns template before allowing operations
3. **Input Validation**: Validate operation payload schemas
4. **Rate Limiting**: Limit operations per user per minute (e.g., 1000/min)
5. **JSONB Size Limits**: Prevent malicious large payloads (max 10MB per operation)
6. **Audit Trail**: Log all modification attempts with user ID and IP

---

## Monitoring and Alerts

```typescript
// Metrics to track
const metrics = {
  operationsApplied: counter(),
  operationLatency: histogram(),
  conflictsDetected: counter(),
  versionMismatches: counter(),
  snapshotsCreated: counter(),
  operationsPruned: counter(),
  cacheHitRate: gauge(),
};

// Alerts
if (metrics.conflictsDetected.rate() > 10) {
  alert('High conflict rate detected');
}

if (metrics.operationLatency.p99() > 500) {
  alert('Operation latency exceeds target');
}
```

---

## Testing Strategy

1. **Unit Tests**: Test operation applier for each operation type
2. **Integration Tests**: Test full apply flow with database
3. **Conflict Tests**: Test all conflict scenarios
4. **Load Tests**: Test with 1000+ operations per template
5. **Migration Tests**: Validate data consistency during migration
6. **Rollback Tests**: Ensure safe rollback to previous version

---

## Future Enhancements

1. **WebSocket Support**: Real-time operation push for collaboration
2. **CRDT Integration**: Add vector clocks for automatic conflict resolution
3. **Compression**: Compress old operations to save storage
4. **Sharding**: Partition operations by template ID for horizontal scaling
5. **CDC**: Use change data capture for real-time replication
