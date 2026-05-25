export interface Timezone {
  timeZone: string;
  currentLocalTime: Date;
  currentUtcOffset: {
    seconds: number;
    milliseconds: number;
    ticks: number;
    nanoseconds: number;
  };
  standardUtcOffset: {
    seconds: number;
    milliseconds: number;
    ticks: number;
    nanoseconds: number;
  };
  hasDayLightSaving: true;
  isDayLightSavingActive: true;
  dstInterval: {
    dstName: string;
    dstOffsetToUtc: {
      seconds: number;
      milliseconds: number;
      ticks: number;
      nanoseconds: number;
    };
    dstOffsetToStandardTime: {
      seconds: number;
      milliseconds: number;
      ticks: number;
      nanoseconds: number;
    };
    dstStart: Date;
    dstEnd: Date;
    dstDuration: {
      days: number;
      nanosecondOfDay: number;
      hours: number;
      minutes: number;
      seconds: number;
      milliseconds: number;
      subsecondTicks: number;
      subsecondNanoseconds: number;
      bclCompatibleTicks: number;
      totalDays: number;
      totalHours: number;
      totalMinutes: number;
      totalSeconds: number;
      totalMilliseconds: number;
      totalTicks: number;
      totalNanoseconds: number;
    };
  };
}
