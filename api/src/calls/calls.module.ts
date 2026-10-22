import { Module } from '@nestjs/common';
import { MessagesModule } from '../messages/messages.module.js';
import { PatientsModule } from '../patients/patients.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { CallsController } from './calls.controller.js';
import { CallsService } from './calls.service.js';

@Module({
  imports: [PatientsModule, MessagesModule, RealtimeModule],
  controllers: [CallsController],
  providers: [CallsService],
})
export class CallsModule {}
