
function Graph() {
    Page.call(this, "graph");
    this.graph = null;
}

Graph.prototype = Object.create(Page.prototype);
Graph.prototype.constructor = Graph;

Graph.prototype.update = function(show, data) {
    if(show) {
        if (!this.graph) {
            this.graph = new GraphComponent('graph_graph', 'lines');
            this.graph.create(data.signals);
        }
        this.resize();
        this.updateGraph();
    }
    else {
    }
    return data;
};

Graph.prototype.settings = function(show, data) {
    if(show) {
        $("#graph_signals").val(data.signals).change();
        $("#graph_minMS").val(data.minMS);
    }
    else {
        data.signals = $("#graph_signals").val() || [];
        data.minMS   = Math.max(1, parseInt($("#graph_minMS").val()));
        this.graph.create(data.signals);
        this.graph.setMinPeriod(data.minMS);
    }
    return data;
};

Graph.prototype.resize = function() {
    Page.prototype.resize.call(this, false);
    var header    = this.headerHeight();
    var subheader = $("#graph_page div.category").outerHeight(true);
    var win       = pgUI.getWindowDims();

    var height = win.height -(header+subheader);
    var width  = win.width;
    $("#graph_graphContainer").height(height);
    $("#graph_graphContainer").width(width);
    if(this.graph)
        this.graph.redraw();
};

Graph.prototype.getPageData = function() {
    var data = pg.getPageData("graph", pg.category());
    if(! ('signals' in data))
        data.signals = ["acceleration"];
    if(! ('minMS' in data))
        data.minMS = 50;
    return data;
};

Graph.prototype.updateGraph = function() {
    var data = this.getPageData();
    //var interval = this.graph.computeNumericInterval(data.interval);
    this.graph.clearPoints();

    for(var sig =0; sig<data.signals.length; sig++) {
        var signal = data.signals[sig];
        // Acceleration
        if (signal === "acceleration") {
            var events = pg.getSelectedEvents(pg.category());
            for (var i = 0; i < events.length; i++) {
                var pts = {x: [], y: []};
                var e = pgUtil.parseEvent(events[i]);
                if (e && e.type === "interval") {
                    if (typeof(e.data.acceleration) !== "undefined") {
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
        }
        else if (
            signal === "orientation" ||
            signal === "temperature" ||
            signal === "heartRate"   ||
            signal === "analog1"     ||
            signal === "analog2"     ||
            signal === "random"      )
        {
            //signals = ["bluetooth","orientation","temperature","heartRate","analog1","analog2","voltage","resistance"];
            var events = pg.getSelectedEvents(pg.category());
            for (var i = 0; i < events.length; i++) {
                var e = pgUtil.parseEvent(events[i]);
                if (e && e.type === "interval") {
                    if (typeof(e.data[signal]) !== "undefined") {
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
        else if (signal === "all") {
            //signals = ["bluetooth","orientation","temperature","heartRate","analog1","analog2","voltage","resistance"];
            var events = pg.getSelectedEvents(pg.category());
            for (var i = 0; i < events.length; i++) {
                var e = pgUtil.parseEvent(events[i]);
                if (e && e.type === "interval") {
                    for(signal in e.data) {
                        if(signal==="voltage" || signal==="resistance" || signal==="current" || signal==="generic") {
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
        }
        else {
            pgUI_showError("Unknown signal specified: "+signal);
        }
    }
    this.graph.endAddPoints();
};

UI.graph = new Graph();

//# sourceURL=graph.js
