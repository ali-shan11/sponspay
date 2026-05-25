import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-custom-switch',
  imports: [ReactiveFormsModule],
  templateUrl: './custom-switch.component.html',
  styleUrl: './custom-switch.component.scss'
})
export class CustomSwitchComponent {
  @Input() controlName: FormControl = new FormControl();
  @Input() label = '';
}
