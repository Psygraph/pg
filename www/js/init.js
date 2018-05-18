

var app = {

    pageReady  : $.Deferred(),   // the html page is fully loaded
    devReady  : $.Deferred(),    // the device is ready (cordova plugins)
    mobileReady  : $.Deferred(), // JQM has said the mobile platform is ready
    jqmReady  : $.Deferred(),    // the pagecontainer has been loaded

    pagesLoaded  : $.Deferred(),
    pagesRemaining : 0,
    firstPage: true,
    debug: true,
    pause: false,

    onPageReady : function() {
        pgUI.showLog("onPageReady");
        app.pageReady.resolve();
    },
    onDevReady : function() {
        pgUI.showLog("onDevReady");
        app.devReady.resolve();
    },
    onMobileReady : function() {
        pgUI.showLog("onMobileReady");
        app.mobileReady.resolve();
    },
    onJQMReady : function() {
        pgUI.showLog("onJQMReady");
        app.jqmReady.resolve();
    },
    onPagesLoaded : function() {
        pgUI.showLog("onPagesLoaded");
        app.pagesLoaded.resolve();
    },
    // Application Constructor
    initialize: function(callback) {
        window.addEventListener("error",    onError,    false);
        window.skipLocalNotificationReady = true; // defer localNotification
        // device ready
        var browser = document.URL.match(/^https?:/);
        if(browser) {
            pgUI.showLog("Simulating deviceready event");
            this.onDevReady();
        }
        else {
            //$(document).on("deviceready", app.onDevReady);
            document.addEventListener("deviceready", app.onDevReady,true);
        }
        // jqm ready
        if(ONSEN) {
            ons.ready(app.onMobileInit);
            document.addEventListener("init", function(event) {
                if (event.target.matches(".page")) {
                    app.initPage(event);
                }
            }, false);
        }
        else {
            $(document).on("mobileinit", app.onMobileInit);
            $(document).on("pagecontainerload", app.initPage);
            $(document).on("pagecontainercreate", app.onJQMReady);
        }
    },

    onMobileInit: function() {
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
         app.onMobileReady();
    },

    pagesInit : function() {
        var pc = $(":mobile-pagecontainer"); //var pc = $.mobile.pageContainer;
        var pages = ["home", "stopwatch", "timer", "counter", "note", "list", "graph",
            "map", "dialog", "about", "categories", "preferences", "help"];
        app.pagesRemaining = pages.length;
        for(var i=0; i<pages.length; i++) {
            var page = pages[i]+".html";
            var opts = {'role': "page"};
            pc.pagecontainer( "load", "html/"+page, opts );
        }
        /*
        pc.on( "pagecontainershow", function( event, ui ) {
            if(app.firstPage) {
                showPage(true);
                app.firstPage = false;
            }
        });
        */
    },
    initPage: function(event, ui) {
        var target = event.target;
        var page;
        var node;
        if(ONSEN) {
            var pageName = target.children[1].children[0].id; // e.g. "home_page"
            page = pageName.substring(0, pageName.length-5);
            node = $("#"+page+"_page");
        }
        else {
            var pageName = ui.content[0].id; // e.g. "home_page"
            page = pageName.substring(0, pageName.length-5);
            node = ui.toPage[0];
        }
        var title = pgUtil.titleCase(page);
        // get the header from the template
        if(page === "categories" ||
            page === "about"     ||
            page === "help"      ||
            page === "dialog"    ||
            page === "preferences"
        ) {
            var headT  = $("#simple_header_template").prop('content');
            var head   = $(headT.children[0]).clone();
            node.prepend(head[0]);
            if(page === "dialog")
                $(node).find(".leftMenuButton").hide();
            if(page === "preferences" ||
                page === "categories") {
                //$(node).find(".rightMenuButton").hide();
            }
            else
                $(node).find(".rightMenuButton").hide();
        }
        else {
            // Add the sidenav
            var navT  = $("#navmenu_template").prop('content');
            var nav   = $(navT.children[0]).clone();
            node.prepend(nav[0]);
            var headT  = $("#header_template").prop('content');
            var head   = $(headT.children[0]).clone();
            node.prepend(head[0]);
        }

        // Add the subheader
        var catT = $("#category_template").prop('content');
        var cat  = $(catT.children[0]).clone();
        var subheader = $("#subheader_"+page);
        subheader.empty();
        subheader.prepend(cat[0]);
        subheader.trigger("create");

        // Add the start/stop buttons
        var buttonsT = $("#buttons_template").prop('content');
        var buttons  = $(buttonsT.children[0]).clone();
        var buttonDiv = $(node).find("#"+page+"_main div.buttons");
        buttonDiv.empty();
        buttonDiv.prepend(buttons[0]);
        buttonDiv.trigger("create");

        // Add the Cancel/Apply/OK buttons to settings pages
        var buttonsT = $("#settings_buttons_template").prop('content');
        var buttons  = $(buttonsT.children[0]).clone();
        var buttonDiv = $(node).find("#"+page+"_settings div.buttons");
        buttonDiv.empty();
        buttonDiv.prepend(buttons[0]);
        buttonDiv.trigger("create");

        $(node).find(".pg_page_title").html(title);
        $(node).find('input.fast, a.fast, button.fast').each(function(index, element) {
            if (element.onclick) {
                //$(element).on('vclick', element.onclick).removeAttr('onclick');
                $(element).on('vclick', element.onclick).prop('onclick', "return false");
            }
        });
        //updateNavbar();
        $(node).trigger("create");

        // wait for the page to insert itself in the UI
        setTimeout(checkPage.bind(this,page), 100);
        function checkPage(page) {
            if(UI[page])
                app.pageInitFinished(page);
            else
                setTimeout(checkPage.bind(this,page), 100);
        }
    },
    pageInitFinished: function(page) {
        pgUI.showLog("Loaded page: "+page);
        app.pagesRemaining--;
        if(! app.pagesRemaining) {
            app.onPagesLoaded();
        }
    },
    finalInit: function() {
        document.addEventListener("pause",  onPause,    false);
        document.addEventListener("resume", onResume,   false);
        document.addEventListener("backbutton", onBackKeyDown, false);
        //document.addEventListener("volumedownbutton", lever.bind(this,"left"), false);
        //document.addEventListener("volumeupbutton", lever.bind(this,"right"), false);
        window.addEventListener("resize",   onResize,   false);
        window.addEventListener("keydown",  onKeyDown,  false);
        $("body").on("vclick", singleClick );
        app.login();
    },
    login: function() {
        if(app.pause)
            setTimeout(app.login, 4000);
        else
            pgLogin.begin();
    },
    setDebug: function(yn) {
        app.debug = (typeof(yn)!=="undefined") ? yn : app.debug;
        if(app.debug) {
            $(".debug").css({'display' : ""});
        }
        else {
            $(".debug").css({'display' : "none"});
        }
    }
};

// Three infrastructure components can load independently, then we load all components
$.when(app.pageReady, app.devReady, app.mobileReady, app.jqmReady).then(app.pagesInit);
$.when(app.pagesLoaded).then(app.finalInit);

app.initialize();
