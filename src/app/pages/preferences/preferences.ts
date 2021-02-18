import {Component, NgZone} from '@angular/core';
import {NgForm} from '@angular/forms';
import {Page} from '../page/page';

import {AlertController, Config, IonRouterOutlet, LoadingController, ModalController, NavController, ToastController} from '@ionic/angular';
import {pgUI} from '../../../ts/ui';
import {pgDebug, pgUtil} from '../../../ts/util';
import {pg} from '../../../ts/pg';
import {pgNet} from '../../../ts/net';
import {RouterOutlet} from '@angular/router';
//import {CustomRouterOutlet} from '../../CustomRouterOutlet';


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
    allBTDevices = [];
    connectedBTDevices = [];
    connectedBTDeviceName = 'none';
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
        if(PreferencesPage.initialized) {
            this.pgPage = pgUI.preferences;
        }
    }
    init() {
        //PreferencesPage.initialized = true;
        this.pgPage = pgUI.preferences;
        this.pgPage.init( {connectCB: this.updateDevsCB.bind(this)} );
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
            this.debug = this.pgPage.pageData.debug;
            this.showFooter = this.pgPage.pageData.showFooter;
            this.darkMode = this.pgPage.pageData.darkMode;
            this.updateDevsCB();
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
        this.updateData(true);
        this.updateData(false);
    }
    onDeleteEverything() {
        pgNet.selectAction('deleteEverything');
    }
    onDeleteEvents() {
        pgNet.selectAction('deleteEvents');
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
    onBTPermissions() {
        this.pgPage.doPermissions(cb.bind(this));
        function cb(success) {
            this.hasBluetooth = success;
        }
    }
    async onOpenDevice() {
        let name = this.connectedBTDeviceName;
        if(this.connectedBTDevices.length > 0) {
            if(name !== this.connectedBTDevices[0].name) {
                await this.pgPage.bluetoothDisconnect();
            }
        }
        else if(name !== "none") {
            await this.pgPage.bluetoothConnect(name);
        }
        this.updateDevsCB();
    }
    updateDevsCB() {
        this.allDevices = this.pgPage.getAllDevicesNV();
        this.allBTDevices = this.pgPage.getAllBTDevicesNV();
        this.allBTDevices.push({name: 'none', value: 'none'});
        this.connectedBTDevices = this.pgPage.getConnectedBTDevicesNV();
        if(this.connectedBTDevices.length) {
            this.connectedBTDeviceName = this.connectedBTDevices.map(a => a.name)[0];
        }
        else {
            this.connectedBTDeviceName = 'none';
        }
    }
    async onDevicePrefs(device) {
        await this.pgPage.deviceSettings(device, callback.bind(this));
        function callback(success) {
            this.updateDevsCB();
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
