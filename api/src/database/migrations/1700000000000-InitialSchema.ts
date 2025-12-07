import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create templates table
    await queryRunner.query(`
      CREATE TABLE "templates" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(255) NOT NULL,
        "description" text,
        "author_id" uuid,
        "parent_id" uuid,
        "variant_group_id" uuid,
        "category" character varying(100),
        "design_data" jsonb NOT NULL,
        "metadata" jsonb,
        "version" integer NOT NULL DEFAULT 1,
        "is_public" boolean NOT NULL DEFAULT false,
        "usage_count" integer NOT NULL DEFAULT 0,
        "rating" double precision NOT NULL DEFAULT 0,
        "rating_count" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_templates" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key for parent_id
    await queryRunner.query(`
      ALTER TABLE "templates"
      ADD CONSTRAINT "FK_templates_parent"
      FOREIGN KEY ("parent_id") REFERENCES "templates"("id")
      ON DELETE SET NULL
    `);

    // Create indexes on templates
    await queryRunner.query(
      `CREATE INDEX "IDX_templates_author_id" ON "templates" ("author_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_templates_category" ON "templates" ("category")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_templates_created_at" ON "templates" ("created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_templates_tags" ON "templates" USING GIN ((metadata->'tags'))`,
    );

    // Create components table
    await queryRunner.query(`
      CREATE TABLE "components" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(255) NOT NULL,
        "description" text,
        "type" character varying(50) NOT NULL,
        "category" character varying(100),
        "tags" text,
        "content" jsonb NOT NULL,
        "thumbnail" text,
        "version" integer NOT NULL DEFAULT 1,
        "usage_count" integer NOT NULL DEFAULT 0,
        "author_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_components" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_components_type" ON "components" ("type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_components_usage_count" ON "components" ("usage_count")`,
    );

    // Create template_operations table
    await queryRunner.query(`
      CREATE TABLE "template_operations" (
        "id" SERIAL NOT NULL,
        "template_id" uuid NOT NULL,
        "operation_id" character varying(100) NOT NULL,
        "operation" jsonb NOT NULL,
        "user_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_template_operations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_template_operations_operation_id" UNIQUE ("operation_id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "template_operations"
      ADD CONSTRAINT "FK_template_operations_template"
      FOREIGN KEY ("template_id") REFERENCES "templates"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_template_operations_template_time" ON "template_operations" ("template_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_template_operations_operation_id" ON "template_operations" ("operation_id")`,
    );

    // Create template_relationships table
    await queryRunner.query(`
      CREATE TABLE "template_relationships" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "source_template_id" uuid NOT NULL,
        "target_template_id" uuid NOT NULL,
        "type" character varying(50) NOT NULL,
        "metadata" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_template_relationships" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "template_relationships"
      ADD CONSTRAINT "FK_template_relationships_source"
      FOREIGN KEY ("source_template_id") REFERENCES "templates"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "template_relationships"
      ADD CONSTRAINT "FK_template_relationships_target"
      FOREIGN KEY ("target_template_id") REFERENCES "templates"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_template_relationships_source" ON "template_relationships" ("source_template_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_template_relationships_target" ON "template_relationships" ("target_template_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_template_relationships_type" ON "template_relationships" ("type")`,
    );

    // Create variant_groups table
    await queryRunner.query(`
      CREATE TABLE "variant_groups" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(255) NOT NULL,
        "description" text,
        "base_template_id" uuid NOT NULL,
        "variantIds" text,
        "active_variant_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_variant_groups" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "variant_groups"`);
    await queryRunner.query(`DROP TABLE "template_relationships"`);
    await queryRunner.query(`DROP TABLE "template_operations"`);
    await queryRunner.query(`DROP TABLE "components"`);
    await queryRunner.query(`DROP TABLE "templates"`);
  }
}
