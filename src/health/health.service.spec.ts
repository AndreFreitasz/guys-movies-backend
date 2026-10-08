import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;
  let dataSource: { query: jest.Mock };

  beforeEach(async () => {
    dataSource = { query: jest.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: getDataSourceToken(), useValue: dataSource },
      ],
    }).compile();

    service = moduleRef.get(HealthService);
  });

  it('runs SELECT 1 against the database', async () => {
    dataSource.query.mockResolvedValue([{ '1': 1 }]);

    await service.checkDatabase();

    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
  });

  it('reports the database as up when the query succeeds', async () => {
    dataSource.query.mockResolvedValue([{ '1': 1 }]);

    await expect(service.checkDatabase()).resolves.toBe(true);
  });

  it('reports the database as down when the query fails', async () => {
    dataSource.query.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(service.checkDatabase()).resolves.toBe(false);
  });
});
