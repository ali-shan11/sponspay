import { Component, HostListener, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SvgCountryFlags, SvgIcons } from '@utils/svg-icons';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { CommonModule } from '@angular/common';
import { PaginationComponent } from '@components/pagination/pagination.component';
import { LatestTransaction, LatestTransactionResponse, TransactionFilter, TransactionFilterParams } from '@app-types/transaction-activity';
import { InlineSvgComponent } from "@components/inline-svg/inline-svg.component";
import { MessageModalComponent } from "../message-modal/message-modal.component";
import { GetFlagUrl } from '@utils/constants';
import { TRANSACTION_REVENUE_STATUS } from '@utils/enums';
import { LatestTransactionService } from '@services/latest-transaction.service';
import { FilterModalComponent } from "../filter-modal/filter-modal.component";
import { StatusInfoModalComponent } from "../status-info-modal/status-info-modal.component";
import { DashboardService } from '@services/dashboard.service';

@Component({
  selector: 'app-latest-transaction',
  imports: [PaginationComponent, CommonModule, FormsModule, InlineSvgComponent, MessageModalComponent, FilterModalComponent, StatusInfoModalComponent],
  templateUrl: './latest-transaction.component.html',
  styleUrl: './latest-transaction.component.scss'
})
export class LatestTransactionComponent implements OnInit, OnDestroy {
  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (event && event.target) {
      this.isSortDropdownOpen=false;
    }
  }
  TRANSACTION_REVENUE_STATUS = TRANSACTION_REVENUE_STATUS;
  countryIcon = SvgCountryFlags;
  svgIcon = SvgIcons;
  public dashboardService = inject(DashboardService);
  public isLoading = false;
  public page = 1;
  public limit = 20;
  public transactionData!: LatestTransactionResponse;
  public unSubscribe: Subscription[] = []

  public transactionService = inject(LatestTransactionService);
  public isMessageModalOpen = false;
  public isFilterModalOpen = false;
  public isStatusInfoModalOpen = false;
  public isSortDropdownOpen = false;
  public filterObj: TransactionFilter = {
    country: null,
    status: null,
    dateRange: null,
    sortBy: null,
    sortOrder: null
  };
  public selectedTransaction: LatestTransaction | null = null;
  public sortByList: { key: 'createdAt'|'amount'|'country'|'revenueStatus'|'multiplier', value: string }[] = [
    { key: 'createdAt', value: 'Created At' },
    { key: 'amount', value: 'Amount' },
    { key: 'country', value: 'Country' },
    { key: 'revenueStatus', value: 'Reply Status' },
    { key: 'multiplier', value: 'Multiple' },
  ];
  public sortOrderList: { key: 'asc'|'desc', value: string }[] = [
    { key: 'asc', value: 'Ascending' },
    { key: 'desc', value: 'Descending' },
  ]
  public selectedSortBy: 'createdAt'|'amount'|'country'|'revenueStatus'|'multiplier' = 'createdAt';
  public selectedSortOrder: 'desc'|'asc' = 'desc';
  public searchTerm = '';
  private searchSubject = new Subject<string>();

  get hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.filterObj.country || this.filterObj.status || this.filterObj.dateRange != null);
  }

  get activeFilterCount(): number {
    let count = 0;
    if (this.filterObj.country?.length) count++;
    if (this.filterObj.status?.length) count++;
    if (this.filterObj.dateRange != null) count++;
    return count;
  }

  ngOnDestroy(): void {
    this.unSubscribe.forEach(sub => {
      sub.unsubscribe();
    });
  }

  ngOnInit(): void {
    this.subYtChannelChange();
    this.unSubscribe.push(
      this.searchSubject.pipe(
        debounceTime(400),
        distinctUntilChanged(),
      ).subscribe(() => {
        this.page = 1;
        this.getTransactionsList();
      })
    );
  }

  onSearchInput(): void {
    this.searchSubject.next(this.searchTerm);
  }

  subYtChannelChange(){
    this.unSubscribe.push(
      this.dashboardService.selectedChannelObservable.subscribe((channelId:string | null)=>{
        if (channelId) {
          this.getTransactionsList();
        }
      })
    );
  }

  getTransactionsList(){
    this.isLoading = true;
    const hasDateRange = this.filterObj?.dateRange != null;
    const start = new Date();
    if (hasDateRange) {
      start.setUTCDate(start.getUTCDate() - this.filterObj.dateRange!);
    }
    const params: TransactionFilterParams = {
      startDate: hasDateRange ? start.toISOString().split('T')[0] : null,
      endDate: hasDateRange ? new Date().toISOString().split('T')[0] : null,
      countries: this.filterObj?.country || null,
      revenueStatuses: this.filterObj?.status || null,
      search: this.searchTerm || null,
      channelId: this.dashboardService.selectedChannelObservable.value,
      sortBy: this.selectedSortBy,
      sortOrder: this.selectedSortOrder,
      page: this.page,
      limit: this.limit,
    }
    this.unSubscribe.push(
      this.transactionService.getTransactionsList(params).subscribe({
        next: (res:LatestTransactionResponse) => {
          this.transactionData = res;
          this.transactionData.items.map((transaction)=>{
            transaction.flag = GetFlagUrl(transaction.countryCode);
          });
          this.transactionData.availableCountries.forEach(country => {
            country.img = GetFlagUrl(country.countryCode);
          });
          this.isLoading = false;
        },
        error: ()=>{
          this.isLoading = false;
        },
      })
    );
  }

  onPageChange(event:number){
    this.page = event;
    this.getTransactionsList();
  }

  onPageSizeChange(event:number){
    this.limit = event;
    this.getTransactionsList();
  }

  handleReloadData(data: {page:number, size:number}){
    this.limit = data.size;
    this.page = data.page;
    this.getTransactionsList();
  }

  viewMessage(event:MouseEvent, transaction: LatestTransaction){
    if (event) {
      event.stopPropagation();
    }
    this.selectedTransaction = transaction;
    this.isMessageModalOpen = true;
  }

  filterModalClose(event: TransactionFilter){
    this.isFilterModalOpen = false;
    if (!event || event.canceled) {
      return;
    }
    this.filterObj = event;
    this.page = 1;
    this.getTransactionsList();
  }
  messageModalClose(replied?: boolean){
    this.selectedTransaction = null;
    this.isMessageModalOpen = false;
    if (replied) {
      this.getTransactionsList();
    }
  }

  toggleDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.isSortDropdownOpen = !this.isSortDropdownOpen;
  }

  onSortOrderClick(sortOrder: 'desc'|'asc'){
    this.selectedSortOrder = sortOrder;
    this.getTransactionsList();
  }
  
  get hasActiveSort(): boolean {
    return this.selectedSortBy !== 'createdAt' || this.selectedSortOrder !== 'desc';
  }

  onSortByClick(sortBy: 'createdAt'|'amount'|'country'|'revenueStatus'|'multiplier'){
    this.selectedSortBy = sortBy;
    this.getTransactionsList();
  }

  onHeaderSort(sortBy: 'createdAt'|'amount'|'country'|'revenueStatus'|'multiplier'){
    if (this.selectedSortBy === sortBy) {
      this.selectedSortOrder = this.selectedSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.selectedSortBy = sortBy;
      this.selectedSortOrder = 'desc';
    }
    this.getTransactionsList();
  }

  resetSort(event?: MouseEvent){
    if (event) event.stopPropagation();
    this.selectedSortBy = 'createdAt';
    this.selectedSortOrder = 'desc';
    this.getTransactionsList();
  }

  resetFilters(event?: MouseEvent){
    if (event) event.stopPropagation();
    this.filterObj = { country: null, status: null, dateRange: null, sortBy: null, sortOrder: null };
    this.searchTerm = '';
    this.page = 1;
    this.getTransactionsList();
  }

  resetAll(){
    this.selectedSortBy = 'createdAt';
    this.selectedSortOrder = 'desc';
    this.filterObj = { country: null, status: null, dateRange: null, sortBy: null, sortOrder: null };
    this.searchTerm = '';
    this.page = 1;
    this.getTransactionsList();
  }
}
