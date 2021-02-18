import {Component, ViewChild, ElementRef, AfterViewInit} from '@angular/core';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {Config, IonicModule, IonRouterOutlet, ModalController} from '@ionic/angular';
import {pgUI} from '../../../ts/ui';
import {pg} from '../../../ts/pg';
import {CategoryFilterPage} from '../category-filter/category-filter';

import * as $ from 'jquery';
import {RouterOutlet} from '@angular/router';
//import {CustomRouterOutlet} from '../../CustomRouterOutlet';

@Component({
    selector: 'header',
    templateUrl: './header.html',
    styleUrls: ['./header.scss'],
})

export class HeaderWidget {
    ios             = false;
    
    page            = null;
    pgPage          = '';
    pgCategory      = '';
    
    hasSettings     = true;
    hasTutorial     = false;
    hasModal        = false;
    
    hasCategories   = true;
    showSettings    = false;
    useJquery = true;
    
    constructor(
        public modalCtrl: ModalController,
        public routerOutlet: IonRouterOutlet,
        public config: Config
    ) {
    }
    updateView(show) {
        if(show) {
            let page = pgUI.page();
            page = page.charAt(0).toUpperCase() + page.slice(1);
            this.pgPage = page;
            this.pgCategory = pgUI.category();
            this.showMainSection(true);
        }
        else {
            this.showSettingsSection(false);
        }
    }
    onOpenModal() {
        this.page.openModal();
    }
    // reserved for use by category switcher
    onShowSettings(show) {
        this.showMainSection(!show);
        this.showSettingsSection(show);
        //this.showInfoSection(show);
        this.page.pgPage.updateView(!show);
        this.page.updateData(show);
    }
    showMainSection(show) {
        const pagename = this.page.pgPage.name;
        if(show && !this.page.mainSection) {
            $("#" + pagename + "_main").show();
            this.page.mainSection = true;
        }
        else if(!show && this.page.mainSection) {
            $("#" + pagename + "_main").hide();
            this.page.mainSection = false;
        }
    }
    showSettingsSection(show) {
        const pagename = this.page.pgPage.name;
        if(show && !this.page.settingsSection) {
            $("#" + pagename + "_settings").show();
            this.page.settingsSection = true;
        }
        else if(!show && this.page.settingsSection) {
            $("#" + pagename + "_settings").hide();
            this.page.settingsSection = false;
        }
        this.showSettings = this.page.settingsSection;
    }
    showInfoSection(show) {
        const pagename = this.page.pgPage.name;
        if(show && !this.page.infoSection) {
            $("#" + pagename + "_info").show();
            this.page.infoSection = true;
        }
        else if(!show && this.page.infoSection) {
            $("#" + pagename + "_info").hide();
            this.page.infoSection = false;
        }
    }
    async onShowCategories() {
        const categories = pg.categories;
        const activeCategory = pgUI.category();
        
        const modal = await this.modalCtrl.create({
            component: CategoryFilterPage,
            swipeToClose: true,
            presentingElement: this.routerOutlet.nativeEl,
            componentProps: {
                categories: categories,
                activeCategory: activeCategory
            }
        });
        await modal.present();
        
        const {data} = await modal.onWillDismiss();
        if (data) {
            this.page.changeCategory(data);
        }
    }
}
