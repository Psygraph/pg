import {pg} from '../pg';
import {pgUtil, pgDebug} from '../util';
import {pgUI} from '../ui';
import {Meter} from './meter';
import * as $ from 'jquery';

class Orientometer extends Meter {
    watchID = null;
    allPeriods = [5, 10, 50, 100, 500, 1000, 5000];
    period = 100;
    category = '';
    startTime = 0;
    running = false;
    
    constructor() {
        super('orient');
        this.watchID = null;
        this.period = 100;
        this.category = '';
        this.startTime = 0;
        this.running = false;
    }
    init() {
        this.addSignal('orientation');
    }
    getAllSignalsNV() {
        return [
            {name: "Orientation", value:"orientation"},
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
        const opts = this.settingsDialogOpts('Orientation Settings', gatherData);
        const content = pgUI.printSelect('meter_period', 'Period (mS):', this.allPeriods, this.period.toString(), false);
        this.doSettingsDialog(opts, content, setMeter.bind(this));
        function gatherData() {
            return {period: parseInt($('#meter_period').val()) };
        }
        function setMeter(success, data) {
            if (success) {
                this.period = data.period;
            }
            callback(success);
        }
    }
    
    // Start watching the accelerometer
    start(restart = false) {
        if (this.running) {
            pgDebug.showError('Orientation already running');
            return;
        }
        this.createData(['orientation']);
        this.running = true;
        this.startTime = pgUtil.getCurrentTime();
        this.category = pgUI.category();
        if (pgUtil.compass) {
            if (this.watchID == null) {
                const opts = {frequency: this.period};
                this.watchID = pgUtil.compass.watchHeading(this.readSuccess.bind(this), this.readError.bind(this), opts);
            }
        }
    }
    readSuccess(heading) {
        this.pushData([heading.timestamp, heading.magneticHeading]);
    }
    readError(compassError) {
        pgDebug.showError('Compass error: ' + compassError.code);
    }
    async stop() {
        if (this.watchID != null) {
            pgUtil.compass.clearWatch(this.watchID);
            this.watchID = null;
        }
        this.running = false;
        return Promise.resolve(1);
    }
    
    hasCompass(callback) {
        const d = $.Deferred();
        $.when(d).done(callback);
        if (pgUtil.compass) {
            d.resolve(false);
        } else {
            d.resolve(true);
            //navigator.compass.getCurrentHeading(onSuccess, onError);
        }
        function onSuccess(heading) {
            d.resolve(true);
        }
        function onError(error) {
            d.resolve(false);
        }
    }
}

export const pgOrientation = new Orientometer();
