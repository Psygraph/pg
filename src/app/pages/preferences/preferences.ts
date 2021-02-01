import {Component, NgZone} from '@angular/core';
import {NgForm} from '@angular/forms';
import {Page} from '../page/page';

import {AlertController, Config, IonRouterOutlet, LoadingController, ModalController, NavController, ToastController} from '@ionic/angular';
import {pgUI} from '../../../ts/ui';
import {pgDebug, pgUtil} from '../../../ts/util';
import {pg} from '../../../ts/pg';
import {pgNet} from '../../../ts/net';
import {RouterOutlet} from '@angular/router';
import {CustomRouterOutlet} from '../../CustomRouterOutlet';


@Component({
    selector: 'page-preferences', templateUrl: 'preferences.html', styleUrls: ['./preferences.scss'],
})
export class PreferencesPage extends Page {
    static initialized = false;
    submitted = false;
    supportMessage: string;
    darkMode = false;
    isOnline = false;
    wifiOnly = true;
    debug;
    showFooter;
    email;
    
    device = '';
    allDevices = [];
    hasBluetooth = false;
    
    constructor(public toastCtrl: ToastController,
                public modalCtrl: ModalController,
                public routerOutlet: IonRouterOutlet,
                public config: Config,
                public loadingCtrl: LoadingController,
                public alertCtrl: AlertController,
                public navCtrl: NavController,
                readonly ngZone: NgZone,) {
        super(modalCtrl, routerOutlet, config, alertCtrl, ngZone);
        if(PreferencesPage.initialized)
            this.pgPage = pgUI.preferences;
    }
    init() {
        //PreferencesPage.initialized = true;
        this.pgPage = pgUI.preferences;
        this.pgPage.init({});
        this.header.hasSettings = false;
        this.header.hasCategories = false;
        this.settingsButtons.hasApply = true;
        this.settingsButtons.hasOK = true;
        super.init();
    }
    //const toast = await this.toastCtrl.create({
    //  message: 'This does not actually send a preferences request.',
    //  duration: 3000
    //});
    //await toast.present();
    
    updateData(load) {
        const cat = pgUI.category();
        if(load) {
            this.email = this.pgPage.pageData.email;
            this.wifiOnly = this.pgPage.pageData.wifiOnly;
            this.allDevices = this.pgPage.getAllDevicesNV();
            this.debug = this.pgPage.pageData.debug;
            this.showFooter = this.pgPage.pageData.showFooter;
            this.darkMode = this.pgPage.pageData.darkMode;
        }
        else {
            this.pgPage.pageData.email = this.email;
            this.pgPage.pageData.wifiOnly = this.wifiOnly;
            this.pgPage.pageData.debug = this.debug;
            this.pgPage.pageData.showFooter = this.showFooter;
            this.pgPage.pageData.darkMode = this.darkMode;

            this.footer.showFooter = this.showFooter;
            Page.showFooter = this.showFooter;
            if (!this.darkMode) {
                window.dispatchEvent(new CustomEvent('pref:light'));
            } else {
                window.dispatchEvent(new CustomEvent('pref:dark'));
            }
        }
    }
    onDeleteSettings() {
        pgNet.selectAction('deleteSettings');
    }
    onDeleteEverything() {
        pgNet.selectAction('deleteEverything');
    }
    onDeleteEvents() {
        pgNet.selectAction('deleteEvents');
    }
    onBTConnect() {
    }
    onDownload() {
        pgNet.selectAction('downloadEvents');
    }
    onUpload() {
        pgNet.selectAction('uploadFiles');
    }
    onEmailFiles() {
        if(this.email==="debug") {
            this.debug = true;
            pgDebug.debug = true;
        }
        else {
            pgNet.sendEmail(this.email);
        }
    }
    onDevicePrefs(device) {
        this.pgPage.deviceSettings(device, callback);
        function callback(success) {
            if(success) {
            }
        }
    }
    onCancel() {
        super.onCancel();
        this.navCtrl.pop();
    }
    onOK() {
        super.onOK();
        this.navCtrl.pop();
    }
}

// If the user enters text in the preferences question and then navigates
// without submitting first, ask if they meant to leave the page
// async ionViewCanLeave(): Promise<boolean> {
//   // If the preferences message is empty we should just navigate
//   if (!this.supportMessage || this.supportMessage.trim().length === 0) {
//     return true;
//   }

//   return new Promise((resolve: any, reject: any) => {
//     const alert = await this.alertCtrl.create({
//       title: 'Leave this page?',
//       message: 'Are you sure you want to leave this page? Your preferences message will not be submitted.',
//       buttons: [
//         { text: 'Stay', handler: reject },
//         { text: 'Leave', role: 'cancel', handler: resolve }
//       ]
//     });

//     await alert.present();
//   });
// }
