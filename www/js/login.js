
var Login = function () {
    this.loggingIn   = false;
    this.askedForPW  = false;
};

Login.prototype.begin = function() {
    // set the online status
    if(navigator.connection) {
        var networkState = navigator.connection.type;
        if(networkState === Connection.NONE)
            pg.online = false;
        else
            pg.online = true;
        document.addEventListener("online", onOnline, false);
        document.addEventListener("offline", onOffline, false);
    }

    if(WORDPRESS==true) {
        // these WP_* variables are all set if index.html is served by wp.php
        PGEN.login(WP_USERNAME,
                   this.passwordCB.bind(this, WP_SERVER, WP_USERNAME, "", WP_CERT, this.endLogin.bind(this)));
    }
    else {
        PGEN.readPG(localFileCB.bind(this));
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
                if(pluginIndex !== -1)
                    server = server.substr(0, pluginIndex);
                PGEN.login(username,
                           this.passwordCB.bind(this, server, username, "", cert, this.endLogin.bind(this)));
                return;
            }
        }
        else {
            pgUI_showError("Failed to read data, writing data now will erase previous settings.");
        }
        PGEN.login(pg.username, cb.bind(this));
        function cb(success) {
            this.endLogin();
        }
    }
};

Login.prototype.beginLogin = function(callback) {
    if(navigator.splashscreen)
        navigator.splashscreen.hide();
    pgUI.showBusy(true);
    pgUI_showLog("LOGIN_BEGIN");
    this.loggingIn = true;
    // If we find one of these files sitting around, we encountered a login error.
    // So we ask the user if they wish to reset the local files.
    var wait = $.Deferred();
    pgFile.readFile("com.psygraph.lastError", handleError.bind(this));
    pgFile.readFile("com.psygraph.state",     handleState.bind(this));
    $.when(wait).then(callback);

    function handleState(success, state) {
        if(success) {
            pgFile.deleteFile("com.psygraph.state");
            UI.state = state;
            updateState(true);
        }
    }
    function handleError(success, event) {
        if(success) { // read the file containing an error.  Bummer.
            pgFile.deleteFile("com.psygraph.lastError"); // try to handle once only
            pgUI.showDialog({'title': event.data.title, true: "Delete", false: "Cancel"},
                       "<p>There was an uncaught error during the previous login: "+event.data.text+"</p>" +
                       "<p>Do you wish to delete the local data and settings?</p>",
                       cb.bind(this), "NOP");
        }
        else
            wait.resolve();
        function cb(success) {
            if(success) {
                pgFile.deleteFile("com.psygraph.pg");
                pgFile.deleteFile("com.psygraph.events");
                pgUI_showLog("Error: Deleted PG on user request.");
                this.logoutAndErase(cb2.bind(this, event));
            }
            else
                cb2(event);
        }
        function cb2(event) {
            pg.addNewEvents(event, true);
            wait.resolve();
        }
    }
};

Login.prototype.hasFinishedLogin = function() {
    return !this.loggingIn;
};

Login.prototype.endLogin = function() {
    pgUI.showBusy(false);
    pgUI_showLog("LOGIN_END");
    this.loggingIn = false;
    //pgFile.deleteFile("com.psygraph.lastError");
    pgFile.readFile("com.psygraph.exit", handleExit);
    PGEN.readPsygraph(cb);
    function cb(success) {
        var firstPage = pg.page();
        if(!success) {
            firstPage = "help";
        }
        gotoPage(firstPage);
        gotoCategory(pg.category());
        if(navigator.splashscreen)
            navigator.splashscreen.hide();
        //setTimeout(gotoLoadedPage.bind(this,firstPage), 200);
    }
    function handleExit(success, event) {
        if(success) {
            pgFile.deleteFile("com.psygraph.exit");
            pg.addNewEvents(event, false);
        }
    }
};


Login.prototype.loginUser = function() {
    var username = pg.username;
    var server   = pg.server;
    //var cert     = pg.cert;
    pgLogin.loginUserAndServer(username, server, false);
};

