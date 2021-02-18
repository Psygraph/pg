
import {pgDebug}   from './util';
import * as $ from 'jquery';

import * as Plotly from './3p/plotly.min.js';

export class GraphComponent {
    //elementID = null;
    element   = null;
    style     = null;
    options   = {
        displayModeBar: false,
        scrollZoom: true
    };
    barmode = 'group'; // group, stack, overlay;
    padding   = 0;
    interval  = 24*60*60*1000;
    minMS = 50; // minimum number of milliseconds between samples.
    maxdisplayed = 10000;
    groupID = [
        'none',
        'home',
        'stopwatch',
        'timer',
        'timerMindful',
        'counter',
        'counterCorrect',
        'note',
        'acceleration',
        'orientation',
        'heartRate',
        'temperature',
        'analog1',
        'analog2',
        'random',
        'resistance',
        'voltage'];
    numGroups = 0;
    groupNames = []; // the names of the groups
    groups  = []; // the initial groups, with no data
    dirty = [];
    startTimes = [];
    endTimes = [];
    layout = null;
    barLayout = {
        //title: 'Your numbers:',
        barmode: this.barmode,
        //bargap: 0,
        showlegend: true,
        legend: {
            x: 0.6,
            y: 1.1,
            bgcolor:     'rgba(255,255,255,0.4)',
            bordercolor: '#FFFFFF',
            borderwidth: 0
        },
        width: Math.ceil(this.interval / this.numGroups),
        margin: {pad:2, t:4, b:80, l:60, r:4, autoexpand:true},
        font:  {family:'Arial',
            size:  16,
            color: '#000000'},
        paper_bgcolor:'rgba(0,0,0,0)',
        plot_bgcolor:'rgba(0,0,0,0)',
        xaxis: {
            showgrid: true,
        },
        yaxis: {
            tickformat: '2.3f',
            exponentformat: 'e'
        }
    };
    graphLayout = {
        //title: 'Your numbers:',
        xaxis: {
            //title: 'Time',
            showgrid: false,
            zeroline: false
        },
        yaxis: {
            tickformat: '.3f',
            exponentformat: 'e',
            showline: false
        },
        showlegend: true,
        legend: {
            x: 0.6,
            y: 1.1
        },
        //autosize: false,
        margin: {pad:2, t:4, b:80, l:60, r:4, autoexpand:true},
        font:  { family:'Arial',
            size:  16,
            color: '#000000'},
        paper_bgcolor:'rgba(0,0,0,0)',
        plot_bgcolor:'rgba(0,0,0,0)'
    };

    constructor(element, style) {
        //this.elementID = elementID;
        this.element   = element;
        this.style     = style;
    }

