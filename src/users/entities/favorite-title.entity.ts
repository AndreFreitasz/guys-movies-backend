import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';

export type FavoriteType = 'movie' | 'serie';

@Entity()
@Unique('UQ_favorite_user_title', ['user', 'type', 'idTmdb'])
export class FavoriteTitle {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.favoriteTitles, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'varchar', length: 8 })
  type: FavoriteType;

  @Column({ type: 'int' })
  idTmdb: number;

  @Column({ type: 'int' })
  position: number;

  @CreateDateColumn()
  createdAt: Date;
}
