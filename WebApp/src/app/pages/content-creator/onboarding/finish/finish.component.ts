import { NgClass } from '@angular/common';
import { Component, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TermsResponse } from '@app-types/onboarding';
import { OnboardingService } from '@services/onboarding.service';

@Component({
  selector: 'app-finish',
  imports: [FormsModule, NgClass],
  templateUrl: './finish.component.html',
  styleUrl: './finish.component.scss'
})
export class FinishComponent implements OnInit {
  @Output() acceptedTerms = new EventEmitter<number>();
  private onboardingService = inject(OnboardingService);
  private sanitizer = inject(DomSanitizer);
  conditionsAccepted = false;
  termsHtml!: SafeHtml;
  termsVersion = 0;

  ngOnInit(): void {
    this.getTerms();
  }

  getTerms(){
    this.onboardingService.getTermsHtml().subscribe({
      next: (res:TermsResponse) => {
        this.termsVersion = res.version;
        this.termsHtml = this.sanitizer.bypassSecurityTrustHtml(res.html);
      },
      error: (err) => {
        console.error('Failed to load terms:', err);
      }
    })
  }

  acceptTermsChange(){
    this.acceptedTerms.emit(this.conditionsAccepted ? this.termsVersion : 0);
  }
}
