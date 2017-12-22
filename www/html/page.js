var page = function(name) {
    this.name = name;
    //this.src  = {};
};

page.prototype.constructor = page;

page.prototype.update = function(show) {
};

page.prototype.settings = function() {
};

page.prototype.lever = function(arg) {
    if(arg=="left") {
    }
    else if(arg=="right") {
    }
};

page.prototype.headerHeight = function() {
    return $("#"+this.name+"_page .header").outerHeight(true);
}
page.prototype.contentWidth = function() {
    var win    = getWindowDims();
    return win.width;
}

page.prototype.resize = function(scrollable) {
    scrollable = (typeof(scrollable)!="undefined") ? scrollable : true;
    if(scrollable) {
        var header = this.headerHeight();
        var win    = getWindowDims();
        var width  = this.contentWidth();
        var totalHeight = header;
        scrollDiv  = $("#"+this.name+"_page div.main.content");
        scrollDiv = (typeof(scrollDiv)!="undefined") ? scrollDiv : $("#"+this.name+"_main");
        scrollDiv.children().each(function(){
                totalHeight = totalHeight + $(this).outerHeight(true);
            });
        totHeight = Math.max(totalHeight, win.height);
        $("#"+this.name+"_page div.content").css({
                'position':     "absolute",
                    'top':      header+"px",
                    'height':   totHeight+"px",
                    'width':    width+"px",
                    'overflow': "scroll"
                    });
        $("#"+this.name+"_page div.main.content").css({'overflow': "scroll"});
    }
    else {
        var head   = this.headerHeight();
        var win    = getWindowDims();
        var height = win.height - (head);
        var width  = this.contentWidth();
        $("#"+this.name+"_page .content").css({
                'position':     "absolute",
                    'top':      head+"px",
                    'height':   height+"px",
                    'width':    width+"px",
                    'overflow': "scroll"
                    });
        $("#"+this.name+"_page div.main.content").css({'overflow': "hidden"});
    }
};

page.prototype.getPageData = function(cat) {
    var cat = (typeof(cat) != "undefined") ? cat: pg.category();
    var data = pg.getPageData(this.name, cat);
    return data;
};

page.prototype.setPageData = function(newPageData, page, cat) {
    var page = (typeof(page) != "undefined") ? page: pg.page();
    var cat  = (typeof(cat) != "undefined") ? cat: pg.category();
    var pageData = this.getPageData();
    if(!pgUtil.equal(pageData, newPageData)) {
        var pmtime = pgUtil.getCurrentTime();
        pg.setPageData(pmtime, newPageData, page, cat);
    }
};

page.prototype.setPageDataField = function(name, value, page, cat) {
    var page = (typeof(page) != "undefined") ? page: pg.page();
    var cat  = (typeof(cat) != "undefined") ? cat: pg.category();
    var data = this.getPageData(page, cat);
    data[name] = value;
    this.setPageData(data, page, cat);
};

page.prototype.getSummary = function(page, category) {
    category = typeof(category!="undefined") ? category : pg.category();
    var events = pg.getEventsInPage(page, category);
    var count = events.length;
    var range = 30*24*60*60*1000;
    var start = pgUtil.getCurrentTime() - range;
    txt = "";
    if(page=="stopwatch" || page=="timer") {
        var sec = 0;
        for(var i=0; i<events.length; i++) {
            if(events[i][E_TYPE]=="interval")
                sec += events[i][E_DUR]/1000;
            if(events[i][E_START] < start)
                break;
        }
        var hours = sec / (60*60);
        txt = hours.toFixed(3) +" hours";
    }
    //else if(page=="timer") {
    //    for(var i=0; i<events.length; i++) {
    //    }
    //}
    //else if(page=="counter") {
    //}
    //else if(page=="note") {
    //}
    else {
        txt = count +" events";
    }
    return txt;
};

page.prototype.displayEventData = function(e) {
    var txt = "";
    try {
        var dur = getTimeString(e.duration);
        if((e.page=="stopwatch" || e.page=="map") &&
           (e.type=="interval")) {
            txt += dur;
            if(typeof(e.data.location)!="undefined") {
                var loc = e.data.location[0]; // just look at the first location
                var ll = "lat: " + loc[1].toFixed(4) + ", long: " + loc[2].toFixed(4);
                txt += alertTextHref("+loc", "location", ll);
            }
            if(typeof(e.data.acceleration)!="undefined")
                txt += " +acc";
            if(typeof(e.data.orientation)!="undefined")
                txt += " +orient";
            if(typeof(e.data.bluetooth)!="undefined")
                txt += " +bt";
            if(typeof(e.data.pathLength)!="undefined")
                txt += " " + e.data.pathLength.toFixed(2) + " miles";
        }
        else if(e.page=="stopwatch" && e.type=="reset") {
            // resets have nothing to display
        }
        else if(e.page == "note" ||
                (e.page == "map" && e.type == "marker") ) {
            txt += pgUtil.escape(e.data.title);
            if(typeof(e.data.text)!="undefined") {
                title = e.data.title != "" ? e.data.title : "note";
                txt += alertTextHref("+text", e.data.title, e.data.text);
            }
            if(typeof(e.data.location)!="undefined") {
                var ll = "lat: " + e.data.location[0][1].toFixed(4) + ", long: " + e.data.location[0][2].toFixed(4);
                txt += alertTextHref("+loc", e.data.title, ll);
            }
            if(typeof(e.data.audio)!="undefined") {
                var fn  = pgAudio.getRecordFilename(e.id, e.data.audio);
                var id  = e.id;
                var tag = playMediaHref("+audio", id, fn);
                txt += tag;
            }
        }
        else if(e.page == "timer") {
            if(e.type=="interval")
                txt += dur;
            else if(e.type=="reset") {
                if(typeof(e.data.resetTime)!="undefined")
                    txt += " " + getTimeString(e.data.resetTime);
            }
        }
        else if(e.page == "counter") {
            txt += e.data.count;
            if(e.type=="reset" && e.data.target != 0) {
                if(e.data.count == e.data.target)
                    txt += ", correct";
                else
                    txt += ", incorrect";
            }
        }
        else if(e.page == "home") {
            // login and logout events... nothing to display.
            if(e.type=="error" ||
               e.type=="warn"  ||
               e.type=="log")
                txt += alertTextHref("+text", e.type, e.data.text);
        }
        else {
            console.log("unknown page for event, type: " + e.page + e.type);
        }
    }
    catch(err) {
        txt += " [CORRUPT DATA] ";
        // xxx we should probably delete this event.
    }
    return txt;
    
    function alertTextHref(type, title, text) {
        var txt = ' <a href="" onclick="showAlert(\''+pgUtil.escape(text, true)+'\', \''+pgUtil.escape(title, true)+'\'); return true;" >'+type+'</a>';
        return txt;
    }
    function playMediaHref(type, id, fn) {
        var txt = ' <a href="" onclick="return pgAudio.playRecorded(\''+id+'\', \''+fn+'\');">'+type+'</a>';
        return txt;
    }
    function getTimeString(dur) {
        return pgUtil.getStringFromMS(dur) + " sec";
    }
};


UI.page = new page();
//# sourceURL=page.js
