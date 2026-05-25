import { Component, EventEmitter, Input, Output, OnInit, OnChanges } from '@angular/core';
import { FormControl, FormsModule } from '@angular/forms';

import { CustomSelectComponent } from "../custom-select/custom-select.component";
import { InlineSvgComponent } from '@components/inline-svg/inline-svg.component';
import { SvgIcons } from '@utils/svg-icons';

@Component({
  selector: 'app-pagination',
  imports: [FormsModule, InlineSvgComponent, CustomSelectComponent],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss',
})
export class PaginationComponent implements OnInit, OnChanges {
  @Input() totalItems = 0;
  @Input() currentPage = 1;
  @Input() defaultPageSize = 10;
  @Output() pageChanged = new EventEmitter<number>();
  @Output() pageSizeChanged = new EventEmitter<number>();
  @Output() reloadData = new EventEmitter<{page:number, size:number}>();

  svgIcon = SvgIcons;
  pageSizeOptions = [ {name: 7}, {name: 10}, {name: 20}, {name: 30}, {name: 50}];
  maxVisiblePages = 3;

  visiblePages: number[] = [];
  totalPages = 0;
  totalPagesArray: number[] = [];
  showLeftEllipsis = false;
  showRightEllipsis = false;
  sizeControl = new FormControl(this.defaultPageSize);

  get pageSize(){
    return this.sizeControl.value || 0;
  }

  get startItem(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endItem(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }

  ngOnInit() {
    this.subPageSizeValueChange();
    this.calculatePages();
  }

  subPageSizeValueChange(){
    this.sizeControl.valueChanges.subscribe(()=>{
      this.onPageSizeChange();
    })
  }

  ngOnChanges() {
    this.calculatePages();
  }

  calculatePages() {
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);

    if (this.totalPages <= this.maxVisiblePages + 2) {
      // If total pages is small, show all pages
      this.visiblePages = [];
      for (let i = 1; i <= this.totalPages; i++) {
        this.visiblePages.push(i);
      }
      this.showLeftEllipsis = false;
      this.showRightEllipsis = false;
    } else {
      // Complex pagination logic
      let start: number;
      let end: number;

      if (this.currentPage <= 2) {
        // Near the beginning: show [1, 2, 3] ... [last]
        start = 1;
        end = this.maxVisiblePages;
        this.showLeftEllipsis = false;
        this.showRightEllipsis = end < this.totalPages - 1;
      } else if (this.currentPage >= this.totalPages - 1) {
        // Near the end: show [1] ... [last-2, last-1, last]
        start = this.totalPages - this.maxVisiblePages + 1;
        end = this.totalPages;
        this.showLeftEllipsis = start > 2;
        this.showRightEllipsis = false;
      } else {
        // In the middle: show [1] ... [current-1, current, current+1] ... [last]
        start = this.currentPage - 1;
        end = this.currentPage + 1;
        this.showLeftEllipsis = start > 2;
        this.showRightEllipsis = end < this.totalPages - 1;
      }

      this.visiblePages = [];
      for (let i = start; i <= end; i++) {
        this.visiblePages.push(i);
      }
    }
    this.totalPagesArray = Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  onPageClick(page: number) {
    if (page !== this.currentPage) {
      this.currentPage = page;
      // this.pageChanged.emit(page);
      this.emitReloadData();

      this.calculatePages();
    }
  }

  goToPreviousPage() {
    if (this.currentPage > 1) {
      this.onPageClick(this.currentPage - 1);
    }
  }

  goToNextPage() {
    if (this.currentPage < this.totalPages) {
      this.onPageClick(this.currentPage + 1);
    }
  }

  onPageSizeChange() {
    this.calculatePages();
    this.currentPage = 1;
    // this.pageSizeChanged.emit(this.pageSize);
    // this.pageChanged.emit(this.currentPage);
    this.emitReloadData();
  }

  emitReloadData(){
    const data = {
      page: this.currentPage,
      size: this.sizeControl.value || 10
    };
    this.reloadData.emit(data);
  }
}
