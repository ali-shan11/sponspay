import { NgClass } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SvgIcons } from '@utils/svg-icons';

@Component({
  selector: 'app-custom-input',
  imports: [ReactiveFormsModule, NgClass],
  templateUrl: './custom-input.component.html',
  styleUrl: './custom-input.component.scss'
})
export class CustomInputComponent implements OnChanges {
  @Input() controlName: FormControl = new FormControl();
  @Input() type: 'text'|'number'|'email'|'password' | 'tel' = 'text';
  @Input() placeholder = '';
  @Input() disabled = false;
  @Input() label = '';
  @Input() subLabel = '';
  @Input() info = '';
  @Output() enterPressed = new EventEmitter<void>();
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
  
  onEnter() {
    this.enterPressed.emit();
  }
}
