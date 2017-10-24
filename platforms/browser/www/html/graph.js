
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
        autoResize:    false,
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
    var head    = $("#graph_header").outerHeight(true);
    var subHead = $("#subheader_graph").outerHeight(true);
    var foot    = $("#graph_footer").outerHeight(true);

    var height = $(window).height() -(head+subHead+foot);
    var width = $(window).width();
    $("#graphContainer").height(height);
    $("#graphContainer").width(width);
    $("#graph").css("height", "100%");
};

graph.prototype.settings = function() {
    var data = this.getPageData();
    if(arguments.length) {
        var s = "";
        //s += "<div class='ui-field-contain no-field-separator' data-role='controlgroup'>";
        //s += "<legend>Data to display:</legend>";
        //s += printCheckbox("graph_showAccel", "acceleration", data['showAcceleration']);
        //s += printCheckbox("graph_showRotate", "rotation", data['showRotation']);
        //s += "</div>";
        s += "<div class='ui-field-contain no-field-separator'>";
        s += '<label for="signal">Signal to analyse:</label>';
        s += '<select name="signal" id="signal" data-native-menu="false">';
        //s += '  <option value="events">events</option>'; 
        //s += '  <option value="acceleration">acceleration</option>'; 
        s += '  <option value="accelerationNorm">norm of acceleration</option>'; 
        s += '  <option value="count">count</option>'; 
        s += '  <option value="correctCount">correct/incorrect count</option>'; 
        s += '  <option value="totalTime">total time</option>'; 
        //s += '  <option value="eventCount">number of events</option>'; 
        s += '</select></div>';

        s += '<div class="ui-field-contain no-field-separator">';
        s += '<label for="interval">Data aggregation interval:</label>';
        s += '<select name="interval" id="interval" data-native-menu="false">';
        s += '  <option value="none">none</option>';
        s += '  <option value="day">day</option>';
        s += '  <option value="week">week</option>';
        s += '  <option value="month">month</option>';
        s += '</select></div>';
        
        $("#page_settings").html(s);
        $("#signal").val(data.signal);
        $("#interval").val(data.interval);
    }
    else {
        var d = {signal:  $("#signal").val(),
                 interval: $("#interval").val()
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
        data.signal = "correctCount";
    if(! ('interval' in data))
        data.interval = "day";
    return data;
};

graph.prototype.updateGraph = function() {
    var lineIndex = 0;
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
        for (var i=0; i<events.length; i++) {
            var e = pgUtil.parseEvent(events[i]);
            if(e && e.type=="interval") {
                if(typeof(e.data.acceleration)!="undefined") {
                    var points = e.data.acceleration;
                    var pts = [];
                    for(var i=0; i<points.length; i++) {
                        var norm = points[i][1]*points[i][1];
                        norm    += points[i][2]*points[i][2];
                        norm    += points[i][3]*points[i][3];
                        norm = Math.sqrt(norm);
                        pts.push([points[i][0], norm]);
                    }
                    this.addPoints(lineIndex++, pts, interval);
                }
            }
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
        this.addPoints(lineIndex++, pts, interval);
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
        this.addPoints(lineIndex++, pts, interval, intervalMethod);
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
    if(pts.length) {
        var range  = this.graph.getDataRange();
        opts.start = new Date( range.min.getTime() - interval );
        opts.end   = new Date( range.max.getTime() + interval );
    }
    this.setOptions(data, opts);
};

graph.prototype.addPoints = function(index, points, interval, intervalMethod) {
    intervalMethod = typeof(intervalMethod)!="undefined" ? intervalMethod : "sum";
    var data = this.getPageData();
    if(!this.data) {
        this.data   = new vis.DataSet();
        this.groups = new vis.DataSet();
    }
    var pts = [];
    var groupOpts = {'id': index,
                     'content': 'Group ' + index,
                     //'interpolation': {enabled: true, parametrization: 'linear'},
                     //'className': 'graphStyle'
                     'style': "stroke:black; fill:grey; stroke-width:2",
                     'options': {
                          'drawPoints': {
                              size: 6,
                              style: "circle",
                              styles: "stroke: black; fill: black; stroke-width:3"
                          },
                          'shaded': false
                      }
    };
    this.groups.update(groupOpts);
    
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
        if(points.length)
            nextTime = pgUtil.getCurrentTime()-interval;
        for(var i=0; i<points.length; i++) {
            var j=1;
            var val = points[i][1];
            while(++i<points.length && points[i][0] > nextTime) {
                val += points[i][1];
                j++;
            }
            if(intervalMethod=="mean") {
                val = val / j;
            }
            pts.push({ x: new Date(nextTime+interval),
                        y: val,
                        group: index });
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
