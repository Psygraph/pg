//====================================================

function Bluetoothometer(device) {
    Meter.call(this);
    this.device       = device;
}
Bluetoothometer.prototype = Object.create(Meter.prototype);
Bluetoothometer.prototype.constructor = Bluetoothometer;

Bluetoothometer.prototype.deviceName = function() {
    var name = "none";
    if(this.device)
        name = this.device.name;
    return name;
};
Bluetoothometer.prototype.init = function() {
};

//Bluetoothometer.prototype.connect = function() {};
Bluetoothometer.prototype.disconnect = function(callback) {
    if(!this.device) {
        callback();
        return;
    }
    ble.disconnect(this.device.id, cb.bind(this), cb.bind(this));
    function cb() {
        this.device = null;
        callback();
    }
};

Bluetoothometer.prototype.startNotification = function(service, characteristic, readCB) {
    ble.startNotification(this.device.id,
        service, characteristic,
        readCB, this.handleError);
};
Bluetoothometer.prototype.stopNotification = function(service, characteristic) {
    ble.stopNotification(this.device.id,
        service, characteristic,
        this.handleSuccess, this.handleError);
};
Bluetoothometer.prototype.readBT = function(service, characteristic, readCB, writeCB) {
    if(!this.device) {
        pgUI.showError("Tried to read from non-existent device");
        return;
    }
    ble.read(this.device.id,
        service, characteristic,
        readCB, writeCB);
};
Bluetoothometer.prototype.writeBT = function(service, characteristic, bytes, readCB, writeCB) {
    if(!this.device) {
        pgUI.showError("Tried to read from non-existent device");
        return;
    }
    ble.write(this.device.id,
        service, characteristic,
        bytes, readCB, writeCB);
};


//====================================================

function GenericMeter(device) {
    Bluetoothometer.call(this, device);
    this.period        = 1000;
    this.device        = device;
    this.deviceHandle  = 0;
    this.deviceService = "";
    this.deviceCharIn  = "";
    this.deviceCharOut = "";
    this.notify = false;
}
GenericMeter.prototype = Object.create(Bluetoothometer.prototype);
GenericMeter.prototype.constructor = GenericMeter;

GenericMeter.prototype.update = function(show, data) {
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
        pgUI.showWarn(err.toString());
        data = {period:1000, data:{}};
    }
    return data;
};
GenericMeter.prototype.settingsDialog = function(callback) {
    var title = "Generic Device Settings";
    var optionText = "";
    optionText += "<p>Service: "+this.deviceService+"</p>";
    optionText += "<p>Characteristic: "+this.deviceCharacteristic+"</p>";
    //optionText += pgUI.printSelect("meter_period", "Period (mS):", this.allPeriods, this.period);
    //Meter.prototype.settingsDialog.call(this, title, optionText, setMeter.bind(this));
    setMeter.call(this, true);

    function setMeter(clickedOK) {
        if(clickedOK) {
            //this.period = parseInt($("#meter_period").val());
            this.pickServiceCharacteristic(cb.bind(this));
            function cb(service, characteristic) {
                this.deviceService = service;
                this.deviceCharIn  = characteristic;
                this.deviceCharOut = "";
                if(this.deviceService.toLowerCase() === "180d")
                    this.allSignals = ["heartRate"];
                else if(this.deviceService === "")
                    this.allSignals = [];
                else
                    this.allSignals = ["generic"];
                callback(clickedOK);
            }
        }
    }
};

GenericMeter.prototype.connect = function(callback) {
    // pick the first service
    this.deviceService = this.device.services[0];
    // pick the first readable/notifiable characteristic
    var characteristics = this.device.characteristics;
    for(var i=0; i<characteristics.length; i++) {
        // only add characteristics that can be read, or that have the notify property
        if(characteristics[i].service === this.deviceService) {
            var hasNotify = characteristics[i].properties.indexOf('Notify') !== -1;
            var hasRead = characteristics[i].properties.indexOf('Read') !== -1;
            if(hasRead || hasNotify) {
                this.deviceCharIn = this.device.characteristics[i];
                break;
            }
        }
    }

    this.deviceCharOut = "";
    if(this.deviceService.toLowerCase() === "180d")
        this.allSignals = ["heartRate"];
    else
        this.allSignals = ["generic"];
    callback(true);
};
GenericMeter.prototype.hasNotify = function() {
    var characteristics = this.device.characteristics;
    for(var i=0; i<characteristics.length; i++) {
        // only add characteristics that can be read, or that have the notify property
        if(characteristics[i].service === this.deviceService) {
            var hasNotify = characteristics[i].properties.indexOf('Notify') !== -1;
            var hasRead = characteristics[i].properties.indexOf('Read') !== -1;
            return hasNotify;
        }
    }
    return false;
};
GenericMeter.prototype.pickServiceCharacteristic = function(callback) {
    this.servicePicker(this.device.services, bleServiceCallback.bind(this));
    function bleServiceCallback(sID) {
        if(sID===-1) {
            callback("","");
            return;
        }
        var service = this.device.services[sID];
        pgUI.showLog("services returned with: " + service );
        var characteristics = this.device.characteristics;
        var cIDs = [];
        for(var i=0; i<characteristics.length; i++) {
            // only add characteristics that can be read, or that have the notify property
            if(characteristics[i].service === service) {
                var hasNotify = characteristics[i].properties.indexOf('Notify') !== -1;
                var hasRead = characteristics[i].properties.indexOf('Read') !== -1;
                if(hasNotify || hasRead) {
                    cIDs.push(characteristics[i].characteristic);
                }
            }
        }
        this.characteristicPicker(cIDs, addServiceCB.bind(this));
        function addServiceCB(cID) {
            if(cID===-1) {
                callback("","");
                return;
            }
            var characteristic = cIDs[cID];
            pgUI.showLog('Adding service ' + service + '; characteristic:' + characteristic);
            callback(service, characteristic);
        }
    }
};
GenericMeter.prototype.start = function(restart) {
    if(this.hasNotify()) {
        this.startNotification(this.deviceService, this.deviceCharIn,
            this.read.bind(this));
        this.deviceHandle = 0;
    }
    else {
        this.deviceHandle = setInterval(readCallback.bind(this), this.period);
    }
    if(!restart)
        this.createData(this.allSignals);
    this.running = true;
    function readCallback() {
        this.readBT(this.deviceService, this.deviceCharIn,
            this.read.bind(this), this.readError);
    }
};
GenericMeter.prototype.stop = function(callback) {
    this.running = false;
    if(this.deviceHandle === 0) {
        this.stopNotification(this.deviceService, this.deviceCharIn);
    }
    else {
        clearInterval(this.deviceHandle);
        this.deviceHandle = 0;
    }
    callback();
};
GenericMeter.prototype.read = function(obj) {
    if(!this.running)
        return;
    var bytes;
    bytes = new Uint8Array(obj);
    if(bytes.length) {
        if(this.signals[0] === "heartRate") {
            var num;
            if(bytes.length === 1) {
                num = this.decodeUint8(bytes);
            }
            else if((bytes[0] & 0x01) === 0) {
                num = this.decodeUint8(bytes.slice(1));
            }
            else {
                num = this.decodeUint16(bytes.slice(1));
            }
            var time = pgUtil.getCurrentTime();
            var val = [time, num];
            pgUI.showLog("Read data: "+val);
            this.pushData(val);
        }
        else {
            var time = pgUtil.getCurrentTime();
            if(bytes.length === 4) {
                var num = this.decodeUint32(bytes);
                var val = [time, num];
                this.pushData(val);
            }
            else if(bytes.length === 2) {
                var num = this.decodeUint16(bytes);
                var val = [time, num];
                this.pushData(val);
            }
            else {
                for(var i=0; i<bytes.length; i++) {
                    var num = bytes[i];
                    var val = [time, num];
                    this.pushData(val);
                }
            }
        }
    }
};

