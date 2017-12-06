//"use strict";


// global variables.
var pg = new PG();
pg.init();

ONSEN = false;

var UI = {
    home:       null,
    stopwatch:  null,
    timer:      null,
    counter:    null,
    list:       null,
    map:        null,
    note:       null,
    graph:      null,
    chart:      null,
    about:      null,
    prefs:      null,
    settings:   null,
    help:       null,

    state:      {},
    window:     {t: null, onPageChange: null, currentPage: null, alertCallback: null}
};

var pgInitialized = $.Deferred();

function UIinitialize() {
    if(UI.window.t)
        clearTimeout(UI.window.t);
}

// INITIALIZATION ==============================

function finalInit() {
    document.addEventListener("pause",  onPause,    false);
    document.addEventListener("resume", onResume,   false);
    document.addEventListener("backbutton", onBackKeyDown, false);
    window.addEventListener("resize",   onResize,   false);
    window.addEventListener("keydown",  onKeyDown,  false);
    //window.addEventListener("keyup",    onKeyPress, false);
    window.addEventListener("error",    onError,    false);

    // set the online status
    if(navigator.connection) {
        var networkState = navigator.connection.type;
        if(networkState == Connection.NONE)
            pg.online = false;
        else
            pg.online = true;
        document.addEventListener("online", onOnline, false);
        document.addEventListener("offline", onOffline, false);
    }
    
    // try replacing 'onclick' with 'tap'
    $(document).bind("pagechange", function( event, ui ) {
            $('input.fast,a.fast').each(function(index, element) {
                    if (element.onclick) {
                        $(element).on('vclick', element.onclick).removeAttr('onclick');
                    }
                });
        });
    // load Bluetooth
    pgBluetooth.init();
    // Load all of the pages.
    PGEN.initialize();
    
    // we use the hammer.js library
    UI.mc = new Hammer.Manager($('body')[0], {domEvents: false});
    // singletap and doubletap logic
    UI.mc.add( new Hammer.Tap({ event: 'doubletap', taps: 2, threshold: 10, posThreshold: 100 }) );
    UI.mc.add( new Hammer.Tap({ event: 'singletap', taps: 1, threshold: 10, posThreshold: 100 }) );
    UI.mc.get('doubletap').recognizeWith('singletap');
    UI.mc.get('singletap').requireFailure('doubletap');
    UI.mc.on("singletap", onSingleTap);
    UI.mc.on("doubletap", onDoubleTap);
    //$(window).on('click', onSingleTap);
    //$(window).on('dblclick', onDoubleTap);
    if(!pgUtil.isWebBrowser()) {
        // set up the swipe behavior
        UI.mc.add(new Hammer.Swipe({direction: Hammer.DIRECTION_ALL}));
        UI.mc.on("swipeleft", goRight);
        UI.mc.on("swiperight", goLeft);
        UI.mc.on("swipeup", goDown);
        UI.mc.on("swipedown", goUp);
        setSwipe(64);
    }
    // synchronize every N seconds
    setInterval(syncCheck, 40*1000);
    pgInitialized.resolve(); //gotoPage("home"); this line now lives in index.html
}

function setSwipe(swipeVal) {
    if(!pgUtil.isWebBrowser()) {
        var width = $(window).width(); //pixels
        var tLen  = 250.0; // ms
        UI.mc.get('swipe').set({
                threshold: (swipeVal/100.0) * width,     // default = 1/5 screen
                    velocity:  (swipeVal/100.0) * width/tLen // default = complete movement in under tLen
                    });
    }
};


// UI things =============================================

function onOnline() {
    pg.online = true;
    syncSoon(true);
}
function onOffline() {
    pg.online = false;
    syncSoon(false);
}
function onPause() {
    // stay awake in the background until all files are written
    //cordova.plugins.backgroundMode.enable();
    syncSoon(true, cb);
    pg.background = true;
    showLog("Entering pause state...");
    showPage(false);
    //UI.home.logEvent("pause");
    return;
    
    function cb() {
        showLog("Finished Syncing before pause completion.");
        //cordova.plugins.backgroundMode.disable();
    }
}
function onResume() {
    pg.background = false;
    showLog("Resuming...");
    showPage(true);
    //UI.home.logEvent("resume");
}
function onBackKeyDown() {
    gotoPage(pg.page(), true);
}

function onError(err) {
    var event = {'start':pgUtil.getCurrentTime(),
                 'page': "home",
                 'type': "error"};
    event.data = {'text': err.message};
    event.data.title = "Error: " +pgFile.basename(err.filename) +":" +err.lineno;
    if(UI.home.loggingIn) {
        pgFile.writeFile("com.psygraph.lastError", event);
        showAlert(event.data.text, event.data.title);
    }
    if(pg.getUserDataValue("debug")) {
        pg.addNewEvents(event, true);
        syncSoon(true);
        showAlert(event.data.text, event.data.title);
    }
    // returning true overrides the default window behaviour (i.e. we handled the error).
    return true;
}

function onSingleTap(ev) {
    if(! pg.getUserDataValue('screenTaps'))
        return;
    var ca = $(ev.target).closest(".clickarea");
    if(ca.length)
        lever("right");
}
function onDoubleTap(ev) {
    if(! pg.getUserDataValue('screenTaps'))
        return;
    var ca = $(ev.target).closest(".clickarea");
    if(ca.length)
        lever("left");
}

