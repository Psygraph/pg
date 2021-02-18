import {Component, ViewChild, ElementRef, NgZone} from '@angular/core';
import {AlertController, Config, IonContent, IonRouterOutlet, ModalController} from '@ionic/angular';
import {Page} from '../page/page';
import {pgUI} from '../../../ts/ui';
import {RouterOutlet} from '@angular/router';
//import {CustomRouterOutlet} from '../../CustomRouterOutlet';

@Component({
    selector: 'page-graph', templateUrl: 'graph.html', styleUrls: ['./graph.scss']
})
export class GraphPage extends Page {
    static initialized = false;
    @ViewChild(IonContent, {static: true}) content: IonContent;
    @ViewChild('graph_graph', {static: true}) graph: ElementRef;
    allSignals;
    signals = [];
    allIntervals = [];
    interval = "";
    
    constructor(public modalCtrl: ModalController,
                public routerOutlet: IonRouterOutlet,
                public config: Config,
                public alertCtrl: AlertController,
                readonly ngZone: NgZone) {
        super(modalCtrl, routerOutlet, config, alertCtrl, ngZone);
        if(GraphPage.initialized)
            this.pgPage = pgUI.graph;
    }
    
    init() {
        //GraphPage.initialized = true;
        this.pgPage = pgUI.graph;
        this.pgPage.init({elementID: this.graph.nativeElement});
        super.init();
    }
    
    updateData(load) {
        const cat = pgUI.category();
        if (load) {
            this.allSignals = this.pgPage.getAllSignalsNV();
            this.signals = this.pgPage.pageData[cat].signals;
            this.allIntervals = this.pgPage.getAllIntervalsNV();
            this.interval = this.pgPage.pageData[cat].interval.toString();
        } else {
            this.pgPage.pageData[cat].interval = parseInt(this.interval);
            this.pgPage.pageData[cat].signals = this.signals;
            this.pgPage.graph.create(this.signals, this.interval);
        }
    }
}