GenericMeter.prototype.servicePicker = function(services, callback) {
    if(services.length===1) {
        callback(0);
        return;
    }
    var dialog_content = '' +
        '<div><label for="btServices">Bluetooth Service:</label>' +
        '<select id="btServices" title="Bluetooth Device" data-native-menu="false">';
    for(var i=0; i<services.length; i++) {
        dialog_content += '<option value="'+i+'">'+this.serviceName(services[i])+'</option>';
    }
    dialog_content += '</select></div>';

    pgUI.showDialog({'title': this.deviceName(), true: "OK", false: "Cancel"},
        dialog_content,
        dialog_cb.bind(this));
    function dialog_cb(tf) {
        if(!tf) {
            this.disconnect(callback.bind(-1));
            return;
        }
        var val = $('#btServices').val();
        callback(val);
    }
};

GenericMeter.prototype.serviceName = function(serviceID) {
    var name = serviceID;
    var sid = serviceID.toLowerCase();
    if(sid in bluetoothUUIDs)
        name = bluetoothUUIDs[sid];
    return name;
};

GenericMeter.prototype.characteristicPicker = function(characteristics, callback) {
    if(characteristics.length===1) {
        callback(0);
        return;
    }
    var dialog_content = '' +
        '<div><label for="btCharacteristics">BT Service characteristic:</label>' +
        '<select id="btCharacteristics" title="Bluetooth Characteristic" data-native-menu="false">';
    for (var i=0; i<characteristics.length; i++) {
        dialog_content += '<option value="'+i+'">'+characteristics[i]+'</option>';
    }
    dialog_content += '</select></div>';
    pgUI.showDialog({'title': this.deviceName(), true: "OK", false: "Cancel"},
        dialog_content, dialog_cb.bind(this));

    function dialog_cb(tf) {
        if(!tf) {
            this.disconnect(callback.bind(-1));
            return;
        }
        var val = $('#btCharacteristics').val();
        callback(val);
    }
};
//====================================================
function PGMeter(device) {
    Bluetoothometer.call(this, device);
    this.pgService      = "00000000-ABBA-DABA-B000-197219721972";
    this.pgCharSettings = "00000100-ABBA-DABA-B000-197219721972";
    this.pgCharData     = "00000200-ABBA-DABA-B000-197219721972";
    this.pgCharButton   = "00000300-ABBA-DABA-B000-197219721972";
    this.pgCharMotion   = "00000310-ABBA-DABA-B000-197219721972";
    this.pgCharTemp     = "00000400-ABBA-DABA-B000-197219721972";
    this.pgCharAccel    = "00000410-ABBA-DABA-B000-197219721972";
    this.pgCharAnalog   = "00000420-ABBA-DABA-B000-197219721972";

    this.firstTime     = 0;
    this.mode          = 0;
    this.period        = 1000;
    this.alarms        = ['sound'];
    this.allAlarms     = ["vibrate","sound","lights"];
    this.motion        = 0;
    this.button        = 1;
    this.allPeriods    = [20, 50, 100, 1000, 10000];
    this.signals       = ["temperature"];
    this.allSignals    = ["temperature","acceleration","analog1","analog2"];
    //this.analog        = 0x01; // chan = 0x0001, chan2 = 0x0002
}
PGMeter.prototype = Object.create(Bluetoothometer.prototype);
PGMeter.prototype.constructor = PGMeter;

PGMeter.prototype.update = function(show, data) {
    try {
        if(show) {
            //this.init();
            this.period    = data.period;
            this.signals   = data.signals;
            this.alarms    = data.alarms;
            this.data      = data.data;
        }
        else {
            data.period    = this.period;
            data.signals   = this.signals;
            data.alarms    = this.alarms;
            data.data      = this.data;
        }
    }
    catch(err) {
        pgUI.showWarn(err.toString());
        data = {period:1000, data:{}};
    }
    return data;
};

