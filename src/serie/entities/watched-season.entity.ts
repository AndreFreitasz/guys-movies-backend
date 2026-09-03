import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Series } from './series.entity';

@Entity()
@Unique('UQ_watched_season_user_serie_number', [
  'user',
  'idTmdb',
  'seasonNumber',
])
export class WatchedSeason {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.watchedSeasons, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Series, serie => serie.watchedSeasons, {
    onDelete: 'CASCADE',
  })
  serie: Series;

  @Column({ type: 'int' })
  idTmdb: number;

  @Column({ type: 'int' })
  seasonNumber: number;

  @Column({ type: 'int' })
  episodeCount: number;

  @Column({ type: 'date', nullable: true })
  watchedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
