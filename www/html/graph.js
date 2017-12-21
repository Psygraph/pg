
function graph() {
    page.call(this, "graph");
    this.graph   = null;
    this.data     = null;
    this.groups   = null;
    this.options = {
        width:         '100%',
        height:        '100%',
        style:         'line',
        orientation:   'top',
        clickToUse:    true,
        sort:          true,
        //autoResize:    true,
        interpolation: false, //{enabled: false, parametrization: 'linear'},
        min:           new Date(0),
        max:           new Date(pgUtil.getCurrentTime() +2*365*24*60*60*1000),
        dataAxis: { 
            left: {
                range: {min: 0}
            }
        }
    };
    this.numLines = 0;
}

graph.prototype = Object.create(page.prototype);
graph.prototype.constructor = graph;

graph.prototype.update = function(show, state) {
    if(!show) {
        return {};
    }
    if(!this.graph) {
        //var data = this.getPageData();
        this.setOptions();
        // Create a Graph
        this.graph= new vis.Graph2d($('#graph')[0], this.data, this.options);
        this.graph.on('doubleClick', this.onDoubleClick.bind(this));
    }    
    this.resize();
    this.updateGraph();
};

graph.prototype.onDoubleClick = function(e) {
    this.graph.fit();
};

graph.prototype.resize = function() {
    page.prototype.resize.call(this, false);
    var header   = this.headerHeight();
    var subheader = $("#graph_page div.category").outerHeight(true);
    var win    = getWindowDims();

    var height = win.height -(header+subheader);
    var width = win.width;
    $("#graphContainer").height(height);
    $("#graphContainer").width(width);
};

graph.prototype.settings = function() {
    var data = this.getPageData();
    if(arguments.length) {
        $("#graph_signal").val(data.signal).change();
        $("#graph_interval").val(data.interval).change();
        UI.settings.pageCreate();
    }
    else {
        var d = {signal:   $("#graph_signal").val(),
                 interval: $("#graph_interval").val()
        };
        this.setOptions(d);
        return d;
    }
};

graph.prototype.setOptions = function(data, opts) {
    opts = typeof(opts)=="undefined"? {} : opts;
    data = typeof(data)!="undefined" ? data : this.getPageData();
    if(data.interval == "none") {
        this.options.drawPoints = true;
        this.options.style ='line';
        //this.options.shaded = false;
        delete this.options['barChart'];
    }
    else {
        this.options.drawPoints = false;
        this.options.style ='bar';
        this.options.barChart = {width: 1000, minWidth: 6, align: 'left'};
    }

    delete this.options['start'];
    delete this.options['end'];
    for (var prop in opts) {
        this.options[prop] = opts[prop];
    }
    if(this.graph) {
        this.graph.setOptions(this.options);
        this.graph.redraw();
    }
};

graph.prototype.getPageData = function() {
    var data = pg.getPageData("graph", pg.category());
    if(! ('signal' in data))
        data.signal   = "accelerationNorm";
    if(! ('interval' in data))
        data.interval = "none";
    return data;
};

