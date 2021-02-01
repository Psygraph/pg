import {Component, ViewChild, ElementRef, NgZone} from '@angular/core';
import {AlertController, Config, IonContent, IonRouterOutlet, LoadingController, ModalController} from '@ionic/angular';
import {Page} from '../page/page';
import {pgUI} from '../../../ts/ui';
import {pgUtil} from '../../../ts/util';
import {RouterOutlet} from '@angular/router';
import {CustomRouterOutlet} from '../../CustomRouterOutlet';

@Component({
    selector: 'page-map', templateUrl: 'map.html', styleUrls: ['./map.scss']
})
export class MapPage extends Page {
    static initialized = false;
    @ViewChild(IonContent, {static: true}) content: IonContent;
    @ViewChild('mapCanvas', {static: true}) mapElement: ElementRef;
    showMarkers;
    showPaths;
    allProviders;
    provider;
    
    constructor(public modalCtrl: ModalController,
                public routerOutlet: IonRouterOutlet,
                public config: Config,
                public alertCtrl: AlertController,
                readonly ngZone: NgZone,) {
        super(modalCtrl, routerOutlet, config, alertCtrl, ngZone);
        if(MapPage.initialized)
            this.pgPage = pgUI.map;
    }
    init() {
        //MapPage.initialized = true;
        this.pgPage = pgUI.map;
        this.pgPage.init({elementID: this.mapElement.nativeElement});
        super.init();
    }
    
    updateData(load) {
        const cat = pgUI.category();
        if (load) {
            this.showMarkers = this.pgPage.pageData[cat].showMarkers;
            this.showPaths = this.pgPage.pageData[cat].showPaths;
            this.allProviders = this.pgPage.getAllProvidersNV();
            this.provider = this.pgPage.pageData[cat].provider;
        } else {
            this.pgPage.pageData[cat].showMarkers = this.showMarkers;
            this.pgPage.pageData[cat].showPaths = this.showPaths;
            this.pgPage.pageData[cat].provider = this.provider;
            //this.addTileLayer();
            //this.addMarkers();
            //this.addLines();
        }
    }
    
}
