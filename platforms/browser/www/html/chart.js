
function chart() {
    page.call(this, "chart");
    this.dataSet     = null;
    this.timeline    = null;
    this.selectedIDs = [];
}

chart.prototype = Object.create(page.prototype);
chart.prototype.constructor = chart;

chart.prototype.update = function(show, state) {
    if(!show) {
        return {};
    }
    if(!this.timeline) {
        var data      = this.getPageData();
        var container = document.getElementById('gantt');    
        // Create a DataSet with data (enables two way data binding)
        this.updateChart();
        this.resize();
        // Configuration for the Timeline
        var dur = this.getDisplayRange();
        var options = {
            start:  new Date(dur[0]),
            end:    new Date(dur[1]),
            min:    new Date(0),
            max:    new Date(pgUtil.getCurrentTime() +2*365*24*60*60*1000),
            width:  "100%",
            height: "100%",
            orientation: 'top',
            autoResize: false
	        //style:  "box"
	        //margin: {item: 20}
	    };
        // Create a Timeline
        this.timeline = new vis.Timeline(container, this.dataSet, options);
        //this.timeline.setGroups(groups);
        this.timeline.on('select', this.onSelected.bind(this));
        //this.timeline.on('click', this.onClicked.bind(this));
        this.timeline.on('doubleClick', this.onDoubleClick.bind(this));
    }
    this.updateChart();
};

chart.prototype.resize = function() {
    var head    = $("#chart_header").outerHeight(true);
    var subHead = $("#subheader_chart").outerHeight(true);
    var foot    = $("#chart_footer").outerHeight(true);

    var height = $(window).height() -(head+subHead+foot);
    var width = $(window).width();
    $("#gantt").height(height);
    $("#gantt").width(width);
};

chart.prototype.zoomToSelected = function() {
	this.selectedIDs = pg.getSelectedEventIDs();
};

chart.prototype.settings = function() {
    if(arguments.length) {
        var data = this.getPageData();
        var s  = "<div class='ui-field-contain no-field-separator'>";
        s += "  <label for='chart_range'>Chart range:</label>";
        s += "  <select id='chart_range' value='Chart range' title='Chart range' data-native-menu='false'>";
        s += "    <option value='hour'>One hour</option>";
        s += "    <option value='day'>One day</option>";
	    s += "    <option value='week'>One week</option>";
        s += "    <option value='month'>One month</option>";
        s += "    <option value='year'>One year</option>";
        s += "  </select>";
        s += "</div>";
        s += printCheckbox("chart_showData", "Show only timed events", data.showData=='timed');
        //s += "<p>(display currently limited to 200 events)</p>";
        
        $("#page_settings").html(s);
        $("#chart_range").val(data.range).change();
    }
    else {
	    this.dataSet.clear();
	    data = {
            "range":   $( "#chart_range").val(),
            maxEvents: 200,
            showData: $("#chart_showData")[0].checked ? 'timed' : 'all'
        };
        return data;
    }
};
    
chart.prototype.getPageData = function() {
    var data = pg.getPageData("chart", pg.category());
    if(! ('range' in data))
        data.range = "week";
    if(! ('maxEvents' in data))
        data.maxEvents = 100;
    if(! ('showData' in data))
        data.showData = 'timed';
    return data;
};
    
chart.prototype.getEventRange = function() {
    var range = [0, pgUtil.getCurrentTime()];
    return range;
};
chart.prototype.getDisplayRange = function(selected) {
    var startTime;
    var endTime;
    if(selected && this.selectedIDs.length) {
        var start = pg.getEventFromID(this.selectedIDs[0]);
        var end = pg.getEventFromID(this.selectedIDs[this.selectedIDs.length-1]);
	    startTime = start.start;
        endTime   = end.start + end.duration;
    }
    else {
        var data = this.getPageData();
        if(data.range == "hour")
	        interval = 60*60*1000;
        else if(data.range == "day")
	        interval = 24*60*60*1000;
        else if(data.range == "week")
	        interval = 7*24*60*60*1000;
        else if(data.range == "month")
	        interval = 30*7*24*60*60*1000;
        else if(data.range == "year")
	        interval = 365*7*24*60*60*1000;
        startTime = pgUtil.getCurrentTime() - interval;
        endTime = pgUtil.getCurrentTime() + interval *0.1;
    }
    return [startTime, endTime];
};

chart.prototype.updateChart = function() {
    var data = this.getPageData();
    var dur = this.getEventRange();
    var list = [];
    var lastTime = -1;
    g = [];
    //for(var i=0; i<pg.numPages(); i++) {
    //	g[i] = {id:      pg.pages[i], 
    //		content: pg.pages[i], 
    //		title:   pg.pages[i]};
    //}
    // not setting groups until a patch is released for timeline.
    //var groups = new vis.DataSet(g);
    
    for(var time=dur[0]; time < dur[1]; ) {
        var e = pg.getEventsAtTime(time);
        if(!e.length)
            break;
        for(var i=0; i<e.length; i++) {
            var nextEvent = e[i];
            if(data.showData=='timed' &&
               nextEvent.duration==0 )
                continue;
            list[list.length] = { id:      nextEvent.id,
                                  title:   this.eventText(nextEvent),
                                  content: nextEvent.page,
                                  //group:   nextEvent.page,
                                  start:   new Date(nextEvent.start)
            };
            if(nextEvent.duration)
                list[list.length-1].end = new Date(nextEvent.start + nextEvent.duration);
            if(list.length == data.maxEvents)
                break;
        }
        // increment time
        time = e[0].start + 1;
    }
    if(!this.dataSet) {
        try {
            this.dataSet = new vis.DataSet(list);
        } catch(e) {
            alert(e.message);
        }
        this.category = pg.category();
    }
    else {
        if(this.category != pg.category())
            this.dataSet.clear();
        this.category = pg.category();
        for(var i=0; i<list.length; i++)
            this.dataSet.update(list[i]);
    }
    if(this.timeline) {
        this.selectedIDs = pg.getSelectedEventIDs();
        this.timeline.setSelection(this.selectedIDs);
        var dispDur = this.getDisplayRange();
        this.timeline.setWindow(new Date(dispDur[0]), new Date(dispDur[1]));
    }
};

chart.prototype.onSelected = function(ids) {
    pg.unselectEvents(this.selectedIDs); 
    pg.selectEvents(ids.items);
};
chart.prototype.onDoubleClick = function(e) {
    this.timeline.fit();
};

chart.prototype.eventText = function(e) {
    var s = e.type + ": ";
    s += pgUtil.displayEventData(e);
    return s;
};
    
UI.chart = new chart();
//# sourceURL=chart.js
