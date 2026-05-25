import { Component, inject, Input, OnChanges, SimpleChanges } from '@angular/core';
import { InlineSvgService } from './inline-svg.service';
import { AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-inline-svg',
  imports: [AsyncPipe],
  templateUrl: './inline-svg.component.html',
  styleUrl: './inline-svg.component.scss'
})
export class InlineSvgComponent implements OnChanges {
  @Input() src = '';
  public svgContent!: Observable<SafeHtml>;
  
  public svgService = inject(InlineSvgService);
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes?.['src']?.currentValue) {
      if (this.src) {
        this.svgContent = this.svgService.getSvg(this.src);
      }
    }
  }

}
