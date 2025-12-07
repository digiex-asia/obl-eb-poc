import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { DesignData } from '@common/types/design.types';

export interface TemplateMetadata {
  tags?: string[];
  thumbnail?: string;
  linkedComponents?: Array<{
    componentId: string;
    instanceCount: number;
  }>;
  syncSettings?: {
    autoSyncFromParent: boolean;
    lastSyncedAt?: string;
  };
}

@Entity('templates')
@Index(['authorId'])
@Index(['category'])
@Index(['createdAt'])
export class Template {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'author_id', type: 'uuid', nullable: true })
  authorId: string;

  // Self-referencing for template forks/inheritance
  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string;

  @ManyToOne(() => Template, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: Template;

  @Column({ name: 'variant_group_id', type: 'uuid', nullable: true })
  variantGroupId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index()
  category: string;

  // JSONB column for flexible design data
  @Column({ name: 'design_data', type: 'jsonb' })
  designData: DesignData;

  // JSONB column for metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: TemplateMetadata;

  // Optimistic locking version
  @VersionColumn()
  version: number;

  @Column({ name: 'is_public', type: 'boolean', default: false })
  isPublic: boolean;

  @Column({ name: 'usage_count', type: 'integer', default: 0 })
  usageCount: number;

  @Column({ type: 'float', default: 0 })
  rating: number;

  @Column({ name: 'rating_count', type: 'integer', default: 0 })
  ratingCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date;
}
