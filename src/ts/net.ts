import {pg, PG} from './pg';
import {pgUtil, pgDebug} from './util';
import {pgUI} from './ui';
import {pgFile} from './file';
import {pgXML} from './xml';
import * as $ from 'jquery';

export class PGNet {
    allowNetwork = false;
    startTime = 0;
    numTimeouts = 0;
    servers = [];
    
    constructor() {
        this.allowNetwork = true;
        this.startTime = pgUtil.getCurrentTime();
        // set the online status
        if (pgUtil.connection) {
            if (pgUtil.connection.type === pgUtil.connection.NONE) {
                pg.online = false;
            } else {
                pg.online = true;
            }
        }
    }
    init() {
        document.addEventListener('online', this.onOnline.bind(this), false);
        document.addEventListener('offline', this.onOffline.bind(this), false);
        //document.addEventListener('pause', this.onPause.bind(this), false);
        //document.addEventListener('resume', this.onResume.bind(this), false);
    }
    // Synchronize after two seconds of inactivity.
    // Pages that modify events or state should call this,
    // but it is also called when navigating away from pages.
    syncSoon(force = false, lag = 2000) {
        clearTimeout(pgUI.window.t);
        pgUI.window.t = setTimeout(timeout.bind(this, force), lag);
        
        function timeout(force) {
            if (this.allowNetwork) {
                this.logEvent('update');
                this.synchronize(force);
            }
        }
    }
    logEvent(type, data = {}) {
        const startTime = pgNet.startTime;
        const event = {
            page: 'home', category: 'Uncategorized', type: type, start: startTime, duration: pgUtil.getCurrentTime() - startTime, data: data
        };
        if (type === 'login' || type === 'logout' || type === 'update') {
            event.type = 'login';
            event.category = pgUI.category();
            pg.updateLoginEvent(event);
        } else if (type === 'error') {
            //if (pgLogin.loggingIn) {
            //    pgFile.writeFile("com.psygraph.lastError", event);
            //}
            if (pgDebug.debug) {
                pg.addNewEvents(event, true);
                this.syncSoon();
            } else {
                if (pgDebug.debug) {
                    pg.addNewEvents(event, true);
                    this.syncSoon();
                }
            }
        }
    }
    onOnline() {
        pg.online = true;
        pgNet.syncSoon();
    }
    onOffline() {
        pg.online = false;
        this.syncSoon();
    }
    onPause() {
        // stay awake in the background until all files are written
        // cordova.plugins.backgroundMode.enable();
        //this.syncSoon();
        pg.background = true;
        pgDebug.showLog('Entering pause state...');
        pgUI.showPage(false);
    }
    onResume() {
        pg.background = false;
        pgDebug.showLog('Resuming...');
        pgUI.showPage(true);
        //this.syncSoon();
    }
    
    postData(data, callback = (tf, {}) => {
    }, isAsync = true) {
        let url = '';
        if (data.action === 'login' || data.action === 'checkUser') {
            url = data.server + '/server.php';
            if (!pg.online) {
                pgDebug.showLog('Not online, but tried: ' + data.action);
                return callback(false, null);
            }
        } else {
            url = pg.server + '/server.php';
            data.username = pg.username;
            data.cert = pg.cert;
        }
        if (typeof (data.timeout) === 'undefined') {
            data.timeout = 6000;
        }
        data.version = pg.version;
        const dat = JSON.stringify(data);
        $.ajax({
            url: url,
            type: 'POST',
            async: isAsync,
            timeout: data.timeout,
            crossDomain: true,
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            data: dat,
            success: ajaxSuccess.bind(this),
            error: ajaxError.bind(this)
        });
        
        function ajaxSuccess(d) {
            this.numTimeouts = 0;
            if ('error' in d) {
                pgDebug.showLog(d.error);
                callback(false, d);
            } else {
                callback(true, d);
            }
        }
        
        function ajaxError(request, status, error) {
            if (status === 'timeout' && ++this.numTimeouts <= 2) {
                pgDebug.showWarn('AJAX timeout, retrying');
                // This will allow transmission of large arrays, but leads to memory errors.
                // We need better data storage than JSON over HTTP...
                //data.timeout = data.timeout*2;
                this.postData(data, callback, isAsync);
            } else {
                pgDebug.showWarn('AJAX ERROR: ' + data.action + ': ' + status + ', ' + error);
                if ('responseText' in request) {
                    pgDebug.showLog(request.responseText);
                }
                this.numTimeouts = 0;
                callback(false, null);
            }
        }
    }
    augmentServerURL(server) {
        if (this.servers.indexOf(server) === -1) {
            if (server.indexOf('plugins') === -1) {// xxx this is not a great test for the plugins directory
                // call wordpress via XML-RPC
                const args = new Array('pg.serverURL');
                const possibleServer = pgXML.xmlRpcSend(server + '/xmlrpc.php', args);
                if (possibleServer !== '') {
                    this.servers[server] = possibleServer;
                } else {
                    this.servers[server] = server;
                }
            } else {
                this.servers[server] = server;
            }
        }
        return this.servers[server];
    }
    
