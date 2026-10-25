import { Global, Module } from '@nestjs/common';
import { CallsRepository } from './calls.repository.js';
import { MessagesRepository } from './messages.repository.js';
import { PatientsRepository } from './patients.repository.js';
import {
  PrismaCallsRepository,
  PrismaMessagesRepository,
  PrismaPatientsRepository,
  PrismaUsersRepository,
} from './prisma/prisma.repositories.js';
import { PrismaService } from './prisma/prisma.service.js';
import { UsersRepository } from './users.repository.js';

// Data access for the whole app, backed by Postgres. Services depend on the abstract
// repositories only; tests swap this module for MemoryDataModule (memory/).
const repositories = [
  { provide: UsersRepository, useClass: PrismaUsersRepository },
  { provide: PatientsRepository, useClass: PrismaPatientsRepository },
  { provide: MessagesRepository, useClass: PrismaMessagesRepository },
  { provide: CallsRepository, useClass: PrismaCallsRepository },
];

@Global()
@Module({
  providers: [PrismaService, ...repositories],
  exports: repositories.map((r) => r.provide),
})
export class DataModule {}
