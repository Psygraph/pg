//====================================================

function BluetoothDevice(device) {
    Meter.call(this);
    this.foundDevices = [];
    this.meter        = null;
    this.scanning     = false;

    this.lastConnectedDevice = "";
}
BluetoothDevice.prototype = Object.create(Meter.prototype);
BluetoothDevice.prototype.constructor = BluetoothDevice;

BluetoothDevice.prototype.deviceName = function() {
    var name = "none";
    if(this.meter)
        name = this.meter.deviceName();
    return name;
};
BluetoothDevice.prototype.init = function() {
    Meter.prototype.init.call(this);
};

BluetoothDevice.prototype.update = function(show, data) {
    try {
        if(show) {
            this.lastConnectedDevice = data.lastConnectedDevice;
        }
        else {
            data.lastConnectedDevice = this.lastConnectedDevice;
        }
    }
    catch(err) {
        pgUI_showWarn(err.toString());
        data = {};
    }
    return data;
};

BluetoothDevice.prototype.settingsDialog = function(callback) {
    if(this.meter)
        this.meter.settings(callback);
};
BluetoothDevice.prototype.getSignals = function() {
    if(this.meter)
        return this.meter.getSignals();
    return this.signals;
};
BluetoothDevice.prototype.getAllSignals = function() {
    if(this.meter)
        return this.meter.allSignals;
    return this.allSignals;
};
BluetoothDevice.prototype.getData = function() {
    if(this.meter)
        return this.meter.getData();
    return this.data;
};

BluetoothDevice.prototype.devices = function() {
    return this.foundDevices;
};

BluetoothDevice.prototype.settingsDialog = function() {
    if(this.meter)
        this.meter.settingsDialog();
};
BluetoothDevice.prototype.isGenericMeter = function(services) {
    return services.indexOf("180d") >= 0 || services.indexOf("180D") >= 0;
};
BluetoothDevice.prototype.isPGMeter = function(services) {
    return services.indexOf("00000000-ABBA-DABA-B000-197219721972") >= 0;
};
BluetoothDevice.prototype.isMooshimeter = function(services) {
    return services.indexOf("1BC5FFA0-0200-62AB-E411-F254E005DBD4") >= 0;
};
BluetoothDevice.prototype.startScan = function(cback) {
    if(pgUtil.isWebBrowser() || this.scanning)
        return;
    this.scanning = true;
    pgUI_showLog("Starting bluetooth scan...");
    ble.startScan([],startScanSuccess.bind(this), cback);

    function startScanSuccess(result) {
        if(!this.foundDevices.some(function (device){
                return device.id === result.id;
            })) {
            if(typeof(result.name)!=="undefined")
                pgUI_showLog('FOUND DEVICE:'  + result.name);
            this.foundDevices.push(result);
            cback();
        }
    }
};
BluetoothDevice.prototype.stopScan = function(cb) {
    if(pgUtil.isWebBrowser())
        return;
    if(this.scanning) {
        ble.stopScan(resolve.bind(this), reject.bind(this));
        this.scanning = false;
    }
    else {
        cb(true);
    }
    function resolve(){pgUI_showLog('scan finished.'); cb(true);}
    function reject(){pgUI_showLog('scan finished.'); cb(false);}
};
BluetoothDevice.prototype.isConnected = function() {
    if(this.meter)
        return true;
    else
        return false;
    //ble.isConnected(this.activeDeviceName, yes, no);
};
BluetoothDevice.prototype.reconnect = function(callback) {
    if(! this.isConnected() && this.lastConnectedDevice !== "")
        this.connect(this.lastConnectedDevice, cb.bind(this));
    else
        callback(true);

    function cb(tf) {
        if(!tf) {
            showAlert("Could not connect to '"+this.lastConnectedDevice+"', reconnect in the preferences.");
            this.lastConnectedDevice = "";
        }
        callback(tf);
    }
};
BluetoothDevice.prototype.connect = function(name, callback) {
    if(name === "none" || pgUtil.isWebBrowser()) {
        callback(false);
        return;
    }
    var btDevs = this.foundDevices;
    var address = "none";
    for(var i=0; i<btDevs.length; i++) {
        if( btDevs[i].name === name) {
            address = btDevs[i].id;
        }
    }
    pgUI_showLog('Connecting to device: ' + address + "...");
    pgUI.showBusy(true);
    ble.connect(address, connectSuccess.bind(this), handleError.bind(this));

    function connectSuccess(result) {
        pgUI.showBusy(false);
        pgUI_showLog("Connect success");
        var services = result.services;

        if(this.isPGMeter(services)) {
            this.meter = new PGMeter(result);
        }
        else if(this.isMooshimeter(services)) {
            this.meter = new PGMooshimeter(result);
        }
        else if(this.isGenericMeter(services)) {
            this.meter = new GenericMeter(result);
        }
        else {
            pgUI.showAlert("Device incompatible: disconnecting.");
            this.disconnect(callback.bind(false));
            return;
        }
        this.meter.connect(handleSuccess.bind(this));
    }

    function handleSuccess() {
        this.lastConnectedDevice = this.activeDevice ? this.activeDevice.name : "";
        callback();
    }
    function handleError(error) {
        this.lastConnectedDevice = "";
        var msg = "";
        pgUI.showBusy(false);
        if(typeof(error)==="object") {
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
            msg = error;
        }
        if(msg.indexOf("isconnected") !== -1) {
            this.disconnect();
            pgUI.showAlert(msg, "Bluetooth Device:");
        }
        pgUI_showError(msg);
    }
};

BluetoothDevice.prototype.disconnect = function(callback) {
    callback = (typeof(callback)!=="undefined")? callback : function(){};
    if(this.meter) {
        this.meter.disconnect(cb.bind(this));
    }
    else {
        cb.call(this);
    }
    function cb() {
        // cache signals and data in case the disconnection was accidental
        this.signals = this.meter.getSignals();
        this.data    = this.meter.getData();
        this.meter   = null;
        callback();
    }
};

BluetoothDevice.prototype.start = function(restart) {
    if(this.meter)
        this.meter.start(restart);
};

BluetoothDevice.prototype.stop = function(callback) {
    if(this.meter)
        this.meter.stop(callback);
    else
        callback();
};

var pgBluetooth = new BluetoothDevice();
