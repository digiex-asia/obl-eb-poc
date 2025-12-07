Template Design API Data Model Analysis & Options

 Current Data Model Analysis

 Core Data Structures (lines 152-247)

 The GraphicEditor uses a comprehensive state-based architecture:

 1. DesignElement (lines 172-187)

 interface DesignElement {
     id: string;
     type: ElementType; // 'rect' | 'circle' | 'triangle' | 'star' | 'polygon' | 'heart' | 'diamond' | 'image' | 'text'
     className?: string; // Konva compatibility
     x, y: number;
     width, height: number;
     rotation: number;
     fill: string;
     text?: string;
     fontSize?: number;
     src?: string;
     opacity: number;
     animation?: AnimationSettings;
 }

 2. Page (lines 189-195)

 interface Page {
     id: string;
     duration: number;
     elements: DesignElement[];
     background: string;
     animation?: AnimationSettings;
 }

 3. AudioClip & AudioLayer (lines 197-210)

 interface AudioClip {
     id: string;
     src: string;
     label: string;
     startAt: number;
     duration: number;
     offset: number;
     totalDuration: number;
 }

 interface AudioLayer {
     id: string;
     clips: AudioClip[];
 }

 4. AppState (lines 218-247)

 Contains UI state + content state with undo/redo history

 Current Export Format (lines 3163-3210)

 The system exports to a Konva-compatible JSON structure:
 - Stage → Layer (Page) → Shape (Element) hierarchy
 - Preserves all visual properties
 - Audio layers stored separately

 API Model Options Analysis

 Option 1: Flat REST API Model

 Best for: Simple CRUD operations, traditional backends

 // Template
 {
   id: string;
   name: string;
   description: string;
   thumbnail: string;
   category: string;
   tags: string[];
   createdAt: Date;
   updatedAt: Date;
   author: {
     id: string;
     name: string;
   };

   // Design Data
   canvas: {
     width: number;
     height: number;
   };
   pages: Page[];
   audioLayers: AudioLayer[];

   // Metadata
   isPublic: boolean;
   usageCount: number;
   rating: number;
 }

 Pros:
 - Simple to implement
 - Easy to understand
 - Works with any REST framework
 - Straightforward CRUD operations

 Cons:
 - Deep nesting can be problematic
 - Element updates require full page payload
 - Not optimized for collaborative editing
 - Limited relationship modeling

 Option 2: GraphQL Schema

 Best for: Flexible queries, complex relationships

 type Template {
   id: ID!
   name: String!
   description: String
   thumbnail: String
   category: Category!
   tags: [Tag!]!
   createdAt: DateTime!
   updatedAt: DateTime!
   author: User!

   # Design Content
   canvas: Canvas!
   pages: [Page!]!
   audioLayers: [AudioLayer!]!

   # Relationships
   variants: [Template!]!
   baseTemplate: Template

   # Metadata
   isPublic: Boolean!
   usageCount: Int!
   rating: Float!
 }

 type Page {
   id: ID!
   duration: Float!
   background: String!
   elements: [Element!]!
   animation: Animation
 }

 type Element {
   id: ID!
   type: ElementType!
   position: Position!
   size: Size!
   rotation: Float!
   fill: String
   opacity: Float!
   animation: Animation

   # Type-specific fields
   text: String
   fontSize: Int
   imageUrl: String
 }

 # Queries
 type Query {
   template(id: ID!): Template
   templates(
     category: String
     tags: [String!]
     limit: Int
     offset: Int
   ): [Template!]!

   searchTemplates(query: String!): [Template!]!
 }

 # Mutations
 type Mutation {
   createTemplate(input: CreateTemplateInput!): Template!
   updateTemplate(id: ID!, input: UpdateTemplateInput!): Template!
   deleteTemplate(id: ID!): Boolean!

   # Granular updates
   updateElement(
     templateId: ID!
     pageId: ID!
     elementId: ID!
     attrs: ElementAttrsInput!
   ): Element!

   duplicatePage(templateId: ID!, pageId: ID!): Page!
 }

 Pros:
 - Flexible querying (fetch only what you need)
 - Strong typing
 - Great for complex relationships
 - Supports partial updates
 - Built-in introspection

 Cons:
 - More complex to implement
 - Learning curve for clients
 - Can be overkill for simple use cases
 - N+1 query problems need careful handling

 Option 3: Event Sourcing / CQRS

 Best for: Collaborative editing, undo/redo, version history

 // Command Model (Write)
 type TemplateCommand =
   | { type: 'CREATE_TEMPLATE'; payload: CreateTemplatePayload }
   | { type: 'ADD_PAGE'; templateId: string; page: Page }
   | { type: 'UPDATE_ELEMENT'; templateId: string; pageId: string; elementId: string; attrs: Partial<DesignElement> }
   | { type: 'DELETE_PAGE'; templateId: string; pageId: string }
   | { type: 'REORDER_ELEMENTS'; templateId: string; pageId: string; order: string[] }

 // Event Model (Append-only log)
 type TemplateEvent = {
   id: string;
   templateId: string;
   userId: string;
   timestamp: Date;
   type: string;
   payload: any;
   version: number;
 }

 // Query Model (Read)
 type TemplateProjection = {
   id: string;
   name: string;
   currentVersion: number;
   snapshot: {
     pages: Page[];
     audioLayers: AudioLayer[];
   };
   metadata: {
     createdAt: Date;
     updatedAt: Date;
     author: User;
   };
 }

 Pros:
 - Perfect for undo/redo (already in your app!)
 - Complete audit trail
 - Time-travel debugging
 - Collaborative editing support
 - Can rebuild state from events

 Cons:
 - Complex to implement
 - More storage required
 - Need event replay logic
 - Eventual consistency challenges

 Option 4: Document Database Model (MongoDB-style)

 Best for: Flexible schemas, rapid iteration

 {
   _id: ObjectId,
   name: string,
   description: string,

   // Embedded design data
   design: {
     canvas: { width: 800, height: 450 },
     pages: [
       {
         _id: ObjectId,
         duration: 5,
         background: "#ffffff",
         elements: [
           {
             _id: ObjectId,
             type: "text",
             transform: {
               x: 200, y: 180,
               width: 400, height: 60,
               rotation: 0
             },
             style: {
               fill: "#1e293b",
               opacity: 1,
               fontSize: 48
             },
             content: {
               text: "NEW ARRIVALS"
             },
             animation: {
               type: "rise",
               speed: 1,
               delay: 0,
               direction: "up",
               mode: "enter"
             }
           }
         ]
       }
     ],
     audio: {
       layers: [...]
     }
   },

   // Metadata
   meta: {
     category: "fashion",
     tags: ["minimal", "modern"],
     thumbnail: "https://...",
     version: 1,
     createdAt: ISODate(),
     updatedAt: ISODate()
   },

   // Ownership
   author: {
     _id: ObjectId,
     name: string,
     email: string
   },

   // Analytics
   stats: {
     views: 0,
     uses: 0,
     rating: 0,
     ratingCount: 0
   }
 }

 Pros:
 - Schema flexibility
 - Easy to evolve
 - Good for rapid prototyping
 - Natural fit for JSON data
 - Embedded documents reduce joins

 Cons:
 - Less structure enforcement
 - Can lead to inconsistent data
 - Query performance on deep nesting
 - Duplication if not careful

 Option 5: Hybrid Approach (Recommended)

 Best for: Production systems balancing flexibility & performance

 Structure:
 1. Relational metadata (PostgreSQL/MySQL) - for structured queries
 2. Document storage (JSON columns or MongoDB) - for design content
 3. Asset storage (S3/CDN) - for images/audio
 4. Cache layer (Redis) - for frequently accessed templates

 -- Relational: Templates table
 CREATE TABLE templates (
   id UUID PRIMARY KEY,
   name VARCHAR(255) NOT NULL,
   description TEXT,
   category_id INT REFERENCES categories(id),
   author_id UUID REFERENCES users(id),
   thumbnail_url TEXT,
   is_public BOOLEAN DEFAULT false,
   created_at TIMESTAMP,
   updated_at TIMESTAMP,
   version INT DEFAULT 1,

   -- JSON columns for flexible design data
   design_data JSONB NOT NULL,
   animation_config JSONB,

   -- Indexes
   INDEX idx_category (category_id),
   INDEX idx_author (author_id),
   INDEX idx_created (created_at DESC),
   FULLTEXT INDEX idx_search (name, description)
 );

 -- Design data structure (stored as JSONB)
 {
   "canvas": { "width": 800, "height": 450 },
   "pages": [...],
   "audioLayers": [...]
 }

 Pros:
 - Best of both worlds
 - Optimized queries on metadata
 - Flexible design content
 - Easy to scale different parts
 - Asset optimization via CDN

 Cons:
 - More complex architecture
 - Multiple systems to maintain
 - Consistency across systems

 Recommendations

 For Different Use Cases:

 1. MVP/Prototype → Option 1 (Flat REST) or Option 4 (Document DB)
 2. Enterprise/Complex → Option 5 (Hybrid)
 3. Collaborative Editor → Option 3 (Event Sourcing) + Option 5
 4. API-first Product → Option 2 (GraphQL) + Option 5

 Critical Design Considerations:

 1. Versioning: Support template versions for rollback
 2. Assets: Separate storage for images/audio with CDN
 3. Permissions: Public/private templates, sharing
 4. Search: Efficient category/tag/text search
 5. Relationships: Template variants, base templates
 6. Caching: Frequently used templates
 7. Validation: Schema validation for design data
 8. Migration: Support schema evolution

 Recommended Architecture

 Based on your requirements (collaborative real-time editing, template relationships, partial updates), I recommend:

 Core Architecture: Hybrid Event Sourcing + CRDT

 This combines the best approaches from the analysis:

 1. Real-Time Collaboration: Hybrid CRDT-OT system
   - CRDTs for page-level operations (add/delete/reorder)
   - Operational Transformation for element transforms (drag, resize, rotate)
   - Event sourcing for complete audit trail and undo/redo
 2. Template Relationships: Document database with relational metadata
   - Variants: VariantGroup system for A/B testing
   - Forking: Parent-child relationships with sync capabilities
   - Component Libraries: Reusable element groups with instance tracking
 3. Partial Updates: Semantic operation-based system
   - Operation batching (60fps → 1 op/frame during drag)
   - Optimistic UI with automatic rollback
   - 97% payload reduction (120KB/sec → 3.6KB/sec)
 4. Storage: PostgreSQL with JSONB columns (hybrid relational + document) + Redis (cache)
 5. Communication: WebSocket for real-time + REST for discrete operations

 ---
 Detailed Implementation Plan

 Phase 1: Foundation & Data Model (Weeks 1-3)

 Goal: Establish core data structures and storage without breaking existing functionality

 Week 1: Type System & Storage

 1. Create comprehensive type definitions
   - File: src/components/GraphicEditor/entities/template/model/types.ts
   - Add: Template, TemplateMetadata, TemplateRelationship, VariantGroup
   - Add: Component, ComponentInstance, ComponentLink
   - Add: SyncSettings, SyncState, TemplateDiff
 2. Extend existing types
   - File: src/components/GraphicEditor/shared/model/types.ts
   - Extend AppState with:
       - currentTemplate: Template | null
     - componentLibrary: Component[]
     - variantGroups: VariantGroup[]
     - relationships: TemplateRelationship[]
     - syncStatus: { isSyncing, pendingConflicts }
 3. Setup IndexedDB storage
   - File: src/components/GraphicEditor/shared/lib/storage/db.ts
   - Implement stores: templates, components, relationships, variantGroups, componentLinks, history
   - Add caching layer (Map-based LRU cache)

 Week 2: Operation System

 1. Define operation types
   - File: src/components/GraphicEditor/operations/types.ts
   - Create Operation, OperationType, OperationTarget interfaces
   - Define payloads for each operation type (move, resize, update props, etc.)
 2. Implement operation mapper
   - File: src/components/GraphicEditor/operations/mapper.ts
   - Function: actionToOperation(action: Action, state: AppState): Operation | null
   - Handle all existing action types
 3. Build operation batcher
   - File: src/components/GraphicEditor/operations/batcher.ts
   - Class: OperationBatcher with frame-throttling
   - Deduplication logic for same-target operations
   - Strategy: immediate, throttle, transaction

 Week 3: Migration & Compatibility

 1. Create migration utilities
   - File: src/components/GraphicEditor/shared/lib/migration.ts
   - Function: migrateExistingTemplate(pages, audioLayers): Template
   - Wrap existing state in Template structure
 2. Update reducer
   - File: src/components/GraphicEditor/App.tsx (lines 392-725)
   - Add new action types for templates/components/variants
   - Extend existing reducer cases to handle Template wrapper
   - Keep existing functionality working
 3. Feature flags
   - Add: ENABLE_OPERATION_BATCHING, ENABLE_RELATIONSHIPS, ENABLE_COLLABORATION
   - Default: all disabled for gradual rollout

 Deliverable: Core data model in place, operation system ready (disabled), existing app still works

 ---
 Phase 2: Component Library (Weeks 4-6)

 Goal: Implement reusable component system with sync capabilities

 Week 4: Component Creation & Storage

 1. Component API implementation
   - File: src/components/GraphicEditor/features/components/api/componentApi.ts
   - Implement: createComponent(), createComponentFromPage()
   - Store components in IndexedDB
 2. Component instance tracking
   - Modify DesignElement to support component instances
   - Add componentInstanceId and componentOverrides fields
   - Update reducer to track component links
 3. Component browser UI
   - File: src/components/GraphicEditor/features/components/ui/ComponentBrowser.tsx
   - Grid view of library components
   - Drag-and-drop to insert
   - Search and filter by tags/category

 Week 5: Component Sync Logic

 1. Sync algorithm
   - File: src/components/GraphicEditor/features/components/lib/syncAlgorithm.ts
   - Function: syncComponentInstance(template, instance, component, options)
   - Handle transform application and override preservation
 2. Sync UI
   - Update available badges
   - Sync confirmation dialog
   - Conflict resolution interface
 3. Instance management
   - Unlink instance (convert to regular elements)
   - Apply overrides to instance
   - Bulk sync all instances

 Week 6: Component Optimization

 1. Detect component candidates
   - Function: detectComponentCandidates(template) - find repeated patterns
   - Suggest componentization to users
 2. Component usage tracking
   - Function: getComponentUsage(componentId) - list all instances
   - Update usage count on insert/delete
 3. Component search
   - Full-text search across component names/descriptions
   - Filter by category, tags, type

 Deliverable: Working component library system with sync capabilities

 ---
 Phase 3: Template Variants & Relationships (Weeks 7-9)

 Goal: Enable template variants for A/B testing and forking for inheritance

 Week 7: Variant System

 1. Variant API
   - File: src/components/GraphicEditor/features/variants/api/variantApi.ts
   - Implement: createVariant(), listVariants(), compareVariants()
 2. Variant grouping
   - Create VariantGroup on first variant creation
   - Link all variants to base template
 3. Variant comparison UI
   - Side-by-side view of two variants
   - Diff visualization (highlight changes)
   - Merge selected changes

 Week 8: Fork & Inheritance

 1. Fork API
   - File: src/components/GraphicEditor/features/templates/api/templateApi.ts
   - Implement: forkTemplate(), syncFromParent(), breakInheritance()
 2. Sync logic
   - File: src/components/GraphicEditor/shared/lib/sync/templateSync.ts
   - Function: syncFromParent(template, parent, options) with conflict detection
   - Strategies: fast-forward, merge, selective
 3. Conflict resolution
   - Detect conflicting changes (parent vs local)
   - Resolution strategies: prefer-parent, prefer-local, manual
   - UI for manual conflict resolution

 Week 9: Relationship Visualization

 1. Ancestry viewer
   - Tree view showing parent-child relationships
   - Visual graph of variant groups
 2. Divergence tracking
   - Function: getDivergence(templateId) - show changes since fork
   - Timeline of divergence points
 3. Relationship management
   - Break inheritance link
   - Change sync settings (auto vs manual)

 Deliverable: Full template relationship system (variants, forks, inheritance)

 ---
 Phase 4: Partial Updates & Optimization (Weeks 10-11)

 Goal: Implement efficient partial updates and batching

 Week 10: Operation Middleware

 1. Middleware integration
   - File: src/components/GraphicEditor/operations/middleware.ts
   - Wrap reducer dispatch with operation middleware
   - Enable ENABLE_OPERATION_BATCHING feature flag
 2. Optimistic updates
   - File: src/components/GraphicEditor/operations/optimistic.ts
   - Class: OptimisticUpdateManager
   - Apply locally, queue for server, handle rollback
 3. Drag optimization
   - Modify drag handlers (lines 1623-1630 in App.tsx)
   - Use batcher.queue() instead of direct dispatch
   - Reduce from 60+ ops/sec to 1 op/frame

 Week 11: Export Optimization

 1. Delta export
   - Modify exportToJSON() (lines 3163-3210 in App.tsx)
   - Export only operations since last sync (not full state)
   - Include operation log with template
 2. Lazy loading
   - Load pages on-demand (not all at once)
   - Prefetch adjacent pages
   - Load elements in chunks for large pages
 3. Compression
   - Compact operation format (short keys)
   - Delta encoding for sequences
   - Optional MessagePack for binary encoding

 Deliverable: Optimized partial update system with 97% payload reduction

 ---
 Phase 5: Real-Time Collaboration (Weeks 12-15)

 Goal: Enable multi-user real-time editing with conflict resolution

 Week 12: WebSocket Infrastructure

 1. WebSocket client
   - File: src/components/GraphicEditor/shared/lib/sync/websocket.ts
   - Connection management (connect, disconnect, reconnect)
   - Message protocol (apply ops, broadcast, presence)
 2. WebSocket server (backend)
   - Room management (one room per template)
   - Operation broadcast to all clients in room
   - Presence tracking
 3. Offline queue
   - File: src/components/GraphicEditor/sync/offline-queue.ts
   - Buffer operations in IndexedDB when offline
   - Replay on reconnect

 Week 13: CRDT Implementation

 1. CRDT library integration
   - Choose: Yjs or Automerge
   - Wrap Pages array as OR-Set (Observed-Remove Set)
   - Wrap Elements map as LWW-Map
 2. Vector clock tracking
   - Add vector clock to AppState
   - Increment on local operations
   - Merge on remote operations
 3. Deterministic merge
   - CRDT guarantees eventual consistency
   - No central conflict resolution needed for page add/delete

 Week 14: Operational Transformation

 1. OT engine
   - File: src/components/GraphicEditor/shared/lib/sync/otEngine.ts
   - Transform element position/size operations
   - Weighted merge for concurrent transforms
 2. Conflict resolution
   - Server-side OT transformation
   - Client-side reconciliation on reconnect
 3. Undo/redo with collaboration
   - Reverse operations for undo
   - Undo only affects user's own operations
   - Team-wide "revert to version" option

 Week 15: Presence & Polish

 1. Presence system
   - Cursor sharing (show other users' cursors)
   - Selection highlighting
   - Active user list with avatars
 2. Collaboration UI
   - "User X is editing" indicators
   - Conflict notification toasts
   - Sync status indicator (synced, syncing, offline)
 3. Performance testing
   - Load test: 50+ concurrent users per document
   - Measure: latency, throughput, convergence time

 Deliverable: Fully functional real-time collaboration system

 ---
 Phase 6: Production Readiness (Weeks 16-17)

 Week 16: Monitoring & Testing

 1. Operation inspector
   - Dev tools panel showing operation log
   - Visualize operation flow (local → server → broadcast)
 2. Comprehensive tests
   - Unit tests for all algorithms (sync, OT, CRDT)
   - Integration tests for collaboration scenarios
   - E2E tests for full workflows
 3. Performance benchmarks
   - Measure payload sizes, latency, memory usage
   - Compare before/after metrics

 Week 17: Documentation & Launch

 1. API documentation
   - OpenAPI spec for REST endpoints
   - WebSocket protocol documentation
 2. Migration guide
   - How to upgrade existing templates
   - Rollback procedures
 3. Gradual rollout
   - Enable features one by one with feature flags
   - A/B test with 10% → 50% → 100% traffic
   - Monitor error rates and performance

 Deliverable: Production-ready collaborative template system

 ---
 Critical Files to Modify

 High Priority (Core Architecture)

 1. src/components/GraphicEditor/App.tsx (lines 392-725, 3163-3210)
   - Extend reducer with template/component/variant actions
   - Integrate operation middleware
   - Optimize exportToJSON for delta export
 2. src/components/GraphicEditor/shared/model/types.ts
   - Add Template, Component, Relationship types
   - Extend AppState with collaboration metadata

 Medium Priority (New Features)

 3. src/components/GraphicEditor/operations/ (new directory)
   - types.ts, mapper.ts, batcher.ts, optimistic.ts, middleware.ts
 4. src/components/GraphicEditor/features/components/ (new directory)
   - api/componentApi.ts, lib/syncAlgorithm.ts, ui/ComponentBrowser.tsx
 5. src/components/GraphicEditor/features/variants/ (new directory)
   - api/variantApi.ts, ui/VariantComparison.tsx

 Low Priority (Infrastructure)

 6. src/components/GraphicEditor/shared/lib/storage/ (new directory)
   - db.ts (IndexedDB), cache.ts
 7. src/components/GraphicEditor/shared/lib/sync/ (new directory)
   - websocket.ts, otEngine.ts, templateSync.ts, componentSync.ts

 ---
 Database Schema (PostgreSQL + JSONB)

 Why PostgreSQL with JSONB?

 Advantages over separate databases:
 - Single source of truth - No sync issues between relational + document DB
 - ACID transactions - Atomic updates across metadata + content
 - Rich JSON operations - Query/update nested JSONB efficiently
 - Indexing - Create GIN indexes on JSONB fields for fast queries
 - Mature ecosystem - Well-supported, reliable, proven at scale
 - Cost-effective - Single database to manage vs. MongoDB + PostgreSQL

 Example Schema:

 -- Templates table
 CREATE TABLE templates (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   name VARCHAR(255) NOT NULL,
   description TEXT,

   -- Relational metadata for fast queries
   author_id UUID REFERENCES users(id),
   parent_id UUID REFERENCES templates(id), -- For forks
   variant_group_id UUID REFERENCES variant_groups(id),
   category VARCHAR(100),

   -- JSONB columns for flexible design content
   design_data JSONB NOT NULL,  -- { pages: [...], audioLayers: [...] }
   metadata JSONB,               -- { linkedComponents: [...], syncSettings: {...} }

   -- Version tracking
   version INTEGER DEFAULT 1,
   created_at TIMESTAMPTZ DEFAULT NOW(),
   updated_at TIMESTAMPTZ DEFAULT NOW(),

   -- Soft delete
   deleted_at TIMESTAMPTZ,

   -- Indexes
   INDEX idx_author (author_id),
   INDEX idx_parent (parent_id),
   INDEX idx_variant_group (variant_group_id),
   INDEX idx_category (category),
   INDEX idx_created (created_at DESC),

   -- JSONB indexes for fast nested queries
   INDEX idx_tags USING GIN ((metadata->'tags')),
   INDEX idx_linked_components USING GIN ((metadata->'linkedComponents'))
 );

 -- Example JSONB query: Find templates with specific tag
 SELECT * FROM templates
 WHERE metadata->'tags' ? 'minimal';

 -- Example JSONB update: Update specific element in page
 UPDATE templates
 SET design_data = jsonb_set(
   design_data,
   '{pages,0,elements,2,x}',
   '150'::jsonb
 )
 WHERE id = 'template-uuid';

 -- Components table
 CREATE TABLE components (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   name VARCHAR(255) NOT NULL,
   description TEXT,
   type VARCHAR(50), -- 'element' | 'group' | 'page' | 'composition'

   -- JSONB content
   content JSONB NOT NULL, -- { elements: [...] } or { page: {...} }

   version INTEGER DEFAULT 1,
   usage_count INTEGER DEFAULT 0,

   created_at TIMESTAMPTZ DEFAULT NOW(),
   updated_at TIMESTAMPTZ DEFAULT NOW(),

   INDEX idx_type (type),
   INDEX idx_usage (usage_count DESC)
 );

 -- Relationships table (relational for graph queries)
 CREATE TABLE template_relationships (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   source_template_id UUID REFERENCES templates(id),
   target_template_id UUID REFERENCES templates(id),
   type VARCHAR(50), -- 'fork' | 'variant' | 'derives-from'

   metadata JSONB, -- { reason, divergencePoints: [...] }

   created_at TIMESTAMPTZ DEFAULT NOW(),

   INDEX idx_source (source_template_id),
   INDEX idx_target (target_template_id),
   INDEX idx_type (type)
 );

 -- Event store (for operations)
 CREATE TABLE template_operations (
   id SERIAL PRIMARY KEY,
   template_id UUID REFERENCES templates(id),
   operation_id VARCHAR(100) UNIQUE NOT NULL,

   -- Operation data as JSONB
   operation JSONB NOT NULL, -- { type, target, payload, timestamp, userId }

   user_id UUID,
   created_at TIMESTAMPTZ DEFAULT NOW(),

   INDEX idx_template_time (template_id, created_at),
   INDEX idx_operation_id (operation_id)
 );

 JSONB Query Examples

 -- Find all templates with element type 'text'
 SELECT id, name
 FROM templates
 WHERE design_data @> '{"pages": [{"elements": [{"type": "text"}]}]}';

 -- Get templates with more than 5 pages
 SELECT id, name, jsonb_array_length(design_data->'pages') as page_count
 FROM templates
 WHERE jsonb_array_length(design_data->'pages') > 5;

 -- Update element property deep in structure
 UPDATE templates
 SET design_data = jsonb_set(
   design_data,
   '{pages,0,elements,0,fill}',
   '"#ff0000"'::jsonb
 )
 WHERE id = 'template-123';

 -- Add new element to page
 UPDATE templates
 SET design_data = jsonb_set(
   design_data,
   '{pages,0,elements,-1}',  -- -1 means append to array
   '{"id": "el_new", "type": "rect", "x": 100, "y": 100}'::jsonb
 )
 WHERE id = 'template-123';

 ---
 Technology Stack

 Client-Side

 - CRDT: Yjs (mature, good TypeScript support)
 - WebSocket: native WebSocket API
 - Storage: IndexedDB via Dexie.js
 - State: Keep existing useReducer (wrap with middleware)

 Server-Side (To Be Implemented)

 - Runtime: Node.js + TypeScript
 - WebSocket: ws or uWebSockets.js
 - Database: PostgreSQL (single database with hybrid approach)
   - Relational columns for metadata (id, name, author_id, created_at, etc.) - enables fast filtering/indexing
   - JSONB columns for design content (pages, elements, audioLayers) - flexible schema, JSON operations
   - Benefits: Best of both worlds - structured queries + flexible documents
 - Cache: Redis (for active templates and session data)
 - Event Store: PostgreSQL append-only table (for operation log)

 Infrastructure

 - Deployment: Docker containers
 - CDN: Cloudflare (for media assets)
 - Monitoring: Sentry (errors) + Custom metrics

 ---
 Success Metrics

 Performance Targets

 - Payload reduction: 95%+ (120KB/sec → <5KB/sec)
 - Latency: <100ms p95 for operation round-trip
 - Collaboration: 50+ concurrent users per template
 - Convergence: <1s for all clients to reach same state

 Quality Targets

 - Conflict rate: <5% of operations in multi-user mode
 - Undo/redo: Works 100% reliably
 - Data loss: 0% (event sourcing guarantees)
 - Uptime: 99.9%+ for sync server

 ---
 Risk Mitigation

 Technical Risks

 1. Complex CRDT/OT implementation → Use proven library (Yjs)
 2. WebSocket scaling → Use Redis Pub/Sub for horizontal scaling
 3. Conflict resolution UX → Auto-resolve 95%+ cases, manual for edge cases
 4. Data migration → Keep old format support, gradual migration

 Product Risks

 1. User confusion with variants → Clear UI, tooltips, onboarding
 2. Conflict fatigue → Minimize conflicts through smart merging
 3. Performance regression → A/B test, feature flags, rollback plan

 Operational Risks

 1. Server costs → Monitor usage, optimize WebSocket connections
 2. Data growth → Archive old operations, compress snapshots
 3. Support burden → Good error messages, operation inspector for debugging
