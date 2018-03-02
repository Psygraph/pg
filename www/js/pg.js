//"use strict";

// Events are in arrays for speed, so we define these constants
// to manipulate them by index
const E_ID    = 0;
const E_START = 1;
const E_DUR   = 2;
const E_CAT   = 3;
const E_PAGE  = 4;
const E_TYPE  = 5;
const E_DATA  = 6;

function PG() {
    this.username       = null;
    this.cert           = null;
    this.certExpiration = null;
    this.categoryIndex  = null;
    this.pageIndex      = null;
    this.categories     = null;
    this.allPages       = ["home","stopwatch","counter","timer","note","list","graph","map"];
    this.allEventPages  = ["stopwatch","counter","timer","note"];
    this.pages          = null;
    this.pageData       = null;
    this.online         = null;
    this.background     = null;
    this.server         = null;
    this.useServer      = null;
    this.loggedIn       = null;
    this.dirtyFlag      = null;
    this.mtime          = null;
    this.lastSync       = null;
    this.events         = null;
    this.deletedEvents  = null;
    this.selectedEvents = null;
    this.version        = 0.5;
    this.loginEventID   = 0;

    this.init = function() {
        this.username       = "";
        this.cert           = "";
        this.certExpiration = 0;
        this.categoryIndex  = 0;
        this.pageIndex      = 0;
        this.categories     = ["Uncategorized","Meditate","Exercise","Study"];
        this.pages          = ["home","stopwatch","counter","timer","note","list","graph","map"];
        this.pageData       = {"home": nd(), "stopwatch": nd(),"counter": nd(),"timer": nd(),"note": nd(),"list": nd(),"map": nd(),"graph": nd(),"categories": nd(),"prefs": nd() };
        this.online         = true;
        this.background     = false;
        this.server         = "";
        this.useServer      = false;
        this.loggedIn       = false;
        this.dirtyFlag      = false;
        this.mtime          = 0;
        this.lastSync       = 0;
        this.initializeEvents();
        function nd() {
            return {'mtime': 0, 'data': {}};
        }
    };
    this.dirty = function(set) {
        if(typeof(set) !== "undefined") {
            if(set) {
                this.mtime = pgUtil.getCurrentTime();
            }
            else {
                this.lastSync = pgUtil.getCurrentTime();
            }
            this.dirtyFlag = set;
        }
        return this.dirtyFlag;
    };
    this.copy = function(opg, copyEvents) {
        this.username       = opg.username;
        this.cert           = opg.cert;
        this.certExpiration = opg.certExpiration;
        this.online         = opg.online;
        this.background     = opg.background;
        this.server         = opg.server;
        this.useServer      = opg.useServer;
        this.loggedIn       = opg.loggedIn;
        this.categoryIndex  = opg.categoryIndex;
        this.pageIndex      = opg.pageIndex;
        this.categories     = pgUtil.deepCopy(opg.categories);
        this.pages          = pgUtil.deepCopy(opg.pages);
        this.dirtyFlag      = opg.dirtyFlag;
        this.mtime          = opg.mtime;
        this.lastSync       = opg.lastSync;
        this.pageData       = pgUtil.deepCopy(opg.pageData);
        if(copyEvents)
            this.copyEvents(opg);
    };
    this.copyEvents = function(opg) {
        this.events        = pgUtil.deepCopy(opg.events);
        this.deletedEvents = pgUtil.deepCopy(opg.deletedEvents);
        this.selectedEvents= pgUtil.deepCopy(opg.selectedEvents);
    };
    this.copySettings = function(opg) {
        if(this.mtime <= opg.mtime) {
            // don't over-write new information
            var server          = this.server;
            var online          = this.online;
            var cert            = this.cert;
            var certExpiration  = this.certExpiration;
            var loggedIn        = this.loggedIn;
            var useServer       = this.useServer;
            this.copy(opg);
            this.online         = online;
            this.server         = server;
            this.cert           = cert;
            this.certExpiration = certExpiration;
            this.loggedIn       = loggedIn;
            this.useServer      = useServer;
        }
    };
    this.updatePageData = function() {
        for(var p in this.pages) {
            var page = this.pages[p];
            if(this.allPages.indexOf(page)<0) { // found obsolete page!!!
                delete(this.pages[p]);
                continue;
            }
            var pd = this.pageData[page];
            for(var cat in pd.data) { //[category]
                var pdDefault = UI[page].getPageData(cat);
                var pdThis = pd.data[cat];
                // add missing fields to pdThis that are present in pdDefault
                for(var f in pdDefault) {
                    if(!pdThis.hasOwnProperty(f))
                        this.pageData[page].data[cat][f] = pdDefault[f];
                }
                // remove fields in pdThis that are not present in pdDefault
                for(var f in pdThis) {
                    if(!pdDefault.hasOwnProperty(f))
                        delete(pdThis[f]);
                }
            }
        }
    };
    this.initializeEvents = function() {
        this.events         = new Array();
        this.deletedEvents  = new Array();
        this.selectedEvents = new Array();
    };
    this.getMediaURL = function() {
        return this.server + "/mediaServer.php";
    };
    this.numCategories = function() {
        return this.categories.length;
    };
    this.numPages = function() {
        return this.pages.length;
    };
    this.setCurrentPage = function(name) {
        this.pageIndex = this.pages.indexOf(name);
    };
    this.setCurrentCategory = function(name) {
        this.categoryIndex = this.categories.indexOf(name);
    };
    this.page = function() {
        if(arguments.length)
            this.pages[this.categoryIndex] = arguments[0];
        return this.pages[this.pageIndex]
    };
    this.getCategoryText = function(cat, reset) {
        cat = (typeof(cat) !== "undefined") ? cat: this.category();
        reset = (typeof(reset) !== "undefined") ? reset: false;
        if(reset || !this.xml || typeof(this.xml[cat])==="undefined") {
            var data = this.getCategoryData(cat);
            var url = data.text;
            if(url.indexOf("http") !== 0) {
                if(pgUtil.isWebBrowser())
                    url = pgFile.getAppURL() + "/media/" + url;
                else
                    url = pgFile.getAppURL() + "/www/media/" + url;
            }
            var U = new UXML(url);
            if(typeof(this.xml) === "undefined")
                this.xml = {};
            this.xml[cat]       = {};
            this.xml[cat].title = cat;
            this.xml[cat].text  = [];
            // get the child "text", then get its descendents.
            var catNode = U.getChildByName(null, "text");
            if(catNode) {
                // this.xml[cat].title = catNode.getAttribute("name");
                var things = U.getThings(catNode);
                for(var j=0; j<things.length; j++) {
                    this.xml[cat].text[j] = U.thingToString(things[j]);
                }
            }
        }
        return this.xml[cat];
    };
    this.getCategories = function() {
        return this.categories;
    };
    this.setCategories = function(categories) {
        if(!pgUtil.equal(this.categories, categories)) {
            this.categories = categories.slice(0);
            this.dirty(true);
        }
    };
    this.getCategoryData = function(category) {
        return UI.categories.getPageData(category);
    };
    this.getPageData = function(page, category) {
        var data = this.pageData[page];
        if(!data || !data.data)
            data = {'mtime': 0, 'data': {}};
        var ans;
        if(category===undefined)
            ans = data.data;
        else {
            if(!data.data[category]) {
                data.data[category] = {};
            }
            ans = data.data[category];
        }
        return pgUtil.deepCopy( ans );
    };
    this.getPageDataValue = function(page, category, value) {
        var data = this.getPageData(page, category);
        return data[value];
    };
    this.debug = function() {
        return this.getPageDataValue("preferences", "Uncategorized", "debug");
    };
    this.getPageMtime = function(page) {
        var data = this.pageData[page];
        if(!data) {
            data = {'mtime': 0, 'data': {}};
        }
        return data['mtime'];
    };
    this.setPageData = function(mtime, data, page, category) {
        if(typeof(this.pageData[page])==="undefined")
            this.pageData[page] = {'mtime': 0, 'data': {}};
        this.pageData[page].mtime = mtime;
        if(category===undefined)
            this.pageData[page].data = pgUtil.deepCopy(data);
        else
            this.pageData[page].data[category] = pgUtil.deepCopy(data);
        if(mtime > this.mtime) {
            this.dirty(true);
            this.mtime = Math.max(this.mtime, mtime);
        }
    };
    /*
    this.setPages = function(pages) {
        if(!pgUtil.equal(this.pages, pages)) {
            this.pages = pgUtil.deepCopy(pages);
            this.dirty(true);
        }
    };
    */
    this.canUploadFiles = function() {
        if(pgUtil.isWebBrowser())
            return true;
        return ( pg.loggedIn && pg.online &&
                 (navigator.connection.type === Connection.WIFI ||
                  pg.getPageDataValue("preferences","Uncategorized","wifiOnly") === false) );
    };
    this.category = function() {
        if(arguments.length)
            this.categories[this.categoryIndex] = arguments[0];
        return this.categories[this.categoryIndex];
    };
    this.event = function(n) {
        return this.events[n];
    };
    this.getEvents = function(cat) {
        cat = cat!==undefined ? cat : this.category();
        var e = new Array();
        for(var i=0; i<this.events.length; i++) {
            if(pgUtil.sameType(this.events[i][E_CAT], cat)) {
                e.push(this.events[i]);
            }
        }
        return e;
    };
    this.getEventsInPage = function(page, cat) {
        cat = cat!==undefined ? cat : this.category();
        var e = new Array();
        for(var i=0; i<this.events.length; i++) {
            if (pgUtil.sameType(this.events[i][E_CAT],cat) &&
                this.events[i][E_PAGE] === page) {
                e.push(this.events[i]);
            }
        }
        return e;
    };
    this.getEventIDsInPage = function(page, cat) {
        cat = cat!==undefined ? cat : this.category();
        var e = new Array();
        for(var i=0; i<this.events.length; i++) {
            if (pgUtil.sameType(this.events[i][E_CAT],cat) &&
                this.events[i][E_PAGE] === page) {
                e.push(this.events[i][E_ID]);
            }
        }
        return e;
    };
    this.getSelectedEvents = function(cat) {
        cat = cat!==undefined ? cat : this.category();
        var events = new Array();
        for(var i=0; i<this.selectedEvents.length; i++) {
            var event = this.getEventFromID(this.selectedEvents[i]);
            if(!event) {
                var id = this.selectedEvents[i];
                pgUI_showLog("CANNOT FIND SELECTED EVENT: " +id);
                this.unselectEvent(id);
            }
            else if(pgUtil.sameType(event[E_CAT], cat))
                events[events.length] = event;
        }
        return events;
    };
    this.getSelectedEventIDs = function(cat) {
        cat = cat!==undefined ? cat : this.category();
        var ids = [];
        var events = this.getSelectedEvents(cat);
        for(var i=0; i<events.length; i++) {
            ids[ids.length] = events[i][E_ID];
        }
        return ids;
    };
    this.selectEventsFromTime = function(time) {
        for(var i=0; i<this.events.length; i++) {
            if(this.events[i][E_START] >= time)
                this.selectEvent(this.events[i][E_ID]);
            else
                break;
        }
    };
    this.isEventSelected = function(id) {
        return this.selectedEvents.indexOf(id) !== -1;
    };
    this.selectEvents = function(ids) {
        if(typeof(ids) === "string") {
            for(var i=0; i<this.events.length; i++) {
                if(pgUtil.sameType(this.events[i][E_CAT], ids))
                    this.selectEvent(this.events[i][E_ID]);
            }
        }
        else {
            if(! ids.length) {
                ids = [ids];
            }
            for(var j=0; j<ids.length; j++) {
                this.selectEvent(ids[j]);
            }
        }
    };
    this.selectEvent = function(id) {
        if(this.selectedEvents.indexOf(id) === -1) {
            this.dirty(true);
            this.selectedEvents[this.selectedEvents.length] = id;
        }
    };
    this.unselectEvents = function(ids) {
        if(typeof(ids) === "string") {
            var type = ids;
            for(var i=0; i<this.events.length; i++) {
                if(pgUtil.sameType(this.events[i][E_CAT], type))
                    this.unselectEvent(this.events[i][E_ID]);
            }
        }
        else {
            if(! ids.length) {
                ids = [ids];
            }
            for(var j=0; j<ids.length; j++) {
                this.unselectEvent(ids[j]);
            }
        }
    };
    this.unselectEvent = function(id) {
        var i = this.selectedEvents.indexOf(id);
        if(i !== -1) {
            this.dirty(true);
            this.selectedEvents.splice(i, 1);
            return true;
        }
        return false;
    };
    this.changeEventCategory = function(ids, cat) {
        for(var i=this.events.length-1; i>=0; i--) {
            if (ids.indexOf(this.events[i][E_ID]) !== -1) {
                this.events[i][E_CAT] = cat;
                this.eventChanged(i);
            }
        }
    };
    this.deleteEventIDs = function(ids, deleteOnServer) {
        deleteOnServer = deleteOnServer!==undefined ? deleteOnServer : true;
        for(var j=0; j<ids.length; j++) {
            for(var i=this.events.length-1; i>=0; i--) {
                if (this.events[i][E_ID] === ids[j]) {
                    //showLog("Deleting event: " +this.events[i][3] + ", " + ids[j].toString());
                    this.unselectEvent(this.events[i][E_ID]);
                    if(this.events[i][E_PAGE] === "note" &&
                       this.events[i][E_DATA].audio) {
                        pgFile.deleteAudioFile(pgAudio.getRecordFilename(
                            this.events[i][E_ID], this.events[i][E_DATA].audio));
                    }
                    var e = this.events.splice(i,1)[0];
                    if(deleteOnServer)
                        this.deletedEvents[this.deletedEvents.length] = e;
                    break;
                }
            }
        }
        this.dirty(true);
    };
    this.deleteDeletedEventIDs = function(ids) {
        for(var j=0; j<ids.length; j++) {
            for(var i=this.deletedEvents.length-1; i>=0; i--) {
                if (this.deletedEvents[i][E_ID] === ids[j]) {
                    this.deletedEvents.splice(i,1);
                    break;
                }
            }
        }
        this.dirty(true);
    };

    this.isIDUnique = function(id) {
        for(var i=0; i<this.events.length; i++) {
            if(id===this.events[i][E_ID])
                return false;
        }
        return true;
    };
    this.uniqueEventID = function() {
        var id;
        while(true) {
            // we generate negative numbers, to distinguish from (positive) SQL IDs
            id = 0 - Math.floor(Math.random() * (1<<15));
            if(this.isIDUnique(id))
                break;
        }
        return id;
    };
    this.updateLoginEvent = function(event) { // modify the event that corresponds to this session
        if(this.loginEventID) { // check if same category
            var e = this.getEventFromID(this.loginEventID);
            if (e[E_CAT] !== event.category)
                this.loginEventID = 0;
        }
        if(!this.loginEventID) {
            this.loginEventID = pg.uniqueEventID();
            event.id = this.loginEventID;
            this.addNewEvents(event, true);
        }
        else {
            event.id = this.loginEventID;
            var eventA = this.createEventA(this.addEventDefaults(event));
            this.changeEventAtID(this.loginEventID, eventA, false);
        }
    };
    this.addEventDefaults = function(event) {
        if(!("category" in event))
            event.category = this.category();
        if(!("page" in event))
            event.page = this.page();
        if(!("duration" in event))
            event.duration = 0;
        if(!("data" in event))
            event.data = {};
        return event;
    };
    this.createEventA = function(e) {
        var eventA = [e.id, e.start, e.duration, e.category, e.page, e.type, e.data];
        return eventA;
    };
    this.createEventS = function(e) {
        var eventS = {
            id:       e[E_ID],
            start:    e[E_START],
            duration: e[E_DUR],
            category: e[E_CAT],
            page:     e[E_PAGE],
            type:     e[E_TYPE],
            data:     e[E_DATA]
        };
        return eventS;
    };
    this.addEvents = function(events, selected) { // an array of structures
        var out = [];
        for(var i=0; i<events.length; i++) {
            e = events[i];
            if(! e.id)
                e.id = pg.uniqueEventID();
            var event = pgUtil.unparseEvent(e);
            out[i] = event;
        }
        this.addEventArray(out, selected);
    };
    this.addNewEvents = function(e, selected) {
        if(! (e instanceof Array))
            e = [e];
        for(var i=0; i<e.length; i++) {
            if(!e[i].hasOwnProperty('start'))
                e[i].start    = pgUtil.getCurrentTime();
            if(!e[i].hasOwnProperty('duration'))
                e[i].duration = 0;
            if(!e[i].hasOwnProperty('category'))
                e[i].category = pg.category();
            if(!e[i].hasOwnProperty('page'))
                e[i].page     = pg.page();
            if(!e[i].hasOwnProperty('data'))
                e[i].data     = {};
        }
        pg.addEvents(e, selected);
    };
    /*
    this.getEventIDsInRange = function(startTime, endTime) {
        var list = [];
        for(var i=0; i<this.events.length; i++) {
            if(this.events[i][E_START] >= startTime &&
               this.events[i][E_START] <  endTime) {
                list[list.length] = this.events[i][E_ID];
            }
        }
        return list;
    };
    */
    this.mostRecentEvent = function(category, page) {
        var e = null;
        for(var i=0; i<this.events.length; i++) {
            if(pgUtil.sameType(this.events[i][E_CAT], category) &&
               this.events[i][E_PAGE] === page) {
                e = pgUtil.parseEvent(this.events[i]);
                break;
            }
        }
        return e;
    };
    this.getEventsAtTime = function(time) {
        if(time < 0) {
            pgUI_showError("Invalid query at a negative time.");
            return [];
        }
        var cat = pg.category();
        var e = [];
        for(var i=this.events.length-1; i>=0;  i--) {
            if(this.events[i][E_START] >= time &&
               pgUtil.sameType(this.events[i][E_CAT], cat))
            {
                if(e.length &&
                   (e[0].start !== this.events[i][E_START])) {
                    break;
                }
                else {
                    e[e.length] = {id:       this.events[i][E_ID],
                                   start:    this.events[i][E_START],
                                   duration: this.events[i][E_DUR],
                                   category: this.events[i][E_CAT],
                                   page:     this.events[i][E_PAGE],
                                   type:     this.events[i][E_TYPE],
                                   data:     this.events[i][E_DATA],
                    };
                }
            }
        }
        return e;
    };
    this.changeEventIDs = function(ids) {
        var changed = false;
        var fnChanged = false;
        for(var j=0; j<ids.length; j++) {
            for(var i=0; i<this.events.length; i++) {
                if(this.events[i][E_ID] === ids[j][0]) {
                    changed = true;
                    // change the ID
                    this.events[i][E_ID] = ids[j][1];
                    // change the selected ID
                    var selIndex = this.selectedEvents.indexOf(ids[j][0]);
                    if(selIndex !== -1) {
                        this.selectedEvents[selIndex] = ids[j][1];
                    }
                    // change any other date based on the ID
                    if(this.events[i][E_PAGE] === "note" &&
                       this.events[i][E_DATA].audio) {
                        fnChanged = true;
                    }
                }
            }
            // check if we changed the login event
            if(this.loginEventID === ids[j][0])
                this.loginEventID = ids[j][1];
        }
        if(changed) {
            this.dirty(true);
        }
        if(fnChanged)
            pgFile.renameFileIDs(ids);
    };
    this.getEventFromID = function(id) {
        for(var i=0; i<this.events.length; i++) {
            if(this.events[i][E_ID] === id) {
                return this.events[i];
            }
        }
    };
    this.changeEventAtID = function(id, e, changeID) {
        changeID = changeID!==undefined ? changeID : true;
        for(var i=0; i<this.events.length; i++) {
            if(this.events[i][E_ID] === id) {
                this.events[i] = e;
                if(changeID)
                    this.eventChanged(i);
                return true;
            }
        }
        return false;
    };
    this.addEventDataField = function(id, name, value) {
        var e = this.getEventFromID(id);
        e[E_DATA][name] = value;
        pgUI_showLog(JSON.stringify(e[E_DATA]));
        this.changeEventAtID(id,e);
    };
    // this method should be used to trigger a server update.
    // It is currently implemented by on the server by deleting and creating an event.
    this.eventChanged = function(i) {
        var selected = this.unselectEvent(this.events[i][E_ID]);
        this.deletedEvents[this.deletedEvents.length] = this.events[i];
        this.events[i][E_ID] = this.uniqueEventID();
        if(selected)
            this.selectEvent(this.events[i][E_ID]);
        this.dirty(true);
    };
    this.addEventArray = function(a, selected, serverUpdate) { // a 2D array
        serverUpdate = (typeof(serverUpdate)==="undefined") ? false : serverUpdate;
        for(var j=0; j<a.length; j++) {
            event = a[j];
            if(this.changeEventAtID(event[E_ID], event, !serverUpdate)) {
                continue;
            }
            var i;
            // insert the event at the right time
            for(i=0; i<this.events.length; i++) {
                if(this.events[i][E_START] < event[E_START]) {
                    //showLog("Adding event: " +event[E_ID]+","+event[E_TYPE]);
                    this.events.splice(i,0,event);
                    break;
                }
            }
            if(i === this.events.length) {
                //showLog("Adding event: " +event[E_ID] + ", " + event[E_TYPE]);
                this.events[i] = event;
            }
            if(selected)
                this.selectEvent(event[E_ID]);
        }
        this.dirty(true);
    };
    this.printCSV = function() {
        var events = pg.events;
        var data = "ID,start,duration,category,page,type,data\n";
        for(var i=this.events.length-1; i>=0;  i--) {
            var row = this.events[i][E_ID] + "," +
                this.events[i][E_START] + "," +
                this.events[i][E_DUR] + "," +
                this.events[i][E_CAT] + "," +
                this.events[i][E_PAGE] + "," +
                this.events[i][E_TYPE] + "," +
                JSON.stringify(this.events[i][E_DATA]) + "\n";
            data += row;
        }
        return data;
    };
}

