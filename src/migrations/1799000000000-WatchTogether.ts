import { MigrationInterface, QueryRunner } from 'typeorm';

export class WatchTogether1799000000000 implements MigrationInterface {
  name = 'WatchTogether1799000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "watch_together" ("id" SERIAL NOT NULL, "type" character varying(8) NOT NULL, "idTmdb" integer NOT NULL, "seasonNumber" integer, "requesterId" integer NOT NULL, "companionId" integer NOT NULL, "status" character varying(10) NOT NULL DEFAULT 'pending', "watchedAt" date, "episodeCount" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "respondedAt" TIMESTAMP, CONSTRAINT "PK_watch_together" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `ALTER TABLE "watch_together" ADD CONSTRAINT "CHK_watch_together_not_self" CHECK ("requesterId" <> "companionId")`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_watch_together_pair" ON "watch_together" ("type", "idTmdb", COALESCE("seasonNumber", -1), LEAST("requesterId", "companionId"), GREATEST("requesterId", "companionId"))`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_watch_together_companion_status" ON "watch_together" ("companionId", "status")`,
    );

    await queryRunner.query(
      `ALTER TABLE "watch_together" ADD CONSTRAINT "FK_watch_together_requester" FOREIGN KEY ("requesterId") REFERENCES "user"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "watch_together" ADD CONSTRAINT "FK_watch_together_companion" FOREIGN KEY ("companionId") REFERENCES "user"("id") ON DELETE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "watch_together"`);
  }
}
