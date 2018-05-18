//"use strict";

var Categories = function () {
    Page.call(this, "categories");
    this.src = {};
    this.updating = false;
    this.selectizeOpts = {
        plugins: ['remove_button'],
        delimiter: ',',
        persist: false,
        create: function(input) {
            return {
                value: input,
                text: input
            }
        },
        render: {
            item: function(data, escape) {
                return '<div class="selectize-item">' + escape(data.text) + '</div>';
            }
        },
        onDelete: function(values) { }
    };
    this.catChoice = $("#categories_category");
    this.catChoice.on("change", this.updateCategory.bind(this) );
    this.colorPicker = tinycolorpicker($("#colorPicker")[0]);
};

Categories.prototype = Object.create(Page.prototype);
Categories.prototype.constructor = Categories;

Categories.prototype.update = function(show, data) {
    if(show) {
        this.data = data;
        this.settings(show);
        this.resize();
    }
    else {
        this.settings(show);
    }
    return this.data;
};

Categories.prototype.settings = function(show) {
    var category = pg.category();
    if(typeof(this.src[category])==="undefined")
        this.src[category] = {};
    if(show) {
        this.updating = true;
        dispCategories = pgUtil.deepCopy(pg.categories);
        dispCategories.shift();   // remove "Uncateogrized"
        //dispCategories.pop();   // remove "*"
        var cats = $("#categories_new");
        cats.val(dispCategories.join(","));
        cats.selectize(this.selectizeOpts);

        // current category

        this.catChoice.empty();
        for(var i=0; i<pg.categories.length; i++) {
            var cat = pg.categories[i];
            this.catChoice.append(new Option(cat,cat));
        }
        this.catChoice.val(category);
        this.catChoice.trigger("change");

        var limit = 64;
        // ### style ###
        var styleVal = this.data.style;
        if(this.data.style.length > limit) {
            this.src[category].styleEdit = this.data.style;
            styleVal = this.data.style.substring(0,limit) + " ...";
        }
        var strings = ["default.css"];
        if(pgUtil.isWebBrowser())
            strings = ["default.css","allGrey.css"];
        this.displaySelect("styleEdit", strings, styleVal);

        // ### color ###
        this.colorPicker.setColor(this.data.color);

        // ### sound ###
        var soundVal = this.data.sound;
        if(this.data.sound.length > limit) {
            this.src[category].soundEdit = this.data.sound;
            soundVal = this.data.sound.substring(0,limit) + " ...";
        }
        strings = ["default.mp3"];
        if(pgUtil.isWebBrowser())
            strings = ["default.mp3","alarm.mp3","bell.mp3","bike.mp3","birds.mp3","crickets.mp3","hyoshigi.mp3","mokugyo.mp3","singingBowl.mp3","taiko.mp3"];
        this.displaySelect("soundEdit", strings, soundVal);

        // ### text ###
        var textVal = this.data.text;
        if(this.data.text.length > limit) {
            this.src[category].textEdit = this.data.text;
            textVal = this.data.text.substring(0,limit) + " ...";
        }
        strings = ["default.xml"];
        if(pgUtil.isWebBrowser())
            strings = ["default.xml","christian.xml","einstein.xml","lojong.xml","twain.xml", "xkcd.xml"];
        this.displaySelect("textEdit", strings, textVal);

        // ### calendar ###
        $("#categories_calendar").prop('checked', this.data.calendar).checkboxradio("refresh");

        if(!pgUtil.isWebBrowser()) {
            pgFile.listDir(pgFile.getMediaURL(),"css", this.addSelect.bind(this, "styleEdit", styleVal) );
            pgFile.listDir(pgFile.getMediaURL(),"mp3", this.addSelect.bind(this, "soundEdit", soundVal) );
            pgFile.listDir(pgFile.getMediaURL(),"xml", this.addSelect.bind(this, "textEdit", textVal) );
        }

        // show the applyAll button?
        $('#applyAllCategories').parent().hide();
        // show the calendar button?
        if(pgUtil.isWebBrowser()) {
            $("#categories_calendarDiv").hide();
        }
        this.updating = false;
    }
    else {
        // check if the categories themselves have changed
        var cats = $("#categories_new").val().split(",");
        cats.unshift("Uncategorized");
        //cats.push("*");
        this.localPG.setCategories(cats);

        this.data.color    = this.colorPicker.colorHex;
        this.data.style    = $("#styleEdit")[0].value;
        this.data.sound    = $("#soundEdit")[0].value;
        this.data.text     = $("#textEdit")[0].value;
        this.data.calendar = $("#categories_calendar")[0].checked ? 1 : 0;

        // If they have selected files without the data: URI scheme,
        // removed our cached values.
        if(this.data.style.substring(0,5) !== "data:")
            delete this.src[category].styleEdit;
        if(this.data.sound.substring(0,5) !== "data:")
            delete this.src[category].soundEdit;
        if(this.data.text.substring(0,5) !== "data:")
            delete this.src[category].textEdit;
        // if those values were stored as encoded files, set those values
        if(typeof(this.src[category].styleEdit)!=="undefined")
            this.data.style = this.src[category].styleEdit;
        if(typeof(this.src[category].soundEdit)!=="undefined")
            this.data.sound = this.src[category].soundEdit;
        if(typeof(this.src[category].textEdit)!=="undefined")
            this.data.text  = this.src[category].textEdit;
    }
};

