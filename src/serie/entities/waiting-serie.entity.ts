import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Series } from './series.entity';

@Entity()
export class WaitingSeries {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  idTmdb: number;

  // @ManyToOne(() => User, user => user.waitingSerie)
  // user: User;

  @ManyToOne(() => Series, serie => serie.waitingSerie)
  serie: Series;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
