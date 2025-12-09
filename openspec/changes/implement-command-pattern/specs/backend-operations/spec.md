# Backend Operations API Specification

## Purpose

This specification defines the backend API requirements to support the Command Pattern architecture in the GraphicEditor. The backend will provide operation-based partial updates, version management, conflict resolution, and operation history tracking to enable offline-first capabilities and future real-time collaboration.

## ADDED Requirements

### Requirement: Enhanced Apply Operations Endpoint

The backend SHALL provide an enhanced operations endpoint that supports batch operation application with version checking, conflict detection, and idempotency.

#### Scenario: Apply operations with version match

- **WHEN** client sends POST /api/v1/templates/:id/operations with valid operations and matching baseVersion
- **THEN** backend applies all operations atomically within a transaction
- **AND** operations are inserted into template_operations table
- **AND** template version is incremented
- **AND** response includes updated template, new version, and applied operation IDs
- **AND** HTTP 200 status is returned

#### Scenario: Detect version conflict

- **WHEN** client sends operations with baseVersion that does not match current template version
- **THEN** backend detects version mismatch
- **AND** retrieves operations that occurred since client's baseVersion
- **AND** detects which client operations conflict with server operations
- **AND** returns HTTP 409 with conflict details, server state, and suggested resolution
- **AND** no operations are applied

#### Scenario: Handle idempotent operations

- **WHEN** client sends operations with IDs that already exist in template_operations table
- **THEN** backend skips already-applied operations
- **AND** applies only new operations
- **AND** returns success with current state
- **AND** no duplicate operations are created

#### Scenario: Apply operations with force flag

- **WHEN** client sends operations with force=true flag
- **THEN** backend skips version check
- **AND** applies operations to current state (client-wins resolution)
- **AND** increments version
- **AND** returns success with new state

#### Scenario: Validate operations before application

- **WHEN** backend receives operations
- **THEN** each operation is validated for semantic correctness
- **AND** target existence is checked (page, element, audio layer)
- **AND** payload schema is validated
- **AND** business rules are enforced (e.g., cannot delete last page)
- **AND** if validation fails, HTTP 400 is returned with validation errors

### Requirement: Operation History Retrieval

The backend SHALL provide endpoints to retrieve operation history for templates, enabling time-travel debugging and audit trails.

#### Scenario: Get operations in version range

- **WHEN** client sends GET /api/v1/templates/:id/operations?fromVersion=10&toVersion=20
- **THEN** backend returns operations with resulting_version between 10 and 20
- **AND** operations include full details (type, target, payload, timestamps, user)
- **AND** operations are ordered by resulting_version ascending
- **AND** pagination metadata is included

#### Scenario: Get operations with payload filtering

- **WHEN** client requests operations with includePayload=false
- **THEN** backend returns operations without payload data (for performance)
- **AND** response includes operation metadata only

#### Scenario: Limit operation history results

- **WHEN** client requests operations with limit=50
- **THEN** backend returns at most 50 operations
- **AND** pagination hasMore flag indicates if more operations exist
- **AND** client can request next page with offset

### Requirement: Template Snapshots

The backend SHALL create and manage periodic snapshots of template state to optimize operation replay and enable fast version retrieval.

#### Scenario: Create snapshot automatically

- **WHEN** 100 operations have been applied since last snapshot
- **OR** 30 minutes have passed since last snapshot
- **THEN** backend creates snapshot with current template state
- **AND** snapshot is stored in template_snapshots table
- **AND** snapshot includes version, design_data, and creation metadata

#### Scenario: Retrieve template at specific version

- **WHEN** client sends GET /api/v1/templates/:id/snapshot/:version
- **THEN** backend finds nearest snapshot at or before requested version
- **AND** replays operations from snapshot to target version
- **AND** returns template state at requested version
- **AND** HTTP 200 status is returned

#### Scenario: Prune old snapshots

- **WHEN** template has more than 50 snapshots
- **THEN** backend retains snapshots from last 30 days
- **AND** retains every 10th snapshot for older history
- **AND** deletes intermediate snapshots to save storage

### Requirement: Conflict Detection and Resolution

The backend SHALL detect conflicts between concurrent client operations and provide resolution options.

