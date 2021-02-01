import {Component} from '@angular/core';
import {PopoverController} from '@ionic/angular';

@Component({
    template: `
        <ion-item>
            <ion-text><h3>Psygraph v0.9.2</h3></ion-text>
        </ion-item>
        <ion-list>
            <ion-item button (click)="close('https://psygraph.com')">
                <ion-label>https://psygraph.com</ion-label>
            </ion-item>
            <ion-item button (click)="close('https://github.com/Psygraph')">
                <ion-label>https://github.com/Psygraph</ion-label>
            </ion-item>
        </ion-list>
    `
})
export class PopoverPage {
    constructor(public popoverCtrl: PopoverController) {
    }
    
    close(url: string) {
        window.open(url, '_blank');
        this.popoverCtrl.dismiss();
    }
}
