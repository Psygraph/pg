
function GraphComponent(elementID, style) {
    this.elementID = elementID;
    this.element   = $("#"+elementID)[0];
    this.style     = style;
    this.options   = this.getOptions();
    this.padding   = 0;
    this.interval  = 24*60*60*1000;

    this.minMS = 50; // minimum number of milliseconds between samples.
    this.maxdisplayed = 10000;

    this.groupID = [
        'none',
        'home',
        'stopwatch',
        'timer',
        'counter',
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
    this.numGroups = 0;
    this.groupNames = []; // the names of the groups
    this.groups  = []; // the initial groups, with no data
    this.dirty = [];
    this.startTimes = [];
    this.endTimes = [];
}

GraphComponent.prototype.constructor = GraphComponent;

GraphComponent.prototype.palatte = function(groupName) {
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
        'rgba(207,194,194,1.0)', '#cfc2c2',
        'rgba(104,179,90,1.0)', '#68af5a',
        'rgba(0,86,145,1.0)', '#005691'
    ];
    var p2 = [
        'rgba(0,0,0,1.0)', '#000000',
        'rgba(224,91,67,1.0)', '#e05b43',
        'rgba(0,42,61,1.0)', '#002a3d',
        'rgba(0,114,26,1.0)', '#00727e',
        'rgba(255,198,46,1.0)', '#ffc62e',
        'rgba(152,34,21,1.0)', '#982215',
        'rgba(161,115,24,1.0)', '#a17318',
        'rgba(233,229,33,1.0)', '#e9e521',
        'rgba(84,89,95,1.0)', '#54595f',
        'rgba(207,194,194,1.0)', '#cfc2c2',
        'rgba(244,239,239,1.0)', '#f4efef'
    ];
    return p1[index];
};

GraphComponent.prototype.create = function(groupNames, interval) {
    this.interval = interval || this.interval;
    this.groupNames = groupNames;
    this.numGroups  = this.groupNames.length;
    Plotly.purge(this.elementID);
    if(this.numGroups) {
        this.groups = [];
        for (i=0; i<this.numGroups; i++) {
            this.groups[i] = this.addGroupOpts(this.groupNames[i]);
            this.dirty[i] = false;
        }
        this.layout = this.getLayout();
        Plotly.newPlot(this.elementID, this.groups, this.layout, this.options);
    }
};
GraphComponent.prototype.setMinPeriod = function(minMS) {
    this.minMS = minMS;
};

GraphComponent.prototype.addGroupOpts = function(groupName) {
    var trace = {x:[], y:[]};
    //trace = typeof(trace)!=="undefined" ? trace : {x:[new Date()], y:[NaN]};
    var index = this.groupID[groupName];
    if( groupName === "home"      ||
        groupName === "stopwatch" ||
        groupName === "timer"     ||
        groupName === "counter"   ||
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
};

GraphComponent.prototype.getOptions = function() {
    return {
        displayModeBar: false,
        scrollZoom: true
    };
};
GraphComponent.prototype.getLayout = function(interval) {
    var layout = {};
    if(this.style==="bar") {
        layout = {
            //title: 'Your numbers:',
            barmode: 'group', // group, stack, overlay
            bargap: 0,
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
                color: '#000000'}
        };
    }
    else {
        layout = {
            //title: 'Your numbers:',
            xaxis: {
                //title: 'Time',
                showgrid: false,
                zeroline: false
            },
            yaxis: {
                //title: 'Percent',
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
                     color: '#000000'}
        };
    }
    //layout.autosize = false;
    //layout.xaxis = {fixedrange : false};
    //layout.yaxis = {fixedrange : false};
    layout.paper_bgcolor = 'rgba(0,0,0,0)';
    layout.plot_bgcolor  = 'rgba(0,0,0,0)';
    return layout;
};

GraphComponent.prototype.getData = function() {
    var data = this.element.data;
    if(typeof(data)==="undefined")
        data = this.groups;
    return data;
};
GraphComponent.prototype.getGroupData = function(group) {
    var data = this.element.data;
    if(typeof(data)==="undefined")
        data = this.groups;
    var i = this.getGroupIndex(group);
    var gdata = {x:data[i].x, y:data[i].y};
    return gdata;
};

