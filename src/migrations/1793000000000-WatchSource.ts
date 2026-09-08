import { MigrationInterface, QueryRunner } from 'typeorm';

export class WatchSource1793000000000 implements MigrationInterface {
  name = 'WatchSource1793000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "watched_movie" ADD "providerId" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "watched_movie" ADD "watchSource" character varying(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "watched_serie" ADD "providerId" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "watched_serie" ADD "watchSource" character varying(20)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "watched_serie" DROP COLUMN "watchSource"`,
    );
    await queryRunner.query(
      `ALTER TABLE "watched_serie" DROP COLUMN "providerId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "watched_movie" DROP COLUMN "watchSource"`,
    );
    await queryRunner.query(
      `ALTER TABLE "watched_movie" DROP COLUMN "providerId"`,
    );
  }
}
