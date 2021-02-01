import {Component, ViewChild, AfterViewInit, NgZone} from '@angular/core';
import {AlertController, Config, IonContent, IonRouterOutlet, LoadingController, ModalController, NavController} from '@ionic/angular';
import {ButtonsWidget} from '../../widgets/buttons/buttons';
import {ClockWidget} from '../../widgets/clock/clock';
import Picker from 'vanilla-picker';
import {Page} from '../page/page';

import {pgUI} from '../../../ts/ui';
import {pg} from '../../../ts/pg';
import {pgNet} from '../../../ts/net';
import {RouterOutlet} from '@angular/router';
import {CustomRouterOutlet} from '../../CustomRouterOutlet';

@Component({
    selector: 'page-categories', templateUrl: 'categories.html', styleUrls: ['./categories.scss'],
})
export class CategoriesPage extends Page {
    static initialized = false;
    categories;
    currentCategory;
    newCategory;
    sound;
    allSounds;
    style;
    allStyles;
    text;
    allTexts;
    rgbcolor;
    red = 255;
    green = 255;
    blue = 255;
    
    constructor(public modalCtrl: ModalController,
                public routerOutlet: IonRouterOutlet,
                public config: Config,
                public alertCtrl: AlertController,
                public navCtrl: NavController,
                readonly ngZone: NgZone,) {
        super(modalCtrl, routerOutlet, config, alertCtrl, ngZone);
        if(CategoriesPage.initialized)
            this.pgPage = pgUI.categories;
    }
    init() {
        //CategoriesPage.initialized = true;
        this.pgPage = pgUI.categories;
        this.pgPage.init({initSettingsCB: this.updateData.bind(this)});
        this.header.hasSettings = false;
        this.header.hasCategories = true;
        this.settingsButtons.hasApply = true;
        this.settingsButtons.hasApplyAll = false;
        this.settingsButtons.hasOK = true;
        super.init();
    }
    updateData(load) {
        const cat = pgUI.category();
        if (load) {
            this.categories = this.pgPage.pageData.categories;
            this.currentCategory = pgUI.category();
            this.sound = this.pgPage.pageData[cat].sound;
            this.allSounds = this.pgPage.getAllSoundsNV();
            this.style = this.pgPage.pageData[cat].style;
            this.allStyles = this.pgPage.getAllStylesNV();
            this.text = this.pgPage.pageData[cat].text;
            this.allTexts = this.pgPage.getAllTextsNV();
            this.red = this.pgPage.pageData[cat].color[0];
            this.green = this.pgPage.pageData[cat].color[1];
            this.blue = this.pgPage.pageData[cat].color[2];
            this.updateColor();
        } else {
            this.pgPage.pageData.categories = this.categories;
            this.pgPage.pageData[cat].sound = this.sound;
            this.pgPage.pageData[cat].style = this.style;
            this.pgPage.pageData[cat].text = this.text;
            this.pgPage.pageData[cat].color = [this.red, this.green, this.blue];
        }
    }
    
    // this.data.calendar = $("#categories_calendar")[0].checked ? 1 : 0;
    
    onCancel() {
        super.onCancel();
        this.navCtrl.pop();
    }
    onOK() {
        this.onApply();
        this.navCtrl.pop();
    }
    onApply() {
        // update data for added/removed categories
        this.pgPage.setCategories(this.categories);
        // ensure we are in a valid category
        this.changeCategory(pgUI.category());
        // rgular apply process
        //this.updateData(false);
        this.pgPage.updateData(false);
        //this.updateData(true);
        pgNet.syncSoon();
    }
    updateColor() {
        this.rgbcolor = "rgb("+this.red+","+this.green+","+this.blue+")";
    }
    
    onSelectSound() {
        this.pgPage.getFileURL('soundEdit');
    }
    onSelectStyle() {
        this.pgPage.getFileURL('styleEdit');
    }
    onSelectText() {
        this.pgPage.getFileURL('textEdit');
    }
    onAddCategory() {
        if (this.newCategory !== '') {
            this.categories.push(this.newCategory);
            this.newCategory = '';
        }
    }
    onRemoveCategory(category: string) {
        let ndx = this.categories.findIndex(a => a == category);
        this.categories.splice(ndx, 1);
    }
}
