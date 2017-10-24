
function stopwatch() {
    page.call(this, "stopwatch");
    this.clock = null;
    // for each category
    this.startTime = {};
};

stopwatch.prototype = Object.create(page.prototype);
stopwatch.prototype.constructor = stopwatch;

stopwatch.prototype.update = function(show, state) {
    if(!show) { // no running in the background.
        this.clock.stop();
        return {startTime: this.startTime};
    }
    if(typeof(state)!="undefined")
        this.startTime = state.startTime;
    if(!this.clock) {
        // set up the watch
        var data = this.getPageData();
        this.widget = $('#clock')[0];
        this.clock = new Clock(this.watchCallback.bind(this), data.updateInterval);
    }
    var e = this.getElapsedStopwatch();
    if(e.running == 1) { // we are running
        this.clock.startFromTime(e.startTime - e.duration);
        $('#stopwatch_start').hide();
        $('#stopwatch_stop').show();
    } else { // compute the elapsed duration
        this.clock.setElapsedMS(e.duration);
        $('#stopwatch_start').show();
        $('#stopwatch_stop').hide();
    }
    this.resize();
};

stopwatch.prototype.settings = function() {
    var data = this.getPageData();
    if(arguments.length) {
        s = "<div class='ui-field-contain no-field-separator' data-role='controlgroup'>";
        s += "<legend>Data to Monitor:</legend>";
        s += printCheckbox("stopwatch_location", "GPS Location", data['watchLocation']);
        if(!pgUtil.isWebBrowser())
            s += printCheckbox("stopwatch_acceleration", "Acceleration", data['watchAcceleration']);
        s += "</div>";
        s += "<div class='ui-field-contain no-field-separator'>";
        s += "<label for='stopwatch_updateInterval'>Update interval (s):</label>";
        s += "<input type='text' class='settings' id='stopwatch_updateInterval' value='";
        s += pgUtil.getStringFromMS(data.updateInterval) + "' />";
        s += "</div>";
        $("#page_settings").html(s);
    }
    else {
        data.watchLocation  = $("#stopwatch_location")[0].checked;
        if(!pgUtil.isWebBrowser()) {
            data.watchAcceleration = $("#stopwatch_acceleration")[0].checked;
        }
        data.updateInterval = pgUtil.getMSFromString($("#stopwatch_updateInterval")[0].value);
        return data;
    }
};

stopwatch.prototype.getPageData = function() {
    var data = pg.getPageData("stopwatch", pg.category());
    if(! ('watchLocation' in data))
        data.watchLocation = true;
    if(! ('watchAcceleration' in data))
        data.watchAcceleration = true;
    if(! ('updateInterval' in data))
        data.updateInterval = 91;
    return data;
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
    if(!this.clock.started) {
        this.clock.start();
        $('#stopwatch_start').hide();
        $('#stopwatch_stop').show();
        if(data.watchAcceleration && !pgUtil.isWebBrowser()) {
            pgAccel.start(data);
        }
        this.startTime[pg.category()] = time;
    }
    else {
        this.clock.stop();
        $('#stopwatch_start').show();
        $('#stopwatch_stop').hide();
        var e = {type: "interval",
                 start: this.startTime[pg.category()],
                 duration: time - this.startTime[pg.category()],
                 data: {}};
        this.startTime[pg.category()] = 0;
        if(data.watchAcceleration && !pgUtil.isWebBrowser()) {
            var acc = pgAccel.getAccelerationData();
            if(acc.length)
                e.data.acceleration = acc;
            pgAccel.stop();
        }
        if(data.watchLocation) {
            //var t = this.getElapsedStopwatch();
            //this.clock.setElapsedMS(t.duration);
            pgLocation.getCurrentLocation(posCB.bind(this,e));
        }
        else {
            posCB(e, []);
        }
    }
    syncSoon();
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

stopwatch.prototype.reset = function() {
    var time = pgUtil.getCurrentTime();
    this.clock.reset();
    this.watchCallback(this.clock.getElapsed());
    pg.addNewEvents({type: "reset", time: time}, true);
    if(this.clock.started)
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
