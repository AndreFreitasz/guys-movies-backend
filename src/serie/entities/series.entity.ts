import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
} from 'typeorm';
import { WatchedSerie } from './watched-serie.entity'
import { WaitingSeries } from './waiting-serie.entity';

@Entity()
export class Series {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text' })
  overview: string;

  @Column({ type: 'date', nullable: false })
  firstAirDate: string;

  @Column({ type: 'int', nullable: true })
  idTmdb: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  posterPath: string;

  @Column({ type: 'int', nullable: true })
  numberOfSeasons: number;

  @Column({ type: 'float', nullable: true })
  voteAverage: number;

  @OneToMany(() => WatchedSerie, watchedSerie => watchedSerie.serie)
  watchedSeries: WatchedSerie[];

  @OneToMany(() => WaitingSeries, waitingSerie => waitingSerie.serie)
  waitingSerie: WaitingSeries[];
}
