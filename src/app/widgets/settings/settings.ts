
import {Component, ViewChild, ElementRef, AfterViewInit, OnInit} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {Config, NavParams, IonRouterOutlet, ModalController} from '@ionic/angular';


@Component({
    selector: 'settings-page',
    templateUrl: './settings.html',
    styleUrls: ['./settings.scss'],
})
export class SettingsPage implements AfterViewInit {
    page;
    content;

    constructor(
        private config: Config,
        public modalCtrl: ModalController,
        public params: NavParams,
        private sanitizer: DomSanitizer
    ) {
        this.page    = params.get('info');
        this.content = sanitizer.bypassSecurityTrustHtml(params.get('content'));
    }

    ngAfterViewInit() {
    }
    async dismiss() {
        await this.modalCtrl.dismiss("");
    }
    async onCancel() {
        await this.dismiss();
    }
    async onOK() {
        await this.dismiss();
    }
    async onApply() {
        await this.dismiss();
    }

}
