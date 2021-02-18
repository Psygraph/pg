import {Component, ViewChild, AfterViewInit, ElementRef, ModuleWithProviders, NgModule, SkipSelf, Optional, NgZone} from '@angular/core';
import {LoadingController, IonContent, ModalController, IonRouterOutlet, Config, AlertController} from '@ionic/angular';
import {Page} from '../page/page';

import {pgUI} from '../../../ts/ui';
import {Home} from '../../../ts/pages/home';
import {PickerWidget} from '../../widgets/picker/picker';
import {RouterOutlet} from '@angular/router';
//import {CustomRouterOutlet} from '../../CustomRouterOutlet';

@Component({
    selector: 'page-home', templateUrl: 'home.html', styleUrls: ['./home.scss'],
})
export class HomePage extends Page {
    static initialized = false;
    @ViewChild(IonContent, {static: true}) content: IonContent;
    @ViewChild('picker', {static: true}) picker: PickerWidget;
    @ViewChild('home_graph', {static: true}) graph: ElementRef;
    allCategories;
    categories;
    signals = [];
    allSignals = [];
    interval;
    allIntervals = [];
    numIntervals;
    allNumIntervals = [];
    combinedIntervalName = '';
    
    constructor(public modalCtrl: ModalController,
                public routerOutlet: IonRouterOutlet,
                public config: Config,
                public loadingCtrl: LoadingController,
                public alertCtrl: AlertController,
                readonly ngZone: NgZone,) {
        super(modalCtrl, routerOutlet, config, alertCtrl, ngZone);
        if(HomePage.initialized)
            this.pgPage = pgUI.home;
    }
    init() {
        //HomePage.initialized = true;
        this.pgPage = pgUI.home;
        this.pgPage.init({elementID: this.graph.nativeElement});
        //this.header.hasCategories = false;
        super.init();
    }
    
    updateData(load) {
        const cat = pgUI.category();
        super.updateData(load);
        if (load) {
            this.allCategories = this.pgPage.getAllCategoriesNV();
            this.categories = this.pgPage.pageData[cat].categories;
            this.allSignals = this.pgPage.getAllSignalNV();
            this.signals = this.pgPage.pageData[cat].signals;
            this.allIntervals = this.pgPage.getAllIntervalsNV();
            this.interval = this.pgPage.pageData[cat].interval;
            this.allNumIntervals = this.pgPage.getAllNumIntervalsNV();
            this.numIntervals = this.pgPage.pageData[cat].numIntervals;
            this.setCombinedIntervalName();
        } else {
            this.pgPage.pageData[cat].categories = this.categories;
            this.pgPage.pageData[cat].signals = this.signals;
            this.pgPage.pageData[cat].interval = this.interval;
            this.pgPage.pageData[cat].numIntervals = this.numIntervals;
        }
    }
    setCombinedIntervalName() {
        let interval = this.interval;
        let intervalName = this.allIntervals.find((nv) => {
            return nv.value == interval;
        }).name;
        const numIntervalsName = this.allNumIntervals.find((nv) => {
            return nv.value == this.numIntervals;
        }).name;
        this.combinedIntervalName = numIntervalsName + ' ' + intervalName;
    }
    onIntervalClick() {
        const intervalIndex = this.allIntervals.findIndex((nv) => {
            return nv.value == this.interval;
        });
        const numIntervalsIndex = this.allNumIntervals.findIndex((nv) => {
            return nv.value == this.numIntervals;
        });
        let selected = [numIntervalsIndex, intervalIndex];
        let data = [this.allNumIntervals.map(a => a.name), this.allIntervals.map(a => a.name)];
        this.picker.showPicker(data, selected, this.pickerCB.bind(this));
    }
    pickerCB(success, values, data) {
        if(success) {
            this.numIntervals = this.allNumIntervals[values[0]].value;
            this.interval = this.allIntervals[values[1]].value;
            this.setCombinedIntervalName();
        }
    }
    async openSocial(network: string, fab: HTMLIonFabElement) {
        const loading = await this.loadingCtrl.create({
            message: `Posting to ${network}`, duration: (Math.random() * 1000) + 500
        });
        await loading.present();
        await loading.onWillDismiss();
        fab.close();
    }
    
}
/*
import { CommonModule } from '@angular/common';
import { FormsModule }  from '@angular/forms';
import { IonicModule }  from '@ionic/angular';
import { WidgetsComponent } from '../../widgets/widgets.component';

@NgModule({
    imports:      [ CommonModule, FormsModule, IonicModule, WidgetsComponent],
    declarations: [ HomePage ],
    exports:      [ HomePage ]
})
export class HomeModule {
    constructor(@Optional() @SkipSelf() parentModule?: HomeModule) {
        if (parentModule) {
            throw new Error(
                'HomeModule is already loaded. Import it in the AppModule only');
        }
    }
    
    static forRoot(): ModuleWithProviders<HomeModule> {
        return {
            ngModule: HomeModule,
            providers: [{provide: HomePage }]
        };
    }
}
*/
