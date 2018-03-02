//"use strict";


// global variables.
var pg = new PG();
pg.init();

ONSEN = false;

var UI = {
    home:        null,
    stopwatch:   null,
    timer:       null,
    counter:     null,
    list:        null,
    map:         null,
    note:        null,
    graph:       null,
    chart:       null,
    about:       null,
    preferences: null,
    categories:  null,
    help:        null,
    dialog:      null,

    state:      {accel: {}, orient: {}, location: {}, notify: {}, random: {}, device: {}, bluetooth: {}},
    window:     {t: null, currentPage: null, alertCallback: null, sidenav: null}
};

// update page, accel and location state
function updateState(tf) {
    //var page = getPage();
    //if(UI[page]) {
    //    UI.state[page] = UI[page].update(false);
    //}
    if(tf) {
        pgAccel.update(true,     UI.state.accel);
        pgLocation.update(true,  UI.state.location);
        pgNotify.update(true,    UI.state.notify);
        pgRandom.update(true,    UI.state.random);
        pgOrient.update(true,    UI.state.orient);
        pgBluetooth.update(true, UI.state.bluetooth);
        pgDevice.update(true,    UI.state.device);
    }
    else {
        UI.state.accel     = pgAccel.update(false,     UI.state.accel);
        UI.state.location  = pgLocation.update(false,  UI.state.location);
        UI.state.notify    = pgNotify.update(false,    UI.state.notify);
        UI.state.random    = pgRandom.update(false,    UI.state.random);
        UI.state.orient    = pgOrient.update(false,    UI.state.orient);
        UI.state.bluetooth = pgBluetooth.update(false, UI.state.bluetooth);
        UI.state.device    = pgDevice.update(false,    UI.state.device);
    }
}
// UI things =============================================

function onOnline() {
    pg.online = true;
    syncSoon();
}
function onOffline() {
    pg.online = false;
    syncSoon();
}
function onPause() {
    // stay awake in the background until all files are written
    //cordova.plugins.backgroundMode.enable();
    syncSoon();
    pg.background = true;
    pgUI_showLog("Entering pause state...");
    showPage(false);
    //logEvent("pause");
}
function onResume() {
    pg.background = false;
    pgUI_showLog("Resuming...");
    showPage(true);
    syncSoon();
    //logEvent("resume");
}
function onBackKeyDown() {
    gotoPage(pg.page());
}

function onError(err) {
    var text  = err.message;
    var title = "Error: " +pgFile.basename(err.filename) +":" +err.lineno;
    logEvent("error", {text: text, title: title});
    if(pgLogin.loggingIn) {
        pgUI.showAlert(text, title);
    }
    else if(pg.debug()) {
        pgUI.showAlert(text, title);
    }
    // returning true overrides the default window behaviour (i.e. we handled the error).
    return true;
}

function logEvent(type, data) {
    data = data || {};
    var startTime = pgLogin.getStartTime();
    var event = {
        page: "home",
        category: "Uncategorized",
        type: type,
        start: startTime,
        duration: pgUtil.getCurrentTime() - startTime,
        data: data
    };
    if (type === "exit") { // write a file for later.
        pgFile.writeFile("com.psygraph.exit", event);
    }
    else if (type === "login" || type === "logout" || type === "update") {
        event.type = "login";
        event.category = pg.category();
        pg.updateLoginEvent(event);
    }
    else if (type === "error") {
        if (pgLogin.loggingIn) {
            pgFile.writeFile("com.psygraph.lastError", event);
        }
        if (pg.debug()) {
            pg.addNewEvents(event, true);
            syncSoon();
        }
        else {
            if (pg.debug()) {
                pg.addNewEvents(event, true);
                syncSoon();
            }
        }
    }
}
var mouse_clicks = 0, mouse_timer = null;
function singleClick(ev) {
    if(! $(ev.target).hasClass("leftMenuButton") && pgUI.isSlideNavOpen()) {
        pgUI.slideNav(false);
        ev.preventDefault();
        return;
    }
    if($('div.modal_page').length) {
        return true;
    }
    var page = getPage();
    // we only look for triple click on the about or counter pages.
    if(! (page==="counter" ||
            page==="about")) {
        return true;
    }
    var DELAY = 400;
    mouse_clicks++;
    if(mouse_clicks === 1) {
        mouse_timer = setTimeout(function() {
            onSingleTap(ev);
            mouse_clicks = 0;
        }, DELAY);
    }
    else if(mouse_clicks === 2) {
        clearTimeout(mouse_timer);
        mouse_timer = setTimeout(function() {
            onDoubleTap(ev);
            mouse_clicks = 0;
        }, DELAY);
    }
    else {
        clearTimeout(mouse_timer);
        UI[pg.page()].tripleClick();
        mouse_clicks = 0;
        ev.preventDefault();
        ev.stopPropagation();
    }
}
function onSingleTap(ev) {
}
function onDoubleTap(ev) {
}

