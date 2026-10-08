import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: { checkDatabase: jest.Mock };

  beforeEach(async () => {
    healthService = { checkDatabase: jest.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: healthService }],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it('returns ok when the database answers', async () => {
    healthService.checkDatabase.mockResolvedValue(true);

    await expect(controller.check()).resolves.toEqual({
      status: 'ok',
      database: 'up',
    });
  });

  it('fails with 503 when the database does not answer', async () => {
    healthService.checkDatabase.mockResolvedValue(false);

    await expect(controller.check()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