graph.prototype.updateGraph = function() {
    var lineIndex = 0;
    var hasPoints = false;
    var data = this.getPageData();
    if(this.data) { // xxx do this selectively
        this.groups.clear();
        this.data.clear();
    }
    var interval = 0;
    if(data.interval == "none")
        interval = 0;
    else if(data.interval == "day")
        interval = 24*60*60*1000;
    else if(data.interval == "week")
        interval = 7*24*60*60*1000;
    else if(data.interval == "month")
        interval = 30*24*60*60*1000;
    
    // Acceleration
    if(data.signal == "accelerationNorm") {
        var events = pg.getSelectedEvents(pg.category());
        var pts = [];
        for (var i=0; i<events.length; i++) {
            var e = pgUtil.parseEvent(events[i]);
            if(e && e.type=="interval") {
                if(typeof(e.data.acceleration)!="undefined") {
                    var points = e.data.acceleration;
                    for(var j=0; j<points.length; j++) {
                        var norm = points[j][1]*points[j][1];
                        norm    += points[j][2]*points[j][2];
                        norm    += points[j][3]*points[j][3];
                        norm = Math.sqrt(norm);
                        pts.push([points[j][0], norm]);
                    }
                }
            }
        }
        if(pts.length>1) {
            hasPoints = true;
            this.addPoints(lineIndex++, pts, interval);
        }
    }
    // bluetooth
    else if(data.signal == "bluetooth") {
        var events = pg.getSelectedEvents(pg.category());
        var pts = [];
        for (var i=0; i<events.length; i++) {
            var e = pgUtil.parseEvent(events[i]);
            if(e && e.type=="interval") {
                if(typeof(e.data.bluetooth)!="undefined") {
                    var points = e.data.bluetooth;
                    for(var j=0; j<points.length; j++) {
                        pts.push(points[j]);
                    }
                }
            }
        }
        if(pts.length>1) {
            hasPoints = true;
            this.addPoints(lineIndex++, pts, interval);
        }
    }
    // Orientation
    else if(data.signal == "orientation") {
        var events = pg.getSelectedEvents(pg.category());
        var pts = [];
        for (var i=0; i<events.length; i++) {
            var e = pgUtil.parseEvent(events[i]);
            if(e && e.type=="interval") {
                if(typeof(e.data.orientation)!="undefined") {
                    var points = e.data.orientation;
                    for(var j=0; j<points.length; j++) {
                        var norm = points[j][1]*points[j][1];
                        norm    += points[j][2]*points[j][2];
                        norm    += points[j][3]*points[j][3];
                        norm = Math.sqrt(norm);
                        pts.push([points[j][0], points[j][1]]);
                    }
                }
            }
        }
        if(pts.length>1) {
            hasPoints = true;
            this.addPoints(lineIndex++, pts, interval);
        }
    }
    // Total time
    else if(data.signal == "totalTime") {
        var pts = [];
        var events = pg.getEvents(pg.category());
        for (var i=0; i<events.length; i++) {
            var e = pgUtil.parseEvent(events[i]);
            if(e && e.type=="interval") {
                // floating-point hours
                pts.push([e.start, e.duration / (60*60*1000.0)]);
            }
        }
        if(pts.length>1) {
            hasPoints = true;
            this.addPoints(lineIndex++, pts, interval);
        }
    }
    // count and correctCount
    else if(data.signal=="count" || data.signal=="correctCount") {
        var pts = [];
        var events = pg.getEventsInPage("counter", pg.category());
        for (var i=0; i<events.length; i++) {
            var e = pgUtil.parseEvent(events[i]);
            if(data.signal=="count") {
                pts.push([e.start, e.data.count]);
            }
            else {
                if(e.type=="reset") {
                    var val;
                    if(data.signal=="count")
                        val = e.data.count;
                    else
                        val = (e.data.count == e.data.target) ? 1 : 0;
                    pts.push([e.start, val]);
                }
            }
        }
        var intervalMethod = "sum";
        if(data.signal=="correctCount")
            intervalMethod = "mean";
        if(pts.length>1) {
            hasPoints = true;
            this.addPoints(lineIndex++, pts, interval, intervalMethod);
        }
    }
    else {
        showError("Unknown signal specified: " + data.signal);
    }
    this.numLines = lineIndex;
    if(lineIndex==0)
        this.addPoints(0, [[pgUtil.getCurrentTime(),0]]);
    // set the bounds
    if(data.interval == "none")
        interval = 24*60*60*1000; // look at a day on either side
    var opts = {
        'start': new Date(pgUtil.getCurrentTime() - interval ), 
        'end':   new Date(pgUtil.getCurrentTime() + interval )
    };
    if(hasPoints) {
        var range  = this.graph.getDataRange();
        opts.start = new Date( range.min.getTime() - interval );
        opts.end   = new Date( range.max.getTime() + interval );
    }
    this.setOptions(data, opts);
};

graph.prototype.addPoints = function(index, points, interval, intervalMethod) {
    intervalMethod = typeof(intervalMethod)!="undefined" ? intervalMethod : "sum";
    var data = this.getPageData();
    var emptyGroup = 400;
    if(!this.data) {
        this.data   = new vis.DataSet();
        this.groups = new vis.DataSet();
        // add a transparent group
        var emptyGroupOpts = {id: emptyGroup,
                              style: "stroke:rgba(0,0,0,0); fill:rgba(0,0,0,0); "
        };
        this.groups.update(emptyGroupOpts);
    }
    var groupOpts = {'id': index,
                     'content': 'Group ' + index,
                     //'interpolation': {enabled: true, parametrization: 'linear'},
                     //'className': 'graphStyle'
                     'style': "stroke:black; fill:grey; stroke-width:2",
                     'options': {
            'drawPoints': {
                size: 2,
                style: "circle",
                styles: "stroke: black; fill: black; stroke-width:2"
            },
            'shaded': false
        }
    };
    this.groups.update(groupOpts);
    
    var pts = [];    
    if(!interval) {
        for(var i=0; i<points.length; i++) {
            pts.push({  x: new Date(points[i][0]),
                        y: points[i][1],
                        group: index });
        }
    }
    else {
        var pts = [];
        var nextTime = 0;
        if(points.length) {
            var start = new Date();
            start.setHours(0,0,0,0); // beginning of today
            nextTime = start.getTime();
            //nextTime = pgUtil.getCurrentTime()-interval;
        }
        for(var i=0; i<points.length; ) {
            var j=0;
            var val = 0;
            while(i<points.length && 
                  points[i][0] > nextTime ) {
                val += points[i][1];
                j++;
                i++;
            }
            if(j) {
                if(intervalMethod=="mean") {
                    val = val / j;
                }
                pts.push({  x: new Date(nextTime+interval),
                            y: val,
                            group: index });
            }
            else {
                pts.push({  x: new Date(nextTime+interval),
                            y: val,
                            group: emptyGroup });
            }
            nextTime -= interval;
        }
        if(pts.length)
            // trim the bar width by plotting a preceeding bar.
            pts.push({ x: new Date(nextTime+interval),
                       y: 0,
                       group: index });
    }
    this.data.add(pts);
    this.graph.setGroups(this.groups);
    this.graph.setItems(this.data);
};

UI.graph = new graph();

//# sourceURL=graph.js