    palatte(groupName) {
        var index = this.groupID.indexOf(groupName)*2;
        var p1 = [
            'rgba(0,0,0,1.0)', '#000000',
            'rgba(57,115,185,1.0)', '#3873b9',
            'rgba(204,37,41,1.0)', '#CC2529',
            'rgba(62,150,181,1.0)', '#3E9651',
            'rgba(218,124,48,1.0)', '#DA7C30',
            'rgba(83,81,84,1.0)', '#535154',
            'rgba(107,76,154,1.0)', '#6B4C9A',
            'rgba(146,36,40,1.0)', '#922428',
            'rgba(148,139,61,1.0)', '#948B3D',
            'rgba(84,89,95,1.0)', '#54595f',
            'rgba(55,183,167,1.0)', '#37b7a7',
            'rgba(233,229,33,1.0)', '#e9e521',
            'rgba(255,198,46,1.0)', '#ffc62e',
            'rgba(104,179,90,1.0)', '#68af5a',
            'rgba(0,86,145,1.0)', '#005691',
            'rgba(161,115,24,1.0)', '#a17318',
            'rgba(114,114,26,1.0)', '#72727e',
            'rgba(207,194,194,1.0)', '#cfc2c2',
        ];
        return p1[index];
    }
    create(groupNames, interval = this.interval) {
        this.interval = interval;
        this.groupNames = groupNames;
        this.numGroups  = this.groupNames.length;
        Plotly.purge(this.element);
        if(this.numGroups) {
            this.groups = [];
            for (let i=0; i<this.numGroups; i++) {
                this.groups[i] = this.addGroupOpts(this.groupNames[i]);
                this.dirty[i] = false;
            }
            if(this.style==="bar") {
                this.layout = this.barLayout;
            }
            else {
                this.layout = this.graphLayout;
            }
            Plotly.newPlot(this.element, this.groups, this.layout, this.options);
        }
    }
    setMinInterval(minMS) {
        this.minMS = minMS;
    }
    addGroupOpts(groupName) {
        var trace:any = {x:[], y:[]};
        //trace = typeof(trace)!=="undefined" ? trace : {x:[new Date()], y:[NaN]};
        var index = this.groupID[groupName];
        if( groupName === "home"      ||
            groupName === "stopwatch" ||
            groupName === "counter"   ||
            groupName === "counterCorrect"   ||
            groupName === "timer"     ||
            groupName === "timerMindful"     ||
            groupName === "note"
        ) {
            trace.type  = "bar";
            trace.width = Math.ceil(this.interval / this.numGroups);
            trace.marker  = {color: this.palatte(groupName)};
        }
        else {
            trace.smoothing    = 0;
            //trace.maxdisplayed = this.maxdisplayed;
            trace.type = "lines"; //'markers+lines'
            trace.type = "scatter";
            trace.line = {color: this.palatte(groupName)};
        }
        trace.hoverinfo = 'none';
        trace.name = groupName;
        return trace;
    }
    getData() {
        var data = this.element.data;
        if(typeof(data)==="undefined")
            data = this.groups;
        return data;
    }
    getGroupData(group) {
        var data = this.element.data;
        if(typeof(data)==="undefined")
            data = this.groups;
        var i = this.getGroupIndex(group);
        var gdata = {x:data[i].x, y:data[i].y};
        return gdata;
    }
    firstTime() {
        if(this.numGroups===0)
            return null;
        var firstTime = this.firstGroupTime(this.groupNames[0]);
        for (let i=1; i<this.numGroups; i++) {
            var groupTime = this.firstGroupTime(this.groupNames[i]);
            if (!firstTime || groupTime < firstTime)
                    firstTime = groupTime;
        }
        return firstTime;
    }
    lastTime() {
        if(this.numGroups===0)
            return null;
        var lastTime = this.lastGroupTime(this.groupNames[0]);
        for (let i=1; i<this.numGroups; i++) {
            var groupTime = this.lastGroupTime(this.groupNames[i]);
            if (!lastTime || groupTime > lastTime)
                lastTime = groupTime;
        }
        return lastTime;
    }
    firstGroupTime(group) {
        var firstTime = null;
        var data = this.getData();
        var i = this.getGroupIndex(group);
        if(i!==-1) {
            var x = data[i].x;
            if (x.length && !isNaN(data[i].y[0])) {
                firstTime = x[0];
            }
        }
        return firstTime;
    }
    lastGroupTime(group) {
        var lastTime = null;
        var data = this.getData();
        var i = this.getGroupIndex(group);
        if(i!==-1) {
            var x = data[i].x;
            if (x.length && !isNaN(data[i].y[0])) {
                lastTime = x[x.length - 1];
            }
        }
        return lastTime;
    }

