import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';

/** The Prisma client as a Nest provider, connected to DATABASE_URL through node-postgres. */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: ConfigService) {
    super({
      adapter: new PrismaPg({
        connectionString: config.getOrThrow<string>('DATABASE_URL'),
      }),
    });
  }

  async onModuleInit() {
    // Fail at startup, not on the first request, when the database is unreachable.
    try {
      await this.$queryRaw`SELECT 1`;
    } catch (err) {
      throw new Error(
        'Cannot connect to the database at DATABASE_URL. Is Postgres running (docker compose up -d)?',
        { cause: err },
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
