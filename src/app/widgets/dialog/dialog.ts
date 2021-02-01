
import {Component, ViewChild, ElementRef, AfterViewInit, OnInit} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {Config, NavParams, IonRouterOutlet, ModalController} from '@ionic/angular';


@Component({
    selector: 'page-dialog',
    templateUrl: './dialog.html',
    styleUrls: ['./dialog.scss'],
})
export class DialogPage implements AfterViewInit {
    title: string;
    content;
    gather;
    callback;

    hasOK;
    hasCancel;

    info: {opts, content, callback};

    constructor(
        private config: Config,
        public modalCtrl: ModalController,
        public params: NavParams,
        private sanitizer: DomSanitizer
    ) {
        this.info       = params.get('info');
        this.callback   = this.info.callback;
        this.content    = sanitizer.bypassSecurityTrustHtml(this.info.content);
        this.title      = this.info.opts.title;
        if("gather" in this.info.opts)
            this.gather = this.info.opts.gather;
        else
            this.gather = ()=>{return {};};
        this.hasCancel  = typeof (this.info.opts.false) !== "undefined";
        this.hasOK      = typeof (this.info.opts.true) !== "undefined";
    }

    ngAfterViewInit() {
        //console.table(this.navParams);
        //this.modelId = this.navParams.data.paramID;
        //this.modalTitle = this.navParams.data.paramTitle;
    }
    async dismiss(success) {
        const data = this.gather();
        data.success = success;
        await this.modalCtrl.dismiss(data);
    }
    async onCancel() {
        await this.dismiss(false);
    }
    async onOK() {
        await this.dismiss(true);
    }
    async onOther() {
        await this.dismiss(false);
    }

}
