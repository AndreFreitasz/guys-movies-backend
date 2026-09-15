import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProfileCover1795000000000 implements MigrationInterface {
  name = 'ProfileCover1795000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "movies" ADD "backdropPath" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "series" ADD "backdropPath" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "coverType" character varying(8)`,
    );
    await queryRunner.query(`ALTER TABLE "user" ADD "coverTmdbId" integer`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "coverTmdbId"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "coverType"`);
    await queryRunner.query(`ALTER TABLE "series" DROP COLUMN "backdropPath"`);
    await queryRunner.query(`ALTER TABLE "movies" DROP COLUMN "backdropPath"`);
  }
}
