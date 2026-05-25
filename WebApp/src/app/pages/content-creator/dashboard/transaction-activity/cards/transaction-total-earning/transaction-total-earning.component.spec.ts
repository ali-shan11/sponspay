import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransactionTotalEarningComponent } from './transaction-total-earning.component';

describe('TransactionTotalEarningComponent', () => {
  let component: TransactionTotalEarningComponent;
  let fixture: ComponentFixture<TransactionTotalEarningComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionTotalEarningComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransactionTotalEarningComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have svgIcon property defined', () => {
    expect(component.svgIcon).toBeDefined();
  });

  it('should accept isLoading input', () => {
    component.isLoading = true;
    fixture.detectChanges();
    expect(component.isLoading).toBeTrue();

    component.isLoading = false;
    fixture.detectChanges();
    expect(component.isLoading).toBeFalse();
  });

  it('should accept messageStats input as null', () => {
    component.messageStats = null;
    fixture.detectChanges();
    expect(component.messageStats).toBeNull();
  });

  it('should accept messageStats input with data', () => {
    const mockStats = {
      current30Days: { totalUsd: 100, averageUsd: 10, transactionCount: 5 },
      previous30Days: { totalUsd: 80, averageUsd: 8, transactionCount: 4 },
    } as any;
    component.messageStats = mockStats;
    fixture.detectChanges();
    expect(component.messageStats).toEqual(mockStats);
  });

  it('should emit refreshStats when refresh() is called', () => {
    spyOn(component.refreshStats, 'emit');
    component.refresh();
    expect(component.refreshStats.emit).toHaveBeenCalled();
  });

  it('should emit refreshStats with no arguments', () => {
    spyOn(component.refreshStats, 'emit');
    component.refresh();
    expect(component.refreshStats.emit).toHaveBeenCalledWith();
  });

  it('should have refreshStats as an EventEmitter', () => {
    let emitted = false;
    component.refreshStats.subscribe(() => {
      emitted = true;
    });
    component.refresh();
    expect(emitted).toBeTrue();
  });
});
