import {Component, ViewChild, ElementRef, NgZone} from '@angular/core';
import {AlertController, Config, IonContent, IonRouterOutlet, LoadingController, ModalController} from '@ionic/angular';
import {Page} from '../page/page';
import {pgUI} from '../../../ts/ui';
import {pgNet} from '../../../ts/net';
import {RouterOutlet} from '@angular/router';
import {CustomRouterOutlet} from '../../CustomRouterOutlet';

@Component({
    selector: 'page-list', templateUrl: 'list.html', styleUrls: ['./list.scss']
})
export class ListPage extends Page {
    static initialized = false;
    @ViewChild(IonContent, {static: true}) content: IonContent;
    showID;
    showDate;
    showPage;
    showData;
    allPages;
    pages;
    allEventSelections;
    eventSelection;
    allEventActions;
    eventAction;
    
    displayedColumns = ['ID', 'Date', 'Page', 'Data'];
    tableData = [];
    tableHeaders = [];
    
    constructor(public modalCtrl: ModalController,
                public routerOutlet: IonRouterOutlet,
                public config: Config,
                public alertCtrl: AlertController,
                readonly ngZone: NgZone,) {
        super(modalCtrl, routerOutlet, config, alertCtrl, ngZone);
        if(ListPage.initialized)
            this.pgPage = pgUI.list;
    }
    init() {
        //ListPage.initialized = true;
        this.pgPage = pgUI.list;
        this.pgPage.init({});
        super.init();
    }
    
    updateData(load) {
        const cat = pgUI.category();
        if (load) {
            this.allEventActions = this.pgPage.getAllEventActionsNV();
            this.allEventSelections = this.pgPage.getAllEventSelectionsNV();
            this.showID = this.pgPage.pageData[cat].showID;
            this.showDate = this.pgPage.pageData[cat].showDate;
            this.showPage = this.pgPage.pageData[cat].showPage;
            this.showData = this.pgPage.pageData[cat].showData;
            this.allPages = this.pgPage.getAllPagesNV();
            this.pages = this.pgPage.pageData[cat].pages;
            this.tableData = this.pgPage.getTableData();
            this.tableHeaders = this.pgPage.getTableHeaders();
        } else {
            this.pgPage.pageData[cat].showID = this.showID;
            this.pgPage.pageData[cat].showDate = this.showDate;
            this.pgPage.pageData[cat].showPage = this.showPage;
            this.pgPage.pageData[cat].showData = this.showData;
            this.pgPage.pageData[cat].pages = this.pages;
        }
    }
    show() {
        super.show();
        this.pgPage.selectEvents("");
    }
    itemClick(id) {
        this.pgPage.listSelectEvent(parseInt(id));
    }
    dataClick(fn) {
        for(let i=0; i<fn.length; i++) {
            fn[i]();
        }
    }
    isEventSelected(id) {
        return this.pgPage.isEventSelected(parseInt(id));
    }
    selectEvents() {
        this.pgPage.selectEvents(this.eventSelection);
        setTimeout((() => { this.eventSelection = ""; }).bind(this), 1000);
    }
    onEventAction() {
        this.pgPage.eventAction(this.eventAction);
        this.tableData = this.pgPage.getTableData();
        this.tableHeaders = this.pgPage.getTableHeaders();
        setTimeout((() => { this.eventAction = ""; }).bind(this), 1000);
    }
    showAlert(title, text) {
        this.pgPage.showAlert(title,text);
    }
    playRecorded(id, fn) {
        this.pgPage.playRecorded(id, fn);
    }
}
