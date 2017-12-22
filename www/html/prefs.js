//"use strict";

var prefs = function () {
    page.call(this, "prefs");
    this.userData = {};
    this.localPG = null;
    this.initialized = false;
    var data = this.getPageData();
}

prefs.prototype = Object.create(page.prototype);
prefs.prototype.constructor = prefs;

prefs.prototype.update = function(show, state) {
    if(!show) {
        var cats = $("#new_categories").select2(opts);
        cats.children().remove();
        pgBluetooth.stopScan(function(){});
    }
    else {
        // call isConnected to verify device connection.
        pgBluetooth.isConnected(function(foo){});
        var data = this.getPageData();
        // pages
        //var s = "";
        //var dispPages = pgUtil.deepCopy(pg.allPages);
        //dispPages.splice( dispPages.indexOf("home"), 1);
        //if(! pg.getUserDataValue("debug") )
        //    dispPages.splice( dispPages.indexOf("map"), 1);
        //s += pgUtil.selectPages("new_pages", "Show tools:", dispPages, pg.pages);
        //$("#page_select").html(s).trigger("create");
        // categories
        dispCategories = pgUtil.deepCopy(pg.categories);
        //dispCategories.pop();   // remove "*"
        dispCategories.shift();   // remove "Uncateogrized"

        if(!this.initialized) {
            if(!pg.getUserDataValue("debug")) {
                $("#BTDiv").hide();
            }
            else {
                $("#BTDiv").show();
            }
            this.initialized = true;
        }
        var opts = {
            tags: true,
            //tokenSeparators: [',', ' '],
            //language: { inputTooShort: function () { return ''; } },
            query: function(query) {
                //do ajax call which retrieves the results array in this format:
                var cats = $("#new_categories");
                var data = cats.select2("data");
                var txt  = $(".select2-search").children().val();
                var arr = txt.split(",");
                if(arr.length < 2)
                    arr = txt.split(" ");
                if(arr.length>1) {
                    var newCat = arr[0].trim();
                    if(arr[1] == "" &&
                       newCat.length > 0) {
                        data.push({id: newCat, text: newCat});
                        query.callback({results: data});
                        var sel = cats.val().concat(newCat);
                        $(".select2-search").children().val("");
                        cats.append(new Option(newCat, newCat));
                        cats.val(sel).trigger("change");
                    }
                    else
                        query.callback({results: data});
                }
                else
                    query.callback({results: data});
                //{results: [
                //{ id: 1, text: 'disabled option', disabled: true },
                //{ id: 1, text: 'hi' }
                //]};
                //pass it to the query callback inside your Ajax callback:
            }
        };
        //if(!pgUtil.isWebBrowser())
        //    opts.minimumResultsForSearch = Infinity;
        var cats = $("#new_categories").select2(opts);
        cats.children().remove();
        cats.siblings().css("width","100%");
        for(var i=0; i<dispCategories.length; i++) {
            var cat = dispCategories[i];
            cats.append(new Option(cat,cat));
        }
        cats.val(dispCategories).trigger("change");

        /* // swipe
        if(pgUtil.isWebBrowser())
            $("#swipeDiv").hide();
        else
            $("#swipeSlider").val(data.swipeVal).slider('refresh');
        */

        // public access and debug
        $("#debug").prop('checked', data.debug).checkboxradio("refresh");
        //$("#publicAccess").prop('checked', data.publicAccess).checkboxradio("refresh");
        if(pgUtil.isWebBrowser())
            $("#wifiOnly").parent().hide();
        else
            $("#wifiOnly").prop('checked', data.wifiOnly).checkboxradio("refresh");
        $("#screenTaps").prop('checked', data.screenTaps).checkboxradio("refresh");
	    this.resize();
        // start bluetooth scanning
        if(pg.getUserDataValue("debug") ) {
            // we need to get a location to turn on location permissions, which are required on Android.
            pgLocation.getCurrentLocation(posCB);
        }
    }
    function posCB(loc) {
        showLog("Bluetooth scan starting...");
        var devs   = $("#BTDevices");
        pgBluetooth.startScan(UI.prefs.btCallback);
        UI.prefs.btSetCurrentDevice();
    }
};

prefs.prototype.resize = function() {
    page.prototype.resize.call(this, true);
};

