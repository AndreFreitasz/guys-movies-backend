import { ConfigService } from '@nestjs/config';

export const DEFAULT_SESSION_TTL_SECONDS = 604800;

export const resolveSessionTtlSeconds = (
  configService: ConfigService,
): number => {
  const configured = Number(configService.get<string>('JWT_EXPIRATION_TIME'));

  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_SESSION_TTL_SECONDS;
};
