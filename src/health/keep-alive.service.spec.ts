import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { KeepAliveService } from './keep-alive.service';

jest.mock('axios');

describe('KeepAliveService', () => {
  let service: KeepAliveService;
  let configService: { get: jest.Mock };
  const mockedGet = axios.get as jest.Mock;

  beforeEach(async () => {
    mockedGet.mockReset();
    configService = { get: jest.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        KeepAliveService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = moduleRef.get(KeepAliveService);
  });

  it('skips the ping when KEEP_ALIVE_URL is not set', async () => {
    configService.get.mockReturnValue(undefined);

    await service.ping();

    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('pings the health route of the configured url', async () => {
    configService.get.mockReturnValue('https://api.example.com/');
    mockedGet.mockResolvedValue({ data: { status: 'ok' } });

    await service.ping();

    expect(mockedGet).toHaveBeenCalledWith(
      'https://api.example.com/health',
      expect.objectContaining({ timeout: expect.any(Number) }),
    );
  });

  it('does not throw when the ping fails', async () => {
    configService.get.mockReturnValue('https://api.example.com');
    mockedGet.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(service.ping()).resolves.toBeUndefined();
  });
});
