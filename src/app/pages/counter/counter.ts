import {Component, NgZone, ViewChild} from '@angular/core';
import {AlertController, Config, IonContent, IonRouterOutlet, LoadingController, ModalController} from '@ionic/angular';
import {ButtonsWidget} from '../../widgets/buttons/buttons';
import {ClockWidget} from '../../widgets/clock/clock';
import {PickerWidget} from '../../widgets/picker/picker';
import {Page} from '../page/page';

import {pgUI} from '../../../ts/ui';
import {pgUtil} from '../../../ts/util';

import * as $ from 'jquery';
import '../../../ts/3p/jquery.knob.js';
import {RouterOutlet} from '@angular/router';
import {CustomRouterOutlet} from '../../CustomRouterOutlet';

@Component({
    selector: 'page-counter', templateUrl: 'counter.html', styleUrls: ['./counter.scss'],
})
export class CounterPage extends Page {
    static initialized = false;
    @ViewChild(IonContent, {static: true}) content: IonContent;
    @ViewChild('counter_buttons', {static: true}) buttons: ButtonsWidget;
    @ViewChild('counter', {static: true}) counter: ClockWidget;
    //@ViewChild("counter_enso", {static: false}) enso;
    enso;
    target;
    resetBehavior;
    allResetBehavior;
    countShakes;
    shakeThreshold;
    shakeTimeout;
    
    showEnso = true;
    knobOpts = {
        min: 0,
        max: 1,
        step: 0.01,
        thickness: 0.08,
        readOnly: true,
        rotation: 'clockwise',
        lineCap: 'round',
        fgColor: 'rgba(0,0,0,1)',
        bgColor: 'rgba(0,0,0,0)',
        displayInput: false,
    };
    
    constructor(public modalCtrl: ModalController,
                public routerOutlet: IonRouterOutlet,
                public config: Config,
                public alertCtrl: AlertController,
                readonly ngZone: NgZone,) {
        super(modalCtrl, routerOutlet, config, alertCtrl, ngZone);
        if(CounterPage.initialized)
            this.pgPage = pgUI.counter;
    }
    init() {
        const cat = pgUI.category();
        //CounterPage.initialized = true;
        this.pgPage = pgUI.counter;
        this.pgPage.init({setCountCB: this.setTextCB.bind(this)});
        this.buttons.setPage(this.pgPage);
        this.showEnso = this.pgPage.pageData[cat].showEnso;
        this.enso = $('#counter_enso');
        this.enso.knob(this.knobOpts);
        this.enso.trigger('configure', this.knobOpts);
        super.init();
    }
    
    updateData(load) {
        const cat = pgUI.category();
        if (load) {
            this.target = this.pgPage.pageData[cat].target;
            this.resetBehavior = this.pgPage.pageData[cat].resetBehavior;
            this.allResetBehavior = this.pgPage.getAllResetBehaviorNV();
            this.countShakes = this.pgPage.pageData[cat].countShakes;
            this.shakeThreshold = 200*Math.log2(this.pgPage.pageData[cat].shakeThreshold+1);
            this.shakeTimeout = this.pgPage.pageData[cat].shakeTimeout;
            this.showEnso = this.pgPage.pageData[cat].showEnso;
        } else {
            this.pgPage.pageData[cat].target = this.target;
            this.pgPage.pageData[cat].resetBehavior = this.resetBehavior;
            this.pgPage.pageData[cat].countShakes = this.countShakes;
            // map into exponential, range [0..4]
            this.pgPage.pageData[cat].shakeThreshold = Math.pow(2, this.shakeThreshold/200)-1;
            this.pgPage.pageData[cat].shakeTimeout = this.shakeTimeout;
            this.pgPage.pageData[cat].showEnso = this.showEnso;
        }
    }
    setTextCB(data) {
        let opts = {
            show: data.showEnso && data.target > 0,
            count: data.count,
            target: data.target,
        };
        this.counter.setTextCB(opts.count);
        let knobOpts = {
            fgColor: 'rgba(0,0,0,1)'
        };
        if (opts.show) {
            if (opts.count === opts.target) {
                knobOpts.fgColor = 'rgba(0, 160, 0, 1)';
            } else if (opts.count > opts.target) {
                knobOpts.fgColor = 'rgba(160, 0, 0, 1)';
            }
        } else {
            knobOpts.fgColor = 'rgba(0,0,0,0)';
        }
        this.enso.val(opts.count / opts.target).trigger('change');
        this.enso.trigger('configure', knobOpts);
    }
}
