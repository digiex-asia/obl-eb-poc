# GraphicEditor Backend API - Technical Design Document

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [NestJS Module Structure](#nestjs-module-structure)
3. [Database Schema](#database-schema)
4. [OpenAPI Specification](#openapi-specification)
5. [Implementation Guide](#implementation-guide)
6. [WebSocket Real-Time Protocol](#websocket-real-time-protocol)

---

## 1. Architecture Overview

### Tech Stack
- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL 14+ with JSONB support
- **ORM**: TypeORM or Prisma (recommendation: Prisma for better TypeScript support)
- **Real-time**: Socket.IO (wrapper over WebSocket)
- **Cache**: Redis
- **Validation**: class-validator + class-transformer
- **API Docs**: Swagger/OpenAPI 3.0
- **Authentication**: JWT with Passport

### Architecture Pattern
```
┌─────────────────────────────────────────────────────────┐
│                    API Gateway Layer                     │
│              (NestJS Controllers + Guards)               │
└────────────────────┬────────────────────────────────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
┌───▼────┐    ┌─────▼──────┐   ┌────▼─────┐
│  REST  │    │  WebSocket │   │  GraphQL │
│  API   │    │  Gateway   │   │ (Future) │
└───┬────┘    └─────┬──────┘   └────┬─────┘
    │               │               │
┌───▼───────────────▼───────────────▼──────┐
│           Service Layer                   │
│  (Business Logic + Operations Engine)    │
└───┬───────────────┬───────────────┬──────┘
    │               │               │
┌───▼───┐    ┌─────▼──────┐   ┌────▼─────┐
│  Data │    │   Cache    │   │  Event   │
│ Access│    │   Layer    │   │  Bus     │
│(TypeORM)   │  (Redis)   │   │(Internal)│
└───┬───┘    └────────────┘   └──────────┘
    │
┌───▼────────────────────────────────────┐
│       PostgreSQL + JSONB               │
│  - Templates  - Components             │
│  - Operations - Relationships          │
└────────────────────────────────────────┘
```

### Design Principles
1. **Domain-Driven Design**: Organize by business domains (templates, components, variants)
2. **CQRS Pattern**: Separate read/write models for operations
3. **Event Sourcing**: Store all operations for audit trail
4. **Optimistic Locking**: Use version numbers to prevent conflicts

---

## 2. NestJS Module Structure

### Directory Structure
```
src/
├── app.module.ts
├── main.ts
├── config/
│   ├── database.config.ts
│   ├── redis.config.ts
│   └── swagger.config.ts
├── common/
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   ├── interceptors/
│   │   ├── logging.interceptor.ts
│   │   └── transform.interceptor.ts
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   └── api-paginated-response.decorator.ts
│   ├── dto/
│   │   ├── pagination.dto.ts
│   │   └── base-response.dto.ts
│   └── filters/
│       └── http-exception.filter.ts
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts
│   │   └── dto/
│   │       ├── login.dto.ts
│   │       └── register.dto.ts
│   ├── templates/
│   │   ├── templates.module.ts
│   │   ├── templates.controller.ts
│   │   ├── templates.service.ts
│   │   ├── templates.repository.ts
│   │   ├── entities/
│   │   │   └── template.entity.ts
│   │   ├── dto/
│   │   │   ├── create-template.dto.ts
│   │   │   ├── update-template.dto.ts
│   │   │   ├── template-response.dto.ts
│   │   │   └── page.dto.ts
│   │   └── types/
│   │       └── template.types.ts
│   ├── components/
│   │   ├── components.module.ts
│   │   ├── components.controller.ts
│   │   ├── components.service.ts
│   │   ├── components.repository.ts
│   │   ├── entities/
│   │   │   └── component.entity.ts
│   │   └── dto/
│   │       ├── create-component.dto.ts
│   │       ├── component-instance.dto.ts
│   │       └── sync-component.dto.ts
│   ├── variants/
│   │   ├── variants.module.ts
│   │   ├── variants.controller.ts
│   │   ├── variants.service.ts
│   │   ├── entities/
│   │   │   └── variant-group.entity.ts
│   │   └── dto/
│   │       ├── create-variant.dto.ts
│   │       └── variant-comparison.dto.ts
│   ├── operations/
│   │   ├── operations.module.ts
│   │   ├── operations.service.ts
│   │   ├── operations.repository.ts
│   │   ├── operation-executor.service.ts
│   │   ├── entities/
│   │   │   └── operation.entity.ts
│   │   └── dto/
│   │       ├── operation.dto.ts
│   │       └── batch-operations.dto.ts
│   ├── relationships/
│   │   ├── relationships.module.ts
│   │   ├── relationships.service.ts
│   │   └── entities/
│   │       └── relationship.entity.ts
│   └── collaboration/
│       ├── collaboration.module.ts
│       ├── collaboration.gateway.ts (WebSocket)
│       ├── collaboration.service.ts
│       ├── presence.service.ts
│       └── dto/
│           ├── join-room.dto.ts
│           └── presence-update.dto.ts
└── database/
    ├── migrations/
    ├── seeds/
    └── repositories/
        └── base.repository.ts
```

### Module Dependencies Graph
```
┌─────────────┐
│ AppModule   │
└──────┬──────┘
       │
       ├──► AuthModule
       │
       ├──► TemplatesModule ──┬──► OperationsModule
       │                      │
       │                      ├──► RelationshipsModule
       │                      │
       │                      └──► CollaborationModule
       │
       ├──► ComponentsModule ──► TemplatesModule
       │
       └──► VariantsModule ────► TemplatesModule
```

### Core Module Implementations

#### templates.module.ts
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';
import { TemplatesRepository } from './templates.repository';
import { Template } from './entities/template.entity';
import { OperationsModule } from '../operations/operations.module';
import { RelationshipsModule } from '../relationships/relationships.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Template]),
    OperationsModule,
    RelationshipsModule,
  ],
  controllers: [TemplatesController],
  providers: [TemplatesService, TemplatesRepository],
  exports: [TemplatesService],
})
export class TemplatesModule {}
```

#### operations.module.ts
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { OperationsService } from './operations.service';
import { OperationExecutorService } from './operation-executor.service';
import { OperationsRepository } from './operations.repository';
import { Operation } from './entities/operation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Operation]),
    BullModule.registerQueue({
      name: 'operations',
    }),
  ],
  providers: [
    OperationsService,
    OperationExecutorService,
    OperationsRepository,
  ],
  exports: [OperationsService, OperationExecutorService],
})
export class OperationsModule {}
```

#### collaboration.module.ts
```typescript
import { Module } from '@nestjs/common';
import { CollaborationGateway } from './collaboration.gateway';
import { CollaborationService } from './collaboration.service';
import { PresenceService } from './presence.service';
import { OperationsModule } from '../operations/operations.module';
import { TemplatesModule } from '../templates/templates.module';
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
  imports: [
    RedisModule.forRoot({
      config: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
      },
    }),
    OperationsModule,
    TemplatesModule,
  ],
  providers: [
    CollaborationGateway,
    CollaborationService,
    PresenceService,
  ],
  exports: [CollaborationService],
})
export class CollaborationModule {}
```

---

## 3. Database Schema

### PostgreSQL Schema (TypeORM Entities)

#### template.entity.ts
```typescript
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  VersionColumn,
} from 'typeorm';

@Entity('templates')
@Index(['authorId'])
@Index(['parentId'])
@Index(['variantGroupId'])
@Index(['createdAt'])
export class Template {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Relational metadata
  @Column({ name: 'author_id', type: 'uuid' })
  @Index()
  authorId: string;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  @Index()
  parentId: string;

  @Column({ name: 'variant_group_id', type: 'uuid', nullable: true })
  @Index()
  variantGroupId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index()
  category: string;

  // JSONB columns for flexible design content
  @Column({ name: 'design_data', type: 'jsonb' })
  designData: {
    pages: Page[];
    audioLayers: AudioLayer[];
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    linkedComponents?: ComponentLink[];
    syncSettings?: SyncSettings;
    tags?: string[];
  };

  // Version tracking (optimistic locking)
  @VersionColumn()
  version: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date;

  // Relations
  @ManyToOne(() => Template, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: Template;
}

// Supporting types
interface Page {
  id: string;
  duration: number;
  background: string;
  elements: DesignElement[];
  animation?: AnimationSettings;
}

interface DesignElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  opacity: number;
  text?: string;
  fontSize?: number;
  src?: string;
  animation?: AnimationSettings;
}

type ElementType = 'rect' | 'circle' | 'triangle' | 'star' |
                   'polygon' | 'heart' | 'diamond' | 'image' | 'text';

interface AnimationSettings {
  type: string;
  speed: number;
  delay: number;
  direction: 'up' | 'down' | 'left' | 'right';
  mode: 'both' | 'enter' | 'exit';
}

interface AudioLayer {
  id: string;
  clips: AudioClip[];
}

interface AudioClip {
  id: string;
  src: string;
  label: string;
  startAt: number;
  duration: number;
  offset: number;
  totalDuration: number;
}

interface ComponentLink {
  instanceId: string;
  componentId: string;
  componentVersion: number;
  pageId: string;
  insertedAt: string;
  lastSyncedAt?: string;
  syncState: 'linked' | 'outdated' | 'modified' | 'unlinked';
}

interface SyncSettings {
  autoSyncFromParent: boolean;
  autoUpdateComponents: boolean;
  lastSyncedAt?: string;
  lastSyncedVersion?: number;
}
```

#### component.entity.ts
```typescript
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('components')
@Index(['type'])
@Index(['usageCount'])
export class Component {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  type: 'element' | 'group' | 'page' | 'composition';

  @Column({ type: 'jsonb' })
  content: {
    elements?: DesignElement[];
    page?: Page;
    layoutBounds?: { width: number; height: number };
    anchorPoint?: { x: number; y: number };
  };

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ name: 'usage_count', type: 'int', default: 0 })
  @Index()
  usageCount: number;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

#### operation.entity.ts
```typescript
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Template } from '../../templates/entities/template.entity';

@Entity('template_operations')
@Index(['templateId', 'createdAt'])
@Index(['operationId'], { unique: true })
export class Operation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'template_id', type: 'uuid' })
  @Index()
  templateId: string;

  @Column({ name: 'operation_id', type: 'varchar', length: 100, unique: true })
  operationId: string;

  @Column({ type: 'jsonb' })
  operation: {
    type: OperationType;
    target: OperationTarget;
    payload: any;
    timestamp: number;
    userId?: string;
  };

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Template)
  @JoinColumn({ name: 'template_id' })
  template: Template;
}

