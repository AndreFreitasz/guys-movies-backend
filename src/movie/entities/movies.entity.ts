import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
} from 'typeorm';
import { WatchedMovie } from './watched-movie.entity';
import { WaitingMovies } from './waiting-movie.entity';

@Entity()
export class Movies {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  title: string;

  @Column({ type: 'text' })
  overview: string;

  @Column({ type: 'date', nullable: false })
  releaseDate: string;

  @Column({ type: 'int', nullable: true })
  idTmdb: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  posterPath: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  director: string;

  @Column({ type: 'float', nullable: true })
  voteAverage: number;

  @OneToMany(() => WatchedMovie, watchedMovie => watchedMovie.idMovie)
  watchedMovies: WatchedMovie[];

  @OneToMany(() => WaitingMovies, waitingMovie => waitingMovie.movie)
  waitingMovie: WaitingMovies[];
}
