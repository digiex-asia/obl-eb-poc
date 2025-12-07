import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Template } from '../entities/template.entity';
import { CreateTemplateDto } from '../dto/create-template.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';
import { ApplyOperationsDto } from '../dto/apply-operations.dto';
import { ForkTemplateDto } from '../dto/fork-template.dto';
import { Operation } from '@common/types/design.types';
import { OperationExecutorService } from '@modules/operations/services/operation-executor.service';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(Template)
    private readonly templatesRepository: Repository<Template>,
    private readonly operationExecutor: OperationExecutorService,
  ) {}

  async create(createTemplateDto: CreateTemplateDto): Promise<Template> {
    const template = this.templatesRepository.create({
      name: createTemplateDto.name,
      description: createTemplateDto.description,
      category: createTemplateDto.category,
      designData: createTemplateDto.designData,
      isPublic: createTemplateDto.isPublic ?? false,
      metadata: {
        tags: createTemplateDto.tags || [],
      },
    });

    return this.templatesRepository.save(template);
  }

  async findAll(filters?: {
    category?: string;
    tags?: string[];
    isPublic?: boolean;
  }): Promise<Template[]> {
    const query = this.templatesRepository
      .createQueryBuilder('template')
      .where('template.deleted_at IS NULL');

    if (filters?.category) {
      query.andWhere('template.category = :category', {
        category: filters.category,
      });
    }

    if (filters?.isPublic !== undefined) {
      query.andWhere('template.is_public = :isPublic', {
        isPublic: filters.isPublic,
      });
    }

    if (filters?.tags && filters.tags.length > 0) {
      query.andWhere("template.metadata->'tags' ?| array[:...tags]", {
        tags: filters.tags,
      });
    }

    query.orderBy('template.created_at', 'DESC');

    return query.getMany();
  }

  async findOne(id: string): Promise<Template> {
    const template = await this.templatesRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return template;
  }

  async update(
    id: string,
    updateTemplateDto: UpdateTemplateDto,
  ): Promise<Template> {
    const template = await this.findOne(id);

    // Update metadata fields
    if (updateTemplateDto.name) template.name = updateTemplateDto.name;
    if (updateTemplateDto.description)
      template.description = updateTemplateDto.description;
    if (updateTemplateDto.category)
      template.category = updateTemplateDto.category;
    if (updateTemplateDto.isPublic !== undefined)
      template.isPublic = updateTemplateDto.isPublic;

    // Update tags in metadata
    if (updateTemplateDto.tags) {
      template.metadata = {
        ...template.metadata,
        tags: updateTemplateDto.tags,
      };
    }

    return this.templatesRepository.save(template);
  }

  async remove(id: string): Promise<void> {
    const template = await this.findOne(id);
    template.deletedAt = new Date();
    await this.templatesRepository.save(template);
  }

  async applyOperations(
    id: string,
    applyOperationsDto: ApplyOperationsDto,
  ): Promise<{ template: Template; appliedOps: string[] }> {
    const template = await this.findOne(id);

    // Optimistic locking check
    if (template.version !== applyOperationsDto.baseVersion) {
      throw new ConflictException({
        error: 'VERSION_CONFLICT',
        message: 'Template has been modified by another user',
        currentVersion: template.version,
        requestedVersion: applyOperationsDto.baseVersion,
      });
    }

    // Execute operations
    const appliedOps: string[] = [];
    let updatedDesignData = { ...template.designData };

    for (const operation of applyOperationsDto.operations) {
      try {
        updatedDesignData = this.operationExecutor.execute(
          updatedDesignData,
          operation,
        );
        appliedOps.push(operation.id);
      } catch (error) {
        throw new BadRequestException({
          error: 'OPERATION_FAILED',
          message: `Failed to execute operation ${operation.id}`,
          details: error.message,
        });
      }
    }

    // Save updated design data (version will auto-increment)
    template.designData = updatedDesignData;
    const savedTemplate = await this.templatesRepository.save(template);

    return {
      template: savedTemplate,
      appliedOps,
    };
  }

  async fork(id: string, forkDto: ForkTemplateDto): Promise<Template> {
    const parentTemplate = await this.findOne(id);

    const forkedTemplate = this.templatesRepository.create({
      name: forkDto.name,
      description: forkDto.description,
      parentId: parentTemplate.id,
      category: parentTemplate.category,
      designData: { ...parentTemplate.designData }, // Deep copy
      metadata: {
        ...parentTemplate.metadata,
        syncSettings: {
          autoSyncFromParent: forkDto.autoSyncFromParent ?? false,
          lastSyncedAt: new Date().toISOString(),
        },
      },
      isPublic: false, // Forks start as private
    });

    return this.templatesRepository.save(forkedTemplate);
  }

  async getRelatedTemplates(id: string): Promise<{
    parent: Template | null;
    children: Template[];
    variants: Template[];
  }> {
    const template = await this.findOne(id);

    const parent = template.parentId
      ? await this.templatesRepository.findOne({
          where: { id: template.parentId, deletedAt: IsNull() },
        })
      : null;

    const children = await this.templatesRepository.find({
      where: { parentId: id, deletedAt: IsNull() },
    });

    const variants = template.variantGroupId
      ? await this.templatesRepository.find({
          where: {
            variantGroupId: template.variantGroupId,
            deletedAt: IsNull(),
          },
        })
      : [];

    return { parent, children, variants };
  }
}
