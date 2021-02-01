
import {ButtonPage, Page} from './page';
import {pg} from '../pg';
import {pgUI} from '../ui';
import {pgUtil,pgDebug} from '../util';

export class Counter extends ButtonPage {
    setCountCB;
    pgAcceleration;

    constructor(opts) {
        super("counter", opts);
        this.pgAcceleration = opts.pgAcceleration;
    }
    init(opts) {
        super.init(opts);
        this.setCountCB = opts.setCountCB;
    }
    updateView(show, cat=pgUI.category()) {
        super.updateView(show);
        if (show) {
            this.pageData[cat].count = 0;
            var e = pg.mostRecentEvent(pgUI.category(), "counter");
            if (e) {
                if (e.type === "reset")
                    this.pageData[cat].count = 0;
                else
                    this.pageData[cat].count = e.data.count;
            }
            this.setValue();
            this.setMotionResponse(true);
        } else {
            this.setMotionResponse(false);
        }
    }
    getPageData() {
        var data = super.getPageData();
        for(let cat of pg.categories) {
            if (!('countShakes' in data[cat])) {
                data[cat].countShakes = false;
            }
            if (!('shakeThreshold' in data[cat])) {
                data[cat].shakeThreshold = 1;
            }
            if (!('shakeTimeout' in data[cat])) {
                data[cat].shakeTimeout = 1000;
            }
            if (!('showEnso' in data[cat])) {
                data[cat].showEnso = true;
            }
            if (!('target' in data[cat])) {
                data[cat].target = 10;
            }
            if (!('resetBehavior' in data[cat])) {
                data[cat].resetBehavior = "sound";
            }
        }
        return data;
    }
    getAllResetBehaviorNV() {
        const signals =  [
            {value:'silent', name:'Silent'},
            {value:'beep',   name:'Beep'},
            {value:'buzz',   name:'Buzz'},
            {value:'sound',  name:'Sound'}];
        return signals;
    }
    setValue(cat=pgUI.category()) {
        this.setCountCB(this.pageData[cat]);
    }
    setMotionResponse(on, cat=pgUI.category()) {
        if (pgUtil.isWebBrowser)
            return;
        if (on && this.pageData[cat].countShakes) {
            this.pgAcceleration.onShake("accel", onShake.bind(this), this.pageData[cat].shakeThreshold, this.pageData[cat].shakeTimeout);
            this.pgAcceleration.start();
        } else {
            this.pgAcceleration.offShake("accel");
        }

        function onShake(value) {
            if (this.pageData[cat].resetBehavior === "buzz") {
                this.pgAudio.buzz();
            }
            else if (this.pageData[cat].resetBehavior === "beep") {
                this.pgAudio.beep();
            }
            else if (this.pageData[cat].resetBehavior === "sound") {
                this.pgAudio.alarm(pgUI.category(), false, cb);
            }
            else if (this.pageData[cat].resetBehavior === "silent") {
            }
            this.start();

            function cb(idx) {
                //setTimeout(pgAudio.stopAlarm.bind(pgAudio, idx), 4000);
            }
        }
    }

    start(restart = false, cat=pgUI.category()) {
        super.start(restart);
        var category = pgUI.category();
        this.pageData[cat].count++;
        var eventData = {
            target: this.pageData[cat].target,
            count: this.pageData[cat].count
        };
        var event = {
            page: "counter",
            type: "count",
            category: category,
            start: pgUtil.getCurrentTime(),
            data: eventData
        };
        //this.pageData[cat].event = event;
        pg.addNewEvents(event, true);
        this.setValue();
        this.stop();
    }
    stop() {
        super.stop();
    }
    reset(cat=pgUI.category()) {
        super.reset();
        var category = pgUI.category();
        var target = this.pageData[cat].target;
        var count = this.pageData[cat].count;

        this.feedback(count, target);
        var eventData = {
            target: target,
            count: count
        };
        var event = {
            page: "counter",
            type: "reset",
            category: category,
            start: pgUtil.getCurrentTime(),
            data: eventData
        };
        pg.addNewEvents(event, true);
        this.pageData[cat].count = 0;
        this.setValue();
    }

    feedback(count, target, cat=pgUI.category()) {
        if (count && target) {
            var correct = (count === target);
            if (this.pageData[cat].resetBehavior === "sound")
                this.pgAudio.reward(correct);
        }
    }
    lever(arg) {
        if (arg === "left") {
            this.reset();
        } else if (arg === "right") {
            this.start();
        }
    }
}

