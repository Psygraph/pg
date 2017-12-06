
function stopwatch() {
    page.call(this, "stopwatch");
    this.clock = null;
    // for each category
    this.startTime = {};
    this.graph  = null;
    this.data   = null;
    this.groups = null;
    this.graphInterval = 0;
    this.groupID = { 'acceleration': 1,
                     'orientation':  2,
                     'bluetooth':    3
    };
};

stopwatch.prototype = Object.create(page.prototype);
stopwatch.prototype.constructor = stopwatch;

stopwatch.prototype.update = function(show, state) {
    if(!show) { // no running in the background.
        this.clock.stop();
        return {startTime: this.startTime};
    }
    var data = this.getPageData();
    if(typeof(state)!="undefined")
        this.startTime = state.startTime;
    if(!this.clock) {
        // set up the watch
        this.widget = $('#clock')[0];
        this.clock = new Clock(this.watchCallback.bind(this), data.updateInterval);
    }
    var e = this.getElapsedStopwatch();
    if(e.running == 1) { // we are running
        this.clock.startFromTime(e.startTime - e.duration);
        $('#stopwatch_start').hide().prop('disabled', true);
        $('#stopwatch_stop').show().prop('disabled', false);
    } else { // compute the elapsed duration
        this.clock.setElapsedMS(e.duration);
        $('#stopwatch_start').show().prop('disabled', false);
        $('#stopwatch_stop').hide().prop('disabled', true);
    }
    // set up the data graph
    this.createGraph(data.showGraph);
    this.resize();
};

stopwatch.prototype.settings = function() {
    var data = this.getPageData();
    if(arguments.length) {
        s = "<div class='ui-field-contain no-field-separator' data-role='controlgroup'>";
        s += "<legend>Data to Monitor:</legend>";
        s += printCheckbox("stopwatch_location", "GPS Location", data['watchLocation']);
        if(!pgUtil.isWebBrowser()) {
            s += printCheckbox("stopwatch_acceleration", "Acceleration", data['watchAcceleration']);
            s += printCheckbox("stopwatch_orientation", "Orientation", data['watchOrientation']);
            if(pg.getUserDataValue("debug"))
                s += printCheckbox("stopwatch_bluetooth", "Bluetooth", data['watchBluetooth']);
            pgAccel.hasCompass(showOrientation);
        }
        s += "</div>";
        s += "<div class='ui-field-contain no-field-separator'>";
        s += "<label for='stopwatch_updateInterval'>Update interval (s):</label>";
        s += "<input type='text' class='settings' id='stopwatch_updateInterval' value='";
        s += pgUtil.getStringFromMS(data.updateInterval) + "' />";
        s += "</div>";
        s += printCheckbox("stopwatch_showGraph", "Show graph", data['showGraph']);
        UI.settings.setPageContent(s);
        UI.settings.pageCreate();
    }
    else {
        data.watchLocation  = $("#stopwatch_location")[0].checked;
        if(!pgUtil.isWebBrowser()) {
            data.watchAcceleration = $("#stopwatch_acceleration")[0].checked;
            data.watchOrientation  = $("#stopwatch_orientation")[0].checked;
            if(pg.getUserDataValue("debug"))
                data.watchBluetooth    = $("#stopwatch_bluetooth")[0].checked;
        }
        data.updateInterval = pgUtil.getMSFromString($("#stopwatch_updateInterval")[0].value);
        data.showGraph  = $("#stopwatch_showGraph")[0].checked;
        return data;
    }
    function showOrientation(success) {
        if(success)
            $("#stopwatch_orientation").show();
        else
            $("#stopwatch_orientation").hide();
    }
};

stopwatch.prototype.getPageData = function() {
    var data = pg.getPageData("stopwatch", pg.category());
    if(! ('watchLocation' in data))
        data.watchLocation = false;
    if(! ('watchAcceleration' in data))
        data.watchAcceleration = true;
    if(! ('watchBluetooth' in data))
        data.watchBluetooth = false;
    if(! ('updateInterval' in data))
        data.updateInterval = 91;
    if(! ('showGraph' in data))
        data.showGraph = true;
    return data;
};

