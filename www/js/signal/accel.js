
function Accelerometer() {
    Meter.call(this);
    this.watchID    = null;
    this.allPeriods = [5, 10, 50, 100, 500, 1000, 5000];
    this.period     = 250;
    this.category   = "";
    this.startTime  = 0;
    this.running    = false;
}

Accelerometer.prototype = Object.create(Meter.prototype);
Accelerometer.prototype.constructor = Accelerometer;

Accelerometer.prototype.update = function(show, data) {
    try {
        if(show) {
            //this.init();
            this.period = data.period;
            if(data.running) {
                this.start();
                this.setData(data.data);
            }
        }
        else {
            data.running = this.running;
            data.period  = this.period;
            data.data    = this.getData();
        }
    }
    catch(err){
        pgUI.showWarn(err.toString());
        data = {running:false, period:250, data:{}};
    }
    return data;
};

Accelerometer.prototype.settingsDialog = function(callback) {
    var title = "Accelerometer Settings";
    var optionText = pgUI.printSelect("meter_period", "Period (mS):", this.allPeriods, this.period);

    Meter.prototype.settingsDialog.call(this, title, optionText, setMeter.bind(this));

    function setMeter(clickedOK) {
        if(clickedOK) {
            this.period = parseInt($("#meter_period").val());
        }
        callback(clickedOK);
    }
};

Accelerometer.prototype.start = function(restart) {
    if(this.running) {
        pgUI.showWarn("Accel already running");
        return;
    }
    this.createData(["acceleration"]);
    this.running = true;
    this.startTime = pgUtil.getCurrentTime();
    this.category = pg.category();
    if(typeof(navigator.cyclometer)!=="undefined") {
        if(this.watchID==null) {
            var opts = {period: this.period, updateInterval: 300};
             this.watchID = navigator.cyclometer.watchAcceleration(
                 this.readSuccess.bind(this),
                 this.readError.bind(this),
                 opts);
        }
    }
    else {
        this.readError();
    }
};
Accelerometer.prototype.stop = function() {
    if (this.watchID != null) {
        navigator.cyclometer.clearWatch(this.watchID);
        //navigator.cyclometer.stop();
        this.watchID = null;
    }
    this.running = false;
};
Accelerometer.prototype.readSuccess = function(accel) {
    this.pushData([ accel.timestamp, accel.x, accel.y, accel.z ]);
};
Accelerometer.prototype.readError = function(obj) {
    pgUI.showError("Could not gather acceleration data.");
};

// watch a running cyclometer for a shake
Accelerometer.prototype.onShake = function(id, shakeCB, threshold, timeout) {
    if(navigator.cyclometer) {
        navigator.cyclometer.offShake(id);
        navigator.cyclometer.onShake(id, shakeCB, threshold, timeout);
    }
};
Accelerometer.prototype.offShake = function(id) {
    if(navigator.cyclometer) {
        navigator.cyclometer.offShake(id);
    }
};

var pgAccel = new Accelerometer();


