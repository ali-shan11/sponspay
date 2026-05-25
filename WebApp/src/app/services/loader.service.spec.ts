import { TestBed } from '@angular/core/testing';
import { LoaderService } from './loader.service';

describe('LoaderService', () => {
  let service: LoaderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoaderService);
    spyOn(console, 'log');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('loader observable', () => {
    it('should initially emit false', (done) => {
      service.loader.subscribe(value => {
        expect(value).toBe(false);
        done();
      });
    });
  });

  describe('show()', () => {
    it('should set loader to true on first call', (done) => {
      service.show();

      service.loader.subscribe(value => {
        expect(value).toBe(true);
        done();
      });
    });

    it('should log request count', () => {
      service.show();
      expect(console.log).toHaveBeenCalledWith('Loader shown – active requests:', 1);
    });

    it('should only emit true once for multiple show calls', () => {
      const emissions: boolean[] = [];
      service.loader.subscribe(value => {
        emissions.push(value);
      });

      service.show();
      service.show();
      service.show();

      // Initial false, then true on first show, no additional emissions
      expect(emissions).toEqual([false, true]);
    });

    it('should increment request count on each call', () => {
      service.show();
      expect(console.log).toHaveBeenCalledWith('Loader shown – active requests:', 1);

      service.show();
      expect(console.log).toHaveBeenCalledWith('Loader shown – active requests:', 2);

      service.show();
      expect(console.log).toHaveBeenCalledWith('Loader shown – active requests:', 3);
    });
  });

  describe('hide()', () => {
    it('should set loader to false when last request completes', () => {
      const emissions: boolean[] = [];
      service.loader.subscribe(value => {
        emissions.push(value);
      });

      service.show();
      service.hide();

      expect(emissions).toEqual([false, true, false]);
    });

    it('should not set loader to false when there are still active requests', () => {
      const emissions: boolean[] = [];
      service.loader.subscribe(value => {
        emissions.push(value);
      });

      service.show();
      service.show();
      service.hide(); // Still 1 active request

      // Should only have: false (initial), true (first show)
      // hide should NOT emit false because there's still 1 active request
      expect(emissions).toEqual([false, true]);
    });

    it('should log request count when hidden', () => {
      service.show();
      service.hide();
      expect(console.log).toHaveBeenCalledWith('Loader hidden – active requests:', 0);
    });

    it('should not go below 0 request count', () => {
      service.hide();
      expect(console.log).toHaveBeenCalledWith('Loader hidden – active requests:', 0);

      service.hide();
      expect(console.log).toHaveBeenCalledWith('Loader hidden – active requests:', 0);
    });

    it('should handle hide without prior show', (done) => {
      service.hide();

      service.loader.subscribe(value => {
        expect(value).toBe(false);
        done();
      });
    });
  });

  describe('show/hide interaction', () => {
    it('should handle multiple show/hide cycles', () => {
      const emissions: boolean[] = [];
      service.loader.subscribe(value => {
        emissions.push(value);
      });

      // Cycle 1
      service.show();
      service.hide();

      // Cycle 2
      service.show();
      service.hide();

      expect(emissions).toEqual([false, true, false, true, false]);
    });

    it('should handle concurrent requests properly', () => {
      const emissions: boolean[] = [];
      service.loader.subscribe(value => {
        emissions.push(value);
      });

      service.show(); // req 1
      service.show(); // req 2
      service.show(); // req 3
      service.hide(); // req 2 remaining
      service.hide(); // req 1 remaining
      service.hide(); // 0 remaining

      // Initial false, true on first show, false when all hidden
      expect(emissions).toEqual([false, true, false]);
    });

    it('should handle interleaved show/hide properly', () => {
      const emissions: boolean[] = [];
      service.loader.subscribe(value => {
        emissions.push(value);
      });

      service.show(); // 1 active
      service.hide(); // 0 active
      service.show(); // 1 active
      service.show(); // 2 active
      service.hide(); // 1 active
      service.hide(); // 0 active

      expect(emissions).toEqual([false, true, false, true, false]);
    });
  });

  describe('loader getter', () => {
    it('should return an observable', () => {
      expect(service.loader).toBeDefined();
      expect(service.loader.subscribe).toBeDefined();
    });

    it('should allow multiple subscribers', () => {
      let value1: boolean | undefined;
      let value2: boolean | undefined;

      service.loader.subscribe(v => value1 = v);
      service.loader.subscribe(v => value2 = v);

      service.show();

      expect(value1).toBe(true);
      expect(value2).toBe(true);
    });
  });
});