stopwatch.prototype.resize = function() {
    page.prototype.resize.call(this, false);
    var content = $("#stopwatch_content").outerHeight(true);
    var controls= $("#stopwatch_controls").outerHeight(true);

    var height  = content-controls;
    var width   = $(window).width();
    $("#stopwatch_graphContainer").height(height);
    $("#stopwatch_graphContainer").width(width);
    $("#stopwatch_graph").css("height", "100%");
};

stopwatch.prototype.lever = function(arg) {
    if(arg=="left") {
        this.reset();
    }
    else if(arg=="right") {
        this.startStop();
    }
};

stopwatch.prototype.startStop = function() {
    var time = pgUtil.getCurrentTime();
    var data = this.getPageData();
    if(!this.clock.running) {
        this.clock.start();
        this.startGraph();
        $('#stopwatch_start').hide().prop('disabled', true);
        $('#stopwatch_stop').show().prop('disabled', false);
        if(!pgUtil.isWebBrowser()) {
            if(data.watchAcceleration || data.watchOrientation) {
                pgAccel.start(data);
            }
            if(data.watchBluetooth && pg.getUserDataValue("debug")) {
                pgBluetooth.start(data);
            }
        }
        this.startTime[pg.category()] = time;
    }
    else {
        this.clock.stop();
        this.stopGraph();
        $('#stopwatch_start').show().prop('disabled', false);
        $('#stopwatch_stop').hide().prop('disabled', true);
        var e = {type: "interval",
                 start: this.startTime[pg.category()],
                 duration: time - this.startTime[pg.category()],
                 data: {}};
        this.startTime[pg.category()] = 0;
        if(!pgUtil.isWebBrowser()) {
            if (data.watchAcceleration || data.watchOrientation) {
                var acc = pgAccel.getAccelerationData();
                if(acc.length && data.watchAcceleration)
                    e.data.acceleration = acc;
                var orient = pgAccel.getOrientationData();
                if(orient.length && data.watchOrientation)
                    e.data.orientation = orient;
                pgAccel.stop();
            }
            if(data.watchBluetooth && pg.getUserDataValue("debug")) {
                var bt = pgBluetooth.getBluetoothData();
                if(bt.length)
                    e.data.bluetooth = bt;
                pgBluetooth.stop();
            }
        }
        if(data.watchLocation) {
            //var t = this.getElapsedStopwatch();
            //this.clock.setElapsedMS(t.duration);
            pgLocation.getCurrentLocation(posCB.bind(this,e));
        }
        else {
            posCB.call(this, e, []);
        }
    }
    syncSoon(true);
    return false;

    function posCB(e, path) {
        if(typeof(path)=="string") {
            // xxx handle error
        }
        else if(path.length) {
            var time= path[path.length-1][0];
            var lat = path[path.length-1][1];
            var lng = path[path.length-1][2];
            var alt = path[path.length-1][3];
            e.data.location = [[pgUtil.getCurrentTime(), lat, lng, alt]];
        }
        pg.addNewEvents(e, true);
        var t = this.getElapsedStopwatch();
        this.clock.setElapsedMS(t.duration);
    }
};

