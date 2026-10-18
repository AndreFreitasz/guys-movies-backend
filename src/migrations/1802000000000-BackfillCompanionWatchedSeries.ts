import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillCompanionWatchedSeries1802000000000
  implements MigrationInterface
{
  name = 'BackfillCompanionWatchedSeries1802000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "watched_serie" ("userId", "serieId", "idTmdb", "watchedAt") SELECT "ws"."userId", MIN("ws"."serieId"), "ws"."idTmdb", MIN("ws"."watchedAt") FROM "watched_season" "ws" WHERE "ws"."userId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "watched_serie" "w" WHERE "w"."userId" = "ws"."userId" AND "w"."idTmdb" = "ws"."idTmdb") GROUP BY "ws"."userId", "ws"."idTmdb"`,
    );

    await queryRunner.query(
      `UPDATE "watched_serie" "w" SET "completedAt" = COALESCE("w"."watchedAt", "w"."createdAt"::date) FROM "series" "s" WHERE "w"."completedAt" IS NULL AND "s"."idTmdb" = "w"."idTmdb" AND "s"."numberOfSeasons" > 0 AND (SELECT COUNT(*) FROM "watched_season" "ws" WHERE "ws"."userId" = "w"."userId" AND "ws"."idTmdb" = "w"."idTmdb") >= "s"."numberOfSeasons"`,
    );
  }

  public async down(): Promise<void> {
    return;
  }
}
