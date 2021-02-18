import {pgUtil, pgDebug} from './util';
import {Page} from './pages/page';

// Events are in arrays for speed, so we define these constants
// to manipulate them by index
export const E_ID = 0;
export const E_START = 1;
export const E_DUR = 2;
export const E_CAT = 3;
export const E_PAGE = 4;
export const E_TYPE = 5;
export const E_DATA = 6;

export class PG {
    pages = ['home', 'stopwatch', 'counter', 'timer', 'note', 'list', 'graph', 'map', 'categories', 'preferences', 'login', 'about'];
    eventPages = ['home', 'stopwatch', 'counter', 'timer', 'note'];
    username = null;
    cert = null;
    certExpiration = null;
    categoryIndex = null;
    pageIndex = null;
    categories = null;
    categoryText = {};
    categorySound = {};
    pageData = null;
    online = null;
    background = null;
    server = null;
    useServer = null;
    loggedIn = null;
    dirtyFlag = null;
    mtime = null;
    lastSync = null;
    events = null;
    deletedEvents = null;
    selectedEvents = null;
    version = 0.87;
    loginEventID = 0;
    readOnly = false;
    deleteAudioFileCB = null;
    
    init() {
        this.username = '';
        this.cert = '';
        this.certExpiration = 0;
        this.categoryIndex = 0;
        this.pageIndex = 0;
        this.categories = ['Uncategorized', 'Meditate', 'Exercise', 'Study'];
        this.categoryText = {};
        this.categorySound = {};
        this.pageData = {
            'home': nd(),
            'stopwatch': nd(),
            'counter': nd(),
            'timer': nd(),
            'note': nd(),
            'list': nd(),
            'map': nd(),
            'graph': nd(),
            'categories': nd(),
            'preferences': nd(),
            'login': nd(),
            'about': nd()
        };
        this.online = true;
        this.background = false;
        this.server = '';
        this.useServer = false;
        this.loggedIn = false;
        this.dirtyFlag = false;
        this.mtime = 0;
        this.lastSync = 0;
        this.initializeEvents();
        function nd() {
            return {'mtime': 0, 'data': {}};
        }
    }
    getCurrentTime() {
        var date = new Date();
        return date.getTime();
    }
    setDirty(set = false) {
        if (set) {
            this.mtime = this.getCurrentTime();
        } else {
            this.lastSync = this.getCurrentTime();
        }
        this.dirtyFlag = set;
    }
    isDirty() {
        return this.dirtyFlag;
    }
    copy(opg, copyEvents = false) {
        this.username = opg.username;
        this.cert = opg.cert;
        this.certExpiration = opg.certExpiration;
        this.online = opg.online;
        this.background = opg.background;
        this.server = opg.server;
        this.useServer = opg.useServer;
        this.loggedIn = opg.loggedIn;
        this.categoryIndex = opg.categoryIndex;
        this.pageIndex = opg.pageIndex;
        this.categories = pgUtil.deepCopy(opg.categories);
        //this.pages          = pgUtil.deepCopy(opg.pages);
        this.dirtyFlag = opg.dirtyFlag;
        this.mtime = opg.mtime;
        this.lastSync = opg.lastSync;
        for (let i = 0; i < pg.pages.length; i++) {
            if (pg.pages[i] in opg.pageData) {
                this.pageData[pg.pages[i]] = pgUtil.deepCopy(opg.pageData[pg.pages[i]]);
            }
        }
        if (copyEvents) {
            this.copyEvents(opg);
        }
    }
    copyEvents(opg) {
        this.events = pgUtil.deepCopy(opg.events);
        this.deletedEvents = pgUtil.deepCopy(opg.deletedEvents);
        this.selectedEvents = pgUtil.deepCopy(opg.selectedEvents);
    }
    copySettings(opg, force) {
        force = force || false;
        if (force || this.mtime <= opg.mtime) {
            // don't over-write new information
            var server = this.server;
            var online = this.online;
            var cert = this.cert;
            var certExpiration = this.certExpiration;
            var loggedIn = this.loggedIn;
            var useServer = this.useServer;
            this.copy(opg);
            this.online = online;
            this.server = server;
            this.cert = cert;
            this.certExpiration = certExpiration;
            this.loggedIn = loggedIn;
            this.useServer = useServer;
        }
    }
    initializeEvents() {
        this.events = [];
        this.deletedEvents = [];
        this.selectedEvents = [];
    }
    getMediaServerURL() {
        return this.server + '/mediaServer.php';
    }
    numCategories() {
        return this.categories.length;
    }
    numPages() {
        return this.pages.length;
    }
    /*
    this.page() {
        if(arguments.length)
            this.pages[this.categoryIndex] = arguments[0];
        return this.pages[this.pageIndex]
    };
    this.category() {
        if(arguments.length)
            this.categories[this.categoryIndex] = arguments[0];
        return this.categories[this.categoryIndex];
    };
    */
    getCategories() {
        return this.categories;
    }
    setCategories(categories) {
        if (!pgUtil.equal(this.categories, categories)) {
            this.categories = categories.slice(0);
            this.setDirty(true);
        }
    }
    getPageData(page) {
        var alldata = this.pageData[page];
        if (!alldata || !alldata.data) {
            alldata = {'mtime': 0, 'data': {}};
        }
        // add categories if necessary
        for(let i=0; i<this.categories.length; i++) {
            if (!alldata.data[this.categories[i]]) {
                alldata.data[this.categories[i]] = {};
            }
        }
        return pgUtil.deepCopy(alldata.data);
    }
    getPageDataCatValue(page, cat, value, def) {
        var data = this.getPageData(page);
        if(cat in data && value in data[cat]) {
            return data[cat][value];
        }
        else {
            return def;
        }
    }
    getPageDataValue(page, value, def) {
        var data = this.getPageData(page);
        if(value in data) {
            return data[value];
        }
        else {
            return def;
        }
    }
    getReadOnly() {
        return this.readOnly;
    }
    setReadOnly(val) {
        this.readOnly = val;
    }
    getPageMtime(page) {
        var data = this.pageData[page];
        if (!data) {
            data = {'mtime': 0, 'data': {}};
        }
        return data['mtime'];
    }
    setPageData(mtime, data, page) {
        if (typeof (this.pageData[page]) === 'undefined') {
            this.pageData[page] = {'mtime': 0, 'data': {}};
        }
        this.pageData[page].mtime = mtime;
        this.pageData[page].data = pgUtil.deepCopy(data);
        if (mtime > this.mtime) {
            this.setDirty(true);
            this.mtime = Math.max(this.mtime, mtime);
        }
    }
    setPageDataForCategory(newPageDataCat, page, cat) {
        let pageData = pg.getPageData(page);
        if (!pgUtil.equal(pageData[cat], newPageDataCat)) {
            const pmtime = pgUtil.getCurrentTime();
            pageData[cat] = newPageDataCat;
            this.setPageData(pmtime, pageData, page);
        }
    }
    getCategoryData() {
        const data = this.getPageData('categories');
        for (let cat in data) {
            if (!('sound' in data[cat])) {
                if(cat=="Meditate") {
                    data[cat].sound = 'singingBowl.mp3';
                } else if (cat=="Exercise") {
                    data[cat].sound = 'bike.mp3';
                } else if (cat=="Study") {
                    data[cat].sound = 'bell.mp3';
                } else {
                    data[cat].sound = 'default.mp3';
                }
            }
            if (!('color' in data[cat])) {
                if(cat=="Meditate") {
                    data[cat].color = [255,238,192];
                } else if (cat=="Exercise") {
                    data[cat].color = [253,255,220];
                } else if (cat=="Study") {
                    data[cat].color = [231,250,255];
                } else {
                    data[cat].color = [255,255,255];
                }
            }
            if (!('text' in data[cat])) {
                if(cat=="Meditate") {
                    data[cat].text = 'lojong.xml';
                } else if (cat=="Exercise") {
                    data[cat].text = 'twain.xml';
                } else if (cat=="Study") {
                    data[cat].text = 'einstein.xml';
                } else {
                    data[cat].text = 'default.xml';
                }
            }
            if (!('calendar' in data[cat])) {
                data[cat].calendar = false;
            }
        }
        return data;
    }
    getCategoryColor(cat) {
        let rgbcolor = 'rgb(255,255,255)';
        const data = this.getCategoryData();
        if ('color' in data[cat]) {
            rgbcolor = "rgb(" + data[cat].color[0] + "," + data[cat].color[1] + "," + data[cat].color[2] + ")";
        }
        return rgbcolor;
    }
    /*
    this.setPages(pages) {
        if(!pgUtil.equal(this.pages, pages)) {
            this.pages = pgUtil.deepCopy(pages);
            this.dirty(true);
        }
    };
    */
    canUploadFiles() {
        if (pgUtil.isWebBrowser) {
            return true;
        }
        let hasWIFI = (pgUtil.navigator.connection.type === pgUtil.connection.WIFI) ||
            (this.getPageDataValue('preferences', 'Uncategorized', 'wifiOnly') === false);
        return (this.loggedIn && this.online && hasWIFI);
    }
    
