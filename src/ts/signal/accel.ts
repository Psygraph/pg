import {pg} from '../pg';
import {pgUtil, pgDebug} from '../util';
import {pgUI} from '../ui';
import {Meter} from './meter';
import * as $ from 'jquery';

class Accelerometer extends Meter {
    watchID = null;
    allPeriods = [5, 10, 50, 100, 500, 1000, 5000];
    period = 250;
    category = '';
    startTime = 0;
    running = false;
    
    constructor() {
        super('accel');
        this.watchID = null;
        this.allPeriods = [5, 10, 50, 100, 500, 1000, 5000];
        this.period = 100;
        this.category = '';
        this.startTime = 0;
        this.running = false;
    }
    init(){
        this.addSignal('acceleration');
    }
    getAllSignalsNV() {
        return [
            {name: "Acceleration", value: "acceleration"},
        ];
    }
    update(show, data) {
        try {
            if (show) {
                if(pgUtil.isEmpty(data)) {
                    throw new Error("empty struct");
                }
                this.period = data.period;
                if (data.running) {
                    this.start();
                    this.data = data.data;
                }
            } else {
                data.running = this.running;
                data.period = this.period;
                data.data = this.data;
            }
        } catch (err) {
            pgDebug.showWarn(err.toString());
            data = {running: false, period: 250, data: {}};
        }
        return data;
    }
    
    settingsDialog(callback) {
        const opts = this.settingsDialogOpts('Accelerometer Settings', gatherData);
        const optionText = pgUI.printSelect('meter_period', 'Period (mS):', this.allPeriods, this.period.toString());
    
        this.doSettingsDialog(opts, optionText, setMeter.bind(this));
        function gatherData() {
            return {period: parseInt($('#meter_period').val())};
        }
        function setMeter(success, data) {
            if (success) {
                this.period = data.period;
            }
            callback(success);
        }
    }
    
    start(restart = false) {
        if (this.running) {
            //pgDebug.showWarn('Accel already running');
            return;
        }
        this.createData(['acceleration']);
        this.running = true;
        this.startTime = pgUtil.getCurrentTime();
        this.category = pgUI.category();
        if (pgUtil.cyclometer) {
            if (this.watchID == null) {
                const opts = {period: this.period, updateInterval: 300};
                this.watchID = pgUtil.cyclometer.watchAcceleration(this.readSuccess.bind(this), this.readError.bind(this), opts);
            }
        } else {
            this.readError();
        }
    }
    async stop() {
        if (this.watchID != null) {
            pgUtil.cyclometer.clearWatch(this.watchID);
            //cyclometer.stop();
            this.watchID = null;
        }
        this.running = false;
        return Promise.resolve(1);
    }
    readSuccess(accel) {
        this.pushData([accel.timestamp, accel.x, accel.y, accel.z]);
    }
    readError() {
        pgDebug.showError('Could not gather acceleration data.');
    }
    
    // watch a running cyclometer for a shake
    onShake(id, shakeCB, threshold = 1, timeout = 1000) {
        if (pgUtil.cyclometer) {
            pgUtil.cyclometer.offShake(id);
            pgUtil.cyclometer.onShake(id, shakeNotification.bind(this, shakeCB), threshold, timeout);
        }
        function shakeNotification(cb, args) {
            setTimeout(cb, 100);
        }
    }
    offShake(id) {
        if (pgUtil.cyclometer) {
            pgUtil.cyclometer.offShake(id);
        }
    }
}

export const pgAcceleration = new Accelerometer();
