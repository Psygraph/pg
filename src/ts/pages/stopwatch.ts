import {ButtonPage, Page} from './page';
import {pg, E_DATA, E_TYPE} from '../pg';
import {pgUtil} from '../util';
import {pgUI} from '../ui';
import {Ticker} from '../ticker';
import {GraphComponent} from '../graphComponent';


export class Stopwatch extends ButtonPage {
    setTimeCB = null;
    clock = null;
    graph = null;
    signalStarted = {};
    graphInterval = null;
    pgDevices;
    
    constructor(opts) {
        super('stopwatch', opts);
        this.clock = null;
        this.graph = null;
        this.signalStarted = {};
        this.pgDevices = opts.pgDevices;
    }
    init(opts) {
        if(!this.initialized) {
            this.clock = new Ticker(this.watchCallback.bind(this), this.pageData.updateInterval);
        }
        super.init(opts);
        this.graph = new GraphComponent(opts.elementID, 'lines');
        this.setTimeCB = opts.setTimeCB;
    }
    // settings / data
    getPageData() {
        var data = super.getPageData();
        //if (!('updateInterval' in data)) {
            data.updateInterval = 91;
        //}
        for(let cat of pg.categories) {
            if (!('signals' in data[cat])) {
                data[cat].signals = [];
            }
            if (!('hasBluetooth' in data[cat])) {
                data[cat].hasBluetooth = false;
            }
            if (!('showGraph' in data[cat])) {
                data[cat].showGraph = true;
            }
            if (!('startTime' in data[cat])) {
                data[cat].startTime = 0;
            }
        }
        return data;
    }
    getAllSignalsNV() {
        return this.pgDevices.getAllSignalsNV();
    }
    getAllSignals(cat=pgUI.category()) {
        var signals = this.pageData[cat].signals.slice(0);
        if (pgUtil.isWebBrowser) {
            signals = removeElem(signals, 'acceleration');
            signals = removeElem(signals, 'orientation');
        }
        return signals;
        function removeElem(array, elem) {
            var index = array.indexOf(elem);
            if (index !== -1) {
                array.splice(index, 1);
            }
            return array;
        }
    }
    // primary actions
    updateView(show) {
        let cat=pgUI.category();
        super.updateView(show);
        if (show) { // no running in the background.
            this.createGraph(this.pageData[cat].showGraph);
            if (this.isRunning()) {
                this.startGraph(true);
            }
            this.refreshTimer();
        } else {
            this.stopGraph();
            this.clock.stop();
        }
    }
    start(restart = false, time = pgUtil.getCurrentTime(), cat=pgUI.category()) {
        super.start(restart, time);
        if (!restart) {
            this.pageData[cat].startTime = time;
        }
        this.refreshTimer();
        // start the graph and bluetooth device.
        //var signals = this.getAllSignals(data);
        this.pgDevices.start(restart, this.pageData[cat].signals);
        this.startGraph(restart);
    }
    async stop(time = pgUtil.getCurrentTime(), cat=pgUI.category()) {
        super.stop(time);
        this.clock.stop();
        this.stopGraph();
        var e = {
            page: 'stopwatch',
            category: pgUI.category(),
            type: 'interval',
            start: this.pageData[cat].startTime,
            duration: time - this.pageData[cat].startTime,
            data: {}
        };
        this.pageData[cat].startTime = 0;
        await this.pgDevices.stop();
        if (this.hasDevice()) {
            var d = this.pgDevices.getData();
            for (var field in d) {
                if (d[field].length) {
                    e.data[field] = d[field];
                }
            }
        }
        pg.addNewEvents(e, true);
        this.refreshTimer();
    }
    reset(time = pgUtil.getCurrentTime()) {
        if (this.isRunning()) {
            this.stop(time - 1);
            super.reset(time);
            createResetEvent.call(this, time);
            this.start(false, time + 1);
        } else {
            super.reset(time);
            createResetEvent.call(this, time);
            this.watchCallback(this.clock.getElapsed());
        }
        return false;
        
        function createResetEvent(time) {
            var e = {page: 'stopwatch', category: pgUI.category(), type: 'reset', start: time};
            pg.addNewEvents(e, true);
            this.clock.reset(time);
            this.graph.clearPoints();
        }
    }
    