type OperationType =
  | 'UPDATE_ELEMENT_PROPS'
  | 'UPDATE_ELEMENT_ANIMATION'
  | 'MOVE_ELEMENT'
  | 'RESIZE_ELEMENT'
  | 'ROTATE_ELEMENT'
  | 'UPDATE_PAGE_PROPS'
  | 'ADD_ELEMENT'
  | 'DELETE_ELEMENT'
  | 'ADD_PAGE'
  | 'DELETE_PAGE'
  | 'BATCH';

interface OperationTarget {
  pageId?: string;
  elementId?: string;
  audioLayerId?: string;
  audioClipId?: string;
}
```

#### relationship.entity.ts
```typescript
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Template } from '../../templates/entities/template.entity';

@Entity('template_relationships')
@Index(['sourceTemplateId'])
@Index(['targetTemplateId'])
@Index(['type'])
export class Relationship {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'source_template_id', type: 'uuid' })
  @Index()
  sourceTemplateId: string;

  @Column({ name: 'target_template_id', type: 'uuid' })
  @Index()
  targetTemplateId: string;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  type: 'fork' | 'variant' | 'derives-from' | 'supersedes';

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    reason?: string;
    divergencePoints?: DivergencePoint[];
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Template)
  @JoinColumn({ name: 'source_template_id' })
  sourceTemplate: Template;

  @ManyToOne(() => Template)
  @JoinColumn({ name: 'target_template_id' })
  targetTemplate: Template;
}

