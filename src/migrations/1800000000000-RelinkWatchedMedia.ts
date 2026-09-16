import { MigrationInterface, QueryRunner } from 'typeorm';

export class RelinkWatchedMedia1800000000000 implements MigrationInterface {
  name = 'RelinkWatchedMedia1800000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "watched_movie" SET "idMovieId" = "movies"."id" FROM "movies" WHERE "watched_movie"."idMovieId" IS NULL AND "movies"."idTmdb" = "watched_movie"."idTmdb"`,
    );
    await queryRunner.query(
      `UPDATE "watched_serie" SET "serieId" = "series"."id" FROM "series" WHERE "watched_serie"."serieId" IS NULL AND "series"."idTmdb" = "watched_serie"."idTmdb"`,
    );
    await queryRunner.query(
      `UPDATE "watched_season" SET "serieId" = "series"."id" FROM "series" WHERE "watched_season"."serieId" IS NULL AND "series"."idTmdb" = "watched_season"."idTmdb"`,
    );
  }

  public async down(): Promise<void> {
    return;
  }
}
