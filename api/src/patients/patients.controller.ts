import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  CurrentUser,
  Roles,
  type AuthUser,
} from '../common/auth.decorators.js';
import {
  MEDICATION_ROUTES,
  PATIENT_STATUSES,
  type MedicationRoute,
  type PatientStatus,
} from '../common/types.js';
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

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class PrescribeDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  dosage: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  frequency: string;

  @IsIn(MEDICATION_ROUTES)
  route: MedicationRoute;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  instructions?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startedOn must be YYYY-MM-DD' })
  @IsISO8601({ strict: true })
  startedOn?: string;
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

  /** Adds a prescription to the patient's record. */
  @Post(':id/medications')
  prescribe(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() rx: PrescribeDto,
  ) {
    return this.patients.prescribe(user, id, rx);
  }

  @Post(':id/medications/:medicationId/discontinue')
  @HttpCode(200)
  discontinue(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('medicationId') medicationId: string,
  ) {
    return this.patients.discontinue(user, id, medicationId);
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
