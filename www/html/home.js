
var home = function () {
    page.call(this, "home");
    this.initialized = false;
    this.loggingIn   = false;
    this.askedForPW  = false;
};

home.prototype = Object.create(page.prototype);

home.prototype.constructor = home;

home.prototype.update = function(show) {
    if(!this.initialized) {
        this.initialized = true;
        this.beginLogin(cb.bind(this)); // the ONLY call to begin login.
    }
    else {
        //this.status(pg.loggedIn);
    }
    if(show) {
        this.resize();
    }
    function cb() {
        if(WORDPRESS==true) {
            // these WP_* variables are all set if index.html is served by wp.php
            PGEN.login(WP_USERNAME, 
                       this.passwordCB.bind(this, WP_SERVER, WP_USERNAME, "", WP_CERT, this.endLogin.bind(this)));
        }
        else {
            PGEN.readPG(localFileCB.bind(this));
        }
    }
    function localFileCB(success, struct) {
        if(success) {
            var cert = "";
            if(pgUtil.getCurrentTime() < struct.certExpiration)
                cert = struct.cert;
            
            if(struct.loggedIn && pg.online) {
                var server   = struct.server;
                var username = struct.username;
                var pluginIndex = server.indexOf("/wp-content");
                if(pluginIndex != -1)
                    server = server.substr(0, pluginIndex);
                PGEN.login(username,
                           this.passwordCB.bind(this, server, username, "", cert, this.endLogin.bind(this)));
                return;
            }
        }
        else {
            showError("Failed to read data, writing data now will erase previous settings.");
        }
        PGEN.login(pg.username, cb.bind(this));
        function cb(success) {
            this.endLogin();
        }
    }
};

home.prototype.resize = function() {
    page.prototype.resize.call(this, false);
};

home.prototype.settings = function(data) {
    if(arguments.length) {
        var data = this.getPageData(); // this line clears any state (when login button is pressed).

        $("#home_username").val(data.username);
        $('#home_username').prop('readonly', pg.loggedIn);

        if(pg.getUserDataValue("debug"))
            $("#serverDiv").show();
        else
            $("#serverDiv").hide();
        $("#home_server").val(data.server);
        $('#home_server').prop('readonly', pg.loggedIn);
        
        var loginString = pg.loggedIn ? "Logout" : "Login";
        $('#login').val(loginString).button("refresh");

        UI.settings.pageCreate();
    }
    else {
        var data = this.getPageData();
        if(!pg.loggedIn) {
            data.server = $("#home_server").val();
            data.username = $("#home_username").val();
        }
        this.setPageData(data, "home", "Uncategorized"); // make sure we write to the "Uncategorized" section.
        return data;
    }
};

home.prototype.beginLogin = function(callback) {
    if(navigator.splashscreen) {
        navigator.splashscreen.show();
        navigator.splashscreen.hide();
    }
    showBusy(true);
    showLog("LOGIN_BEGIN");
    this.loggingIn = true;
    // If we find one of these files sitting around, we encountered a login error.
    // So we ask the user if they wish to reset the local files.
    var wait = $.Deferred();
    pgFile.readFile("com.psygraph.lastError", handleError);
    pgFile.readFile("com.psygraph.state",     handleState);
    $.when(wait).then(callback);

    function handleState(success, state) {
        if(success) {
            pgFile.deleteFile("com.psygraph.state");
            UI.state = state;
            pgAccel.update(true, UI.state.accel);
            pgLocation.update(true, UI.state.location);
        }
    }
    function handleError(success, event) {
        if(success) { // read the file containing an error.  Bummer.
            pgFile.deleteFile("com.psygraph.lastError"); // try to handle once only
            showDialog({'title': event.data.title, true: "Delete", false: "Cancel"},
                       "<p>There was an uncaught error during the previous login: "+event.data.text+"</p>" +
                       "<p>Do you wish to delete the local data and settings?</p>",
                       cb);
        }
        else
            wait.resolve();
        function cb(success) {
            if(success) {
                pgFile.deleteFile("com.psygraph.pg");
                pgFile.deleteFile("com.psygraph.events");
                showLog("Error: Deleted PG on user request.");
                UI.home.logoutAndErase(cb2.bind(this, event));
            }
            else
                cb2(event);
        }
        function cb2(event) {
            pg.addNewEvents(event, true);
            // hopefully the home page is more stable...
            wait.resolve();
        }
    }
};

home.prototype.hasFinishedLogin = function() {
    return this.initialized && !this.loggingIn;
};

