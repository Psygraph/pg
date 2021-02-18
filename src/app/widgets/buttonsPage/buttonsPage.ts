import {Component} from '@angular/core';
import {Config, ModalController, NavParams} from '@ionic/angular';

@Component({
    selector: 'page-buttons',
    templateUrl: 'buttonsPage.html',
    styleUrls: ['buttonsPage.scss']
})
export class ButtonsPage {
    page;
    
    constructor(private config: Config,
                public modalCtrl: ModalController,
                public navParams: NavParams) {
        this.page = this.navParams.get('page');
    }
    onLeft() {
        this.page.pgPage.lever("left");
    }
    onRight() {
        this.page.pgPage.lever("right");
    }
    onDone() {
        this.modalCtrl.dismiss();
    }
}
