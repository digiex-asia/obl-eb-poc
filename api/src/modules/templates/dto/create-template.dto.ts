import { IsString, IsOptional, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DesignData } from '@common/types/design.types';

export class CreateTemplateDto {
  @ApiProperty({ example: 'Modern Fashion Template' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'A sleek template for fashion brands' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'fashion' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    description: 'Design data containing canvas, pages, and audio layers',
    example: {
      canvas: { width: 800, height: 450 },
      pages: [],
      audioLayers: [],
    },
  })
  designData: DesignData;

  @ApiPropertyOptional({ example: ['minimal', 'modern'] })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
