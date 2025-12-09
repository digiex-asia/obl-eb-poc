# Why the `template_operations` Table is Empty - Technical Explanation

## TL;DR

The `template_operations` table is **intentionally empty** in the current implementation because **operations are NOT being persisted to the database** - they are only used for **in-memory state transformation**. The current design applies operations directly to the `design_data` JSONB column in the `templates` table and discards the operation log.

---

## Current Architecture (What's Implemented)

### 1. How Operations Are Currently Handled

```typescript
// In templates.service.ts - applyOperations method
async applyOperations(id: string, dto: ApplyOperationsDto) {
  // 1. Load template from database
  const template = await this.templatesRepository.findOne({ where: { id } });

  // 2. Check version conflict (optimistic locking)
  if (template.version !== dto.baseVersion) {
    throw ConflictException(); // 409 error
  }

  // 3. Execute operations IN MEMORY
  let updatedDesignData = { ...template.designData };
  for (const operation of dto.operations) {
    updatedDesignData = this.operationExecutor.execute(
      updatedDesignData,
      operation  // ⚠️ Operation used here but NOT saved!
    );
  }

  // 4. Save ONLY the final state (not the operations)
  template.designData = updatedDesignData;
  await this.templatesRepository.save(template);

  // ⚠️ Operations are NEVER inserted into template_operations table!
  return { template, appliedOps };
}
```

### 2. What Happens to Operations

```
Frontend                    Backend                     Database
--------                    -------                     --------
1. User adds element
   ↓
2. Generate operation:
   {
     type: "add_element",
     target: { pageId, elementId },
     payload: { ... }
   }
   ↓
3. POST /templates/:id/operations
                         →  4. Receive operations
                             ↓
                         5. Apply to designData (in-memory)
                             ↓
                         6. Save to templates.design_data
                                                      →  7. UPDATE templates
                                                          SET design_data = {...}
                                                          WHERE id = ...

                         ❌ Operations are discarded after use!
                         ❌ template_operations remains empty!
```

---

## Why Operations Are Not Saved

### Design Decision

The current implementation uses a **State-Based Approach** instead of an **Event-Sourced Approach**:

| Approach | What's Stored | Operations Table |
|----------|---------------|------------------|
| **State-Based** (Current) | Final state only | Empty (not used) |
| **Event-Sourced** (Proposed) | All operations | Full operation log |

### Current Flow

```typescript
// State-Based Approach (Current)
Template State = Final State Only
Database Stores: { design_data: {...} }  // Just the current state

Operations are:
✅ Received from client
✅ Validated
✅ Applied to in-memory state
✅ Result saved to DB
❌ NOT persisted to template_operations
```

---

## What the `template_operations` Table Was DESIGNED For

According to the OpenSpec proposal, the `template_operations` table was designed to support:

### 1. **Event Sourcing Pattern**

Store every operation as an event:

```sql
INSERT INTO template_operations (
  template_id,
  operation_id,
  operation,
  user_id,
  created_at
) VALUES (
  'template_123',
  'op_add_element_456',
  '{"type": "add_element", "target": {...}, "payload": {...}}',
  'user_789',
  NOW()
);
```

### 2. **Benefits of Event Sourcing**

**Audit Trail**:
```sql
-- See who changed what and when
SELECT operation, user_id, created_at
FROM template_operations
WHERE template_id = 'template_123'
ORDER BY created_at DESC;
```

**Time Travel**:
```sql
-- Rebuild state at any point in time
SELECT operation
FROM template_operations
WHERE template_id = 'template_123'
  AND created_at <= '2024-12-01 10:00:00'
ORDER BY created_at ASC;
```

**Collaboration History**:
```sql
-- See who made changes
SELECT user_id, COUNT(*) as change_count
FROM template_operations
WHERE template_id = 'template_123'
GROUP BY user_id;
```

### 3. **Conflict Resolution**

With operations stored:

```typescript
// Detect conflicts by comparing operation sequences
const clientOps = [op1, op2, op3];  // Client's pending ops
const serverOps = await getOperationsSince(baseVersion);  // Server ops

if (serverOps.length > 0) {
  // Someone else made changes!
  // Try to merge or ask user to resolve
  const merged = tryAutoMerge(clientOps, serverOps);
}
```

### 4. **Operational Transformation (OT)**

For real-time collaboration:

```typescript
// Transform client operation based on server operations
const transformed = operationalTransform(
  clientOp,      // What client tried to do
  serverOps      // What happened on server meanwhile
);
```

---

## Current Implementation Gaps

### What's Missing

1. **No Operation Persistence**
   ```typescript
   // ❌ This code doesn't exist in templates.service.ts
   await this.operationsRepository.save({
     templateId: template.id,
     operationId: operation.id,
     operation: operation,
     userId: userId,
   });
   ```

2. **No Operation Repository**
   ```typescript
   // ❌ Not imported or injected
   @InjectRepository(TemplateOperation)
   private operationsRepository: Repository<TemplateOperation>
   ```

3. **No Cleanup Logic**
   ```sql
   -- ❌ No TTL or cleanup for old operations
   DELETE FROM template_operations
   WHERE created_at < NOW() - INTERVAL '90 days';
   ```