function isInInputArea(e) {
    var isInput = false;
    isInput |= (e.target.type == "text"     ||
                e.target.type == "textarea" ||
                e.target.type == "search"   ||
                e.target.type == "input"    ||
                e.target.type == "password" ||
                e.target.type == "select");
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
            gotoPage(pg.page(), true);
            break;
        case 83: // "s"
            gotoPage("settings", true);
            break;
        case 72: // "h"
            gotoPage("help", true);
            break;
        case 80: // "p"
            gotoPage("prefs", true);
            break;
        case 16: // shift
        case 188: // ",", hopefully less than without shift
            lever("left");
            break;
        case 32: // space
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
            if(def.length==1)
                def.click();
            else
                showLog("Too many defaults");
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
    if(page != "" && 
       pg.allPages.indexOf(page) != -1)
        UI[page].lever(arg);
}

function onResize() {
    var id = getPage();
    if(typeof(UI[id])!="undefined")
        UI[id].resize();
}

// syncronize by calling this function periodically
function syncCheck() {
    if(pg.dirty())
        syncSoon(false);
}
// Synchronize explicitly, possibly after four seconds of inactivity.
// Pages that modify events or state should call this,
// but it is also called when navigating away from pages.
function syncSoon(now, callback) {
    now = (typeof(now)=="undefined") ? false : now;
    callback = (typeof(callback)=="undefined") ? (function fx(){}) : callback;
    if(now) {
        PGEN.synchronize(false, callback);
        return;
    }
    clearTimeout(UI.window.t);
    UI.window.t = setTimeout(timeout, 4000);
    function timeout() {
        if(UI.home && UI.home.hasFinishedLogin())
            PGEN.synchronize(true);
    }
}

// User interaction ================================

function showDialog(s, message, callback, nextPage) {
    nextPage = (typeof(nextPage)=="undefined") ? pg.page() : nextPage;
    $("#dialog_header").html("<h4>" + s.title + "</h4>");
    $("#dialogText").html(message);
    $("#dialogText select").trigger("refresh");
    $(".default").removeClass('default');

    if(typeof(s['true'])!="undefined") {
        $("#dialogOK").html(s['true']);
        $("#dialogOK").show();
        $("#dialogOK").css('display','');
    }
    else {
        $("#dialogOK").html(".");
        $("#dialogOK").hide();
    }
    $("#dialogOK").one('click', function(e) {
            gotoPage(nextPage);
            if(callback) 
                callback(1);
            return true;
        });
    
    if(typeof(s['false'])!="undefined") {
        $("#dialogCancel").html(s['false']);
        $("#dialogCancel").show();
        // sometimes these appear with "inline" defined, for no appearent reason....
        $("#dialogCancel").css('display','')
    }
    else {
        $("#dialogCancel").html(".");
        $("#dialogCancel").hide();
    }
    $("#dialogCancel").one('click', function(e) {
            gotoPage(nextPage);
            if(callback) 
                callback(0);
            return true;
        });
    
    if(typeof(s['other'])!="undefined") {
        $("#dialogOther").html(s['other']);
        $("#dialogOther").show();
        $("#dialogOther").css('display','');
    }
    else {
        $("#dialogOther").hide();
        $("#dialogOther").html(s['other']);
    }
    $("#dialogOther").one('click', function(e) {
            gotoPage(nextPage);
            if(callback)
                callback(2);
            return true;
        });
    
    gotoPage("dialog", true);
    $("#dialog_page").trigger("create");
    //$("#dialog").trigger("create").trigger("refresh");
    var input = $("#dialogText").find("input");
    if(input.length) {
        input[0].focus();
    }
    if(s['true']) {
        $("#dialogOK").addClass('default');
    }
}

function showBusy() {
    if(! $('div#loading_page').length) {
        var text  = 'loading...';
        var img   = $('<div id="loading_div"><img src="img/loading.gif"><div>' + text + '</div></div>');
        var block = $('<div id="loading_page"></div>');
        block.appendTo('body');
        img.appendTo(block);
    }
}
function hideBusy() {
    $('div#loading_page').remove();
}
function showLog(msg) {
    console.log(msg);
}
function showWarn(msg) {
    console.warn('WARNING: ' +msg);
    if(pg.getUserDataValue("debug")) {
        pg.addNewEvents({page: "home", type: "warn", data: {'text': msg}}, true);
    }
}
function showError(msg) {
    console.error('ERROR: ' +msg);
    pg.addNewEvents({page: "home", type: "error", data: {'text': msg}}, true);
}