function isInInputArea(e) {
    var isInput = false;
    isInput |= (e.target.type === "text"     ||
        e.target.type === "textarea" ||
        e.target.type === "search"   ||
        e.target.type === "input"    ||
        e.target.type === "password" ||
        e.target.type === "select");
    isInput |= $(e.target).closest(".select2").length;
    return isInput;
}
function onKeyDown(e) {
    // we handle pagination commands in keydown to prevent screen scrolling.
    // xxx There might be a better way to do this,
    // in which case we can move this code into keypress()
    if(isInInputArea(e))
        return false;
    var evt=(e)?e:(window.event)?window.event:null;
    if(evt) {
        var key=(evt.charCode)?evt.charCode:
            ((evt.keyCode)?evt.keyCode:((evt.which)?evt.which:0));
        switch(key) {
            case 37: // left arrow
                goLeft(e);
                break;
            case 39: // right arrow
                goRight(e);
                break;
            case 38: // up arrow
                goUp(e);
                break;
            case 40: // down arrow
                goDown(e);
                break;
            case 27: // "ESC"
                gotoPage(pg.page());
                break;
            case 83: // "s"
                gotoSectionSettings();
                break;
            case 72: // "h"
                gotoSectionHelp();
                break;
            case 80: // "p"
                gotoPage("preferences");
                break;
            //case 16: // shift
            case 188: // ",", hopefully less than without shift
                lever("left");
                break;
            //case 32: // space
            case 190: // ".", hopefully greater than without shift
                lever("right");
                break;
            default:
                return false;
        }
        pgAudio.stopAlarm();
        return true;
    }
    return false;
}
function onKeyPress(e) {
    if(isInInputArea(e))
        return false;
    var evt=(e)?e:(window.event)?window.event:null;
    if(evt) {
        var key=(evt.charCode)?evt.charCode:
            ((evt.keyCode)?evt.keyCode:((evt.which)?evt.which:0));
        switch(key) {
            case 13: // return key
                var def = $('.default');
                if(def.length===1)
                    def.click();
                else
                    pgUI_showLog("Too many defaults");
                break;
            default:
                return true;
        }
        return false;
    }
    return true;
}

function lever(arg) {
    var page = getPage();
    if( page !== "" &&
        (pg.allPages.indexOf(page) !== -1 || page==="about"))
        UI[page].lever(arg);
}

function onResize() {
    var id = getPage();
    if(typeof(UI[id])!=="undefined")
        UI[id].resize();
}

// Synchronize after four seconds of inactivity.
// Pages that modify events or state should call this,
// but it is also called when navigating away from pages.
function syncSoon() {
    callback = (typeof(callback)==="undefined") ? (function fx(){}) : callback;
    clearTimeout(UI.window.t);
    UI.window.t = setTimeout(timeout, 4000);
    function timeout() {
        if(pgLogin.hasFinishedLogin()) {
            logEvent("update");
            PGEN.synchronize();
        }
    }
}

// PAGE NAVIGATION ====================================