#### Scenario: Detect concurrent edits on same target

- **WHEN** client operations target an element that was modified by server operations
- **THEN** backend compares operation targets
- **AND** identifies overlapping modifications
- **AND** determines if semantic conflict exists
- **AND** includes conflict information in HTTP 409 response

#### Scenario: Provide auto-merge suggestion

- **WHEN** client operations conflict with server operations
- **THEN** backend attempts to auto-merge non-conflicting operations
- **AND** applies client operations that modify different targets to server state
- **AND** includes merge result in conflict response
- **AND** lists operations that could not be auto-merged

#### Scenario: Handle deleted target conflict

- **WHEN** client operation targets element that was deleted on server
- **THEN** backend identifies operation as conflicting
- **AND** marks operation with conflict type 'deleted_target'
- **AND** suggests 'server-wins' resolution (skip client operation)

#### Scenario: Resolve conflict with client-wins

- **WHEN** client sends POST /api/v1/templates/:id/resolve-conflict with resolution='client-wins'
- **THEN** backend applies client operations to server state
- **AND** increments version
- **AND** creates new snapshot
- **AND** returns updated template

#### Scenario: Resolve conflict with server-wins

- **WHEN** client sends resolution='server-wins'
- **THEN** backend discards client operations
- **AND** returns current server state
- **AND** version remains unchanged

### Requirement: Database Schema for Operations

The backend SHALL use a hybrid database schema with operation log, snapshots, and current state tables.

#### Scenario: Store template with version

- **WHEN** template is created or updated
- **THEN** template is stored in templates table
- **AND** version field is incremented
- **AND** design_data JSONB column contains current state
- **AND** version_hash contains SHA256 of design_data for integrity

#### Scenario: Store operation in log

- **WHEN** operation is successfully applied
- **THEN** operation is inserted into template_operations table
- **AND** includes operation_id (from frontend command), type, target, payload
- **AND** includes base_version (before) and resulting_version (after)
- **AND** includes client_id and session_sequence for ordering
- **AND** includes user_id for audit trail

#### Scenario: Create indexed operation log

- **WHEN** template_operations table is created
- **THEN** indexes are created on (template_id, resulting_version)
- **AND** index on operation_id for idempotency checks
- **AND** GIN index on operation_target JSONB for target queries
- **AND** index on (template_id, server_timestamp) for time-based queries

#### Scenario: Prune old operations

- **WHEN** operations are older than 90 days
- **AND** a snapshot exists at or before the operation version
- **THEN** backend deletes old operations to save storage
- **AND** retains operations from last 90 days regardless of snapshots
- **AND** ensures at least one snapshot exists before pruning

### Requirement: Operation Application Logic

The backend SHALL apply operations to template design_data using deterministic transformation functions.

#### Scenario: Apply add_element operation

- **WHEN** operation type is 'add_element'
- **THEN** backend finds page by operation.target.pageId
- **AND** appends element from operation.payload to page.elements array
- **AND** returns updated design_data

#### Scenario: Apply move_element operation

- **WHEN** operation type is 'move_element'
- **THEN** backend finds element by operation.target.elementId in target page
- **AND** updates element x and y from operation.payload
- **AND** returns updated design_data

#### Scenario: Apply delete_element operation

- **WHEN** operation type is 'delete_element'
- **THEN** backend finds page by operation.target.pageId
- **AND** removes element with operation.target.elementId from page.elements array
- **AND** returns updated design_data

#### Scenario: Apply delete_audio_clip operation

- **WHEN** operation type is 'delete_audio_clip'
- **THEN** backend finds audio layer by operation.target.audioLayerId
- **AND** removes clip with operation.target.clipId from layer.clips array
- **AND** returns updated design_data
- **AND** layerId is required in operation target

#### Scenario: Rollback on operation failure

- **WHEN** any operation in a batch fails during application
- **THEN** database transaction is rolled back
- **AND** no operations are persisted
- **AND** template state remains unchanged
- **AND** HTTP 400 is returned with error details

### Requirement: Session and Concurrency Management

The backend SHALL track active client sessions to detect concurrent edits and provide presence information for future collaboration features.