function showAlert(message, title, cb) {
    title   = typeof(title)!="undefined" ? title : "Alert";
    message = pgUtil.escape(message, false, false);
    title   = pgUtil.escape(title, false, false);
    var modal     = typeof(cb)!="undefined" ? false : true;
    UI.window.alertCallback = typeof(cb)!="undefined" ? cb : null;
    $(".default").removeClass('default');

    $("#pgAlert").remove();
    var html = '<div id="pgAlert" data-role="popup" id="popupDialog" data-overlay-theme="a" data-theme="a"'+
        'data-position-to="window" data-dismissible="'+ !modal +'" class="ui-content" >'+
        '<div id="alertHead" data-role="header" data-theme="a"><h1>'+title+'</h1></div>'+
        '<div id="alertBody" role="main" class="ui-content">'+
        '<div id="alertText">'+message+'</div>'+
        '<a href="" class="ui-btn ui-corner-all ui-shadow default" '+
        'onclick="$(\'#pgAlert\').popup(\'close\');return alertCallbackHolder();">OK</a>'+
        '</div></div>';
    var dlg = $(html);
    $("body").append(dlg);
    $("#pgAlert").enhanceWithin();
    $("#pgAlert").popup().popup("open");
}

function alertCallbackHolder() {
    if(UI.window.alertCallback)
        UI.window.alertCallback.apply(this, arguments);
    return false;
}
function printCheckbox(id, label, checked) {
    s = "<label for='" +id+ "'>" +label+ "</label>";
    s += "<input type='checkbox' id='" + id + "' name='"+id+"' value='"+id+"' ";
    if(checked)
        s += "checked ";
    s += "/>";
    return s;
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
function getValidPage(page) {
    if(page=="home" && pg.pages.length>1) {
        //    page = pg.pages[1];
    }
    return page;
}
function gotoLoadedPage(page, back) {
    back = back!=undefined ? back : false;
    page = getValidPage(page);
    if(page=="home")
        PGEN.generateHome(callback);
    else if(page=="about" || page=="prefs" || page=="settings" || page=="help")
        PGEN.generateMetaPage(page, callback);
    else
        PGEN.generatePage(page, callback);
    function callback() {
        gotoPage(page, back);
        gotoCategory(pg.category());
    }
}
function gotoPage(newPage, back) {
    back = back!=undefined ? back : false;
    newPage = getValidPage(newPage);
    var oldPage = getPage();
    UI.lastPage = oldPage;
    var opts = {'changeHash': false }
    // update old state
    if(oldPage && UI[oldPage]) {
        UI.state[oldPage] = UI[oldPage].update();
    }
    // change the PG page
    var index = pg.pages.indexOf(newPage);
    if(index!=-1) {
        pg.pageIndex = index;
    }
    // remove the loading dialog, if present
    hideBusy();
    // change the display page
    if((oldPage=="about" || oldPage=="settings" || oldPage=="prefs" || oldPage=="help")
       && !back) {
        // these pages use page transitions to change their contents
        resetPage();
    }
    else {
        if(oldPage == null)
            opts.allowSamePageTransition = true;
        UI.window.currentPage = newPage;
        if(ONSEN)
            $("#onsNavigator")[0].replacePage(newPage+"_page");
        else
            $(":mobile-pagecontainer").pagecontainer("change", "#"+newPage+"_page", opts );
    }
    // update new state
    if(newPage && UI[newPage]) {
        UI[newPage].update(true, UI.state[newPage]);
    }
    if(UI.onPageChange) {
        UI.onPageChange();
        UI.onPageChange = null;
    }
    syncSoon();
    updateSubheader();
}
function showPage(update) {
    var page = getPage();
    if(UI[page]) {
        if(!update)
            UI.state[page] = UI[page].update(false);
        else {
            UI[page].update(true, UI.state[page]);
            syncSoon();
        }
    }
}
function resetPage() {
    var page = getPage();
    if(UI[page]) {
        UI.state[page] = UI[page].update(false);
        UI[page].update(true, UI.state[page]);
    }
}
function updateSubheader(force) {
    force = force!=undefined ? force : false;
    var page = pg.page();
    if(force) {
        $('.catmenu').remove();
    }
    // Update the category name (string)
    var menu = $(".cat_link");
    menu.text(pg.category());
    // if there is only one category, disable changes
    if(pg.numCategories()<2)
        menu.addClass("ui-disabled");
    else
        menu.removeClass("ui-disabled");
 
    // create the popup text
    var txt = '';
    var id = page+"CatMenu";
    txt += '<div class="catmenu" data-role="popup" id="'+id+'">';
    txt += '<ul class="sortable" data-role="listview" data-inset="true" id="'+page+'CatList">';
    txt += '<li data-role="list-divider"><i>Category...</i></li>';
    var close = "return false;";
    for(var i=pg.numCategories()-1; i>=0; i--) {
        if(pg.category()==pg.categories[i])
            txt += '<li data-icon="false"><a data-role="button" href="" data-rel="back" onclick="gotoCategory('+i+');'+close+'" selected>' +pg.categories[i] +'</a></li>';
        else
            txt += '<li data-icon="false"><a data-role="button" href="" data-rel="back" onclick="gotoCategory('+i+');'+close+'">' +pg.categories[i] +'</a></li>';
    }
    txt += '</ul></div>';
    
    $("#"+id).remove();
    // Add the popup to the page and create()
    var subheader = $("#subheader_"+page);
    subheader.empty();
    subheader.html(txt);
    if($('#'+page+'CatMenu-popup').is(".ui-popup-container"))
        subheader.trigger("refresh");
    else
        subheader.trigger("create");
    $("#"+id).trigger("create");
}

function gotoCategory(num) {
    if(typeof(num)=="string") {
        var index = pg.pages.indexOf(num);
        if(index != -1)
            num = index;
        else
            num = 0;
    }
    // update the category value
    num = num < 0 ? 0 : num;
    num = num > pg.numCategories()-1 ? pg.numCategories()-1 : num;
    // update the stylesheet URL
    var page = getPage();
    if(page=="prefs" || page=="help")
        return;
    UI.state[page] = UI[page].update(false);
    pg.categoryIndex = num; //the category change has to happen between the state updates
    if(pg.pages.indexOf(page) != -1) // make sure it is not the settings page
        UI[page].update(true, UI.state[page]);
    var cd = pg.getCategoryData(pg.category());
    var style = "media/" + cd.style;
    $("#user_style").attr("href", style);
    updateSubheader();
}

function setPageChangeCallback(cb) {
    var oldPageChange = UI.onPageChange;
    UI.onPageChange = function() {
        cb();
        if(oldPageChange)
            oldPageChange();
    };
}

// SERVER COMMUNICATION ==========================================

function postData(data, callback, isAsync) {
    if(callback === undefined)
        callback = function(){};
    if(isAsync == undefined)
        isAsync = true;
    var url = "";
    if(data.action == "login" || data.action == "checkUser") {
        url = data.server + "/server.php";
        if(!pg.online) {
            showLog("Not online, but tried: "+data.action);
            return callback(false, null);   
        }
    }
    else {
        url = pg.server + "/server.php";
        data.username = pg.username;
        data.cert     = pg.cert;
    }
    if(typeof(data.timeout)=="undefined")
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
            showLog(d.error);
            callback(false, d);
        }
        else {
            callback(true, d);
        }
    }
    function ajaxError(request, status, error) {
        showLog("ERROR: " + status + ", " + error);
        if(request.responseText)
            showLog(request.responseText);
        callback(false, null);
    }
}

