import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { WatchedMovie } from './watched-movie.entity';

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

  @Column({ type: 'varchar', length: 20 })
  idTmdb: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  posterPath: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  director: string;

  @Column({ type: 'float', nullable: true })
  voteAverage: number;

  @OneToMany(() => WatchedMovie, watchedMovie => watchedMovie.idMovie)
  watchedMovies: WatchedMovie[];
}