    verifyUser(server, username, callback) {
        function verifyCB(status, d) {
            if (status) {
                pg.server = server;
                callback(''); //success
            } else {
                pg.server = server;
                // was connectivity bad, or was the username unknown?
                if (!d) {
                    pgDebug.showLog('Could not connect to server for verification');
                    callback('server');
                } else {
                    pgDebug.showLog('Plugin or user not found in WordPress');
                    callback('user');
                }
            }
        }
        
        // xxx remove useServer, it complicates things
        pg.useServer = true;
        server = this.augmentServerURL(server);
        if (!pg.online) {
            pgDebug.showLog('VerifyUser called when not online');
        }
        this.postData({'action': 'checkUser', 'server': server, 'username': username}, verifyCB, false);
    }
    localLogin(username, callback = function(success) { }) {
        // read the PG followed by the events
        this.readPG(pgLoaded.bind(this));
        
        function pgLoaded(success, newPG) {
            if (success) {
                if (username !== newPG.username) {
                    // ??? should we write different (local) files for each username?
                    pgDebug.showWarn('User \'' + username + '\' inheriting settings of \'' + newPG.username + '\'');
                }
                pg.copySettings(newPG, true);
            }
            pgUI.updateAllPageData(); // add/remove new/obsolete page data
            this.readEvents(callback);
        }
    }
    // post the login event, get a new certificate
    serverLogin(server, username, password, cert, callback = (success)=>{} ) {
        // xxx we need to heavily comment this logic...
        pg.useServer = true;
        server = this.augmentServerURL(server);
        pgDebug.showLog('Attempted server login: ' + server);
        this.postData({
            'action': 'login', 'server': server, 'username': username, 'cert': cert, 'password': password
        }, validated.bind(this)); // eslint-disable-line
        
        function finishLogin(success) {
            if (success) {
                pgNet.updateSettings(pg, function(success) {
                    pgNet.writePG(pg);
                });
            }
            loadEvents(success);
            callback(success);
        }
        function loadEvents(online) {
            //            pgNet.readEvents(cb.bind(this,online));
            //            function cb(online) {
            if (online) {
                this.uploadEvents();
            }
            //            }
        }
        function validated(success, data) {
            pg.loggedIn = success;
            if (success && data) {
                pg.username = username;
                pg.server = server;
                pg.cert = data.cert;
                pg.certExpiration = data.certExpiration;
                if (data.mtime > pg.mtime) {
                    updatePages(data, finishLogin.bind(this, success));// eslint-disable-line
                    return;
                }
            } else {
                pg.cert = '';
                pg.certExpiration = 0;
            }
            finishLogin(success);
        }
        function updatePages(data, callback) {
            if (data.pages.length) {
                pg.pages = data.pages;
                updatePageData(data.pageData, callback);// eslint-disable-line
            } else {
                callback(true);
            }
        }
        function updatePageData(data, callback) {
            const pageData = {};
            for (const field in data) {
                if (data[field].mtime > pg.getPageMtime(field)) {
                    pageData[field] = 1;
                }
            }
            this.postData({'action': 'getPageData', 'data': pageData}, pageUpdate.bind(this, callback));// eslint-disable-line
            function pageUpdate(callback, success, r) {
                if (success) {
                    for (const field in r) {
                        pg.pageData[field] = parseJSONResponse(field, r[field]);
                    } // eslint-disable-line
                }
                callback(success);
            }
        }
        function parseJSONResponse(field, datum) {
            const data = {
                'mtime': datum.mtime, 'data': JSON.parse(datum.data)
            };
            for (const j in data) {
                const s = data[j];
                // decode booleans, save files
                for (const i in s) {
                    if (s[i] === 'true') {
                        s[i] = true;
                    } else if (s[i] === 'false') {
                        s[i] = false;
                    } else if (typeof (s[i]) === 'string' && s[i].substring(0, 5) === 'data:') {
                        s[i] = pgFile.saveDataURI(field, s[i]);
                    }
                }
            }
            return data;
        }
    }
    logout(callback = (success) => {}, quick = false) {
        //gotoPage("home");
        //UIinitialize();
        pg.loggedIn = false;
        if (quick) {
            finish(true);// eslint-disable-line
        } else {
            this.writePG(pg, writeFinalEvents.bind(this));// eslint-disable-line
        }
        
        function writeFinalEvents() {
            this.writeEvents(pg, finish);// eslint-disable-line
        }
        
        function finish(success) {
            //pg.init();
            if (callback) {
                callback(success);
            }
            pgUI.showBusy(false);
            //pgUI.gotoPage(pgUI.page());
        }
    }
    synchronize(force = false, callback = () => {}) {
        //if(pg.server == "")
        //    return;
        pgUI.savePage(); // update data of current page
        
        if (!pg.isDirty() && !force) {
            this.writePG(pg, cb);// eslint-disable-line
            return;
        }
        pgUI.updateStateObservers(false); // write any new state to the PG
        this.writePsygraph();
        pgFile.writeFile('com.psygraph.state', pgUI.state);
        //if(!quick) // Doing this on the settings pages will blow away any of the user's changes.
        //    resetPage();
        if (pg.loggedIn && pg.online) {
            // syncronize all events with the server
            this.uploadEvents(uploadFiles.bind(this)); // eslint-disable-line
        } else {
            writeEvents.call(this);
        }// eslint-disable-line
        function uploadFiles(success) {
            this.uploadFiles(false, writeEvents.bind(this));// eslint-disable-line
        }
        function writeEvents() {
            this.writeEvents(pg, writePG.bind(this));  // eslint-disable-line
        }
        function writePG(success) {
            if (success) {
                pg.setDirty(false);
            } else {
                pgUI.showAlert('Error', 'Could not save pg events file');
            }
            this.writePG(pg, cb.bind(this));// eslint-disable-line
        }
        function cb() {
            pgUI.home.status();
            callback();
        }
    }
    writePsygraph(data = {}, callback = (success) => {}) {
        if(Object.keys(data).length === 0) {
            data = {
                username: pg.username,
                server: pg.server,
                loggedIn: pg.loggedIn,
                cert: pg.cert,
                page: pgUI.page(),
                category: pgUI.category(),
                error: null
            };
        }
        if (pg.getReadOnly()) {
            callback(true);
        } else {
            pgFile.writeFile('com.psygraph', data, cb);
        }// eslint-disable-line
        function cb(success) {
            if (!success) {
                pgUI.showAlert('Error', 'Could not save psygraph settings file');
            }
            callback(success);
        }
    }
    readPsygraph(callback) {
        pgFile.readFile('com.psygraph', callback);
    }
    writePG(data, callback = function(success) {
    }, fn = 'com.psygraph.pg') {
        const tempPG = new PG();
        tempPG.init();
        tempPG.copy(data, false);
        if (pg.getReadOnly()) {
            callback(true);
        } else {
            pgFile.writeFile(fn, tempPG, cb);
        }// eslint-disable-line
        function cb(success) {
            if (!success) {
                pgUI.showAlert('Error', 'Could not save pg settings file');
            }
            callback(success);
        }
    }
    readPG(callback, fn = 'com.psygraph.pg') {
        pgFile.existFile(fn, cb.bind(this));// eslint-disable-line
        function cb(exists) {
            if (exists) {
                pgFile.readFile(fn, callback);
            } else {
                fn = 'com.psygraph.default';
                pgFile.readFile(fn, callback, true, pgFile.mediaEntry);
            }
        }
    }
    writeEvents(pgTemp, callback = function(success) {
    }) {
        const data = {
            'events': pgTemp.events, 'deletedEvents': pgTemp.deletedEvents, 'selectedEvents': pgTemp.selectedEvents
        };
        if (pg.getReadOnly()) {
            cb(true);
        }// eslint-disable-line
        else {
            pgFile.writeFile('com.psygraph.events', data, cb);
        }// eslint-disable-line
        function cb(success) {
            if (!success) {
                pgUI.showAlert('Error', 'Could not save pg events file');
            }
            //else  xxx logic to write then move the file
            //    pgFile.moveFile("com.psygraph.events_new", "com.psygraph.events");
            callback(success);
        }
    }
    readEvents(callback) {
        pgFile.readFile('com.psygraph.events', cbEvents);
        
        function cbEvents(success, data) {
            if (success) {
                pg.events = data.events;
                pg.deletedEvents = data.deletedEvents;
                pg.selectedEvents = data.selectedEvents;
            }
            pgFile.readFile('com.psygraph.state', cbState);
        }
        
        function cbState(success, data) {
            if (success) {
                pgUI.state = data;
            } else {
                pgDebug.showLog('Could not read state file.');
            }
            pgUI.updateStateObservers(true);
            if (callback) {
                callback(success);
            }
        }
    }
    deleteFiles() {
        pgFile.deleteAllFiles();
        pgFile.deleteAudioFiles();
    }
    updateSettings(newPG, callback) {
        if (pg.useServer && !pg.getReadOnly()) {
            pgUI.showBusy(true);
            pgDebug.showLog('Writing settings to the server');
            this.postData({'action': 'settings', 'pg': pgFile.encodePG(newPG, true)}, function(success, request) {
                getDataURL(success, request, newPG, callback);
            });
        } else {
            callback(true);
        }
        function getDataURL(success, request, newPG, callback) {
            if (success && request[0] !== 'mtime' && pgUtil.isWebBrowser) {
                let doUpload = false;
                const pageData = {};
                for (const page in request.pageData) {
                    if (request.pageData[page]) {
                        pageData[page] = {};
                        pageData[page]['mtime'] = newPG.getPageMtime(page);
                        pageData[page]['data'] = JSON.stringify(newPG.getPageData(page));
                        doUpload = true;
                    }
                }
                const data = {'pageData': pageData};
                if (doUpload) {
                    this.postData({'action': 'settingsData', 'data': data}, callback);
                } else {
                    callback(success);
                }
            } else {
                callback(success);
            }
            pgUI.showBusy(false);
        }
    }
    // download events from the server
    downloadEvents(callback) {
        const lastOffset = 0;
        if (!(pg.loggedIn && pg.online)) {
            pgUI.showAlert('Warning', 'You must be online and logged in to download events.');
            //$('#home_action').popup('close');
            callback(true);
        } else {
            this.postData({action: 'getEventArray', timeout: 12000, offset: 0}, createEvents);// eslint-disable-line
        }
        function createEvents(success, rslt) {
            if (success) {
                pg.addEventArray(rslt.data, false, true);
                if (rslt.offset == 0) {
                    this.writeEvents(pg, cb);// eslint-disable-line
                } else {
                    const lastOffset = rslt.offset;
                    this.postData({action: 'getEventArray', timeout: 12000, offset: lastOffset}, createEvents);
                }
            } else {
                pgUI.showBusy(false);
                pgUI.showAlert('Error', 'GetEventArray timeout at event offset: ' + lastOffset);
                cb();// eslint-disable-line
            }
            
            function cb() {
                callback(success);
            }
        }
    }
    uploadFiles(force = false, callback = function(tf) {
    }) {
        if (!(pg.loggedIn && pg.online)) {
            pgUI.showAlert('Error', 'You must be online and logged in to upload files.');
            callback(false);
            return;
        }
        pgFile.uploadAudioFiles(force, callback);
    }
    
