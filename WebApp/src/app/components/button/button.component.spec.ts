import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { createMockFirebaseAuth } from '../../../testing/mocks/firebase-auth.mock';
import { createMockHttpClient } from '../../../testing/mocks/http.mock';
import { TokenService } from '@services/token.service';

import { ButtonComponent } from './button.component';

describe('ButtonComponent', () => {
  let component: ButtonComponent;
  let fixture: ComponentFixture<ButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonComponent],
      providers: [
        { provide: Auth, useValue: createMockFirebaseAuth() },
        { provide: HttpClient, useValue: createMockHttpClient() },
        { provide: TokenService, useValue: jasmine.createSpyObj('TokenService', ['getToken', 'getCurrentUserObj'], { authReady: Promise.resolve() }) },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl'], { events: of(), url: '/' }) },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map() }, params: of({}), queryParams: of({}) } },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default input values', () => {
    expect(component.type).toBe('primary');
    expect(component.btnText).toBe('');
    expect(component.iconUrl).toBe('');
    expect(component.iconType).toBe('svg');
    expect(component.disabled).toBe(false);
    expect(component.iconPlacement).toBe('after');
  });

  it('should accept "secondary" type input', () => {
    component.type = 'secondary';
    fixture.detectChanges();
    expect(component.type).toBe('secondary');
  });

  it('should accept "danger" type input', () => {
    component.type = 'danger';
    fixture.detectChanges();
    expect(component.type).toBe('danger');
  });

  it('should accept btnText input', () => {
    component.btnText = 'Click Me';
    fixture.detectChanges();
    expect(component.btnText).toBe('Click Me');
  });

  it('should accept iconUrl input', () => {
    component.iconUrl = 'svg/test-icon.svg';
    fixture.detectChanges();
    expect(component.iconUrl).toBe('svg/test-icon.svg');
  });

  it('should accept iconType "img"', () => {
    component.iconType = 'img';
    fixture.detectChanges();
    expect(component.iconType).toBe('img');
  });

  it('should accept disabled input', () => {
    component.disabled = true;
    fixture.detectChanges();
    expect(component.disabled).toBe(true);
  });

  it('should accept iconPlacement "before"', () => {
    component.iconPlacement = 'before';
    fixture.detectChanges();
    expect(component.iconPlacement).toBe('before');
  });

  it('should emit true on btnClick when onButtonClick is called', () => {
    spyOn(component.btnClick, 'emit');
    component.onButtonClick();
    expect(component.btnClick.emit).toHaveBeenCalledWith(true);
  });

  it('should emit btnClick event when button element is clicked', () => {
    spyOn(component.btnClick, 'emit');
    const button = fixture.nativeElement.querySelector('button');
    button.click();
    expect(component.btnClick.emit).toHaveBeenCalledWith(true);
  });
});
