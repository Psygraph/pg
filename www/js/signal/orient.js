
function Orientometer() {
    Meter.call(this);
    this.watchID=     null;
    this.period=      250;
    this.category=    "";
    this.startTime=   0;
    this.running=     false;
}

Orientometer.prototype = Object.create(Meter.prototype);
Orientometer.prototype.constructor = Orientometer;

Orientometer.prototype.update = function(show, data) {
    try {
        if(show) {
            this.period = data.period;
            if(data.running) {
                //this.init();
                this.start();
                this.setData(data.data);
            }
        }
        else {
            data.running = this.running;
            data.period = this.period;
            data.data = this.getData();
        }
    }
    catch(err){
        pgUI.showWarn(err.toString());
        data = {running:false, period:250, data:{}};
    }
    return data;
};

Orientometer.prototype.settingsDialog = function(callback) {
    var title = "Orientation Settings";
    var optionText = pgUI.printSelect("meter_period", "Period (mS):", this.allPeriods, this.period);

    Meter.prototype.settingsDialog.call(this, title, optionText, setMeter.bind(this));

    function setMeter(clickedOK) {
        if(clickedOK) {
            this.period = parseInt($("#meter_period").val());
        }
        callback(clickedOK);
    }
};

// Start watching the accelerometer
Orientometer.prototype.start = function(restart) {
    if (this.running) {
        pgUI.showError("Orientation already running");
        return;
    }
    this.createData(["orientation"]);
    this.running = true;
    this.startTime = pgUtil.getCurrentTime();
    this.category = pg.category();
    if (typeof(navigator.compass) !== "undefined") {
        if (this.watchID == null) {
            var opts = {frequency: this.period};
            this.watchId = navigator.compass.watchHeading(
                this.readSuccess.bind(this),
                this.readError.bind(this),
                opts);
        }
    }
};

Orientometer.prototype.readSuccess = function(heading) {
    this.pushData([ heading.timestamp, heading.magneticHeading]);
};

Orientometer.prototype.readError = function(compassError) {
    pgUI.showError('Compass error: ' + compassError.code);
};


Orientometer.prototype.stop = function() {
    if(this.watchId != null) {
        navigator.compass.clearWatch(this.watchId);
        this.watchId = null;
    }
    this.running = false;
};

Orientometer.prototype.hasCompass = function(callback) {
    var d = $.Deferred();
    $.when(d).done(callback);
    if(typeof(navigator.compass)==="undefined") {
        d.resolve(false);
    }
    else {
        d.resolve(true);
        //navigator.compass.getCurrentHeading(onSuccess, onError);
    }
    function onSuccess(heading) {
        d.resolve(true);
    }
    function onError(error) {
        d.resolve(false);
    }
};

var pgOrient = new Orientometer();

