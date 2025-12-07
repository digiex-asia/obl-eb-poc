import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ForkTemplateDto {
  @ApiProperty({ example: 'My Forked Template' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Forked from original with custom changes' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether to enable auto-sync from parent template',
  })
  @IsOptional()
  @IsBoolean()
  autoSyncFromParent?: boolean;
}
