
var Home = function () {
    Page.call(this, "home");
    this.graph = null;
};

Home.prototype = Object.create(Page.prototype);

Home.prototype.constructor = Home;

Home.prototype.update = function(show, data) {
    if(show) {
        this.data = data;
        if (!this.graph) {
            this.graph   = new GraphComponent("home_graph", "bar");
        }
        this.status();
        this.graph.create(this.data.signals, this.graph.computeNumericInterval(this.data.interval));
        this.updateGraph();
        this.resize();
    }
    else {
    }
    return this.data;
};

Home.prototype.settings = function(show) {
    if(show) {
        $("#home_history").val(this.data.history).change();
        $("#home_interval").val(this.data.interval).change();
        $("#home_signals").val(this.data.signals).change();
    }
    else {
        this.data.history  = parseInt($("#home_history").val());
        this.data.interval = $("#home_interval").val();
        this.data.signals  = $("#home_signals").val();
        this.graph.create(this.data.signals, this.graph.computeNumericInterval(this.data.interval));
    }
};
Home.prototype.resize = function() {
    Page.prototype.resize.call(this, false);
    var header    = this.headerHeight();
    var subheader = $("#home_page div.category").outerHeight(true);
    var status    = $("#home_status").outerHeight(true);
    var logo      = $("#home_logo").outerHeight(true);
    var win       = pgUI.getWindowDims();

    var height = win.height -(header +subheader +status +logo);
    var width = win.width;
    $("#home_graphContainer").height(height);
    $("#home_graphContainer").width(width);
    if(this.graph)
        this.graph.redraw();
};


Home.prototype.lever = function(arg) {
};

Home.prototype.getPageData = function() {
    var data = pg.getPageData("home", pg.category());
    if(! ('history' in data))
        data.history = 4;
    if(! ('interval' in data))
        data.interval = "day";
    if(! ('signals' in data))
        data.signals = ["home"];
    return data;
};

Home.prototype.getOptions = function() {
    var interval = this.graph.computeNumericInterval(this.data.interval);
    var options  = {
        orientation:   'bottom',
        timeAxis: {scale: interval, step: 1},
        dataAxis: {visible: false}
    };
};

