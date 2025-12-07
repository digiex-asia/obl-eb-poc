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
import { Operation } from '@common/types/design.types';

@Entity('template_operations')
@Index(['templateId', 'createdAt'])
@Index(['operationId'], { unique: true })
export class TemplateOperation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'template_id', type: 'uuid' })
  templateId: string;

  @ManyToOne(() => Template)
  @JoinColumn({ name: 'template_id' })
  template: Template;

  @Column({ name: 'operation_id', type: 'varchar', length: 100, unique: true })
  operationId: string;

  // Store operation as JSONB
  @Column({ type: 'jsonb' })
  operation: Operation;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