    // Misc utilities
    hasDevice() {
        var tf = this.hasSignal('random');
        tf = tf || this.hasSignal('acceleration');
        tf = tf || this.hasSignal('orientation');
        tf = tf || this.hasSignal('location');
        tf = tf || this.hasSignal('bluetooth');
        return tf;
    }
    
    // GUI methods
    watchCallback(ms) {
        this.setTimeCB(pgUtil.getStringFromMS(ms, true));
    }
    getElapsedStopwatch(cat=pgUI.category()) {
        var e = pg.getEventsInPage('stopwatch', cat);
        var startTime = this.pageData[cat].startTime;
        var duration = 0.0;
        var running = startTime !== 0;
        var ids = [];
        var resetTime = 0.0;
        var eventStart = 0.0;
        var eventEnd = 0.0;
        var eventDur = 0.0;
        for (var i = 0; i < e.length; i++) {
            var event = pg.parseEvent(e[i]);
            if (event.type === 'interval') {
                eventStart = event.start;
                eventEnd = event.start + event.duration;
                eventDur = event.duration;
                if (resetTime) {
                    // Add a portion of the event duration.
                    // This will never occur, since reset currently entails stopping and starting.
                    if (eventEnd > resetTime) {
                        duration += (eventEnd - resetTime);
                    }
                    break;
                } else {
                    duration += eventDur;
                    ids.push(event.id);
                }
            } else if (event.type === 'reset') {
                if (resetTime) {
                    continue;
                }
                resetTime = event.start;
            } else {
                console.log('Error: unknown event type: ' + event.type);
            }
        }
        // If we are running, the client should use the start time.
        // otherwise, the client should use the duration.
        return {startTime: startTime, duration: duration, running: running, eventIDs: ids};
    }
    refreshTimer() {
        var e = this.getElapsedStopwatch();
        if (this.isRunning()) {
            this.clock.start(e.startTime, e.duration);
        } else {
            this.clock.stop(e.duration);
        }
    }
    
    // Graph methods
    createGraph(show) {
        var signals = [];
        if (show) {
            signals = this.getAllSignals();
        }
        this.graph.create(signals);
        if (show) {
            //this.graph.clearPoints();
            // graph the most recent event
            var e = this.getElapsedStopwatch();
            for (var i = 0; i < e.eventIDs.length; i++) {
                var id = e.eventIDs[i];
                //if (pg.isEventSelected(id)) {
                    var event = pg.getEventFromID(id);
                    var d = event[E_DATA];
                    this.addPoints(d);
                    if(event[E_TYPE]=="reset") {
                        break;
                    }
                //}
            }
            this.graph.endAddPoints(60 * 1000);
            this.signalStarted = {};
            for (var s in signals) {
                this.signalStarted[signals[s]] = false;
            }
        }
    }
    startGraph(restart) {
        if (!this.graph) {
            return;
        }
        if (this.hasDevice()) {
            this.graphInterval = setInterval(this.updateGraph.bind(this), 1000);
        }
    }
    stopGraph() {
        if (!this.graph) {
            return;
        }
        clearInterval(this.graphInterval);
        this.graphInterval = 0;
        //this.updateGraph();
    }
    updateGraph() {
        if (!this.graph) {
            return;
        }
        
        // add device datapoints to the dataset
        if (this.hasDevice()) {
            var data = this.pgDevices.getData();
            this.addPoints(data);
        }
        this.graph.endAddPoints(60 * 1000); // display a maximum of one minute of data
    }
    addPoints(d, cat=pgUI.category()) {
        for (var field in d) {
            if (this.pageData[cat].signals.indexOf(field) >= 0 && d[field].length) {
                var data = d[field];
                var pts = {x: [], y: []};
                var lastTime = this.graph.lastGroupTime(field);
                lastTime = lastTime ? lastTime.getTime() : 0;
                var index = 0;
                if(data.length) {
                    for (index = data.length - 1; index >= 0; index--) {
                        if (data[index][0] <= lastTime || index==0) {
                            break;
                        }
                    }
                }
                for (index; index>=0 && index < data.length; index++) {
                    pts.x.push(new Date(data[index][0]));
                    if (field === "acceleration") {
                        pts.y.push(pgUtil.norm(data[index].slice(1)));
                    } else {
                        pts.y.push(data[index][1]);
                    }
                }
                this.graph.addPoints(field, pts, !this.signalStarted[field]);
                this.signalStarted[field] = true;
            }
        }
    }
}
