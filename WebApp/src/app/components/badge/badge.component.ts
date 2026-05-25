import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';
import { InlineSvgComponent } from '@components/inline-svg/inline-svg.component';
import { SvgIcons } from '@utils/svg-icons';

@Component({
  selector: 'app-badge',
  imports: [InlineSvgComponent, NgClass],
  templateUrl: './badge.component.html',
  styleUrl: './badge.component.scss'
})
export class BadgeComponent {
  @Input() badgeText = '';
  @Input() disabled = false;
  @Input() isSelected = false;
  svgIcons = SvgIcons;
}
