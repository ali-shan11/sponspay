import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MessageUnitStatistics } from '@app-types/transaction-activity';
import { GrowthComponent } from '@components/growth/growth.component';
import { NumberFormatPipe } from '@pipes/number-format.pipe';
import { SvgIcons } from '@utils/svg-icons';

@Component({
  selector: 'app-transaction-total-earning',
  imports: [GrowthComponent, NumberFormatPipe],
  templateUrl: './transaction-total-earning.component.html',
  styleUrl: './transaction-total-earning.component.scss'
})
export class TransactionTotalEarningComponent {
  @Input({required: true}) isLoading!: boolean;
  @Input({required: true}) messageStats!: MessageUnitStatistics | null;
  @Output() refreshStats = new EventEmitter<void>();
  public svgIcon = SvgIcons;

  get hasData(): boolean {
    if (!this.messageStats?.current30Days) return false;
    return this.messageStats.current30Days.totalUsd > 0;
  }

  refresh(){
    this.refreshStats.emit();
  }
}
