
function Stopwatch() {
    ButtonPage.call(this, "stopwatch");
    this.clock = null;
    this.graph = null;
    this.signalStarted = {};
    this.signalCache = [];
}

Stopwatch.prototype = Object.create(ButtonPage.prototype);
Stopwatch.prototype.constructor = Stopwatch;

Stopwatch.prototype.update = function(show, data) {
    this.data = ButtonPage.prototype.update.call(this, show, data);
    if(show) { // no running in the background.
        if (!this.clock) {
            this.graph  = new GraphComponent('stopwatch_graph', 'lines');
            this.widget = $('#clock')[0];
            this.clock  = new Clock(this.watchCallback.bind(this), this.data.updateInterval);
        }
        this.createGraph(true);
        if(this.isRunning()) {
            this.startGraph(true);
        }
        this.refreshTimer();
        this.resize();
    }
    else {
        this.stopGraph();
        this.clock.stop();
    }
    return this.data;
};

Stopwatch.prototype.settings = function(show) {
    if(show) {
        $("#stopwatch_signals").val(this.data.signals).change();

        if(pgUtil.isWebBrowser()) {
            //$("#stopwatch_signals .nonBrowser").hide();
            $("#stopwatch_hasBluetooth").parent().hide();
        }
        else {
            pgOrient.hasCompass(showOrientation.bind(this));
        }
        if(pgBluetooth.isConnected())
            $("#stopwatch_BTSettings").parent().show();
        else
            $("#stopwatch_BTSettings").parent().hide();
        //$("#stopwatch_updateInterval").val( pgUtil.getStringFromMS(data.updateInterval) );
        $("#stopwatch_showGraph").prop("checked", this.data.showGraph).checkboxradio('refresh');
        $("#stopwatch_hasBluetooth").prop("checked", this.data.hasBluetooth).checkboxradio('refresh');
    }
    else {
        this.data.signals      = $("#stopwatch_signals").val() || [];
        //this.data.updateInterval = pgUtil.getMSFromString($("#stopwatch_updateInterval")[0].value);
        this.data.showGraph    = $("#stopwatch_showGraph")[0].checked;
        this.data.hasBluetooth = $("#stopwatch_hasBluetooth")[0].checked;
        this.createGraph(this.data.showGraph);
    }
    return this.data;

    function showOrientation(success) {
        if(success)
            $("#stopwatch_orientation").show();
        else
            $("#stopwatch_orientation").hide();
    }
};

Stopwatch.prototype.refreshTimer = function() {
    var e = this.getElapsedStopwatch();
    if(this.isRunning()) {
        this.clock.startFromTime(e.startTime - e.duration);
    }
    else {
        this.clock.stop();
        var t = this.getElapsedStopwatch();
        this.clock.setElapsedMS(e.duration);
    }
};

Stopwatch.prototype.deviceSettings = function(dev) {
    if(dev==="device")
        pgDevice.settingsDialog(function(){}, this.data.signals);
    else if(dev==="bluetooth")
        pgBluetooth.settingsDialog(function(){});
};

Stopwatch.prototype.getAllSignals = function() {
    var signals = this.data.signals.slice(0);
    if(pgUtil.isWebBrowser()) {
        signals = removeElem(signals, "acceleration");
        signals = removeElem(signals, "orientation");
    }
    if(this.hasBluetooth()) {
        signals = signals.concat(pgBluetooth.getSignals());
    }
    return signals;

    function removeElem(array, elem) {
        var index = array.indexOf(elem);
        if (index !== -1) {
            array.splice(index, 1);
        }
        return array;
    }
};
Stopwatch.prototype.getPageData = function(cat) {
    cat = (typeof(cat) !== "undefined") ? cat : pg.category();
    var data = ButtonPage.prototype.getPageData.call(this, cat);
    if(! ('signals' in data))
        data.signals = [];
    if(! ('hasBluetooth' in data))
        data.hasBluetooth = false;
    if(! ('updateInterval' in data))
       data.updateInterval = 91;
    if(! ('showGraph' in data))
        data.showGraph = true;
    if(! ('startTime' in data))
        data.startTime = 0;
    return data;
};

Stopwatch.prototype.resize = function() {
    Page.prototype.resize.call(this, false);
    var header   = this.headerHeight();
    var subheader = $("#stopwatch_page div.category").outerHeight(true);
    var controls = $("#stopwatch_controls").outerHeight(true);
    var win     = pgUI.getWindowDims();
    var graphHeight  = win.height - (header+subheader+controls);
    var width   = win.width;

    $("#stopwatch_graphContainer").outerHeight(graphHeight);
    $("#stopwatch_graphContainer").width(width);
    $("#stopwatch_graph").css("height", "100%");
    if(this.graph)
        this.graph.redraw();
};

Stopwatch.prototype.start = function(restart) {
    restart = restart || false;
    ButtonPage.prototype.start.call(this, restart);
    if(!restart) {
        this.data.startTime = pgUtil.getCurrentTime();
    }
    this.refreshTimer();
    // start the graph and bluetooth device.
    //var signals = this.getAllSignals(data);
    pgDevice.start(restart, this.data.signals);
    if(this.hasBluetooth()) {
        pgBluetooth.reconnect(btCB.bind(this));
    }
    else
        this.startGraph(restart);

    function btCB(tf) {
        if(tf) {
            //var signals = this.getAllSignals(data);
            pgBluetooth.start(restart);
        }
        this.startGraph(restart);
    }
};

