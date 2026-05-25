import { Component, EventEmitter, inject, Output } from '@angular/core';
import { AuthService } from '@services/auth.service';

@Component({
  selector: 'app-get-started',
  imports: [],
  templateUrl: './get-started.component.html',
  styleUrl: './get-started.component.scss'
})
export class GetStartedComponent {
  @Output() goToNextStep = new EventEmitter<boolean>();
  public authService = inject(AuthService);

  onButtonClick(){
    this.goToNextStep.emit(true);
  }

  async onLoginClick(){
    await this.authService.onLoginClick('onboarding');
  }

}
