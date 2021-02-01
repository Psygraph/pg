import {Component, ViewChild} from '@angular/core';
import {Router} from '@angular/router';

import {MenuController, IonSlides} from '@ionic/angular';

import {Storage} from '@ionic/storage';
import {pgNet} from '../../../ts/net';

@Component({
    selector: 'page-tutorial', templateUrl: 'tutorial.html', styleUrls: ['./tutorial.scss'],
})
export class TutorialPage {
    showSkip = true;
    @ViewChild('slides', {static: true}) slides: IonSlides;
    
    constructor(public menu: MenuController, public router: Router, public storage: Storage) {
    }
    
    onSlideChangeStart(event) {
        event.target.isEnd().then(isEnd => {
            this.showSkip = !isEnd;
        });
    }
    
    ionViewWillEnter() {
        this.menu.enable(false);
    }
    
    ionViewDidLeave() {
        this.menu.enable(true);
    }
}
