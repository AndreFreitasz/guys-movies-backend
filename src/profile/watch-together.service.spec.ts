import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { WatchTogetherService } from './watch-together.service';
import { WatchTogether } from '../users/entities/watch-together.entity';
import { User } from '../users/entities/user.entity';
import { WatchedMovie } from '../movie/entities/watched-movie.entity';
import { WatchedSeason } from '../serie/entities/watched-season.entity';
import { Movies } from '../movie/entities/movies.entity';
import { Series } from '../serie/entities/series.entity';
import { UserAvatar } from '../users/entities/user-avatar.entity';

describe('WatchTogetherService', () => {
  let service: WatchTogetherService;
  let linkRepository: {
    findOne: jest.Mock;
    find: jest.Mock;
    count: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let userRepository: { findOne: jest.Mock };
  let watchedMovieRepository: {
    findOne: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
  };
  let watchedSeasonRepository: { findOne: jest.Mock; insert: jest.Mock };
  let movieRepository: { find: jest.Mock; findOne: jest.Mock };
  let serieRepository: { find: jest.Mock; findOne: jest.Mock };
  let avatarRepository: { find: jest.Mock };

  const ana = { id: 9, username: 'ana', name: 'Ana' };

  beforeEach(async () => {
    linkRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      insert: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    userRepository = { findOne: jest.fn().mockResolvedValue(ana) };
    watchedMovieRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      insert: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    watchedSeasonRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      insert: jest.fn().mockResolvedValue({}),
    };
    movieRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
    };
    serieRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
    };
    avatarRepository = { find: jest.fn().mockResolvedValue([]) };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        WatchTogetherService,
        {
          provide: getRepositoryToken(WatchTogether),
          useValue: linkRepository,
        },
        { provide: getRepositoryToken(User), useValue: userRepository },
        {
          provide: getRepositoryToken(WatchedMovie),
          useValue: watchedMovieRepository,
        },
        {
          provide: getRepositoryToken(WatchedSeason),
          useValue: watchedSeasonRepository,
        },
        { provide: getRepositoryToken(Movies), useValue: movieRepository },
        { provide: getRepositoryToken(Series), useValue: serieRepository },
        { provide: getRepositoryToken(UserAvatar), useValue: avatarRepository },
      ],
    }).compile();

    service = moduleRef.get(WatchTogetherService);
  });

  const movieTag = { type: 'movie' as const, idTmdb: 438631 };

  describe('tag', () => {
    it('rejeita marcar a si mesmo', async () => {
      userRepository.findOne.mockResolvedValue({ id: 7, username: 'andre' });

      await expect(
        service.tag(7, { ...movieTag, companionUsername: 'andre' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('estoura 404 para usuario inexistente', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.tag(7, { ...movieTag, companionUsername: 'fantasma' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejeita titulo que quem marca nao assistiu', async () => {
      watchedMovieRepository.findOne.mockResolvedValue(null);

      await expect(
        service.tag(7, { ...movieTag, companionUsername: 'ana' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('cria o vinculo pendente com a data de quem marcou', async () => {
      watchedMovieRepository.findOne.mockResolvedValue({
        id: 1,
        watchedAt: '2026-09-10',
      });

      await service.tag(7, { ...movieTag, companionUsername: 'ana' });

      expect(linkRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'movie',
          idTmdb: 438631,
          requesterId: 7,
          companionId: 9,
          status: 'pending',
          watchedAt: '2026-09-10',
        }),
      );
    });

    it('nao cria segunda linha quando a dupla ja existe na direcao inversa', async () => {
      watchedMovieRepository.findOne.mockResolvedValue({ id: 1 });
      linkRepository.findOne.mockResolvedValue({
        id: 3,
        requesterId: 9,
        companionId: 7,
        status: 'pending',
      });

      await service.tag(7, { ...movieTag, companionUsername: 'ana' });

      expect(linkRepository.insert).not.toHaveBeenCalled();
    });
  });

  describe('accept', () => {
    const pendingLink = {
      id: 3,
      type: 'movie',
      idTmdb: 438631,
      seasonNumber: null,
      requesterId: 7,
      companionId: 9,
      status: 'pending',
      watchedAt: '2026-09-10',
    };

    it('so quem foi marcado pode aceitar', async () => {
      linkRepository.findOne.mockResolvedValue(pendingLink);

      await expect(service.accept(7, 3)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('cria o registro de assistido quando falta, com a data de quem marcou', async () => {
      linkRepository.findOne.mockResolvedValue(pendingLink);
      watchedMovieRepository.findOne.mockResolvedValue(null);

      await service.accept(9, 3);

      expect(watchedMovieRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          idTmdb: 438631,
          watchedAt: '2026-09-10',
        }),
      );
      expect(linkRepository.update).toHaveBeenCalledWith(
        3,
        expect.objectContaining({ status: 'accepted' }),
      );
    });

it('grava o vinculo com o filme, senao a listagem perde titulo e poster', async () => {
      linkRepository.findOne.mockResolvedValue(pendingLink);
      watchedMovieRepository.findOne.mockResolvedValue(null);
      movieRepository.findOne = jest.fn().mockResolvedValue({ id: 77 });

      await service.accept(9, 3);

      expect(watchedMovieRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({ idMovie: { id: 77 } }),
      );
    });

    it('grava o vinculo com a serie ao aceitar uma temporada', async () => {
      linkRepository.findOne.mockResolvedValue({
        ...pendingLink,
        type: 'serie',
        seasonNumber: 2,
        episodeCount: 8,
      });
      watchedSeasonRepository.findOne.mockResolvedValue(null);
      serieRepository.findOne = jest.fn().mockResolvedValue({ id: 55 });

      await service.accept(9, 3);

      expect(watchedSeasonRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({ serie: { id: 55 } }),
      );
    });

    it('nao duplica quando a pessoa ja tinha o registro', async () => {
      linkRepository.findOne.mockResolvedValue(pendingLink);
      watchedMovieRepository.findOne.mockResolvedValue({ id: 55 });

      await service.accept(9, 3);

      expect(watchedMovieRepository.insert).not.toHaveBeenCalled();
    });

    it('grava a nota quando ela veio', async () => {
      linkRepository.findOne.mockResolvedValue(pendingLink);
      watchedMovieRepository.findOne.mockResolvedValue({ id: 55 });

      await service.accept(9, 3, 8.5);

      expect(watchedMovieRepository.update).toHaveBeenCalledWith(55, {
        rating: 8.5,
      });
    });

    it('deixa a nota em branco quando a pessoa pulou', async () => {
      linkRepository.findOne.mockResolvedValue(pendingLink);
      watchedMovieRepository.findOne.mockResolvedValue({ id: 55 });

      await service.accept(9, 3);

      expect(watchedMovieRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('reject', () => {
    it('so quem foi marcado pode recusar', async () => {
      linkRepository.findOne.mockResolvedValue({
        id: 3,
        requesterId: 7,
        companionId: 9,
        status: 'pending',
      });

      await expect(service.reject(7, 3)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('marca como recusado sem criar registro de assistido', async () => {
      linkRepository.findOne.mockResolvedValue({
        id: 3,
        requesterId: 7,
        companionId: 9,
        status: 'pending',
      });

      await service.reject(9, 3);

      expect(linkRepository.update).toHaveBeenCalledWith(
        3,
        expect.objectContaining({ status: 'rejected' }),
      );
      expect(watchedMovieRepository.insert).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('so quem marcou pode desfazer', async () => {
      linkRepository.findOne.mockResolvedValue({
        id: 3,
        requesterId: 7,
        companionId: 9,
        status: 'accepted',
      });

      await expect(service.remove(9, 3)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('apaga o vinculo', async () => {
      linkRepository.findOne.mockResolvedValue({
        id: 3,
        requesterId: 7,
        companionId: 9,
        status: 'accepted',
      });

      await service.remove(7, 3);

      expect(linkRepository.delete).toHaveBeenCalledWith(3);
    });
  });

  describe('companionsFor', () => {
    it('devolve o outro lado, seja qual for a ponta', async () => {
      linkRepository.find.mockResolvedValue([
        {
          type: 'movie',
          idTmdb: 1,
          seasonNumber: null,
          requesterId: 7,
          companionId: 9,
          requester: { username: 'andre', name: 'Andre' },
          companion: ana,
        },
        {
          type: 'movie',
          idTmdb: 2,
          seasonNumber: null,
          requesterId: 9,
          companionId: 7,
          requester: ana,
          companion: { username: 'andre', name: 'Andre' },
        },
      ]);

      const map = await service.companionsFor(7);

      expect(map.get('movie:1:')?.[0].username).toBe('ana');
      expect(map.get('movie:2:')?.[0].username).toBe('ana');
    });

    it('ignora vinculos que nao foram aceitos', async () => {
      await service.companionsFor(7);

      expect(linkRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.arrayContaining([
            expect.objectContaining({ status: 'accepted' }),
          ]),
        }),
      );
    });
  });
});