GraphComponent.prototype.firstTime = function() {
    if(this.numGroups===0)
        return null;
    var firstTime = this.firstGroupTime(this.groupNames[0]);
    for (i=1; i<this.numGroups; i++) {
        var groupTime = this.firstGroupTime(this.groupNames[i]);
        if (!firstTime || groupTime < firstTime)
                firstTime = groupTime;
    }
    return firstTime;
};
GraphComponent.prototype.lastTime = function() {
    if(this.numGroups===0)
        return null;
    var lastTime = this.lastGroupTime(this.groupNames[0]);
    for (i=1; i<this.numGroups; i++) {
        var groupTime = this.lastGroupTime(this.groupNames[i]);
        if (!lastTime || groupTime > lastTime)
            lastTime = groupTime;
    }
    return lastTime;
};
GraphComponent.prototype.firstGroupTime = function(group) {
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
};
GraphComponent.prototype.lastGroupTime = function(group) {
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
};

GraphComponent.prototype.redraw = function(start, end) {
    if(!this.numGroups) {
        return;
    }
    start = (typeof(start)!=="undefined") ? start : this.firstTime();
    end   = (typeof(end)!=="undefined")   ? end   : this.lastTime();

    var view = {
        width:  $(this.element).parent().width(),
        height: $(this.element).parent().height()
    };
    if(start && end) {
        view.xaxis = {
            //type: 'date',
            range: [start.getTime() -this.padding, end.getTime() +this.padding]
        };
    }
    Plotly.relayout(this.elementID, view);
    //Plotly.Plots.resize(this.elementID);
};

GraphComponent.prototype.computeNumericInterval = function(word) {
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
};

GraphComponent.prototype.pushPoints = function(group, points) {
    points = this.decimate(points);
    this.plot(group, points, false);
};
GraphComponent.prototype.clearPoints = function() {
    this.create(this.groupNames);
};
GraphComponent.prototype.getGroupIndex = function(group) {
    return this.groupNames.indexOf(group);
};
GraphComponent.prototype.decimate = function(points) {
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
};
GraphComponent.prototype.addPoints = function(group, points, addBreak) {
    addBreak = (typeof(addBreak)!=="undefined") ? addBreak : true;
    points = this.decimate(points);
    this.plot(group, points, addBreak);
};

GraphComponent.prototype.addBars = function(group, points) {
    //this.padding = interval/2;
    var len = points.x.length;
    if(len === 0)
        return;
    this.plot(group, points);
};
GraphComponent.prototype.changeLabels = function(from, to) {
    var update = {name:""};
    for(var i=0; i<from.length; i++) {
        var index = this.getGroupIndex(from[i]);
        update.name = to[i];
        Plotly.restyle(this.elementID, update, [index]);
    }
};

GraphComponent.prototype.endAddPoints = function(maxWindowLen) {
    maxWindowLen = (typeof(maxWindowLen)!=="undefined") ? maxWindowLen : 0;
    var start  = this.firstTime();
    var end    = this.lastTime();
    if(start && end) {
        var endTime = end.getTime();
        var startTime = Math.max(start.getTime(),endTime-maxWindowLen);
        this.redraw(new Date(startTime), new Date(endTime));
    }
};

GraphComponent.prototype.plot = function(group, points, addBreak) {
    var index = this.getGroupIndex(group);
    if(index===-1) {
        pgUI_showError("Unknown group");
    }
    else {
        var pts = {};
        pts.x = [points.x];
        pts.y = [points.y];
        if(addBreak && this.dirty[index]) {
            pts.x[0].unshift(null);
            pts.y[0].unshift(NaN);
        }
        Plotly.extendTraces(this.elementID, pts, [index]);
        this.dirty[index] = true;
    }
};

GraphComponent.prototype.flipPoints = function(pts) {
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
};


GraphComponent.prototype.makeImage = function(callback) {
    Plotly.toImage(this.elementID, {format: 'png', width: 800, height: 600}).then(callback);
    //Plotly.toImage(this.elementID, {format: 'png', width: 800, height: 600}).then(callback);
};
