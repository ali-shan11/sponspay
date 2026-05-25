import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { AlertService } from './alert.service';
import { AlertMessage } from '@app-types/alerts';

describe('AlertService', () => {
  let service: AlertService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AlertService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('alert$ observable', () => {
    it('should emit an empty array initially', (done) => {
      service.alert$.subscribe(alerts => {
        expect(alerts).toEqual([]);
        done();
      });
    });
  });

  describe('error()', () => {
    it('should add an error alert', (done) => {
      service.error('Error Title', 'Error message');

      service.alert$.subscribe(alerts => {
        expect(alerts.length).toBe(1);
        expect(alerts[0].type).toBe('error');
        expect(alerts[0].title).toBe('Error Title');
        expect(alerts[0].message).toBe('Error message');
        expect(alerts[0].id).toBeDefined();
        done();
      });
    });

    it('should add an error alert with links', (done) => {
      const links = [{ link: 'https://example.com', linkText: 'Click here' }];
      service.error('Error Title', 'Error message', links);

      service.alert$.subscribe(alerts => {
        expect(alerts.length).toBe(1);
        expect(alerts[0].links).toEqual(links);
        done();
      });
    });
  });

  describe('success()', () => {
    it('should add a success alert', (done) => {
      service.success('Success Title', 'Success message');

      service.alert$.subscribe(alerts => {
        expect(alerts.length).toBe(1);
        expect(alerts[0].type).toBe('success');
        expect(alerts[0].title).toBe('Success Title');
        expect(alerts[0].message).toBe('Success message');
        done();
      });
    });

    it('should add a success alert with links', (done) => {
      const links = [{ link: '/home', linkText: 'Go home' }];
      service.success('Success', 'Done', links);

      service.alert$.subscribe(alerts => {
        expect(alerts[0].links).toEqual(links);
        done();
      });
    });
  });

  describe('info()', () => {
    it('should add an info alert', (done) => {
      service.info('Info Title', 'Info message');

      service.alert$.subscribe(alerts => {
        expect(alerts.length).toBe(1);
        expect(alerts[0].type).toBe('info');
        expect(alerts[0].title).toBe('Info Title');
        expect(alerts[0].message).toBe('Info message');
        done();
      });
    });

    it('should add an info alert with links', (done) => {
      const links = [{ link: '/docs', linkText: 'Read more' }];
      service.info('Info', 'Details', links);

      service.alert$.subscribe(alerts => {
        expect(alerts[0].links).toEqual(links);
        done();
      });
    });
  });

  describe('duplicate prevention', () => {
    it('should not add duplicate alerts with same title, message and type', (done) => {
      service.error('Same Title', 'Same message');
      service.error('Same Title', 'Same message');

      service.alert$.subscribe(alerts => {
        expect(alerts.length).toBe(1);
        done();
      });
    });

    it('should allow alerts with same title but different message', (done) => {
      service.error('Same Title', 'Message 1');
      service.error('Same Title', 'Message 2');

      service.alert$.subscribe(alerts => {
        expect(alerts.length).toBe(2);
        done();
      });
    });

    it('should allow alerts with same title and message but different type', (done) => {
      service.error('Title', 'Message');
      service.success('Title', 'Message');

      service.alert$.subscribe(alerts => {
        expect(alerts.length).toBe(2);
        done();
      });
    });
  });

  describe('max alerts limit', () => {
    it('should remove oldest alert when exceeding 5 alerts', (done) => {
      service.error('Alert 1', 'Message 1');
      service.error('Alert 2', 'Message 2');
      service.error('Alert 3', 'Message 3');
      service.error('Alert 4', 'Message 4');
      service.error('Alert 5', 'Message 5');
      service.error('Alert 6', 'Message 6');

      service.alert$.subscribe(alerts => {
        expect(alerts.length).toBe(5);
        // The first alert should have been removed
        expect(alerts[0].title).toBe('Alert 2');
        expect(alerts[4].title).toBe('Alert 6');
        done();
      });
    });
  });

  describe('removeById()', () => {
    it('should remove an alert by its id', () => {
      // Add a single alert and remove it by id
      service.error('Title 1', 'Message 1');

      let currentAlerts: AlertMessage[] = [];
      const sub = service.alert$.subscribe(alerts => {
        currentAlerts = alerts;
      });

      expect(currentAlerts.length).toBe(1);
      const idToRemove = currentAlerts[0].id;
      service.removeById(idToRemove);

      expect(currentAlerts.length).toBe(0);
      sub.unsubscribe();
    });

    it('should handle removing a non-existent id gracefully', () => {
      service.error('Title', 'Message');

      let currentAlerts: AlertMessage[] = [];
      const sub = service.alert$.subscribe(alerts => {
        currentAlerts = alerts;
      });

      service.removeById('non-existent-id');
      expect(currentAlerts.length).toBe(1);
      sub.unsubscribe();
    });

    it('should only remove matching id and leave others', () => {
      // Use different types to ensure they aren't deduplicated
      service.error('Error', 'Error msg');
      service.success('Success', 'Success msg');
      service.info('Info', 'Info msg');

      let currentAlerts: AlertMessage[] = [];
      const sub = service.alert$.subscribe(alerts => {
        currentAlerts = alerts;
      });

      expect(currentAlerts.length).toBe(3);

      // Each alert now has a unique ID, so removeById removes only the targeted one
      service.removeById(currentAlerts[0].id);

      expect(currentAlerts.length).toBe(2);
      expect(currentAlerts[0].type).toBe('success');
      expect(currentAlerts[1].type).toBe('info');
      sub.unsubscribe();
    });
  });

  describe('clear()', () => {
    it('should remove all alerts', (done) => {
      service.error('Error', 'Error msg');
      service.success('Success', 'Success msg');
      service.info('Info', 'Info msg');

      service.clear();

      service.alert$.subscribe(alerts => {
        expect(alerts).toEqual([]);
        expect(alerts.length).toBe(0);
        done();
      });
    });
  });

  describe('apiError()', () => {
    it('should create an error alert from HttpErrorResponse with error body', (done) => {
      const httpError = new HttpErrorResponse({
        error: { error: 'Not Found', message: 'Resource not found', statusCode: '404' },
        status: 404,
        statusText: 'Not Found'
      });

      service.apiError(httpError);

      service.alert$.subscribe(alerts => {
        expect(alerts.length).toBe(1);
        expect(alerts[0].type).toBe('error');
        expect(alerts[0].title).toBe('Not Found');
        expect(alerts[0].message).toBe('Resource not found');
        done();
      });
    });

    it('should use fallback title and message when error body is missing', (done) => {
      const httpError = new HttpErrorResponse({
        error: null,
        status: 500,
        statusText: 'Internal Server Error'
      });

      service.apiError(httpError);

      service.alert$.subscribe(alerts => {
        expect(alerts.length).toBe(1);
        expect(alerts[0].title).toBe('Error');
        expect(alerts[0].message).toBe('Some error occurred');
        done();
      });
    });

    it('should use fallback when error body has no error/message fields', (done) => {
      const httpError = new HttpErrorResponse({
        error: {},
        status: 400,
        statusText: 'Bad Request'
      });

      service.apiError(httpError);

      service.alert$.subscribe(alerts => {
        expect(alerts.length).toBe(1);
        expect(alerts[0].title).toBe('Error');
        expect(alerts[0].message).toBe('Some error occurred');
        done();
      });
    });
  });

  describe('alert ID generation', () => {
    it('should generate unique IDs for each alert', (done) => {
      service.error('Error', 'Error msg');
      service.success('Success', 'Success msg');
      service.info('Info', 'Info msg');

      service.alert$.subscribe(alerts => {
        const ids = alerts.map(a => a.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
        done();
      });
    });
  });

  describe('immutability', () => {
    it('should emit a new array reference on each update', () => {
      const emittedArrays: AlertMessage[][] = [];

      service.alert$.subscribe(alerts => {
        emittedArrays.push(alerts);
      });

      service.error('Title 1', 'Message 1');
      service.error('Title 2', 'Message 2');

      // Should have 3 emissions: initial empty, after first, after second
      expect(emittedArrays.length).toBe(3);
      // Each array should be a different reference
      expect(emittedArrays[0]).not.toBe(emittedArrays[1]);
      expect(emittedArrays[1]).not.toBe(emittedArrays[2]);
    });
  });
});