stopwatch.prototype.createGraph = function(show) {
    if(!show) {
        if(this.graph) {
            this.graph.destroy();
            this.graph = null;
        }
        return;
    }
    else {
        if(this.graph)
            return;
    }
    this.data = new vis.DataSet();
    var opts = {
        width:           '100%',
        height:          '100%',
        style:           'line',
        orientation:     'bottom',
        autoResize:      true,
        interpolation:   false,
        start: vis.moment().add(-10, 'seconds'),
        end: vis.moment()
    };
    this.graph= new vis.Graph2d($('#stopwatch_graph')[0], this.data, opts);
    this.graph.on('doubleClick', this.onDoubleClick.bind(this));
    this.groups = new vis.DataSet();
    // add groups for all graphable data
    this.groups.update(getOpts("acceleration"));
    this.groups.update(getOpts("orientation"));
    this.groups.update(getOpts("bluetooth"));
    this.graph.setGroups(this.groups);

    function getOpts(grpName) {
        index = UI.stopwatch.groupID[grpName];
        opts = {'id': index,
                'content': 'Group ' + index,
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
        return opts;
    }
};

stopwatch.prototype.onDoubleClick = function(e) {
    if(UI.stopwatch.graph)
        UI.stopwatch.graph.fit();
};

stopwatch.prototype.startGraph = function() {
    if(!UI.stopwatch.graph)
        return;
    var data = UI.stopwatch.getPageData();
    if(data.watchBluetooth || 
       data.watchAcceleration || 
       data.watchOrientation) {
        UI.stopwatch.graphInterval = setInterval(UI.stopwatch.updateGraph, 1000);
    }
};
stopwatch.prototype.stopGraph = function() {
    if(!UI.stopwatch.graph)
        return;
    if(UI.stopwatch.graphInterval)
        clearInterval(UI.stopwatch.graphInterval);
    UI.stopwatch.graphInterval = 0;
    UI.stopwatch.updateGraph();
};
stopwatch.prototype.updateGraph = function() {
    if(!UI.stopwatch.graph)
        return;
    var data = UI.stopwatch.getPageData();
    var lastTime = 0;
    if(UI.stopwatch.data) {
        var item = UI.stopwatch.data.max("x");
        if(item)
            lastTime = item.x;
    }
    // add bluetooth and accelerometer to the dataset
    if(data.watchBluetooth && pg.getUserDataValue("debug")) {
        var bt = pgBluetooth.getBluetoothData();
        var pts = [];
        for(var i=bt.length-1; i>=0; i--) {
            if(bt[i][0] <= lastTime)
                break;
            pts.push({  x: bt[i][0],
                        y: bt[i][1],
                        group: UI.stopwatch.groupID["bluetooth"] });
        }
        UI.stopwatch.data.add(pts);
    }
    if(data.watchAcceleration) {
        var acc = pgAccel.getAccelerationData();
        var pts = [];
        for(var i=acc.length-1; i>=0; i--) {
            if(acc[i][0] <= lastTime)
                break;
            pts.push({  x: acc[i][0],
                        y: pgUtil.norm([ acc[i][1], acc[i][2], acc[i][3] ]),
                        group: UI.stopwatch.groupID["acceleration"] });
        }
        UI.stopwatch.data.add(pts);
    }
    if(data.watchOrientation) {
        var orient = pgAccel.getOrientationData();
        var pts = [];
        for(var i=orient.length-1; i>=0; i--) {
            if(orient[i][0] <= lastTime)
                break;
            pts.push({  x: orient[i][0],
                        y: orient[i][1],
                        group: UI.stopwatch.groupID["orientation"] });
        }
        UI.stopwatch.data.add(pts);
    }
    // remove all data points which are no longer visible
    var now      = vis.moment();
    var range    = UI.stopwatch.graph.getWindow();
    var interval = range.end - range.start;
    
    if(false) {
        var oldIds   = UI.stopwatch.data.getIds({
                filter: function (item) {
                    return item.x < range.start - interval;
                }
            });
        UI.stopwatch.data.remove(oldIds);
    }
    // Update the window position
    UI.stopwatch.graph.setWindow(now - interval, now, {animation: false});
};


stopwatch.prototype.reset = function() {
    var time = pgUtil.getCurrentTime();
    this.clock.reset();
    if(this.data)
        this.data.clear();
    this.watchCallback(this.clock.getElapsed());
    pg.addNewEvents({type: "reset", time: time}, true);
    if(this.clock.running)
        this.startTime[pg.category()] = time;
    syncSoon();
    return false;
};

stopwatch.prototype.watchCallback = function(ms) {
    this.widget.value = pgUtil.getStringFromMS(ms, true);
};


stopwatch.prototype.getElapsedStopwatch = function() {
    var e              = pg.getEventsInPage("stopwatch");
    var startTime      = 0;
    if(this.startTime.hasOwnProperty(pg.category()))
        startTime = this.startTime[pg.category()];
    var duration       = 0.0;
    var running        = startTime != 0;
    for(var i=0; i<e.length; i++) {
        var event = pgUtil.parseEvent(e[i]);
        if(event.type == "interval") {
            duration += event.duration;
        }
        else if(event.type == "reset") {
            if(!running)
                startTime = event.start;
            break;
        }
        else {
            console.log("Error: unknown event type: " + event.type);
        }
    }
    // If we are running, the client should use the start time and duration.
    // otherwise, the client should use the duration.
    var ans = {startTime: startTime, duration: duration, running: running};
    return ans;
};

UI.stopwatch = new stopwatch();
//# sourceURL=stopwatch.js
