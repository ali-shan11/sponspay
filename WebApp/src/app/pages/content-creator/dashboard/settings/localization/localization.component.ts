import { Component } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { CustomSelectComponent } from '@components/custom-select/custom-select.component';
import { COUNTRIES_LIST } from '@utils/constants';
import { SvgIcons } from '@utils/svg-icons';

@Component({
  selector: 'app-localization',
  imports: [ButtonComponent, CustomSelectComponent],
  templateUrl: './localization.component.html',
  styleUrl: './localization.component.scss'
})
export class LocalizationComponent {
  public svgIcon = SvgIcons;
  public countriesList = COUNTRIES_LIST;
  public currencyList = [
    {name: 'United State Dollar (USD)'}
  ];
  public timeZoneList = [
    {name: '(GMT+03:00) Istanbul'}
  ]
}
