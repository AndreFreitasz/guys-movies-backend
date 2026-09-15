import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from './user.entity';

@Entity()
@Unique('UQ_follow_follower_following', ['follower', 'following'])
export class Follow {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('IDX_follow_follower')
  @ManyToOne(() => User, user => user.following, { onDelete: 'CASCADE' })
  follower: User;

  @Index('IDX_follow_following')
  @ManyToOne(() => User, user => user.followers, { onDelete: 'CASCADE' })
  following: User;

  @CreateDateColumn()
  createdAt: Date;
}
