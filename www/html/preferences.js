//"use strict";

var preferences = function () {
    page.call(this, "preferences");
    this.userData = {};
    this.localPG = null;
    this.initialized = false;
    var data = this.getPageData();
    this.setDebug();
}

preferences.prototype = Object.create(page.prototype);
preferences.prototype.constructor = preferences;

preferences.prototype.update = function(show, state) {
    if(!show) {
        pgBluetooth.stopScan(function(){});
    }
    else {
        var data = this.getPageData();
        // pages
        //var s = "";
        //var dispPages = pgUtil.deepCopy(pg.allPages);
        //dispPages.splice( dispPages.indexOf("home"), 1);
        //if(! pg.getUserDataValue("debug") )
        //    dispPages.splice( dispPages.indexOf("map"), 1);
        //s += pgUtil.selectPages("new_pages", "Show tools:", dispPages, pg.pages);
        //$("#page_select").html(s).trigger("create");

        if(!this.initialized) {
            if(pgUtil.isWebBrowser()) {
                $("#BTDiv").hide();
            }
            this.initialized = true;
        }
        
        /* // swipe
        if(pgUtil.isWebBrowser())
            $("#swipeDiv").hide();
        else
            $("#swipeSlider").val(data.swipeVal).slider('refresh');
        */

        // public access and debug
        $("#preferences_debug").prop('checked', data.debug).checkboxradio("refresh");
        //$("#publicAccess").prop('checked', data.publicAccess).checkboxradio("refresh");
        if(pgUtil.isWebBrowser())
            $("#wifiOnly").parent().hide();
        else
            $("#wifiOnly").prop('checked', data.wifiOnly).checkboxradio("refresh");
        //$("#screenTaps").prop('checked', data.screenTaps).checkboxradio("refresh");
	    this.resize();
        // Get a location before starting a bluetooth scan
        pgLocation.getCurrentLocation(posCB);
    }
    function posCB(loc) {
        showLog("Bluetooth scan starting...");
        var devs   = $("#BTDevices");
        pgBluetooth.startScan(UI.preferences.btCallback);
        UI.preferences.btSetCurrentDevice();
    }
};

preferences.prototype.resize = function() {
    page.prototype.resize.call(this, true);
};

preferences.prototype.btConnect = function() {
    var name = pgBluetooth.activeDeviceName();
    var btDev = $("#BTDevices").val();
    if(name!="none") {
        showLog("Bluetooth disconnecting from device: " + btDev);
        btDev = "none";
    }
    else {
        showLog("Bluetooth connecting to device: " + btDev);
    }
    pgBluetooth.stopScan(cb);
    function cb() {
        if(btDev=="none")
            pgBluetooth.disconnect(finish);
        else
            pgBluetooth.connect(btDev, finish);
    }
    function finish(yn) {
        UI.preferences.btSetCurrentDevice();
    }
};

preferences.prototype.btCallback = function() {
    showLog("Bluetooth scan found a device");
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
                if (this.value == nm) {
                    exists = true;
                    return false;
                }
            });
        if(!exists)
            devs.append(new Option(nm,nm));
    }
};

preferences.prototype.btSetCurrentDevice = function() {
    var name = pgBluetooth.activeDeviceName();
    showLog("Bluetooth connected to device: " + name);
    var label = "Connect to: ";
    if(name != "none")
        label = "Disconnect: '"+name+"'";
    $('#BTConnect').val(label).button("refresh");
};

preferences.prototype.getPageData = function() {
    var data = pg.getUserData();
    // Defaults are set in the PG.
    return data;
};

preferences.prototype.submit = function(doClose) {
    var data = this.getPageData();
    /*
    var swipeVal = data.swipeVal;
    if(! pgUtil.isWebBrowser()) {
        swipeVal = parseInt($("#swipeSlider")[0].value);
        setSwipe(swipeVal);
    }
    */
    this.userData = {
        //'swipeVal'    : swipeVal,
        'debug'       : $("#preferences_debug")[0].checked ? 1 : 0,
        'wifiOnly'    : data.wifiOnly,
        'screenTaps'  : false //$("#screenTaps")[0].checked ? true : false,
    };

    this.setDebug(this.userData.debug);
    //var pages = $("#new_pages").val();
    //pages.unshift("home");
    //var pages = pg.pages.slice(0);
    //var i = pages.indexOf("map");
    //if(i != -1) {
    //    pages.splice(i, 1);
    //}
    //if(this.userData.debug) {
    //    pages.push("map");
    //}
    if(!pgUtil.isWebBrowser())
        this.userData.wifiOnly = $("#wifiOnly")[0].checked ? true : false;


    pg.setUserData(this.userData);
    gotoPage(pg.page());
};

preferences.prototype.setDebug = function(yn) {
    yn = (typeof(yn)!="undefined") ? yn : pg.getUserDataValue("debug");
    if(yn) {
        $(".debug").css({'display' : ""});
    }
    else {
        $(".debug").css({'display' : "none"});
    }
};

UI.preferences = new preferences();
//# sourceURL=preferences.js
