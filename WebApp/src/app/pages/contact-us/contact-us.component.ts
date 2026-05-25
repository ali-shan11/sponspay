import { Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ContactUsService } from './contact-us.service';
import { getExample, parsePhoneNumber } from 'awesome-phonenumber';
import { ISO_3166_1_CODES } from '@utils/phone-countrycode';
import { CustomInputComponent } from '@components/custom-input/custom-input.component';
import { CustomSelectComponent } from '@components/custom-select/custom-select.component';
import { CustomTextareaComponent } from "@components/custom-textarea/custom-textarea.component";
import { ButtonComponent } from '@components/button/button.component';
import { AlertService } from '@services/alert.service';

@Component({
    selector: 'app-contact-us',
    imports: [ReactiveFormsModule, CustomInputComponent, CustomSelectComponent, CustomTextareaComponent, ButtonComponent],
    templateUrl: './contact-us.component.html',
    styleUrl: './contact-us.component.scss'
})
export class ContactUsComponent implements OnInit {
  private contactUsService = inject(ContactUsService);
  private alert = inject(AlertService);

  loading = false;
  formSubmittedSuccessfully = false; // Add this line
  countyCodes: Record<string, unknown>[] = ISO_3166_1_CODES as unknown as Record<string, unknown>[];

  firstName = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] });
  lastName = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] });
  email = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] });
  interest = new FormControl<string | null>(null, { nonNullable: true, validators: [Validators.required] });
  message = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(10), Validators.maxLength(200)] });
  phoneNumber = new FormControl('', { nonNullable: true });
  country = new FormControl('US', { nonNullable: true });

  contactForm!: FormGroup;
  interests = [
    { label: "I'm a Creator", value: 'creator' },
    { label: "I'm a Brand/Agency", value: 'brand' },
    // { label: "I'm a Platform", value: 'platform' },
    { label: "Other", value: 'other' },
  ];
  ngOnInit(): void {
    this.contactForm = new FormGroup({
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      interest: this.interest,
      message: this.message,
      phoneNumber: this.phoneNumber,
      country: this.country
    });
  }

  get isFormValid() {
    return (
      this.firstName.valid &&
      this.lastName.valid &&
      this.email.valid &&
      this.interest.valid &&
      this.message.valid && // Add this line
      (!this.phoneNumber.value || this.isPhoneValid)
    );
  }

  get isPhoneValid(): boolean {
    return !this.phoneNumber.value || parsePhoneNumber(this.phoneNumber.value, { regionCode: this.country.value }).valid;
  }

  get phoneHint(): string {
    return getExample(this.country.value).number?.national || '';
  }

  formatNumber() {
    if (!this.phoneNumber.value) return;
    const parsed = parsePhoneNumber(this.phoneNumber.value, { regionCode: this.country.value });
    if (parsed.valid) {
      this.phoneNumber.setValue(parsed.number.national);
    }
  }

  onSubmit() {
    if (!this.isFormValid || this.formSubmittedSuccessfully) return; // Prevent submission if already successful

    this.loading = true;
    const phoneData = this.phoneNumber.value ? 
      parsePhoneNumber(this.phoneNumber.value, { regionCode: this.country.value }).number?.e164 || '' : 
      '';

  const selectedCountryObj = this.countyCodes.find(c => c['code'] === this.country.value);
  const countryName = selectedCountryObj ? selectedCountryObj['country'] : this.country.value;

    this.contactUsService.contactUs({
      firstName: this.firstName.value,
      lastName: this.lastName.value,
      email: this.email.value,
      message: this.message.value,
      interest: this.interest.value ?? '',
      phoneNumber: phoneData,
      country: countryName as string,
    }).subscribe({
      next: () => {
        this.alert.success('Success','Message sent successfully!', );
        this.resetForm();
        this.formSubmittedSuccessfully = true; // Set to true on success
        this.loading = false; // Ensure loading is false
      },
      error: () => {
        // this.alert.error('Error', err.error.message || 'An error occurred');
        this.loading = false;
      },
      complete: () => {
        this.loading = false; // Always ensure loading is false
      }
    });
  }

  private resetForm() {
    this.contactForm.reset();
  }
}
