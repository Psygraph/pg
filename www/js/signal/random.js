//====================================================

function RandomMeter(device) {
    Meter.call(this, device);
    this.allPeriods = [5, 10, 50, 100, 500, 1000, 5000];
    this.period     = 1000;
    this.ping       = 0;
}
RandomMeter.prototype = Object.create(Meter.prototype);
RandomMeter.prototype.constructor = RandomMeter;

RandomMeter.prototype.update = function(show, data) {
    try {
        if(show) {
            //this.init();
            this.period = data.period;
            this.data   = data.data;
        }
        else {
            data.period = this.period;
            data.data   = this.data;
        }
    }
    catch(err) {
        pgUI_showWarn(err.toString());
        data = {period:1000, data:{}};
    }
    return data;
};
RandomMeter.prototype.settingsDialog = function(callback) {
    var title = "Random Settings";
    var optionText = pgUI.printSelect("meter_period", "Period (mS):", this.allPeriods, this.period);

    Meter.prototype.settingsDialog.call(this, title, optionText, setMeter.bind(this));

    function setMeter(clickedOK) {
        if(clickedOK) {
            this.period = parseInt($("#meter_period").val());
        }
        callback(clickedOK);
    }
};
RandomMeter.prototype.start = function(restart) {
    this.createData(["random"]);
    this.ping = setInterval(periodic.bind(this), this.period);
    function periodic() {
        this.pushData([pgUtil.getCurrentTime(), Math.random()]);
    }
};
RandomMeter.prototype.stop = function() {
    clearInterval(this.ping);
};

var pgRandom = new RandomMeter();

