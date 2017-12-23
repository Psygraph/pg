
var pgBluetooth = {
    foundDevices: [],
    
    activeDeviceHandle:  0,
    activeDevice:        {},
    activeDeviceService: "0x000",
    activeDeviceChar:    "0x000",

    btData:    [],
    data:      [],
    firstTime: 0,
    scanning:  false,
    
    //useBLE: true,

    init: function() {
        if(pgUtil.isWebBrowser())
            return;
        //if(!pgBluetooth.useBLE)
        //    document.addEventListener('deviceready', function () {
        //            new Promise(function (resolve, reject) {
        //                    bluetoothle.initialize(resolve, reject, { request: true, statusReceiver: false });
        //            }).then(pgBluetooth.initializeSuccess, pgBluetooth.handleError);
        //        });
    },
    
    initializeSuccess: function(result) {
        if (result.status === "enabled") {
            showLog("Bluetooth is enabled.");
        }
        else {
            showLog("Bluetooth is not enabled.");
        }
    },
    devices: function() {
        return pgBluetooth.foundDevices;
    },
    activeDeviceName: function() {
        var name = "none";
        if(pgBluetooth.isConnected())
            name = pgBluetooth.activeDevice.name;
        return name;
    },
    
    startScan: function(cback) {
        if(pgUtil.isWebBrowser() || pgBluetooth.scanning)
            return;
        pgBluetooth.scanning = true;
        showLog("Starting bluetooth scan...");
        //if(pgBluetooth.useBLE) {
            ble.startScan([],startScanSuccess, cback);
            return;
        //}
        //bluetoothle.startScan(startScanSuccess, pgBluetooth.handleError, { services: [] });
        function startScanSuccess(result) {
            //if(pgBluetooth.useBLE) {
                if(!pgBluetooth.foundDevices.some(function (device){
                            return device.id === result.id;
                        })) {
                    if(typeof(result.name)!="undefined")
                        showLog('FOUND DEVICE:'  + result.name);
                    pgBluetooth.foundDevices.push(result);
                    cback();
                }
            //    return;
            //}
            //if(result.status === "scanStarted") {
            //    pgBluetooth.foundDevices = [];
            //}
            //else if(result.status === "scanResult") {
            //    if(!pgBluetooth.foundDevices.some(function (device){
            //                return device.address === result.address;
            //            })) {
            //        if(typeof(result.name)!="undefined")
            //            showLog('FOUND DEVICE:'  + result.name);
            //        pgBluetooth.foundDevices.push(result);
            //        cback();
            //    }
            //}
            //else {
            //    showLog("Bluetooth scan result: "+result.status);
            //}
        }
    },
    stopScan: function(cb) {
        if(pgUtil.isWebBrowser())
            return;
        if(pgBluetooth.scanning) {
            //if(pgBluetooth.useBLE) {
                ble.stopScan(resolve, reject);
            //}
            //else {
            //    bluetoothle.stopScan(resolve, reject);
            //}
            pgBluetooth.scanning = false;
        }
        else {
            cb(true);
        }
        function resolve(){showLog('scan finished.'); cb(true);}
        function reject(){showLog('scan finished.'); cb(false);}
    },
    disconnect: function(cb) { 
        cb = (typeof(cb)!="undefined")? cb : function(){};
        var dev = pgBluetooth.activeDevice;
        pgBluetooth.activeDevice = {};
        //if(pgBluetooth.useBLE) {
            ble.disconnect(dev.id, pgBluetooth.handleSuccess, pgBluetooth.handleError);
        //}
        //else {
        //    bluetoothle.disconnect(disconnected, pgBluetooth.handleError, dev);
        //}
        cb();
        function disconnected(status) {
            bluetoothle.close(pgBluetooth.handleSuccess, pgBluetooth.handleError, {"address": dev.address});
        }
    },

    isConnected: function() {
        if($.isEmptyObject(pgBluetooth.activeDevice))
            return false;
        else
            return true;
        //ble.isConnected(pgBluetooth.activeDeviceName, yes, no);
    },
    
    connect: function(name, cb) {
        if(name == "none" ||
           pgUtil.isWebBrowser()
        ) {
            cb(false);
        }
        var btDevs = pgBluetooth.foundDevices;
        var address = "none";
        for(var i=0; i<btDevs.length; i++) {
            if( btDevs[i].name == name) {
                //if(pgBluetooth.useBLE)
                    address = btDevs[i].id;
                //else
                //    address = btDevs[i].address;
                //break;
            }
        }   
        showLog('Connecting to device: ' + address + "...");
        //if(pgBluetooth.useBLE) {
            showBusy(true);
            ble.connect(address, connectSuccess, pgBluetooth.handleError);
        //}
        //else {
        //    new Promise(function (resolve, reject) {
        //            bluetoothle.connect(resolve, reject, { address: address });
        //        }).then(connectSuccess, pgBluetooth.handleError);
        //}
        function connectSuccess(result) {
            showBusy(false);
            showLog("Connect success: " + result.status);
            //if(pgBluetooth.useBLE) {
                pgBluetooth.activeDevice     = result;   
                pgBluetooth.servicePicker(result.services, bleServiceCallback);
                return;
            //}
            //if (result.status === "connected") {
            //    pgBluetooth.activeDevice = { address: result.address, name: name};
            //    getDeviceServices(result.address);
            //}
            //else if (result.status === "disconnected") {
            //    showLog("Disconnected from Bluetooth device: " + result.address);
            //    pgBluetooth.activeDevice = {};
            //}
            
            function getDeviceServices(address) {
                showLog("Getting BlueTooth device services for: "+address);
                if (device.platform=="Android") {
                    new Promise(function (resolve, reject) {
                            bluetoothle.discover(resolve, reject, {"address": address});
                    }).then(discoverSuccess, pgBluetooth.handleError);
                }
                else if(device.platform=="iOS") {
                    new Promise(function (resolve, reject) {
                            bluetoothle.services(resolve, reject, { address: address });
                        }).then(servicesSuccess, pgBluetooth.handleError);
                }
                else {
                    showLog("Unsupported Bluetooth platform: '" + device.platform);
                }
                
                function discoverSuccess(result) {
                    showLog("Discover returned with status: " + result.status);
                    if (result.status === "discovered") {
                        // Create a chain of read promises so we don't try to read a property until we've finished
                        // reading the previous property.
                        var services = [];
                        var readSequence = result.services.reduce(function (sequence, service) {
                                return sequence.then(function () {
                                        services.push(service.name);
                                    });
                            }, Promise.resolve());
                        // Once we're done reading all the values, disconnect
                        readSequence.then(function () {
                                pgBluetooth.servicePicker(services, serviceCallback1);
                            });
                        //for(var i=0; i<result.services.length; i++)
                        //    services.push(result.services[i].name);
                        //pgBluetooth.servicePicker(services, serviceCallback1);
                    }
                    function serviceCallback1(sID) {
                        var service = result.services[sID];
                        return addService(result.address, service.uuid, service.characteristics);
                    }
                }
                
                function servicesSuccess(result) {
                    showLog("services returned with: " + result.address );
                    if (result.status === "services") {
                        pgBluetooth.servicePicker(result.services, serviceCallback2);
                    }
                    function serviceCallback2(sID) {
                        var service = result.services[sID];
                        new Promise(function (resolve, reject) {
                                bluetoothle.characteristics(resolve, reject,
                                                            { address: result.address, service: service });
                        }).then(characteristicsSuccess, pgBluetooth.handleError);
                    }
                    function characteristicsSuccess(result) {
                        //showLog("characteristicsSuccess()");
                        if (result.status === "characteristics") {
                            return addService(result.address, result.service, result.characteristics);
                        }
                    }
                }
            }
            function bleServiceCallback(sID) {
                var service = pgBluetooth.activeDevice.services[sID];
                showLog("services returned with: " + service );
                var characteristics = pgBluetooth.activeDevice.characteristics;
                var cIDs      = [];
                var notifyArr = [];
                for(var i=0; i<characteristics.length; i++) {
                    // only add characteristics that can be read, or that have the notify property
                    if(characteristics[i].service == service) {
                        var hasNotify = characteristics[i].properties.indexOf('Notify') != -1;
                        var hasRead = characteristics[i].properties.indexOf('Read') != -1;
                        if(hasNotify || hasRead) {
                            cIDs.push(characteristics[i].characteristic);
                            notifyArr.push(hasNotify);
                        }
                    }
                }
                pgBluetooth.characteristicPicker(cIDs, addServiceCB);
                function addServiceCB(cID) {
                    var characteristic = cIDs[cID];
                    var characteristics = pgBluetooth.activeDevice.characteristics;
                    showLog('Adding service ' + service + '; characteristic:' + characteristic);
                    pgBluetooth.activeDeviceService = service;
                    pgBluetooth.activeDeviceChar    = characteristic;
                    pgBluetooth.activeDevice.notify = notifyArr[cID];
                    connectCB(true);
                }
            }
            function addService(address, serviceUuid, characteristics) {
                var cIDs = [];
                for(var i=0; i<characteristics.length; i++) {
                    // only add characteristics that can be read, or that have the notify property
                    if ('read' in characteristics[i].properties ||
                        'notify' in characteristics[i].properties) {
                        cIDs.push(characteristics[i].uuid);
                    }
                    pgBluetooth.activeDevice.notify = true;
                }
                pgBluetooth.characteristicPicker(cIDs, charCallback);
                function charCallback(cID) {
                    showLog('Adding service ' + serviceUuid + '; characteristics:' + characteristics[cID]);
                    var readSequence = Promise.resolve();
                    characteristic = characteristics[cID];
                    pgBluetooth.activeDevice = { address: address, 
                                                 service: serviceUuid, 
                                                 characteristic: characteristic.uuid,
                                                 timeout: 5000,
                                                 notify: false };
                    if ('notify' in characteristics[cID].properties) {
                        pgBluetooth.activeDevice.notify = true;
                    }
                    connectCB(true);
                }
            }
        }
        function connectCB(b) {
            cb(b);
        }
    },
    
    start: function(opts) {
        if(pgUtil.isWebBrowser())
            return;
        pgBluetooth.firstTime = 0;
        if(!pgBluetooth.isConnected()) {
            showError("Not connected.");
            return;
        }
        pgBluetooth.data = [];
        if(pgBluetooth.activeDevice.notify) {
            //if(pgBluetooth.useBLE) {
                ble.startNotification(pgBluetooth.activeDevice.id, 
                                      pgBluetooth.activeDeviceService, 
                                      pgBluetooth.activeDeviceChar, 
                                      readSuccess, readError);
            //}
            //else
            //    bluetoothle.subscribe( readSuccess, readError, pgBluetooth.activeDevice );
            pgBluetooth.activeDeviceHandle = 0;
        }
        else {
            pgBluetooth.activeDeviceHandle = setInterval(readCallback, opts.updateInterval);
        }
        function readCallback() {
            //if(pgBluetooth.useBLE) {
                ble.read(pgBluetooth.activeDevice.id,
                         pgBluetooth.activeDeviceService,
                         pgBluetooth.activeDeviceChar,
                         readSuccess, readError);
            //}
            //else {
            //    bluetoothle.read(readSuccess, readError, pgBluetooth.activeDevice);
            //}
        }
        function readSuccess(obj) {
            var bytes;
            //if(pgBluetooth.useBLE) {
                bytes = new Uint8Array(obj);
            //}
            //else if ((obj.status === "read" || obj.status === "subscribedResult") &&
            //         obj.value ) {
            //    bytes = bluetoothle.encodedStringToBytes(obj.value);
            //}
            //else {
            //    return;
            //}
            if (bytes.length) {
                if(pgBluetooth.activeDeviceName().substring(0,6) == "PDXEDU") {
                    // little endian encoding of uint32 timestamp
                    var timeMod = decodeUint32(bytes);
                    if(!pgBluetooth.firstTime) {
                        var time = pgUtil.getCurrentTime();
                        pgBluetooth.firstTime = time - timeMod;
                    }
                    for(var i=4; i<bytes.length; i+=2) {
                        // little endian encoding of uint16 value
                        var num = bytes[i] + bytes[i+1] * 256;
                        var val = [pgBluetooth.firstTime + timeMod, num];
                        pgBluetooth.data.push(val);
                        timeMod += 10;
                    }
                }
                // Retrieve the BPM value for the Heart Rate Monitor
                else if(pgBluetooth.activeDeviceService.toLowerCase() == "180d") {
                    var num;
                    if(bytes.length == 1) {
                        num = bytes[0];
                    }
                    else if((bytes[0] & 0x01) == 0) {
                        num = bytes[1];
                    }
                    else {
                        num = bytes[1] + bytes[2] * 256;
                    }
                    var time = pgUtil.getCurrentTime();
                    var val = [time, num];
                    pgBluetooth.data.push(val);
                }
                else {
                    var num = 0;
                    var time = pgUtil.getCurrentTime();
                    if(bytes.length == 4) {
                        num = decodeUint32(bytes);
                        var val = [time, num];
                        pgBluetooth.data.push(val);
                    }
                    else if(bytes.length == 2) {
                        num = decodeUint16(bytes);
                        var val = [time, num];
                        pgBluetooth.data.push(val);
                    }
                    else {
                        for(var i=0; i<bytes.length; i++) {
                            num = bytes[i];
                            var val = [time, num];
                            pgBluetooth.data.push(val);
                        }
                    }
                }
            }
        }
        function readError(obj) {
            showWarn("Bluetooth read Error : " + JSON.stringify(obj));
        }
        function decodeUint32(bytes) {
            return bytes[0] + bytes[1] *256 +bytes[2] *256*256 + bytes[3] *256*256*256;
        }
        function decodeUint16(bytes) {
            return bytes[0] + bytes[1] *256;
        }
        function decodeUint8(bytes) {
            return bytes[0];
        }
    },
    
    stop: function() {
        if(pgUtil.isWebBrowser())
            return;
        if(pgBluetooth.activeDeviceHandle == 0) {
            //if(pgBluetooth.useBLE) {
                ble.stopNotification(pgBluetooth.activeDevice.id, 
                                     pgBluetooth.activeDeviceService, 
                                     pgBluetooth.activeDeviceChar, 
                                     pgBluetooth.handleSuccess, pgBluetooth.handleError);
            //}
            //else {
            //    bluetoothle.unsubscribe(disconnectCB, pgBluetooth.handleError, pgBluetooth.activeDevice);
            //}
        }
        else {
            clearInterval(pgBluetooth.activeDeviceHandle);
            disconnectCB();
        }
        function disconnectCB() {
            pgBluetooth.activeDeviceHandle = null;
        }
    },
    
    getBluetoothData: function() {
        return pgBluetooth.data;
    },

    handleSuccess: function(error) {
        showLog();
    },

    handleError: function(error) {
        var msg = "";
        showBusy(false);
        if(typeof(error)=="object") {
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
        showError(msg);
    },
    
    servicePicker: function(services, cb) {
        if(services.length==1) {
            cb(0);
            return;
        }
        var dialog_content = '' + 
            '<div><label for="btServices">Bluetooth Service:</label>' +
            '<select id="btServices" value="none" title="Bluetooth Device" data-native-menu="false">';
        for(var i=0; i<services.length; i++) {
            dialog_content += '<option value="'+i+'">'+serviceName(services[i])+'</option>';
        }
        dialog_content += '</select></div>';

        showDialog({'title': pgBluetooth.activeDeviceName(), true: "OK"},
                   dialog_content,
                   dialog_cb, "prefs");
        function dialog_cb() {
            var val = $('#btServices').val();
            cb(val);
        }
        function serviceName(serviceID) {
            var name = serviceID;
            var sid = serviceID.toLowerCase();
            if(sid in pgBluetooth.uuids)
                name = pgBluetooth.uuids[sid];
            return name;
        }
    },

    characteristicPicker: function(characteristics, cb) {
        if(characteristics.length==1) {
            cb(0);
            return;
        }
        var dialog_content = '' +
            '<div><label for="btCharacteristics">BT Service characteristic:</label>' +
            '<select id="btCharacteristics" value="none" title="Bluetooth Characteristic" data-native-menu="false">';
        for (var i=0; i<characteristics.length; i++) {
            dialog_content += '<option value="'+i+'">'+characteristics[i]+'</option>';
        }
        dialog_content += '</select></div>';

        showDialog({'title': pgBluetooth.activeDeviceName(), true: "OK"},
                   dialog_content,
                   dialog_cb, "prefs");
        function dialog_cb() {
            var val = $('#btCharacteristics').val();
            cb(val);
        }
    },

    uuids: {
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
            }
};
