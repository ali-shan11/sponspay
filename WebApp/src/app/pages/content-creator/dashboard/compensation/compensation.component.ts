import { SvgCountryFlags, SvgIcons } from '@utils/svg-icons';
import { Component } from '@angular/core';
import { ConfigureCompensationComponent } from "./configure-compensation/configure-compensation.component";
import { CompensationAddedDialogComponent } from "./compensation-added-dialog/compensation-added-dialog.component";
import { RouterLink } from '@angular/router';
import { ButtonComponent } from '@components/button/button.component';

@Component({
  selector: 'app-compensation',
  imports: [RouterLink, ButtonComponent, ConfigureCompensationComponent, CompensationAddedDialogComponent],
  templateUrl: './compensation.component.html',
  styleUrl: './compensation.component.scss'
})
export class CompensationComponent {
  public svgIcons = SvgIcons;
  public countryIcons = SvgCountryFlags;
  public compensationList = ['1','2','3','4','5','6','7'];
  public isCompensationModalOpen = false;
  public isCompensationAddedModalOpen = false;
}
