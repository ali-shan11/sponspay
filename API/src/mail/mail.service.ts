import { Injectable } from '@nestjs/common';
import { SendgridService } from '../sendgrid/sendgrid.service';
import { Mail } from './interfaces/mail.interface';

@Injectable()
export class MailService {
  constructor(private readonly sendgridService: SendgridService) {}

  async sendEmail(mail: Mail) {
    return await this.sendgridService.send(mail);
  }
}
