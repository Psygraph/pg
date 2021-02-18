import {Page} from './page';
import {pg} from '../pg';
import {pgUtil, pgDebug} from '../util';
import {pgUI} from '../ui';

export class Preferences extends Page {
    pgDevices;
    
    constructor(opts) {
        super('preferences', opts);
        this.pgDevices = opts.pgDevices;
    }
    init(opts) {
        super.init(opts);
        this.pgDevices.pgBluetooth.connectCB = opts.connectCB;
    }
    getPageData() {
        var data = super.getPageData();
        if (!('debug' in data)) {
            data.debug = false;
        }
        if (!('wifiOnly' in data)) {
            data.wifiOnly = true;
        }
        if (!('showFooter' in data)) {
            data.showFooter = true;
        }
        if (!('darkMode' in data)) {
            data.darkMode = false;
        }
        if (!('email' in data)) {
            data.email = 'foo@bar.com';
        }
        return data;
    }
    getAllDevicesNV() {
        return this.pgDevices.getAllDevicesNV();
    }
    getAllBTDevicesNV() {
        return this.pgDevices.getAllBTDevicesNV();
    }
    getConnectedBTDevicesNV() {
        return this.pgDevices.getConnectedBTDevicesNV();
    }
    updateView(show) {
        super.updateView(show);
        if (show) {
        } else {
            if(this.pgDevices.hasBluetooth()) {
                this.pgDevices.pgBluetooth.stopScan();
            }
            pgDebug.debug = this.pageData.debug;
        }
    }
    updateSettings(doClose) {
        if (doClose !== 'cancel') {
            const pmtime = pgUtil.getCurrentTime();
            pg.setPageData(pmtime, this.pageData, 'preferences');
        }
    }
    async bluetoothConnect(name) {
        await this.pgDevices.pgBluetooth.bluetoothConnect(name);
    }
    async bluetoothDisconnect() {
        await this.pgDevices.pgBluetooth.bluetoothDisconnect();
    }
    async deviceSettings(signal, callback = (success) => {}) {
        this.pgDevices.deviceSettingsDialog(signal, callback);
    }
    async doPermissions(callback = (success)=>{}) {
        await this.pgDevices.pgBluetooth.doPermissions(cb.bind(this));
        function cb(success) {
            if(success) {
                this.pgDevices.pgBluetooth.startScan();
            }
            callback(success);
        }
    }
}