Stopwatch.prototype.hasBluetooth = function() {
    return !pgUtil.isWebBrowser() && this.data.hasBluetooth;
};
Stopwatch.prototype.hasDevice = function() {
    var tf = this.hasSignal("random");
    if(!pgUtil.isWebBrowser()) {
        tf |= this.hasSignal("acceleration");
        tf |= this.hasSignal("orientation");
        tf |= this.hasSignal("location");
    }
    return tf;
};
Stopwatch.prototype.stop = function() {
    ButtonPage.prototype.stop.call(this);
    var time = pgUtil.getCurrentTime();
    this.clock.stop();
    this.stopGraph();
    var e = {type: "interval",
             start: this.data.startTime,
             duration: time - this.data.startTime,
             data: {}};
    this.data.startTime = 0;
    this.setPageData(this.data);

    pgDevice.stop(dataCB.bind(this,e));

    function dataCB(e) {
        if(this.hasDevice()) {
            var d = pgDevice.getData();
            for (var field in d) {
                if (d[field].length) {
                    e.data[field] = d[field];
                }
            }
        }
        if(this.hasBluetooth()) {
            pgBluetooth.stop(finalDataCB.bind(this,e));
        }
        else
            finalDataCB.call(this,e);
    }
    function finalDataCB(e) {
        if(this.hasBluetooth()) {
            var d = pgBluetooth.getData();
            for (var field in d) {
                if (d[field].length) {
                    e.data[field] = d[field];
                }
            }
        }
        pg.addNewEvents(e, true);
        this.refreshTimer();
    }
};

Stopwatch.prototype.reset = function() {
    //if(!this.running)
    //    return;
    ButtonPage.prototype.reset.call(this);
    var time = pgUtil.getCurrentTime();
    this.clock.reset(time);
    this.graph.clearPoints();
    this.watchCallback(this.clock.getElapsed());
    var e = { type: "reset", start: time};
    pg.addNewEvents(e, true);
    if(this.clock.running) {
        this.data.startTime = time;
    }
    return false;
};

Stopwatch.prototype.createGraph = function(show) {
    var signals = [];
    if(show) {
        signals = this.getAllSignals();
    }
    this.signalCache = signals.slice(0);
    this.graph.create(signals);
    if(show) {
        this.graph.clearPoints();
        // graph the most recent event
        var e = this.getElapsedStopwatch();
        for(var i=0; i<e.eventIDs.length; i++) {
            var event = pg.getEventFromID(e.eventIDs[i]);
            var d = event[E_DATA];
            this.addPoints(d);
        }
        this.graph.endAddPoints(60*1000);
        this.signalStarted = {};
        for (var s in signals) {
            this.signalStarted[signals[s]] = false;
        }
    }
};

Stopwatch.prototype.startGraph = function(restart) {
    if(!this.graph)
        return;
    if( this.hasBluetooth()            ||
        this.hasSignal("acceleration") ||
        this.hasSignal("orientation")  ||
        this.hasSignal("random") ) {
        this.graphInterval = setInterval(this.updateGraph.bind(this), 1000);
    }
};
Stopwatch.prototype.stopGraph = function() {
    if(!this.graph)
        return;
    clearInterval(this.graphInterval);
    this.graphInterval = 0;
    //this.updateGraph();
};

Stopwatch.prototype.updateGraph = function() {
    if(!this.graph)
        return;

    // add bluetooth and accelerometer to the dataset
    if (this.hasBluetooth()) {
        var d = pgBluetooth.getData();
        this.addPoints(d);
    }
    if (this.hasSignal("acceleration") ||
        this.hasSignal("orientation")  ||
        this.hasSignal("random") )
    {
        var d = pgDevice.getData();
        this.addPoints(d);
    }

    this.graph.endAddPoints(60*1000); // display a maximum of one minute of data
};
Stopwatch.prototype.addPoints = function(d) {
    for (var field in d) {
        if (this.signalCache.indexOf(field)>=0 && d[field].length) {
            var data = d[field];
            var pts = {x: [], y: []};
            var lastTime = this.graph.lastGroupTime(field);
            lastTime = lastTime ? lastTime.getTime() : 0;
            var index;
            for(index = data.length - 1; index >= 0; index--) {
                if (data[index][0] <= lastTime)
                    break;
            }
            for( index++; index<data.length-1; index++) {
                pts.x.push(new Date(data[index][0]));
                if(field==="acceleration")
                    pts.y.push(pgUtil.norm(data[index].slice(1)));
                else
                    pts.y.push(data[index][1]);
            }
            this.graph.addPoints(field, pts, !this.signalStarted[field]);
            this.signalStarted[field] = true;
        }
    }
};

Stopwatch.prototype.watchCallback = function(ms) {
    this.widget.value = pgUtil.getStringFromMS(ms, true);
};

Stopwatch.prototype.getElapsedStopwatch = function() {
    var e              = pg.getEventsInPage("stopwatch");
    var startTime      = this.data.startTime;
    var duration       = 0.0;
    var running        = startTime !== 0;
    var ids            = [];
    for(var i=0; i<e.length; i++) {
        var event = pgUtil.parseEvent(e[i]);
        if(event.type === "interval") {
            duration += event.duration;
            ids.push(event.id);
        }
        else if(event.type === "reset") {
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
    return {startTime: startTime, duration: duration, running: running, eventIDs: ids};
};

UI.stopwatch = new Stopwatch();
//# sourceURL=stopwatch.js
