import { MigrationInterface, QueryRunner } from 'typeorm';
import { buildSearchName } from '../users/search-name';

export class UserSearchName1798000000000 implements MigrationInterface {
  name = 'UserSearchName1798000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "searchName" character varying(200) NOT NULL DEFAULT ''`,
    );

    const rows: { id: number; name: string | null; username: string | null }[] =
      await queryRunner.query(`SELECT "id", "name", "username" FROM "user"`);

    for (const row of rows) {
      await queryRunner.query(
        `UPDATE "user" SET "searchName" = $1 WHERE "id" = $2`,
        [buildSearchName(row.name, row.username), row.id],
      );
    }

    await queryRunner.query(
      `CREATE INDEX "IDX_user_search_name" ON "user" ("searchName")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_user_search_name"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "searchName"`);
  }
}
