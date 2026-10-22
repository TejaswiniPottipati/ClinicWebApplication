import { Controller, Get, Param, Query } from '@nestjs/common';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  CurrentUser,
  Roles,
  type AuthUser,
} from '../common/auth.decorators.js';
import { PATIENT_STATUSES, type PatientStatus } from '../common/types.js';
import { PatientsService } from './patients.service.js';

export class ListPatientsQuery {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsIn(PATIENT_STATUSES)
  status?: PatientStatus;
}

@Controller('patients')
@Roles('doctor')
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  /** The signed-in doctor's patients, optionally filtered. */
  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ListPatientsQuery) {
    return this.patients.listForDoctor(user.id, query);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.patients.getForDoctor(user.id, id);
  }
}

@Controller('me')
@Roles('patient')
export class MeController {
  constructor(private readonly patients: PatientsService) {}

  /** For a signed-in patient: themselves and their assigned doctor. */
  @Get('care-team')
  careTeam(@CurrentUser() user: AuthUser) {
    return this.patients.getCareTeam(user.id);
  }
}
