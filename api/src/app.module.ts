import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { typeOrmConfig } from './config/typeorm.config';
import { TemplatesModule } from './modules/templates/templates.module';
import { ComponentsModule } from './modules/components/components.module';
import { OperationsModule } from './modules/operations/operations.module';
import { CollaborationModule } from './modules/collaboration/collaboration.module';
import { VariantsModule } from './modules/variants/variants.module';
import { RelationshipsModule } from './modules/relationships/relationships.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot(typeOrmConfig),
    TemplatesModule,
    ComponentsModule,
    OperationsModule,
    CollaborationModule,
    VariantsModule,
    RelationshipsModule,
  ],
})
export class AppModule {}