interface DivergencePoint {
  timestamp: string;
  description: string;
  changeType: 'content' | 'structure' | 'component';
}
```

#### variant-group.entity.ts
```typescript
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('variant_groups')
@Index(['baseTemplateId'])
export class VariantGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'base_template_id', type: 'uuid' })
  @Index()
  baseTemplateId: string;

  @Column({ name: 'variant_ids', type: 'simple-array' })
  variantIds: string[];

  @Column({ name: 'testing_config', type: 'jsonb', nullable: true })
  testingConfig: {
    status: 'draft' | 'active' | 'paused' | 'completed';
    startDate?: string;
    endDate?: string;
    trafficSplit: Record<string, number>;
    metrics: string[];
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

### Migration Files

#### 001_create_templates_table.ts
```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTemplatesTable1234567890123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        author_id UUID NOT NULL,
        parent_id UUID REFERENCES templates(id),
        variant_group_id UUID,
        category VARCHAR(100),
        design_data JSONB NOT NULL,
        metadata JSONB,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      );

      CREATE INDEX idx_templates_author ON templates(author_id);
      CREATE INDEX idx_templates_parent ON templates(parent_id);
      CREATE INDEX idx_templates_variant_group ON templates(variant_group_id);
      CREATE INDEX idx_templates_category ON templates(category);
      CREATE INDEX idx_templates_created ON templates(created_at DESC);

      -- JSONB indexes
      CREATE INDEX idx_templates_tags ON templates USING GIN ((metadata->'tags'));
      CREATE INDEX idx_templates_components ON templates USING GIN ((metadata->'linkedComponents'));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE templates CASCADE;`);
  }
}
```

---

## 4. OpenAPI Specification

### Full OpenAPI 3.0 Spec

```yaml
openapi: 3.0.3
info:
  title: GraphicEditor Template API
  description: |
    REST API for managing design templates with support for:
    - Template CRUD operations
    - Component library management
    - Template variants and relationships
    - Partial updates via operations
    - Real-time collaboration (WebSocket)
  version: 1.0.0
  contact:
    name: API Support
    email: api@graphiceditor.com

servers:
  - url: https://api.graphiceditor.com/v1
    description: Production server
  - url: https://staging-api.graphiceditor.com/v1
    description: Staging server
  - url: http://localhost:3000/v1
    description: Local development

tags:
  - name: Templates
    description: Template management endpoints
  - name: Components
    description: Component library endpoints
  - name: Variants
    description: Template variant management
  - name: Operations
    description: Partial update operations
  - name: Relationships
    description: Template relationship management

