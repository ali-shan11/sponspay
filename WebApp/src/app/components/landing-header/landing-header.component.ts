import { NgClass, NgTemplateOutlet } from '@angular/common';
import { Component, HostListener, inject, OnInit } from '@angular/core';
import { CreatorSignInResponse } from '@app-types/onboarding';
import { AuthService } from '@services/auth.service';
import { RouterLink, RouterLinkActive } from "@angular/router";
import { UserData } from '@app-types/components';
import { TokenService } from '@services/token.service';
import { InlineSvgComponent } from "@components/inline-svg/inline-svg.component";

@Component({
  selector: 'app-landing-header',
  imports: [NgClass, RouterLink, RouterLinkActive, NgTemplateOutlet, InlineSvgComponent],
  templateUrl: './landing-header.component.html',
  styleUrl: './landing-header.component.scss'
})
export class LandingHeaderComponent implements OnInit {
  private authService = inject(AuthService);
  private tokenService = inject(TokenService);
  
  public mobileMenuOpen = false;
  public isScrolled = false;
  public isDropdownOpen = false;
  public signInResponse: CreatorSignInResponse | null = null;
  public user: UserData | null = null;
  
  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.scrollY > 10;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (event && event.target) {
      const clickedInside = (event.target as HTMLElement).closest('.user-menu-dropdown');
      const userInfoClicked = (event.target as HTMLElement).closest('.user-img');
      if (!clickedInside || !userInfoClicked) {
        this.isDropdownOpen=false;
      }
    }
  }
  
  ngOnInit(): void {
    this.subSignInResponse();
    this.initializeUser();
  }

  async initializeUser() {
    await this.tokenService.authReady;
    this.user = this.tokenService.getCurrentUserObj();
  }

  async onLoginClick(){
    await this.authService.onLoginClick('landing_page');
  }
  
  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  toggleDropdown(event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  handleSignout(){
    this.authService.signOut();
    this.user = null;
    this.signInResponse = null;
    this.mobileMenuOpen = false;
    this.isDropdownOpen = false;
  }

  subSignInResponse(){
    this.authService.creatorSignInResponse$.subscribe((res:CreatorSignInResponse | null)=>{
      this.signInResponse = res;
      this.user = this.tokenService.getCurrentUserObj();
    })
  }

  get isOnboardingComplete(){
    const onboarded = this.signInResponse && this.signInResponse.isCreator && this.signInResponse.hasAcceptedTerms;
    return onboarded;
  }

}
