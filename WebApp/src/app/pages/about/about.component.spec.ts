import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AboutComponent } from './about.component';

describe('AboutComponent', () => {
  let component: AboutComponent;
  let fixture: ComponentFixture<AboutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AboutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Template Content', () => {
    it('should display the page title', () => {
      const compiled = fixture.nativeElement;
      const title = compiled.querySelector('.page-title');
      expect(title).toBeTruthy();
      expect(title.textContent).toContain('About SponsPay');
    });

    it('should display the intro paragraph', () => {
      const compiled = fixture.nativeElement;
      const intro = compiled.querySelector('.intro');
      expect(intro).toBeTruthy();
      expect(intro.textContent).toContain('SponsPay helps creators earn more');
    });

    it('should display all content sections', () => {
      const compiled = fixture.nativeElement;
      const sectionTitles = compiled.querySelectorAll('.section-title');
      const titles = Array.from(sectionTitles).map((el: any) => el.textContent.trim());

      expect(titles).toContain('What SponsPay does');
      expect(titles).toContain('How it works');
      expect(titles).toContain('Why creators use SponsPay');
      expect(titles).toContain('Why supporters use SponsPay');
      expect(titles).toContain('Our approach to trust');
    });

    it('should display 5 bullet points in "What SponsPay does"', () => {
      const compiled = fixture.nativeElement;
      const sections = compiled.querySelectorAll('section');
      const whatSection = sections[0];
      const points = whatSection.querySelectorAll('.point');
      expect(points.length).toBe(5);
    });

    it('should display 5 numbered steps in "How it works"', () => {
      const compiled = fixture.nativeElement;
      const steps = compiled.querySelectorAll('.steps li');
      expect(steps.length).toBe(5);
    });

    it('should display 4 bullet points in "Our approach to trust"', () => {
      const compiled = fixture.nativeElement;
      const sections = compiled.querySelectorAll('section');
      const trustSection = sections[4];
      const points = trustSection.querySelectorAll('.point');
      expect(points.length).toBe(4);
    });

    it('should use badge-check icons for bullet points', () => {
      const compiled = fixture.nativeElement;
      const checkIcons = compiled.querySelectorAll('.point img[src="svg/badge-check.svg"]');
      expect(checkIcons.length).toBe(9); // 5 in "What SponsPay does" + 4 in "Our approach to trust"
    });
  });
});
