var Page = function(name) {
    this.name = name;
    this.data = {};

    // the following two fields are used only during settings initialization.
    // they should probably be removed
    this.localPG = new PG();
    this.localPG.init();
};

Page.prototype.constructor = Page;

Page.prototype.hasSignal = function(signal) {
    //data= typeof(data)!=="undefined" ? data : this.getPageData();
    return this.data.signals.indexOf(signal) >= 0;
};

Page.prototype.update = function(show, data) {
    if(show)
        this.data = data;
    return this.data;
};

Page.prototype.settings = function(show) {
};

Page.prototype.lever = function(arg) {
    if(arg==="left") {
    }
    else if(arg==="right") {
    }
};
Page.prototype.tripleClick = function() {
};

Page.prototype.headerHeight = function() {
    return $("#"+this.name+"_page .header").outerHeight(true);
};
Page.prototype.contentWidth = function() {
    var win    = pgUI.getWindowDims();
    return win.width;
};

Page.prototype.resize = function(scrollable) {
    scrollable = (typeof(scrollable)!=="undefined") ? scrollable : true;
    if(scrollable) {
        var header = this.headerHeight();
        var win    = pgUI.getWindowDims();
        var width  = this.contentWidth();
        var totalHeight = header;
        var scrollDiv  = $("#"+this.name+"_page div.main.content");
        scrollDiv.css({'overflow': "auto"});
        scrollDiv  = (typeof(scrollDiv)!=="undefined") ? scrollDiv : $("#"+this.name+"_main");
        scrollDiv.children().each(function(){
                totalHeight = totalHeight + $(this).outerHeight(true);
            });
        totHeight = Math.max(totalHeight, win.height);
        $("#"+this.name+"_page div.content").css({
                'position':     "absolute",
                    'top':      header+"px",
                    'height':   totHeight+"px",
                    'width':    width+"px",
                    'overflow': "auto"
                    });
    }
    else {
        var head   = this.headerHeight();
        var win    = pgUI.getWindowDims();
        var height = win.height - (head);
        var width  = this.contentWidth();
        $("#"+this.name+"_page .content").css({
                'position':     "absolute",
                    'top':      head+"px",
                    'height':   height+"px",
                    'width':    width+"px",
                    'overflow': "auto"
                    });
        $("#"+this.name+"_page div.main.content").css({'overflow': "hidden"});
    }
};

Page.prototype.getPageData = function(cat) {
    cat = (typeof(cat) !== "undefined") ? cat: pg.category();
    var page = this.name;
    var data = pg.getPageData(page, cat);
    return data;
};
Page.prototype.getPageDataField = function(name, cat) {
    cat = (typeof(cat) !== "undefined") ? cat: pg.category();
    var data = this.getPageData(cat);
    return data[name];
};
Page.prototype.setPageData = function(newPageData, cat) {
    cat  = (typeof(cat) !== "undefined") ? cat: pg.category();
    var page = this.name;
    var pageData = this.getPageData(cat);
    if(!pgUtil.equal(pageData, newPageData)) {
        var pmtime = pgUtil.getCurrentTime();
        pg.setPageData(pmtime, newPageData, page, cat);
    }
};
Page.prototype.setPageDataField = function(name, value, cat) {
    cat  = (typeof(cat) !== "undefined") ? cat: pg.category();
    var page = this.name;
    var data = this.getPageData(page, cat);
    data[name] = value;
    this.setPageData(data, cat);
};

