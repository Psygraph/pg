
function Meter() {
    this.filterType     = "none";
    this.allFilterTypes = ["FIR","gamma","none"];
    this.filter         = new Filter();
    this.running        = false;
    this.data           = {};
    this.signals        = [];
    this.allSignals     = [];
}

Meter.prototype.createData = function(types) {
    this.data = {};
    for(var i in types) {
        var type = types[i];
        this.data[type] = [];
        if(this.signals.indexOf(type)===-1)
            this.signals.push(type);
    }
};
Meter.prototype.addData = function(type, data) {
    this.data[type].push(data);
};
Meter.prototype.pushData = function(data) {
    this.data[this.signals[0]].push(data);
};
Meter.prototype.getSignals = function() {
    return this.signals;
};
Meter.prototype.getAllSignals = function() {
    return this.allSignals;
};
Meter.prototype.getData = function() {
    return this.data;
};
Meter.prototype.setData = function(data) {
    this.data = data;
};

Meter.prototype.update = function(show, data) {
    try {
        if(show) {
            this.running  = data.running;
            this.filter   = data.filter;
            this.data     = data.data;
            this.signals  = data.signals;
        }
        else {
            data.running = this.running;
            data.filter  = this.filter;
            data.data    = this.data;
            data.signals =this.signals;
        }
    }
    catch(err){
        showWarning(err.toString());
        data = {
            running: false,
            filter:  new Filter(),
            data:    {},
            signals: []
        };
    }
    return data;
};

Meter.prototype.settingsDialog = function(title, optionText, callback) {
    title = typeof(title)!=="undefined" ? title : "";
    optionText = typeof(optionText)!=="undefined" ? optionText : "";

    //optionText += pgUI.printSelect("meter_filter", "Filter type:",  this.allFilterTypes, this.filterType)

    pgUI.showDialog({title: title, true: "OK", false: "Cancel"},
        optionText, setMeter.bind(this));

    function setMeter(clickedOK) {
        if (clickedOK) {
            //this.filterType = $("#meter_filter").val();
            //if(this.filterType==="FIR") {
            //    this.filter = new FIRFilter();
            //}
            //else if(this.filterType==="gamma") {
            //    this.filter = new GammaFilter();
            //}
            //else {
                this.filter = new Filter();
            //}
        }
        callback(clickedOK);
    }
};
Meter.prototype.connect = function(callback) {
    callback(true);
};
Meter.prototype.disconnect = function(callback) {
    callback(true);
};
Meter.prototype.update = function(starting, state) {
};
Meter.prototype.start = function(restart) {
    restart = restart || false;
};
Meter.prototype.stop = function() {
};
Meter.prototype.read = function(type, bytes) {
};
Meter.prototype.readSuccess = function(obj) {
};
Meter.prototype.readError = function(obj) {
    pgUI.showWarn("Bluetooth read Error : " + JSON.stringify(obj));
};
Meter.prototype.write = function(bytes) {
};
Meter.prototype.writeSuccess = function(msg) {
};
Meter.prototype.writeError = function(error) {
    var msg = "";
    if(typeof(error)==="object") {
        pgUI.showLog("Error is object");
        if("error" in error && "message" in error) {
            msg = "Error on " + error.error + ": " + error.message;
        }
        else if("errorMessage" in error) {
            msg = error.errorMessage;
        }
        else
            msg = error.toString();
    }
    else {
        pgUI.showLog("Error is string");
        msg = error;
    }
    // xxx
    //if(msg.indexOf("isconnected") !== -1) {
    //    this.disconnect();
    //}
    pgUI.showError(msg);
};
Meter.prototype.decodeUint32 = function(bytes) {
    return bytes[0] + bytes[1] *256 +bytes[2] *256*256 + bytes[3] *256*256*256;
};
Meter.prototype.decodeSingle = function(bytes) {
    var farr = new Float32Array(bytes.buffer);
    return farr[0];
};
Meter.prototype.decodeUint16 = function(bytes) {
    return bytes[0] + bytes[1] *256;
};
Meter.prototype.decodeUint8 = function(bytes) {
    return bytes[0];
};
Meter.prototype.encodeUint32 = function(num) {
    var bytes = new Uint8Array(4);
    bytes[0] = (num & 0x000000FF);
    bytes[1] = (num & 0x0000FF00)>>8;
    bytes[2] = (num & 0x00FF0000)>>16;
    bytes[3] = (num & 0xFF000000)>>24;
    return bytes;
};
Meter.prototype.encodeUint16 = function(num) {
    var bytes = new Uint8Array(2);
    bytes[0] = num & 0x00FF;
    bytes[1] = (num & 0xFF00)>>8;
    return bytes;
};
Meter.prototype.encodeUint8 = function(num) {
    var bytes = new Uint8Array(1);
    bytes[0] = num & 0xFF;
    return bytes;
};