PGMeter.prototype.settingsDialog = function(callback) {
    title = "PG Meter";
    var optionText = "";
    optionText += pgUI.printSelect("meter_type", "Measurement type:", this.allSignals, this.signals, true);
    optionText += pgUI.printSelect("meter_period", "Period (mS):", this.allPeriods, this.period);
    optionText += pgUI.printSelect("meter_alarm", "Alarm:", this.allAlarms, this.alarms, true);
    Meter.prototype.settingsDialog.call(this, title, optionText, setMeter.bind(this));

    function setMeter(clickedOK) {
        if(clickedOK) {
            this.signals = $("#meter_type").val() || [];
            this.period  = parseInt($("#meter_period").val());
            this.alarms  = $("#meter_alarm").val() || [];
            this.setParameters();
        }
    }
};
PGMeter.prototype.setParameters = function() {
    this.write('mode');
    this.write('period');
    this.write('alarms');
    this.write('button');
    this.write('motion');
    this.write('temperature');
    this.write('acceleration');
    this.write('analog');
};
PGMeter.prototype.connect = function(callback) {
    this.setParameters();
    this.startNotification(this.pgService, this.pgCharButton,
        this.read.bind(this,"button"));
    this.startNotification(this.pgService, this.pgCharMotion,
        this.read.bind(this,"motion"));
    this.startNotification(this.pgService, this.pgCharTemp,
        this.read.bind(this,"temperature"));
    this.startNotification(this.pgService, this.pgCharAccel,
        this.read.bind(this,"acceleration"));
    this.startNotification(this.pgService, this.pgCharAnalog,
        this.read.bind(this,"analog"));
    callback(true);
};
PGMeter.prototype.disconnect = function(callback) {
    this.stopNotification(this.pgService, this.pgCharButton);
    this.stopNotification(this.pgService, this.pgCharMotion);
    this.stopNotification(this.pgService, this.pgCharTemp);
    this.stopNotification(this.pgService, this.pgCharAccel);
    this.stopNotification(this.pgService, this.pgCharAnalog);
    callback(true);
};
PGMeter.prototype.start = function(restart) {
    if(!restart)
        this.createData(this.signals);
    this.running = true;
};
PGMeter.prototype.stop = function(callback) {
    this.running = false;
    callback();
};
PGMeter.prototype.read = function(type, a) {
    var bytes = new Uint8Array(a);
    var ts = this.decodeUint32(bytes);
    if(!this.firstTime) {
        var time = pgUtil.getCurrentTime();
        this.firstTime = time - ts;
    }
    if(type==="button") {
        // 4 bytes timestamp, 2 bytes step
        var val = this.decodeUint16(bytes.slice(4));
        var pt  = [this.firstTime + ts, val];
        if(val===1)
            UI[pg.page()].lever("left");
        else if(val===2)
            UI[pg.page()].lever("right");
    }
    else if(type==="motion") {
        // 4 bytes timestamp, 2 bytes step
        var val = this.decodeUint16(bytes.slice(4));
        var pt  = [this.firstTime + ts, val];
        if(val===1) // tap
            ;//pgAudio.buzz();
        else if(val===2) // doubletap
            ;//pgAudio.beep();
        else if(val===3) // step
            ;
    }
    if(!this.running)
        return;
    if(this.signals.indexOf(type)===-1 && (type !=="analog")) {
        pgUI.showWarn("Not logging signal: "+type);
        return;
    }
    if(type==="temperature") {
        // 4 bytes timestamp, 2 bytes temp
        var val = this.decodeSingle(bytes.slice(4));
        val = this.filter.push(val);
        var pt = [this.firstTime + ts, val];
        this.addData(type, pt);
    }
    else if(type==="acceleration") {
        // 4 bytes timestamp, 6 bytes temp
        var ax = this.decodeSingle(bytes.slice(4));
        var ay = this.decodeSingle(bytes.slice(8));
        var az = this.decodeSingle(bytes.slice(12));
        var pt = [this.firstTime + ts, ax, ay, az];
        this.addData(type, pt);
    }
    else if(type==="analog") {
        // 4 bytes timestamp, 2 bytes temp
        var val = 0;
        if(this.signals.indexOf("analog1") >= 0) {
            val = this.decodeSingle(bytes.slice(4));
            //val = this.filter.push(val);
            var pt = [this.firstTime + ts, val];
            this.addData("analog1", pt);
        }
        if(this.signals.indexOf("analog2") >= 0) {
            val = this.decodeSingle(bytes.slice(6));
            //val = this.filter.push(val);
            var pt = [this.firstTime + ts, val];
            this.addData("analog2", pt);
        }
    }
};
PGMeter.prototype.write = function(type) {
    var sel = 0;
    var val = 0;
    if(type==="mode") {
        sel = 1;
        val = this.mode;
    }
    else if(type==="period") {
        sel = 2;
        val = this.period;
    }
    else if(type==="alarms") {
        sel = 3;
        val = 0;
        // vibrate = 0x0001, sound = 0x0002, lights = 0x0004
        if(this.alarms.indexOf("vibrate") >= 0)
            val |= 0x0001;
        if(this.alarms.indexOf("sound") >= 0)
            val |= 0x0002;
        if(this.alarms.indexOf("lights") >= 0)
            val |= 0x0004;
    }
    else if(type==="button") {
        sel = 4;
        val = this.button;
    }
    else if(type==="motion") {
        sel = 5;
        val = this.motion;
    }
    else if(type==="temperature") {
        sel = 6;
        val = this.signals.indexOf("temperature") >= 0;
    }
    else if(type==="acceleration") {
        sel = 7;
        val = this.signals.indexOf("acceleration") >= 0;
    }
    else if(type==="analog") {
        sel = 8;
        val = 0x00;
        if(this.signals.indexOf("analog1") >= 0)
            val |= 0x01;
        if(this.signals.indexOf("analog2") >= 0)
            val |= 0x02;
    }
    var bytes = new Uint8Array(4);
    bytes[0] = sel & 0x00FF;
    bytes[1] = (sel & 0xFF00)>>8;
    bytes[2] = val & 0x00FF;
    bytes[3] = (val & 0xFF00)>>8;
    this.writeBT(this.pgService, this.pgCharSettings,
        bytes.buffer, this.writeSuccess, this.writeError);
};

