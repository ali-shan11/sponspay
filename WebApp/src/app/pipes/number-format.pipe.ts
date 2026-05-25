import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'numberFormat'
})
export class NumberFormatPipe implements PipeTransform {

  transform(value: number|null|undefined): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (value < 1000) return value.toString();
    if (value < 1000000) return (value / 1000).toFixed(1) + 'K';
    if (value < 1000000000) return (value / 1000000).toFixed(1) + 'M';
    return (value / 1000000000).toFixed(1) + 'B';
  }

}
