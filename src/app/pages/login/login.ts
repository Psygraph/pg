import {Component, NgZone} from '@angular/core';
import {NgForm} from '@angular/forms';
import {Router, RouterOutlet} from '@angular/router';
import {pgUI} from '../../../ts/ui';
import {AlertController, Config, IonRouterOutlet, LoadingController, ModalController, ToastController} from '@ionic/angular';
import {Page} from '../page/page';
import {pgNet} from '../../../ts/net';
import {pg} from '../../../ts/pg';
import {pgUtil} from '../../../ts/util';
//import {CustomRouterOutlet} from '../../CustomRouterOutlet';

@Component({
    selector: 'page-login', templateUrl: 'login.html', styleUrls: ['./login.scss'],
})
export class LoginPage extends Page {
    static initialized = false;
    username;
    password;
    email;
    server;
    allServers;
    isLoggedIn = false;
    
    constructor(public toastCtrl: ToastController,
                public modalCtrl: ModalController,
                public routerOutlet: IonRouterOutlet,
                public config: Config,
                public loadingCtrl: LoadingController,
                private router: Router,
                public alertCtrl: AlertController,
                readonly ngZone: NgZone,) {
        super(modalCtrl, routerOutlet, config, alertCtrl, ngZone);
        if(LoginPage.initialized)
            this.pgPage = pgUI.login;
    }
    
    init() {
        //LoginPage.initialized = true;
        this.pgPage = pgUI.login;
        this.pgPage.init({});
        this.header.hasSettings = false;
        this.header.hasCategories = false;
        this.isLoggedIn = this.pgPage.pageData.isLoggedIn;
        //this.settingsButtons.hasApply = true;
        //this.settingsButtons.hasOK = false;
        super.init();
    }
    updateData(load) {
        const cat = pgUI.category();
        if (load) {
            this.username = this.pgPage.pageData.username;
            this.password = this.pgPage.pageData.password;
            this.email = this.pgPage.pageData.email;
            this.allServers = this.pgPage.getAllServersNV();
            this.server = this.pgPage.pageData.server;
        } else {
            this.pgPage.pageData.username = this.username;
            this.pgPage.pageData.password = this.password;
            this.pgPage.pageData.email = this.email;
            this.pgPage.pageData.server = this.server;
        }
    }
    onLogin() {
        this.pgPage.login(this.username, this.password, this.email, this.server, this.loginCB.bind(this));
    }
    onLogout() {
        this.pgPage.logout(this.logoutCB.bind(this));
    }
    loginCB(success) {
        this.isLoggedIn = this.pgPage.isLoggedIn;
        if (success) {
            window.dispatchEvent(new CustomEvent('user:login'));
        }
    }
    logoutCB(success) {
        this.isLoggedIn = this.pgPage.isLoggedIn;
        window.dispatchEvent(new CustomEvent('user:logout'));
    }
    onSignup() {
        //this.router.navigateByUrl('https://psygraph.com');
    }
}
