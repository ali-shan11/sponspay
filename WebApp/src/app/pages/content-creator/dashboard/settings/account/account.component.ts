import { Component, inject } from '@angular/core';
import { UserData } from '@app-types/components';
import { ButtonComponent } from '@components/button/button.component';
import { CustomInputComponent } from '@components/custom-input/custom-input.component';
import { TokenService } from '@services/token.service';
import { SvgIcons } from '@utils/svg-icons';

@Component({
  selector: 'app-account',
  imports: [ButtonComponent, CustomInputComponent],
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss'
})
export class AccountComponent {
  private tokenService = inject(TokenService);

  
  public user: UserData | null = this.tokenService.getCurrentUserObj();
  public svgIcon = SvgIcons;
}