// =================================================================================

function PGMooshimeter(device) {
    Bluetoothometer.call(this, device);
    this.deviceService  = "1BC5FFA0-0200-62AB-E411-F254E005DBD4";
    this.deviceCharOut  = "1BC5FFA1-0200-62AB-E411-F254E005DBD4";
    this.deviceCharIn   = "1BC5FFA2-0200-62AB-E411-F254E005DBD4";

    this.meter  = null;
    this.ping   = 0;
    this.init   = false;

    this.signals        = ["resistance"];
    this.allSignals     = ["current","voltage","temperature","resistance"];
    this.SR             = 125;
    this.allSR          = [125, 250, 500, 1000, 2000, 4000, 8000];
    this.SD             = 32;
    this.allSD          = [32, 64, 128, 256];
    this.settingA       = 10;
    this.settingV       = 0.1;
    this.settingR       = 10000000;
    this.rangeA         = [1, 2.5, 10];
    this.rangeV         = [1.2, 60, 600];
    this.rangeAuxV      = [0.1, 0.3, 1.2];
    this.rangeAllV      = [0.1, 0.3, 1.2, 60, 600];
    this.rangeR         = [1000, 10000, 100000, 1000000, 10000000];
}
PGMooshimeter.prototype = Object.create(Bluetoothometer.prototype);
PGMooshimeter.prototype.constructor = PGMooshimeter;

PGMooshimeter.prototype.update = function(show, data) {
    try {
        if(show) {
            //this.init();
            this.signals      = data.signals;
            this.allRangeAuxV = data.allRangeAuxV;
            this.allRangeAuxR = data.allRangeAuxR;
            this.SR           = data.SR;
            this.SD           = data.SD;
        }
        else {
            data.signals      = this.signals;
            data.allRangeAuxV = this.allRangeAuxV;
            data.allRangeAuxR = this.allRangeAuxR;
            data.SR           = this.SR;
            data.SD           = this.SD;
        }
    }
    catch(err) {
        pgUI.showWarn(err.toString());
        data = {period:1000, data:{}};
    }
    return data;
};

PGMooshimeter.prototype.settingsDialog = function(callback) {
    var title = "Mooshimeter options";
    var optionText = "";

    optionText += pgUI.printSelect("meter_type",   "Measurement type:", this.allSignals, this.signals[0]);
    optionText += pgUI.printSelect("meter_rangeA", "Amp range:", this.rangeA, this.settingA);
    optionText += pgUI.printSelect("meter_rangeV", "Voltage range:", this.rangeAllV, this.settingV);
    optionText += pgUI.printSelect("meter_rangeR", "Resistance range:", this.rangeR, this.settingR);
    optionText += pgUI.printSelect("meter_SR",     "Sample rate:", this.allSR, this.SR);
    optionText += pgUI.printSelect("meter_SD",     "Sample depth:", this.allSD, this.SD);

    Meter.prototype.settingsDialog.call(this, title, optionText, setMeter.bind(this));
    
    function setMeter(clickedOK) {
        if(clickedOK) {
            this.signals  = [$("#meter_type").val()];
            this.settingA = parseInt($("#meter_rangeA").val());
            this.settingV = parseInt($("#meter_rangeV").val());
            this.settingR = parseInt($("#meter_rangeR").val());
            this.SR       = parseInt($("#meter_SR").val());
            this.SD       = parseInt($("#meter_SD").val());
        }
        this.initializeMeter();
        callback(clickedOK);
    }
};

PGMooshimeter.prototype.initializeMeter = function() {
    var srIndex = this.allSR.indexOf(this.SR);
    this.meter.sendCommand('sampling:rate ' +srIndex);
    var sdIndex = this.allSD.indexOf(this.SD);
    this.meter.sendCommand('sampling:depth ' +sdIndex);

    var ch1 = ["Current","Temperature","Shared"];
    var ch2 = ["Voltage","Temperature","Shared"];
    this.channel = 1;

    if(this.signals[0]==="current") {
        this.meter.sendCommand('ch1:mapping 0');     // CH1 : current
        this.meter.sendCommand('ch2:mapping 1');     // Temperature
        var index = 1+ this.rangeA.indexOf(this.settingA);
        this.meter.sendCommand('ch1:range_i '+index);     // CH1 : Amps
    }
    else if(this.signals[0]==="voltage") {
        if(this.settingV <= 1.2) { // shared V
            this.meter.sendCommand('ch1:mapping 2');     // CH1 : shared
            this.meter.sendCommand('ch2:mapping 1');     // Temperature
            this.meter.sendCommand('shared 0');          // shared: voltage
            var index = 1 + this.rangeAuxV.indexOf(this.settingV);
            this.meter.sendCommand('ch1:range_i ' + index);     // V = 0.1v
        }
        else {
            this.channel = 2;
            this.meter.sendCommand('ch1:mapping 1');     // CH1 : temperature
            this.meter.sendCommand('ch2:mapping 2');     // Voltage
            this.meter.sendCommand('shared 0');          // shared: voltage
            var index = 1 + this.rangeV.indexOf(this.settingV);
            this.meter.sendCommand('ch2:range_i ' + index);     // V = 60v
        }
    }
    else if(this.signals[0]==="resistance") {
        this.meter.sendCommand('ch1:mapping 2');     // CH1 : shared
        this.meter.sendCommand('ch2:mapping 1');     // Temperature
        this.meter.sendCommand('shared 1');          // shared: resistance
        var index = 1+ this.rangeR.indexOf(this.settingR);
        this.meter.sendCommand('ch1:range_i '+index);     // CH1 : R = 1E7ohms
    }
    else if(this.signals[0]==="temperature") {
        this.meter.sendCommand('ch1:mapping 1');     // CH1 : temperature
        this.meter.sendCommand('ch2:mapping 1');
    }
    else {
        pgUI.showError("unknown meter type");
    }

    //this.meter.sendCommand('reboot 0'); // logging interval in seconds
    this.meter.sendCommand('log:interval 60'); // logging interval in seconds
    //this.meter.sendCommand('log:on 0');         // log off, because it disrupts the signal
    this.meter.sendCommand('ch1:analysis 0');   // mean, RMS, or entire buffer
    this.meter.sendCommand('ch2:analysis 0');   // mean, RMS, or entire buffer
};

