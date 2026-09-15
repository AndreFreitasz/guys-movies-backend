import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import type { Sharp } from 'sharp';
import { UserAvatar } from '../users/entities/user-avatar.entity';
import { User } from '../users/entities/user.entity';

/* eslint-disable @typescript-eslint/no-var-requires */
const sharp = require('sharp') as typeof import('sharp').default;

const AVATAR_SIZE = 512;
const AVATAR_QUALITY = 90;
const OUTPUT_TYPE = 'image/webp';
const ACCEPTED_FORMATS = ['jpeg', 'jpg', 'png', 'webp', 'avif', 'gif', 'tiff'];

export interface StoredAvatar {
  data: Buffer;
  contentType: string;
  updatedAt: Date;
}

@Injectable()
export class AvatarService {
  constructor(
    @InjectRepository(UserAvatar)
    private readonly avatarRepository: Repository<UserAvatar>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private async toSquareWebp(buffer: Buffer): Promise<Buffer> {
    let image: Sharp;
    let format: string | undefined;

    try {
      image = sharp(buffer, { failOn: 'error' });
      format = (await image.metadata()).format;
    } catch {
      throw new BadRequestException('Envie um arquivo de imagem valido');
    }

    if (!format || !ACCEPTED_FORMATS.includes(format)) {
      throw new BadRequestException('Formato de imagem nao suportado');
    }

    return image
      .rotate()
      .resize(AVATAR_SIZE, AVATAR_SIZE, {
        fit: 'cover',
        position: 'centre',
      })
      .webp({ quality: AVATAR_QUALITY })
      .toBuffer();
  }

  async save(
    userId: number,
    file: Express.Multer.File | undefined,
  ): Promise<{ updatedAt: Date }> {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Envie um arquivo de imagem');
    }

    const data = await this.toSquareWebp(file.buffer);
    const updatedAt = new Date();

    await this.avatarRepository.upsert(
      { userId, data, contentType: OUTPUT_TYPE, updatedAt },
      ['userId'],
    );

    return { updatedAt };
  }

  async remove(userId: number): Promise<void> {
    await this.avatarRepository.delete({ userId });
  }

  async findByUsername(username: string): Promise<StoredAvatar | null> {
    const owner = await this.userRepository.findOne({
      where: { username: ILike(username) },
      select: ['id'],
    });

    if (!owner) {
      throw new NotFoundException('Perfil nao encontrado');
    }

    const stored = await this.avatarRepository.findOne({
      where: { userId: owner.id },
    });

    if (!stored) return null;

    return {
      data: stored.data,
      contentType: stored.contentType,
      updatedAt: stored.updatedAt,
    };
  }
}