#### Scenario: Register client session

- **WHEN** client opens a template for editing
- **THEN** client sends POST /api/v1/templates/:id/sessions with clientId and userId
- **AND** backend creates record in template_sessions table
- **AND** records last_known_version for conflict detection
- **AND** updates last_activity timestamp

#### Scenario: Update session activity

- **WHEN** client sends operations
- **THEN** backend updates template_sessions.last_activity for client's session
- **AND** updates last_known_version to new template version
- **AND** marks session as connected

#### Scenario: Detect concurrent sessions

- **WHEN** multiple sessions exist for same template
- **THEN** backend can retrieve active sessions via GET /api/v1/templates/:id/sessions
- **AND** response includes user IDs and last activity times
- **AND** can be used for future presence UI

#### Scenario: Clean up stale sessions

- **WHEN** session has no activity for 30 minutes
- **THEN** backend marks session as disconnected
- **AND** removes session after 24 hours of inactivity

### Requirement: Performance Optimization

The backend SHALL optimize operation processing for high-volume scenarios with large operation logs.

#### Scenario: Query operations efficiently

- **WHEN** client requests operations for a template
- **THEN** backend uses indexed queries on (template_id, resulting_version)
- **AND** query executes in <100ms for templates with 10,000 operations
- **AND** pagination prevents loading entire operation log

#### Scenario: Apply batch operations efficiently

- **WHEN** client sends 50 operations in one request
- **THEN** backend applies all operations within single transaction
- **AND** transaction completes in <500ms
- **AND** JSONB updates use PostgreSQL's efficient JSONB operators

#### Scenario: Cache frequently accessed templates

- **WHEN** template is accessed frequently (>10 req/min)
- **THEN** backend caches template design_data in Redis
- **AND** cache expires after 5 minutes
- **AND** cache is invalidated on operation application
- **AND** cached reads are <10ms

#### Scenario: Use materialized views for statistics

- **WHEN** backend needs operation counts or version stats
- **THEN** query uses materialized view template_operation_counts
- **AND** view is refreshed every 15 minutes
- **AND** queries execute in <50ms

### Requirement: API Versioning and Backward Compatibility

The backend SHALL support API versioning to enable incremental migration and maintain compatibility with legacy clients.

#### Scenario: Handle v1 API request

- **WHEN** client sends request with Accept: application/vnd.template.v1+json
- **THEN** backend processes request using v1 logic
- **AND** response omits v2-specific fields (clientId, sessionSequence)
- **AND** conflict responses use simplified v1 format

#### Scenario: Handle v2 API request

- **WHEN** client sends request with Accept: application/vnd.template.v2+json
- **THEN** backend processes request using v2 logic
- **AND** response includes all v2 fields
- **AND** conflict responses include detailed resolution options

#### Scenario: Adapt legacy requests

- **WHEN** v1 client sends operations without clientId
- **THEN** backend generates synthetic clientId='legacy-client'
- **AND** uses timestamp as sessionSequence
- **AND** processes operations normally

### Requirement: Authorization and Security

The backend SHALL enforce access control for template operations and validate user permissions.

#### Scenario: Authorize template write access

- **WHEN** client sends operations to POST /api/v1/templates/:id/operations
- **THEN** backend verifies user is authenticated
- **AND** checks if user is template author
- **AND** if not author, returns HTTP 403 Forbidden
- **AND** if author, allows operation application

#### Scenario: Authorize template read access

- **WHEN** client requests GET /api/v1/templates/:id
- **THEN** backend checks if template is public OR user is author
- **AND** if neither, returns HTTP 403 Forbidden
- **AND** if authorized, returns template

#### Scenario: Validate operation ownership

- **WHEN** operations are applied
- **THEN** backend records userId in template_operations table
- **AND** ensures userId matches authenticated user
- **AND** prevents operation spoofing

### Requirement: Error Handling and Validation

The backend SHALL provide detailed error responses for all failure scenarios with actionable information.

#### Scenario: Handle invalid operation type

- **WHEN** operation has unknown type
- **THEN** backend returns HTTP 400 with error code 'INVALID_OPERATION_TYPE'
- **AND** error message includes received type and valid types list

