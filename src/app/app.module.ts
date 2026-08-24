import { Module } from '@nestjs/common';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MoviesModule } from 'src/movies/movies.module';
import * as dotenv from 'dotenv';
import { SeriesModule } from 'src/series/series.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from 'src/users/entities/user.entity';
import { UsersModule } from 'src/users/users.module';
import { AuthModule } from 'src/auth/auth.module';
import { MovieModule } from 'src/movie/movie.module';
import { CreatedMovieModule } from 'src/movie/created-movie/created-movie.module';
import { WatchedMovieModule } from 'src/movie/watched-movie/watched-movie.module';
import { WaitingMovieModule } from 'src/movie/waiting-movie/waiting-movie.module';
import { SerieModule } from 'src/serie/serie.module';
import { WatchedSerieModule } from 'src/serie/watched-serie/watched-serie.module';
import { WaitingSerieModule } from 'src/serie/waiting-serie/waiting-serie.module';
import { CreatedSerieModule } from 'src/serie/created-serie/created-serie.module';
import { SearchModule } from 'src/search/search.module';

dotenv.config();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const host = configService.get<string>('DB_HOST');
        const port = Number(configService.get('DB_PORT')) || 5432;
        const username = configService.get<string>('DB_USERNAME');
        const database = configService.get<string>('DB_DATABASE');

        // Sem DB_HOST o driver pg cai no default 'localhost' e o erro que
        // aparece é um ECONNREFUSED 127.0.0.1 genérico, que não diz nada sobre
        // a causa real (variável de ambiente ausente na plataforma).
        if (!host) {
          throw new Error(
            'DB_HOST não está definida. Configure as variáveis de banco no ' +
              'painel da plataforma (DB_HOST, DB_PORT, DB_USERNAME, ' +
              'DB_PASSWORD, DB_DATABASE) e faça um novo deploy.',
          );
        }

        console.log(
          `[db] conectando em ${username}@${host}:${port}/${database}`,
        );

        return {
          type: 'postgres' as const,
          host,
          port,
          username,
          password: configService.get<string>('DB_PASSWORD'),
          database,
          ssl:
            configService.get<string>('DB_SSL') === 'true'
              ? { rejectUnauthorized: false }
              : false,
          // O schema agora vem das migrations em src/migrations. O synchronize
          // fica desligado por padrão: ligue com DB_SYNCHRONIZE=true só em
          // desenvolvimento, se quiser o comportamento antigo.
          synchronize: configService.get<string>('DB_SYNCHRONIZE') === 'true',
          migrations: [join(__dirname, '..', 'migrations', '*{.ts,.js}')],
          // Roda as migrations pendentes no boot. Desligue com
          // DB_MIGRATIONS_RUN=false se preferir rodar em um passo separado.
          migrationsRun:
            configService.get<string>('DB_MIGRATIONS_RUN') !== 'false',
          autoLoadEntities: true,
        };
      },
      inject: [ConfigService],
    }),
    MoviesModule,
    MovieModule,
    SeriesModule,
    SerieModule,
    UsersModule,
    AuthModule,
    CreatedMovieModule,
    WatchedMovieModule,
    WaitingMovieModule,
    WatchedSerieModule,
    WaitingSerieModule,
    CreatedSerieModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