function goLeft(event) {
    var index = Math.max(0,pg.pageIndex-1);
    gotoPage(pg.pages[index]);
    if(event)
        event.preventDefault();
    return false;
}
function goRight(event) {
    var index = Math.min(pg.pages.length-1,pg.pageIndex+1);
    gotoPage(pg.pages[index]);
    if(event)
        event.preventDefault();
    return false;
}
function goUp(event) {
    gotoCategory(pg.categoryIndex+1);
    if(event)
        event.preventDefault();
    return false;
}
function goDown(event) {
    gotoCategory(pg.categoryIndex-1);
    if(event)
        event.preventDefault();
    return false;
}
function getPage() {
    return UI.window.currentPage;
}
function getSection() {
    var page = getPage();
    if($("#"+page+"_main").is(':visible'))
        return "main";
    else if($("#"+page+"_settings").is(':visible'))
        return "settings";
    else if($("#"+page+"_help").is(':visible'))
        return "help";
    else
        return "";
}
function gotoSection(section) {
    if(section==="main")
        gotoSectionMain();
    else if(section==="settings")
        gotoSectionSettings();
    else if(section==="help")
        gotoSectionHelp();
    else if(section==="")
        ;
    else
        pgUI_showError("Unknown section: " + section);
}
function gotoSectionMain() {
    var page = getPage();
    $("#"+page+"_main").show();
    $("#"+page+"_settings").hide();
    $("#"+page+"_help").hide();
    $(".navbar_link").removeClass("ui-btn-active");
    $("#"+page+"_page .navbar_link_left").addClass("ui-btn-active");
    UI[page].resize();
}
function gotoSectionSettings() {
    var page = getPage();
    $("#"+page+"_main").hide();
    $("#"+page+"_settings").show();
    $("#"+page+"_help").hide();
    UI[page].createSettings();
    UI[page].resize();
}
function gotoSectionHelp() {
    var page = getPage();
    $("#"+page+"_main").hide();
    $("#"+page+"_settings").hide();
    $("#"+page+"_help").show();
    UI[page].resize();
}
function gotoPage(newPage) {
    var oldPage = getPage();
    UI.lastPage = oldPage;
    var opts = {'changeHash': false,
        'role': "page"
    };
    // update old state
    if(oldPage && UI[oldPage]) {
        var data = UI[oldPage].getPageData();
        UI.state[oldPage] = UI[oldPage].update(false, data);
    }
    // change the PG page
    var index = pg.pages.indexOf(newPage);
    if(index===-1) {
        // this is a compatibility issue.  Users used to be able to hide pages
        if(pg.allPages.indexOf(newPage) !== -1)
            pg.pages.push(newPage);
        index = pg.pages.indexOf(newPage);
    }
    if(index!==-1) {
        pg.pageIndex = index;
    }
    // remove the loading dialog, if present
    pgUI.showBusy(false);
    // change the display page
    if(oldPage == null)
        opts.allowSamePageTransition = true;
    UI.window.currentPage = newPage;
    if(ONSEN) {
        //$(".page").hide();
        //$("#"+newPage+"_page").show();
        var lopts = {
            'animation' : "slide"
        };
        //$("#onsNavigator")[0].replacePage("ons_"+newPage+"_page");
        $("#onsNavigator")[0].replacePage("html/"+newPage+".html", lopts);
    }
    else {
        var pc = $.mobile.pageContainer;
        //$(":mobile-pagecontainer").pagecontainer("change", newPage+"_page", opts);
        pc.pagecontainer("change", $("#"+newPage+"_page"), opts);
    }
    // update new state
    if(newPage && UI[newPage]) {
        var data = UI[newPage].getPageData();
        UI[newPage].update(true, data);
    }
    //if(UI.onPageChange) {
    //    UI.onPageChange();
    //    UI.onPageChange = null;
    //}
    pgAudio.stopAlarm(-1);
    logEvent("update");
    //updateSubheader(); // updating the page does not change the header, which currently has only category info
    gotoSectionMain();
    pgUI.slideNav(false);
}
function showPage(update) {
    var page = getPage();
    if(UI[page]) {
        if(!update)
            UI.state[page] = UI[page].update(false, UI[page].getPageData());
        else {
            UI[page].update(true, UI.state[page]);
            syncSoon();
        }
    }
}
function resetPage() {
    var page = getPage();
    if(UI[page] && page==="list") { // only refresh pages that cache event IDs
        UI.state[page] = UI[page].update(false, UI[page].getPageData());
        UI[page].update(true, UI.state[page]);
    }
}
function updateSubheader() {
    menus = $(".categoryChooser");
    // if there is only one category, disable changes
    if(pg.numCategories()<2)
        menus.addClass("ui-disabled");
    else
        menus.removeClass("ui-disabled");
    // Update the category name (string)
    var catName = pg.category();
    if(catName === "Uncategorized")
        catName = "&nbsp;";
    $(".category").html(catName);
    menus.empty();
    for(var i=pg.numCategories()-1; i>=0; i--) {
        var cat = pg.categories[i];
        menus.append(new Option(cat, cat));
    }
    menus.val(pg.category()).trigger("change");
}

