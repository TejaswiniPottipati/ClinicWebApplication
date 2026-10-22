import { Global, Module } from '@nestjs/common';
import { CallsRepository } from './calls.repository.js';
import { MessagesRepository } from './messages.repository.js';
import { PatientsRepository } from './patients.repository.js';
import { UsersRepository } from './users.repository.js';

// Data access for the whole app. Swapping these in-memory repositories for database-backed
// ones (same method signatures) is the only change needed to add a database.
const repositories = [
  UsersRepository,
  PatientsRepository,
  MessagesRepository,
  CallsRepository,
];

@Global()
@Module({
  providers: repositories,
  exports: repositories,
})
export class DataModule {}