prefs.prototype.btConnect = function() {
    var name = pgBluetooth.getActiveDeviceName();
    var btDev = $("#BTDevices").val();
    if(name!="none") {
        showLog("Bluetooth disconnecting from device: " + btDev);
        btDev = "none";
    }
    else {
        showLog("Bluetooth connecting to device: " + btDev);
    }
    pgBluetooth.stopScan(cb1);
    function cb1() {
        pgBluetooth.setActiveDeviceName(btDev, cb2);
    }
    function cb2() {
        UI.prefs.btSetCurrentDevice();
    }
};

prefs.prototype.btCallback = function() {
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

prefs.prototype.btSetCurrentDevice = function() {
    var name = pgBluetooth.getActiveDeviceName();
    showLog("Bluetooth connected to device: " + name);
    var label = "Connect to device:";
    if(name != "none")
        label = "Disconnect from '"+name+"'";
    $('#BTConnect').val(label).button("refresh");
    //var dev = $("#BTCurrentDevice");
    //dev.val(name);
    //dev.trigger("change");
    //dev.prop("disabled", true);
};

prefs.prototype.getPageData = function() {
    var data = pg.getUserData();
    // Defaults are set in the PG.
    return data;
};
prefs.prototype.submitSettings = function(doClose) {
    var data = this.getPageData();
    var cat = $("#new_categories").val(); //.split(",");
    var categories = new Array("Uncategorized");
    for(var i=0; i<cat.length; i++) {
        if(cat[i].trim() != "" &&
           categories.indexOf(cat[i]) == -1)
            categories.push(cat[i]);
    }
    //categories.push("*");
    /*
    var swipeVal = data.swipeVal;
    if(! pgUtil.isWebBrowser()) {
        swipeVal = parseInt($("#swipeSlider")[0].value);
        setSwipe(swipeVal);
    }
    */
    this.userData = {
        //'swipeVal'    : swipeVal,
        'debug'       : $("#debug")[0].checked ? 1 : 0,
        'wifiOnly'    : data.wifiOnly,
        'screenTaps'  : $("#screenTaps")[0].checked ? true : false,
    };

    //var pages = $("#new_pages").val();
    //pages.unshift("home");
    var pages = pg.pages;
    var i = pages.indexOf("map");
    if(i != -1) {
        pages.splice(i, 1);
    }
    if(this.userData.debug) {
        pages.push("map");
    }
    if(!pgUtil.isWebBrowser())
        this.userData.wifiOnly = $("#wifiOnly")[0].checked ? true : false;

    if(data.debug != this.userData.debug)
        this.initialized = false;
    // no-op if settings have not changed
    if(pgUtil.equal(data, this.userData) &&
       pg.equal(pg.pages, pages)         &&
       pg.equal(pg.categories, cateogries)) {
        if(doClose)
            gotoPage(pg.page());
        return;
    }
    this.localPG = new PG();
    this.localPG.init();
    this.localPG.copy(pg, false);
    this.localPG.setUserData(this.userData);
    this.localPG.setCategories(categories);
    this.localPG.setPages(pages);

    if(pg.loggedIn) {
        PGEN.updateSettings( this.localPG, this.settingsUpdateComplete.bind(this,doClose) );
    }
    else {
        this.settingsUpdateComplete(doClose, true);
    }
};

prefs.prototype.settingsUpdateComplete = function(doClose, success) {
    var page     = pg.page();
    var category = pg.category();
    var pagesEqual = pgUtil.equal(this.localPG.pages, pg.pages);
    var categoriesEqual = pgUtil.equal(this.localPG.categories, pg.categories);
    pg.copy(this.localPG, false);
    PGEN.writePG(pg);
    if(!pagesEqual)
        updateNavbar();
    
    // show an alert if changing the server settings was not successful.
    if(! success) {
        showAlert("Could not update data on server", "Warning");
    }
    if(doClose) {
        var pageIndex = pg.pages.indexOf(page);
        if(pageIndex < 0)
            pageIndex = 0;
        gotoPage(pg.pages[pageIndex]);
    }
    var catIndex = pg.categories.indexOf(category);
    if(catIndex < 0)
        gotoCategory("Uncategorized");
    updateSubheader(true);
};

UI.prefs = new prefs();
//# sourceURL=prefs.js
