import { Injectable } from '@nestjs/common';
import { Timezone } from './interfaces/timezone.interface';
import { ConfigService } from '@nestjs/config';
import { subMinutes } from 'date-fns';

@Injectable()
export class TimeService {
  constructor(private configService: ConfigService) {}

  async getTimezoneInfo(IANATimezoneName: string): Promise<Timezone> {
    const timezoneAPIUrl = this.configService.get<string>('TIMEZONE_API_URL');
    const url = `${timezoneAPIUrl}api/timezone/zone?timeZone=${IANATimezoneName}`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
  }

  convertDateTimeToUTC(date: Date, utcOffset: number) {
    return subMinutes(date, utcOffset);
  }
}
