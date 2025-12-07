import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplateOperation } from './entities/template-operation.entity';
import { OperationExecutorService } from './services/operation-executor.service';

@Module({
  imports: [TypeOrmModule.forFeature([TemplateOperation])],
  providers: [OperationExecutorService],
  exports: [OperationExecutorService],
})
export class OperationsModule {}
