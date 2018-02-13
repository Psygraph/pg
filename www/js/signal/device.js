
// the deviceometer is a container for internal meters.
// currently: accel, orient, location, random

function LocalDevice() {
    Meter.call(this);
    this.meters         = [];
    this.runningSignals = [];
    //var onlyPosition = false;
}
LocalDevice.prototype = Object.create(Meter.prototype);
LocalDevice.prototype.constructor = LocalDevice;

LocalDevice.prototype.init = function() {
    this.allSignals.push("random");
    this.meters.push(pgRandom);
    if(!pgUtil.isWebBrowser()) {
        this.allSignals.push("accelerometer");
        this.allSignals.push("orientation");
        this.allSignals.push("location");
        this.meters.push(pgAccel);
        this.meters.push(pgOrient);
        this.meters.push(pgLocation);
    }
};
LocalDevice.prototype.update = function(show, data) {
    try {
        if(show) {
            this.init();
        }
        else {
        }
    }
    catch(err) {
        pgUI_showWarn(err.toString());
        data = {};
    }
    return data;
};

LocalDevice.prototype.settingsDialog = function(callback, signals) {
    callback = typeof(callback) !== "undefined" ? callback : function (){};
    doDialog(signals);

    function doDialog(s) {
        if(s.indexOf("random") === 0) {
            pgRandom.settingsDialog( doDialog.bind(this,s.slice(1)) );
        }
        else if(!pgUtil.isWebBrowser()) {
            if(s.indexOf("acceleration") === 0) {
                pgAccel.settingsDialog( doDialog.bind(this,s.slice(1)) );
            }
            else if(s.indexOf("orientation") === 0) {
                pgOrient.settingsDialog( doDialog.bind(this,s.slice(1)) );
            }
            else if(s.indexOf("location") === 0) {
                pgLocation.settingsDialog( doDialog.bind(this,s.slice(1)) );
            }
        }
        else
            callback();
    }
};
LocalDevice.prototype.getSignals = function() {
    var signals = [];
    for(var i=0; i<this.meters.length; i++) {
        var s = this.meters[i].getSignals();
        for(f in s)
            signals[f] = s[f];
    }
    return signals;
};
LocalDevice.prototype.getData = function() {
    var data = {};
    for(var i=0; i<this.meters.length; i++) {
        var d = this.meters[i].getData();
        for(f in d)
            data[f] = d[f];
    }
    return data;
};



LocalDevice.prototype.start = function(restart, signals) {
    this.runningSignals = signals;
    if(signals.indexOf("random")>=0)
        pgRandom.start(restart);
    if(!pgUtil.isWebBrowser()) {
        if (signals.indexOf("acceleration") >= 0)
            pgAccel.start(restart);
        if (signals.indexOf("orientation") >= 0)
            pgOrient.start(restart);
        if (signals.indexOf("location") >= 0)
            pgLocation.start();
    }
};

LocalDevice.prototype.stop = function(callback) {
    if(this.runningSignals.indexOf("random")>=0)
        pgRandom.stop();
    if(!pgUtil.isWebBrowser()) {
        if (this.runningSignals.indexOf("acceleration") >= 0)
            pgAccel.stop();
        if (this.runningSignals.indexOf("orientation") >= 0)
            pgOrient.stop();
        if (this.runningSignals.indexOf("location") >= 0)
            pgLocation.stop(cb.bind(this));
        else
            cb.call(this);
    }
    else
        cb.call(this);

    function cb() {
        this.runningSignals = [];
        callback();
    }
};

pgDevice = new LocalDevice();