function def(a,b) {
    return (typeof(a) !== 'undefined') ?  a : b;
}

var pgUtil = {
    //timezoneOffset: (new Date()).getTimezoneOffset() * 60 * 1000,
    hex_chr: '0123456789abcdef'.split(''),

    getDateString: function(date, showMS) {
        showMS = typeof(showMS)!=="undefined" ? showMS : true;
        var dateString = "";
        if(typeof(date)==="number")
            date = new Date(date);
        dateString = date.getFullYear() + '-' +
        (date.getMonth() < 9 ? '0' : '')    + (date.getMonth()+1) + '-' +
        (date.getDate() < 10 ? '0' : '')    + date.getDate()      + ' ' +
        (date.getHours() < 10 ? '0' : '')   + date.getHours()     + ':' +
        (date.getMinutes() < 10 ? '0' : '') + date.getMinutes()   + ':' +
        (date.getSeconds() < 10 ? '0' : '') + date.getSeconds();
        if(showMS) {
            dateString += '.' +(date.getMilliseconds() < 100 ? '0' : '') +
                (date.getMilliseconds() < 10  ? '0' : '') +
                date.getMilliseconds();
        }
        return dateString;
    },
    titleCase: function (txt) {
        return txt[0].toUpperCase() + txt.substring(1);
    },
    getCurrentTime: function () {
        var date = new Date();
        return date.getTime();
    },
    parseEvent: function(event) {
        // 1184 ,millis-since-1970 ,work ,note ,annotate ,finally
        var e = {id:        event[E_ID],
                 start:     event[E_START],
                 duration:  event[E_DUR],
                 category:  event[E_CAT],
                 page:      event[E_PAGE],
                 type:      event[E_TYPE],
                 data:      event[E_DATA]
        };
        return e;
    },
    unparseEvent: function(e) {
        // 1184 ,millis-since-1970 ,work ,note ,annotate ,finally
        var event = [];
        event[E_ID]    = e.id;
        event[E_START] = e.start;
        event[E_DUR]   = e.duration;
        event[E_CAT]   = e.category;
        event[E_PAGE]  = e.page;
        event[E_TYPE]  = e.type;
        event[E_DATA]  = e.data;
        return event;
    },
    //getDateString: function(ms) {
    //    var d = new Date(ms - pgUtil.timezoneOffset);
    //    // 2014-09-11T02:32:36.955Z
    //    var s = d.toISOString().slice(0, 23).replace('T', ' ');
    //    return s;
    //},
    getStringFromMS: function(ms, displayMillis) {
        displayMillis = (typeof(displayMillis)!=="undefined") ? displayMillis : false;
        var zpad = function(no, digits) {
            no = no.toString();
            while(no.length < digits)
                no = '0' + no;
            return no;
        };
        var e = {};
        e.milliseconds = ms % 1000;
        ms = Math.floor(ms / 1000);
        e.seconds = ms % 60;
        ms = Math.floor(ms / 60);
        e.minutes = ms % 60;
        ms = Math.floor(ms / 60);
        e.hours = ms % 24;
        ms = Math.floor(ms / 24);
        e.days = ms;

        var ans;
        // add seconds
        if(e.days || e.hours || e.minutes) {
            ans = zpad(e.seconds,2);
        }
        else {
            ans = e.seconds;
        }
        // add minutes
        if(e.days || e.hours) {
            ans = zpad(e.minutes,2) + ":" + ans;
        }
        else if(e.minutes) {
            ans = e.minutes + ":" + ans;
        }
        // add hours
        if(e.days) {
            ans = zpad(e.hours,2) + ":" + ans;
        }
        else if(e.hours) {
            ans = e.hours + ":" + ans;
        }
        // add days
        if(e.days) {
            ans = e.days + ":" + ans;
        }
        // add milliseconds at centisecond resolution
        if(e.milliseconds && displayMillis)
            ans += "." + zpad(Math.floor(e.milliseconds/10),2);
        return ans;
    },
    getMSFromString: function(s) {
        var dhms = s.split(":");
        var len = dhms.length;
        var msec=0, sec=0, min=0, hour=0, day=0;
        if (dhms.length > 0) {
            var seconds = dhms[len-1].split(".");
            sec = getValFromField(seconds[0]);
            if(seconds.length > 1)
                msec = getValFromField(seconds[1]) * Math.pow(10,3-seconds[1].length);
        }
        if (dhms.length > 1) {
            min  = getValFromField(dhms[len-2]);
        }
        if (dhms.length > 2) {
            hour = getValFromField(dhms[len-3]);
        }
        if (dhms.length > 3) {
            day  = getValFromField(dhms[len-4]);
        }
        var ans = msec + sec*1000 + min*60*1000 + hour*60*60*1000 + day*24*60*60*1000;
        return ans;
        function getValFromField(field) {
            var val = 0;
            if(field!=="")
                val = parseInt(field);
            return val;
        }
    },
    randomInt: function(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    norm: function(arr) {
        var n = 0;
        for(var i=0; i<arr.length; i++) {
            n += arr[i]*arr[i];
        }
        return Math.sqrt(n);
    },
    deepCopy: function(a) {
        return JSON.parse(JSON.stringify(a));
    },
    arraysIdentical: function(a, b) {
        var i = a.length;
        if (i !== b.length) return false;
        while (i--) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    },

    equal : function (value, other) {
        // Get the value type
        var type = Object.prototype.toString.call(value);
        // If the two objects are not the same type, return false
        if (type !== Object.prototype.toString.call(other)) return false;
        // If items are not an object or array, return false
        if (['[object Array]', '[object Object]'].indexOf(type) < 0) return false;
        // Compare the length of the length of the two items
        var valueLen = type === '[object Array]' ? value.length : Object.keys(value).length;
        var otherLen = type === '[object Array]' ? other.length : Object.keys(other).length;
        if (valueLen !== otherLen) return false;
        // Compare two items
        var compare = function (item1, item2) {
            // Get the object type
            var itemType = Object.prototype.toString.call(item1);
            // If an object or array, compare recursively
            if (['[object Array]', '[object Object]'].indexOf(itemType) >= 0) {
                if (!pgUtil.equal(item1, item2)) return false;
            }
            // Otherwise, do a simple comparison
            else {
                // If the two items are not the same type, return false
                if (itemType !== Object.prototype.toString.call(item2)) return false;
                // Else if it's a function, convert to a string and compare
                // Otherwise, just compare
                if (itemType === '[object Function]') {
                    if (item1.toString() !== item2.toString()) return false;
                } else {
                    if (item1 !== item2) return false;
                }
            }
        };
        // Compare properties
        if (type === '[object Array]') {
            for (var i = 0; i < valueLen; i++) {
                if (compare(value[i], other[i]) === false) return false;
            }
        } else {
            for (var key in value) {
                if (value.hasOwnProperty(key)) {
                    if (compare(value[key], other[key]) === false) return false;
                }
            }
        }
        // If nothing failed, return true
        return true;
    },
    encode: function(pgo, doMD5) {
        var s = {"username":       pgo.username,
                 "cert":           pgo.cert,
                 "certExpiration": pgo.certExpiration,
                 "category":       pgo.category(),
                 "categories":     pgo.categories,
                 "page":           pgo.page(),
                 "pages":          pgo.pages,
                 "server":         pgo.server,
                 "useServer":      pgo.useServer,
                 "loggedIn":       pgo.loggedIn,
                 "categoryData":   encodeData(pgo.categoryData, doMD5),
                 "pageData":       encodeData(pgo.pageData, doMD5),
                 "dirtyFlag":      pgo.dirtyFlag,
                 "mtime":          pgo.mtime,
                 "version":        pgo.version
                 //"online":         pgo.online,
                 //"events",         pgo.events,
                 //"deletedEvents",  pgo.deletedEvents,
                 //"selectedEvents", pgo.selectedEvents,
        };
        return JSON.stringify(s);
        function encodeData(data, doMD5) {
            var ans = {};
            for(var field in data) {
                if(doMD5) { // && data[field].substring(0,5)=="data:")
                    ans[field] = {};
                    var j = JSON.stringify(data[field].data);
                    ans[field]['data']  = "md5:" + pgUtil.md5(j);
                    ans[field]['mtime'] = data[field].mtime;
                }
                else {
                    ans[field] = data[field];
                }
            }
            return ans;
        }
    },
    decode: function(string) {
        var s = JSON.parse(string);
        var mypg = new PG();
        mypg.username        = s.username;
        mypg.cert            = s.cert;
        mypg.certExpiration  = s.certExpiration;
        mypg.email           = s.email;
        mypg.categories      = s.categories;
        mypg.pages           = s.pages;
        mypg.server          = s.server;
        mypg.useServer       = s.useServer;
        mypg.loggedIn        = s.loggedIn;
        mypg.categoryData    = s.categoryData;
        mypg.pageData        = s.pageData;
        mypg.dirtyFlag       = s.dirtyFlag;
        mypg.mtime           = s.mtime;
        mypg.setCurrentCategory(s.category);
        mypg.setCurrentPage(s.page);
        // don't decode the version.
        return mypg;
        //mypg.online          = s.online,
        //mypg.events          = s.events;
        //mypg.deletedEvents   = s.deletedEvents;
        //mypg.selectedEvents  = s.selectedEvents;
    },
    escape: function(str, encodeForJS, encodeForText) {
        encodeForJS = encodeForJS!==undefined ? encodeForJS : false;
        encodeForText = encodeForText!==undefined ? encodeForText : true;
        var div = $.parseHTML('<div></div>');
        if(encodeForText)
            $(div).append(document.createTextNode(str));
        else
            $(div).append($.parseHTML(str));
        var txt =  div[0].innerHTML;
        if(encodeForJS) { // needed for onclick handlers
            txt = txt.replace(RegExp("'","g"), "\\&#39;");
            txt = txt.replace(RegExp("\r\n","g"),"\\&#10;");
            txt = txt.replace(RegExp("\n","g"),"\\&#10;");
        }
        return txt;
    },
    unescape: function(escapedStr) {
        var div = document.createElement('div');
        div.innerHTML = escapedStr;
        var child = div.childNodes[0];
        return child ? child.nodeValue : '';
    },
    extractDomain: function(url) {
        var domain;
        //find & remove protocol (http, ftp, etc.) and get domain
        if (url.indexOf("://") > -1) {
            domain = url.split('/')[2];
        }
        else {
            domain = url.split('/')[0];
        }
        //find & remove port number
        domain = domain.split(':')[0];
        return domain;
    },
    isWebBrowser: function() {
        var browser = true; //document.URL.match(/^https?:/);
        if((typeof(device) !== "undefined") &&
           (device.platform==="Android" || device.platform==="iOS"))
            browser = false;
        return browser;
    },
    openWeb: function(url) {
        if(pgUtil.isWebBrowser()) {
            var w = window.open(url, '_blank');//, 'location=no');
            if(url.substr(url.length-4, url.length-1) === ".mp3") {
                html = "<html><head><style type=\"text/css\">" +
                    "body {background-color: transparent;" +
                    "color: white;}" +
                    "</style></head>" +
                    "<body style=\"margin:0\">" +
                    "<embed id=\"yt\" src=\"" + url +
                    "width=\"%0.0f\" height=\"%0.0f\"></embed>" +
                    "</body></html>";
                w.document.write(html);
            }
        }
        else {
            //cordova.exec(null, null, "InAppBrowser", "open", [url, "_system"]);
            //server "<a href='https://psygraph.com'>visit psygraph.com</a> .</p>",
            cordova.InAppBrowser.open(url, '_blank', 'location=no');
            //window.open(url,"_system");
        }
        return false;
    },
    executeAsync: function(func) {
        setTimeout(func, 0);
    },
    wait: function(time, type) {
        time = time || 200;
        type = type || "fx";
        return this.queue(type, function() {
                var self = this;
                setTimeout(function() {
                        $(self).dequeue();
                    }, time);
            });
    },
    sameType: function(a,b) {
        if(a === "*" || b === "*" || a === b)
            return true;
        return false;
    },
    displayEventData: function(e) {
        return UI[pg.page()].displayEventData(e);
    },
    md5: function(s) {
        return hex(md51(s));

        function md51(s) {
            var txt = '';
            var n = s.length,
                state = [1732584193, -271733879, -1732584194, 271733878], i;
            for (i=64; i<=s.length; i+=64) {
                md5cycle(state, md5blk(s.substring(i-64, i)));
            }
            s = s.substring(i-64);
            var tail = [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];
            for (i=0; i<s.length; i++)
                tail[i>>2] |= s.charCodeAt(i) << ((i%4) << 3);
            tail[i>>2] |= 0x80 << ((i%4) << 3);
            if (i > 55) {
                md5cycle(state, tail);
                for (i=0; i<16; i++) tail[i] = 0;
            }
            tail[14] = n*8;
            md5cycle(state, tail);
            return state;
        }

        function md5cycle(x, k) {
            var a = x[0], b = x[1], c = x[2], d = x[3];

            a = ff(a, b, c, d, k[0], 7, -680876936);
            d = ff(d, a, b, c, k[1], 12, -389564586);
            c = ff(c, d, a, b, k[2], 17,  606105819);
            b = ff(b, c, d, a, k[3], 22, -1044525330);
            a = ff(a, b, c, d, k[4], 7, -176418897);
            d = ff(d, a, b, c, k[5], 12,  1200080426);
            c = ff(c, d, a, b, k[6], 17, -1473231341);
            b = ff(b, c, d, a, k[7], 22, -45705983);
            a = ff(a, b, c, d, k[8], 7,  1770035416);
            d = ff(d, a, b, c, k[9], 12, -1958414417);
            c = ff(c, d, a, b, k[10], 17, -42063);
            b = ff(b, c, d, a, k[11], 22, -1990404162);
            a = ff(a, b, c, d, k[12], 7,  1804603682);
            d = ff(d, a, b, c, k[13], 12, -40341101);
            c = ff(c, d, a, b, k[14], 17, -1502002290);
            b = ff(b, c, d, a, k[15], 22,  1236535329);

            a = gg(a, b, c, d, k[1], 5, -165796510);
            d = gg(d, a, b, c, k[6], 9, -1069501632);
            c = gg(c, d, a, b, k[11], 14,  643717713);
            b = gg(b, c, d, a, k[0], 20, -373897302);
            a = gg(a, b, c, d, k[5], 5, -701558691);
            d = gg(d, a, b, c, k[10], 9,  38016083);
            c = gg(c, d, a, b, k[15], 14, -660478335);
            b = gg(b, c, d, a, k[4], 20, -405537848);
            a = gg(a, b, c, d, k[9], 5,  568446438);
            d = gg(d, a, b, c, k[14], 9, -1019803690);
            c = gg(c, d, a, b, k[3], 14, -187363961);
            b = gg(b, c, d, a, k[8], 20,  1163531501);
            a = gg(a, b, c, d, k[13], 5, -1444681467);
            d = gg(d, a, b, c, k[2], 9, -51403784);
            c = gg(c, d, a, b, k[7], 14,  1735328473);
            b = gg(b, c, d, a, k[12], 20, -1926607734);

            a = hh(a, b, c, d, k[5], 4, -378558);
            d = hh(d, a, b, c, k[8], 11, -2022574463);
            c = hh(c, d, a, b, k[11], 16,  1839030562);
            b = hh(b, c, d, a, k[14], 23, -35309556);
            a = hh(a, b, c, d, k[1], 4, -1530992060);
            d = hh(d, a, b, c, k[4], 11,  1272893353);
            c = hh(c, d, a, b, k[7], 16, -155497632);
            b = hh(b, c, d, a, k[10], 23, -1094730640);
            a = hh(a, b, c, d, k[13], 4,  681279174);
            d = hh(d, a, b, c, k[0], 11, -358537222);
            c = hh(c, d, a, b, k[3], 16, -722521979);
            b = hh(b, c, d, a, k[6], 23,  76029189);
            a = hh(a, b, c, d, k[9], 4, -640364487);
            d = hh(d, a, b, c, k[12], 11, -421815835);
            c = hh(c, d, a, b, k[15], 16,  530742520);
            b = hh(b, c, d, a, k[2], 23, -995338651);

            a = ii(a, b, c, d, k[0], 6, -198630844);
            d = ii(d, a, b, c, k[7], 10,  1126891415);
            c = ii(c, d, a, b, k[14], 15, -1416354905);
            b = ii(b, c, d, a, k[5], 21, -57434055);
            a = ii(a, b, c, d, k[12], 6,  1700485571);
            d = ii(d, a, b, c, k[3], 10, -1894986606);
            c = ii(c, d, a, b, k[10], 15, -1051523);
            b = ii(b, c, d, a, k[1], 21, -2054922799);
            a = ii(a, b, c, d, k[8], 6,  1873313359);
            d = ii(d, a, b, c, k[15], 10, -30611744);
            c = ii(c, d, a, b, k[6], 15, -1560198380);
            b = ii(b, c, d, a, k[13], 21,  1309151649);
            a = ii(a, b, c, d, k[4], 6, -145523070);
            d = ii(d, a, b, c, k[11], 10, -1120210379);
            c = ii(c, d, a, b, k[2], 15,  718787259);
            b = ii(b, c, d, a, k[9], 21, -343485551);

            x[0] = add32(a, x[0]);
            x[1] = add32(b, x[1]);
            x[2] = add32(c, x[2]);
            x[3] = add32(d, x[3]);
        }
        function cmn(q, a, b, x, s, t) {
            a = add32(add32(a, q), add32(x, t));
            return add32((a << s) | (a >>> (32 - s)), b);
        }
        function ff(a, b, c, d, x, s, t) {
            return cmn((b & c) | ((~b) & d), a, b, x, s, t);
        }
        function gg(a, b, c, d, x, s, t) {
            return cmn((b & d) | (c & (~d)), a, b, x, s, t);
        }
        function hh(a, b, c, d, x, s, t) {
            return cmn(b ^ c ^ d, a, b, x, s, t);
        }
        function ii(a, b, c, d, x, s, t) {
            return cmn(c ^ (b | (~d)), a, b, x, s, t);
        }
        function md5blk(s) {
            var md5blks = [], i;
            for (i=0; i<64; i+=4) {
                md5blks[i>>2] = s.charCodeAt(i)
                    + (s.charCodeAt(i+1) << 8)
                    + (s.charCodeAt(i+2) << 16)
                    + (s.charCodeAt(i+3) << 24);
            }
            return md5blks;
        }
        function rhex(n) {
            var s='', j=0;
            for(; j<4; j++)
                s += pgUtil.hex_chr[(n >> (j * 8 + 4)) & 0x0F]
                    + pgUtil.hex_chr[(n >> (j * 8)) & 0x0F];
            return s;
        }
        function hex(x) {
            for (var i=0; i<x.length; i++)
                x[i] = rhex(x[i]);
            return x.join('');
        }

        function add32(x, y) {
            //if (md5('hello') != '5d41402abc4b2a76b9719d911017c592') {
            //    var lsw = (x & 0xFFFF) + (y & 0xFFFF),
            //    msw = (x >> 16) + (y >> 16) + (lsw >> 16);
            //    return (msw << 16) | (lsw & 0xFFFF);
            //}
            //else {
            return (x+y) & 0xFFFFFFFF;
            //}
        }
    },
    // The following base64 code is a combination of an encoder and decoder.
    // The decoder piece needs the following copyright. -arogers

    /*
      Copyright (c) 2011, Daniel Guerrero
      All rights reserved.
      Redistribution and use in source and binary forms, with or without
      modification, are permitted provided that the following conditions are met:
      * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
      * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
      THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
      ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
      WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
      DISCLAIMED. IN NO EVENT SHALL DANIEL GUERRERO BE LIABLE FOR ANY
      DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
      (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
      LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
      ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
      (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
      SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
    */

    base64: {

        chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
        encLookup: [],

        init: function() {
            if(this.encLookup.length == 0) {
                for (var i=0; i<4096; i++) {
                    this.encLookup[i] = this.chars[i >> 6] + this.chars[i & 0x3F];
                }
            }
        },
        encode: function(src) {
            this.init();
            var len = src.length;
            var dst = '';
            var i = 0;
            while (len > 2) {
                var n = (src[i] << 16) | (src[i+1]<<8) | src[i+2];
                dst+= this.encLookup[n >> 12] + this.encLookup[n & 0xFFF];
                len-= 3;
                i+= 3;
            }
            if (len > 0) {
                var n1= (src[i] & 0xFC) >> 2;
                var n2= (src[i] & 0x03) << 4;
                if (len > 1) n2 |= (src[++i] & 0xF0) >> 4;
                dst+= this.chars[n1];
                dst+= this.chars[n2];
                if (len == 2) {
                    var n3= (src[i++] & 0x0F) << 2;
                    n3 |= (src[i] & 0xC0) >> 6;
                    dst+= this.chars[n3];
                }
                if (len == 1) dst+= '=';
                dst+= '=';
            }
            return dst;
        },
        // will return a  Uint8Array type
        decodeArrayBuffer: function(input) {
            var bytes = (input.length/4) * 3;
            var ab = new ArrayBuffer(bytes);
            this.decode(input, ab);

            return ab;
        },
        decode: function(input, arrayBuffer) {
            this.init();
            //get last chars to see if are valid
            var lkey1 = this.chars.indexOf(input.charAt(input.length-1));
            var lkey2 = this.chars.indexOf(input.charAt(input.length-2));

            var bytes = (input.length/4) * 3;
            if (lkey1 == 64) bytes--; //padding chars, so skip
            if (lkey2 == 64) bytes--; //padding chars, so skip

            var uarray;
            var chr1, chr2, chr3;
            var enc1, enc2, enc3, enc4;
            var i = 0;
            var j = 0;

            if (arrayBuffer)
                uarray = new Uint8Array(arrayBuffer);
            else
                uarray = new Uint8Array(bytes);

            input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

            for (i=0; i<bytes; i+=3) {
                //get the 3 octects in 4 ascii chars
                enc1 = this.chars.indexOf(input.charAt(j++));
                enc2 = this.chars.indexOf(input.charAt(j++));
                enc3 = this.chars.indexOf(input.charAt(j++));
                enc4 = this.chars.indexOf(input.charAt(j++));

                chr1 = (enc1 << 2) | (enc2 >> 4);
                chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                chr3 = ((enc3 & 3) << 6) | enc4;

                uarray[i] = chr1;
                if (enc3 != 64) uarray[i+1] = chr2;
                if (enc4 != 64) uarray[i+2] = chr3;
            }
            return uarray;
        }
    }
};

function nl2br (str, is_xhtml) {
    var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br />' : '<br>';
    return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1'+ breakTag +'$2');
}

String.prototype.capitalizeFirstLetter = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
};
