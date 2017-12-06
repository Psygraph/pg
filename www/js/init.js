
var jqmReady = $.Deferred();
var pgReady = $.Deferred();
$.when(jqmReady, pgReady).then(finalInit);

var app = {
    // Application Constructor
    initialize: function(callback) {
	    this.bindEvents();

        var browser = document.URL.match(/^https?:/);
        /*
          var browser = true; 
          if((typeof(device) != "undefined") &&
          (device.platform=="Android" || device.platform=="iOS"))
          browser = false;
        */
	    if(browser) {
	        showLog("Simulating deviceready event");
	        this.onDeviceReady();
            //    var e = document.createEvent('Events'); 
            //    e.initEvent("deviceready", true, false);
            //    document.dispatchEvent(e);
	    }
    },
    bindEvents: function() {
	    document.addEventListener('deviceready', this.onDeviceReady, false);
	    //$(document).on("pageinit", this.onMobileInit);
	    if(ONSEN)
            ons.ready(this.onMobileInit);
        else
            $(document).on("mobileinit", this.onMobileInit);
    },
    onDeviceReady: function() {
	    showLog("onDeviceReady");
	    pgReady.resolve();
    },
    onMobileInit: function() {
	    showLog("OnMobileInit");
	    $.support.cors                   = true;
	    $.support.mediaquery             = true;

        if(!ONSEN) {
            $.mobile.allowCrossDomainPages   = true;
            $.mobile.defaultPageTransition   = "none";
            $.mobile.defaultDialogTransition = "none";
            //$.mobile.buttonMarkup.hoverDelay = 50
            $.mobile.hashListeningEnabled    = false;
            //$.mobile.autoInitializePage      = false;
            //$.mobile.linkBindingEnabled      = false;
        }
	    jqmReady.resolve();
    }
};


app.initialize();
