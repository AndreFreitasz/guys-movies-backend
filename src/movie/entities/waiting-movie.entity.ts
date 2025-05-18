import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Movies } from './movies.entity';

@Entity()
export class WaitingMovies {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  idTmdb: number;

  @ManyToOne(() => User, user => user.waitingMovie)
  user: User;

  @ManyToOne(() => Movies, movie => movie.waitingMovie)
  movie: Movies;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
