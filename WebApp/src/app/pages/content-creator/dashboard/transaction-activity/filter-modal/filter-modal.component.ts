import { Component, ElementRef, EventEmitter, inject, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { TransactionCountryList, TransactionFilter } from '@app-types/transaction-activity';
import { ConfirmationModalIcon } from '@utils/svg-icons';
import { Modal } from 'bootstrap';
import { ButtonComponent } from "@components/button/button.component";
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { CustomSelectComponent } from "@components/custom-select/custom-select.component";
import { REVENUE_STATUS } from '@utils/enums';

@Component({
  selector: 'app-filter-modal',
  imports: [ButtonComponent, CustomSelectComponent],
  templateUrl: './filter-modal.component.html',
  styleUrl: './filter-modal.component.scss'
})
export class FilterModalComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('modal', { static: true }) modalEl!: ElementRef<HTMLDivElement>;
  @Input() filterObj!: TransactionFilter;
  @Input({required: true}) countryList!: TransactionCountryList[];
  @Output() closed = new EventEmitter<TransactionFilter>();
  
  public fb = inject(FormBuilder);

  public modalIcon = ConfirmationModalIcon;
  private bsModal?: Modal;

  public filterForm: FormGroup = this.fb.group({
    country: [null],
    status: [null],
    dateRange: [null],
  });
  public revenueStatusList = [
    {name: REVENUE_STATUS.AwaitingReply, value: 'Awaiting Reply'},
    {name: REVENUE_STATUS.Earned, value: 'Earned'},
    {name: REVENUE_STATUS.AutoReplied, value: 'Auto-Replied'},
  ];
  public dateRangeOptions = [
    { text: 'Today', value: 0 },
    { text: 'This Week', value: 7 },
    { text: 'Last 30 Days', value: 30 },
    { text: 'Last Quarter', value: 90 },
    { text: 'Last 6 Months', value: 180 },
    { text: 'This Year', value: 365 }
  ];

  configureModal(){
    this.bsModal = new Modal(this.modalEl.nativeElement, { backdrop: 'static' });
    this.bsModal.show();
    this.modalEl.nativeElement.addEventListener('hidden.bs.modal', () => {
      this.closed.emit();
    });
  }

  ngOnInit() {
    this.configureModal();
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes && changes?.['filterObj']?.currentValue) {
      this.filterObj.canceled = false;
      this.filterForm.patchValue(this.filterObj);
    }
  }

  configureForm(){
    this.filterForm = this.fb.group({
      country: [null],
      status: [null],
      dateRange: [null],
    })
  }

  get countryControl() {
    return this.filterForm.get('country') as FormControl;
  }
  get statusControl() {
    return this.filterForm.get('status') as FormControl;
  }
  get dateRangeControl() {
    return this.filterForm.get('dateRange') as FormControl;
  }
  
  ngOnDestroy(): void {
    this.bsModal?.dispose();
  }

  close() {
    this.filterObj.canceled = true;
    this.closed.emit(this.filterObj);
    this.bsModal?.hide();
  }
  
  onConfirmClick(){
    this.filterObj = { ...this.filterForm.getRawValue(), canceled: false };
    this.closed.emit(this.filterObj);
  }

  clearAll(){
    this.filterForm.reset({ country: null, status: null, dateRange: null });
    this.filterObj = { country: null, status: null, dateRange: null, canceled: false };
    this.closed.emit(this.filterObj);
  }
}