    // upload events to the server
    uploadEvents(callback = function(success) {
    }) {
        if (!(pg.loggedIn && pg.online)) {
            pgUI.showAlert('Error', 'You must be online and logged in to upload events.');
            return;
        }
        uploadDeletedEvents();// eslint-disable-line
        uploadCreatedEvents(callback);// eslint-disable-line
        function uploadDeletedEvents() {
            const nEvents = 100;
            for (let i = 0; i < pg.deletedEvents.length; i += nEvents) {
                const startIndex = i;
                const endIndex = Math.min(i + nEvents - 1, pg.deletedEvents.length - 1);
                const toDelete = {
                    events: pg.deletedEvents.slice(startIndex, endIndex + 1),
                    startTime: pg.deletedEvents[endIndex][1],
                    endTime: pg.deletedEvents[startIndex][1]
                };
                this.postData({action: 'deleteEventArray', data: toDelete}, function(tf, dat) {
                    deleteDeletedEventIDs(tf, dat);
                });// eslint-disable-line
            }
            
            function deleteDeletedEventIDs(success, data) {
                if (success) {
                    pg.deleteDeletedEventIDs(data.ids);
                } else {
                    pgDebug.showLog('ERROR: Could not delete events.');
                }
            }
        }
        
        function uploadCreatedEvents(callback) {
            const nEvents = 40;
            let success = true;
            const async = true;
            for (let i = 0; i < pg.events.length; i += nEvents) {
                const startIndex = i;
                const endIndex = Math.min(i + nEvents - 1, pg.events.length - 1);
                // Only upload events with negative IDs (which implies the server has not seen them).
                const e = pg.events.slice(startIndex, endIndex + 1);
                const newE = [];
                for (let j = 0; j < e.length; j++) {
                    if (e[j][0] < 0) {
                        newE[newE.length] = e[j];
                    }
                }
                if (newE.length) {
                    const toSet = {
                        events: newE, startTime: pg.events[endIndex][1], endTime: pg.events[startIndex][1]
                    };
                    this.postData({action: 'setEventArray', data: toSet, timeout: 12000}, function(tf, dat) {
                        cbAfterCount(tf, dat);
                    }, async);// eslint-disable-line
                }
            }
            pgUI.resetPage(); // in case the page had been cacheing event ID's
            callback(success);
            
            function cbAfterCount(s, data) {
                if (s) {
                    pg.changeEventIDs(data.idlist, IDcallback);
                }
                success = success && s;
                //pg.deleteEventsInRange(data.startTime, data.endTime);
                //pg.deleteDeletedEventsInRange(data.startTime, data.endTime+1);
            }
            
            function IDcallback(ids) {
                pgFile.renameFileIDs(ids);
                this.syncSoon(true);
            }
        }
    }
    sendEmail(emailAddress, callback = (success)=>{}) {
        if(pgUtil.isWebBrowser) {
            pgUI.showAlert('App Only', 'Sending email is only possible when using the app.');
            callback(false);
        }
        const to = emailAddress;
        const subject = 'Psygraph Data';
        const body = '<p>Your psygraph data is attached to this email.</p>' + '<p>The CSV file can be opened in any spreadsheet program such as OpenOffice Calc.  ' + 'Any attached audio files can be opened by audio applications auch as Audacity.</p>';
        let attachments = [];
        pgFile.getAudioFilenames(audioCB);// eslint-disable-line
        
        function audioCB(filenames) {
            attachments = attachments.concat(filenames);
            const data = pg.printCSV();
            const d = new Date();
            // 2014-09-11T02:32:36.955Z
            const fn = 'psygraph_' + d.toISOString().slice(0, 10) + '.csv';
            pgFile.writeData(fn, data, csvCB);
        }

        function csvCB(success, filename) {
            if (success) {
                attachments.push(filename);
            }
            const data = pg.printJSON();
            const d = new Date();
            // 2014-09-11T02:32:36.955Z
            const fn = 'psygraph_' + d.toISOString().slice(0, 10) + '.json';
            pgFile.writeData(fn, data, eventsCB);
        }
        function eventsCB(success, filename) {
            if (success) {
                attachments.push(filename);
            }
            pgUtil.email.open({
                to: to, // email addresses for TO field
                attachments: attachments, // file paths or base64 data streams
                subject: subject, // subject of the email
                body: body, // email body (for HTML, set isHtml to true)
                isHtml: true
            }, callback);
        }
    }
    selectAction(selection) {
        if (selection === '') {
            // no-op.
        } else if (selection === 'downloadEvents') {
            pgUI.showBusy(true);
            this.downloadEvents(cb);
        } else if (selection === 'uploadFiles') {
            pgUI.showBusy(true);
            this.uploadEvents();
            this.uploadFiles(true, cb);
        } else if (selection === 'deleteSettings') {
            const localPG = new PG();
            localPG.init();
            localPG.setDirty(true);
            this.updateSettings(localPG, settingsCB.bind(this, localPG));// eslint-disable-line
        } else if (selection === 'deleteEvents') {
            let text = '';
            if (pg.loggedIn && pg.online) {
                text = '<p>Do you wish to delete all events from both this device and the server?</p>' + '<p>(You can log out to delete events on this device only).</p>';
            } else {
                text = '<p>Do you wish to delete all events from this device?</p>' + '<p>(You can log in to delete events on the server).</p>';
            }
            pgUI.showDialog({title: 'Delete events?', true: 'Delete', false: 'Cancel'}, text, deleteEventsCB.bind(this));// eslint-disable-line
        } else if (selection === 'deleteEverything') {
            pgUI.showDialog({
                title: 'Delete all data?', true: 'Delete', false: 'Cancel'
            }, '<p>Do you wish to delete all data and preferences from this device' + (pg.loggedIn ? ' <b>AND the server</b> (because you are currently logged in)' : '') + '?</p><p>This action cannot be undone.</p>', deleteEverythingCB.bind(this)); // eslint-disable-line
        } else {
            pgDebug.showLog('Unknown selection: ' + selection);
        }
        function cb(success, changePage = true) {
            pgUI.showBusy(false);
            if (changePage) {
                //pgUI.gotoPage(pgUI.page());
                pgUI.resetPage();
            }
        }
        function deleteEventsCB(success) {
            if (success) {
                this.deleteLocalEvents(cb);
                if (pg.loggedIn && pg.online) {
                    this.deleteServerEvents(deleteCB.bind(this));// eslint-disable-line
                }
            }
            //else
            //    pgUI.gotoPage(pgUI.page());
            function deleteCB(success) {
                if (!success) {
                    pgUI.showAlert('Error', 'Events could not be erased.');
                }
                //pgUI.gotoPage(pgUI.page());
            }
        }
        function deleteEverythingCB(success) {
            if (success) {
                //pgUI.gotoPage(pgUI.page());
                this.deleteEverything(deleteCB.bind(this));// eslint-disable-line
            }
            
            function deleteCB(success) {
                if (!success) {
                    pgUI.showAlert('Error', 'Data could not be erased.');
                }
                pgUI.state = {accel: {}, orient: {}, location: {}, notify: {}, random: {}, device: {}, bluetooth: {}};
                //pgLogin.logoutAndErase();
            }
        }
        function settingsCB(localPG, success) {
            if (pg.loggedIn && !success) {
                pgUI.showAlert('Error', "Could not update settings on the server.");
            }
            pg.copy(localPG, false);
            this.writePG(pg);
            //pgUI.gotoPage(pgUI.page());
            pgUI.resetPage();
        }
        return false;
    }
    deleteLocalEvents(callback) {
        pgFile.deleteFile("com.psygraph.events");
        pgFile.deleteAudioFiles();
        pg.initializeEvents();
        this.writeEvents(pg, callback);  // write the (emptied) events locally
    }
    deleteServerEvents(callback) {
        this.postData({action: "deleteAllEvents"}, callback);
    }
    deleteEverything(callback) {
        this.deleteFiles();
        if (pg.loggedIn && pg.online) {
            this.postData({action: "deleteUser"}, callback, false);
        } else {
            callback(true);
        }
    }
}

export const pgNet = new PGNet();
