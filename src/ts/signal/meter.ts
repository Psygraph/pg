import {pgDebug} from '../util';
import {pgUI} from '../ui';
import {pgFilter} from '../filter';


export class Meter {
    name = '';
    filterType = 'none';
    allFilterTypes = ['FIR', 'gamma', 'none'];
    filter = new pgFilter();
    running = false;
    data: any = {};
    signals = [];
    allSignals = [];
    
    constructor(name) {
        this.name = name;
        this.filterType = 'none';
        this.allFilterTypes = ['FIR', 'gamma', 'none'];
        this.filter = new pgFilter();
        this.running = false;
        this.data = {};
        this.signals = [];
        this.allSignals = [];
        pgUI.addStateObserver(this);
    }

    createData(types) {
        this.data = {};
        for (const i in types) {
            const type = types[i];
            this.data[type] = [];
            if (this.signals.indexOf(type) === -1) {
                this.signals.push(type);
            }
        }
    }
    addData(type, data) {
        this.data[type].push(data);
    }
    pushData(data) {
        this.data[this.signals[0]].push(data);
    }
    getSignals() {
        return this.signals;
    }
    getAllSignals() {
        return this.allSignals;
    }
    getData() {
        return this.data;
    }
    setData(data) {
        this.data = data;
    }
    
    // update page, accel and location state
    updateState(tf) {
        if (tf) {
            this.update(true, pgUI.state[this.name]);
        } else {
            pgUI.state[this.name] = this.update(false, pgUI.state[this.name]);
        }
    }
    update(show, data) {
        try {
            if (show) {
                this.running = data.running;
                this.filter = data.filter;
                this.data = data.data;
                this.signals = data.signals;
            } else {
                data.running = this.running;
                data.filter = this.filter;
                data.data = this.data;
                data.signals = this.signals;
            }
        } catch (err) {
            pgDebug.showWarn(err.toString());
            data = {
                running: false, filter: new pgFilter(), data: {}, signals: []
            };
        }
        return data;
    }
    settingsDialogOpts(title=this.name, gather= ()=>{}) {
        return {title: title, true: 'OK', false: 'Cancel', gather: gather};
    }
    settingsDialog(opts={title:'', true: 'OK', false: 'Cancel', gather: ()=>{}},
                   content="", callback=(success, data)=>{}) {
        function setMeter(success, data) {
            if (success) {
                //this.filterType = $("#meter_filter").val();
                //if(this.filterType==="FIR") {
                //    this.filter = new FIRFilter();
                //}
                //else if(this.filterType==="gamma") {
                //    this.filter = new GammaFilter();
                //}
                //else {
                this.filter = new pgFilter();
                //}
            }
            callback(success, data);
        }
        //optionText += pgUI.printSelect("meter_filter", "Filter type:",  this.allFilterTypes, this.filterType)
        pgUI.showDialog(opts, content, setMeter.bind(this));
    }
    connect(callback) {
        callback(true);
    }
    disconnect(callback) {
        callback(true);
    }
    
    start(restart = false, signals) {
        restart = restart || false;
    }
    async stop() { //
        return Promise.resolve(1);
    }
    
    read(type, bytes) { //
    }
    readSuccess(obj) { //
    }
    readError(obj) {
        pgDebug.showWarn('Bluetooth read Error : ' + JSON.stringify(obj));
    }
    write(bytes) { //
    }
    writeSuccess(msg) { //
    }
    writeError(error) {
        let msg = '';
        if (typeof (error) === 'object') {
            pgDebug.showLog('Error is object');
            if ('error' in error && 'message' in error) {
                msg = 'Error on ' + error.error + ': ' + error.message;
            } else if ('errorMessage' in error) {
                msg = error.errorMessage;
            } else {
                msg = error.toString();
            }
        } else {
            pgDebug.showLog('Error is string');
            msg = error;
        }
        // xxx
        //if(msg.indexOf("isconnected") !== -1) {
        //    this.disconnect();
        //}
        pgDebug.showError(msg);
    }
    decodeUint32(bytes) {
        return bytes[0] + bytes[1] * 256 + bytes[2] * 256 * 256 + bytes[3] * 256 * 256 * 256;
    }
    decodeSingle(bytes) {
        const farr = new Float32Array(bytes.buffer);
        return farr[0];
    }
    decodeUint16(bytes) {
        return bytes[0] + bytes[1] * 256;
    }
    decodeUint8(bytes) {
        return bytes[0];
    }
    encodeUint32(num) {
        const bytes = new Uint8Array(4);
        bytes[0] = (num & 0x000000FF);
        bytes[1] = (num & 0x0000FF00) >> 8;
        bytes[2] = (num & 0x00FF0000) >> 16;
        bytes[3] = (num & 0xFF000000) >> 24;
        return bytes;
    }
    encodeUint16(num) {
        const bytes = new Uint8Array(2);
        bytes[0] = num & 0x00FF;
        bytes[1] = (num & 0xFF00) >> 8;
        return bytes;
    }
    encodeUint8(num) {
        const bytes = new Uint8Array(1);
        bytes[0] = num & 0xFF;
        return bytes;
    }
}