Page.prototype.getSummary = function(page, category) {
    category = typeof(category!=="undefined") ? category : pg.category();
    var events = pg.getEventsInPage(page, category);
    var count = events.length;
    var range = 30*24*60*60*1000;
    var start = pgUtil.getCurrentTime() - range;
    txt = "";
    if(page==="stopwatch" || page==="timer") {
        var sec = 0;
        for(var i=0; i<events.length; i++) {
            if(events[i][E_TYPE]==="interval")
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

Page.prototype.displayEventData = function(e) {
    var txt = "";
    try {
        var dur = getTimeString(e.duration);
        if((e.page==="stopwatch" || e.page==="map") &&
           (e.type==="interval")) {
            txt += dur;
            for (var field in e.data)
            if(field==="location") {
                var loc = e.data.location[0]; // just look at the first location
                var ll = "lat: " + loc[1].toFixed(4) + ", long: " + loc[2].toFixed(4);
                txt += alertTextHref("+loc", "location", ll);
                if(typeof(e.data.distance)!=="undefined") {
                    txt += " " + e.data.distance.toFixed(2) + " miles";
                }
            }
            else if(field==="acceleration") {
                txt += " +acc";
            }
            else if(field==="orientation") {
                txt += " +orient";
            }
            else if(field==="heartRate") {
                txt += " +HR";
            }
            else if(field==="orientation") {
                txt += " +orient";
            }
            else if(field==="temperature") {
                txt += " +temp";
            }
            else if(field==="analog1") {
                txt += " +analog1";
            }
            else if(field==="analog2") {
                txt += " +analog2";
            }
            else if(field==="random") {
                txt += " +rand";
            }
        }
        else if(e.page==="stopwatch" && e.type==="reset") {
            // resets have nothing to display
        }
        else if(e.page === "note" ||
                (e.page === "map" && e.type === "marker") ) {
            txt += pgUtil.escape(e.data.title);
            if(typeof(e.data.text)!=="undefined") {
                title = e.data.title !== "" ? e.data.title : "note";
                txt += alertTextHref("+text", e.data.title, e.data.text);
            }
            if(typeof(e.data.location)!=="undefined") {
                var ll = "lat: " + e.data.location[0][1].toFixed(4) + ", long: " + e.data.location[0][2].toFixed(4);
                txt += alertTextHref("+loc", e.data.title, ll);
            }
            if(typeof(e.data.audio)!=="undefined") {
                var fn  = pgAudio.getRecordFilename(e.id, e.data.audio);
                var id  = e.id;
                var tag = playMediaHref("+audio", id, fn);
                txt += tag;
            }
        }
        else if(e.page === "timer") {
            if(e.type==="interval") {
                txt += dur;
            }
            else if(e.type==="reset") {
                if(typeof(e.data['resetTime'])!=="undefined") {
                    txt += " " + getTimeString(e.data.resetTime);
                }
            }
            else if(e.type==="response") {
                if(typeof(e.data['mindful'])!=="undefined") {
                    if(e.data.mindful)
                        txt += " Mindful";
                    else
                        txt += " Not mindful";
                }
            }
        }
        else if(e.page === "counter") {
            txt += e.data.count;
            if(e.type==="reset" && e.data.countTarget!==0) {
                if(e.data.count === e.data.countTarget)
                    txt += ", correct";
                else
                    txt += ", incorrect";
            }
        }
        else if(e.page === "home") {
            if(e.type==="login")
                txt += dur;
            if(e.type==="error" ||
               e.type==="warn"  ||
               e.type==="log")
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
        return ' <a href="" onclick="pgUI.showAlert(\''+pgUtil.escape(text, true)+'\', \''+pgUtil.escape(title, true)+'\'); return true;" >'+type+'</a>';
    }
    function playMediaHref(type, id, fn) {
        return ' <a href="" onclick="return pgAudio.playRecorded(\''+id+'\', \''+fn+'\');">'+type+'</a>';
    }
    function getTimeString(dur) {
        var t = pgUtil.getStringFromMS(dur, false);
        //if(t.indexOf(":") < 0) {
            t = t + " sec";
        //}
        return t;
    }
};

// ======= PAGE SETTINGS ======

Page.prototype.createSettings = function() {
    var page     = pg.page();
    /*
    var pc = $("#"+page+"_category");
    pc.empty();
    for(var i=0; i<pg.categories.length; i++) {
        var cat = pg.categories[i];
        pc.append(new Option(cat, cat));
    }
    pc.val(category).change();
    pc.on('change', function() {
            var category = pc.val();
            if(category !== pg.category())
                gotoCategory(category);
        });
    */
    UI[page].settings(true);
};

Page.prototype.submitSettings = function(doClose) {
    if(doClose==="cancel") {
        gotoPage(pg.page());
        gotoSectionMain();
        return;
    }
    var page     = getPage();
    var category = pg.category();

    // now safe to make a copy of the pg, which might have been changed by the previous calls.
    this.localPG.copy(pg, false);

    UI[page].settings(false);
    var newPageData = UI[page].data;
    if(getPage()==="categories" &&
       !pgUtil.equal(this.localPG.categories, pg.categories)) {
        pg.setCategories(this.localPG.categories);
    }
    var pmtime = pg.getPageMtime(page);
    if(doClose==="applyAll") {
        for(var i=0; i<pg.categories.length; i++)
            setPageDataForCategory(this.localPG, newPageData, page, pg.categories[i]);
    }
    else {
        setPageDataForCategory(this.localPG, newPageData, page, category);
    }

    // no-op if settings have not changed
    //if(pgUtil.encode(this.localPG, true) === pgUtil.encode(pg, true)) {
    //    if(doClose==="OK")
    //        gotoPage(pg.page(), true);
    //    return;
    //}

    // Here we might download and cache the CSS or TEXT files.
    this.localPG.dirty(true);
    if(pg.loggedIn) {
        PGEN.updateSettings( this.localPG, this.settingsUpdateComplete.bind(this,doClose) );
    }
    else {
        this.settingsUpdateComplete(doClose, true);
    }

    function setPageDataForCategory(localPG, newPageData, page, category) {
        var pageData = pg.getPageData(page, category);
        if(!pgUtil.equal(pageData, newPageData)) {
            pmtime = pgUtil.getCurrentTime();
            localPG.setPageData(pmtime, newPageData, page, category);
        }
    }
};

Page.prototype.settingsUpdateComplete = function(doClose, success) {
    //if( pg.online && !pgUtil.equal(this.localPG, pg, ['mtime'], true) ) {

    // account for changes
    var category   = this.localPG.category();
    var newCatData = this.localPG.getCategoryData(category);
    var catData    = pg.getCategoryData(category);    

    // copy changes
    pg.copy(this.localPG, false);
    PGEN.writePG(pg,writeCB);
    
    if(getPage()==="categories") {
        //var styleEqual = pgUtil.equal(catData.style, newCatData.style);
        //var soundEqual = pgUtil.equal(catData.sound, newCatData.sound);
        var textEqual  = pgUtil.equal(catData.text, newCatData.text);
        //gotoPage("categories"); // changing the categories means we need to update the category widget.
        //gotoCategory(pg.categoryIndex);
        //if(!soundEqual)
            pgAudio.alarm();
        if(!textEqual)
            pg.getCategoryText(category, true);
    }

    // show an alert if changing the server settings was not successful.
    if(! success) {
        pgUI.showAlert("Could not update data on server", "Warning", onClose.bind(this) );
    }
    else {
        onClose();
    }
    syncSoon();

    function onClose() {
        gotoCategory(pg.categoryIndex);
        if(doClose==="OK") {
            gotoPage(pg.page());
        }
        //else if (getPage() === "categories") {
        //    gotoPage("categories");
        //}
    }
    function writeCB(success) {
        if(!success)
            pgUI.showAlert("Could not write data locally", "Error");
    }
};

var ButtonPage = function(name) {
    Page.call(this, name);
    this.resetID = $("#"+name+"_page input.reset");
    this.startID = $("#"+name+"_page input.start");
    this.stopID  = $("#"+name+"_page input.stop");

};
ButtonPage.prototype = Object.create(Page.prototype);
ButtonPage.prototype.constructor = ButtonPage;

ButtonPage.prototype.setRunning = function(running) {
    running = running || false;
    //pgUI.showLog("Setting running status to "+running+" for page: "+this.name+", cat: "+pg.category());
    //console.trace();
    this.data.running = running;
    if(running) {
        this.startID.hide().prop('disabled', true);
        this.stopID.show().prop('disabled', false);
        $("#button_page .lever_button.start").hide().prop('disabled', true);
        $("#button_page .lever_button.stop").show().prop('disabled', false);
    }
    else {
        this.startID.show().prop('disabled', false);
        this.stopID.hide().prop('disabled', true);
        $("#button_page .lever_button.start").show().prop('disabled', false);
        $("#button_page .lever_button.stop").hide().prop('disabled', true);
    }
};
ButtonPage.prototype.isRunning = function() {
    return this.data.running;
};
ButtonPage.prototype.lever = function(arg) {
    if(arg==="left") {
        this.reset();
    }
    else if(arg==="right") {
        if(this.isRunning())
            this.stop();
        else
            this.start();
    }
};
ButtonPage.prototype.buttonClick = function(type) {
    var page = UI[pg.page()];
    if(type==="start")
        this.start();
    else if(type==="stop")
        this.stop();
    else if(type==="reset")
        this.reset();
};
ButtonPage.prototype.tripleClick = function() {
    pgUI.showButtons(true);
};

ButtonPage.prototype.update = function(show, data) {
    this.data = Page.prototype.update.call(this, show, data);
    if (show) {
        try {
            this.setRunning(this.data.running);
        }
        catch (err) {
            pgUI.showWarn(err.toString());
            this.data.running = false;
            this.setRunning(this.data.running);
        }
    }
    return this.data;
};

ButtonPage.prototype.start = function (restart) {
    this.setRunning(true);
    syncSoon();
};
ButtonPage.prototype.stop = function() {
    if(!this.isRunning()) {
        pgUI.showError("Clock is already stopped");
    }
    this.setRunning(false);
    syncSoon();
};
ButtonPage.prototype.reset = function() {
    syncSoon();
};

ButtonPage.prototype.getPageData = function(cat) {
    cat = (typeof(cat) !== "undefined") ? cat : pg.category();
    var data = Page.prototype.getPageData.call(this, cat);
    if(! ('running' in data))
        data.running = false;
    return data;
};


//UI.page = new page();
//# sourceURL=page.js
