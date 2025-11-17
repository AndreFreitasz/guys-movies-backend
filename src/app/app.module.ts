import { Module } from '@nestjs/common';
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
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        synchronize: true,
        autoLoadEntities: true,
      }),
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