function gotoCategory(num) {
    if(typeof(num)==="string") {
        var index = pg.categories.indexOf(num);
        if(index !== -1)
            num = index;
        else
            num = 0;
    }
    // update the category value
    num = num < 0 ? 0 : num;
    num = num > pg.numCategories()-1 ? pg.numCategories()-1 : num;
    // update the stylesheet URL
    var page = getPage();
    UI.state[page] = UI[page].update(false, UI[page].getPageData());
    pg.categoryIndex = num; // the category change has to happen between the state updates
    UI[page].update(true, UI[page].getPageData());
    var cd = pg.getCategoryData(pg.category());
    var style = "media/" + cd.style;
    $("#user_style").attr("href", style);
    $("html").css('backgroundColor', cd.color);
    updateSubheader();
    // reload the settings if the category has changed
    if(getSection()==="settings")
        gotoSectionSettings();
}
/*
function setPageChangeCallback(cb) {
    var oldPageChange = UI.onPageChange;
    UI.onPageChange = function() {
        cb();
        pgAudio.stopAlarm(-1);
        if(oldPageChange)
            oldPageChange();
    };
}
*/
// SERVER COMMUNICATION ==========================================

function postData(data, callback, isAsync) {
    if(callback === undefined)
        callback = function(){};
    if(isAsync === undefined)
        isAsync = true;
    var url = "";
    if(data.action === "login" || data.action === "checkUser") {
        url = data.server + "/server.php";
        if(!pg.online) {
            pgUI_showLog("Not online, but tried: "+data.action);
            return callback(false, null);
        }
    }
    else {
        url = pg.server + "/server.php";
        data.username = pg.username;
        data.cert     = pg.cert;
    }
    if(typeof(data.timeout)==="undefined")
        data.timeout = 6000;
    data.version  = pg.version;
    var dat = JSON.stringify(data);
    $.ajax({    url:         url,
        type:        "POST",
        async:       isAsync,
        timeout:     data.timeout,
        crossDomain: true,
        contentType: "application/json; charset=utf-8",
        dataType:    "json",
        data:        dat,
        cache:       false,
        success:     ajaxSuccess,
        error:       ajaxError
    });
    function ajaxSuccess(d) {
        if(d.error) {
            pgUI_showLog(d.error);
            callback(false, d);
        }
        else {
            callback(true, d);
        }
    }
    function ajaxError(request, status, error) {
        pgUI_showLog("ERROR: " + status + ", " + error);
        if(request.responseText)
            pgUI_showLog(request.responseText);
        callback(false, null);
    }
}




