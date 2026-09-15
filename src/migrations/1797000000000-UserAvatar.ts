import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserAvatar1797000000000 implements MigrationInterface {
  name = 'UserAvatar1797000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_avatar" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "data" bytea NOT NULL, "contentType" character varying(40) NOT NULL, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_user_avatar" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_user_avatar_user" ON "user_avatar" ("userId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_avatar" ADD CONSTRAINT "FK_user_avatar_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user_avatar"`);
  }
}