home.prototype.endLogin = function() {
    showBusy(false);
    showLog("LOGIN_END");
    this.loggingIn = false;
    //pgFile.deleteFile("com.psygraph.lastError");
    pgFile.readFile("com.psygraph.exit", handleExit);
    PGEN.readPsygraph(cb);
    function cb(success) {
        var firstPage = pg.page();
        if(!success) {
            firstPage = "help";
        }
        setTimeout(gotoLoadedPage.bind(this,firstPage), 200);
    }
    function handleExit(success, event) {
        if(success) {
            pgFile.deleteFile("com.psygraph.exit");
            pg.addNewEvents(event, false);
        }
    }
};

home.prototype.lever = function(arg) {
};

home.prototype.loginUser = function(onSettingsPage) {
    UI.home.loggingIn = true;
    var data = this.getPageData();
    var username = data.username;
    var server   = data.server;
    if(onSettingsPage) {
        username = $('#home_username').val();
        server   = $('#home_server').val();
        //this.setPageDataField("username", username, "home", "Uncategorized");
        //this.setPageDataField("server", server, "home", "Uncategorized");
        //data = this.getPageData();
    }
    showBusy(true);
    var f = function(){ 
        UI.home.loggingIn=false; 
        showBusy(false); 
        gotoPage(pg.page());
    };
    if(!onSettingsPage)
        f = function() { 
            UI.home.loggingIn=false; 
            showBusy(false); 
            gotoPage("home");
            gotoPageSettings();
        };
    if(pg.loggedIn) {
        PGEN.logout(this.logoutCB.bind(this));
        return
    }
    if(!pg.online) {
        showDialog({title: "Not online", true: "OK"},
                   "<p>This device is not currently online, please either connect or work in offline mode.</p>",
                   f);
        return;
    }
    if(onSettingsPage) {
        if(username=="") {
            showDialog({title: "Invalid username", true: "OK"},
                       "<p>Please provide a username with an existing server account.</p>",
                       f);
        }
    }
    else {
        if(username=="") {
            gotoPage("home");
            gotoPageSettings();
            f();
            return;
        }   
    }
    if(server=="") {
        server = UI.home.getDefaultServerURL();
    }
    PGEN.verifyUser(server, username, verifyUserCB);
    function verifyUserCB(err) {
        if(!err) {
            UI.home.getPassword(server, username, f);
        }
        else {
            if(err=="user") {
                showDialog({'title': "Username failure", 'true': "OK"},
                           "<p>No account (username: "+username+") at server: "+
                           server+".<br/>"+
                           "You may need to "+UI.home.getRegisterLink(server, "create an account")+".</p>",
                           f
                );
            }
            else if(err=="server") {
                showDialog({'title': "Server failure", 'true': "OK"},
                           "<p>There was a problem contacting the server: "+server+"<br/>"+
                           "Please check your internet connection.</p>",
                           f
                );
            }
            else {
                showLog("Error logging in: " + err);
                f();
            }
        }
    }
};

home.prototype.status = function(onlineStatus) {
    onlineStatus = typeof(onlineSatus)!="undefined" ? onlineStatus : pg.loggedIn; 
    var txt = "<br/>";
    txt += "<p class='banner'><img src='img/logo.png' height='108' width='108'></img></p>";
    txt += "<br/><br/><br/>";
    txt += '<div id="statistics"></div>';
    if(onlineStatus) { // online
        $(".loginButton").html("Logout");
        $('#login').val("Logout").button("refresh");
    } 
    else {
        $(".loginButton").html("Login");
        $('#login').val("Login").button("refresh");
    }
    $("#home_status").html(txt);
    computeStats.call(this);
    //window.setTimeout(.bind(this), 200);
    
    function computeStats(){
        var data = this.getPageData();
        var txt = "";
        var lastSync = "unknown.";
        if(pg.lastSync)
            lastSync = pgUtil.getDateString(pg.lastSync, false);
        if(onlineStatus) { // online
            txt += "<p><b>Online</b></p>";
            txt += "<ul>";
            txt += "<li><b>username</b>: "  +data.username+"</li>";
            txt += "<li><b>server</b>: "    +this.getServerLink(data.server)+"</li>";
            txt += "<li><b>Last sync</b>: " +lastSync +"</li>";
            txt += "</ul>";
        }
        else {
            //txt += "<p><b>Offline</b></p>";
            //txt += "<ul>";
            //txt += "<li><b>Last sync</b>: " +lastSync +"</li>";
            //txt += "</ul>";
        }
        /*
        txt += "<p><b>30 day history</b>:</p>";
        txt += "<ul>";
        var pages = [ pgUtil.deepCopy(pg.allEventPages), pgUtil.deepCopy(pg.pages)];
        // perform an intersection
        pages = pages.shift().filter(function(v) {
                return pages.every(function(a) {
                        return a.indexOf(v) !== -1;
                    });
            });
        for(i=0; i<pages.length; i++) {
            var page = pages[i];
            txt += "<li><b>"+page+"</b>: "+UI[page].getSummary(page, pg.category()) +"</li>";
        }
        txt += "</ul>";
        */
        $("#statistics").html(txt);
    }
};