Home.prototype.updateGraph = function() {
    var interval   = this.graph.computeNumericInterval(this.data.interval);
    var nIntervals = this.data.history;
    var now        = pgUtil.getCurrentTime();
    //var cutoff = now  - interval * nIntervals;

    var homePts;
    var stopwatchPts;
    var counterPts;
    var counterCorrectPts;
    var timerPts;
    var timerMindfulPts;
    var notePts;
    var showHome      = this.hasSignal("home");
    var showStopwatch = this.hasSignal("stopwatch");
    var showCounter   = this.hasSignal("counter");
    var showCounterCorrect   = this.hasSignal("counterCorrect");
    var showTimer     = this.hasSignal("timer");
    var showTimerMindful     = this.hasSignal("timerMindful");
    var showNote      = this.hasSignal("note");
    // Total time
    if(showHome) {
        var pts = {x:[],y:[]};
        var events = pg.getEventsInPage("home", pg.category());
        for (var i=0; i<events.length; i++) {
            var e = pgUtil.parseEvent(events[i]);
            //if(e.start < cutoff)
            //    break;
            if(e && e.type==="login") {
                pts.x.push(new Date(e.start));
                pts.y.push(e.duration / (60*60*1000.0));
            }
        }
        homePts = this.computeIntervals(pts, now, interval, nIntervals, "sum");
    }
    // Total time
    if(showStopwatch) {
        var pts = {x:[],y:[]};
        var events = pg.getEventsInPage("stopwatch", pg.category());
        for (var i=0; i<events.length; i++) {
            var e = pgUtil.parseEvent(events[i]);
            //if(e.start < cutoff)
            //    break;
            if(e.type==="interval") {
                // floating-point hours
                pts.x.push(new Date(e.start));
                pts.y.push(e.duration / (60*60*1000.0));
            }
        }
        stopwatchPts = this.computeIntervals(pts, now, interval, nIntervals, "sum");
    }
    // count
    if(showCounter || showCounterCorrect) {
        var pts = {x:[],y:[]};
        var ptsCorrect = {x:[],y:[]};
        var events = pg.getEventsInPage("counter", pg.category());
        for (var i=0; i<events.length; i++) {
            var e = pgUtil.parseEvent(events[i]);
            //if(e.start < cutoff)
            //    break;
            if(e.type==="reset") {
                var val = e.data.count;
                if(e.data.countTarget)
                    val = (e.data.count === e.data.countTarget) ? 1 : 0;
                ptsCorrect.x.push(new Date(e.start));
                ptsCorrect.y.push(val);
            }
            else {
                var val = 1;
                pts.x.push(new Date(e.start));
                pts.y.push(val);
            }
        }
        counterPts = this.computeIntervals(pts, now, interval, nIntervals, "sum");
        ptsCorrect = scalePoints(ptsCorrect, pts);
        counterCorrectPts = this.computeIntervals(ptsCorrect, now, interval, nIntervals, "mean");
    }
    // timer
    if(showTimer || showTimerMindful) {
        var pts = {x:[],y:[]};
        var ptsMindful = {x:[],y:[]};
        var events = pg.getEventsInPage("timer", pg.category());
        for (var i=0; i<events.length; i++) {
            var e = pgUtil.parseEvent(events[i]);
            //if(e.start < cutoff)
            //    break;
            if(e.type==="response" && typeof(e.data['mindful'])!=="undefined") {
                var val = e.data.mindful ? 1 : 0;
                ptsMindful.x.push(new Date(e.start));
                ptsMindful.y.push(val);
            }
            if(e.type==="interval") {
                // floating-point hours
                pts.x.push(new Date(e.start));
                pts.y.push(e.duration / (60*60*1000.0));
            }
        }
        timerPts = this.computeIntervals(pts, now, interval, nIntervals, "sum");
        ptsMindful = scalePoints(ptsMindful, pts);
        timerMindfulPts = this.computeIntervals(ptsMindful, now, interval, nIntervals, "mean");
    }
    // analytic
    if(showNote) {
        var pts = {x:[],y:[]};
        var events = pg.getEventsInPage("note", pg.category());
        for (var i=0; i<events.length; i++) {
            var e = pgUtil.parseEvent(events[i]);
            //if(e.start < cutoff)
            //    break;
            var val = 1;
            pts.x.push(new Date(e.start));
            pts.y.push(val);
        }
        notePts = this.computeIntervals(pts, now, interval, nIntervals, "binary");
    }

    if(showHome) {
        this.graph.addBars("home", this.graph.flipPoints(homePts));
    }
    if(showStopwatch) {
        this.graph.addBars("stopwatch", this.graph.flipPoints(stopwatchPts));
    }
    if(showCounter) {
        this.graph.addBars("counter", this.graph.flipPoints(counterPts));
    }
    if(showCounterCorrect) {
        this.graph.addBars("counterCorrect", this.graph.flipPoints(counterCorrectPts));
    }
    if(showTimer) {
        this.graph.addBars("timer", this.graph.flipPoints(timerPts));
    }
    if(showTimerMindful) {
        this.graph.addBars("timerMindful", this.graph.flipPoints(timerMindfulPts));
    }
    if(showNote) {
        this.graph.addBars("note", this.graph.flipPoints(notePts));
    }
    // make ptsToScale (0-1) equal to height of scalePts
    function scalePoints(ptsToScale, scalePts) {
        for (var i = 0; i < scalePts.y.length; i++) {
            var correct = ptsToScale.y[i];
            ptsToScale.y[i] = (correct) * scalePts.y[i];
        }
        return ptsToScale;
    }
};

Home.prototype.status = function(onlineStatus) {
    onlineStatus = typeof(onlineSatus)!=="undefined" ? onlineStatus : pg.loggedIn;
    //computeStats.call(this);
};

Home.prototype.computeIntervals = function(points, now, interval, nIntervals, intervalMethod) {
    now = typeof(now) !== "undefined" ? now : pgUtil.getCurrentTime();
    interval = typeof(interval) !== "undefined" ? interval : 0;
    nIntervals = typeof(nIntervals) !== "undefined" ? nIntervals : 4;
    intervalMethod = typeof(intervalMethod) !== "undefined" ? intervalMethod : "sum";
    var plotZeros = true;
    var zeroValue = NaN;

    var len = points.x.length;
    var pts = {x: [], y: []};
    var nextTime = 0;
    var start = new Date();
    start.setHours(0, 0, 0, 0); // beginning of today
    nextTime = start.getTime();
    var mult = Math.floor((now-nextTime)/interval);
    nextTime += mult*interval;
    var i;
    for(i = 0; i < len;) {
        var j = 0;
        var val = 0;
        while (i < len && points.x[i] > nextTime) {
            val += points.y[i];
            j++;
            i++;
        }
        if (j) {
            if (intervalMethod === "mean") {
                val = val / j;
            }
            else if(intervalMethod === "binary") {
                val = val ? 1 : 0;
            }
            pts.x.push( new Date(nextTime + interval));
            pts.y.push(val);
        }
        else if(plotZeros) { // add missing intervals at val=0
            pts.x.push( new Date(nextTime + interval));
            pts.y.push(zeroValue);
        }
        nextTime -= interval;
        if(! (--nIntervals))
            break;
    }
    if(plotZeros) {
        while (nIntervals) {
            pts.x.push(new Date(nextTime + interval));
            pts.y.push(zeroValue);
            nextTime -= interval;
            nIntervals--;
        }
    }
    return pts;
};