Login.prototype.loginUserAndServer = function(username, server, onSettingsPage) {
    this.loggingIn = true;
    pgUI.showBusy(true);
    var p = function(){ 
        this.loggingIn=false;
        pgUI.showBusy(false);
        gotoPage(getPage());
    };
    var f = function() { 
        this.loggingIn=false;
        pgUI.showBusy(false);
        gotoPage("preferences");
    };
    if(pg.loggedIn) {
        PGEN.logout(this.logoutCB.bind(this));
        return
    }
    if(!pg.online) {
        pgUI.showDialog({title: "Not online", true: "OK"},
                   "<p>This device is not currently online, please either connect or work in offline mode.</p>",
                   f.bind(this));
        return;
    }
    if(onSettingsPage) {
        if(username==="") {
            pgUI.showDialog({title: "Invalid username", true: "OK"},
                       "<p>Please provide a username with an existing server account.</p>",
                       f.bind(this));
        }
    }
    else {
        if(username==="") {
            gotoPage("preferences");
            f.call(this);
            return;
        }   
    }
    if(server==="") {
        server = this.getDefaultServerURL();
    }
    PGEN.verifyUser(server, username, verifyUserCB.bind(this));
    function verifyUserCB(err) {
        if(!err) {
            this.getPassword(server, username, p);
        }
        else {
            if(err==="user") {
                pgUI.showDialog({'title': "Username failure", 'true': "OK"},
                           "<p>No account (username: "+username+") at server: "+
                           server+".<br/>"+
                           "You may need to "+this.getRegisterLink(server, "create an account")+".</p>",
                           f.bind(this)
                );
            }
            else if(err==="server") {
                pgUI.showDialog({'title': "Server failure", 'true': "OK"},
                           "<p>There was a problem contacting the server: "+server+"<br/>"+
                           "Please check your internet connection.</p>",
                           f.bind(this)
                );
            }
            else {
                pgUI_showLog("Error logging in: " + err);
                f.call(this);
            }
        }
    }
};


Login.prototype.getServerLink = function(server) {
    var serverURL = "http://" + pgUtil.extractDomain(server);
    return "<a href='' onClick='return pgUtil.openWeb(\""+serverURL+"\")'>"+serverURL+"</a>";
};
Login.prototype.getRegisterLink = function(server, txt) {
    var serverURL = "http://" + pgUtil.extractDomain(server);
    return "<a href='' onClick='return pgUtil.openWeb(\""+serverURL+"/register\")'>"+txt+"</a>";
};

Login.prototype.getPassword = function(server, username, callback) {
    if(typeof(pg.cert) !== "undefined" && pg.cert !== "") {
        // we have the information we need, skip the dialog
        this.passwordCB(server, username, "", pg.cert, callback);
    }
    else {
        this.askedForPW = true;
        var serverLink = this.getServerLink(server);
        gotoPage(pg.page());
        pgUI.showDialog({title: "Enter your password", true: "OK", false: "Cancel"},
                   "<p>"+serverLink+"</p><input type='password' id='passw' name='password' value=''/>", 
                   pwcb.bind(this)
        );
    }
    function pwcb(clickedOK) {
        gotoPage("preferences");
        if(!clickedOK) {
            callback();
        }
        else {
            var pass = $('#passw').val();
            this.passwordCB(server, username, pass, "", callback);
        }
    }
};

Login.prototype.passwordCB = function(server, username, password, cert, callback) {
    callback = typeof(callback)!=="undefined" ? callback : function(){};
    PGEN.serverLogin(server, username, password, cert, 
                     this.serverLoginCB.bind(this, server, username, callback));
};

Login.prototype.serverLoginCB = function(server, username, callback, success) {
    if(success) {
        // pg already updated with verified informtation
        this.logEvent("login");
        UI.home.status(true);
        $(".loginButton").html("Logout");
        $('#login').val("Logout").button("refresh");
        callback();
    }
    else {
        UI.home.status(false);
        $(".loginButton").html("Login");
        $('#login').val("Login").button("refresh");
        pg.cert = "";
        //UI.preferences.setLoginInfo();
        if(!this.askedForPW) {
            // try one more time after getting a password from the user.
            this.getPassword(server, username, callback);
            return;
        }
        pgUI.showDialog({title: "Login failure for "+username, true: "OK"},
                   "<p>If you need to register or recover your password, <br/>"+
                   "visit " + this.getServerLink(server) + "</p>",
                   callback);
    }
};

Login.prototype.logoutAndErase = function(callback) {
    callback = typeof(callback)!="undefined" ? callback : function(){};
    PGEN.logout(this.logoutCB.bind(this), true);
    pg.init();
    gotoPage("home");
    callback();
};

Login.prototype.getDefaultServerURL = function() {
    return "https://psygraph.com";
};

Login.prototype.logoutCB = function(success) {
    if(success) {
        this.logEvent("logout");
    } else {
        pgUI.showAlert("Logout failure");
    }
    UI.home.status(false);
    pgUI.showBusy(false);
};

Login.prototype.logEvent = function(type) {
    if(pg.debug()) {
        var event = {page: "home",
                     type: type,
                     start: pgUtil.getCurrentTime(),
                     data: {}};
        if(type==="exit") // write a file for later.
            pgFile.writeFile("com.psygraph.exit", event);
        pg.addNewEvents(event, true);
    }
};

var pgLogin = new Login();
