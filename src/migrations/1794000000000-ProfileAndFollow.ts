import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProfileAndFollow1794000000000 implements MigrationInterface {
  name = 'ProfileAndFollow1794000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "bio" character varying(280)`,
    );
    await queryRunner.query(
      `CREATE TABLE "follow" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "followerId" integer, "followingId" integer, CONSTRAINT "PK_follow" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_follow_follower_following" ON "follow" ("followerId", "followingId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_follow_follower" ON "follow" ("followerId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_follow_following" ON "follow" ("followingId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "follow" ADD CONSTRAINT "CHK_follow_not_self" CHECK ("followerId" <> "followingId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "follow" ADD CONSTRAINT "FK_follow_follower" FOREIGN KEY ("followerId") REFERENCES "user"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "follow" ADD CONSTRAINT "FK_follow_following" FOREIGN KEY ("followingId") REFERENCES "user"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `CREATE TABLE "favorite_title" ("id" SERIAL NOT NULL, "type" character varying(8) NOT NULL, "idTmdb" integer NOT NULL, "position" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer, CONSTRAINT "PK_favorite_title" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_favorite_user_title" ON "favorite_title" ("userId", "type", "idTmdb")`,
    );
    await queryRunner.query(
      `ALTER TABLE "favorite_title" ADD CONSTRAINT "FK_favorite_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "favorite_title"`);
    await queryRunner.query(`DROP TABLE "follow"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "bio"`);
  }
}
