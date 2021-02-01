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
        this.pgRandom = pgRandom;
        this.pgAcceleration = pgAcceleration;
        this.pgOrientation = pgOrientation;
        this.pgLocation = pgLocation;
        this.pgBluetooth = pgBluetooth;
    }
    getAllDevicesNV() {
        let allDevices = [
            {name: "Acceleration", value: "acceleration"},
            {name: "Orientation", value:"orientation"},
            {name: "Location", value:"location"},
        ];
        if (pgDebug.debug) {
            allDevices.push({name: "Random", value: "random"});
            allDevices.push({name: "Bluetooth", value:"bluetooth"});
        }
        return allDevices;
    }
    getAllDeviceNames() {
        let allNames = this.getAllDevicesNV();
        return allNames.map(a => a.name);
    }
    getAllSignalsNV() {
        let allSignals = [];
        allSignals = allSignals.concat(this.pgAcceleration.getAllSignalsNV());
        allSignals = allSignals.concat(this.pgOrientation.getAllSignalsNV());
        allSignals = allSignals.concat(this.pgLocation.getAllSignalsNV());
        if (pgDebug.debug) {
            allSignals = allSignals.concat(this.pgRandom.getAllSignalsNV());
            allSignals = allSignals.concat(this.pgBluetooth.getAllSignalsNV());
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
        } else if (signal == 'bluetooth') {
            this.pgBluetooth.settingsDialog(callback);
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
    hasSignal(signal) {
        return this.signals.indexOf(signal) >= 0;
    }
    start(restart, signals) {
        this.signals = signals;
        this.meters = [];
        if (this.hasSignal('random')) {
            this.meters.push(this.pgRandom);
        }
        if (this.hasSignal('acceleration')) {
            this.meters.push(this.pgAcceleration);
        }
        if (this.hasSignal('orientation')) {
            this.meters.push(this.pgOrientation);
        }
        if (this.hasSignal('location')) {
            this.meters.push(this.pgLocation);
        }
        if (this.hasSignal('bluetooth')) {
            this.meters.push(this.pgBluetooth);
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
