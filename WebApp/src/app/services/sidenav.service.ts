import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class SidenavService {
    private sidenavToggle = new BehaviorSubject<boolean>(false);
    sidenavToggle$ = this.sidenavToggle.asObservable();

    toggle() {
        this.sidenavToggle.next(!this.sidenavToggle.value);
    }
} 