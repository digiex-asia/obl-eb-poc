import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TemplatesService } from './services/templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { ApplyOperationsDto } from './dto/apply-operations.dto';
import { ForkTemplateDto } from './dto/fork-template.dto';

@ApiTags('templates')
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new template' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  create(@Body() createTemplateDto: CreateTemplateDto) {
    return this.templatesService.create(createTemplateDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all templates with optional filters' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'tags', required: false, type: [String] })
  @ApiQuery({ name: 'isPublic', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  findAll(
    @Query('category') category?: string,
    @Query('tags') tags?: string | string[],
    @Query('isPublic') isPublic?: boolean,
  ) {
    const tagsArray = Array.isArray(tags) ? tags : tags ? [tags] : undefined;
    return this.templatesService.findAll({
      category,
      tags: tagsArray,
      isPublic,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a template by ID' })
  @ApiParam({ name: 'id', description: 'Template UUID' })
  @ApiResponse({ status: 200, description: 'Template found' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update template metadata' })
  @ApiParam({ name: 'id', description: 'Template UUID' })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  update(@Param('id') id: string, @Body() updateTemplateDto: UpdateTemplateDto) {
    return this.templatesService.update(id, updateTemplateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a template' })
  @ApiParam({ name: 'id', description: 'Template UUID' })
  @ApiResponse({ status: 204, description: 'Template deleted successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  remove(@Param('id') id: string) {
    return this.templatesService.remove(id);
  }

  @Post(':id/operations')
  @ApiOperation({
    summary: 'Apply partial updates via operations',
    description:
      'Execute a batch of operations on the template design data with optimistic locking',
  })
  @ApiParam({ name: 'id', description: 'Template UUID' })
  @ApiResponse({
    status: 200,
    description: 'Operations applied successfully',
    schema: {
      properties: {
        template: { type: 'object' },
        appliedOps: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Version conflict - template was modified',
  })
  applyOperations(
    @Param('id') id: string,
    @Body() applyOperationsDto: ApplyOperationsDto,
  ) {
    return this.templatesService.applyOperations(id, applyOperationsDto);
  }

  @Post(':id/fork')
  @ApiOperation({
    summary: 'Fork a template',
    description: 'Create a copy of a template with parent-child relationship',
  })
  @ApiParam({ name: 'id', description: 'Parent template UUID' })
  @ApiResponse({ status: 201, description: 'Template forked successfully' })
  @ApiResponse({ status: 404, description: 'Parent template not found' })
  fork(@Param('id') id: string, @Body() forkTemplateDto: ForkTemplateDto) {
    return this.templatesService.fork(id, forkTemplateDto);
  }

  @Get(':id/relationships')
  @ApiOperation({
    summary: 'Get template relationships',
    description:
      'Get parent template, child forks, and variants for a template',
  })
  @ApiParam({ name: 'id', description: 'Template UUID' })
  @ApiResponse({
    status: 200,
    description: 'Relationships retrieved successfully',
  })
  getRelationships(@Param('id') id: string) {
    return this.templatesService.getRelatedTemplates(id);
  }
}
