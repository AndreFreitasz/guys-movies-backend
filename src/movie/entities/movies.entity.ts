import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class Movies {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  title: string;

  @Column({ type: 'varchar', length: 400 })
  overview: string;

  @Column({ type: 'date', nullable: false })
  releaseDate: string;

  @Column({ type: 'varchar', length: 20 })
  idTmdb: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  posterPath: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  director: string;

  @Column({ type: 'float', nullable: true })
  voteAverage: number;
}