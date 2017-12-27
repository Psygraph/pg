
var jqmReady  = $.Deferred();
var devReady  = $.Deferred();
var pageReady = $.Deferred();
var pagesRemaining = 0;

// This call will happen after all frameworks and pages have loaded
$.when(jqmReady, devReady, pageReady).then(finalInit);

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
	    devReady.resolve();
    },
    onMobileInit: function() {
	    showLog("OnMobileInit");
	    $.support.cors                   = true;
	    $.support.mediaquery             = true;

        //if(!ONSEN) {
        $.mobile.allowCrossDomainPages   = true;
        $.mobile.defaultPageTransition   = "none";
        $.mobile.defaultDialogTransition = "none";
        $.mobile.hashListeningEnabled    = false;
        $.mobile.page.prototype.options.domCache = true;
        //$.mobile.linkBindingEnabled      = false; // necessary, but broken for images on firefox.
        $.mobile.dynamicBaseEnabled      = false;
        //$.mobile.buttonMarkup.hoverDelay = 50
        //$.mobile.autoInitializePage    = false;
        //}
        if(ONSEN) {
            document.addEventListener("init", function(event) {
                    if (event.target.matches(".page")) {
                        PGEN.initializePage(event);
                    }
                }, false);
            jqmReady.resolve();
        }
        else {
            $("body").on( "pagecontainercreate", function( event, ui ) {
                    $(":mobile-pagecontainer").pagecontainer({load: PGEN.initializePage});
                    var pages = ["home", "stopwatch", "timer", "counter", "note", "list", "graph", 
                                 "map", "dialog", "about", "categories", "preferences", "help"];
                    pagesRemaining = pages.length;
                    for(var i=0; i<pages.length; i++) {
                        var page = pages[i]+".html";
                        var opts = {'role': "page"};
                        $(":mobile-pagecontainer").pagecontainer( "load", "html/"+page, opts );
                    }
                    
                });
        }
    }
};

function pageInitFinished(page) {
    pagesRemaining--;
    if(!pagesRemaining) {
        showLog("Page init finished");
        jqmReady.resolve();
    }
}

app.initialize();
