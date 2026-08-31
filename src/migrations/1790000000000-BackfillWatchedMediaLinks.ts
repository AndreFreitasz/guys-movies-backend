import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillWatchedMediaLinks1790000000000
  implements MigrationInterface
{
  name = 'BackfillWatchedMediaLinks1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "watched_movie" SET "idMovieId" = "movies"."id" FROM "movies" WHERE "watched_movie"."idMovieId" IS NULL AND "movies"."idTmdb" = "watched_movie"."idTmdb"`,
    );
    await queryRunner.query(
      `UPDATE "watched_serie" SET "serieId" = "series"."id" FROM "series" WHERE "watched_serie"."serieId" IS NULL AND "series"."idTmdb" = "watched_serie"."idTmdb"`,
    );
  }

  public async down(): Promise<void> {
    return;
  }
}
