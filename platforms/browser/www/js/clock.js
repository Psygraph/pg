
// * Clock class {{{
Clock = function(listener, resolution, alarm) {
    this.startTime      = 0;
    this.stopTime       = 0;
    this.totalElapsed   = 0; // * elapsed number of ms in total
    this.started        = false;
    this.countdownTime  = 0;
    this.countup        = false;
    this.listener       = (listener != undefined ? listener : null); // * function to receive onTick events
    this.tickResolution = (resolution != undefined ? resolution : 500); // * how long between each tick in milliseconds
    this.tickInterval   = null;
    this.callback       = (alarm != undefined ? alarm : null);
    
    // * pretty static vars
    this.onesec  = 1000;
    this.onemin  = this.onesec  * 60;
    this.onehour = this.onemin  * 60;
    this.oneday  = this.onehour * 24;
};

Clock.prototype.setCountdown = function(countdownTime, countup) {
    var delegate       = function(that, method) { return function() { return method.call(that) } };
    this.countdownTime = countdownTime;
    this.countup       = countup;
};
Clock.prototype.remaining = function() {
    var elapsed = 0;
    if(this.started)
        elapsed = new Date().getTime() - this.startTime;
    elapsed += this.totalElapsed;

    if(this.countdownTime > 0) {
        if(this.countup) {
            elapsed = Math.min(this.countdownTime, elapsed);
            return this.countdownTime - elapsed;
        }
        else {
            elapsed = this.countdownTime - elapsed;
            elapsed = Math.max(0, elapsed);
            return elapsed;
        }
    }
    return 0;
};

Clock.prototype.start = function() {
    var delegate = function(that, method) { return function() { return method.call(that) } };
    if(!this.started && !this.finished()) {
        this.startTime = new Date().getTime();
        this.stopTime = 0;
        this.started = true;
        this.tickInterval = setInterval(delegate(this, this.onTick), this.tickResolution);
    }
};

Clock.prototype.startFromTime = function(startTime) {
    var delegate = function(that, method) { return function() { return method.call(that) } };
    if(this.tickInterval != null)
        clearInterval(this.tickInterval);
    this.totalElapsed = 0;
    this.startTime = startTime;
    this.stopTime = 0;
    this.started = true;
    this.tickInterval = setInterval(delegate(this, this.onTick), this.tickResolution);
};
Clock.prototype.stop = function() {
    if(this.started) {
        if(this.tickInterval != null) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
        this.stopTime = new Date().getTime();
        this.started = false;
        var elapsed = this.stopTime - this.startTime;
        this.totalElapsed += elapsed;
        // one last callback
        this.onTick();
    }
    //return this.getElapsed();
};
Clock.prototype.running = function() {
    return this.tickInterval != null;
};
Clock.prototype.reset = function() {
    this.totalElapsed = 0;
    // * if watch is running, reset it to current time
    this.startTime = new Date().getTime();
    this.stopTime = this.startTime;
};
Clock.prototype.restart = function() {
    this.stop();
    this.reset();
    this.start();
};
Clock.prototype.getElapsed = function() {
    // * if watch is stopped, use that date, else use now
    var elapsed = 0;
    if(this.started)
        elapsed = new Date().getTime() - this.startTime;
    elapsed += this.totalElapsed;

    if(this.countdownTime > 0) {
        if(this.countup) {
            elapsed = Math.min(this.countdownTime, elapsed);
            if(this.started && elapsed==this.countdownTime) {
                this.callback(pg.category(), true);
            }
        }
        else {
            elapsed = this.countdownTime - elapsed;
            elapsed = Math.max(0, elapsed);
            if(this.started && elapsed==0) {
                //this.countdownTime=0;
                this.callback(pg.category(), true);
            }
        }
    }
    
    return elapsed;
};
Clock.prototype.finished = function() {
    var elapsed = 0;
    if(this.started)
        elapsed = new Date().getTime() - this.startTime;
    elapsed += this.totalElapsed;
    
    if(this.countdownTime > 0) {
        if(this.countup) {
            //elapsed = Math.max(this.countdownTime, elapsed);
            if(this.totalElapsed >= this.countdownTime)
                return true;
        }
        else {
            elapsed = this.countdownTime - elapsed;
            elapsed = Math.max(0, elapsed);
            if(elapsed==0)
                return true;
        }
    }
    return false;
};
Clock.prototype.setElapsed = function(days, hours, mins, secs) {
    this.stop();
    this.reset();
    this.totalElapsed = 0;
    this.totalElapsed += days * this.oneday;
    this.totalElapsed += hours * this.onehour;
    this.totalElapsed += mins  * this.onemin;
    this.totalElapsed += secs  * this.onesec;
    this.totalElapsed = Math.max(this.totalElapsed, 0); // * No negative numbers
    this.onTick();
};
Clock.prototype.setElapsedMS = function(milliseconds) {
    this.stop();
    this.reset();
    this.totalElapsed = milliseconds;
    this.onTick();
};
Clock.prototype.toString = function() {
    var ms = this.getElapsed();
    return this.stringFromMS(ms);
};
Clock.prototype.stringFromMS = function(ms) {
    return pgUtil.getStringFromMS(ms, true);
};
Clock.prototype.MSFromString = function(s) {
    return pgUtil.getMSFromString(s);
};
Clock.prototype.setListener = function(listener) {
    this.listener = listener;
};
// * triggered every <resolution> ms
Clock.prototype.onTick = function() {
    if(this.listener != null) {
        this.listener(this.getElapsed());
    }
};

// }}}
