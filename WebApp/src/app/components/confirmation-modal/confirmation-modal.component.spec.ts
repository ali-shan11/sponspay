import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { createMockFirebaseAuth } from '../../../testing/mocks/firebase-auth.mock';
import { createMockHttpClient } from '../../../testing/mocks/http.mock';
import { TokenService } from '@services/token.service';

import { ConfirmationModalComponent } from './confirmation-modal.component';

describe('ConfirmationModalComponent', () => {
  let component: ConfirmationModalComponent;
  let fixture: ComponentFixture<ConfirmationModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmationModalComponent],
      providers: [
        { provide: Auth, useValue: createMockFirebaseAuth() },
        { provide: HttpClient, useValue: createMockHttpClient() },
        { provide: TokenService, useValue: jasmine.createSpyObj('TokenService', ['getToken', 'getCurrentUserObj'], { authReady: Promise.resolve() }) },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl'], { events: of(), url: '/' }) },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map() }, params: of({}), queryParams: of({}) } },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfirmationModalComponent);
    component = fixture.componentInstance;
    component.modalType = 'general';
    component.title = 'Test Title';
    component.text = 'Test text';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have modalIcon property set', () => {
    expect(component.modalIcon).toBeTruthy();
  });

  it('should accept modalType input', () => {
    component.modalType = 'logout';
    fixture.detectChanges();
    expect(component.modalType).toBe('logout');
  });

  it('should accept title input', () => {
    component.title = 'Are you sure?';
    fixture.detectChanges();
    expect(component.title).toBe('Are you sure?');
  });

  it('should accept text input', () => {
    component.text = 'This action cannot be undone.';
    fixture.detectChanges();
    expect(component.text).toBe('This action cannot be undone.');
  });

  it('should emit false when close is called', () => {
    spyOn(component.closed, 'emit');
    component.close();
    expect(component.closed.emit).toHaveBeenCalledWith(false);
  });

  it('should emit true when onConfirmClick is called', () => {
    spyOn(component.closed, 'emit');
    component.onConfirmClick();
    expect(component.closed.emit).toHaveBeenCalledWith(true);
  });
});
