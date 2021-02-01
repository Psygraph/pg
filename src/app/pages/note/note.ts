import {Component, NgZone, ViewChild} from '@angular/core';
import {AlertController, Config, IonContent, IonRouterOutlet, LoadingController, ModalController} from '@ionic/angular';
import {ButtonsWidget} from '../../widgets/buttons/buttons';
import {Page} from '../page/page';

import {pgUI} from '../../../ts/ui';
import {RouterOutlet} from '@angular/router';
import {CustomRouterOutlet} from '../../CustomRouterOutlet';

@Component({
    selector: 'page-note', templateUrl: 'note.html', styleUrls: ['./note.scss'],
})
export class NotePage extends Page {
    static initialized = false;
    @ViewChild(IonContent, {static: true}) content: IonContent;
    @ViewChild('note_buttons', {static: true}) buttons: ButtonsWidget;
    //@ViewChild("note_title", {static: true}) time: IonInput; //HTMLIonInputElement;
    //@ViewChild("note_text", {static: true}) dur: IonInput;
    title;
    text;
    addText;
    addLocation;
    showConfirmation;
    showAudioControls = false;
    
    constructor(public modalCtrl: ModalController,
                public routerOutlet: IonRouterOutlet,
                public config: Config,
                public alertCtrl: AlertController,
                readonly ngZone: NgZone,) {
        super(modalCtrl, routerOutlet, config, alertCtrl, ngZone);
        if(NotePage.initialized)
            this.pgPage = pgUI.note;
    }
    init() {
        //NotePage.initialized = true;
        this.pgPage = pgUI.note;
        this.pgPage.init({titleCB: this.titleCB.bind(this),
            textCB: this.textCB.bind(this),
            showAudioControlsCB: this.showAudioControlsCB.bind(this)});
        this.buttons.setPage(this.pgPage);
        super.init();
    }
    updateData(load) {
        const cat = pgUI.category();
        if (load) {
            this.addText = this.pgPage.pageData[cat].addText;
            this.addLocation = this.pgPage.pageData[cat].addLocation;
            this.showConfirmation = this.pgPage.pageData[cat].showConfirmation;
            //$("#note_enhancedEditor").prop("checked", this.data.enhancedEditor).checkboxradio("refresh");
        } else {
            this.pgPage.pageData[cat].addText = this.addText;
            this.pgPage.pageData[cat].addLocation = this.addLocation;
            this.pgPage.pageData[cat].showConfirmation = this.showConfirmation;
            //this.data.enhancedEditor=   $("#note_enhancedEditor")[0].checked
            //this.createEnhancedEditor(this.data.enhancedEditor);
        }
    }
    titleCB(text) {
        if (typeof (text) !== 'undefined') {
            this.title = text;
        }
        return this.title;
    }
    textCB(text) {
        if (typeof (text) !== 'undefined') {
            this.text = text;
        }
        return this.text;
    }
    showAudioControlsCB(showAudioControls) {
        this.showAudioControls = showAudioControls;
    }
    onPlayRecorded() {
        this.pgPage.playRecorded();
    }
    onDeleteRecorded() {
        this.pgPage.deleteRecorded();
    }
}