paths:
  /templates:
    get:
      tags: [Templates]
      summary: List templates
      description: Get paginated list of templates with optional filtering
      parameters:
        - $ref: '#/components/parameters/Page'
        - $ref: '#/components/parameters/Limit'
        - name: category
          in: query
          schema:
            type: string
          description: Filter by category
        - name: tags
          in: query
          schema:
            type: array
            items:
              type: string
          style: form
          explode: true
          description: Filter by tags (AND operation)
        - name: authorId
          in: query
          schema:
            type: string
            format: uuid
          description: Filter by author
        - name: search
          in: query
          schema:
            type: string
          description: Full-text search in name and description
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/TemplateSummary'
                  meta:
                    $ref: '#/components/schemas/PaginationMeta'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'

    post:
      tags: [Templates]
      summary: Create template
      description: Create a new template
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateTemplateDto'
      responses:
        '201':
          description: Template created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Template'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'

  /templates/{templateId}:
    parameters:
      - $ref: '#/components/parameters/TemplateId'

    get:
      tags: [Templates]
      summary: Get template by ID
      description: Retrieve full template with all pages and elements
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Template'
        '404':
          $ref: '#/components/responses/NotFound'
        '401':
          $ref: '#/components/responses/Unauthorized'

    patch:
      tags: [Templates]
      summary: Update template
      description: Update template metadata (not design content - use operations for that)
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateTemplateDto'
      responses:
        '200':
          description: Template updated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Template'
        '400':
          $ref: '#/components/responses/BadRequest'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          $ref: '#/components/responses/VersionConflict'

    delete:
      tags: [Templates]
      summary: Delete template
      description: Soft delete a template
      responses:
        '204':
          description: Template deleted successfully
        '404':
          $ref: '#/components/responses/NotFound'
        '401':
          $ref: '#/components/responses/Unauthorized'

  /templates/{templateId}/operations:
    parameters:
      - $ref: '#/components/parameters/TemplateId'

    post:
      tags: [Operations]
      summary: Apply operations
      description: |
        Apply one or more operations to modify template content.
        Supports optimistic concurrency control via baseVersion.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - operations
                - baseVersion
              properties:
                operations:
                  type: array
                  items:
                    $ref: '#/components/schemas/Operation'
                  minItems: 1
                  maxItems: 100
                baseVersion:
                  type: integer
                  description: Expected current version for optimistic locking
                  example: 42
      responses:
        '200':
          description: Operations applied successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  newVersion:
                    type: integer
                    example: 43
                  appliedOps:
                    type: array
                    items:
                      type: string
                    description: IDs of successfully applied operations
        '400':
          $ref: '#/components/responses/BadRequest'
        '409':
          description: Version conflict
          content:
            application/json:
              schema:
                type: object
                properties:
                  error:
                    type: string
                    enum: [VERSION_CONFLICT]
                  currentVersion:
                    type: integer
                  operations:
                    type: array
                    items:
                      $ref: '#/components/schemas/Operation'
                    description: Operations since baseVersion

    get:
      tags: [Operations]
      summary: Get operations
      description: Retrieve operations since a specific version (for sync/reconnection)
      parameters:
        - name: since
          in: query
          required: true
          schema:
            type: integer
          description: Get operations after this version
          example: 40
      responses:
        '200':
          description: Operations retrieved
          content:
            application/json:
              schema:
                type: object
                properties:
                  operations:
                    type: array
                    items:
                      $ref: '#/components/schemas/Operation'
                  currentVersion:
                    type: integer

  /templates/{templateId}/fork:
    parameters:
      - $ref: '#/components/parameters/TemplateId'

    post:
      tags: [Templates]
      summary: Fork template
      description: Create an independent copy with parent relationship
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - name
              properties:
                name:
                  type: string
                  maxLength: 255
                description:
                  type: string
                preserveComponentLinks:
                  type: boolean
                  default: true
                preserveParentSync:
                  type: boolean
                  default: true
      responses:
        '201':
          description: Template forked successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Template'

  /templates/{templateId}/sync:
    parameters:
      - $ref: '#/components/parameters/TemplateId'

    post:
      tags: [Templates]
      summary: Sync from parent
      description: Sync changes from parent template (for forked templates)
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - strategy
              properties:
                strategy:
                  type: string
                  enum: [fast-forward, merge, selective]
                conflictResolution:
                  type: string
                  enum: [prefer-parent, prefer-local, manual]
                  default: manual
                syncComponents:
                  type: boolean
                  default: true
      responses:
        '200':
          description: Sync completed
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  updatedTemplate:
                    $ref: '#/components/schemas/Template'
                  conflicts:
                    type: array
                    items:
                      $ref: '#/components/schemas/Conflict'
                  appliedChanges:
                    type: array
                    items:
                      $ref: '#/components/schemas/Change'

  /components:
    get:
      tags: [Components]
      summary: List components
      description: Get paginated component library
      parameters:
        - $ref: '#/components/parameters/Page'
        - $ref: '#/components/parameters/Limit'
        - name: type
          in: query
          schema:
            type: string
            enum: [element, group, page, composition]
        - name: category
          in: query
          schema:
            type: string
        - name: tags
          in: query
          schema:
            type: array
            items:
              type: string
          style: form
          explode: true
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Component'
                  meta:
                    $ref: '#/components/schemas/PaginationMeta'

    post:
      tags: [Components]
      summary: Create component
      description: Add new component to library
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateComponentDto'
      responses:
        '201':
          description: Component created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Component'

  /components/{componentId}:
    parameters:
      - name: componentId
        in: path
        required: true
        schema:
          type: string
          format: uuid

    get:
      tags: [Components]
      summary: Get component
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Component'

    patch:
      tags: [Components]
      summary: Update component
      description: Update component (affects all instances)
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                description:
                  type: string
                content:
                  type: object
      responses:
        '200':
          description: Component updated
          content:
            application/json:
              schema:
                type: object
                properties:
                  component:
                    $ref: '#/components/schemas/Component'
                  affectedInstances:
                    type: array
                    items:
                      type: object
                      properties:
                        templateId:
                          type: string
                          format: uuid
                        instanceId:
                          type: string

  /components/{componentId}/usage:
    parameters:
      - name: componentId
        in: path
        required: true
        schema:
          type: string
          format: uuid

    get:
      tags: [Components]
      summary: Get component usage
      description: List all templates using this component
      responses:
        '200':
          description: Usage information
          content:
            application/json:
              schema:
                type: object
                properties:
                  componentId:
                    type: string
                    format: uuid
                  usageCount:
                    type: integer
                  instances:
                    type: array
                    items:
                      type: object
                      properties:
                        templateId:
                          type: string
                          format: uuid
                        templateName:
                          type: string
                        instanceId:
                          type: string
                        pageId:
                          type: string
                        syncState:
                          type: string
                          enum: [linked, outdated, modified, unlinked]

  /variants:
    post:
      tags: [Variants]
      summary: Create variant
      description: Create a variant from base template
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - baseTemplateId
                - variantName
              properties:
                baseTemplateId:
                  type: string
                  format: uuid
                variantName:
                  type: string
                copyContent:
                  type: boolean
                  default: true
      responses:
        '201':
          description: Variant created
          content:
            application/json:
              schema:
                type: object
                properties:
                  variant:
                    $ref: '#/components/schemas/Template'
                  group:
                    $ref: '#/components/schemas/VariantGroup'

  /variants/compare:
    post:
      tags: [Variants]
      summary: Compare variants
      description: Get diff between two variants
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - variantAId
                - variantBId
              properties:
                variantAId:
                  type: string
                  format: uuid
                variantBId:
                  type: string
                  format: uuid
      responses:
        '200':
          description: Comparison result
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TemplateDiff'

