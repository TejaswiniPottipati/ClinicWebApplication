import { Module } from '@nestjs/common';
import { MeController, PatientsController } from './patients.controller.js';
import { PatientsService } from './patients.service.js';

@Module({
  controllers: [PatientsController, MeController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}
