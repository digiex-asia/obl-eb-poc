import { IsArray, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Operation } from '@common/types/design.types';

export class ApplyOperationsDto {
  @ApiProperty({
    description: 'Array of operations to apply',
    example: [
      {
        id: 'op_123',
        type: 'update_element',
        target: { pageId: 'page_1', elementId: 'el_1' },
        payload: { x: 150, y: 200 },
        timestamp: Date.now(),
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  operations: Operation[];

  @ApiProperty({
    description: 'Base version for optimistic locking',
    example: 5,
  })
  @IsNumber()
  baseVersion: number;
}
