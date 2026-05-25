import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DashboardHeaderComponent } from '@components/dashboard/dashboard-header/dashboard-header.component';
import { DashboardSidebarComponent } from '@components/dashboard/dashboard-sidebar/dashboard-sidebar.component';
import { CopyLinkControlComponent } from '@components/dashboard/copy-link-control/copy-link-control.component';


@Component({
  selector: 'app-dashboard-layout',
  imports: [RouterOutlet, DashboardHeaderComponent, DashboardSidebarComponent, CopyLinkControlComponent],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.scss'
})
export class DashboardLayoutComponent {

}