/*
home.prototype.computeStats = function(){
    var data = this.getPageData();
    var txt = "";
    var lastSync = "unknown.";
    if(pg.lastSync)
        lastSync = pgUtil.getDateString(pg.lastSync, false);

    var interval = this.graph.computeNumericInterval(data.interval);


    var s = analyze(data.history, interval);

    txt += "<p><table><tbody>";
    txt += "<tr><th></th>";
    for(var i=0; i<data.history; i++) {
        txt += "<th>";
        txt += formatDate(new Date(s.hist[i][0]));
        txt += "</th>";
    }
    txt += "</tr><tr><th class='col'>Time: </th>";
    for(var i=0; i<data.history; i++) {
        txt += "<td>";
        txt += s.hist[i][1].toFixed(2);
        txt += "</td>";
    }
    txt += "</tr><tr><th class='col'>Correct: </th>";
    for(var i=0; i<data.history; i++) {
        txt += "<td>";
        txt += (100*s.acc[i][1]).toFixed(1) + "%";
        txt += "</td>";
    }
    txt += "</tr></tbody></table></p>";

    if(onlineStatus && pg.debug()) { // online
        //txt += "<p><b>Online</b></p>";
        txt += "<ul>";
        txt += "<li><b>username</b>: "  +pg.username+"</li>";
        txt += "<li><b>server</b>: "    +pgLogin.getServerLink(pg.server)+"</li>";
        txt += "<li><b>Last sync</b>: " +lastSync +"</li>";
        txt += "</ul>";
    }
    else {
        //txt += "<p><b>Offline</b></p>";
        //txt += "<ul>";
        //txt += "<li><b>Last sync</b>: " +lastSync +"</li>";
        //txt += "</ul>";
    }
    $("#statistics").html(txt);
};

home.prototype.formatDate = function(date) {
    var monthNames = [
        "January", "February", "March",
        "April", "May", "June", "July",
        "August", "September", "October",
        "November", "December"
    ];
    var day        = date.getDate();
    var monthIndex = date.getMonth();
    var year       = date.getFullYear();
    return monthIndex+1+"/"+day;
};

home.prototype.analyze = function(rows, interval) {
    // Total time
    var totalTime = [];
    var events = pg.getEvents(pg.category());
    for (var i=0; i<events.length; i++) {
        var e = pgUtil.parseEvent(events[i]);
        if(e && e.page==="stopwatch" && e.type==="interval") {
            // floating-point hours
            totalTime.push([e.start, e.duration / (60*60*1000.0)]);
        }
    }
    // Correct count
    var correctCount = [];
    var events = pg.getEventsInPage("counter", pg.category());
    for (var i=0; i<events.length; i++) {
        var e = pgUtil.parseEvent(events[i]);
        if(e.type==="reset") {
            var val = (e.data.count === e.data.countTarget) ? 1 : 0;
            correctCount.push([e.start, val]);
        }
    }

    var nextTime = pgUtil.getCurrentTime();
    var hist = aggregate(totalTime, nextTime, interval, "sum");
    var acc  = aggregate(correctCount, nextTime, interval, "mean");
    for(var i=0; i<rows; i++) {
        var d = new Date(nextTime-i*interval);
        if(hist.length <= i)
            hist[i] = [d.getTime(), 0];
        if(acc.length <= i)
            acc[i] = [d.getTime(), 0];
    }
    return {hist: hist, acc: acc};

    function aggregate(points, endTime, interval, intervalMethod) {
        var pts = [];
        var nextTime = endTime - interval;
        for(var i=0; i<points.length; ) {
            var j   = 0.0;
            var val = 0.0;
            while(i<points.length &&
            points[i][0] > nextTime ) {
                val += points[i][1];
                j++;
                i++;
            }
            if(j) {
                if(intervalMethod==="mean") {
                    val = val / j;
                }
                pts.push([nextTime+interval, val]);
            }
            else {
                pts.push([nextTime+interval, val]);
            }
            nextTime -= interval;
        }
        return pts;
    }
};
*/

UI.home = new Home();
//# sourceURL=home.js
