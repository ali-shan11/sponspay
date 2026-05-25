import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { InlineSvgComponent } from '../inline-svg/inline-svg.component';
import { SvgIcons } from '@utils/svg-icons';

@Component({
  selector: 'app-step-tracker',
  imports: [CommonModule, InlineSvgComponent],
  templateUrl: './step-tracker.component.html',
  styleUrl: './step-tracker.component.scss'
})
export class StepTrackerComponent {
  @Input() stepList: {label:string}[] = [];
  @Input() currentStep = 0;
  svgIcons = SvgIcons;
}
