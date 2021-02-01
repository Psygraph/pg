import {Component, NgZone, ViewChild} from '@angular/core';
import {
    AlertController,
    Config,
    IonRouterOutlet,
    LoadingController,
    ModalController, NavController,
    PopoverController
} from '@ionic/angular';
import {PopoverPage} from '../../widgets/popover/popover';
import {Page} from '../page/page';
import {ButtonsWidget} from '../../widgets/buttons/buttons';
import {pgUI} from '../../../ts/ui';
import {RouterOutlet} from '@angular/router';
import {CustomRouterOutlet} from '../../CustomRouterOutlet';

@Component({
    selector: 'page-about', templateUrl: 'about.html', styleUrls: ['./about.scss'],
})
export class AboutPage extends Page {
    static initialized = false;
    @ViewChild('about_buttons', {static: true}) buttons: ButtonsWidget;
    intro;
    
    constructor(public modalCtrl: ModalController,
                public routerOutlet: IonRouterOutlet,
                public config: Config,
                public loadingCtrl: LoadingController,
                public alertCtrl: AlertController,
                public popoverCtrl: PopoverController,
                public navCtrl: NavController,
                readonly ngZone: NgZone,) {
        super(modalCtrl, routerOutlet, config, alertCtrl, ngZone);
        if(AboutPage.initialized)
            this.pgPage = pgUI.about;
    }
    
    init() {
        //AboutPage.initialized = true;
        this.pgPage = pgUI.about;
        this.pgPage.init({});
        this.header.hasSettings = false;
        this.header.hasCategories = false;
        this.header.hasTutorial = true;
        this.header.hasModal = true;
        this.settingsButtons.hasText = false;
        this.settingsButtons.hasCancel = false;
        this.settingsButtons.hasApply = false;
        this.settingsButtons.hasOK = true;
        super.init();
    }
    updateData(load) {
        const cat = pgUI.category();
        super.updateData(load);
        if (load) {
            this.intro = this.pgPage.pageData.intro;
        } else {
            this.pgPage.pageData.intro = this.intro;
        }
    }
    show() {
        super.show();
        if (this.intro) {
            this.openTutorial();
        }
    }
    
    async openModal(event: Event) {
        const popover = await this.popoverCtrl.create({
            component: PopoverPage, event
        });
        await popover.present();
        
        //$ionicModal.fromTemplateUrl('modal.html', {
        //    scope: $scope, animation: 'slide-in-up'
        //}).then(function(modal) {
        //    $scope.modal = modal;
        //});
    }
    openTutorial() {
        window.dispatchEvent(new CustomEvent('user:tutorial'));
    }
    onOK() {
        super.onOK();
        this.navCtrl.pop();
    }
}
