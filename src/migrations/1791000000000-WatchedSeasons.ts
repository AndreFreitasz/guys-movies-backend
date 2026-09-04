import { MigrationInterface, QueryRunner } from 'typeorm';

export class WatchedSeasons1791000000000 implements MigrationInterface {
  name = 'WatchedSeasons1791000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "series" ADD "episodeRunTime" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "watched_serie" ADD "completedAt" date`,
    );
    await queryRunner.query(
      `CREATE TABLE "watched_season" ("id" SERIAL NOT NULL, "idTmdb" integer NOT NULL, "seasonNumber" integer NOT NULL, "episodeCount" integer NOT NULL, "watchedAt" date, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer, "serieId" integer, CONSTRAINT "PK_watched_season" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "watched_season" ADD CONSTRAINT "UQ_watched_season_user_serie_number" UNIQUE ("userId", "idTmdb", "seasonNumber")`,
    );
    await queryRunner.query(
      `ALTER TABLE "watched_season" ADD CONSTRAINT "FK_watched_season_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "watched_season" ADD CONSTRAINT "FK_watched_season_serie" FOREIGN KEY ("serieId") REFERENCES "series"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `UPDATE "watched_serie" SET "completedAt" = COALESCE("watchedAt", "createdAt"::date) WHERE "completedAt" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "watched_season" DROP CONSTRAINT "FK_watched_season_serie"`,
    );
    await queryRunner.query(
      `ALTER TABLE "watched_season" DROP CONSTRAINT "FK_watched_season_user"`,
    );
    await queryRunner.query(`DROP TABLE "watched_season"`);
    await queryRunner.query(
      `ALTER TABLE "watched_serie" DROP COLUMN "completedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "series" DROP COLUMN "episodeRunTime"`,
    );
  }
}
