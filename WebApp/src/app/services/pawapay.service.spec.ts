import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { PawapayService } from './pawapay.service';

describe('PawapayService', () => {
  let service: PawapayService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
    service = TestBed.inject(PawapayService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
