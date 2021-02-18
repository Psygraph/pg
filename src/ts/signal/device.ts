import {pgUtil, pgDebug} from '../util';
import {Meter} from './meter';
import * as $ from 'jquery';

// the deviceometer is a container for internal meters.
// currently: accel, orient, location, random

class PGDevices extends Meter {
    meters = [];

    pgRandom;
    pgAcceleration;
    pgOrientation;
    pgLocation;
    pgBluetooth;
    
    constructor() {
        super('device');
    }
    
    init(pgRandom, pgAcceleration, pgOrientation, pgLocation, pgBluetooth) {
        this.pgAcceleration = pgAcceleration;
        this.pgOrientation = pgOrientation;
        this.pgLocation = pgLocation;
        this.pgBluetooth = pgBluetooth;
        this.pgRandom = pgRandom;
    }
    getAllDevicesNV() {
        let allDevices = [
            {name: "Location", value:"location"},
        ];
        if(!pgUtil.isWebBrowser) {
            allDevices.push({name: "Acceleration", value: "acceleration"});
            allDevices.push({name: "Orientation", value:"orientation"});
        }
        const btDevs = this.pgBluetooth.getConnectedDevicesNV();
        for(let i=0; i<btDevs.length; i++) {
            allDevices.push(btDevs[i]);
        }
        if (pgDebug.debug) {
            allDevices.push({name: "Random", value: "random"});
        }
        return allDevices;
    }
    getAllBTDevicesNV() {
        return this.pgBluetooth.getAllDevicesNV();
    }
    getConnectedBTDevicesNV() {
        return this.pgBluetooth.getConnectedDevicesNV();
    }
    getAllDeviceNames() {
        let allNames = this.getAllDevicesNV();
        return allNames.map(a => a.name);
    }
    getAllSignalsNV() {
        let allSignals = this.pgLocation.getAllSignalsNV();
        if (!pgUtil.isWebBrowser) {
            allSignals = allSignals.concat(this.pgAcceleration.getAllSignalsNV());
            allSignals = allSignals.concat(this.pgOrientation.getAllSignalsNV());
            allSignals = allSignals.concat(this.pgBluetooth.getAllSignalsNV());
        }
        if (pgDebug.debug) {
            allSignals = allSignals.concat(this.pgRandom.getAllSignalsNV());
        }
        return allSignals;
    }
    update(show, data) {
        try {
            if (show) {
            }
        } catch (err) {
            pgDebug.showWarn(err.toString());
            data = {};
        }
        return data;
    }
    deviceSettingsDialog(signal, callback = (success) => {}) {
        if (signal == 'random') {
            this.pgRandom.settingsDialog(callback);
        } else if (signal == 'acceleration') {
            this.pgAcceleration.settingsDialog(callback);
        } else if (signal == 'orientation') {
            this.pgOrientation.settingsDialog(callback);
        } else if (signal == 'location') {
            this.pgLocation.settingsDialog(callback);
        } else {
            this.pgBluetooth.settingsDialog(callback);
        }
    }
    hasBluetooth() {
        if(pgUtil.isWebBrowser)
            return false;
        return this.pgBluetooth.permission;
    }
    async openDeviceDialog() {
        return new Promise(openDev.bind(this));
        function openDev(resolve, reject) {
            this.pgBluetooth.openDeviceDialog(callback);
            function callback(success) {
                resolve(success);
            }
        }
    }
    getSignals() {
        const signals = [];
        for (let i = 0; i < this.meters.length; i++) {
            const s = this.meters[i].getSignals();
            for (const f in s) {
                signals[f] = s[f];
            }
        }
        return signals;
    }
    getData() {
        const data = {};
        for (let i = 0; i < this.meters.length; i++) {
            const d = this.meters[i].getData();
            for (const f in d) {
                data[f] = d[f];
            }
        }
        return data;
    }
    addMeterForSignal(signal) {
        if (this.pgRandom.getAllSignals().indexOf(signal) >= 0) {
            this.meters.push(this.pgRandom);
        }
        else if (this.pgAcceleration.getAllSignals().indexOf(signal) >= 0) {
            this.meters.push(this.pgAcceleration);
        }
        else if (this.pgOrientation.getAllSignals().indexOf(signal) >= 0) {
            this.meters.push(this.pgOrientation);
        }
        else if (this.pgLocation.getAllSignals().indexOf(signal) >= 0) {
            this.meters.push(this.pgLocation);
        }
        else if (this.pgBluetooth.getAllSignals().indexOf(signal) >= 0) {
            this.meters.push(this.pgBluetooth);
        }
        else {
            pgDebug.showWarn("Unknown signal: " + signal);
        }
    }
    start(restart, signals) {
        this.signals = signals;
        this.meters = [];
        for (let sig of this.signals) {
            this.addMeterForSignal(sig);
        }
        for (let i = 0; i < this.meters.length; i++) {
            this.meters[i].start(restart);
        }
    }
    async stop() {
        for (let i = 0; i < this.meters.length; i++) {
            await this.meters[i].stop();
        }
        return Promise.resolve(1);
    }
}

export const pgDevices = new PGDevices();
