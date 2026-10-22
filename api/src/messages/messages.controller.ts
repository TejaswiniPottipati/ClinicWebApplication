import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { CurrentUser, type AuthUser } from '../common/auth.decorators.js';
import { MessagesService } from './messages.service.js';

export class SendMessageDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1, { message: 'Message cannot be empty.' })
  @MaxLength(2000)
  body: string;
}

/** A conversation is identified by its patient; both the patient and their doctor can use it. */
@Controller('conversations/:patientId/messages')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Param('patientId') patientId: string) {
    return this.messages.list(user, patientId);
  }

  @Post()
  send(
    @CurrentUser() user: AuthUser,
    @Param('patientId') patientId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messages.send(user, patientId, dto.body);
  }
}
