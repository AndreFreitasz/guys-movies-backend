import { MigrationInterface, QueryRunner } from 'typeorm';

export class UniqueUsername1796000000000 implements MigrationInterface {
  name = 'UniqueUsername1796000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const duplicates: { username: string; total: string }[] =
      await queryRunner.query(
        `SELECT lower("username") AS username, COUNT(*) AS total
         FROM "user"
         GROUP BY lower("username")
         HAVING COUNT(*) > 1
         ORDER BY lower("username")`,
      );

    if (duplicates.length > 0) {
      const listed = duplicates
        .map(row => `${row.username} (${row.total})`)
        .join(', ');

      throw new Error(
        `Nao e possivel tornar o nome de usuario unico: ja existem duplicados ignorando maiusculas -> ${listed}. Renomeie esses usuarios e rode a migration de novo.`,
      );
    }

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_user_username_lower" ON "user" (lower("username"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_user_username_lower"`);
  }
}
