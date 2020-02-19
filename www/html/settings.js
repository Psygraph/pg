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
        var category = pg.category();

        var catChoice = $("#settings_category");
        catChoice.empty();
        for(var i=0; i<pg.categories.length; i++) {
            var cat = pg.categories[i];
            catChoice.append(new Option(cat,cat)); 
        }
        catChoice.on("change", UI.settings.updateCategory );
        catChoice.val(category).trigger("change");
        
        // show the applyAll button?
        //if(pg.getUserDataValue('perCategorySettings'))
        //$('#applyAllSettings').parent().show();
        //else
        $('#applyAllSettings').parent().hide();

        this.resize();
    }
};

settings.prototype.updateCategory = function() {
    var category = $("#settings_category").val();
    gotoCategory(category);
    // ======= category_settings ===========    
    var data = pg.getCategoryData(category);
    UI.settings.categorySettings(data);
    return false;
}


settings.prototype.categorySettings = function() {
    var category = pg.category()
    if(typeof(this.src[category])=="undefined")
        this.src[category] = {};

    if(arguments.length) {
        var limit = 64;
        var data = pg.getCategoryData();

        $("#descEdit").val(data.description);

        // ### style ###
        var styleVal = data.style;
        if(data.style.length > limit) {
            UI.settings.src[pg.category()].styleEdit = data.style;
            styleVal = data.style.substring(0,limit) + " ...";
        }
        var strings = ["default.css"];
        if(pgUtil.isWebBrowser())
            strings = ["default.css","aqua.css","black.css","dkgrey.css","grey.css","lime.css","ltblue.css","ltgreen.css","ltgrey.css","orange.css","pink.css","steelblue.css","violet.css","white.css","yellow.css"];
        displaySelect("styleEdit", strings, styleVal);
        
        // ### sound ###
        var soundVal = data.sound;
        if(data.sound.length > limit) {
            UI.settings.src[category].soundEdit = data.sound;
            soundVal = data.sound.substring(0,limit) + " ...";
        }
        strings = ["default.mp3"];
        if(pgUtil.isWebBrowser())
            strings = ["default.mp3","alarm.mp3","bell.mp3","bike.mp3","birds.mp3","crickets.mp3","singingBowl.mp3"];
        displaySelect("soundEdit", strings, soundVal);

        // ### text ###
        var textVal = data.text;
        if(data.text.length > limit) {
            UI.settings.src[category].textEdit = data.text;
            textVal = data.text.substring(0,limit) + " ...";
        }
        strings = ["default.xml"];
        if(pgUtil.isWebBrowser())
            strings = ["default.xml","einstein.xml","lojong.xml","twain.xml"];
        displaySelect("textEdit", strings, textVal);
        
        if(!pgUtil.isWebBrowser()) {
            pgFile.listDir(pgFile.getMediaURL(),"css", UI.settings.addSelect.bind(this, "styleEdit", styleVal) );
            pgFile.listDir(pgFile.getMediaURL(),"mp3", UI.settings.addSelect.bind(this, "soundEdit", soundVal) );
            pgFile.listDir(pgFile.getMediaURL(),"xml", UI.settings.addSelect.bind(this, "textEdit", textVal) );
        }
    }
    else {
        var newCatData = {
            'description': $("#descEdit")[0].value,
            'style':       $("#styleEdit")[0].value,
            'sound':       $("#soundEdit")[0].value,
            'text':        $("#textEdit")[0].value
        };
        // If they have selected files without the data: URI scheme,
        // removed our cached values.
        if(newCatData.style.substring(0,5) != "data:")
            delete UI.settings.src[category].styleEdit;
        if(newCatData.sound.substring(0,5) != "data:")
            delete UI.settings.src[category].soundEdit;
        if(newCatData.text.substring(0,5) != "data:")
            delete UI.settings.src[category].textEdit;
        // if those values were stored as encoded files, set those values
        if(typeof(UI.settings.src[category].styleEdit)!="undefined")
            newCatData.style = UI.settings.src[category].styleEdit;
        if(typeof(UI.settings.src[category].soundEdit)!="undefined")
            newCatData.sound = UI.settings.src[category].soundEdit;
        if(typeof(UI.settings.src[category].textEdit)!="undefined")
            newCatData.text  = UI.settings.src[category].textEdit;
        return newCatData;
    }
    function displaySelect(id, strings, text) {
        var el = $("#"+id);
        el.empty();
        for (var i=0; i<strings.length; i++) {
            el.append(new Option(strings[i],strings[i]));
        }
        el.val(text).trigger("change");
    }
};

settings.prototype.addSelect = function(id, selected, strings) {
    var list = $("#"+id);
    list.children().remove();
    if(strings.indexOf(selected)==-1)
        strings.push(selected);
    for(var i=0; i<strings.length; i++) {
        list.append(new Option(strings[i], strings[i]));
    }
    list.val(selected);
    list.selectmenu("refresh");
};

