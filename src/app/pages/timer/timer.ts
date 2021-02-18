import {Component, NgZone, ViewChild} from '@angular/core';
import {AlertController, Config, IonContent, IonDatetime, IonRouterOutlet, LoadingController, ModalController} from '@ionic/angular';
import {ButtonsWidget} from '../../widgets/buttons/buttons';
import {ClockWidget} from '../../widgets/clock/clock';
import {PickerWidget} from '../../widgets/picker/picker';
import {Page} from '../page/page';

import {pgUI} from '../../../ts/ui';
import {pgUtil} from '../../../ts/util';
import {RouterOutlet} from '@angular/router';
//import {CustomRouterOutlet} from '../../CustomRouterOutlet';

@Component({
    selector: 'page-timer', templateUrl: 'timer.html', styleUrls: ['./timer.scss'],
})
export class TimerPage extends Page {
    static initialized = false;
    @ViewChild(IonContent, {static: true}) content: IonContent;
    @ViewChild('timer_buttons', {static: true}) buttons: ButtonsWidget;
    @ViewChild('timer_time', {static: true}) time: ClockWidget;
    @ViewChild('timer_dur', {static: true}) dur: ClockWidget;
    @ViewChild('picker', {static: true}) picker: PickerWidget;
    
    alarmSound;
    alarmText;
    random;
    repeat;
    allRepeat;
    timerDuration;
    timerDurationString;
    
    constructor(public modalCtrl: ModalController,
                public routerOutlet: IonRouterOutlet,
                public config: Config,
                public alertCtrl: AlertController,
                readonly ngZone: NgZone,) {
        super(modalCtrl, routerOutlet, config, alertCtrl, ngZone);
        if(TimerPage.initialized)
            this.pgPage = pgUI.timer;
    }
    init() {
        //TimerPage.initialized = true;
        this.pgPage = pgUI.timer;
        this.pgPage.init({setTimeCB: this.time.setTextCB.bind(this.time), setDurCB: this.dur.setTextCB.bind(this.dur)});
        this.buttons.setPage(this.pgPage);
        super.init();
    }
    
    updateData(load) {
        const cat = pgUI.category();
        if (load) {
            this.alarmSound = this.pgPage.pageData[cat].alarmSound;
            this.alarmText = this.pgPage.pageData[cat].alarmText;
            this.random = this.pgPage.pageData[cat].random;
            this.repeat = this.pgPage.pageData[cat].repeat.toString();
            this.allRepeat = this.pgPage.getAllRepeatNV();
            this.timerDuration = this.pgPage.pageData[cat].timerDuration;
            this.timerDurationString = pgUtil.getStringFromMS(this.pgPage.pageData[cat].timerDuration);
            //$("#timer_calendar").prop('checked', this.data.loop).checkboxradio("refresh");
        } else {
            this.pgPage.pageData[cat].alarmSound = this.alarmSound;
            this.pgPage.pageData[cat].alarmText = this.alarmText;
            this.pgPage.pageData[cat].random = this.random;
            this.pgPage.pageData[cat].repeat = parseInt(this.repeat);
            this.pgPage.pageData[cat].timerDuration = this.timerDuration;
            this.pgPage.computeNewCountdowns(cat);
            //this.data.calendar        = !! $("#timer_calendar")[0].checked;
        }
    }
    async onDurClick(dur) {
        var num = [];
        for (var i = 0; i <= 100; i++) {
            num.push(i);
        }
        let s = pgUtil.getStructFromMS(dur);
        let selected = [s.hours, s.minutes, s.seconds];
        let data = [num.slice(0,25), num.slice(0,60), num.slice(0,60)];
        this.picker.showPicker(data, selected, this.pickerCB.bind(this));
    }
    pickerCB(success, values, data) {
        const cat = pgUI.category();
        if(success) {
            let newDuration = values[0]*pgUtil.ONE_HOUR;
            newDuration += values[1]*pgUtil.ONE_MINUTE;
            newDuration += values[2]*pgUtil.ONE_SECOND;
            this.pgPage.pageData[cat].timerDuration = newDuration;
            this.timerDuration = newDuration;
            this.timerDurationString = pgUtil.getStringFromMS(newDuration);
            this.pgPage.computeNewCountdowns(cat);
            this.pgPage.updateView(true);
        }
    }
}
