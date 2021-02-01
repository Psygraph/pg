import {pgUI} from './ui';
import {pgUtil, pgDebug} from './util';

export class Ticker {
    startTime = 0; // absolute start time
    totalElapsed = 0; // elapsed number of MS in total
    running = false;
    countdownTime = 0; // desired duration in MS
    listener = null; // * function to receive onTick events
    tickResolution = 0; // * how long between each tick in milliseconds
    timerID = null;
    callback = null; // a callback for completion
    onesec = 1000;
    onemin = this.onesec * 60;
    onehour = this.onemin * 60;
    oneday = this.onehour * 24;
    
    constructor(listener = null, resolution = 500, alarm = null) {
        this.startTime = 0; // absolute start time
        this.totalElapsed = 0; // elapsed number of MS in total
        this.running = false;
        this.countdownTime = 0; // desired duration in MS
        this.listener = listener; // * function to receive onTick events
        this.tickResolution = resolution; // * how long between each tick in milliseconds
        this.timerID = null;
        this.callback = alarm; // a callback for completion
        
        // pretty static vars
        this.onesec = 1000;
        this.onemin = this.onesec * 60;
        this.onehour = this.onemin * 60;
        this.oneday = this.onehour * 24;
    }
    
    setCountdown(countdownTime) {
        this.countdownTime = countdownTime;
    }
    countdownMode() {
        return this.countdownTime > 0;
    }
    /*
    start() {
        if(this.running) {
            clearInterval(this.timerID);
            pgDebug.showWarn("start() called without stop()");
        }
        var delegate      (that, method) { return function() { return method.call(that) } };
        this.startTime = new Date().getTime();
        this.running = true;
        //this.timerID = setInterval(this.onTick.bind(this), this.tickResolution);
        this.timerID = setInterval(delegate(this, this.onTick.bind(this)), this.tickResolution);
    };
    */
    start(startTime, elapsed) {
        startTime = startTime || new Date().getTime();
        elapsed = elapsed || 0;
        if (this.running) {
            clearInterval(this.timerID);
            pgDebug.showWarn('start() called without stop()');
        }
        this.startTime = startTime;
        this.totalElapsed = elapsed;
        this.running = true;
        this.timerID = setInterval(this.onTick.bind(this), this.tickResolution);
        //const delegate(that, method) { return function() { return method.call(that) } };
        //this.timerID = setInterval(delegate(this, this.onTick.bind(this)), this.tickResolution);
        this.onTick();
    }
    stop(elapsed) {
        if (typeof (elapsed) !== 'undefined') {
            this.totalElapsed = elapsed;
        }
        if (this.running) {
            //var stopTime = new Date().getTime();
            if (this.timerID != null) {
                clearInterval(this.timerID);
                this.timerID = null;
            }
            this.running = false;
        }
        //var elapsed = stopTime - this.startTime;
        // one last callback
        this.onTick();
    }
    isRunning() {
        return this.timerID != null;
    }
    reset(startTime) {
        this.startTime = startTime;
        this.totalElapsed = 0;
        // if watch is running, reset it to current time
        this.onTick();
    }
    /*
    restart() {
        this.stop();
        this.reset();
        this.start();
    };
    */
    getElapsed() {
        let elapsed = this.totalElapsed;
        if (this.running) {
            elapsed += (new Date().getTime() - this.startTime);
        }
        return elapsed;
    }
    getRemaining() {
        if (!this.countdownMode()) {
            pgDebug.showError('Call to remaining time in stopwatch mode.');
        }
        const elapsed = this.getElapsed();
        let remain = this.countdownTime - elapsed;
        remain = Math.max(0, remain);
        return remain;
    }
    finished() {
        return this.getRemaining() === 0;
    }
    /*
    setElapsed(days, hours, mins, secs) {
        this.totalElapsed = 0;
        this.totalElapsed += days * this.oneday;
        this.totalElapsed += hours * this.onehour;
        this.totalElapsed += mins  * this.onemin;
        this.totalElapsed += secs  * this.onesec;
        this.totalElapsed = Math.max(this.totalElapsed, 0); // * No negative numbers
        this.stop(this.totalElapsed);
        this.onTick();
    };
    setElapsedMS(milliseconds) {
        this.totalElapsed = milliseconds;
        this.stop(this.totalElapsed);
        this.onTick();
    };
    */
    toString() {
        const ms = this.getElapsed();
        return this.stringFromMS(ms);
    }
    stringFromMS(ms) {
        return pgUtil.getStringFromMS(ms, true);
    }
    /*
    MSFromString(s) {
        return pgUtil.getMSFromString(s);
    };
    setListener(listener) {
        this.listener = listener;
    };
    */
    // * triggered every <resolution> ms
    onTick() {
        let elapsed = this.getElapsed();
        if (this.countdownMode() && this.callback) {
            elapsed = this.countdownTime - elapsed;
            elapsed = Math.max(0, elapsed);
            if (this.running && elapsed === 0) {
                //this.countdownTime=0;
                this.callback(pgUI.category(), true);
            }
        }
        if (this.listener != null) {
            if (this.countdownMode()) {
                this.listener(this.getRemaining());
            } else {
                this.listener(elapsed);
            }
        }
    }
}
