import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('variant_groups')
export class VariantGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'base_template_id', type: 'uuid' })
  baseTemplateId: string;

  @Column({ type: 'simple-array', nullable: true })
  variantIds: string[];

  @Column({ name: 'active_variant_id', type: 'uuid', nullable: true })
  activeVariantId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
