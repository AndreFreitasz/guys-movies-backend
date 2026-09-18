import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';

const PING_TIMEOUT_MS = 10000;

@Injectable()
export class KeepAliveService {
  private readonly logger = new Logger(KeepAliveService.name);

  constructor(private readonly configService: ConfigService) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async ping(): Promise<void> {
    const baseUrl = this.configService.get<string>('KEEP_ALIVE_URL');
    if (!baseUrl) {
      return;
    }

    const healthUrl = `${baseUrl.replace(/\/+$/, '')}/health`;

    try {
      await axios.get(healthUrl, { timeout: PING_TIMEOUT_MS });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Keep-alive ping to ${healthUrl} failed: ${reason}`);
    }
  }
}
