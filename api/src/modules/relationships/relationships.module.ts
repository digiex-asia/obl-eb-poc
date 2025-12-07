import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplateRelationship } from './entities/template-relationship.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TemplateRelationship])],
  controllers: [],
  providers: [],
  exports: [],
})
export class RelationshipsModule {}
