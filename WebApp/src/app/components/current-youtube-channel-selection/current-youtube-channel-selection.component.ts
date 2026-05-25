import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, OnInit } from '@angular/core';
import { DashboardService } from '@services/dashboard.service';

@Component({
  selector: 'app-current-youtube-channel-selection',
  imports: [CommonModule],
  templateUrl: './current-youtube-channel-selection.component.html',
  styleUrl: './current-youtube-channel-selection.component.scss'
})
export class CurrentYoutubeChannelSelectionComponent implements OnInit {
  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (event && event.target) {
      this.isChannelDropdownOpen=false;
    }
  }

  public dashboardService = inject(DashboardService);
  public isChannelDropdownOpen = false;

  ngOnInit(): void {
    this.dashboardService.loadChannels();
  }

  toggleChannelDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.isChannelDropdownOpen = !this.isChannelDropdownOpen;
  }

  onChannelOptionClick(channelId: string){
    this.isChannelDropdownOpen = !this.isChannelDropdownOpen;
    this.dashboardService.selectedChannelObservable.next(channelId);
  }

  get channelList() {
    return this.dashboardService.channelList$.value;
  }

  get selectedChannelOption(){
    return this.channelList.find((d)=> d.id === this.dashboardService.selectedChannelObservable.value);
  }
}