PGMooshimeter.prototype.connect = function(callback) {
    // Mooshimeter calls our read and write methods.
    this.meter = new Mooshimeter(this);
    // Start notifications immediately so that we can communicate with the device
    this.startNotification(this.deviceService, this.deviceCharIn,
                          this.read.bind(this,"default"));
    setTimeout(mconnect.bind(this), 1000);
    function mconnect() {
        this.meter.connect(run.bind(this));
    }
    function run(success) {
        this.initializeMeter();
        this.ping = setInterval(periodic.bind(this), 4000);
        callback(success);
        function periodic() {
            this.meter.sendCommand('pcb_version');
        }
    }
};
PGMooshimeter.prototype.disconnect = function(cb) {
    if(this.meter) {
        this.stopNotification(this.deviceService, this.deviceCharIn);
        this.meter = null;
        clearInterval(this.ping);
        this.ping = 0;
    }
    Bluetoothometer.prototype.disconnect(cb);
};
PGMooshimeter.prototype.start = function(restart) {
    //var signal = "analog1";
    //if(this.signals[0]==="temperature")
    //    signal = "temperature";
    if(!restart) {
        this.createData(this.signals);
        this.filter.reset();
    }
    if(this.channel===1)
        this.meter.attachCallback('ch1:value', this.meterCB.bind(this, this.signals[0]));
    else
        this.meter.attachCallback('ch2:value', this.meterCB.bind(this, this.signals[0]));
    this.meter.sendCommand('sampling:trigger 2'); // Trigger continuous
    this.running = true;
};
PGMooshimeter.prototype.meterCB = function(signal, m, val) {
    val = this.filter.push(val);
    var tval = [pgUtil.getCurrentTime(), val];
    this.addData(signal, tval);
};
PGMooshimeter.prototype.stop = function(callback) {
    this.running = false;
    this.meter.attachCallback('ch1:value', NOP.bind(this));
    this.meter.attachCallback('ch2:value', NOP.bind(this));
    this.meter.sendCommand('sampling:trigger 0'); // Trigger off
    callback();

    function NOP(m, val) {}
};

PGMooshimeter.prototype.read = function(type, bytes) {
    //if(!this.running)  DONT USE THIS LOGIC HERE.  We need to communicate with the device to intialize
    //    return;
    // type == default
    this.meter.readFromMeter(new Uint8Array(bytes));
};
PGMooshimeter.prototype.write = function(bytes) {
    var u8 = new Uint8Array(bytes);
    this.writeBT(this.deviceService, this.deviceCharOut,
              u8.buffer, this.writeSuccess, this.writeError);
};



