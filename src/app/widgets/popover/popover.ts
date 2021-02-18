import {Component} from '@angular/core';
import {PopoverController} from '@ionic/angular';

@Component({
    template: `
        <ion-item>
            <ion-text><h3>Psygraph v0.9.3</h3></ion-text>
        </ion-item>
        <ion-grid>
            <ion-row (click)="close('https://psygraph.com')">
                <ion-col><ion-note>Web site</ion-note></ion-col>
                <ion-col><ion-text><a href="https://psygraph.com">https://psygraph.com</a></ion-text></ion-col>
            </ion-row>
            <ion-row (click)="close('https://psygraph.com')">
                <ion-col><ion-note>Legal</ion-note></ion-col>
                <ion-col><ion-text><a href="https://psygraph.com/legal">https://psygraph.com/legal</a></ion-text></ion-col>
            </ion-row>
            <ion-row (click)="close('https://github.com/Psygraph')">
                <ion-col><ion-note>Source code</ion-note></ion-col>
                <ion-col><ion-text><a href="https://github.com/Psygraph">https://github.com/Psygraph</a></ion-text></ion-col>
            </ion-row>
        </ion-grid>
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
