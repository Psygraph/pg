import {Page} from './page';
import {pg} from '../pg';
import {pgUtil, pgDebug} from '../util';
import {pgUI} from '../ui';
import * as $ from 'jquery';
import {pgRandom} from '../signal/random';
import {pgAcceleration} from '../signal/accel';
import {pgOrientation} from '../signal/orient';
import {pgLocation} from '../signal/location';

export class Preferences extends Page {
    pgDevices;
    
    constructor(opts) {
        super('preferences', opts);
        this.pgDevices = opts.pgDevices;
    }
    init(opts) {
        super.init(opts);
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
    updateView(show) {
        super.updateView(show);
        if (show) {
            if(pgDebug.debug) {
                pgLocation.getCurrentLocation();
                this.pgDevices.pgBluetooth.startScan();
            }
        } else {
            if(pgDebug.debug) {
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
    deviceSettings(signal, callback) {
        this.pgDevices.deviceSettingsDialog(signal, callback);
    }
}

