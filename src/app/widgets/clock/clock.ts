import {Component, ViewChild, ElementRef, NgZone} from '@angular/core';

@Component({
  selector: 'clock',
  templateUrl: 'clock.html',
  styleUrls: ['./clock.scss'],
})

export class ClockWidget {
    //@ViewChild('clock', {static:true}) clock: ElementRef;
    clockText: string = "";

    constructor(readonly ngZone: NgZone) {
    }
    onClick() {
    }
    setTextCB(text) {
        this.ngZone.run(() => {
            this.clockText = text;
        });
    }
}
