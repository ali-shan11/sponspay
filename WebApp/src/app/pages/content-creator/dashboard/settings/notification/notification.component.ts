import { Component } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { CustomSwitchComponent } from '@components/custom-switch/custom-switch.component';

@Component({
  selector: 'app-notification',
  imports: [ButtonComponent, CustomSwitchComponent],
  templateUrl: './notification.component.html',
  styleUrl: './notification.component.scss'
})
export class NotificationComponent {

}
