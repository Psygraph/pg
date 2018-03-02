//"use strict";

var Preferences = function () {
    Page.call(this, "preferences");
    this.initialized = false;
    this.setDebug();
};

Preferences.prototype = Object.create(Page.prototype);
Preferences.prototype.constructor = Preferences;

Preferences.prototype.update = function(show, data) {
    if(show) {
        if(!this.initialized) {
            if(pgUtil.isWebBrowser()) {
                $("#BTDiv").hide();
            }
            this.initialized = true;
        }
        data = this.settings(show, data);
        // Optionally get a location before starting a bluetooth scan
        //pgLocation.getCurrentLocation(posCB);
        posCB();
        this.resize();
    }
    else {
        pgBluetooth.stopScan(function(){});
        data = this.settings(show, data);
    }
    return data;

    function posCB(loc) {
        pgUI_showLog("Bluetooth scan starting...");
        var devs = $("#BTDevices");
        pgBluetooth.startScan(UI.preferences.btCallback);
        UI.preferences.btSetCurrentDevice();
    }
};

Preferences.prototype.settings = function(show, data) {
    if (show) {
        // public access and debug
        $("#preferences_debug").prop('checked', data.debug).checkboxradio("refresh");
        var user = $("#preferences_username");
        user.val(pg.username);
        user.prop('readonly', pg.loggedIn);

        if(pg.debug())
            $("#serverDiv").show();
        else
            $("#serverDiv").hide();
        var server = $("#preferences_server");
        server.val(pg.server);
        server.prop('readonly', pg.loggedIn);

        if(pgUtil.isWebBrowser()) {
            $("#preferences_wifiOnly").parent().hide();
            $("#preferences_email").parent().hide();
        }
        else {
            $("#preferences_wifiOnly").prop('checked', data.wifiOnly).checkboxradio("refresh");
        }
        var loginString;
        if(pg.loggedIn) {
            loginString = "Logout";
            $("#preferences_onlineButtons").show();
        }
        else {
            $("#preferences_onlineButtons").hide();
            loginString = "Login";
        }
        $('#preferences_login').val(loginString).button("refresh");
    }
    else {
        data.debug = $("#preferences_debug")[0].checked ? 1 : 0;
        this.setDebug( data.debug );
        if(!pg.loggedIn) {
            pg.server   = $("#preferences_server").val();
            pg.username = $("#preferences_username").val();
        }
        if(!pgUtil.isWebBrowser())
            data.wifiOnly = $("#preferences_wifiOnly")[0].checked;
    }
    return data;
};

Preferences.prototype.resize = function() {
    Page.prototype.resize.call(this, true);
};

Preferences.prototype.getPageData = function() {
    var data = pg.getPageData("preferences", "Uncategorized");
    if(! ('debug' in data))
        data.debug = 0;
    if(! ('wifiOnly' in data))
        data.wifiOnly = true;
    return data;
};

Preferences.prototype.getEmail = function() {
    return $("#preferences_username").val();
};

Preferences.prototype.submitSettings = function(doClose) {
    if(doClose!=="cancel") {
        var data = this.getPageData();
        data = this.settings(false, data);
        pmtime = pgUtil.getCurrentTime();
        pg.setPageData(pmtime, data, "preferences", "Uncategorized");
    }
    if(doClose!=="apply")
        gotoPage( pg.page() );
};

Preferences.prototype.loginUser = function() {
    var onSettingsPage = (getPage()==="preferences");
    var data = this.getPageData();
    var username = $('#preferences_username').val();
    var server   = $('#preferences_server').val();
    var cert     = pg.cert;
    pgLogin.loginUserAndServer(username, server, true);
};

Preferences.prototype.setDebug = function(yn) {
    var data = this.getPageData();
    yn = (typeof(yn)!=="undefined") ? yn : data.debug;
    if(yn) {
        $(".debug").css({'display' : ""});
    }
    else {
        $(".debug").css({'display' : "none"});
    }
};

Preferences.prototype.btConnect = function() {
    var name = pgBluetooth.deviceName();
    var btDev = $("#BTDevices").val();
    if(name!=="none") {
        pgUI_showLog("Bluetooth disconnecting from device: " + btDev);
        btDev = "none";
    }
    else {
        pgUI_showLog("Bluetooth connecting to device: " + btDev);
    }
    pgBluetooth.stopScan(cb);
    function cb() {
        if(btDev==="none")
            pgBluetooth.disconnect(finish);
        else
            pgBluetooth.connect(btDev, finish);
    }
    function finish(yn) {
        UI.preferences.btSetCurrentDevice();
    }
};

Preferences.prototype.btCallback = function() {
    //showLog("Bluetooth scan found a device");
    var btDevs = pgBluetooth.devices();
    var devs   = $("#BTDevices");
    var v      = devs.val();
    var len = 0;
    addDev("none");
    for(var i=0; i<btDevs.length; i++) {
        var dev = btDevs[i];
        var name = dev.name;
        if(name) {
            len = len + 1;
            addDev(name);
        }
    }
    devs.val(v);
    devs.trigger("change");
    function addDev(nm) {
        var exists = false;
        $('#BTDevices option').each(function(){
                if (this.value === nm) {
                    exists = true;
                    return false;
                }
            });
        if(!exists)
            devs.append(new Option(nm,nm));
    }
};

Preferences.prototype.btSetCurrentDevice = function() {
    var name = pgBluetooth.deviceName();
    pgUI_showLog("Bluetooth connected to device: " + name);
    var label = "Connect to: ";
    var devs     = $("#BTDevices");
    var settings = $("#BTSettings");
    if(name !== "none") {
        label = "Disconnect: '"+name+"'";
        devs.selectmenu('disable');
        //devs.parent().hide();
        //settings.parent().show();
    }
    else {
        devs.selectmenu('enable');
        //devs.parent().show();
        //settings.parent().hide();
    }
    $('#BTConnect').val(label).button("refresh");
};

UI.preferences = new Preferences();
//# sourceURL=preferences.js