var bluetoothUUIDs = {
    "0001": "SDP",
    "0003": "RFCOMM",
    "0005": "TCS-BIN",
    "0007": "ATT",
    "0008": "OBEX",
    "000f": "BNEP",
    "0010": "UPNP",
    "0011": "HIDP",
    "0012": "Hardcopy Control Channel",
    "0014": "Hardcopy Data Channel",
    "0016": "Hardcopy Notification",
    "0017": "AVCTP",
    "0019": "AVDTP",
    "001b": "CMTP",
    "001e": "MCAP Control Channel",
    "001f": "MCAP Data Channel",
    "0100": "L2CAP",
    "1000": "Service Discovery Server Service Class",
    "1001": "Browse Group Descriptor Service Class",
    "1002": "Public Browse Root",
    "1101": "Serial Port",
    "1102": "LAN Access Using PPP",
    "1103": "Dialup Networking",
    "1104": "IrMC Sync",
    "1105": "OBEX Object Push",
    "1106": "OBEX File Transfer",
    "1107": "IrMC Sync Command",
    "1108": "Headset",
    "1109": "Cordless Telephony",
    "110a": "Audio Source",
    "110b": "Audio Sink",
    "110c": "A/V Remote Control Target",
    "110d": "Advanced Audio Distribution",
    "110e": "A/V Remote Control",
    "110f": "A/V Remote Control Controller",
    "1110": "Intercom",
    "1111": "Fax",
    "1112": "Headset AG",
    "1113": "WAP",
    "1114": "WAP Client",
    "1115": "PANU",
    "1116": "NAP",
    "1117": "GN",
    "1118": "Direct Printing",
    "1119": "Reference Printing",
    "111a": "Basic Imaging Profile",
    "111b": "Imaging Responder",
    "111c": "Imaging Automatic Archive",
    "111d": "Imaging Referenced Objects",
    "111e": "Handsfree",
    "111f": "Handsfree Audio Gateway",
    "1120": "Direct Printing Refrence Objects Service",
    "1121": "Reflected UI",
    "1122": "Basic Printing",
    "1123": "Printing Status",
    "1124": "Human Interface Device Service",
    "1125": "Hardcopy Cable Replacement",
    "1126": "HCR Print",
    "1127": "HCR Scan",
    "1128": "Common ISDN Access",
    "112d": "SIM Access",
    "112e": "Phonebook Access Client",
    "112f": "Phonebook Access Server",
    "1130": "Phonebook Access",
    "1131": "Headset HS",
    "1132": "Message Access Server",
    "1133": "Message Notification Server",
    "1134": "Message Access Profile",
    "1135": "GNSS",
    "1136": "GNSS Server",
    "1137": "3D Display",
    "1138": "3D Glasses",
    "1139": "3D Synchronization",
    "113a": "MPS Profile",
    "113b": "MPS Service",
    "1200": "PnP Information",
    "1201": "Generic Networking",
    "1202": "Generic File Transfer",
    "1203": "Generic Audio",
    "1204": "Generic Telephony",
    "1205": "UPNP Service",
    "1206": "UPNP IP Service",
    "1300": "UPNP IP PAN",
    "1301": "UPNP IP LAP",
    "1302": "UPNP IP L2CAP",
    "1303": "Video Source",
    "1304": "Video Sink",
    "1305": "Video Distribution",
    "1400": "HDP",
    "1401": "HDP Source",
    "1402": "HDP Sink",
    "1800": "Generic Access Profile",
    "1801": "Generic Attribute Profile",
    "1802": "Immediate Alert",
    "1803": "Link Loss",
    "1804": "Tx Power",
    "1805": "Current Time Service",
    "1806": "Reference Time Update Service",
    "1807": "Next DST Change Service",
    "1808": "Glucose",
    "1809": "Health Thermometer",
    "180a": "Device Information",
    "180d": "Heart Rate",
    "180e": "Phone Alert Status Service",
    "180f": "Battery Service",
    "1810": "Blood Pressure",
    "1811": "Alert Notification Service",
    "1812": "Human Interface Device",
    "1813": "Scan Parameters",
    "1814": "Running Speed and Cadence",
    "1815": "Automation IO",
    "1816": "Cycling Speed and Cadence",
    "1818": "Cycling Power",
    "1819": "Location and Navigation",
    "181a": "Environmental Sensing",
    "181b": "Body Composition",
    "181c": "User Data",
    "181d": "Weight Scale",
    "181e": "Bond Management",
    "181f": "Continuous Glucose Monitoring",
    "1820": "Internet Protocol Support",
    "1821": "Indoor Positioning",
    "1822": "Pulse Oximeter",
    "1823": "HTTP Proxy",
    "1824": "Transport Discovery",
    "1825": "Object Transfer",
    "2800": "Primary Service",
    "2801": "Secondary Service",
    "2802": "Include",
    "2803": "Characteristic",
    "2900": "Characteristic Extended Properties",
    "2901": "Characteristic User Description",
    "2902": "Client Characteristic Configuration",
    "2903": "Server Characteristic Configuration",
    "2904": "Characteristic Format",
    "2905": "Characteristic Aggregate Formate",
    "2906": "Valid Range",
    "2907": "External Report Reference",
    "2908": "Report Reference",
    "2909": "Number of Digitals",
    "290a": "Value Trigger Setting",
    "290b": "Environmental Sensing Configuration",
    "290c": "Environmental Sensing Measurement",
    "290d": "Environmental Sensing Trigger Setting",
    "290e": "Time Trigger Setting",
    "2a00": "Device Name",
    "2a01": "Appearance",
    "2a02": "Peripheral Privacy Flag",
    "2a03": "Reconnection Address",
    "2a04": "Peripheral Preferred Connection Parameters",
    "2a05": "Service Changed",
    "2a06": "Alert Level",
    "2a07": "Tx Power Level",
    "2a08": "Date Time",
    "2a09": "Day of Week",
    "2a0a": "Day Date Time",
    "2a0c": "Exact Time 256",
    "2a0d": "DST Offset",
    "2a0e": "Time Zone",
    "2a0f": "Local Time Information",
    "2a11": "Time with DST",
    "2a12": "Time Accuracy",
    "2a13": "Time Source",
    "2a14": "Reference Time Information",
    "2a16": "Time Update Control Point",
    "2a17": "Time Update State",
    "2a18": "Glucose Measurement",
    "2a19": "Battery Level",
    "2a1c": "Temperature Measurement",
    "2a1d": "Temperature Type",
    "2a1e": "Intermediate Temperature",
    "2a21": "Measurement Interval",
    "2a22": "Boot Keyboard Input Report",
    "2a23": "System ID",
    "2a24": "Model Number String",
    "2a25": "Serial Number String",
    "2a26": "Firmware Revision String",
    "2a27": "Hardware Revision String",
    "2a28": "Software Revision String",
    "2a29": "Manufacturer Name String",
    "2a2a": "IEEE 11073-20601 Regulatory Cert. Data List",
    "2a2b": "Current Time",
    "2a2c": "Magnetic Declination",
    "2a31": "Scan Refresh",
    "2a32": "Boot Keyboard Output Report",
    "2a33": "Boot Mouse Input Report",
    "2a34": "Glucose Measurement Context",
    "2a35": "Blood Pressure Measurement",
    "2a36": "Intermediate Cuff Pressure",
    "2a37": "Heart Rate Measurement",
    "2a38": "Body Sensor Location",
    "2a39": "Heart Rate Control Point",
    "2a3f": "Alert Status",
    "2a40": "Ringer Control Point",
    "2a41": "Ringer Setting",
    "2a42": "Alert Category ID Bit Mask",
    "2a43": "Alert Category ID",
    "2a44": "Alert Notification Control Point",
    "2a45": "Unread Alert Status",
    "2a46": "New Alert",
    "2a47": "Supported New Alert Category",
    "2a48": "Supported Unread Alert Category",
    "2a49": "Blood Pressure Feature",
    "2a4a": "HID Information",
    "2a4b": "Report Map",
    "2a4c": "HID Control Point",
    "2a4d": "Report",
    "2a4e": "Protocol Mode",
    "2a4f": "Scan Interval Window",
    "2a50": "PnP ID",
    "2a51": "Glucose Feature",
    "2a52": "Record Access Control Point",
    "2a53": "RSC Measurement",
    "2a54": "RSC Feature",
    "2a55": "SC Control Point",
    "2a56": "Digital",
    "2a58": "Analog",
    "2a5a": "Aggregate",
    "2a5b": "CSC Measurement",
    "2a5c": "CSC Feature",
    "2a5d": "Sensor Location",
    "2a63": "Cycling Power Measurement",
    "2a64": "Cycling Power Vector",
    "2a65": "Cycling Power Feature",
    "2a66": "Cycling Power Control Point",
    "2a67": "Location and Speed",
    "2a68": "Navigation",
    "2a69": "Position Quality",
    "2a6a": "LN Feature",
    "2a6b": "LN Control Point",
    "2a6c": "Elevation",
    "2a6d": "Pressure",
    "2a6e": "Temperature",
    "2a6f": "Humidity",
    "2a70": "True Wind Speed",
    "2a71": "True Wind Direction",
    "2a72": "Apparent Wind Speed",
    "2a73": "Apparent Wind Direction",
    "2a74": "Gust Factor",
    "2a75": "Pollen Concentration",
    "2a76": "UV Index",
    "2a77": "Irradiance",
    "2a78": "Rainfall",
    "2a79": "Wind Chill",
    "2a7a": "Heat Index",
    "2a7b": "Dew Point",
    "2a7c": "Trend",
    "2a7d": "Descriptor Value Changed",
    "2a7e": "Aerobic Heart Rate Lower Limit",
    "2a7f": "Aerobic Threshold",
    "2a80": "Age",
    "2a81": "Anaerobic Heart Rate Lower Limit",
    "2a82": "Anaerobic Heart Rate Upper Limit",
    "2a83": "Anaerobic Threshold",
    "2a84": "Aerobic Heart Rate Upper Limit",
    "2a85": "Date of Birth",
    "2a86": "Date of Threshold Assessment",
    "2a87": "Email Address",
    "2a88": "Fat Burn Heart Rate Lower Limit",
    "2a89": "Fat Burn Heart Rate Upper Limit",
    "2a8a": "First Name",
    "2a8b": "Five Zone Heart Rate Limits",
    "2a8c": "Gender",
    "2a8d": "Heart Rate Max",
    "2a8e": "Height",
    "2a8f": "Hip Circumference",
    "2a90": "Last Name",
    "2a91": "Maximum Recommended Heart Rate",
    "2a92": "Resting Heart Rate",
    "2a93": "Sport Type for Aerobic/Anaerobic Thresholds",
    "2a94": "Three Zone Heart Rate Limits",
    "2a95": "Two Zone Heart Rate Limit",
    "2a96": "VO2 Max",
    "2a97": "Waist Circumference",
    "2a98": "Weight",
    "2a99": "Database Change Increment",
    "2a9a": "User Index",
    "2a9b": "Body Composition Feature",
    "2a9c": "Body Composition Measurement",
    "2a9d": "Weight Measurement",
    "2a9e": "Weight Scale Feature",
    "2a9f": "User Control Point",
    "2aa0": "Magnetic Flux Density - 2D",
    "2aa1": "Magnetic Flux Density - 3D",
    "2aa2": "Language",
    "2aa3": "Barometric Pressure Trend",
    "2aa4": "Bond Management Control Point",
    "2aa5": "Bond Management Feature",
    "2aa6": "Central Address Resolution",
    "2aa7": "CGM Measurement",
    "2aa8": "CGM Feature",
    "2aa9": "CGM Status",
    "2aaa": "CGM Session Start Time",
    "2aab": "CGM Session Run Time",
    "2aac": "CGM Specific Ops Control Point",
    "2aad": "Indoor Positioning Configuration",
    "2aae": "Latitude",
    "2aaf": "Longitude",
    "2ab0": "Local North Coordinate",
    "2ab1": "Local East Coordinate",
    "2ab2": "Floor Number",
    "2ab3": "Altitude",
    "2ab4": "Uncertainty",
    "2ab5": "Location Name",
    "2ab6": "URI",
    "2ab7": "HTTP Headers",
    "2ab8": "HTTP Status Code",
    "2ab9": "HTTP Entity Body",
    "2aba": "HTTP Control Point",
    "2abb": "HTTPS Security",
    "2abc": "TDS Control Point",
    "2abd": "OTS Feature",
    "2abe": "Object Name",
    "2abf": "Object Type",
    "2ac0": "Object Size",
    "2ac1": "Object First-Created",
    "2ac2": "Object Last-Modified",
    "2ac3": "Object ID",
    "2ac4": "Object Properties",
    "2ac5": "Object Action Control Point",
    "2ac6": "Object List Control Point",
    "2ac7": "Object List Filter",
    "2ac8": "Object Changed",
    "feff": "GN Netcom",
    "fefe": "GN ReSound A/S",
    "fefd": "Gimbal, Inc.",
    "fefc": "Gimbal, Inc.",
    "fefb": "Stollmann E+V GmbH",
    "fefa": "PayPal, Inc.",
    "fef9": "PayPal, Inc.",
    "fef8": "Aplix Corporation",
    "fef7": "Aplix Corporation",
    "fef6": "Wicentric, Inc.",
    "fef5": "Dialog Semiconductor GmbH",
    "fef4": "Google",
    "fef3": "Google",
    "fef2": "CSR",
    "fef1": "CSR",
    "fef0": "Intel",
    "feef": "Polar Electro Oy",
    "feee": "Polar Electro Oy",
    "feed": "Tile, Inc.",
    "feec": "Tile, Inc.",
    "feeb": "Swirl Networks, Inc.",
    "feea": "Swirl Networks, Inc.",
    "fee9": "Quintic Corp.",
    "fee8": "Quintic Corp.",
    "fee7": "Tencent Holdings Limited",
    "fee6": "Seed Labs, Inc.",
    "fee5": "Nordic Semiconductor ASA",
    "fee4": "Nordic Semiconductor ASA",
    "fee3": "Anki, Inc.",
    "fee2": "Anki, Inc.",
    "fee1": "Anhui Huami Information Technology Co.",
    "fee0": "Anhui Huami Information Technology Co.",
    "fedf": "Design SHIFT",
    "fede": "Coin, Inc.",
    "fedd": "Jawbone",
    "fedc": "Jawbone",
    "fedb": "Perka, Inc.",
    "feda": "ISSC Technologies Corporation",
    "fed9": "Pebble Technology Corporation",
    "fed8": "Google",
    "fed7": "Broadcom Corporation",
    "fed6": "Broadcom Corporation",
    "fed5": "Plantronics Inc.",
    "fed4": "Apple, Inc.",
    "fed3": "Apple, Inc.",
    "fed2": "Apple, Inc.",
    "fed1": "Apple, Inc.",
    "fed0": "Apple, Inc.",
    "fecf": "Apple, Inc.",
    "fece": "Apple, Inc.",
    "fecd": "Apple, Inc.",
    "fecc": "Apple, Inc.",
    "fecb": "Apple, Inc.",
    "feca": "Apple, Inc.",
    "fec9": "Apple, Inc.",
    "fec8": "Apple, Inc.",
    "fec7": "Apple, Inc.",
    "fec6": "Kocomojo, LLC",
    "fec5": "Realtek Semiconductor Corp.",
    "fec4": "PLUS Location Systems",
    "fec3": "360fly, Inc.",
    "fec2": "Blue Spark Technologies, Inc.",
    "fec1": "KDDI Corporation",
    "fec0": "KDDI Corporation",
    "febf": "Nod, Inc.",
    "febe": "Bose Corporation",
    "febd": "Clover Network, Inc.",
    "febc": "Dexcom, Inc.",
    "febb": "adafruit industries",
    "feba": "Tencent Holdings Limited",
    "feb9": "LG Electronics",
    "feb8": "Facebook, Inc.",
    "feb7": "Facebook, Inc.",
    "feb6": "Vencer Co, Ltd",
    "feb5": "WiSilica Inc.",
    "feb4": "WiSilica Inc.",
    "feb3": "Taobao",
    "feb2": "Microsoft Corporation",
    "feb1": "Electronics Tomorrow Limited",
    "feb0": "Nest Labs Inc.",
    "feaf": "Nest Labs Inc.",
    "feae": "Nokia Corporation",
    "fead": "Nokia Corporation",
    "feac": "Nokia Corporation",
    "feab": "Nokia Corporation",
    "feaa": "Google",
    "fea9": "Savant Systems LLC",
    "fea8": "Savant Systems LLC",
    "fea7": "UTC Fire and Security",
    "fea6": "GoPro, Inc.",
    "fea5": "GoPro, Inc.",
    "fea4": "Paxton Access Ltd",
    "fea3": "ITT Industries",
    "fea2": "Intrepid Control Systems, Inc.",
    "fea1": "Intrepid Control Systems, Inc.",
    "fea0": "Google",
    "fe9f": "Google",
    "fe9e": "Dialog Semiconductor B.V.",
    "fe9d": "Mobiquity Networks Inc",
    "fe9c": "GSI Laboratories, Inc.",
    "fe9b": "Samsara Networks, Inc",
    "fe9a": "Estimote",
    "fe99": "Currant, Inc.",
    "fe98": "Currant, Inc.",
    "fe97": "Tesla Motor Inc.",
    "fe96": "Tesla Motor Inc.",
    "fe95": "Xiaomi Inc.",
    "fe94": "OttoQ Inc.",
    "fe93": "OttoQ Inc.",
    "fe92": "Jarden Safety & Security",
    "fe91": "Shanghai Imilab Technology Co.,Ltd",
    "fe90": "JUMA",
    "fe8f": "CSR",
    "fe8e": "ARM Ltd",
    "fe8d": "Interaxon Inc.",
    "fe8c": "TRON Forum",
    "fe8b": "Apple, Inc.",
    "fe8a": "Apple, Inc.",
    "fe89": "B&O Play A/S",
    "fe88": "SALTO SYSTEMS S.L.",
    "fe87": "Qingdao Yeelink Information Technology Co., Ltd.",
    "fe86": "HUAWEI Technologies Co., Ltd.",
    "fe85": "RF Digital Corp",
    "fe84": "RF Digital Corp",
    "fe83": "Blue Bite",
    "fe82": "Medtronic Inc.",
    "fe81": "Medtronic Inc.",
    "fe80": "Doppler Lab",
    "fe7f": "Doppler Lab",
    "fe7e": "Awear Solutions Ltd",
    "fe7d": "Aterica Health Inc.",
    "fe7c": "Stollmann E+V GmbH",
    "fe7b": "Orion Labs, Inc.",
    "fffe": "Alliance for Wireless Power (A4WP)",
    "fffd": "Fast IDentity Online Alliance (FIDO)"
};
