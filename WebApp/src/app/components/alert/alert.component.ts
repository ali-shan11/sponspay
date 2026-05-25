import { trigger, transition, style, animate } from '@angular/animations';
import { NgClass } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { AlertMessage } from '@app-types/alerts';
import { AlertService } from '@services/alert.service';
import { AlertIcon } from '@utils/svg-icons';

@Component({
  selector: 'app-alert',
  imports: [NgClass],
  templateUrl: './alert.component.html',
  styleUrl: './alert.component.scss',
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, transform: 'translateY(20px)' }))
      ])
    ])
  ]
})
export class AlertComponent implements OnInit, OnDestroy {
  alertTimeOut= 7000;
  alertMessages: AlertMessage[] = [];
  alertIcons = AlertIcon;

  private alertService = inject(AlertService);
  private timeoutMap = new Map<string, ReturnType<typeof setTimeout>>();

  ngOnInit(): void {
    this.alertService.alert$.subscribe(messages => {
      this.alertMessages = messages;

      // Set timeout ONLY for new alerts
      messages.forEach(alert => {
        if (alert.id && !this.timeoutMap.has(alert.id)) {
          const timeout = setTimeout(() => {
            this.removeAlert(alert.id!);
          }, this.alertTimeOut);

          this.timeoutMap.set(alert.id, timeout);
        }
      });
    });
  }

  removeAlert(id: string): void {
    // Clear timeout if exists
    const timeout = this.timeoutMap.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.timeoutMap.delete(id);
    }

    // Small delay for fade-out animation
    setTimeout(() => {
      this.alertService.removeById(id);
    }, 200);
  }

  ngOnDestroy(): void {
    // Clean up all timeouts
    this.timeoutMap.forEach(timeout => clearTimeout(timeout));
    this.timeoutMap.clear();
  }

}
