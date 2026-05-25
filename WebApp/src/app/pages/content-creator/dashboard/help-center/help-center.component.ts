import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SvgIcons } from '@utils/svg-icons';
import { Component } from '@angular/core';
import { CustomInputComponent } from '@components/custom-input/custom-input.component';
import { ButtonComponent } from '@components/button/button.component';

@Component({
  selector: 'app-help-center',
  imports: [NgbModule, CustomInputComponent, ButtonComponent],
  templateUrl: './help-center.component.html',
  styleUrl: './help-center.component.scss'
})
export class HelpCenterComponent {
  svgIcon = SvgIcons;
}
