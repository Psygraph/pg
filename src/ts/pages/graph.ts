import {Page} from './page';
import {pg} from '../pg';
import {pgUtil, pgDebug} from '../util';
import {pgUI} from '../ui';
import {GraphComponent} from '../graphComponent';
import * as $ from 'jquery';

export class Graph extends Page {
    graph;
    pgDevices;
    
    constructor(opts) {
        super('graph', opts);
        this.graph = null;
        this.pgDevices = opts.pgDevices;
    }
    init(opts, cat = pgUI.category()) {
        super.init(opts);
        this.graph = new GraphComponent(opts.elementID, 'lines');
        this.graph.create(this.pageData[cat].signals);
    }
    getPageData() {
        var data = super.getPageData();
        for (let cat of pg.categories) {
            if (!('signals' in data[cat])) {
                data[cat].signals = ['acceleration'];
            }
            if (!('interval' in data[cat])) {
                data[cat].interval = 100;
            }
        }
        return data;
    }
    getAllSignalsNV() {
        const allSignals = this.pgDevices.getAllDevicesNV();
        if(pgDebug.debug) {
            allSignals.push({name: 'Temperature', value: 'temperature'});
            allSignals.push({name: 'Heart Rate', value: 'heartRate'});
        }
        return allSignals;
    }
    getAllIntervalsNV() {
        const allIntervals = [{name: 'none', value: 1}, {name: '25 milliseconds', value: 25},
            {name: '100 milliseconds',value: 100},
            {name: '1 second', value: 1000}, {name: '1 minute', value: 60000},];
        return allIntervals;
    }
    
    updateView(show) {
        super.updateView(show);
        if (show) {
            this.updateGraph();
        } else {
        }
    }
    resize(size = {height: 0, width: 0}) {
        if (super.needsResize(size)) {
            $('#graph_graphContainer').height(size.height);
            $('#graph_graphContainer').width(size.width);
            if (this.graph) {
                this.graph.redraw();
            }
        }
    }
    
    updateGraph(cat = pgUI.category()) {
        //var interval = this.graph.computeNumericInterval(data.interval);
        this.graph.clearPoints();
        
        for (var sig = 0; sig < this.pageData[cat].signals.length; sig++) {
            var signal = this.pageData[cat].signals[sig];
            // Acceleration
            if (signal === 'acceleration') {
                var events = pg.getSelectedEvents(pgUI.category());
                for (var i = 0; i < events.length; i++) {
                    var pts = {x: [], y: []};
                    var e = pg.parseEvent(events[i]);
                    if (e && e.type === 'interval') {
                        if (typeof (e.data.acceleration) !== 'undefined') {
                            var points = e.data.acceleration;
                            for (var j = 0; j < points.length; j++) {
                                //var norm = points[j][1]*points[j][1];
                                //norm    += points[j][2]*points[j][2];
                                //norm    += points[j][3]*points[j][3];
                                //norm = Math.sqrt(norm);
                                var norm = pgUtil.norm(points[j].slice(1));
                                pts.x.push(new Date(points[j][0]));
                                pts.y.push(norm);
                            }
                        }
                    }
                    if (pts.x.length) {
                        this.graph.addPoints(signal, pts);
                    }
                }
            } else if (signal === 'orientation' || signal === 'temperature' || signal === 'heartRate' || signal === 'analog1' || signal === 'analog2' || signal === 'random') {
                //signals = ["bluetooth","orientation","temperature","heartRate","analog1","analog2","voltage","resistance"];
                var events = pg.getSelectedEvents(pgUI.category());
                for (var i = 0; i < events.length; i++) {
                    var e = pg.parseEvent(events[i]);
                    if (e && e.type === 'interval') {
                        if (typeof (e.data[signal]) !== 'undefined') {
                            var pts = {x: [], y: []};
                            var points = e.data[signal];
                            for (var j = 0; j < points.length; j++) {
                                //var val = pgUtil.norm(points[j].slice(1));
                                var val = points[j][1];
                                pts.x.push(new Date(points[j][0]));
                                pts.y.push(val);
                            }
                            if (pts.x.length) {
                                this.graph.addPoints(signal, pts);
                            }
                        }
                    }
                }
            } else if (signal === 'all') {
                //signals = ["bluetooth","orientation","temperature","heartRate","analog1","analog2","voltage","resistance"];
                var events = pg.getSelectedEvents(pgUI.category());
                for (var i = 0; i < events.length; i++) {
                    var e = pg.parseEvent(events[i]);
                    if (e && e.type === 'interval') {
                        for (signal in e.data) {
                            if (signal === 'voltage' || signal === 'resistance' || signal === 'current' || signal === 'generic') {
                                var pts = {x: [], y: []};
                                var points = e.data[signal];
                                for (var j = 0; j < points.length; j++) {
                                    //var val = pgUtil.norm(points[j].slice(1));
                                    var val = points[j][1];
                                    pts.x.push(new Date(points[j][0]));
                                    pts.y.push(val);
                                }
                                if (pts.x.length) {
                                    this.graph.addPoints(signal, pts);
                                }
                            }
                        }
                    }
                }
            } else {
                pgDebug.showError('Unknown signal specified: ' + signal);
            }
        }
        this.graph.endAddPoints();
    }
}
