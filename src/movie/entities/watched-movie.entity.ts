import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Movies } from './movies.entity';

@Entity()
export class WatchedMovie {
  @PrimaryGeneratedColumn()
  id: number;

  //@ManyToOne(() => User, user => user.watchedMovies)
  //user: User;

  //@ManyToOne(() => Movies, movie => movie.watchedMovies)
  //movie: Movies;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  watchedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}