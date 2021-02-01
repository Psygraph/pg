import {pgUtil, pgDebug} from '../util';
import {pgUI} from '../ui';
import {Meter} from './meter';
import {PGMeter, GenericMeter} from './btmeter';
import * as $ from 'jquery';

//import {PGMooshimeter} from './btmeter';


class BluetoothDevice extends Meter {
    foundDevices = [];
    meter = null;
    scanning = false;
    lastConnectedDevice = '';
    
    constructor() {
        super('bluetooth');
        this.foundDevices = [];
        this.meter = null;
        this.scanning = false;
        this.lastConnectedDevice = '';
    }
    init(){}
    getAllSignalsNV() {
        return [
            {name: "Bluetooth", value:"bluetooth"},
        ];
    }
    deviceName() {
        let name = 'none';
        if (this.meter) {
            name = this.meter.deviceName();
        }
        return name;
    }
    //init() {
    //    super.init();
    //}
    update(show, data) {
        try {
            if (show) {
                this.lastConnectedDevice = data.lastConnectedDevice;
            } else {
                data.lastConnectedDevice = this.lastConnectedDevice;
            }
        } catch (err) {
            pgDebug.showWarn(err.toString());
            data = {};
        }
        return data;
    }
    settingsDialog(callback) {
        if (this.meter) {
            this.meter.settingsDialog();
        }
        else {
            let foundDeviceNames = this.foundDevices.map(a => a.name);
            for (let i=foundDeviceNames.length; i>=0; i--) {
                if (foundDeviceNames[i] === undefined) {
                    foundDeviceNames.splice(i,1);
                }
            }
            const opts = this.settingsDialogOpts('Bluetooth Settings', gatherData);
            const optionText = pgUI.printSelect('bluetooth_devices', 'Devices:', foundDeviceNames, this.lastConnectedDevice);
            //optionText += connect button
            super.settingsDialog(opts, optionText, setMeter.bind(this));
        }
        function gatherData() {
            return {period: parseInt($('#bluetooth_devices').val())};
        }
        function setMeter(success, data) {
            if (success) {
                this.period = data.period;
            }
            callback(success);
        }
    }
    btConnect() {
        var name = this.deviceName();
        var btDev = $('#BTDevices').val();
        if (name !== 'none') {
            pgDebug.showLog('Bluetooth disconnecting from device: ' + btDev);
            btDev = 'none';
        } else {
            pgDebug.showLog('Bluetooth connecting to device: ' + btDev);
        }
        this.stopScan(cb);
        
        function cb() {
            if (btDev === 'none') {
                this.disconnect(finish);
            } else {
                this.connect(btDev);
            }
        }
        function finish(yn) {
            pgUI.preferences.btSetCurrentDevice();
        }
    }
    btCallback() {
        //showLog("Bluetooth scan found a device");
        var btDevs = this.devices();
        var devs = $('#BTDevices');
        var v = devs.val();
        var len = 0;
        addDev('none');
        for (var i = 0; i < btDevs.length; i++) {
            var dev = btDevs[i];
            var name = dev.name;
            if (name) {
                len = len + 1;
                addDev(name);
            }
        }
        devs.val(v);
        devs.trigger('change');
        
        function addDev(nm) {
            var exists = false;
            $('#BTDevices option').each(function() {
                if (this.value === nm) {
                    exists = true;
                    return false;
                }
            });
            if (!exists) {
                devs.append(new Option(nm, nm));
            }
        }
    }
    btSetCurrentDevice() {
        var name = this.deviceName();
        pgDebug.showLog('Bluetooth connected to device: ' + name);
        var label = 'Connect to: ';
        var devs = $('#BTDevices');
        var settings = $('#BTSettings');
        if (name !== 'none') {
            label = 'Disconnect: \'' + name + '\'';
            devs.selectmenu('disable');
            //devs.parent().hide();
            //settings.parent().show();
        } else {
            devs.selectmenu('enable');
            //devs.parent().show();
            //settings.parent().hide();
        }
        $('#BTConnect').val(label).button("refresh");
    }
    getSignals() {
        if (this.meter) {
            return this.meter.getSignals();
        }
        return this.signals;
    }
    getAllSignals() {
        if (this.meter) {
            return this.meter.allSignals;
        }
        return this.allSignals;
    }
    getData() {
        if (this.meter) {
            return this.meter.getData();
        }
        return this.data;
    }
    devices() {
        return this.foundDevices;
    }
    
