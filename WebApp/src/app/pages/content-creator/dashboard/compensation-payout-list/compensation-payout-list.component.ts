import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { CompensationPayoutObj } from '@app-types/dashboard';
import { InlineSvgComponent } from '@components/inline-svg/inline-svg.component';
import { PaginationComponent } from '@components/pagination/pagination.component';
import { SvgCountryFlags, SvgIcons } from '@utils/svg-icons';

@Component({
  selector: 'app-compensation-payout-list',
  imports: [CommonModule, InlineSvgComponent, PaginationComponent],
  templateUrl: './compensation-payout-list.component.html',
  styleUrl: './compensation-payout-list.component.scss'
})
export class CompensationPayoutListComponent {
  countryIcon = SvgCountryFlags;
  svgIcon = SvgIcons;
  // public payoutList: CompensationPayoutObj[] = [];
  public payoutList: CompensationPayoutObj[] = [
    {
      dateTime: "2025-06-10 15:30:00",
      txnId: "KJ-9JVB2K1A4",
      beneficiary: { number: "+1 (234) 564 7899", name: "Kwame Boateng" },
      payoutMethod: "M-Pesa",
      amountSent: { amount: 10000, percentage:"~$9.25" },
      currency: "KES",
      status: "pending",
      invoiceRef: "INV-483KL9INV-483KL9"
    },
    {
      dateTime: "2025-05-05 11:15:00",
      txnId: "KJ‑9JVB2K1A4",
      beneficiary: { number: "+1 (234) 564 7899", name: "Kwame Boateng" },
      payoutMethod: "M-Pesa",
      amountSent: { amount: 20000, percentage:"~$9.25" },
      currency: "KES",
      status: "failed",
      invoiceRef: "INV-483KL9INV-483KL9"
    },
    {
      dateTime: "2025-06-10 15:30:00",
      txnId: "KJ‑9JVB2K1A4",
      beneficiary: { number: "+1 (234) 564 7899", name: "Kwame Boateng" },
      payoutMethod: "M-Pesa",
      amountSent: { amount: 30000, percentage:"~$9.25" },
      currency: "KES",
      status: "completed",
      invoiceRef: "INV-483KL9INV-483KL9"
    },
    {
      dateTime: "2025-06-10 15:30:00",
      txnId: "KJ‑9JVB2K1A4",
      beneficiary: { number: "+1 (234) 564 7899", name: "Kwame Boateng" },
      payoutMethod: "M-Pesa",
      amountSent: { amount: 40000, percentage:"~$9.25" },
      currency: "KES",
      status: "failed",
      invoiceRef: "INV-483KL9INV-483KL9"
    },
    {
      dateTime: "2025-06-10 15:30:00",
      txnId: "KJ‑9JVB2K1A4",
      beneficiary: { number: "+1 (234) 564 7899", name: "Kwame Boateng" },
      payoutMethod: "M-Pesa",
      amountSent: { amount: 50000, percentage:"~$9.25" },
      currency: "KES",
      status: "completed",
      invoiceRef: "INV-483KL9INV-483KL9"
    },
    {
      dateTime: "2025-06-10 15:30:00",
      txnId: "KJ‑9JVB2K1A4",
      beneficiary: { number: "+1 (234) 564 7899", name: "Kwame Boateng" },
      payoutMethod: "M-Pesa",
      amountSent: { amount: 60000, percentage:"~$9.25" },
      currency: "KES",
      status: "completed",
      invoiceRef: "INV-483KL9INV-483KL9"
    },
    {
      dateTime: "2025-06-10 15:30:00",
      txnId: "KJ‑9JVB2K1A4",
      beneficiary: { number: "+1 (234) 564 7899", name: "Kwame Boateng" },
      payoutMethod: "M-Pesa",
      amountSent: { amount: 70000, percentage:"~$9.25" },
      currency: "KES",
      status: "completed",
      invoiceRef: "INV-483KL9INV-483KL9"
    },
  ];
}
