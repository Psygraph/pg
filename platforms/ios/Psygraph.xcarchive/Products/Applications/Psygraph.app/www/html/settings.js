//"use strict";

var settings = function () {
    page.call(this, "settings");
    this.localPG = new PG();
    this.localPG.init();
    this.lastSet = "pageSettings";
    this.src     = {};
    this.preventRefresh = false;
}

settings.prototype = Object.create(page.prototype);
settings.prototype.constructor = settings;

settings.prototype.update = function(show) {
    if(this.preventRefresh) {
        this.preventRefresh = false;
        return;
    }
    if(show) {
        if(typeof(this.src[pg.category()])=="undefined")
            this.src[pg.category()] = {};
        // page_settings ================
        var page = pg.page();
        var category = pg.category();

        $("#pageName").html("tool: <b>" +page +"</b>");
        //UI[page].update(true);
        UI.state[page] = UI[page].update(false);
        var data = pg.getPageData(page, category);
        UI[page].settings(data);
        $("#settingsPage").trigger("create");

        if(this.lastSet == "categorySettings") {
            $("#categorySettings").collapsible("expand");
            //$("#pageSettings").collapsible("collapse");
        }
        else {
            $("#pageSettings").collapsible("expand");
            //$("#categorySettings").collapsible("collapse");
        }
        $("#categorySettings").on("collapsiblecollapse", function(){this.lastSet = "pageSettings";}.bind(this));
        $("#pageSettings").on("collapsiblecollapse", function(){this.lastSet = "categorySettings";}.bind(this));
        

        // category_settings ===========
        $("#categoryName").html("category: <i>" +category +"</i>");
        var category = category;
        var data = pg.getCategoryData(category);
        UI[page].categorySettings(data);

        // show the applyAll button?
        if(pg.getUserDataValue('perCategorySettings'))
            $('#applyAllSettings').parent().show();
        else
            $('#applyAllSettings').parent().hide();
        this.resize();
    }
};

settings.prototype.setPageContent = function(s) {
    var ps = $("#page_settings");
    ps.empty();
    ps.html(s);
    ps.trigger('create');
};
settings.prototype.pageCreate = function() {
    var ps = $("#page_settings");
    ps.trigger('refresh');
};

settings.prototype.submitSettings = function(doClose) {
    var page        = pg.page();
    var category    = pg.category();
    var newPageData = UI[page].settings();
    var newCatData  = UI[page].categorySettings();    

    // now safe to make a copy of the pg, which might have been changed by the previous calls.
    this.localPG.copy(pg, false);

    // category_settings
    var cmtime     = pg.getCategoryMtime(category);
    var catData    = pg.getCategoryData(category);
    if(!pgUtil.equal(catData, newCatData)) {
        cmtime = pgUtil.getCurrentTime();
        this.localPG.setCategoryData(category, cmtime, newCatData);
    }
    
    // page_settings
    var pmtime      = pg.getPageMtime(page);
    if(!pg.getUserDataValue('perCategorySettings') || 
       doClose=="applyAll") {
        for(var i=0; i<pg.categories.length; i++)
            setPageDataForCategory(this.localPG, newPageData, page, pg.categories[i]);
    }
    else {
        setPageDataForCategory(this.localPG, newPageData, page, category);
    }

    // no-op if settings have not changed
    if(pgUtil.encode(this.localPG, true) == pgUtil.encode(pg, true)) {
        if(doClose=="OK")
            gotoPage(pg.page(), true);
        return;
    }
    // Here we might download and cache the CSS or TEXT files.
    this.localPG.dirty(true);
    if(pg.loggedIn) {
        PGEN.updateSettings( this.localPG, this.settingsUpdateComplete.bind(this,doClose) );
    }
    else {
        this.settingsUpdateComplete(doClose, true);
    }

    function setPageDataForCategory(localPG, newPageData, page, category) {
        var pageData = pg.getPageData(page, category);
        if(!pgUtil.equal(pageData, newPageData)) {
            pmtime = pgUtil.getCurrentTime();
            localPG.setPageData(pmtime, newPageData, page, category);
        }
    }
};

settings.prototype.settingsUpdateComplete = function(doClose, success) {
    //if( pg.online && !pgUtil.equal(this.localPG, pg, ['mtime'], true) ) {

    // account for changes
    var category   = this.localPG.category();
    var newCatData = this.localPG.getCategoryData(category);
    var catData    = pg.getCategoryData(category);    
    var styleEqual = pgUtil.equal(catData.style, newCatData.style);
    var soundEqual = pgUtil.equal(catData.sound, newCatData.sound);
    var textEqual  = pgUtil.equal(catData.text, newCatData.text);

    // copy changes
    pg.copy(this.localPG, false);
    PGEN.writePG(pg,writeCB);
    
    if(!styleEqual)
        gotoCategory(pg.categoryIndex);
    if(!soundEqual)
        pgAudio.alarm();
    if(!textEqual)
        pg.getCategoryText(category, true);
    
    // show an alert if changing the server settings was not successful.
    if(! success) {
        showAlert("Could not update data on server", "Warning", onClose.bind(this) );
    }
    else {
        onClose();
    }
    function onClose() {
        if(doClose=="OK") {
            gotoPage(pg.page(), true);
            gotoCategory(pg.categoryIndex, true);
        }
    }
    function writeCB(success) {
        if(!success)
            showAlert("Could not write data locally", "Error");
    }
};

UI.settings = new settings();
//# sourceURL=settings.js
