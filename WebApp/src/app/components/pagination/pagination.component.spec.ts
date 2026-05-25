import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { createMockFirebaseAuth } from '../../../testing/mocks/firebase-auth.mock';
import { createMockHttpClient } from '../../../testing/mocks/http.mock';
import { TokenService } from '@services/token.service';

import { PaginationComponent } from './pagination.component';

describe('PaginationComponent', () => {
  let component: PaginationComponent;
  let fixture: ComponentFixture<PaginationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginationComponent],
      providers: [
        { provide: Auth, useValue: createMockFirebaseAuth() },
        { provide: HttpClient, useValue: createMockHttpClient() },
        { provide: TokenService, useValue: jasmine.createSpyObj('TokenService', ['getToken', 'getCurrentUserObj'], { authReady: Promise.resolve() }) },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl'], { events: of(), url: '/' }) },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map() }, params: of({}), queryParams: of({}) } },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaginationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default input values', () => {
    expect(component.totalItems).toBe(0);
    expect(component.currentPage).toBe(1);
    expect(component.defaultPageSize).toBe(10);
    expect(component.maxVisiblePages).toBe(3);
  });

  it('should have svgIcon defined', () => {
    expect(component.svgIcon).toBeTruthy();
  });

  it('should have pageSizeOptions', () => {
    expect(component.pageSizeOptions.length).toBe(5);
    expect(component.pageSizeOptions[0].name).toBe(7);
  });

  describe('pageSize getter', () => {
    it('should return the sizeControl value', () => {
      component.sizeControl.setValue(20);
      expect(component.pageSize).toBe(20);
    });

    it('should return 0 when sizeControl value is null', () => {
      component.sizeControl.setValue(null);
      expect(component.pageSize).toBe(0);
    });
  });

  describe('startItem getter', () => {
    it('should return 1 for the first page', () => {
      component.sizeControl.setValue(10, { emitEvent: false });
      component.currentPage = 1;
      expect(component.startItem).toBe(1);
    });

    it('should return correct start item for page 2', () => {
      component.sizeControl.setValue(10, { emitEvent: false });
      component.currentPage = 2;
      expect(component.startItem).toBe(11);
    });
  });

  describe('endItem getter', () => {
    it('should return pageSize for first page when totalItems > pageSize', () => {
      component.totalItems = 50;
      component.sizeControl.setValue(10, { emitEvent: false });
      component.currentPage = 1;
      expect(component.endItem).toBe(10);
    });

    it('should return totalItems when on last page with fewer items', () => {
      component.totalItems = 25;
      component.sizeControl.setValue(10, { emitEvent: false });
      component.currentPage = 3;
      expect(component.endItem).toBe(25);
    });
  });

  describe('calculatePages', () => {
    it('should calculate totalPages correctly', () => {
      component.totalItems = 50;
      component.sizeControl.setValue(10);
      component.calculatePages();
      expect(component.totalPages).toBe(5);
    });

    it('should show all pages when total is small (totalPages <= maxVisiblePages + 2)', () => {
      component.totalItems = 30;
      component.sizeControl.setValue(10);
      component.calculatePages();
      // totalPages = 3, maxVisiblePages + 2 = 5, so 3 <= 5
      expect(component.visiblePages).toEqual([1, 2, 3]);
      expect(component.showLeftEllipsis).toBe(false);
      expect(component.showRightEllipsis).toBe(false);
    });

    it('should show right ellipsis near beginning', () => {
      component.totalItems = 100;
      component.sizeControl.setValue(10);
      component.currentPage = 1;
      component.calculatePages();
      // totalPages = 10, currentPage <= 2
      expect(component.visiblePages).toEqual([1, 2, 3]);
      expect(component.showLeftEllipsis).toBe(false);
      expect(component.showRightEllipsis).toBe(true);
    });

    it('should show left ellipsis near end', () => {
      component.totalItems = 100;
      component.sizeControl.setValue(10);
      component.currentPage = 10;
      component.calculatePages();
      // totalPages = 10, currentPage >= totalPages - 1
      expect(component.visiblePages).toEqual([8, 9, 10]);
      expect(component.showLeftEllipsis).toBe(true);
      expect(component.showRightEllipsis).toBe(false);
    });

    it('should show both ellipses in the middle', () => {
      component.totalItems = 100;
      component.sizeControl.setValue(10);
      component.currentPage = 5;
      component.calculatePages();
      // totalPages = 10, middle case
      expect(component.visiblePages).toEqual([4, 5, 6]);
      expect(component.showLeftEllipsis).toBe(true);
      expect(component.showRightEllipsis).toBe(true);
    });

    it('should generate totalPagesArray', () => {
      component.totalItems = 30;
      component.sizeControl.setValue(10);
      component.calculatePages();
      expect(component.totalPagesArray).toEqual([1, 2, 3]);
    });

    it('should handle currentPage = 2 (near beginning)', () => {
      component.totalItems = 100;
      component.sizeControl.setValue(10);
      component.currentPage = 2;
      component.calculatePages();
      expect(component.visiblePages).toEqual([1, 2, 3]);
      expect(component.showLeftEllipsis).toBe(false);
      expect(component.showRightEllipsis).toBe(true);
    });

    it('should handle currentPage = totalPages - 1 (near end)', () => {
      component.totalItems = 100;
      component.sizeControl.setValue(10);
      component.currentPage = 9;
      component.calculatePages();
      expect(component.visiblePages).toEqual([8, 9, 10]);
      expect(component.showLeftEllipsis).toBe(true);
      expect(component.showRightEllipsis).toBe(false);
    });
  });

  describe('onPageClick', () => {
    it('should change current page and emit reloadData', () => {
      component.totalItems = 50;
      component.sizeControl.setValue(10);
      component.calculatePages();
      spyOn(component.reloadData, 'emit');

      component.onPageClick(3);

      expect(component.currentPage).toBe(3);
      expect(component.reloadData.emit).toHaveBeenCalledWith({ page: 3, size: 10 });
    });

    it('should not change page if same page is clicked', () => {
      component.totalItems = 50;
      component.sizeControl.setValue(10);
      component.currentPage = 2;
      component.calculatePages();
      spyOn(component.reloadData, 'emit');

      component.onPageClick(2);

      expect(component.reloadData.emit).not.toHaveBeenCalled();
    });
  });

  describe('goToPreviousPage', () => {
    it('should go to previous page when currentPage > 1', () => {
      component.totalItems = 50;
      component.sizeControl.setValue(10);
      component.currentPage = 3;
      component.calculatePages();
      spyOn(component.reloadData, 'emit');

      component.goToPreviousPage();

      expect(component.currentPage).toBe(2);
      expect(component.reloadData.emit).toHaveBeenCalled();
    });

    it('should not go to previous page when currentPage is 1', () => {
      component.totalItems = 50;
      component.sizeControl.setValue(10);
      component.currentPage = 1;
      component.calculatePages();
      spyOn(component.reloadData, 'emit');

      component.goToPreviousPage();

      expect(component.currentPage).toBe(1);
      expect(component.reloadData.emit).not.toHaveBeenCalled();
    });
  });

  describe('goToNextPage', () => {
    it('should go to next page when currentPage < totalPages', () => {
      component.totalItems = 50;
      component.sizeControl.setValue(10);
      component.currentPage = 2;
      component.calculatePages();
      spyOn(component.reloadData, 'emit');

      component.goToNextPage();

      expect(component.currentPage).toBe(3);
      expect(component.reloadData.emit).toHaveBeenCalled();
    });

    it('should not go to next page when on last page', () => {
      component.totalItems = 50;
      component.sizeControl.setValue(10);
      component.currentPage = 5;
      component.calculatePages();
      spyOn(component.reloadData, 'emit');

      component.goToNextPage();

      expect(component.currentPage).toBe(5);
      expect(component.reloadData.emit).not.toHaveBeenCalled();
    });
  });

  describe('onPageSizeChange', () => {
    it('should recalculate pages, reset to page 1, and emit reloadData', () => {
      component.totalItems = 50;
      component.currentPage = 3;
      component.sizeControl.setValue(10);
      component.calculatePages();
      spyOn(component.reloadData, 'emit');

      component.onPageSizeChange();

      expect(component.currentPage).toBe(1);
      expect(component.reloadData.emit).toHaveBeenCalledWith({ page: 1, size: 10 });
    });
  });

  describe('emitReloadData', () => {
    it('should emit with current page and size', () => {
      component.sizeControl.setValue(20, { emitEvent: false });
      component.currentPage = 2;
      spyOn(component.reloadData, 'emit');

      component.emitReloadData();

      expect(component.reloadData.emit).toHaveBeenCalledWith({ page: 2, size: 20 });
    });

    it('should use default size of 10 when sizeControl is null', () => {
      component.currentPage = 1;
      component.sizeControl.setValue(null);
      spyOn(component.reloadData, 'emit');

      component.emitReloadData();

      expect(component.reloadData.emit).toHaveBeenCalledWith({ page: 1, size: 10 });
    });
  });

  describe('ngOnInit', () => {
    it('should call subPageSizeValueChange and calculatePages', () => {
      spyOn(component, 'subPageSizeValueChange');
      spyOn(component, 'calculatePages');

      component.ngOnInit();

      expect(component.subPageSizeValueChange).toHaveBeenCalled();
      expect(component.calculatePages).toHaveBeenCalled();
    });
  });

  describe('ngOnChanges', () => {
    it('should call calculatePages', () => {
      spyOn(component, 'calculatePages');

      component.ngOnChanges();

      expect(component.calculatePages).toHaveBeenCalled();
    });
  });

  describe('subPageSizeValueChange', () => {
    it('should call onPageSizeChange when sizeControl value changes', () => {
      spyOn(component, 'onPageSizeChange');
      component.subPageSizeValueChange();

      component.sizeControl.setValue(20);

      expect(component.onPageSizeChange).toHaveBeenCalled();
    });
  });
});
