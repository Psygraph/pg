
var jqmReady = $.Deferred();
var pgReady = $.Deferred();
$.when(jqmReady, pgReady).then(finalInit);

var app = {
    // Application Constructor
    initialize: function(callback) {
	    this.bindEvents();

	    var browser = document.URL.match(/^https?:/);
	    // on non-mobile devices, we fire the deviceready event ourselves.
	    //if (! navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry)/)) {
	    //}
        
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
	    $.mobile.allowCrossDomainPages   = true;

	    $.mobile.defaultPageTransition   = "none";
	    $.mobile.defaultDialogTransition = "none";
        //$.mobile.buttonMarkup.hoverDelay = 50
	    $.mobile.hashListeningEnabled    = false;
	    //$.mobile.autoInitializePage      = false;
	    //$.mobile.linkBindingEnabled      = false;

	    jqmReady.resolve();
    }
};

app.initialize();
