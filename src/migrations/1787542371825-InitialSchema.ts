import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1787542371825 implements MigrationInterface {
    name = 'InitialSchema1787542371825'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "watched_movie" ("id" SERIAL NOT NULL, "idTmdb" integer NOT NULL, "rating" double precision, "watchedAt" date, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "idUserId" integer, "idMovieId" integer, CONSTRAINT "PK_45caa57a2419b72142cda6e9e42" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "movies" ("id" SERIAL NOT NULL, "title" character varying(100) NOT NULL, "overview" text NOT NULL, "releaseDate" date NOT NULL, "idTmdb" integer, "posterPath" character varying(255), "director" character varying(80), "voteAverage" double precision, CONSTRAINT "PK_c5b2c134e871bfd1c2fe7cc3705" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "waiting_movies" ("id" SERIAL NOT NULL, "idTmdb" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer, "movieId" integer, CONSTRAINT "PK_a3ff600cb3a0d271c1836482e9b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "series" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "overview" text NOT NULL, "firstAirDate" date NOT NULL, "idTmdb" integer, "posterPath" character varying(255), "numberOfSeasons" integer, "voteAverage" double precision, CONSTRAINT "PK_e725676647382eb54540d7128ba" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "watched_serie" ("id" SERIAL NOT NULL, "idTmdb" integer NOT NULL, "rating" double precision, "watchedAt" date, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer, "serieId" integer, CONSTRAINT "PK_6d470a3fce9402da9cebc61d3f0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user" ("id" SERIAL NOT NULL, "name" character varying(120) NOT NULL, "email" character varying(80) NOT NULL, "username" character varying(40) NOT NULL, "password" character varying NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "waiting_series" ("id" SERIAL NOT NULL, "idTmdb" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer, "serieId" integer, CONSTRAINT "PK_98ecf19816ecc55a3cba45d7cfe" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "watched_movie" ADD CONSTRAINT "FK_0594d1ae614a5ddcf3a88559f2a" FOREIGN KEY ("idUserId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "watched_movie" ADD CONSTRAINT "FK_d85c999783332e2ac27e0f5c442" FOREIGN KEY ("idMovieId") REFERENCES "movies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "waiting_movies" ADD CONSTRAINT "FK_544e7a233d6a9e7a3fdfe9efea7" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "waiting_movies" ADD CONSTRAINT "FK_0d8ce0e62c41a074353df3e8c1d" FOREIGN KEY ("movieId") REFERENCES "movies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "watched_serie" ADD CONSTRAINT "FK_4f5fd830e5d45bdd7e23776066b" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "watched_serie" ADD CONSTRAINT "FK_e2fa98bfcd1cc53af83c982dd27" FOREIGN KEY ("serieId") REFERENCES "series"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "waiting_series" ADD CONSTRAINT "FK_68eb3eaadb5c1960bfd926731a9" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "waiting_series" ADD CONSTRAINT "FK_f4272abb243edb608b12404c7b0" FOREIGN KEY ("serieId") REFERENCES "series"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "waiting_series" DROP CONSTRAINT "FK_f4272abb243edb608b12404c7b0"`);
        await queryRunner.query(`ALTER TABLE "waiting_series" DROP CONSTRAINT "FK_68eb3eaadb5c1960bfd926731a9"`);
        await queryRunner.query(`ALTER TABLE "watched_serie" DROP CONSTRAINT "FK_e2fa98bfcd1cc53af83c982dd27"`);
        await queryRunner.query(`ALTER TABLE "watched_serie" DROP CONSTRAINT "FK_4f5fd830e5d45bdd7e23776066b"`);
        await queryRunner.query(`ALTER TABLE "waiting_movies" DROP CONSTRAINT "FK_0d8ce0e62c41a074353df3e8c1d"`);
        await queryRunner.query(`ALTER TABLE "waiting_movies" DROP CONSTRAINT "FK_544e7a233d6a9e7a3fdfe9efea7"`);
        await queryRunner.query(`ALTER TABLE "watched_movie" DROP CONSTRAINT "FK_d85c999783332e2ac27e0f5c442"`);
        await queryRunner.query(`ALTER TABLE "watched_movie" DROP CONSTRAINT "FK_0594d1ae614a5ddcf3a88559f2a"`);
        await queryRunner.query(`DROP TABLE "waiting_series"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TABLE "watched_serie"`);
        await queryRunner.query(`DROP TABLE "series"`);
        await queryRunner.query(`DROP TABLE "waiting_movies"`);
        await queryRunner.query(`DROP TABLE "movies"`);
        await queryRunner.query(`DROP TABLE "watched_movie"`);
    }

}
