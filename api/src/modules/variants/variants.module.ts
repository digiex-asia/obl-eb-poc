import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VariantGroup } from './entities/variant-group.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VariantGroup])],
  controllers: [],
  providers: [],
  exports: [],
})
export class VariantsModule {}
