import {Component, ViewChild, AfterViewInit, ElementRef, NgZone} from '@angular/core';
import {AlertController, Config, IonContent, IonRouterOutlet, LoadingController, ModalController} from '@ionic/angular';
import {ButtonsWidget} from '../../widgets/buttons/buttons';
import {ClockWidget} from '../../widgets/clock/clock';
import {Page} from '../page/page';

import {pgUI} from '../../../ts/ui';
import {Stopwatch} from '../../../ts/pages/stopwatch';
import {RouterOutlet} from '@angular/router';
//import {CustomRouterOutlet} from '../../CustomRouterOutlet';

@Component({
    selector: 'page-stopwatch', templateUrl: 'stopwatch.html', styleUrls: ['./stopwatch.scss'],
})
export class StopwatchPage extends Page {
    static initialized = false;
    @ViewChild('stopwatch_buttons', {static: true}) buttons: ButtonsWidget;
    @ViewChild('stopwatch_time', {static: true}) time: ClockWidget;
    @ViewChild('stopwatch_graph', {static: true}) graph: ElementRef;
    signals = [];
    allSignals;
    showGraph = false;
    
    constructor(public modalCtrl: ModalController,
                public routerOutlet: IonRouterOutlet,
                public config: Config,
                public alertCtrl: AlertController,
                readonly ngZone: NgZone,) {
        super(modalCtrl, routerOutlet, config, alertCtrl, ngZone);
        if(StopwatchPage.initialized)
            this.pgPage = pgUI.stopwatch;
    }
    init() {
        //StopwatchPage.initialized = true;
        this.pgPage = pgUI.stopwatch;
        this.pgPage.init({setTimeCB: this.time.setTextCB.bind(this.time), elementID: this.graph.nativeElement});
        super.init();
    }
    show() {
        this.buttons.setPage(this.pgPage);
        super.show();
    }
    updateData(load) {
        const cat = pgUI.category();
        if (load) {
            this.allSignals = this.pgPage.getAllSignalsNV();
            this.signals = this.pgPage.pageData[cat].signals;
            this.showGraph = this.pgPage.pageData[cat].showGraph;
        } else {
            this.pgPage.pageData[cat].signals = this.signals;
            this.pgPage.pageData[cat].showGraph = this.showGraph;
        }
    }
}
