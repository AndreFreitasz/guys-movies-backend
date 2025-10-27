import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Series } from './series.entity';

@Entity()
export class WatchedSerie {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.watchedSeries)
  user: User;

  @ManyToOne(() => Series, serie => serie.watchedSeries)
  serie: Series;

  @Column({ type: 'int' })
  idTmdb: number;

  @Column({ type: 'float', nullable: true })
  rating: number;

  @Column({ type: 'date', nullable: true})
  watchedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
