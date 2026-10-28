import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { MeController, PatientsController } from './patients.controller.js';
import { PatientsService } from './patients.service.js';

@Module({
  imports: [RealtimeModule],
  controllers: [PatientsController, MeController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}