components:
  parameters:
    TemplateId:
      name: templateId
      in: path
      required: true
      schema:
        type: string
        format: uuid
      description: Template UUID

    Page:
      name: page
      in: query
      schema:
        type: integer
        minimum: 1
        default: 1
      description: Page number

    Limit:
      name: limit
      in: query
      schema:
        type: integer
        minimum: 1
        maximum: 100
        default: 20
      description: Items per page

  schemas:
    Template:
      type: object
      required:
        - id
        - name
        - designData
        - version
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
          maxLength: 255
        description:
          type: string
        authorId:
          type: string
          format: uuid
        parentId:
          type: string
          format: uuid
          nullable: true
        variantGroupId:
          type: string
          format: uuid
          nullable: true
        category:
          type: string
        designData:
          type: object
          properties:
            pages:
              type: array
              items:
                $ref: '#/components/schemas/Page'
            audioLayers:
              type: array
              items:
                $ref: '#/components/schemas/AudioLayer'
        metadata:
          type: object
          properties:
            linkedComponents:
              type: array
              items:
                $ref: '#/components/schemas/ComponentLink'
            syncSettings:
              $ref: '#/components/schemas/SyncSettings'
            tags:
              type: array
              items:
                type: string
        version:
          type: integer
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    TemplateSummary:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        thumbnail:
          type: string
          format: uri
        category:
          type: string
        tags:
          type: array
          items:
            type: string
        authorId:
          type: string
          format: uuid
        parentId:
          type: string
          format: uuid
        updatedAt:
          type: string
          format: date-time

    Page:
      type: object
      required:
        - id
        - duration
        - background
        - elements
      properties:
        id:
          type: string
        duration:
          type: number
          minimum: 0
        background:
          type: string
        elements:
          type: array
          items:
            $ref: '#/components/schemas/DesignElement'
        animation:
          $ref: '#/components/schemas/AnimationSettings'

    DesignElement:
      type: object
      required:
        - id
        - type
        - x
        - y
        - width
        - height
      properties:
        id:
          type: string
        type:
          type: string
          enum: [rect, circle, triangle, star, polygon, heart, diamond, image, text]
        x:
          type: number
        y:
          type: number
        width:
          type: number
        height:
          type: number
        rotation:
          type: number
        fill:
          type: string
        opacity:
          type: number
          minimum: 0
          maximum: 1
        text:
          type: string
        fontSize:
          type: number
        src:
          type: string
          format: uri
        animation:
          $ref: '#/components/schemas/AnimationSettings'

    AnimationSettings:
      type: object
      properties:
        type:
          type: string
        speed:
          type: number
        delay:
          type: number
        direction:
          type: string
          enum: [up, down, left, right]
        mode:
          type: string
          enum: [both, enter, exit]

    AudioLayer:
      type: object
      properties:
        id:
          type: string
        clips:
          type: array
          items:
            $ref: '#/components/schemas/AudioClip'

    AudioClip:
      type: object
      properties:
        id:
          type: string
        src:
          type: string
          format: uri
        label:
          type: string
        startAt:
          type: number
        duration:
          type: number
        offset:
          type: number
        totalDuration:
          type: number

    Operation:
      type: object
      required:
        - id
        - type
        - target
        - payload
        - timestamp
      properties:
        id:
          type: string
          description: Unique operation ID
        type:
          type: string
          enum:
            - UPDATE_ELEMENT_PROPS
            - UPDATE_ELEMENT_ANIMATION
            - MOVE_ELEMENT
            - RESIZE_ELEMENT
            - ROTATE_ELEMENT
            - UPDATE_PAGE_PROPS
            - ADD_ELEMENT
            - DELETE_ELEMENT
            - ADD_PAGE
            - DELETE_PAGE
            - BATCH
        target:
          type: object
          properties:
            pageId:
              type: string
            elementId:
              type: string
            audioLayerId:
              type: string
            audioClipId:
              type: string
        payload:
          type: object
          description: Operation-specific payload
        timestamp:
          type: number
          description: Client timestamp
        userId:
          type: string
          format: uuid

    Component:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        description:
          type: string
        type:
          type: string
          enum: [element, group, page, composition]
        content:
          type: object
        version:
          type: integer
        usageCount:
          type: integer
        tags:
          type: array
          items:
            type: string
        category:
          type: string
        createdAt:
          type: string
          format: date-time

    ComponentLink:
      type: object
      properties:
        instanceId:
          type: string
        componentId:
          type: string
          format: uuid
        componentVersion:
          type: integer
        pageId:
          type: string
        insertedAt:
          type: string
          format: date-time
        lastSyncedAt:
          type: string
          format: date-time
        syncState:
          type: string
          enum: [linked, outdated, modified, unlinked]

    SyncSettings:
      type: object
      properties:
        autoSyncFromParent:
          type: boolean
        autoUpdateComponents:
          type: boolean
        lastSyncedAt:
          type: string
          format: date-time
        lastSyncedVersion:
          type: integer

    VariantGroup:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        description:
          type: string
        baseTemplateId:
          type: string
          format: uuid
        variantIds:
          type: array
          items:
            type: string
            format: uuid
        testingConfig:
          type: object

    TemplateDiff:
      type: object
      properties:
        templateId:
          type: string
          format: uuid
        fromVersion:
          type: integer
        toVersion:
          type: integer
        changes:
          type: array
          items:
            $ref: '#/components/schemas/Change'

    Change:
      type: object
      properties:
        type:
          type: string
        path:
          type: string
        operation:
          type: string
          enum: [add, remove, update]
        oldValue:
          type: object
        newValue:
          type: object

    Conflict:
      type: object
      properties:
        path:
          type: string
        parentValue:
          type: object
        localValue:
          type: object
        resolution:
          type: string
          enum: [parent, local, manual]

    CreateTemplateDto:
      type: object
      required:
        - name
        - designData
      properties:
        name:
          type: string
          maxLength: 255
        description:
          type: string
        category:
          type: string
        designData:
          type: object
        metadata:
          type: object

    UpdateTemplateDto:
      type: object
      properties:
        name:
          type: string
        description:
          type: string
        category:
          type: string
        metadata:
          type: object

    CreateComponentDto:
      type: object
      required:
        - name
        - type
        - content
      properties:
        name:
          type: string
        description:
          type: string
        type:
          type: string
          enum: [element, group, page, composition]
        content:
          type: object
        category:
          type: string
        tags:
          type: array
          items:
            type: string

    PaginationMeta:
      type: object
      properties:
        page:
          type: integer
        limit:
          type: integer
        total:
          type: integer
        totalPages:
          type: integer

    Error:
      type: object
      properties:
        statusCode:
          type: integer
        message:
          type: string
        error:
          type: string

  responses:
    BadRequest:
      description: Bad request
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

    Unauthorized:
      description: Unauthorized
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

    VersionConflict:
      description: Version conflict (optimistic locking)
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

