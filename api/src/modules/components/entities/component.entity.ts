import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
  Index,
} from 'typeorm';

export type ComponentType = 'element' | 'group' | 'page' | 'composition';

export interface ComponentContent {
  elements?: any[];
  page?: any;
  canvas?: { width: number; height: number };
}

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
  type: ComponentType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  // JSONB column for component content
  @Column({ type: 'jsonb' })
  content: ComponentContent;

  @Column({ type: 'text', nullable: true })
  thumbnail: string;

  @VersionColumn()
  version: number;

  @Column({ name: 'usage_count', type: 'integer', default: 0 })
  usageCount: number;

  @Column({ name: 'author_id', type: 'uuid', nullable: true })
  authorId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date;
}