settings.prototype.getFileURL = function(id) {
    //var dlg = printCheckbox("encode", "Encode", false) + "<br/>";
    // $("#encode").prop('checked')    
    showDialog( {title: "File URL:", true: "OK", false: "Cancel"},
                '<input id="fileURL" type="text"/>',
                function(ok){
                    if(ok) {
                        var o = $('#fileURL').val();
                        var menu = $("#"+id);
                        menu.append(new Option(o,o));
                        menu.val(o);
                        menu.selectmenu('refresh');
                    }
                }
    );
};
/*
page.prototype.getBase64File = function(id) {
    //var dlg = printCheckbox("encode", "Encode", false) + "<br/>";
    // $("#encode").prop('checked')
    showDialog( {title: "File encoder", true: "OK", false: "Cancel"},
                '<input id="fileEncoder" type="file" onchange="UI.page.encodeFile()"></input></br>',
                function(ok){
                    if(ok)
                        UI.page.encodeFile(id, $('#fileEncoder')[0].files[0], true);
                }
    );
};

page.prototype.encodeFile = function (id, file, encode) {
    var reader  = new FileReader();
    reader.onloadend = function () {
        var txt = "" + reader.result;
        //$("#"+id).val(txt);
        var o = txt.substr(0,20);
        var menu = $("#"+id);
        menu.append(new Option(o,o));
        menu.val(o);
        menu.selectmenu('refresh');
        var category = pg.category();
        UI.settings.src[category][id] = txt;
    }
    if(file) {
        //$("#"+id).val("data:"+file.name);
        UI.settings.preventRefresh = true; //closing the dialog would generally refresh our data.
        
        if(encode) {
            reader.readAsDataURL(file);
        }
    }
};
*/

// ======= PAGE SETTINGS ======
settings.prototype.showPageSettings = function() {
    // update the page settings
    var page = pg.page();
    var category = pg.category();
    
    //$("#pageName").html("tool: <b>" +page +"</b>");
    //UI[page].update(true);
    //UI.state[page] = UI[page].update(false);
    var data = pg.getPageData(page, category);
    UI[page].settings(data);
    //var ps = $("#"+page+"_settings");
    //ps.trigger("create");
};

settings.prototype.getCategoryWidget = function() {
    var page = pg.page();
    var id = page+"_category";
    var txt = "";
    txt += "<div class='ui-field-contain no-field-separator'>";
    txt += '<label for="'+id+'">Category:</label>';
    txt += '<select id="'+id+'" data-native-menu="false">';
    txt += '</select>';
    txt += '</div>';
    return txt;
};

/*
settings.prototype.setPageContent = function(s) {
    var page = pg.page();
    var ps = $("#"+page+"_settings");
    ps.empty();
    var txt = this.getCategoryWidget();
    txt += '<div class="settings_container">';
    txt += s;
    txt += '<div data-role="fieldcontain">';
	txt += '<input type="button" onClick="gotoPageMain(); return false;" class="btn fast" value="Cancel" title="cancel" data-inline="true"></input>';
	txt += '<input type="button" onClick="UI.settings.submitSettings(\'apply\'); return false;" class="btn fast" value="Apply" title="apply" data-inline="true"></input>';
	txt += '<input type="button" onClick="UI.settings.submitSettings(\'OK\'); return false;" class="btn fast" value="OK" title="OK" data-inline="true"/></input>';
    txt += '</div>';
    txt += '</div>';
    ps.html(txt);
    ps.trigger('create');
    ps.trigger('refresh');
};
*/

settings.prototype.pageCreate = function() {
    var page     = pg.page();
    var category = pg.category();
    var pc = $("#"+page+"_category");
    pc.empty();
    for(var i=0; i<pg.categories.length; i++) {
        var cat = pg.categories[i];
        pc.append(new Option(cat, cat));
    }
    pc.val(category).change();
    pc.on('change', function() {
            var category = pc.val();
            if(category != pg.category())
                gotoCategory(category);
        });
};

// =================  UPDATE THE SETTINGS =================
settings.prototype.resize = function() {
    page.prototype.resize.call(this, true);
};

settings.prototype.submitSettings = function(doClose) {
    var page        = pg.page();
    var category    = pg.category();

    // now safe to make a copy of the pg, which might have been changed by the previous calls.
    this.localPG.copy(pg, false);
    
    if(getPage()=="settings") { // category_settings
        var newCatData  = this.categorySettings();
        var cmtime     = pg.getCategoryMtime(category);
        var catData    = pg.getCategoryData(category);
        if(!pgUtil.equal(catData, newCatData)) {
            cmtime = pgUtil.getCurrentTime();
            this.localPG.setCategoryData(category, cmtime, newCatData);
        }
    }
    var newPageData = UI[page].settings();
    var pmtime      = pg.getPageMtime(page);
    if(doClose=="applyAll") {
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
    
    if(getPage()=="settings") { // category_settings
        if(!styleEqual)
            gotoCategory(pg.categoryIndex);
        //if(!soundEqual)
            pgAudio.alarm();
        if(!textEqual)
            pg.getCategoryText(category, true);
    }

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
