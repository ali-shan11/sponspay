import { NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';
import { SvgIcons } from '@utils/svg-icons';

@Component({
  selector: 'app-growth',
  imports: [NgClass],
  templateUrl: './growth.component.html',
  styleUrl: './growth.component.scss'
})
export class GrowthComponent {
  @Input() value: number | null | undefined = null;
  @Input() isLoading = true;
  public svgIcon = SvgIcons;

  get trendFlow(): 'up' | 'down' | 'neutral' {
    if (this.value === null || this.value === undefined || this.value === 0) return 'neutral';
    return this.value > 0 ? 'up' : 'down';
  }

  get parsedValue(){
    if (this.value) {
      return Math.abs(this.value);
    }else{
      return 0;
    }
  }
}
