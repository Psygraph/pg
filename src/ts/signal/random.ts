import {pgUtil, pgDebug} from '../util';
import {pgUI} from '../ui';
import {Meter} from './meter';

import * as $ from 'jquery';

class RandomMeter extends Meter {
    allPeriods = [5, 10, 50, 100, 500, 1000, 5000];
    period = 1000;
    ping = 0;
    lastTime = 0;
    
    constructor() {
        super('random');
        this.allPeriods = [5, 10, 50, 100, 500, 1000, 5000];
        this.period = 1000;
        this.ping = 0;
        this.lastTime = 0;
    }
    init() {}
    getAllSignalsNV() {
        return [
            {name: "Random", value: "random"},
        ];
    }
    update(show, data) {
        try {
            if (show) {
                this.period = data.period;
                this.data = data.data;
            } else {
                data.period = this.period;
                data.data = this.data;
            }
        } catch (err) {
            pgDebug.showWarn(err.toString());
            data = {period: 1000, data: {}};
        }
        return data;
    }
    settingsDialog(callback) {
        const opts = this.settingsDialogOpts('Random Settings', gatherData);
        const content = pgUI.printSelect('meter_period', 'Period (mS):', this.allPeriods, this.period, false);
        super.settingsDialog(opts, content, this.setMeter.bind(this, callback));
        function gatherData() {
            return {period: parseInt($('#meter_period').val())};
        }
    }
    setMeter(callback, success, data) {
        if (success) {
            this.period = data.period;
        }
        callback(success);
    }
    start(restart) {
        this.createData(['random']);
        this.lastTime = pgUtil.getCurrentTime();
        this.ping = setInterval(this.periodic.bind(this), 250);// eslint-disable-line
    }
    periodic() {
        const currentTime = pgUtil.getCurrentTime();
        while (this.lastTime <= currentTime) {
            this.pushData([this.lastTime, Math.random()]);
            this.lastTime += this.period;
        }
    }
    async stop() {
        clearInterval(this.ping);
        return Promise.resolve(1);
    }
}

export const pgRandom = new RandomMeter();
