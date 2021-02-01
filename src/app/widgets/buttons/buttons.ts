import { Component, ViewChild, ElementRef } from '@angular/core';

@Component({
    selector: 'buttons',
    templateUrl: 'buttons.html',
    styleUrls: ['./buttons.scss'],
})

export class ButtonsWidget {
    @ViewChild('start', {static:true}) start: ElementRef;
    @ViewChild('stop',  {static:true})  stop: ElementRef;
    @ViewChild('reset', {static:true}) reset: ElementRef;
    buttonsPage = null;

    constructor() {}

    setPage(buttonsPage) {
        this.buttonsPage = buttonsPage;
    }
    onReset() {
        //this.reset.nativeElement.setAttribute('highlight', '');
        this.buttonsPage.lever("left");
    }
    onStart() {
        //this.start.nativeElement.setAttribute('highlight', '');
        this.buttonsPage.lever("right");
    }
    onStop() {
        //this.stop.nativeElement.setAttribute('highlight', '');
        this.buttonsPage.lever("right");
    }
}
