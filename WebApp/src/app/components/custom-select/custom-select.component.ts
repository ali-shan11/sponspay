import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgSelectComponent, NgSelectModule } from '@ng-select/ng-select';
import { NgClass } from '@angular/common';
import { SvgIcons } from '@utils/svg-icons';

@Component({
  selector: 'app-custom-select',
  imports: [NgSelectComponent, NgSelectModule, ReactiveFormsModule, NgClass],
  templateUrl: './custom-select.component.html',
  styleUrl: './custom-select.component.scss'
})
export class CustomSelectComponent {
  @Input() controlName: FormControl = new FormControl();
  @Input() placeholder = '';
  @Input() clearable = true;
  @Input() showImage = false;
  @Input() multipleSelection = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() data: any[] = [];
  @Input() label = '';
  @Input({required:true}) bindValue!: string;
  @Input({required:true}) bindLabel!: string;
  svgIcons = SvgIcons;
}
