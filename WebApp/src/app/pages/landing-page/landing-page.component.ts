import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { NumberFormatPipe } from '@pipes/number-format.pipe';
import { SvgIcons } from '@utils/svg-icons';
import { LandingPageDetailResponse, MarketingNewsResponse } from '@app-types/marketing';
import { MarketingService } from '@services/marketing.service';

@Component({
    selector: 'app-landing-page',
    imports: [
    RouterLink,
    NumberFormatPipe
],
    templateUrl: './landing-page.component.html',
    styleUrl: './landing-page.component.scss'
})
export class LandingPageComponent implements OnInit, OnDestroy {
  svgIcons = SvgIcons;
  unsubscribe: Subscription[] = [];
  form: FormGroup;
  landingDetails: LandingPageDetailResponse | null = null;
  latestNews: MarketingNewsResponse[] = [];

  public marketingService = inject(MarketingService);
  public fb = inject(FormBuilder);

  constructor() {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      age: [null, Validators.required],
    })
  }
  ngOnInit(): void {
    this.getLandingPageDetails();
    // this.getLatestNews();
  }

  ngOnDestroy(): void {
    this.unsubscribe.forEach((sub:Subscription)=>{
      sub.unsubscribe();
    })
  }

  get emailControl(){
    return this.form.get('email') as FormControl;
  }
  get ageControl(){
    return this.form.get('age') as FormControl;
  }

  getLandingPageDetails(){
    this.unsubscribe.push(
      this.marketingService.getLandingPageDetails().subscribe({
        next: ((res:LandingPageDetailResponse)=>{
          this.landingDetails = res;
        }),
      })
    )
  }

  getLatestNews(){
    this.unsubscribe.push(
      this.marketingService.getLatestNews().subscribe({
        next: ((res:MarketingNewsResponse[])=>{
          this.latestNews = res;
        }),
      })
    )
  }
}