#### Scenario: Handle missing target

- **WHEN** operation targets non-existent page or element
- **THEN** backend returns HTTP 400 with error code 'TARGET_NOT_FOUND'
- **AND** error message includes operation ID and missing target ID

#### Scenario: Handle schema validation failure

- **WHEN** operation payload does not match expected schema
- **THEN** backend returns HTTP 400 with error code 'INVALID_PAYLOAD'
- **AND** error message includes field path and validation error

#### Scenario: Handle business rule violation

- **WHEN** operation violates business rule (e.g., delete last page)
- **THEN** backend returns HTTP 400 with error code 'BUSINESS_RULE_VIOLATION'
- **AND** error message explains the violated rule

#### Scenario: Handle database transaction failure

- **WHEN** database transaction fails during operation application
- **THEN** backend rolls back transaction
- **AND** returns HTTP 500 with error code 'TRANSACTION_FAILED'
- **AND** logs detailed error for debugging
- **AND** does not expose internal error details to client

### Requirement: Audit Trail and Logging

The backend SHALL maintain comprehensive audit trails for all template modifications and provide logging for debugging.

#### Scenario: Log operation application

- **WHEN** operations are applied
- **THEN** backend logs to application log with level INFO
- **AND** log includes template ID, user ID, operation count, and version change
- **AND** log includes duration of operation application

#### Scenario: Log conflict detection

- **WHEN** version conflict is detected
- **THEN** backend logs to application log with level WARN
- **AND** log includes client version, server version, and conflicting operation IDs
- **AND** log includes suggested resolution strategy

#### Scenario: Store operation metadata

- **WHEN** operation is stored in template_operations table
- **THEN** row includes server_timestamp for when operation was applied
- **AND** includes user_id for who applied it
- **AND** includes client_id and session_sequence for ordering
- **AND** data can be queried for audit reports

#### Scenario: Generate audit report

- **WHEN** admin requests audit report for template
- **THEN** backend retrieves all operations from template_operations
- **AND** groups by user and date
- **AND** returns summary with operation counts, user activity, and timeline

### Requirement: Migration and Data Consistency

The backend SHALL support incremental migration from current implementation to operation-based architecture while maintaining data consistency.

#### Scenario: Dual-write during migration

- **WHEN** migration phase is active (feature flag ENABLE_OPERATION_LOG=true)
- **THEN** backend writes to both current templates table and new operations table
- **AND** validates data consistency after each write
- **AND** logs any discrepancies for investigation

#### Scenario: Create initial snapshots for existing templates

- **WHEN** migration script runs
- **THEN** creates snapshot for each existing template at current version
- **AND** creates synthetic 'migration' operation in operations log
- **AND** all existing templates have snapshots before operation log begins

#### Scenario: Validate migrated data

- **WHEN** migration validation runs
- **THEN** compares templates table design_data with snapshot design_data
- **AND** ensures version numbers match
- **AND** reports any inconsistencies

## MODIFIED Requirements

None (this is a new backend capability).

## REMOVED Requirements

None (this is additive).

## Implementation Notes

### Database Technology
- **Recommended**: PostgreSQL 14+ with JSONB support
- **Alternative**: MongoDB with transaction support (not recommended due to existing JSONB patterns)

### API Framework
- **Node.js/TypeScript**: Express or Fastify with TypeORM or Prisma
- **Python**: FastAPI with SQLAlchemy or Django REST Framework
- **Go**: Gin or Fiber with GORM

### Caching Layer
- **Redis**: For template caching and session management
- **TTL**: 5 minutes for template cache, 30 minutes for sessions

### Migration Timeline
- **Phase 1** (Week 1-2): Add database tables and indexes
- **Phase 2** (Week 3-4): Implement dual-write pattern
- **Phase 3** (Week 5-6): Enable operation history reads
- **Phase 4** (Week 7-8): Switch to operation-based primary writes
- **Phase 5** (Week 9+): Remove legacy code and optimize

### Testing Requirements
- Unit tests for operation applier (100% coverage)
- Integration tests for conflict detection
- Load tests for batch operation processing (50 ops in <500ms)
- Migration tests for data consistency