security:
  - bearerAuth: []
```

---

## 5. Implementation Guide

### Core Service Implementations

#### templates.service.ts
```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Template } from './entities/template.entity';
import { CreateTemplateDto, UpdateTemplateDto } from './dto';
import { OperationsService } from '../operations/operations.service';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(Template)
    private readonly templateRepository: Repository<Template>,
    private readonly operationsService: OperationsService,
  ) {}

  async findAll(filters: {
    page?: number;
    limit?: number;
    category?: string;
    tags?: string[];
    authorId?: string;
    search?: string;
  }) {
    const { page = 1, limit = 20, category, tags, authorId, search } = filters;

    const queryBuilder = this.templateRepository
      .createQueryBuilder('template')
      .where('template.deletedAt IS NULL');

    if (category) {
      queryBuilder.andWhere('template.category = :category', { category });
    }

    if (authorId) {
      queryBuilder.andWhere('template.authorId = :authorId', { authorId });
    }

    if (tags && tags.length > 0) {
      // JSONB array contains all tags
      queryBuilder.andWhere(
        "template.metadata->'tags' @> :tags::jsonb",
        { tags: JSON.stringify(tags) }
      );
    }

    if (search) {
      queryBuilder.andWhere(
        '(template.name ILIKE :search OR template.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const [data, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('template.createdAt', 'DESC')
      .getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Template> {
    const template = await this.templateRepository.findOne({
      where: { id, deletedAt: null },
    });

    if (!template) {
      throw new NotFoundException(`Template ${id} not found`);
    }

    return template;
  }

  async create(dto: CreateTemplateDto, authorId: string): Promise<Template> {
    const template = this.templateRepository.create({
      ...dto,
      authorId,
      version: 1,
    });

    return this.templateRepository.save(template);
  }

  async update(
    id: string,
    dto: UpdateTemplateDto,
    expectedVersion?: number,
  ): Promise<Template> {
    const template = await this.findOne(id);

    // Optimistic locking check
    if (expectedVersion !== undefined && template.version !== expectedVersion) {
      throw new ConflictException({
        error: 'VERSION_CONFLICT',
        currentVersion: template.version,
        expectedVersion,
      });
    }

    Object.assign(template, dto);
    template.version += 1;

    return this.templateRepository.save(template);
  }

  async delete(id: string): Promise<void> {
    const template = await this.findOne(id);
    template.deletedAt = new Date();
    await this.templateRepository.save(template);
  }

  async fork(
    templateId: string,
    options: {
      name: string;
      description?: string;
      preserveComponentLinks?: boolean;
      preserveParentSync?: boolean;
    },
    userId: string,
  ): Promise<Template> {
    const parent = await this.findOne(templateId);

    const forked = this.templateRepository.create({
      name: options.name,
      description: options.description || `Fork of ${parent.name}`,
      authorId: userId,
      parentId: parent.id,
      designData: JSON.parse(JSON.stringify(parent.designData)), // Deep clone
      metadata: {
        ...parent.metadata,
        linkedComponents: options.preserveComponentLinks
          ? parent.metadata?.linkedComponents
          : [],
        syncSettings: {
          autoSyncFromParent: options.preserveParentSync ?? true,
          autoUpdateComponents: parent.metadata?.syncSettings?.autoUpdateComponents ?? true,
        },
      },
      version: 1,
    });

    return this.templateRepository.save(forked);
  }

  async applyOperations(
    templateId: string,
    operations: Operation[],
    baseVersion: number,
  ): Promise<{ newVersion: number; appliedOps: string[] }> {
    const template = await this.findOne(templateId);

    // Version check
    if (template.version !== baseVersion) {
      throw new ConflictException({
        error: 'VERSION_CONFLICT',
        currentVersion: template.version,
        operations: await this.operationsService.getOperationsSince(
          templateId,
          baseVersion,
        ),
      });
    }

    // Apply operations
    const appliedOps: string[] = [];
    for (const op of operations) {
      try {
        await this.operationsService.execute(template, op);
        appliedOps.push(op.id);
      } catch (error) {
        throw new ConflictException({
          error: 'OPERATION_FAILED',
          operationId: op.id,
          reason: error.message,
        });
      }
    }

    // Increment version
    template.version += 1;
    await this.templateRepository.save(template);

    // Store operations in log
    await this.operationsService.saveOperations(templateId, operations);

    return {
      newVersion: template.version,
      appliedOps,
    };
  }
}
```

#### operation-executor.service.ts
```typescript
import { Injectable } from '@nestjs/common';
import { Template } from '../templates/entities/template.entity';
import { Operation } from './entities/operation.entity';

@Injectable()
export class OperationExecutorService {
  execute(template: Template, operation: Operation): void {
    const { type, target, payload } = operation.operation;

    switch (type) {
      case 'MOVE_ELEMENT':
        this.moveElement(template, target, payload);
        break;
      case 'UPDATE_ELEMENT_PROPS':
        this.updateElementProps(template, target, payload);
        break;
      case 'UPDATE_ELEMENT_ANIMATION':
        this.updateElementAnimation(template, target, payload);
        break;
      case 'ADD_ELEMENT':
        this.addElement(template, target, payload);
        break;
      case 'DELETE_ELEMENT':
        this.deleteElement(template, target);
        break;
      case 'ADD_PAGE':
        this.addPage(template, payload);
        break;
      case 'DELETE_PAGE':
        this.deletePage(template, target);
        break;
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }

  private moveElement(template: Template, target: any, payload: any): void {
    const page = template.designData.pages.find(p => p.id === target.pageId);
    if (!page) throw new Error('Page not found');

    const element = page.elements.find(e => e.id === target.elementId);
    if (!element) throw new Error('Element not found');

    if (payload.x !== undefined) element.x = payload.x;
    if (payload.y !== undefined) element.y = payload.y;
  }

  private updateElementProps(template: Template, target: any, payload: any): void {
    const page = template.designData.pages.find(p => p.id === target.pageId);
    if (!page) throw new Error('Page not found');

    const element = page.elements.find(e => e.id === target.elementId);
    if (!element) throw new Error('Element not found');

    Object.assign(element, payload.props);
  }

  private updateElementAnimation(template: Template, target: any, payload: any): void {
    const page = template.designData.pages.find(p => p.id === target.pageId);
    if (!page) throw new Error('Page not found');

    const element = page.elements.find(e => e.id === target.elementId);
    if (!element) throw new Error('Element not found');

    element.animation = { ...element.animation, ...payload.animation };
  }

  private addElement(template: Template, target: any, payload: any): void {
    const page = template.designData.pages.find(p => p.id === target.pageId);
    if (!page) throw new Error('Page not found');

    page.elements.push(payload.element);
  }

  private deleteElement(template: Template, target: any): void {
    const page = template.designData.pages.find(p => p.id === target.pageId);
    if (!page) throw new Error('Page not found');

    const index = page.elements.findIndex(e => e.id === target.elementId);
    if (index === -1) throw new Error('Element not found');

    page.elements.splice(index, 1);
  }

  private addPage(template: Template, payload: any): void {
    template.designData.pages.push(payload.page);
  }

  private deletePage(template: Template, target: any): void {
    const index = template.designData.pages.findIndex(p => p.id === target.pageId);
    if (index === -1) throw new Error('Page not found');

    template.designData.pages.splice(index, 1);
  }
}
```

---

## 6. WebSocket Real-Time Protocol

### collaboration.gateway.ts
```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { CollaborationService } from './collaboration.service';
import { PresenceService } from './presence.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  namespace: '/collaboration',
})
@UseGuards(WsJwtGuard)
export class CollaborationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly collaborationService: CollaborationService,
    private readonly presenceService: PresenceService,
  ) {}

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    await this.presenceService.removePresence(client.id);

    // Broadcast presence update
    const room = this.getRoomFromSocket(client);
    if (room) {
      const participants = await this.presenceService.getRoomParticipants(room);
      this.server.to(room).emit('presence_update', { participants });
    }
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { templateId: string; userId: string; userName: string },
  ) {
    const room = `template:${data.templateId}`;

    // Join room
    await client.join(room);

    // Add presence
    await this.presenceService.addPresence(room, {
      socketId: client.id,
      userId: data.userId,
      userName: data.userName,
      color: this.generateUserColor(data.userId),
      cursor: { pageId: '', x: 0, y: 0, visible: false },
      selection: { elementId: null, pageId: null },
      lastSeen: Date.now(),
    });

    // Send current state to new client
    const template = await this.collaborationService.getTemplate(data.templateId);
    client.emit('connected', {
      userId: data.userId,
      state: template,
    });

    // Broadcast presence update
    const participants = await this.presenceService.getRoomParticipants(room);
    this.server.to(room).emit('presence_update', { participants });
  }

  @SubscribeMessage('apply_operations')
  async handleApplyOperations(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      templateId: string;
      operations: Operation[];
      baseVersion: number;
      userId: string;
    },
  ) {
    const room = `template:${data.templateId}`;

    try {
      // Apply operations
      const result = await this.collaborationService.applyOperations(
        data.templateId,
        data.operations,
        data.baseVersion,
      );

      // Confirm to sender
      client.emit('operations_applied', {
        operationIds: result.appliedOps,
        newVersion: result.newVersion,
        userId: data.userId,
      });

      // Broadcast to other clients
      client.to(room).emit('remote_operations', {
        operations: data.operations,
        userId: data.userId,
        newVersion: result.newVersion,
      });
    } catch (error) {
      client.emit('operation_rejected', {
        error: error.message,
        ...error.response,
      });
    }
  }

  @SubscribeMessage('cursor_update')
  async handleCursorUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      templateId: string;
      cursor: { pageId: string; x: number; y: number; visible: boolean };
    },
  ) {
    const room = `template:${data.templateId}`;

    await this.presenceService.updateCursor(client.id, data.cursor);

    // Broadcast to others (not sender)
    client.to(room).emit('cursor_update', {
      socketId: client.id,
      cursor: data.cursor,
    });
  }

  @SubscribeMessage('selection_update')
  async handleSelectionUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      templateId: string;
      selection: { elementId: string | null; pageId: string | null };
    },
  ) {
    const room = `template:${data.templateId}`;

    await this.presenceService.updateSelection(client.id, data.selection);

    client.to(room).emit('selection_update', {
      socketId: client.id,
      selection: data.selection,
    });
  }

  private getRoomFromSocket(socket: Socket): string | null {
    const rooms = Array.from(socket.rooms);
    return rooms.find(room => room.startsWith('template:')) || null;
  }

  private generateUserColor(userId: string): string {
    const colors = [
      '#ef4444', '#f97316', '#eab308', '#22c55e',
      '#3b82f6', '#a855f7', '#ec4899', '#06b6d4',
    ];
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }
}
```

### WebSocket Message Protocol

```typescript
// Client → Server Messages
interface JoinRoomMessage {
  templateId: string;
  userId: string;
  userName: string;
}