    isGenericMeter(services) {
        return services.indexOf('180d') >= 0 || services.indexOf('180D') >= 0;
    }
    isPGMeter(services) {
        return services.indexOf('00000000-ABBA-DABA-B000-197219721972') >= 0;
    }
    isMooshimeter(services) {
        return services.indexOf('1BC5FFA0-0200-62AB-E411-F254E005DBD4') >= 0;
    }
    startScan(callback = (success)=>{}) {
        if (pgUtil.isWebBrowser || this.scanning) {
            callback(this.scanning);
            return;
        }
        this.scanning = true;
        pgDebug.showLog('Starting bluetooth scan...');
        pgUtil.ble.startScan([], startScanSuccess.bind(this), callback);
        
        function startScanSuccess(result) {
            if (!this.foundDevices.some(function(device) {
                return device.id === result.id;
            })) {
                if (typeof (result.name) !== 'undefined') {
                    pgDebug.showLog('FOUND DEVICE:' + result.name);
                }
                this.foundDevices.push(result);
                callback(true);
            }
        }
    }
    stopScan(callback = (success)=>{}) {
        if (pgUtil.isWebBrowser) {
            callback(false);
            return;
        }
        if (this.scanning) {
            pgUtil.ble.stopScan(resolve.bind(this), reject.bind(this));
            this.scanning = false;
        } else {
            callback(true);
        }
        function resolve() {
            pgDebug.showLog('scan finished.');
            callback(true);
        }
        function reject() {
            pgDebug.showLog('scan finished.');
            callback(false);
        }
    }
    
    isConnected() {
        if (this.meter) {
            return true;
        } else {
            return false;
        }
        //ble.isConnected(this.activeDeviceName, yes, no);
    }
    reconnect(callback) {
        if (!this.isConnected() && this.lastConnectedDevice !== '') {
            this.namedConnect(this.lastConnectedDevice, cb.bind(this));
        }// eslint-disable-line
        else {
            callback(true);
        }
        
        function cb(tf) {
            if (!tf) {
                pgUI.showAlert("warning",'Could not connect to \'' + this.lastConnectedDevice + '\', reconnect in the preferences.');
                this.lastConnectedDevice = '';
            }
            callback(tf);
        }
    }
    namedConnect(callback, name) {
        if (name === 'none' || pgUtil.isWebBrowser) {
            callback(false);
            return;
        }
        const btDevs = this.foundDevices;
        let address = 'none';
        for (let i = 0; i < btDevs.length; i++) {
            if (btDevs[i].name === name) {
                address = btDevs[i].id;
            }
        }
        pgDebug.showLog('Connecting to device: ' + address + '...');
        pgUI.showBusy(true);
        pgUtil.ble.connect(address, connectSuccess.bind(this), handleError.bind(this));// eslint-disable-line
        
        function connectSuccess(result) {
            pgUI.showBusy(false);
            pgDebug.showLog('Connect success');
            const services = result.services;
            
            if (this.isPGMeter(services)) {
                this.meter = new PGMeter(result);
                //} else if (this.isMooshimeter(services)) {
                //    this.meter = new PGMooshimeter(result);
            } else if (this.isGenericMeter(services)) {
                this.meter = new GenericMeter(result);
            } else {
                pgUI.showAlert("warning",'Device incompatible: disconnecting.');
                this.disconnect(callback.bind(false));
                return;
            }
            this.meter.connect(handleSuccess.bind(this));// eslint-disable-line
        }
        
        function handleSuccess() {
            this.lastConnectedDevice = this.activeDevice ? this.activeDevice.name : '';
            callback();
        }
        
        function handleError(error) {
            this.lastConnectedDevice = '';
            let msg = '';
            pgUI.showBusy(false);
            if (typeof (error) === 'object') {
                if ('error' in error && 'message' in error) {
                    msg = 'Error on ' + error.error + ': ' + error.message;
                } else if ('errorMessage' in error) {
                    msg = error.errorMessage;
                } else {
                    msg = error.toString();
                }
            } else {
                msg = error;
            }
            if (msg.indexOf('isconnected') !== -1) {
                this.disconnect();
                pgUI.showAlert('Bluetooth Device:', msg);
            }
            pgDebug.showError(msg);
        }
    }
    disconnect(callback) {
        callback = (typeof (callback) !== 'undefined') ? callback : function() {/**/
        };
        if (this.meter) {
            this.meter.disconnect(cb.bind(this));
        } else {
            cb.call(this);
        }
        
        function cb() {
            // cache signals and data in case the disconnection was accidental
            this.signals = this.meter.getSignals();
            this.data = this.meter.getData();
            this.meter = null;
            callback();
        }
    }
    start(restart) {
        //this.reconnect(btCB.bind(this));
        if (this.meter) {
            this.meter.start(restart);
        }
    }
    async stop() {
        if (this.meter) {
            await this.meter.stop();
        }
        return Promise.resolve(1);
    }
}

export const pgBluetooth = new BluetoothDevice();