var PGEN = {
    servers: [],

    augmentServerURL: function(server) {
        if(PGEN.servers.indexOf(server) === -1) {
            if(server.indexOf("plugins")===-1) {// xxx this is not a great test for the plugins directory
                // call wordpress via XML-RPC
                var args = new Array("pg.serverURL");
                var possibleServer = xmlRpcSend(server + "/xmlrpc.php", args);
                if(possibleServer !== "") {
                    PGEN.servers[server] = possibleServer;
                }
                else
                    PGEN.servers[server] = server;
            }
            else
                PGEN.servers[server] = server;
        }
        return PGEN.servers[server];
    },
    verifyUser: function(server, username, callback) {
        // xxx remove useServer, it complicates things
        pg.useServer = true;
        server = PGEN.augmentServerURL(server);
        if(!pg.online)
            pgUI_showLog("VerifyUser called when not online");
        postData({'action': "checkUser", 'server': server, 'username': username}, verifyCB, false);
        function verifyCB(status, d) {
            if(status) {
                pg.server = server;
                callback(""); //success
            }
            else {
                pg.server = server;
                // was connectivity bad, or was the username unknown?
                if(!d) {
                    pgUI_showLog("Could not connect to server for verification");
                    callback("server");
                }
                else {
                    pgUI_showLog("Plugin or user not found in WordPress");
                    callback("user");
                }
            }
        }
    },
    login: function(username, callback) {
        // read the PG followed by the events
        PGEN.readPG(pgLoaded);
        function pgLoaded(success, newPG) {
            if(success) {
                if(username!==newPG.username) {
                    // ??? should we write different (local) files for each username?
                    pgUI_showWarn("User '"+username+"' inheriting settings of '" +newPG.username +"'");
                    pg.copySettings(newPG);
                }
                else
                    pg.copySettings(newPG);
            }
            pg.updatePageData(); // add/remove new/obsolete page data
            PGEN.readEvents(callback);
            //updateNavbar();
        }
    },
    // post the login event, get a new certificate
    serverLogin: function(server, username, password, cert, callback) {
        // xxx we need to heavily comment this logic...
        pg.useServer = true;
        server = PGEN.augmentServerURL(server);
        pgUI_showLog("Attempted server login: " + server);
        var loginSuccess = false;
        postData({'action': "login", 'server': server, 'username': username, 'cert': cert, 'password': password}, validated);

        function finishLogin(success) {
            if(success) {
                PGEN.updateSettings(pg, function(success){PGEN.writePG(pg)});
            }
            loadEvents(success);
            callback(success);
        }
        function loadEvents(online) {
            //            PGEN.readEvents(cb.bind(this,online));
            //            function cb(online) {
            if(online)
                PGEN.uploadEvents();
            //            }
        }
        function validated(success, data) {
            pg.loggedIn = success;
            if(success && data) {
                pg.username       = username;
                pg.server         = server;
                pg.cert           = data.cert;
                pg.certExpiration = data.certExpiration;
                if(data.mtime > pg.mtime) {
                    updatePages(data, function(success){updateCategories(success,data,finishLogin.bind(this,success));} );
                    return;
                }
            }
            else {
                pg.cert = "";
                pg.certExpiration = 0;
            }
            finishLogin(success);
        }
        function updatePages(data, callback) {
            if(data.pages.length) {
                pg.pages = data.pages;
                updatePageData(data.pageData, callback);
            }
            else
                callback(true);
        }
        function updatePageData(data, callback) {
            var pageData = {};
            for(var field in data) {
                if(data[field].mtime > pg.getPageMtime(field))
                    pageData[field] = 1;
            }
            postData({"action": "getPageData", "data": pageData}, pageUpdate);
            function pageUpdate(success, r) {
                if(success) {
                    for(var field in r)
                        pg.pageData[field] = parseJSONResponse(field, r[field]);
                }
                callback(success);
            }
        }
        function parseJSONResponse(field, data) {
            var data = {
                'mtime': data.mtime,
                'data':  JSON.parse(data.data)
            };
            for(var j in data) {
                s = data[j];
                // decode booleans, save files
                for(var i in s) {
                    if(s[i]==="true")
                        s[i] = true;
                    else if(s[i]==="false")
                        s[i] = false;
                    else if(typeof(s[i])==="string" &&
                        s[i].substring(0,5) === "data:") {
                        s[i] = pgFile.saveDataURI(field, s[i]);
                    }
                }
            }
            return data;
        }
    },
    logout: function(callback, quick) {
        //gotoPage("home");
        //UIinitialize();
        pg.loggedIn = false;
        if(quick) {
            finish(true);
        }
        else {
            PGEN.writePG(pg, writeEvents);
        }
        function writeEvents() {
            PGEN.writeEvents(pg, finish);
        }
        function finish(tf) {
            //pg.init();
            if(callback)
                callback(tf);
            pgUI.showBusy(false);
            gotoPage(pg.page());
        }
    },
    synchronize: function (callback) {
        callback = (typeof(callback)==="undefined") ? (function fx(){}) : callback;

        // Update the pg, do the callback
        PGEN.writePG(pg, cb);

        if(!pg.dirty())
            return;

        updateState(false);

        pgFile.writeFile("com.psygraph.state", UI.state);
        //if(!quick) // Doing this on the settings pages will blow away any of the user's changes.
        //    resetPage();

        PGEN.writeEvents(pg, moreSync);  // write the events locally
        function cb() {
            UI.home.status();
            callback();
        }
        function moreSync(success) {
            if(success) {
                if(pg.loggedIn) {
                    PGEN.uploadEvents(); // synchonize all events with the server
                    PGEN.uploadFiles(false);
                    pg.dirty(false);
                }
                else {
                    pg.dirty(false);
                }
            }
            else {
                pgUI.showAlert("Could not save pg events file", "Error");
            }
        }
    },
    writePsygraph: function(data, callback) {
        callback = typeof(callback)!=="undefined" ? callback : cb;
        pgFile.writeFile("com.psygraph", data);
        function cb(success) {
            if(!success)
                pgUI.showAlert("Could not save psygraph settings file", "Error");
        }
    },
    readPsygraph: function(callback) {
        pgFile.readFile("com.psygraph", callback);
    },
    writePG: function(data, callback) {
        var tempPG = new PG();
        tempPG.init();
        tempPG.copy(data, false);
        callback = typeof(callback)!=="undefined" ? callback : cb;
        pgFile.writeFile("com.psygraph.pg", tempPG, callback);
        function cb(success) {
            if(!success)
                pgUI.showAlert("Could not save pg settings file", "Error");
        }
    },
    readPG: function(callback) {
        pgFile.readFile("com.psygraph.pg", callback);
    },
    writeEvents: function(pgTemp, callback) {
        callback = typeof(callback)!=="undefined" ? callback : cb;
        var data = {'events': pgTemp.events,
            'deletedEvents': pgTemp.deletedEvents,
            'selectedEvents': pgTemp.selectedEvents
        };
        pgFile.writeFile("com.psygraph.events", data, callback);
        function cb(success) {
            if(!success)
                pgUI.showAlert("Could not save pg events file", "Error");
            //else  xxx logic to write then move the file
            //    pgFile.moveFile("com.psygraph.events_new", "com.psygraph.events");
        }
    },
    readEvents: function(callback) {
        pgFile.readFile("com.psygraph.events", cbEvents);
        function cbEvents(success, data) {
            if(success) {
                pg.events         = data.events;
                pg.deletedEvents  = data.deletedEvents;
                if(data.selectedEvents)
                    pg.selectedEvents = data.selectedEvents;
            }
            pgFile.readFile("com.psygraph.state", cbState);
        }
        function cbState(success, data) {
            if(success) {
                UI.state = data;
            }
            else {
                pgUI_showLog("Could not read state file.");
            }
            updateState(true);
            if(callback)
                callback(success);
        }
    },
    deleteFiles: function() {
        pgFile.deleteAllFiles();
        pgFile.deleteAudioFiles();
    },
    updateSettings: function(newPG, callback) {
        if(pg.useServer) {
            pgUI.showBusy(true);
            pgUI_showLog("Writing settings to the server");
            postData({'action': "settings", 'pg': pgUtil.encode(newPG, true) },
                function(success, request){getDataURL(success, request, newPG, callback)});
        }
        else {
            callback(false);
        }

        function getDataURL(success, request, newPG, callback) {
            if(success && request[0]!=="mtime" && pgUtil.isWebBrowser()) {
                var doUpload = false;
                var pageData = {};
                for(var page in request.pageData) {
                    if(request.pageData[page]) {
                        pageData[page] = {};
                        pageData[page]['mtime'] = newPG.getPageMtime(page);
                        pageData[page]['data']  = JSON.stringify(newPG.getPageData(page));
                        doUpload = true;
                    }
                }
                var data = {'pageData': pageData};
                if(doUpload)
                    postData({'action': "settingsData", 'data': data}, callback);
                else
                    callback(success);
            }
            else
                callback(success);
            pgUI.showBusy(false);
        }
    },
    // download events from the server
    downloadEvents: function(callback) {
        if(!(pg.loggedIn && pg.online)) {
            pgUI.showAlert("You must be online and logged in to issue this command", "Not online");
            //$('#home_action').popup('close');
            callback(true);
        }
        else {
            postData({action: "getEventArray"}, createEvents );
        }
        function createEvents(success, data) {
            if(success) {
                pg.addEventArray(data, false, true);
                PGEN.writeEvents(pg, cb);
            }
            else
                cb();
            function cb() {
                callback(success);
            }
        }
    },
    uploadFiles: function(force, callback) {
        force = typeof(force)==="undefined" ? false : force;
        if(!(pg.loggedIn && pg.online)) {
            pgUI.showAlert("You must be online and logged in to issue this command");
            callback(false);
            return;
        }
        pgFile.uploadAudioFiles(force, callback);
    },
    // upload events to the server
    uploadEvents: function() {
        //callback = (typeof(callback)!="undefined")? callback : function(){};
        var callback = function(){};
        if(!(pg.loggedIn && pg.online)) {
            pgUI.showAlert("You must be online and logged in to issue this command");
            return;
        }
        uploadDeletedEvents();
        uploadCreatedEvents(callback);
        function uploadDeletedEvents() {
            var nEvents = 100;
            var cbCount = 1;
            for(var i=0; i<pg.deletedEvents.length; i+=nEvents) {
                var startIndex = i;
                var endIndex   = Math.min(i+nEvents-1, pg.deletedEvents.length-1);
                var toDelete = { events:    pg.deletedEvents.slice(startIndex, endIndex+1),
                    startTime: pg.deletedEvents[endIndex][1],
                    endTime:   pg.deletedEvents[startIndex][1]
                };
                cbCount ++;
                postData({action: "deleteEventArray", data: toDelete},
                    function(tf,dat){deleteDeletedEventIDs(tf,dat)});
            }
            function deleteDeletedEventIDs(success, data) {
                if(success) {
                    pg.deleteDeletedEventIDs(data.ids);
                }
                else
                    pgUI_showLog("ERROR: Could not delete events.");
            }
        }
        function uploadCreatedEvents(callback) {
            var nEvents = 100;
            for(var i=0; i<pg.events.length; i+=nEvents) {
                var startIndex = i;
                var endIndex   = Math.min(i+nEvents-1, pg.events.length-1);
                // Only upload events with negative IDs (which implies the server has not seen them).
                var e = pg.events.slice(startIndex, endIndex+1);
                var newE = [];
                for(var j=0; j<e.length; j++) {
                    if(e[j][0] < 0)
                        newE[newE.length] = e[j];
                }
                if(newE.length) {
                    var toSet = { events:    newE,
                        startTime: pg.events[endIndex][1],
                        endTime:   pg.events[startIndex][1]
                    };
                    postData({action: "setEventArray", data: toSet, timeout: 16000},
                        function(tf,dat){cbAfterCount(tf,dat)} );
                }
            }
            function cbAfterCount(success, data) {
                if(success) {
                    pg.changeEventIDs(data.idlist);
                    resetPage(); // in case the page had been cacheing event ID's
                    /// xxx we should only write the events once.
                    PGEN.writeEvents(pg);
                }
                callback(success);
                //pg.deleteEventsInRange(data.startTime, data.endTime);
                //pg.deleteDeletedEventsInRange(data.startTime, data.endTime+1);
            }
        }
    },
    sendEmail: function(callback) {
        callback = callback || function(){};
        var to = [UI.preferences.getEmail()];
        var subject = "Psygraph Data";
        var body = "<p>Your psygraph data is attached to this email.</p>" +
                   "<p>The CSV file can be opened in any spreadsheet program such as OpenOffice Calc.  " +
                   "Any attached audio files can be opened by audio applications auch as Audacity.</p>";
        var attachments = [];
        pgFile.getAudioFilenames(audioCB);

        function audioCB(filenames) {
            attachments = attachments.concat(filenames);
            var data = pg.printCSV();
            var d = new Date();
            // 2014-09-11T02:32:36.955Z
            var fn = "psygraph_" + d.toISOString().slice(0, 10) + ".csv";
            pgFile.writeData(fn, data, eventsCB);
        }
        function eventsCB(success, filename) {
            if(success)
                attachments.push(filename);
            cordova.plugins.email.open({
                to:          to, // email addresses for TO field
                attachments: attachments, // file paths or base64 data streams
                subject:     subject, // subject of the email
                body:        body, // email body (for HTML, set isHtml to true)
                isHtml:      true
            }, callback);
        }
    },
    selectAction: function(selection) {
        if(selection === "") {
            // no-op.
        }
        else if(selection === "downloadEvents") {
            pgUI.showBusy(true);
            PGEN.downloadEvents(cb);
        }
        else if(selection === "uploadFiles") {
            pgUI.showBusy(true);
            PGEN.uploadEvents();
            PGEN.uploadFiles(true, cb);
        }
        else if(selection === "emailFiles") {
            //pgUI.showBusy(true);
            PGEN.sendEmail(); // true,cb
        }
        else if(selection === "deleteSettings") {
            var localPG = new PG();
            localPG.init();
            localPG.dirty(true);
            PGEN.updateSettings(localPG, settingsCB);
        }
        else if(selection === "deleteEvents") {
            var text ="";
            if(pg.loggedIn && pg.online) {
                text = "<p>Do you wish to delete all events from both this device and the server?</p>" +
                    "<p>(You can log out to delete events on this device only).</p>";
            }
            else {
                text = "<p>Do you wish to delete all events from this device?</p>" +
                    "<p>(You can log in to delete events on the server).</p>";
            }
            pgUI.showDialog({title: "Delete events?", true: "Delete", false: "Cancel"},
                text, deleteEventsCB.bind(this));
        }
        else if(selection === "deleteEverything") {
            pgUI.showDialog({title: "Delete all data?", true: "Delete", false: "Cancel"},
                "<p>Do you wish to delete all data and preferences from this device" +
                (pg.loggedIn ? " <b>AND the server</b> (because you are currently logged in)" : "") +
                "?</p><p>This action cannot be undone.</p>",
                deleteEverythingCB.bind(this));
        }
        else {
            pgUI_showLog ("Unknown selection: " + selection);
        }
        function cb(success) {
            pgUI.showBusy(false);
            if(!success) {
                pgUI.showAlert("Command failed.");
            }
            gotoPage(pg.page());
            //resetPage();
        }
        function deleteEventsCB(success) {
            if(success) {
                PGEN.deleteLocalEvents(cb);
                if(pg.loggedIn && pg.online) {
                    PGEN.deleteServerEvents(deleteCB.bind(this));
                }
            }
            else
                gotoPage(pg.page());
            function deleteCB(success) {
                if(!success) {
                    pgUI.showAlert("Events could not be erased.");
                }
                gotoPage(pg.page());
            }
        }
        function deleteEverythingCB(success) {
            if(success) {
                gotoPage(pg.page());
                PGEN.deleteEverything(deleteCB.bind(this));
            }
            function deleteCB(success) {
                if(!success) {
                    pgUI.showAlert("Data could not be erased.");
                }
                UI.state = {};
                pgLogin.logoutAndErase();
            }
        }
        function settingsCB(success) {
            if(pg.loggedIn && !success)
                pgUI.showAlert("Could not update settings on the server.", "Error");
            pg.copy(localPG, false);
            PGEN.writePG(pg);
            gotoPage(pg.page());
            resetPage();
        }
        return false;
    },
    deleteLocalEvents: function(callback) {
        pgFile.deleteFile("com.psygraph.events");
        pgFile.deleteAudioFiles();
        pg.initializeEvents();
        PGEN.writeEvents(pg, callback);  // write the (emptied) events locally
    },
    deleteServerEvents: function(callback) {
        postData({action: "deleteAllEvents"}, callback);
    },
    deleteEverything: function(callback) {
        PGEN.deleteFiles();
        if(pg.loggedIn && pg.online)
            postData({action: "deleteUser"}, callback, false);
        else
            callback(true);
    }
};

