import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AvatarService } from './avatar.service';
import { UserAvatar } from '../users/entities/user-avatar.entity';
import { User } from '../users/entities/user.entity';

describe('AvatarService', () => {
  let service: AvatarService;
  let avatarRepository: {
    findOne: jest.Mock;
    upsert: jest.Mock;
    delete: jest.Mock;
  };
  let userRepository: { findOne: jest.Mock };

  const pngPixel = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );

  beforeEach(async () => {
    avatarRepository = {
      findOne: jest.fn(),
      upsert: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    userRepository = { findOne: jest.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AvatarService,
        { provide: getRepositoryToken(UserAvatar), useValue: avatarRepository },
        { provide: getRepositoryToken(User), useValue: userRepository },
      ],
    }).compile();

    service = moduleRef.get(AvatarService);
  });

  describe('save', () => {
    it('rejeita quando nao veio arquivo', async () => {
      await expect(service.save(7, undefined)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejeita bytes que nao sao imagem', async () => {
      await expect(
        service.save(7, {
          buffer: Buffer.from('isto nao e uma imagem'),
          size: 21,
        } as Express.Multer.File),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('converte para webp quadrado e grava', async () => {
      const result = await service.save(7, {
        buffer: pngPixel,
        size: pngPixel.length,
      } as Express.Multer.File);

      expect(avatarRepository.upsert).toHaveBeenCalledTimes(1);
      const [row] = avatarRepository.upsert.mock.calls[0];
      expect(row.userId).toBe(7);
      expect(row.contentType).toBe('image/webp');
      expect(Buffer.isBuffer(row.data)).toBe(true);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('findByUsername', () => {
    it('devolve nulo quando o usuario nao existe', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.findByUsername('fantasma')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('devolve nulo quando o usuario nao tem foto', async () => {
      userRepository.findOne.mockResolvedValue({ id: 7 });
      avatarRepository.findOne.mockResolvedValue(null);

      await expect(service.findByUsername('andre')).resolves.toBeNull();
    });

    it('devolve os bytes da foto', async () => {
      userRepository.findOne.mockResolvedValue({ id: 7 });
      avatarRepository.findOne.mockResolvedValue({
        data: pngPixel,
        contentType: 'image/webp',
        updatedAt: new Date('2026-09-15T00:00:00.000Z'),
      });

      const found = await service.findByUsername('andre');

      expect(found?.contentType).toBe('image/webp');
      expect(found?.data).toBe(pngPixel);
    });
  });

  describe('remove', () => {
    it('apaga a foto do usuario', async () => {
      await service.remove(7);

      expect(avatarRepository.delete).toHaveBeenCalledWith({ userId: 7 });
    });
  });
});
