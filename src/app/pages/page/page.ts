import {AfterViewInit, ElementRef, NgZone, ViewChild} from '@angular/core';
import {pgUI} from '../../../ts/ui';
import {Config, IonContent, IonRouterOutlet, ModalController, AlertController, NavController} from '@ionic/angular';
import {HeaderWidget} from '../../widgets/header/header';
import {FooterWidget} from '../../widgets/footer/footer';
import {DialogPage} from '../../widgets/dialog/dialog';
import {SettingsButtonsWidget} from '../../widgets/settingsButtons/settingsButtons';
import {pgNet} from '../../../ts/net';
import {pgDebug, pgUtil} from '../../../ts/util';
import {pg} from '../../../ts/pg';
import {CategoryFilterPage} from '../../widgets/category-filter/category-filter';
import {SettingsPage} from '../../widgets/settings/settings';

import * as $ from 'jquery';
import {RouterOutlet} from '@angular/router';
import {CustomRouterOutlet} from '../../CustomRouterOutlet';

export class Page {
    static showFooter = true;
    //static lastEventPage = '';

    @ViewChild(IonContent, {static: true}) content: IonContent;
    @ViewChild(HeaderWidget, {static: true}) header: HeaderWidget;
    @ViewChild(FooterWidget, {static: true}) footer: FooterWidget;
    @ViewChild(SettingsButtonsWidget, {static: true}) settingsButtons: SettingsButtonsWidget;
    
    pgPage = null;
    isWebBrowser: boolean;
    viewReady = false;
    hasModal = false;
    // boolean values indicating which sections are being shown
    mainSection = true;
    settingsSection = false;
    infoSection = false;
    
    constructor(public modalCtrl: ModalController,
                public routerOutlet: IonRouterOutlet,
                public config: Config,
                public alertController: AlertController,
                readonly ngZone: NgZone,
    ) {
        this.mainSection = true;
        this.settingsSection = false;
        this.infoSection = false;
    }
    init() {
        this.isWebBrowser = pgUtil.isWebBrowser;
        if (this.settingsButtons) {
            this.settingsButtons.hasApplyAll = this.header.hasCategories;
            this.settingsButtons.onCancel = this.onCancel.bind(this);
            this.settingsButtons.onApply = this.onApply.bind(this);
            this.settingsButtons.onOK = this.onOK.bind(this);
        }
        Page.showFooter = pg.getPageDataValue('preferences','showFooter', true);
        this.footer.tabBar.selectedTab = this.pgPage.name;
        this.setCategoryColor();
        this.show();
    }
    onShow() {
        this.ngZone.run(() => {
            if(!this.pgPage) {
                pgUI.registerPage(this); // this line kicks off initialization
            }
            else {
                this.show();
            }
            this.footer.showFooter = Page.showFooter;
            pgNet.syncSoon();
        });
    }
    onHide() {
        if (this.pgPage) {
            this.pgPage.updateView(false);
            this.header.updateView(false);
        }
    }
    ngOnInit() {
    }
    ngAfterContentInit() {
    }
    ionViewWillEnter() {
    }
    ionViewDidEnter() {
        this.onShow();
    }
    ionViewWillLeave() {
        this.onHide();
    }
    show() {
        this.pgPage.updateView(true);
        this.header.page = this; // is this line necessary?
        this.header.updateView(true);
        this.updateData(true);
        this.setCategoryColor();
        pgUI.setCB(this.alertCB.bind(this), this.dialogCB.bind(this));
    }
    updateData(load) {
        const cat = pgUI.category();
        if(load) {
            //this.applyAll = this.pgPage.pageData[cat].applyAll;
        } else {
            //this.pgPage.pageData[cat].applyAll = this.applyAll;
        }
    }
    changeCategory(cat) {
        this.pgPage.gotoCategory(cat);
        this.updateData(true);
        this.header.pgCategory = pgUI.category();
        this.setCategoryColor();
        pgNet.syncSoon();
    }
    setCategoryColor(cat = pgUI.category()) {
        let rgbcolor = pg.getCategoryColor(cat);
        let root = document.documentElement;
        //root.style.setProperty('--background', this.color);
        root.style.setProperty('--ion-background-color', rgbcolor);
    }
    onCancel() {
        this.header.onShowSettings(false);
    }
    onApply() {
        this.updateData(false);
        this.pgPage.updateData(false);
        this.updateData(true);
    }
    onOK() {
        this.updateData(false);
        this.pgPage.updateData(false, this.settingsButtons.applyAll);
        this.header.onShowSettings(false);
    }
    alertCB(alertInfo) {
        this.alertController.create(alertInfo).then(res => {
            res.present();
        });
    }
    async dialogCB(dialogInfo) {
        const modal = await this.modalCtrl.create({
            component: DialogPage,
            componentProps: {
                'info': dialogInfo
            }
        });
        await modal.present();
        const {data} = await modal.onWillDismiss();
        if(data) {
            dialogInfo.callback(data.success, data);
        }
        else {
            dialogInfo.callback(false, {});
        }
    }
    /*
    async onShowSettings() {
        const categories = pg.categories;
        const activeCategory = pgUI.category();
        
        const modal = await this.modalCtrl.create({
            component: SettingsPage,
            swipeToClose: true,
            presentingElement: this.routerOutlet.nativeEl,
            componentProps: {
                page: this,
                content: $("#" + this.pgPage.name + "_settingsContainer").html()
            }
        });
        await modal.present();
        
        const {data} = await modal.onWillDismiss();
        if (data) {
        }
    }
    */
}