    eventInfoForFile(src) {
        let info = null;
        if (pgUtil.isRecordedFile(src)) {
            const eid = parseInt(src.substr(2, src.length - 3));
            const e = this.getEventFromID(eid);
            if (e) {
                const event = this.parseEvent(e);
                info = {};
                info.category = event.category;
                info.title = ('title' in event.data) ? event.data.title : '';
                info.text = ('text' in event.data) ? event.data.text : '';
                info.location = '';
                if ('location' in event.data) {
                    info.location = 'Lat: ' + event.data.location[0][1] + ', Lng: ' + event.data.location[0][2];
                }
                info.id = eid;
            }
        }
        return info;
    }
    event(n) {
        return this.events[n];
    }
    getEvents(cat) {
        var e = [];
        for (var i = 0; i < this.events.length; i++) {
            if (pgUtil.sameType(this.events[i][E_CAT], cat)) {
                e.push(this.events[i]);
            }
        }
        return e;
    }
    getEventsInPage(page, cat) {
        var e = [];
        for (var i = 0; i < this.events.length; i++) {
            if (pgUtil.sameType(this.events[i][E_CAT], cat) && this.events[i][E_PAGE] === page) {
                e.push(this.events[i]);
            }
        }
        return e;
    }
    getEventIDsInPage(page, cat) {
        var e = [];
        for (var i = 0; i < this.events.length; i++) {
            if (pgUtil.sameType(this.events[i][E_CAT], cat) && this.events[i][E_PAGE] === page) {
                e.push(this.events[i][E_ID]);
            }
        }
        return e;
    }
    getSelectedEvents(cat) {
        var events = [];
        for (var i = 0; i < this.selectedEvents.length; i++) {
            var event = this.getEventFromID(this.selectedEvents[i]);
            if (!event) {
                var id = this.selectedEvents[i];
                pgDebug.showLog('CANNOT FIND SELECTED EVENT: ' + id);
                this.unselectEvent(id);
            } else if (pgUtil.sameType(event[E_CAT], cat)) {
                events[events.length] = event;
            }
        }
        return events;
    }
    getSelectedEventIDs(cat) {
        var ids = [];
        var events = this.getSelectedEvents(cat);
        for (var i = 0; i < events.length; i++) {
            ids[ids.length] = events[i][E_ID];
        }
        return ids;
    }
    selectEventsFromTime(time) {
        for (var i = 0; i < this.events.length; i++) {
            if (this.events[i][E_START] >= time) {
                this.selectEvent(this.events[i][E_ID]);
            } else {
                break;
            }
        }
    }
    isEventSelected(id) {
        return this.selectedEvents.indexOf(id) !== -1;
    }
    selectEvents(ids) {
        if (typeof (ids) === 'string') {
            for (var i = 0; i < this.events.length; i++) {
                if (pgUtil.sameType(this.events[i][E_CAT], ids)) {
                    this.selectEvent(this.events[i][E_ID]);
                }
            }
        } else {
            if (!ids.length) {
                ids = [ids];
            }
            for (var j = 0; j < ids.length; j++) {
                this.selectEvent(ids[j]);
            }
        }
    }
    selectEvent(id) {
        if (this.selectedEvents.indexOf(id) === -1) {
            this.setDirty(true);
            this.selectedEvents[this.selectedEvents.length] = id;
        }
    }
    unselectEvents(ids) {
        if (typeof (ids) === 'string') {
            var type = ids;
            for (var i = 0; i < this.events.length; i++) {
                if (pgUtil.sameType(this.events[i][E_CAT], type)) {
                    this.unselectEvent(this.events[i][E_ID]);
                }
            }
        } else {
            if (!ids.length) {
                ids = [ids];
            }
            for (var j = 0; j < ids.length; j++) {
                this.unselectEvent(ids[j]);
            }
        }
    }
    unselectEvent(id) {
        var i = this.selectedEvents.indexOf(id);
        if (i !== -1) {
            this.setDirty(true);
            this.selectedEvents.splice(i, 1);
            return true;
        }
        return false;
    }
    changeEventCategory(ids, cat) {
        for (var i = this.events.length - 1; i >= 0; i--) {
            if (ids.indexOf(this.events[i][E_ID]) !== -1) {
                this.events[i][E_CAT] = cat;
                this.eventChanged(i);
            }
        }
    }
    deleteEventIDs(ids, deleteOnServer = true) {
        for (var j = 0; j < ids.length; j++) {
            for (var i = this.events.length - 1; i >= 0; i--) {
                if (this.events[i][E_ID] === ids[j]) {
                    //showLog("Deleting event: " +this.events[i][3] + ", " + ids[j].toString());
                    this.unselectEvent(this.events[i][E_ID]);
                    if (this.events[i][E_PAGE] === 'note' && this.events[i][E_DATA].audio) {
                        this.deleteAudioFileCB(pgUtil.getRecordFilename(this.events[i][E_ID], this.events[i][E_DATA].audio));
                    }
                    var e = this.events.splice(i, 1)[0];
                    if (deleteOnServer) {
                        this.deletedEvents[this.deletedEvents.length] = e;
                    }
                    break;
                }
            }
        }
        this.setDirty(true);
    }
    deleteDeletedEventIDs(ids) {
        for (var j = 0; j < ids.length; j++) {
            for (var i = this.deletedEvents.length - 1; i >= 0; i--) {
                if (this.deletedEvents[i][E_ID] === ids[j]) {
                    this.deletedEvents.splice(i, 1);
                    break;
                }
            }
        }
        this.setDirty(true);
    }
    isIDUnique(id) {
        for (var i = 0; i < this.events.length; i++) {
            if (id === this.events[i][E_ID]) {
                return false;
            }
        }
        return true;
    }
    uniqueEventID() {
        let id;
        do {
            // we generate negative numbers, to distinguish from (positive) SQL IDs
            id = 0 - Math.floor(Math.random() * (1 << 15));
        } while (!this.isIDUnique(id));
        return id;
    }
    updateLoginEvent(event) { // modify the event that corresponds to this session
        if (this.loginEventID) { // check if same category
            var e = this.getEventFromID(this.loginEventID);
            if (!e || e[E_CAT] !== event.category) {
                this.loginEventID = 0;
            }
        }
        if (!this.loginEventID) {
            this.loginEventID = this.uniqueEventID();
            event.id = this.loginEventID;
            this.addNewEvents(event, true);
        } else {
            event.id = this.loginEventID;
            var eventA = this.createEventA(this.addEventDefaults(event));
            this.changeEventAtID(this.loginEventID, eventA, false);
        }
    }
    addEventDefaults(event) {
        pgDebug.assert('category' in event, 'no category');
        pgDebug.assert('page' in event, 'no page');
        if (!('duration' in event)) {
            event.duration = 0;
        }
        if (!('data' in event)) {
            event.data = {};
        }
        return event;
    }
    createEventA(e) {
        var eventA = [e.id, e.start, e.duration, e.category, e.page, e.type, e.data];
        return eventA;
    }
    createEventS(e) {
        var eventS = {
            id: e[E_ID], start: e[E_START], duration: e[E_DUR], category: e[E_CAT], page: e[E_PAGE], type: e[E_TYPE], data: e[E_DATA]
        };
        return eventS;
    }
    addEvents(events, selected) { // an array of structures
        var out = [];
        for (var i = 0; i < events.length; i++) {
            let e = events[i];
            if (!e.id) {
                e.id = this.uniqueEventID();
            }
            var event = this.unparseEvent(e);
            out[i] = event;
        }
        this.addEventArray(out, selected);
    }
    addNewEvents(e, selected) {
        if (!(e instanceof Array)) {
            e = [e];
        }
        for (var i = 0; i < e.length; i++) {
            pgDebug.assert('category' in e[i], 'no category');
            pgDebug.assert('page' in e[i], 'no page');
            if (!('start' in e[i])) {
                e[i].start = pgUtil.getCurrentTime();
            }
            if (!('duration' in e[i])) {
                e[i].duration = 0;
            }
            if (!('data' in e[i])) {
                e[i].data = {};
            }
        }
        this.addEvents(e, selected);
    }
    addNonduplicateEvents(e, selected) {
        if (!Array.isArray(e)) {
            e = [e];
        }
        for (var i = e.length-1; i >= 0; i--) {
            let existE = this.getEventsAtTime(e[i].start, e[i].category);
            for (var j = 0; j < existE.length; j++) {
                if(e[i].type === existE[j].type) {
                    let removed = e.splice(i,1);
                    pgDebug.showWarn('Removed event: ' + JSON.stringify(removed));
                    // add any new data fields (e.g. mindful survey response)
                    for(let field in removed.data) {
                        if(!(field in existE[j].data)) {
                            existE[j].data[field] = removed.data[field];
                        }
                    }
                    this.changeEventAtID(existE[j].id, existE[j], false);
                }
            }
        }
        this.addNewEvents(e, selected);
    }
    /*
    this.getEventIDsInRange(startTime, endTime) {
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
    mostRecentEvent(category, page) {
        var e = null;
        for (var i = 0; i < this.events.length; i++) {
            if (pgUtil.sameType(this.events[i][E_CAT], category) && this.events[i][E_PAGE] === page) {
                e = this.parseEvent(this.events[i]);
                break;
            }
        }
        return e;
    }
    getEventsAtTime(time, cat) {
        if (time < 0) {
            pgDebug.showError('Invalid query at a negative time.');
            return [];
        }
        var e = [];
        for (var i = this.events.length - 1; i >= 0; i--) {
            if (this.events[i][E_START] >= time && pgUtil.sameType(this.events[i][E_CAT], cat)) {
                if (e.length && (e[0].start !== this.events[i][E_START])) {
                    break;
                } else {
                    e[e.length] = {
                        id: this.events[i][E_ID],
                        start: this.events[i][E_START],
                        duration: this.events[i][E_DUR],
                        category: this.events[i][E_CAT],
                        page: this.events[i][E_PAGE],
                        type: this.events[i][E_TYPE],
                        data: this.events[i][E_DATA]
                    };
                }
            }
        }
        return e;
    }
    changeEventIDs(ids, callback) {
        var changed = false;
        var fnChanged = false;
        for (var j = 0; j < ids.length; j++) {
            for (var i = 0; i < this.events.length; i++) {
                if (this.events[i][E_ID] === ids[j][0]) {
                    changed = true;
                    // change the ID
                    this.events[i][E_ID] = ids[j][1];
                    // change the selected ID
                    var selIndex = this.selectedEvents.indexOf(ids[j][0]);
                    if (selIndex !== -1) {
                        this.selectedEvents[selIndex] = ids[j][1];
                    }
                    // change any other date based on the ID
                    if (this.events[i][E_PAGE] === 'note' && this.events[i][E_DATA].audio) {
                        fnChanged = true;
                    }
                }
            }
            // check if we changed the login event
            if (this.loginEventID === ids[j][0]) {
                this.loginEventID = ids[j][1];
            }
        }
        if (changed) {
            this.setDirty(true);
        }
        if (fnChanged) {
            callback(ids);
        }
    }
    getEventFromID(id) {
        for (var i = 0; i < this.events.length; i++) {
            if (this.events[i][E_ID] === id) {
                return this.events[i];
            }
        }
        return null;
    }
    changeEventAtID(id, e, changeID = true) {
        for (var i = 0; i < this.events.length; i++) {
            if (this.events[i][E_ID] === id) {
                this.events[i] = e;
                if (changeID) {
                    this.eventChanged(i);
                }
                return true;
            }
        }
        return false;
    }
    addEventDataField(id, name, value) {
        var e = this.getEventFromID(id);
        e[E_DATA][name] = value;
        //pgDebug.showLog(JSON.stringify(e[E_DATA]));
        this.changeEventAtID(id, e);
    }
    // this method should be used to trigger a server update.
    // It is currently implemented by on the server by deleting and creating an event.
    eventChanged(i) {
        var selected = this.unselectEvent(this.events[i][E_ID]);
        this.deletedEvents[this.deletedEvents.length] = this.events[i];
        this.events[i][E_ID] = this.uniqueEventID();
        if (selected) {
            this.selectEvent(this.events[i][E_ID]);
        }
        this.setDirty(true);
    }
    addEventArray(a, selected, serverUpdate = false) { // a 2D array
        for (var j = 0; j < a.length; j++) {
            let event = a[j];
            if (this.changeEventAtID(event[E_ID], event, !serverUpdate)) {
                continue;
            }
            var i;
            // insert the event at the right time
            for (i = 0; i < this.events.length; i++) {
                if (this.events[i][E_START] < event[E_START] ||
                    (this.events[i][E_START] === event[E_START] && this.events[i][E_DUR] < event[E_DUR]) ) {
                    //showLog("Adding event: " +event[E_ID]+","+event[E_TYPE]);
                    this.events.splice(i, 0, event);
                    break;
                }
            }
            if (i === this.events.length) {
                //showLog("Adding event: " +event[E_ID] + ", " + event[E_TYPE]);
                this.events.push(event);
            }
            if (selected) {
                this.selectEvent(event[E_ID]);
            }
        }
        this.setDirty(true);
    }
    printCSV() {
        var events = this.events;
        var data = 'ID,start,duration,category,page,type,data\n';
        for (var i = this.events.length - 1; i >= 0; i--) {
            let encdata = JSON.stringify(this.events[i][E_DATA]);
            encdata = '"' + encdata.replace(/\"/g, "'") + '"';
            var row = this.events[i][E_ID] + ',' + this.events[i][E_START] + ',' + this.events[i][E_DUR] + ',' + this.events[i][E_CAT] + ',' + this.events[i][E_PAGE] + ',' + this.events[i][E_TYPE] + ',' + encdata + '\n';
            data += row;
        }
        return data;
    }
    printJSON() {
        var data = JSON.stringify(this.events);
        return data;
    }
    parseEvent(event) {
        // 1184 ,millis-since-1970 ,work ,note ,annotate ,finally
        var e = {
            id: event[E_ID],
            start: event[E_START],
            duration: event[E_DUR],
            category: event[E_CAT],
            page: event[E_PAGE],
            type: event[E_TYPE],
            data: event[E_DATA]
        };
        return e;
    }
    unparseEvent(e) {
        // 1184 ,millis-since-1970 ,work ,note ,annotate ,finally
        var event = [];
        event[E_ID] = e.id;
        event[E_START] = e.start;
        event[E_DUR] = e.duration;
        event[E_CAT] = e.category;
        event[E_PAGE] = e.page;
        event[E_TYPE] = e.type;
        event[E_DATA] = e.data;
        return event;
    }
}

export const pg = new PG();

/*
function def(a,b) {
    return (typeof(a) !== 'undefined') ?  a : b;
}
function nl2br (str, is_xhtml) {
    var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br />' : '<br>';
    return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1'+ breakTag +'$2');
}
capitalizeFirstLetter() {
    return this.charAt(0).toUpperCase() + this.slice(1);
};
*/
