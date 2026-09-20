import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeasonRuntimeMinutes1801000000000 implements MigrationInterface {
  name = 'SeasonRuntimeMinutes1801000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "watched_season" ADD "runtimeMinutes" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "watched_season" DROP COLUMN "runtimeMinutes"`,
    );
  }
}
