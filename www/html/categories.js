//"use strict";

var categories = function () {
    Page.call(this, "categories");
    this.src     = {};
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

    this.colorPicker = tinycolorpicker($("#colorPicker")[0]);
};

categories.prototype = Object.create(Page.prototype);
categories.prototype.constructor = categories;

categories.prototype.update = function(show) {
    if(show) {
        dispCategories = pgUtil.deepCopy(pg.categories);
        dispCategories.shift();   // remove "Uncateogrized"
        //dispCategories.pop();   // remove "*"
        var cats = $("#categories_new");

        cats.val(dispCategories.join(","));
        cats.selectize(this.selectizeOpts);
        
        if(typeof(this.src[pg.category()])==="undefined")
            this.src[pg.category()] = {};

        var catChoice = $("#categories_category");
        catChoice.empty();
        for(var i=0; i<pg.categories.length; i++) {
            var cat = pg.categories[i];
            catChoice.append(new Option(cat,cat)); 
        }
        catChoice.on("change", UI.categories.updateCategory );
        catChoice.val(pg.category()).trigger("change");
        
        // show the applyAll button?
        //$('#applyAllCategories').parent().show();
        $('#applyAllCategories').parent().hide();

        this.resize();
    }
};

categories.prototype.resize = function() {
    Page.prototype.resize.call(this, true);
};

categories.prototype.settings = function(show, data) {
    if(show) {
        // we never show a settings page
    }
    else {
        var cats = $("#categories_new").val().split(",");

        cats.unshift("Uncategorized");
        //cats.push("*");
        this.localPG.setCategories(cats);
        
        var category = pg.category();
        var newCatData  = this.applyCategory();
        var cmtime     = pg.getCategoryMtime(category);
        var catData    = pg.getCategoryData(category);
        if(!pgUtil.equal(catData, newCatData)) {
            cmtime = pgUtil.getCurrentTime();
            this.localPG.setCategoryData(category, cmtime, newCatData);
        }
        // since all of our settings are stored on the PG, the page data is empty
    }
    return data;
};

categories.prototype.updateCategory = function() {
    var category = $("#categories_category").val();
    gotoCategory(category);
    // ======= category_settings ===========    
    var data = pg.getCategoryData(category);
    UI.categories.applyCategory(data);
    return false;
};

categories.prototype.applyCategory = function() {
    var category = pg.category();
    if(typeof(this.src[category])==="undefined")
        this.src[category] = {};

    if(arguments.length) {
        var limit = 64;
        var data = pg.getCategoryData();

        //$("#descEdit").val(data.description);

        // ### style ###

        var styleVal = data.style;
        if(data.style.length > limit) {
            UI.categories.src[pg.category()].styleEdit = data.style;
            styleVal = data.style.substring(0,limit) + " ...";
        }
        var strings = ["default.css"];
        if(pgUtil.isWebBrowser())
            strings = ["default.css","allGrey.css"];
        displaySelect("styleEdit", strings, styleVal);

        // ### color ###
        this.colorPicker.setColor($("html").css('backgroundColor'));

        // ### sound ###
        var soundVal = data.sound;
        if(data.sound.length > limit) {
            UI.categories.src[category].soundEdit = data.sound;
            soundVal = data.sound.substring(0,limit) + " ...";
        }
        strings = ["default.mp3"];
        if(pgUtil.isWebBrowser())
            strings = ["default.mp3","alarm.mp3","bell.mp3","bike.mp3","birds.mp3","crickets.mp3","hyoshigi.mp3","mokugyo.mp3","singingBowl.mp3","taiko.mp3"];
        displaySelect("soundEdit", strings, soundVal);

        // ### text ###
        var textVal = data.text;
        if(data.text.length > limit) {
            UI.categories.src[category].textEdit = data.text;
            textVal = data.text.substring(0,limit) + " ...";
        }
        strings = ["default.xml"];
        if(pgUtil.isWebBrowser())
            strings = ["default.xml","christian.xml","einstein.xml","lojong.xml","twain.xml", "monroe.xml"];
        displaySelect("textEdit", strings, textVal);
        
        if(!pgUtil.isWebBrowser()) {
            pgFile.listDir(pgFile.getMediaURL(),"css", UI.categories.addSelect.bind(this, "styleEdit", styleVal) );
            pgFile.listDir(pgFile.getMediaURL(),"mp3", UI.categories.addSelect.bind(this, "soundEdit", soundVal) );
            pgFile.listDir(pgFile.getMediaURL(),"xml", UI.categories.addSelect.bind(this, "textEdit", textVal) );
        }
    }
    else {
        var color = this.colorPicker.colorHex;

        var newCatData = {
            'color':       color,
            'style':       $("#styleEdit")[0].value,
            'sound':       $("#soundEdit")[0].value,
            'text':        $("#textEdit")[0].value
        };
        // If they have selected files without the data: URI scheme,
        // removed our cached values.
        if(newCatData.style.substring(0,5) != "data:")
            delete UI.categories.src[category].styleEdit;
        if(newCatData.sound.substring(0,5) != "data:")
            delete UI.categories.src[category].soundEdit;
        if(newCatData.text.substring(0,5) != "data:")
            delete UI.categories.src[category].textEdit;
        // if those values were stored as encoded files, set those values
        if(typeof(UI.categories.src[category].styleEdit)!="undefined")
            newCatData.style = UI.categories.src[category].styleEdit;
        if(typeof(UI.categories.src[category].soundEdit)!="undefined")
            newCatData.sound = UI.categories.src[category].soundEdit;
        if(typeof(UI.categories.src[category].textEdit)!="undefined")
            newCatData.text  = UI.categories.src[category].textEdit;
        return newCatData;
    }
    function displaySelect(id, strings, text) {
        var el = $("#"+id);
        el.empty();
        for (var i=0; i<strings.length; i++) {
            el.append(new Option(UI.categories.removeExt(strings[i]),strings[i]));
        }
        el.val(text).trigger("change");
    }
};

categories.prototype.removeExt = function(txt) {
    return txt.slice(0, txt.length-4);
};

categories.prototype.addSelect = function(id, selected, strings) {
    var list = $("#"+id);
    list.children().remove();
    if(strings.indexOf(selected)===-1)
        strings.push(selected);
    for(var i=0; i<strings.length; i++) {
        list.append(new Option(UI.categories.removeExt(strings[i]), strings[i]));
    }
    list.val(selected);
    list.selectmenu("refresh");
};

categories.prototype.getFileURL = function(id) {
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


UI.categories = new categories();
//# sourceURL=categories.js