    redraw(start, end) {
        if(!this.numGroups) {
            return;
        }
        start = (typeof(start)!=="undefined") ? start : this.firstTime();
        end   = (typeof(end)!=="undefined")   ? end   : this.lastTime();

        if(start && end) {
          let view = {
              width:  $(this.element).parent().width(),
              height: $(this.element).parent().height(),
              //type: 'date',
              range: [start.getTime() -this.padding, end.getTime() +this.padding],
            };
            Plotly.relayout(this.element, view);
        }
        else {
          let view = {
            width:  $(this.element).parent().width(),
            height: $(this.element).parent().height()
          };
          Plotly.relayout(this.element, view);
        }
        //Plotly.Plots.resize(this.element);
    }
    /*
    computeNumericInterval(word) {
        var interval = 0;
        if(word === "none")
            interval = 0;
        else if(word === "hour")
            interval = 60*60*1000;
        else if(word === "day")
            interval = 24*60*60*1000;
        else if(word === "week")
            interval = 7*24*60*60*1000;
        else if(word === "month")
            interval = 30*24*60*60*1000;
        return interval;
    }
    */
    pushPoints(group, points) {
        points = this.decimate(points);
        this.plot(group, points, false);
    }
    clearPoints() {
        this.create(this.groupNames);
    }
    getGroupIndex(group) {
        return this.groupNames.indexOf(group);
    }
    decimate(points) {
        var newPoints = [];
        if(points.length > 1000) {
            var interval = points[99][0] - points[100][0];
            if (interval < this.minMS) { // less than 50 ms period
                var lastTime = points[points.length-2][0];
                for(var i=0; i<points.length; i++) {
                    var thisTime = points[i][0];
                    if(thisTime >= lastTime+this.minMS)
                        newPoints.push(points[i]);
                }
            }
        }
        else
            newPoints = points;
        return newPoints;
    }
    addPoints(group, points, addBreak) {
        addBreak = (typeof(addBreak)!=="undefined") ? addBreak : true;
        points = this.decimate(points);
        this.plot(group, points, addBreak);
    }

    addBars(group, points, pointsStacked) {
        //this.padding = interval/2;
        var len = points.x.length;
        if(len === 0)
            return;
        this.plot(group, points);
        if(typeof(pointsStacked)!=="undefined")
            this.plot(group, pointsStacked);
    }
    changeLabels(from, to) {
        var update = {name:""};
        for(var i=0; i<from.length; i++) {
            var index = this.getGroupIndex(from[i]);
            update.name = to[i];
            Plotly.restyle(this.element, update, [index]);
        }
    }
    endAddPoints(maxWindowLen) {
        maxWindowLen = (typeof(maxWindowLen)!=="undefined") ? maxWindowLen : 0;
        var start  = this.firstTime();
        var end    = this.lastTime();
        if(start && end) {
            var endTime = end.getTime();
            var startTime = Math.max(start.getTime(),endTime-maxWindowLen);
            this.redraw(new Date(startTime), new Date(endTime));
        }
    }
    plot(group, points, addBreak=false) {
        var index = this.getGroupIndex(group);
        if(index===-1) {
            pgDebug.showError("Unknown group");
        }
        else {
            var pts = {x:[],y:[]};
            pts.x = [points.x];
            pts.y = [points.y];
            if(addBreak && this.dirty[index]) {
                pts.x[0].unshift(null);
                pts.y[0].unshift(NaN);
            }
            Plotly.extendTraces(this.element, pts, [index]);
            this.dirty[index] = true;
        }
    }
    flipPoints(pts) {
        var len = pts.x.length;
        for(var i=0; i<len/2; i++) {
            pts.x = swap(pts.x,i,len-(1+i));
            pts.y = swap(pts.y,i,len-(1+i));
        }
        return pts;

        function swap(arr,i,j) {
            var tmp = arr[i];
            arr[i] = arr[j];
            arr[j] = tmp;
            return arr;
        }
    }

    makeImage(title, callback) {
        var layout = {
            title: title,
            "titlefont": {
                "size": 16
            }
        };
        Plotly.relayout(this.element, layout);
        Plotly.toImage(this.element, {format: 'png', width: 800, height: 600}).then(callback);
        //Plotly.toImage(this.element, {format: 'png', width: 800, height: 600}).then(callback);
    }
}
