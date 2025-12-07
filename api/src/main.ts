import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: false, // Allow additional properties for flexible JSONB data
    }),
  );

  // API prefix
  const apiPrefix = process.env.API_PREFIX || 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('GraphicEditor Template API')
    .setDescription(
      'Real-time collaborative design template backend with support for variants, components, and partial updates',
    )
    .setVersion('1.0')
    .addTag('templates', 'Template management endpoints')
    .addTag('components', 'Reusable component library')
    .addTag('variants', 'Template variants and A/B testing')
    .addTag('operations', 'Partial update operations')
    .addTag('relationships', 'Template relationships (forks, inheritance)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`\n🚀 GraphicEditor API is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log(`🔌 WebSocket namespace: http://localhost:${port}/collaboration\n`);
}

bootstrap();