var PGEN = {
    hrefRoot: "",
    async: false,
    success: false,
    servers: [],

    initialize: function() {
        PGEN.hrefRoot = "";
        PGEN.generateDialog();
        PGEN.generateHome();
        PGEN.generateMetaPage("about");
        PGEN.generateMetaPage("prefs");
        PGEN.generateMetaPage("settings");
        PGEN.generateMetaPage("help");
    },
    augmentServerURL: function(server) {
        if(PGEN.servers.indexOf(server) == -1) {
            if(server.indexOf("plugins")==-1) {// xxx this is not a great test for the plugins directory
                // call wordpress via XML-RPC
                var args = new Array("pg.serverURL");
                var possibleServer = xmlRpcSend(server + "/xmlrpc.php", args);
                if(possibleServer != "") {
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
            showLog("VerifyUser called when not online");
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
                    showLog("Could not connect to server for verification");
                    callback("server");
                }
                else {
                    showLog("Plugin or user not found in WordPress");
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
                if(username!=newPG.username) {
                    // ??? should we write different (local) files for each username?
                    showWarn("User '"+username+"' inheriting settings of '" +newPG.username +"'");
                    pg.copySettings(newPG);
                }
                else
                    pg.copySettings(newPG);
            }
            PGEN.generateAllPages();
            PGEN.readEvents(callback);
        }
    },
    // post the login event, get a new certificate
    serverLogin: function(server, username, password, cert, callback) {
        // xxx we need to heavily comment this logic...
        pg.useServer = true;
        server = PGEN.augmentServerURL(server);
        showLog("Attempted server login: " + server);
        var loginSuccess = false;
        postData({'action': "login", 'server': server, 'username': username, 'cert': cert, 'password': password}, validated);
        
        function finishLogin(success) {
            if(success) {
                PGEN.updateSettings(pg, function(success){PGEN.writePG(pg)});
            }
            PGEN.generateAllPages();
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
        function updateCategories(success, data, callback) {
            if(data.categories.length) {
                pg.categories = data.categories;
                updateCategoryData(data.categoryData, updateMtime);
            }
            else {
                callback(success);
            }
            function updateMtime(tf) {
                if(success && tf)
                    pg.mtime = data.mtime;
                callback(success && tf);
            }
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
        function updateCategoryData(data, callback) {
            var catData = {};
            for(var field in data) {
                if(data[field].mtime > pg.getCategoryMtime(field))
                    catData[field] = 1;
            }
            postData({"action": "getCategoryData", "data": catData}, catUpdate);
            function catUpdate(success, r) {
                if(success) {
                    for(var field in r) {
                        pg.categoryData[field] = parseJSONResponse(field, r[field]);
                    }
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
                    if(s[i]=="true")
                        s[i] = true;
                    else if(s[i]=="false")
                        s[i] = false;
                    else if(typeof(s[i])=="string" &&
                            s[i].substring(0,5) == "data:") {
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
            var tempPG = new PG();
            tempPG.init();
            tempPG.copy(pg, false);
            PGEN.writePG(tempPG, writeEvents);
        }
        function writeEvents() {
            PGEN.writeEvents(pg.events, pg.deletedEvents, finish);
            //PGEN.generateAllPages();
        }
        function finish(tf) {
            //pg.init();
            if(callback)
                callback(tf);
            hideBusy();
            gotoPage(pg.page());
        }
    },
    synchronize: function (quick, callback) {
        quick = typeof(quick)!="undefined" ? quick : false;
        callback = (typeof(callback)=="undefined") ? (function fx(){}) : callback;
        // update page, accel and location state
        //var page = getPage();
        //if(UI[page]) {
        //    UI.state[page] = UI[page].update(false);
        //}

        if(!quick) // Doing this on the settings pages will blow away any of the user's changes.
            resetPage();

        UI.state.accel    = pgAccel.update(false);
        UI.state.location = pgLocation.update(false);
        //UI.state.help     = UI['help'].update;
        pgFile.writeFile("com.psygraph.state", UI.state);
        
        if(pg.dirty()) {
            PGEN.writeEvents(pg.events, pg.deletedEvents, moreSync);  // write the events locally
        }
        // Update the pg, do the callback
        PGEN.writePG(pg, cb);
        function cb() {
            UI.home.status();
            callback();
        }
        function moreSync(success) {
            if(success) {
                if(pg.loggedIn) {
                    if(!quick) {
                        PGEN.uploadEvents(); // synchonize all events with the server
                        PGEN.uploadFiles(false);
                        pg.dirty(false);
                    }
                }
                else {
                    pg.dirty(false);
                }
            }
            else {
                showAlert("Could not save pg events file", "Error");
            }
        }
    },
    writePsygraph: function(data, callback) {
        callback = typeof(callback)!="undefined" ? callback : cb;
        pgFile.writeFile("com.psygraph", data);
        function cb(success) {
            if(!success)
                showAlert("Could not save psygraph settings file", "Error");
        }
    },
    readPsygraph: function(callback) {
        pgFile.readFile("com.psygraph", callback);
    },
    writePG: function(data, callback) {
        callback = typeof(callback)!="undefined" ? callback : cb;
        pgFile.writeFile("com.psygraph.pg", data, callback);
        function cb(success) {
            if(!success)
                showAlert("Could not save pg settings file", "Error");
        }
    },
    readPG: function(callback) {
        pgFile.readFile("com.psygraph.pg", callback);
    },
    writeEvents: function(events, deletedEvents, callback) {
        callback = typeof(callback)!="undefined" ? callback : cb;
        var data = {'events': events, 'deletedEvents': deletedEvents};
        pgFile.writeFile("com.psygraph.events", data, callback);
        function cb(success) {
            if(!success)
                showAlert("Could not save pg events file", "Error");
            //else  xxx logic to write then move the file
            //    pgFile.moveFile("com.psygraph.events_new", "com.psygraph.events");
        }
    },
    readEvents: function(callback) {
        pgFile.readFile("com.psygraph.events", cb);
        function cb(success, data) {
            if(success) {
                pg.events        = data.events;
                pg.deletedEvents = data.deletedEvents;
            }
            if(callback) callback(success);
        }
    },
    deleteFiles: function() {
        pgFile.deleteAllFiles();
        pgFile.deleteAudioFiles();
    },
    updateSettings: function(newPG, callback) {
        if(pg.useServer) {
            showBusy();
            showLog("Writing settings to the server");
            postData({'action': "settings", 'pg': pgUtil.encode(newPG, true) },
                     function(success, request){getDataURL(success, request, newPG, callback)});
        }
        else {
            callback(false);
        }

        function getDataURL(success, request, newPG, callback) {
            if(success && request[0]!="mtime" && pgUtil.isWebBrowser()) {
                var doUpload = false;
                var categoryData = {};
                for(var cat in request.categoryData) {
                    if(request.categoryData[cat]) {
                        categoryData[cat] = {};
                        categoryData[cat]['mtime'] = newPG.getCategoryMtime(cat);
                        categoryData[cat]['data']  = JSON.stringify(newPG.getCategoryData(cat));
                        doUpload = true;
                    }
                }
                var pageData = {};
                for(var page in request.pageData) {
                    if(request.pageData[page]) {
                        pageData[page] = {};
                        pageData[page]['mtime'] = newPG.getPageMtime(page);
                        pageData[page]['data']  = JSON.stringify(newPG.getPageData(page));
                        doUpload = true;
                    }
                }
                var data = {'categoryData': categoryData, 'pageData': pageData};
                if(doUpload)
                    postData({'action': "settingsData", 'data': data}, callback);
                else
                    callback(success);
            }
            else
                callback(success);
            hideBusy();
        }
    },
    // download events from the server
    downloadEvents: function(callback) {
        if(!(pg.loggedIn && pg.online)) {
            showAlert("You must be online and logged in to issue this command", "Not online");
            //$('#home_action').popup('close');
            callback(true);
        }
        else {
            postData({action: "getEventArray"}, createEvents );
        }
        function createEvents(success, data) {
            if(success) {
                pg.addEventArray(data, false, true);
                PGEN.writeEvents(pg.events, pg.deletedEvents, cb);
            }
            else
                cb();
            function cb() {
                callback(success);
            }
        }
    },
    uploadFiles: function(force, callback) {
        force = typeof(force)=="undefined" ? false : force;
        if(!(pg.loggedIn && pg.online)) {
            showAlert("You must be online and logged in to issue this command");
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
            showAlert("You must be online and logged in to issue this command");
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
                    showLog("ERROR: Could not delete events.");
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
                    PGEN.writeEvents(pg.events, pg.deletedEvents);
                }
                callback(success);
                //pg.deleteEventsInRange(data.startTime, data.endTime);
                //pg.deleteDeletedEventsInRange(data.startTime, data.endTime+1);
            }
        }
    },
    selectAction: function(selection) {
        if(selection == "") {
            // no-op.
        }
        else if(selection == "downloadEvents") {
            showBusy();
            PGEN.downloadEvents(cb);
        }
        else if(selection == "uploadFiles") {
            showBusy();
            PGEN.uploadEvents();
            PGEN.uploadFiles(true, cb);
        }
        else if(selection == "deleteSettings") {
            var localPG = new PG();
            localPG.init();
            localPG.dirty(true);
            PGEN.updateSettings(localPG, settingsCB);
        }
        else if(selection == "deleteEvents") {
            var text ="";
            if(pg.loggedIn && pg.online) {
                text = "<p>Do you wish to delete all events from both this device and the server?</p>" +
                    "<p>(You can log out to delete events on this device only).</p>";
            }
            else {
                text = "<p>Do you wish to delete all events from this device?</p>" +
                "<p>(You can log in to delete events on the server).</p>";
            }
            showDialog({title: "Delete events?", true: "Delete", false: "Cancel"},
                       text, deleteEventsCB.bind(this));
        }
        else if(selection == "deleteEverything") {
            showDialog({title: "Delete all data?", true: "Delete", false: "Cancel"},
                       "<p>Do you wish to delete all data and preferences from this device" +
                       (pg.loggedIn ? " <b>AND the server</b> (because you are currently logged in)" : "") +
                       "?</p><p>This action cannot be undone.</p>",
                       deleteEverythingCB.bind(this));
        }
        else {
            showLog ("Unknown selection: " + selection);
        }
        function cb(success) {
            hideBusy();
            if(!success) {
                showAlert("Command failed.");
            }
            gotoPage(pg.page(), true);
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
                gotoPage(pg.page(), true);
            function deleteCB(success) {
                if(!success) {
                    showAlert("Events could not be erased.");
                }
                gotoPage(pg.page(), true);
            }
        }
        function deleteEverythingCB(success) {
            if(success) {
                gotoPage(pg.page(), true);
                PGEN.deleteEverything(deleteCB.bind(this));
            }
            else
                $('#home_action').popup('close');
            function deleteCB(success) {
                if(!success) {
                    showAlert("Data could not be erased.");
                    $('#home_action').popup('close');
                }
                UI.state = {};
                UI.home.logoutAndErase();
            }
        }
        function settingsCB(success) {
            if(pg.loggedIn && !success)
                showAlert("Could not update settings on the server.", "Error");
            pg.copy(localPG, false);
            PGEN.writePG(pg);
            gotoPage(pg.page(), true);
            resetPage();
        }
        return false;
    },
    deleteLocalEvents: function(callback) {
        pgFile.deleteFile("com.psygraph.events");
        pgFile.deleteAudioFiles();
        pg.initializeEvents();
        PGEN.writeEvents(pg.events, pg.deletedEvents, callback);  // write the (emptied) events locally
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
    },
    generateAllPages: function() {
        for(var i=pg.numPages()-1; i>=0; i--) {
            var page = pg.pages[i];
            PGEN.generatePage(page);
        }
    },
    generateDialog: function() {
        PGEN.ajax("html/dialog.html", "dialog", false);
        var header = '<h4>Psygraph</h4>';
        $("#dialog_header").html(header);
        $("#dialog_page").trigger('create');
        updateNavbar(["dialog"]);
    },
    // generate home
    generateHome: function(callback) {
        callback = (typeof(callback)!="undefined") ? callback : function(){};
        // only make the ajax call if the page never existed
        if( $("#home_page").children().length ) {
            callback(true);
            return;
        }
        PGEN.ajax("html/home.html", "home", false); // syncronous, since its the first page.
        PGEN.generateMenus("home");
        updateNavbar(["home"]);
        $("#home_page").trigger('create');
        callback(true);
    },
    // generate about, user, settings, and help pages
    generateMetaPage: function(page, callback) {
        callback = (typeof(callback)!="undefined") ? callback : function(){};
        // only make the ajax call if the page never existed
        if( $("#"+page+"_page").children().length ) {
            callback(true);
            return;
        }
        PGEN.ajax("html/"+page+".html", page, true, cb.bind(this));
        function cb() {
            var header = '<a id="'+page+'_leftButton" data-role="button" data-position="fixed" onclick="gotoPage(pg.page(), true); return true;" data-icon="arrow-l" data-iconpos="left" class="ui-btn-left leftTitlePopup">Back</a>';
            header += '<h2><img class="banner" src="css/images/logo.png">&nbsp;<b id="'+page+'_title">'+page+'</b></h2>';
            header += '<a id="'+page+'_rightButton" data-role="button" data-position="fixed" data-icon="arrow-u" data-iconpos="right" class="ui-btn-right rightTitlePopup">Forward</a>';
            $("#"+page+"_header").html(header);
            $("#"+page+"_rightButton").hide();
            $("#"+page+"_page").trigger('create');
            callback(true);
        }
    },
    // generate a page
    generatePage: function(page, callback) {
        callback = typeof(callback)!="undefined" ? callback : function(){};
        // only make the ajax call if the page never existed
        if( $("#"+page+"_page").children().length ) {
            callback(true);
            return;
        }
        var filename = "html/" +page +".html"
        PGEN.ajax(filename, page, false, cb.bind(this, page));

        function cb(page, success) {
            updateNavbar([page]);
            $("#"+page+"_page").trigger('create');
            PGEN.generateMenus(page);
            //updateNavbar([page]);
            callback(success);
        }
    },
    generateMenus: function(page) {
        var txt = '';
        var click = '';

        createPopupMenus(page);

        // create the ACTION menu on the right
        txt = '<ul data-role="listview" data-inset="true" class="ui-listview-outer" id="'+page+'ActionSet">';
        txt += '<li data-role="list-divider"><i>Action...</i></li>';
        click = 'onclick="gotoPage(\'about\',true); return true;"';
        txt += '<li data-icon="comment"><a data-role="button" href="" '+click+' id="'+page+'AboutButton" >About</a></li>';
        click = 'onclick="gotoPage(\'prefs\',true); return true;"';
        txt += '<li data-icon="gear"><a data-role="button" href="" '+click+' id="'+page+'PrefsButton" >Prefs</a></li>';
        click = 'onclick="pgUtil.closePopup($(\'#'+page+'RightMenu\'),UI.home.loginUser.bind(UI.home,false)); return true;"';
        var loginString = pg.loggedIn ? "Logout" : "Login";
        txt += '<li data-icon="home"><a data-role="button" href="" class="loginButton" '+click+' id="'+page+'LoginButton" >'+loginString+'</a></li>';
        if(pg.getUserDataValue("debug")) {
            // show options for file handling
            click = 'onclick=\"pgUtil.switchPopup($(\'#'+page+'RightMenu\'),$(\'#EventPopupMenu\')); return true;\"';
            txt += '<li data-icon="alert"><a href="" id="'+page+'EventPopup" ' +click+ ' >Files</a></li>';
        }
        click = 'onclick="gotoPage(\'help\',true); return true;"';
        txt += '<li data-icon="info"><a data-role="button" href="" '+click+' id="'+page+'HelpButton" >Help</a></li>';
        txt += '</ul>';
        $("#"+page+"RightMenu").html(txt).trigger("refresh");
        $("#"+page+"ActionSet").listview().listview("refresh");

        function createPopupMenus(page) {
            var node = $("#EventPopupMenu");
            if(node.length)
                node.remove();
            txt  = '';
            txt += '<div data-role="popup" id="EventPopupMenu" data-theme="a">';
            txt += '<ul data-role="listview" data-inset="true" class="ui-listview-outer" >';
            txt += '<li data-role="list-divider"><i>Manage Files...</i></li>';
            if(pg.loggedIn && pg.online) {
                click = "return PGEN.selectAction('downloadEvents');";
                txt += '<li data-icon="false"><a href="" onclick="'+click+'">Download events</a></li>';
                click = "return PGEN.selectAction('uploadFiles');";
                txt += '<li data-icon="false"><a href="" onclick="'+click+'">Upload files</a></li>';
            }
            click = "return PGEN.selectAction('deleteEvents');";
            txt += '<li data-icon="false"><a href="" onclick="'+click+'">Delete events</a></li>';
            click = "return PGEN.selectAction('deleteSettings');";
            txt += '<li data-icon="false"><a href="" onclick="'+click+'">Delete settings</a></li>';
            click = "return PGEN.selectAction('deleteEverything');";
            txt += '<li data-icon="false"><a href="" onclick="'+click+'">Delete everything</a></li>';
            txt += '</ul></div>';
            node = $.parseHTML(txt)[0];
            $("body")[0].insertBefore(node, null);
            $("#EventPopupMenu").popup();
            
            // page navigation
            /*
            var node = $("#PageNavPopupMenu");
            if(node.length)
                node.remove();
            txt  = '';
            txt += '<div data-role="popup" id="PageNavPopupMenu" data-theme="a">';
            txt += '<ul data-role="listview" data-inset="true" class="ui-listview-outer" >';
            txt += '<li data-role="list-divider"><i>Change tool...</i></li>';
            for(var i=0; i<pg.numPages(); i++) {
                txt += '<li data-icon="false"><a href="" data-rel="popup" onclick="gotoPage(\''+pg.pages[i]+'\');return true;">' +pg.pages[i] +'</a></li>';
            }
            txt += '</ul></div>';
            node = $.parseHTML(txt)[0];
            $("body")[0].insertBefore(node, null);
            $("#PageNavPopupMenu").popup();
            */
        }
    },
    
    // generate header
    getHeader: function(page) {
        var id = page+"_header";
        var txt  = '<div id="' +id+ '" data-role="header" data-theme="b" data-position="fixed" data-tap-toggle="false">';

        // Left Menu
        click = 'onclick="gotoPage(\'settings\',true); return true;"';
        txt += '<a id="'+page+'LeftPopup" href="" '+click+' ';
        txt += ' class="leftTitlePopup ui-btn ui-corner-all ui-shadow ui-btn-inline ui-icon-gear ui-btn-icon-left">Settings</a>';

        // Center graphic
        var label = page;
        if(label=="home")
            label = "Psygraph";
        txt += '<h1 id="banner"><img class="banner" src="css/images/logo.png">&nbsp;<b>'+label+'</b></h1>';

        // Right Menu
        txt += '<a id="'+page+'RightPopup" href="" ';
        txt += ' class="rightTitlePopup ui-btn ui-corner-all ui-shadow ui-btn-inline ui-icon-action ui-btn-icon-left">Action</a>';
        txt += '<div data-role="popup" id="'+page+'RightMenu" class="RightMenu"></div>';

        // Navbar
        txt += '<div id="'+page+'_navbar" class="navbar" data-role="navbar" data-position="fixed" data-tap-toggle="false" data-theme="b"></div>';
        
        txt += '</div>';
        return txt;
    },

    // transform the page
    ajax: function(filename, page, is_async, cb) {
        var formdata = URI("?");
        //formdata.addQuery("username",     pg.username);
        //formdata.addQuery("password",     pg.cert);
        formdata.addQuery("page", page);
        //var dat = formdata.query();
        var dat = URI.decodeQuery(formdata.query());
        var loc = ""+document.location;
        var path = loc.substring(0, loc.lastIndexOf('/') + 1);
        $.ajax({    url:      path + filename,
                    type:     "GET",
                    async:    is_async,
                    timeout:  8000,
                    dataType: "text",
                    crossDomain: true,
                    contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
                    data:     dat,
                    cache:    false,
                    success:  function(data){PGEN.ajaxCallback(true, data, page, cb)},
                    failure:  function(data){PGEN.ajaxCallback(false, filename, page, cb)}
            });
    },

    ajaxCallback: function(success, data, page, callback) {
        callback = (typeof(callback)!="undefined") ? callback : function(){};
        if(!success) {
            callback(success);
            return;
        }

        // insert the node
        var node    = $("#"+page+"_page");
        var head    = $.parseHTML( PGEN.getHeader(page) );
        var content = $.parseHTML('<div id="' +page+ '_content" data-role="content">' +data+ '</div>', document, true);

        node.append(head[0]);
        node.append(content[0]);
        //if(ONSEN) {
        //    $("#onsNavigator").append(node[0]);
        //}
        //else {
        //    if(page=="home")
        //        $("body").prepend(node[0]);
        //    else
        //        $("body").append(node[0]);
        //}

        callback(success);
    }
};

function getNavbar(page) {
    var txt = "";
    var id = page+"_navbar";
    var btnAtts = '" class="navbar_link fast" data-role="button" data-iconpos="notext" data-theme="b" href="" ';
    txt += "<ul>";
    txt += '<li class="navbar_button left_navbar_button"><a id="button_left_'  +id +btnAtts +' onclick="return false"  data-icon="arrow-l">.</a></li>';
    //txt += '<li class="navbar_button cat_button"><a id="button_down_'  +id +btnAtts +' data-icon="arrow-d"></a></li>';
    //txt += '<li class="navbar_button cat_button"><a id="button_up_'    +id +btnAtts +' data-icon="arrow-u"></a></li>';
    txt += '<li class="navbar_button cat_button"><a id="button_cat_' +id +'" class="navbar_link cat_link" data-role="button" data-theme="b" href="" onclick="return false;" data-icon="tag" data-iconpos="left" >Uncategorized</a></li>';
    txt += '<li class="navbar_button right_navbar_button"><a id="button_right_' +id +btnAtts +' onclick="return true" data-icon="arrow-r">.</a></li>';
    txt += '</ul>';
    return txt;
}

function updateNavbar(pages) {
    pages = pgUtil.deepCopy( typeof(pages)!="undefined" ? pages : pg.pages);
    for(var i=0; i<pages.length; i++) {
        var page = pages[i];
        if($("#"+page+"_page .navbar_button").length) {
        }
        else {
            var txt = getNavbar(page, false);
            var footid = page + "_navbar";
            $("#"+page+"_navbar").html(txt).trigger("create").trigger("refresh");
            $('#button_left_'+footid).on("vclick", goLeft);
            //$('#button_down_'+footid).tap(goDown);
            //$('#button_up_'+footid).tap(goUp);
            $('#button_right_'+footid).on("vclick", goRight);
            $('#button_left_'+footid).html("&nbsp;");
            $('#button_right_'+footid).html("&nbsp;");

            $("#button_cat_"+page +"_navbar").on("vclick", 
                                                 function () {
                                                     updateSubheader();
                                                     $("#"+page+"CatMenu").popup().popup("open");
                                                     return false;
                                                 });

            //$("#"+page+"LeftPopup").on("vclick", function() {
            //        $("#"+page+"LeftMenu").popup("open");
            //        return false;
            //    });        
            $("#"+page+"RightPopup").on("vclick", function() {
                    $("#"+page+"RightMenu").popup("open");
                    return false;
                });
        }
    }
    // disable inoperable nav buttons.
    $(".navbar_button").removeClass("ui-disabled");
    $("#home_page .left_navbar_button").addClass("ui-disabled");
    var lastPage = pg.pages[pg.pages.length-1];
    $("#"+lastPage+"_page .right_navbar_button").addClass("ui-disabled");
}
