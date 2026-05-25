import { Component, ElementRef, inject, ViewChild } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { LandingFooterComponent } from '@components/landing-footer/landing-footer.component';
import { LandingHeaderComponent } from '@components/landing-header/landing-header.component';
import { filter } from 'rxjs';

@Component({
  selector: 'app-landing-layout',
  imports: [RouterOutlet, LandingHeaderComponent, LandingFooterComponent],
  templateUrl: './landing-layout.component.html',
  styleUrl: './landing-layout.component.scss'
})
export class LandingLayoutComponent {
  private router = inject(Router);

  @ViewChild('scrollContainer', { static: true }) scrollContainer!: ElementRef<HTMLElement>;

  constructor() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        this.scrollContainer.nativeElement.scrollTo(0, 0);
      });
  }
}
