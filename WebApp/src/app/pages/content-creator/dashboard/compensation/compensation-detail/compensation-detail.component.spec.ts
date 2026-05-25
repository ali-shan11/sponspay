import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { createMockFirebaseAuth } from '../../../../../../testing/mocks/firebase-auth.mock';
import { createMockHttpClient } from '../../../../../../testing/mocks/http.mock';
import { TokenService } from '@services/token.service';

import { CompensationDetailComponent } from './compensation-detail.component';

describe('CompensationDetailComponent', () => {
  let component: CompensationDetailComponent;
  let fixture: ComponentFixture<CompensationDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompensationDetailComponent],
      providers: [
        { provide: Auth, useValue: createMockFirebaseAuth() },
        { provide: HttpClient, useValue: createMockHttpClient() },
        { provide: TokenService, useValue: jasmine.createSpyObj('TokenService', ['getToken', 'getCurrentUserObj'], { authReady: Promise.resolve() }) },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl'], { events: of(), url: '/' }) },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map() }, params: of({}), queryParams: of({}) } },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompensationDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