interface ApplyOperationsMessage {
  templateId: string;
  operations: Operation[];
  baseVersion: number;
  userId: string;
}

interface CursorUpdateMessage {
  templateId: string;
  cursor: {
    pageId: string;
    x: number;
    y: number;
    visible: boolean;
  };
}

interface SelectionUpdateMessage {
  templateId: string;
  selection: {
    elementId: string | null;
    pageId: string | null;
  };
}

// Server → Client Messages
interface ConnectedMessage {
  userId: string;
  state: Template;
}

interface OperationsAppliedMessage {
  operationIds: string[];
  newVersion: number;
  userId: string;
}

interface RemoteOperationsMessage {
  operations: Operation[];
  userId: string;
  newVersion: number;
}

interface OperationRejectedMessage {
  error: string;
  currentVersion?: number;
  operations?: Operation[];
}

interface PresenceUpdateMessage {
  participants: Presence[];
}

interface Presence {
  socketId: string;
  userId: string;
  userName: string;
  color: string;
  cursor: {
    pageId: string;
    x: number;
    y: number;
    visible: boolean;
  };
  selection: {
    elementId: string | null;
    pageId: string | null;
  };
  lastSeen: number;
}
```

---

## Next Steps

1. **Setup Project**: Initialize NestJS project with modules
2. **Database**: Run migrations and seed data
3. **Implement Core**: Start with Templates module
4. **Add Operations**: Implement operation executor
5. **WebSocket**: Add real-time collaboration
6. **Testing**: Write unit and integration tests
7. **Documentation**: Generate Swagger docs
8. **Deploy**: Docker containerization

Let me know if you need any clarification or want me to expand on specific sections!