---

## Why This Design Choice Was Made

### Pros of Current State-Based Approach

1. **Simplicity**
   - No need to manage operation log
   - No cleanup required
   - Smaller database footprint

2. **Performance**
   - No extra INSERT on every operation
   - Faster writes (one UPDATE vs INSERT + UPDATE)
   - Less disk I/O

3. **Storage Efficiency**
   - Only stores final state
   - No accumulating operation history
   - Bounded storage growth

### Cons of Current Approach

1. **No Audit Trail**
   - Can't see who changed what
   - Can't track change history
   - No blame/credit attribution

2. **No Time Travel**
   - Can't restore to previous state
   - Can't undo/replay changes
   - Can't compare versions

3. **Limited Conflict Resolution**
   - Only version number comparison
   - Can't auto-merge changes
   - Last-write-wins only

4. **No Collaboration Features**
   - Can't see other users' changes
   - Can't do operational transformation
   - Hard to add real-time sync

---

## How to Enable Operation Logging

If you want to actually use the `template_operations` table, here's what needs to be added:

### Step 1: Inject TemplateOperation Repository

```typescript
// In templates.service.ts
import { TemplateOperation } from '@modules/operations/entities/template-operation.entity';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(Template)
    private readonly templatesRepository: Repository<Template>,

    @InjectRepository(TemplateOperation)  // ADD THIS
    private readonly operationsRepository: Repository<TemplateOperation>,

    private readonly operationExecutor: OperationExecutorService,
  ) {}
}
```

### Step 2: Save Operations to Database

```typescript
async applyOperations(
  id: string,
  applyOperationsDto: ApplyOperationsDto,
): Promise<{ template: Template; appliedOps: string[] }> {
  // ... existing code ...

  // Execute operations on DesignData
  const appliedOps: string[] = [];
  let updatedDesignData = { ...designData };

  for (const operation of applyOperationsDto.operations) {
    try {
      updatedDesignData = this.operationExecutor.execute(
        updatedDesignData,
        operation,
      );
      appliedOps.push(operation.id);

      // ✅ ADD THIS: Save operation to database
      await this.operationsRepository.save({
        templateId: id,
        operationId: operation.id,
        operation: operation,
        userId: null, // TODO: Get from auth context
      });

    } catch (error) {
      throw new BadRequestException({
        error: 'OPERATION_FAILED',
        message: `Failed to execute operation ${operation.id}`,
        details: error.message,
      });
    }
  }

  // ... rest of code ...
}
```

### Step 3: Add Operation Cleanup

```typescript
// Create new method in templates.service.ts
async cleanupOldOperations(retentionDays: number = 90): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await this.operationsRepository
    .createQueryBuilder()
    .delete()
    .where('created_at < :cutoffDate', { cutoffDate })
    .execute();

  return result.affected || 0;
}
```

### Step 4: Add to Module

```typescript
// In templates.module.ts
import { TemplateOperation } from '@modules/operations/entities/template-operation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Template,
      TemplateOperation,  // ADD THIS
    ]),
  ],
  // ...
})
export class TemplatesModule {}
```

---

## Trade-offs Analysis

### Option A: Keep Current State-Based (No Operation Log)

**Use When**:
- Single-user editing
- Don't need audit trail
- Don't need time travel
- Want maximum simplicity

**Limitations**:
- No collaboration history
- No conflict resolution beyond version check
- No undo beyond client-side

### Option B: Add Event Sourcing (Save Operations)

**Use When**:
- Need audit trail (who changed what)
- Need time travel (restore to any point)
- Planning real-time collaboration
- Need advanced conflict resolution

**Costs**:
- More database writes (2x per operation)
- More storage (operations accumulate)
- Need cleanup logic
- More complex code

---

## Recommendation

### For Your Use Case

Based on the OpenSpec proposal, you **intended to have event sourcing** with:
- Bounded operation log (90 days retention)
- Snapshot + operations for efficiency
- Conflict resolution capabilities

### Implementation Priority

1. **Phase 1 (Current)**: ✅ Complete
   - State-based updates work
   - Version conflict detection works
   - Good enough for single-user editing

2. **Phase 2 (If needed)**: Add operation logging
   - Implement the 4 steps above
   - Add audit trail queries
   - Add cleanup cron job

3. **Phase 3 (If needed)**: Advanced features
   - Time travel / restore
   - Operational transformation
   - Real-time collaboration

---

## Summary

**Q: Why is `template_operations` empty?**

**A**: Because the current implementation doesn't save operations to the database. It uses them for in-memory transformation only, then stores just the final state in `templates.design_data`.

**Q: Is this a bug?**

**A**: No, it's a **design decision** favoring simplicity over auditability. The table exists for future use if you decide to add event sourcing.

**Q: Should I add operation logging?**

**A**: Only if you need:
- Audit trail (who changed what)
- Time travel (undo/restore)
- Better conflict resolution
- Collaboration history

For basic single-user editing, the current approach is fine and more efficient.

---

**Current Status**: State-based (operations not saved)
**Future Option**: Event-sourced (save all operations)
**Your Choice**: Depends on requirements 🎯