Categories.prototype.updateCategory = function() {
    var category = $("#categories_category").val();
    if(category !== pg.category()) {
        //this.submitSettings("apply");
        gotoCategory(category);
    }
};

/*
Categories.prototype.submitSettings = function(doClose) {
    if(doClose!=="cancel") {

        // get the category data
        var data = this.getPageData();
        data = this.update(false, data);
        pmtime = pgUtil.getCurrentTime();
        if(doClose==="applyAll") {

        }
        else {

            if(!pgUtil.equal(catData, newCatData)) {
                var cmtime = pgUtil.getCurrentTime();
                this.localPG.setCategoryData(category, cmtime, newCatData);
            }
            pg.setPageData(pmtime, data, "preferences", "Uncategorized");
        }
    }
    if(doClose==="OK" || doClose==="cancel")
        gotoPage( pg.page() );
};
*/
Categories.prototype.getPageData = function(category) {
    category = category || pg.category();
    var data = pg.getPageData("categories", category);
    if(! ('description' in data)) {
        data.description = "";
    }
    if(! ('sound' in data)) {
        data.sound = "default.mp3";
    }
    if(! ('style' in data)) {
        data.style = "default.css";
    }
    if(! ('color' in data)) {
        data.color = "#CCCCCC";
    }
    if(! ('text' in data)) {
        data.text  = "default.xml";
    }
    if(! ('calendar' in data)) {
        data.calendar  = false;
    }
    return data;
};

Categories.prototype.resize = function() {
    Page.prototype.resize.call(this, true);
};

Categories.prototype.displaySelect = function(id, strings, text) {
    var el = $("#"+id);
    el.empty();
    for (var i=0; i<strings.length; i++) {
        el.append(new Option(this.removeExt(strings[i]),strings[i]));
    }
    el.val(text).trigger("change");
};

Categories.prototype.removeExt = function(txt) {
    return txt.slice(0, txt.length-4);
};

Categories.prototype.addSelect = function(id, selected, strings) {
    var list = $("#"+id);
    list.children().remove();
    if(strings.indexOf(selected)===-1)
        strings.push(selected);
    for(var i=0; i<strings.length; i++) {
        list.append(new Option(this.removeExt(strings[i]), strings[i]));
    }
    list.val(selected);
    list.selectmenu("refresh");
};

Categories.prototype.getFileURL = function(id) {
    //var dlg = printCheckbox("encode", "Encode", false) + "<br/>";
    // $("#encode").prop('checked')    
    pgUI.showDialog( {title: "File URL:", true: "OK", false: "Cancel"},
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


UI.categories = new Categories();
//# sourceURL=categories.js
