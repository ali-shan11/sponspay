import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AccountsService } from './accounts.service';
import { UniqueCountry } from '@app-types/accounts';
import { environment } from '../../environments/environment';

describe('AccountsService', () => {
  let service: AccountsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(AccountsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have a loaderContext with showLoader true', () => {
    expect(service.loaderContext).toBeDefined();
  });

  describe('getCountriesList', () => {
    it('should make a GET request to the countries endpoint', () => {
      const mockCountries: UniqueCountry[] = [
        { countryCode: '404', country: 'Kenya' },
        { countryCode: '256', country: 'Uganda' },
      ];

      service.getCountriesList().subscribe(countries => {
        expect(countries).toEqual(mockCountries);
        expect(countries.length).toBe(2);
      });

      const req = httpMock.expectOne(environment.API_BASE + '/accounts/countries');
      expect(req.request.method).toBe('GET');
      req.flush(mockCountries);
    });

    it('should return an empty array when no countries exist', () => {
      service.getCountriesList().subscribe(countries => {
        expect(countries).toEqual([]);
      });

      const req = httpMock.expectOne(environment.API_BASE + '/accounts/countries');
      req.flush([]);
    });
  });
});
