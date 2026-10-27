import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  CurrentUser,
  Roles,
  type AuthUser,
} from '../common/auth.decorators.js';
import type { CallKind, IceServer, SignalData } from '../common/types.js';
import { CallsService } from './calls.service.js';
import { TurnService } from './turn.service.js';

export class StartCallDto {
  @IsString()
  patientId: string;

  @IsIn(['audio', 'video'])
  kind: CallKind;
}

export class EndCallDto {
  /** Set when the client hangs up because media or the connection failed. */
  @IsOptional()
  @IsBoolean()
  failed?: boolean;
}

class IceCandidateDto {
  @IsString()
  @MaxLength(2000)
  candidate: string;

  @IsOptional()
  @IsString()
  sdpMid?: string | null;

  @IsOptional()
  @IsInt()
  sdpMLineIndex?: number | null;

  @IsOptional()
  @IsString()
  usernameFragment?: string | null;
}

export class SignalDto {
  @IsIn(['offer', 'answer', 'candidate'])
  type: SignalData['type'];

  @ValidateIf((o: SignalDto) => o.type !== 'candidate')
  @IsString()
  @MaxLength(100_000)
  sdp?: string;

  @ValidateIf((o: SignalDto) => o.type === 'candidate')
  @IsObject()
  @ValidateNested()
  @Type(() => IceCandidateDto)
  candidate?: IceCandidateDto;
}

@Controller('calls')
export class CallsController {
  constructor(
    private readonly calls: CallsService,
    private readonly turn: TurnService,
  ) {}

  /** A doctor rings one of their patients. */
  @Post()
  @Roles('doctor')
  start(@CurrentUser() user: AuthUser, @Body() dto: StartCallDto) {
    return this.calls.start(user, dto.patientId, dto.kind);
  }

  @Post(':id/accept')
  @Roles('patient')
  @HttpCode(200)
  accept(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.calls.accept(user, id);
  }

  @Post(':id/decline')
  @Roles('patient')
  @HttpCode(200)
  decline(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.calls.decline(user, id);
  }

  @Post(':id/end')
  @HttpCode(200)
  end(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: EndCallDto,
  ) {
    return this.calls.end(user, id, dto.failed);
  }

  /**
   * STUN/TURN servers for this call's connection. Only participants of a live call get them,
   * so TURN credentials (which cost bandwidth) aren't handed out to anyone who is signed in.
   */
  @Get(':id/ice-servers')
  async iceServers(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<{ iceServers: IceServer[] }> {
    await this.calls.assertLive(user, id);
    return { iceServers: await this.turn.iceServers() };
  }

  /** Relays WebRTC negotiation to the other participant. */
  @Post(':id/signal')
  @HttpCode(204)
  async signal(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SignalDto,
  ) {
    const data: SignalData =
      dto.type === 'candidate'
        ? { type: 'candidate', candidate: dto.candidate! }
        : { type: dto.type, sdp: dto.sdp! };
    await this.calls.signal(user, id, data);
  }
}