home.prototype.getServerLink = function(server) {
    var serverURL = "http://" + pgUtil.extractDomain(server);
    return "<a href='' onClick='return pgUtil.openWeb(\""+serverURL+"\")'>"+serverURL+"</a>";
};
home.prototype.getRegisterLink = function(server, txt) {
    var serverURL = "http://" + pgUtil.extractDomain(server);
    return "<a href='' onClick='return pgUtil.openWeb(\""+serverURL+"/register\")'>"+txt+"</a>";
};

home.prototype.getPassword = function(server, username, callback) {
    var data = this.getPageData();
    if(typeof(data.cert) != "undefined" && data.cert != "") {
        // we have the information we need, skip the dialog
        this.passwordCB(server, username, "", data.cert, callback);
    }
    else {
        this.askedForPW = true;
        var serverLink = this.getServerLink(server);
        gotoPage(pg.page());
        showDialog({title: "Enter your password", true: "OK", false: "Cancel"},
                   "<p>"+serverLink+"</p><input type='password' id='passw' name='password' value=''/>", 
                   pwcb
        );
    }
    function pwcb(clickedOK) {
        gotoPage("home");
        gotoPageSettings();
        if(!clickedOK) {
            callback();
        }
        else {
            var pass = $('#passw').val();
            UI.home.passwordCB(server, username, pass, data.cert, callback);
        }
    }
};

home.prototype.passwordCB = function(server, username, password, cert, callback) {
    callback = typeof(callback)!="undefined" ? callback : function(){};
    PGEN.serverLogin(server, username, password, cert, 
                     this.serverLoginCB.bind(this, server, username, callback));
};

home.prototype.serverLoginCB = function(server, username, callback, success) {
    var data = this.getPageData();
    if(success) {
        // update the page data with verified informtation
        data.username = username;
        data.server   = server;
        data.cert     = pg.cert;
        this.setPageData(data, "home", "Uncategorized");
        this.logEvent("login");
        this.status(true);
        callback();
    }
    else {
        this.status(false);
        this.setPageDataField("cert", "", "home", "Uncategorized");
        if(this.askedForPW == false) {
            // try one more time after getting a password from the user.
            this.getPassword(server, username, callback);
            return;
        }
        showDialog({title: "Login failure for "+username, true: "OK"},
                   "<p>If you need to register or recover your password, <br/>"+
                   "visit " + this.getServerLink(server) + "</p>",
                   callback, "settings"
        );
    }
};

home.prototype.logoutAndErase = function(callback) {
    callback = typeof(callback)!="undefined" ? callback : function(){};
    PGEN.logout(this.logoutCB.bind(this), true);
    pg.init();
    var data = this.getPageData();
    data.server   = "";
    data.username = "";
    data.cert     = "";
    this.setPageData(data, "home", "Uncategorized");
    gotoLoadedPage("home", true);
    callback();
};

home.prototype.getPageData = function() {
    var data = pg.getPageData("home", "Uncategorized");
    if(! ('server' in data))
        data.server = UI.home.getDefaultServerURL();
    if(! ('username' in data))
        data.username = "";
    if(! ('cert' in data))
        data.cert = "";
    return data;
};

home.prototype.getDefaultServerURL = function() {
    return "https://psygraph.com";
};

home.prototype.logoutCB = function(success) {
    if(success) {
        this.logEvent("logout");
    } else {
        showAlert("Logout failure");
    }
    this.status(false);
    showBusy(false);
};

home.prototype.logEvent = function(type) {
    var data = this.getPageData();
    if(pg.getUserDataValue("debug")) {
        var event = {page: "home",
                     type: type,
                     start: pgUtil.getCurrentTime(),
                     data: {}};
        if(type=="exit") // write a file for later.
            pgFile.writeFile("com.psygraph.exit", event);
        pg.addNewEvents(event, true);
    }
};


UI.home = new home();
//# sourceURL=home.js
