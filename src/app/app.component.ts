import {Component, OnInit, ViewEncapsulation} from '@angular/core';
import {Router} from '@angular/router';
import {SwUpdate} from '@angular/service-worker';
import {MenuController, Platform, ToastController} from '@ionic/angular';
import {SplashScreen} from '@ionic-native/splash-screen/ngx';
import {StatusBar} from '@ionic-native/status-bar/ngx';
import {Storage} from '@ionic/storage';

import {Psygraph} from '../ts/psygraph';
import {pg} from '../ts/pg';
import {pgUI} from '../ts/ui';
import {pgNet} from '../ts/net';

@Component({
    selector: 'app-root', templateUrl: './app.component.html', styleUrls: ['./app.component.scss'], encapsulation: ViewEncapsulation.None
})
export class AppComponent implements OnInit {
    appPages = [{
        title: 'Home', url: '/pages/home', icon: 'calendar'
    }, {
        title: 'Stopwatch', url: '/pages/stopwatch', icon: 'stopwatch'
    }, {
        title: 'Timer', url: '/pages/timer', icon: 'notifications'
    }, {
        title: 'Counter', url: '/pages/counter', icon: 'bar-chart'
    }, {
        title: 'Note', url: '/pages/note', icon: 'mic'
    }, {
        title: 'List', url: '/pages/list', icon: 'list'
    }, {
        title: 'Graph', url: '/pages/graph', icon: 'pulse'
    },
        {title: 'Map', url: '/pages/map', icon: 'map'}
    ];
    prevComponentReference = null;
    loggedIn = false;
    dark = false;
    
    constructor(private menu: MenuController, private platform: Platform, private router: Router, private splashScreen: SplashScreen, private statusBar: StatusBar, private storage: Storage, private swUpdate: SwUpdate, private toastCtrl: ToastController,) {
        this.initializeApp();
    }
    async ngOnInit() {
        this.listenForLoginEvents();
        this.swUpdate.available.subscribe(async res => {
            const toast = await this.toastCtrl.create({
                message: 'Update available!', position: 'bottom', buttons: [{
                    role: 'cancel', text: 'Reload'
                }]
            });
            await toast.present();
            toast
                .onDidDismiss()
                .then(() => this.swUpdate.activateUpdate())
                .then(() => window.location.reload());
        });
    }
    initializeApp() {
        this.platform.ready().then(() => {
            this.statusBar.styleDefault();
            this.splashScreen.hide();
            this.init();
        });
    }
    listenForLoginEvents() {
        const events = [{
            msg: 'user:tutorial', f: (() => {
                this.gotoPage('/tutorial');
            }).bind(this)
        }, {
            msg: 'pref:dark', f: (() => {
                this.dark = true;
            }).bind(this)
        }, {
            msg: 'pref:light', f: (() => {
                this.dark = false;
            }).bind(this)
        }, {
            msg: 'deviceready', f: console.log.bind("Got deviceready")
        },
        ];
        for (let i = 1; i < events.length; i++) {
            window.addEventListener(events[i].msg, events[i].f);
        }
    }
    async init() {
        await Psygraph.init();
        this.platform.pause.subscribe((result)=>{
            pgNet.onPause();
        });
        this.platform.resume.subscribe((result)=>{
            pgNet.onResume();
        });
        this.dark = pg.getPageDataValue('preferences','darkMode', false);
        this.gotoPage(pgUI.page(), pgUI.category());
    }
    gotoPage(page = pgUI.page(), category = pgUI.category()) {
        if (["home","stopwatch","timer","counter","note"].find( (a) => a==page)) {
            page = "/pages/"+page;
        }
        this.router.navigate([page]);
    }
    onActivate(componentReference) {
        //if(this.prevComponentReference)
        //    this.prevComponentReference.onHide();
        //console.log(componentReference);
        //componentReference.onShow();
    }
    /*
    onLogin() {
      this.router.navigateByUrl('/login');
    }
    onLogout() {
      window.dispatchEvent(new CustomEvent('user:logout'));
      this.router.navigateByUrl('/home');
    }
    */
}
