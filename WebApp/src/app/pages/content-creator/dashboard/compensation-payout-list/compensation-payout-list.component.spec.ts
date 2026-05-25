import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompensationPayoutListComponent } from './compensation-payout-list.component';

describe('CompensationPayoutListComponent', () => {
  let component: CompensationPayoutListComponent;
  let fixture: ComponentFixture<CompensationPayoutListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompensationPayoutListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompensationPayoutListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
