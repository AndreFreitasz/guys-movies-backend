import { WaitingMovies } from 'src/movie/entities/waiting-movie.entity';
import { WatchedMovie } from 'src/movie/entities/watched-movie.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 80, nullable: false })
  email: string;

  @Column({ type: 'varchar', length: 40, nullable: false })
  username: string;

  @Column()
  password: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @OneToMany(() => WatchedMovie, watchedMovie => watchedMovie.idUser)
  watchedMovies: WatchedMovie[];

  @OneToMany(() => WaitingMovies, waitingMovie => waitingMovie.user)
  waitingMovie: WaitingMovies[];
}
