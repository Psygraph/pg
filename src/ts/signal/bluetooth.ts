import {pgUtil, pgDebug} from '../util';
import {pgUI} from '../ui';
import {Meter} from './meter';
import {PGMeter, GenericMeter} from './btmeter';


class BluetoothDevice extends Meter {
    foundDevices   = [];
    meter          = null;
    scanning       = false;
    permission     = false;
    lastConnectedDevice = '';
    deviceName     = '';
    connectCB      = (connect) => {};
    
    constructor() {
        super('bluetooth');
        this.foundDevices = [];
        this.meter = null;
        this.scanning = false;
        this.lastConnectedDevice = '';
    }
    getConnectedDevicesNV() {
        if(this.deviceName === '') {
            return [];
        }
        else {
            return [{name: this.deviceName, value: this.deviceName}];
        }
    }
    getAllDevicesNV() {
        let devs = [];
        for(let dev of this.foundDevices) {
            if (typeof (dev.name) !== 'undefined') {
                devs.push({name: dev.name, value: dev.name});
            }
        }
        return devs;
    }
    getAllSignalsNV() {
        if (this.meter) {
            return this.meter.getAllSignalsNV();
        }
        else {
            return [];
            //return [{name: "Bluetooth", value:"bluetooth"}];
        }
    }
    init() {
        if (this.meter) {
            // this.meter.init();
        }
    }
    update(show, data) {
        try {
            if (show) {
                if(pgUtil.isEmpty(data)) {
                    throw new Error("empty struct");
                }
                this.lastConnectedDevice = data.lastConnectedDevice;
                this.permission = data.permission;
            } else {
                data.lastConnectedDevice = this.lastConnectedDevice;
                data.permission = this.permission;
            }
        } catch (err) {
            pgDebug.showWarn(err.toString());
            data = {lastConnectedDevice: '', permission: false};
        }
        return data;
    }
    async checkPermission() {
        return new Promise(foo);
        function foo(resolve, reject) {
            pgUtil.ble.isEnabled(yes, no);
            function yes() {
                resolve.bind(this, 1);
            }
            function no() {
                reject.bind(this, 'not enabled');
            }
        }
    }
    async doPermissions(callback = (success) => {} ) {
        if(this.permission) {
            // library initialization
            //await this.checkPermission();
            callback(true);
        }
        else {
            const opts = {
                title: 'Access Bluetooth devices?', true: 'OK', false: 'Cancel'
            };
            const content = `<p class="inset">In order to collect data when you have requested it,
                    please grant the app permission to use data from bluetooth accessories.</p>`;
            pgUI.showDialog(opts, content, cb.bind(this));
        }
        async function cb(success, data) {
            if (success) {
                this.permission = true;
                //await this.checkPermission();
            }
            callback(this.permission);
        }
    }
    settingsDialog(callback = (success) => {}) {
        if (this.meter) {
            this.meter.settingsDialog(callback);
        }
        else {
            //this.openDeviceDialog(callback);
        }
    }
    async bluetoothConnect(name, callback = (success)=>{}) {
        this.deviceName = name;
        this.connect(callback);
    }
    async bluetoothDisconnect(callback = (success)=>{}) {
        this.disconnect(callback);
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
        if (pgUtil.isWebBrowser) {
            callback(false);
            return;
        }
        if(this.scanning) {
            // in case the last scan was not successful, stop and start scanning
            this.stopScan(this.startScan.bind(this, callback));
            return;
        }
        this.scanning = true;
        pgDebug.showLog('Starting bluetooth scan...');
        pgUtil.ble.startScan([], startScanSuccess.bind(this), startScanFailure.bind(this));
        
        function startScanSuccess(result) {
            if (!this.foundDevices.some( (device) => {return device.id === result.id;} ) ) {
                if (typeof (result.name) !== 'undefined') {
                    pgDebug.showLog('FOUND DEVICE:' + result.name);
                }
                this.foundDevices.push(result);
                callback(true);
                this.connectCB(true);
            }
        }
        function startScanFailure(result) {
            this.scanning = false;
        }
    }
    stopScan(callback = (success)=>{}) {
        if (pgUtil.isWebBrowser) {
            callback(false);
            return;
        }
        if (this.scanning) {
            this.scanning = false;
            pgUtil.ble.stopScan(resolve.bind(this), reject.bind(this));
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
            this.deviceName = this.lastConnectedDevice;
            this.connect(cb.bind(this));
        }
        else {
            callback(true);
        }
        
        function cb(tf) {
            if (!tf) {
                pgUI.showAlert("warning",'Could not connect to \'' + this.lastConnectedDevice + '\', reconnect in the preferences.');
            }
            callback(tf);
        }
    }
    connect(callback = (success) => {}) {
        if (this.deviceName === '' || pgUtil.isWebBrowser) {
            callback(false);
            return;
        }
        this.stopScan();
        const btDevs = this.foundDevices;
        let address = 'none';
        for (let i = 0; i < btDevs.length; i++) {
            if (btDevs[i].name === this.deviceName) {
                address = btDevs[i].id;
            }
        }
        pgDebug.showLog('Connecting to device: ' + address + '...');
        pgUI.showBusy(true);
        pgUtil.ble.connect(address, connectSuccess.bind(this), handleError.bind(this));
        
        function connectSuccess(result) {
            pgUI.showBusy(false);
            pgDebug.showLog('Connect success');
            pgUI.showAlert('Device Connected', 'Connected to device: ' + this.deviceName);
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
            this.meter.connect(handleSuccess.bind(this));
        }
        
        function handleSuccess() {
            this.lastConnectedDevice = this.deviceName;
            callback(true);
            this.connectCB(true);
        }
        
        function handleError(error) {
            this.deviceName = '';
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
    disconnect(callback = (success)=>{}) {
        if (this.meter) {
            this.meter.disconnect(cb.bind(this));
        } else {
            cb.call(this);
        }
        function cb() {
            this.deviceName    = '';
            this.signals = [];
            this.data    = {};
            this.meter   = null;
            callback(true);
            this.connectCB(false);
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
