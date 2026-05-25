import { NgClass } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SvgIcons } from '@utils/svg-icons';

@Component({
  selector: 'app-custom-textarea',
  imports: [ReactiveFormsModule, NgClass],
  templateUrl: './custom-textarea.component.html',
  styleUrl: './custom-textarea.component.scss'
})
export class CustomTextareaComponent implements OnChanges {
  @Input() controlName: FormControl = new FormControl();
  @Input() placeholder = '';
  @Input() rows = 2;
  @Input() disabled = false;
  @Input() label = '';
  @Input() info = '';
  svgIcons = SvgIcons;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['disabled'] || changes['controlName']) {
      if (this.disabled) {
        this.controlName.disable({ emitEvent: false });
      } else {
        this.controlName.enable({ emitEvent: false });
      }
    }
  }

  get findMaxNumberOfControl(){
    const maxLengthError = this.controlName.errors?.['maxlength'];
    console.log(maxLengthError?.requiredLength)
    return maxLengthError?.requiredLength || null;
  }

  get findMinNumberOfControl(){
    const minLengthError = this.controlName.errors?.['minlength'];
    console.log(minLengthError?.requiredLength)
    return minLengthError?.requiredLength || null;
  }
}
