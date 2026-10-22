import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { CallsModule } from './calls/calls.module.js';
import { DataModule } from './data/data.module.js';
import { MessagesModule } from './messages/messages.module.js';
import { PatientsModule } from './patients/patients.module.js';
import { RealtimeModule } from './realtime/realtime.module.js';

function validateEnv(env: Record<string, unknown>) {
  const secret = env.JWT_SECRET;
  if (typeof secret !== 'string' || secret.length < 32) {
    throw new Error(
      'JWT_SECRET must be set to at least 32 characters. Copy .env.example to .env.',
    );
  }
  return env;
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    DataModule,
    AuthModule,
    PatientsModule,
    MessagesModule,
    CallsModule,
    RealtimeModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
