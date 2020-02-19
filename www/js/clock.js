
// * Clock class {{{
Clock = function(listener, resolution, alarm) {
    this.startTime      = 0; // absolute start time
    this.totalElapsed   = 0; // elapsed number of MS in total
    this.running        = false;
    this.countdownTime  = 0; // desired duration in MS
    this.listener       = (typeof(listener) !== "undefined" ? listener : null); // * function to receive onTick events
    this.tickResolution = (typeof(resolution) !== "undefined" ? resolution : 500); // * how long between each tick in milliseconds
    this.timerID        = null;
    this.callback       = (typeof(alarm) !== "undefined" ? alarm : null); // a callback for completion
    
    // * pretty static vars
    this.onesec  = 1000;
    this.onemin  = this.onesec  * 60;
    this.onehour = this.onemin  * 60;
    this.oneday  = this.onehour * 24;
};

Clock.prototype.setCountdown = function(countdownTime) {
    this.countdownTime = countdownTime;
};
Clock.prototype.countdownMode = function() {
    return this.countdownTime > 0;
};
/*
Clock.prototype.start = function() {
    if(this.running) {
        clearInterval(this.timerID);
        pgUI.showWarn("start() called without stop()");
    }
    var delegate       = function(that, method) { return function() { return method.call(that) } };
    this.startTime = new Date().getTime();
    this.running = true;
    //this.timerID = setInterval(this.onTick.bind(this), this.tickResolution);
    this.timerID = setInterval(delegate(this, this.onTick.bind(this)), this.tickResolution);
};
*/
Clock.prototype.start = function(startTime, elapsed) {
    startTime = startTime || new Date().getTime();
    elapsed = elapsed || 0;
    if(this.running) {
        clearInterval(this.timerID);
        pgUI.showWarn("start() called without stop()");
    }
    var delegate       = function(that, method) { return function() { return method.call(that) } };
    this.startTime = startTime;
    this.totalElapsed = elapsed;
    this.running = true;
    //this.timerID = setInterval(this.onTick.bind(this), this.tickResolution);
    this.timerID = setInterval(delegate(this, this.onTick.bind(this)), this.tickResolution);
    this.onTick();
};
Clock.prototype.stop = function(elapsed) {
    if(typeof(elapsed) !== "undefined")
        this.totalElapsed = elapsed;
    if(this.running) {
        //var stopTime = new Date().getTime();
        if(this.timerID != null) {
            clearInterval(this.timerID);
            this.timerID = null;
        }
        this.running = false;
    }
    //var elapsed = stopTime - this.startTime;
    // one last callback
    this.onTick();
};
Clock.prototype.running = function() {
    return this.timerID != null;
};
Clock.prototype.reset = function(startTime) {
    this.startTime = startTime;
    this.totalElapsed = 0;
    // if watch is running, reset it to current time
    this.onTick();
};
/*
Clock.prototype.restart = function() {
    this.stop();
    this.reset();
    this.start();
};
*/
Clock.prototype.getElapsed = function() {
    var elapsed = this.totalElapsed;
    if(this.running)
        elapsed += (new Date().getTime() - this.startTime);
    return elapsed;
};
Clock.prototype.getRemaining = function() {
    if(!this.countdownMode())
        pgUI.showError("Call to remaining time in stopwatch mode.");
    var elapsed = this.getElapsed();    
    var remain = this.countdownTime - elapsed;
    remain = Math.max(0, remain);
    return remain;
};
Clock.prototype.finished = function() {
    return this.getRemaining() === 0;
};
/*
Clock.prototype.setElapsed = function(days, hours, mins, secs) {
    this.totalElapsed = 0;
    this.totalElapsed += days * this.oneday;
    this.totalElapsed += hours * this.onehour;
    this.totalElapsed += mins  * this.onemin;
    this.totalElapsed += secs  * this.onesec;
    this.totalElapsed = Math.max(this.totalElapsed, 0); // * No negative numbers
    this.stop(this.totalElapsed);
    this.onTick();
};
Clock.prototype.setElapsedMS = function(milliseconds) {
    this.totalElapsed = milliseconds;
    this.stop(this.totalElapsed);
    this.onTick();
};
*/
Clock.prototype.toString = function() {
    var ms = this.getElapsed();
    return this.stringFromMS(ms);
};
Clock.prototype.stringFromMS = function(ms) {
    return pgUtil.getStringFromMS(ms, true);
};
/*
Clock.prototype.MSFromString = function(s) {
    return pgUtil.getMSFromString(s);
};
Clock.prototype.setListener = function(listener) {
    this.listener = listener;
};
*/
// * triggered every <resolution> ms
Clock.prototype.onTick = function() {
    var elapsed = this.getElapsed();
    if(this.countdownMode() && this.callback) {
        elapsed = this.countdownTime - elapsed;
        elapsed = Math.max(0, elapsed);
        if(this.running && elapsed===0) {
            //this.countdownTime=0;
            this.callback(pg.category(), true);
        }
    }
    if(this.listener != null) {
        if(this.countdownMode())
            this.listener(this.getRemaining());
        else
            this.listener(elapsed);
    }
};

