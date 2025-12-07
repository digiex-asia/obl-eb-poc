import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Template } from '@modules/templates/entities/template.entity';

export type RelationshipType = 'fork' | 'variant' | 'derives-from';

export interface RelationshipMetadata {
  reason?: string;
  divergencePoints?: Array<{
    timestamp: string;
    description: string;
  }>;
}

@Entity('template_relationships')
@Index(['sourceTemplateId'])
@Index(['targetTemplateId'])
@Index(['type'])
export class TemplateRelationship {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'source_template_id', type: 'uuid' })
  sourceTemplateId: string;

  @ManyToOne(() => Template)
  @JoinColumn({ name: 'source_template_id' })
  sourceTemplate: Template;

  @Column({ name: 'target_template_id', type: 'uuid' })
  targetTemplateId: string;

  @ManyToOne(() => Template)
  @JoinColumn({ name: 'target_template_id' })
  targetTemplate: Template;

  @Column({ type: 'varchar', length: 50 })
  type: RelationshipType;

  @Column({ type: 'jsonb', nullable: true })
  metadata: RelationshipMetadata;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
