import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Movies } from './movies.entity';

@Entity()
export class WatchedMovie {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.watchedMovies)
  idUser: User;

  @ManyToOne(() => Movies, movie => movie.watchedMovies)
  idMovie: Movies;

  @Column({ type: 'int' })
  idTmdb: number;

  @Column({ type: 'float', nullable: true })
  rating: number;

  @Column({ type: 'date', nullable: true })
  watchedAt: Date;

  @Column({ type: 'int', nullable: true })
  providerId: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  watchSource: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
