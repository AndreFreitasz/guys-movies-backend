import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export type WatchTogetherType = 'movie' | 'serie';
export type WatchTogetherStatus = 'pending' | 'accepted' | 'rejected';

@Entity()
export class WatchTogether {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 8 })
  type: WatchTogetherType;

  @Column({ type: 'int' })
  idTmdb: number;

  @Column({ type: 'int', nullable: true })
  seasonNumber: number | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requesterId' })
  requester: User;

  @Column({ type: 'int' })
  requesterId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companionId' })
  companion: User;

  @Column({ type: 'int' })
  companionId: number;

  @Column({ type: 'varchar', length: 10, default: 'pending' })
  status: WatchTogetherStatus;

  @Column({ type: 'date', nullable: true })
  watchedAt: string | null;

  @Column({ type: 'int', nullable: true })
  episodeCount: number | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  respondedAt: Date | null;
}
