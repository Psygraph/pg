var page = function(name) {
    this.name = name;
    //this.src  = {};
};

page.prototype.constructor = page;

page.prototype.update = function(show) {
};

page.prototype.settings = function() {
};

page.prototype.lever = function(arg) {
    if(arg=="left") {
    }
    else if(arg=="right") {
    }
};

page.prototype.categorySettings = function() {
    var category = pg.category()
    //if(typeof(this.src[category])=="undefined")
    //    this.src[category] = {};

    if(arguments.length) {
        var limit = 64;
        var data = pg.getCategoryData();

        var s = "";
        s += "<div class='ui-field-contain no-field-separator'>";
        s += "<label for='descEdit'>Description:</label>";
        s += "<input class='settings' type='text' id='descEdit' name='desc' value='" + data.description +"' />";
        s += "</div>";

        s += "<div class='ui-field-contain no-field-separator'>";
        s += addEditButton("Style", "styleEdit");
        var styleVal = data.style;
        if(data.style.length > limit) {
            UI.settings.src[pg.category()].styleEdit = data.style;
            styleVal = data.style.substring(0,limit) + " ...";
        }
        // "bigText.css",
        var strings = ["default.css"];
        if(pgUtil.isWebBrowser())
            strings = ["default.css","aqua.css","black.css","dkgrey.css","grey.css","lime.css","ltblue.css","ltgreen.css","ltgrey.css","orange.css","pink.css","steelblue.css","violet.css","white.css","yellow.css"];
        s += displaySelect("styleEdit", strings, styleVal);
        //s += "<input class='settings' type='text' id='styleEdit' name='style' value='" + text +"' />";
        s += "</div>";

        // ### sound ###
        s += "<div class='ui-field-contain no-field-separator'>";
        s += addEditButton("Sound", "soundEdit");
        var soundVal = data.sound;
        if(data.sound.length > limit) {
            UI.settings.src[category].soundEdit = data.sound;
            soundVal = data.sound.substring(0,limit) + " ...";
        }
        strings = ["default.mp3"];
        if(pgUtil.isWebBrowser())
            strings = ["default.mp3","alarm.mp3","bell.mp3","bike.mp3","birds.mp3","crickets.mp3","singingBowl.mp3"];
        s += displaySelect("soundEdit", strings, soundVal);
        //s += "<input class='settings' type='text' id='soundEdit' name='style' value='" + text +"' />";
        s += "</div>";

        // ### text ###
        s += "<div class='ui-field-contain no-field-separator'>";
        s += addEditButton("Text", "textEdit");
        var textVal = data.text;
        if(data.text.length > limit) {
            UI.settings.src[category].textEdit = data.text;
            textVal = data.text.substring(0,limit) + " ...";
        }
        strings = ["default.xml"];
        if(pgUtil.isWebBrowser())
            strings = ["default.xml","einstein.xml","lojong.xml","twain.xml"];
        s += displaySelect("textEdit", strings, textVal);
        //s += "<input class='settings' type='text' id='textEdit' name='style' value='" + text +"' />";
        s += "</div>";

        $("#category_settings").html(s);
        $("#category_settings").trigger("create");
        if(!pgUtil.isWebBrowser()) {
            pgFile.listDir(pgFile.getMediaURL(),"css", UI.page.addSelect.bind(this, "styleEdit", styleVal) );
            pgFile.listDir(pgFile.getMediaURL(),"mp3", UI.page.addSelect.bind(this, "soundEdit", soundVal) );
            pgFile.listDir(pgFile.getMediaURL(),"xml", UI.page.addSelect.bind(this, "textEdit", textVal) );
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
    function addEditButton(name, field) {
        //if(pgUtil.isWebBrowser()) { // this will only open a picture dialog on iOS
        //var onclick = ' onclick="UI.page.getBase64File(\''+field+'\');" ';
        var onclick = ' onclick="UI.page.getFileURL(\''+field+'\');" ';
        name = '<a href="" ' +onclick+ '>'+name+'</a>';
        //}
        return "<label for='"+field+"'>"+name+":</label>";
    }
    function displaySelect(id, strings, text) {
        var s = "  <select id='"+id+"' value='"+id+"' title='"+id+"' data-native-menu='false'>";
        var displayed = false;
        for (var i=0; i<strings.length; i++) {
            if(text == strings[i]) {
                s += "    <option selected value='"+text+"'>"+text+"</option>";
                displayed = true;
            }
            else
                s += "    <option value='"+strings[i]+"'>"+strings[i]+"</option>";
        }
        if(!displayed)
            s += "    <option selected value='"+text+"'>"+text+"</option>";
        s += "  </select>";
        return s;
    }
};

page.prototype.addSelect = function(id, selected, strings) {
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

page.prototype.getFileURL = function(id) {
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
page.prototype.resize = function() {
    var head   = $("#" + this.name + "_header").outerHeight(true);
    var foot   = 0;//$("#" + this.name + "_footer").outerHeight(true);
    var height = $(window).height() - (head+foot);
    var width  = $(window).width();
    $("#"+this.name).height(height);
};
page.prototype.scrollableResize = function() {
    var head   = $("#" + this.name + "_header").outerHeight(true);
    var foot   = 0;//$("#" + this.name + "_footer").outerHeight(true);
    // var kbdHeight = UI.window.kbdHeight;
    // window.innerHeight
    var height = $(window).height();
    var width  = $(window).width();
    var totalHeight = head;
    $("#"+this.name+"Div").children().each(function(){
            totalHeight = totalHeight + $(this).outerHeight(true);
        });
    $("#"+this.name+"Div").height(Math.max(totalHeight, height));
};

page.prototype.getPageData = function() {
    var data = pg.getPageData(this.name, pg.category());
    return data;
};

page.prototype.getSummary = function(page, category) {
    category = typeof(category!="undefined") ? category : pg.category();
    var events = pg.getEventsInPage(page, category);
    var count = events.length;
    var range = 30*24*60*60*1000;
    var start = pgUtil.getCurrentTime() - range;
    txt = "";
    if(page=="stopwatch" || page=="timer") {
        var sec = 0;
        for(var i=0; i<events.length; i++) {
            if(events[i][E_TYPE]=="interval")
                sec += events[i][E_DUR]/1000;
            if(events[i][E_START] < start)
                break;
        }
        var hours = sec / (60*60);
        txt = hours.toFixed(3) +" hours";
    }
    //else if(page=="timer") {
    //    for(var i=0; i<events.length; i++) {
    //    }
    //}
    //else if(page=="counter") {
    //}
    //else if(page=="note") {
    //}
    else {
        txt = count +" events";
    }
    return txt;
};

page.prototype.displayEventData = function(e) {
    var txt = "";
    try {
        var dur = getTimeString(e.duration);
        if((e.page=="stopwatch" || e.page=="map") &&
           (e.type=="interval")) {
            txt += dur;
            if(typeof(e.data.location)!="undefined") {
                var loc = e.data.location[0]; // just look at the first location
                var ll = "lat: " + loc[1].toFixed(4) + ", long: " + loc[2].toFixed(4);
                txt += alertTextHref("+loc", "location", ll);
            }
            if(typeof(e.data.acceleration)!="undefined")
                txt += " +acc";
            if(typeof(e.data.pathLength)!="undefined")
                txt += " " + e.data.pathLength.toFixed(2) + " miles";
        }
        else if(e.page=="stopwatch" && e.type=="reset") {
            // resets have nothing to display
        }
        else if(e.page == "note" ||
                (e.page == "map" && e.type == "marker") ) {
            txt += pgUtil.escape(e.data.title);
            if(typeof(e.data.text)!="undefined") {
                title = e.data.title != "" ? e.data.title : "note";
                txt += alertTextHref("+text", e.data.title, e.data.text);
            }
            if(typeof(e.data.location)!="undefined") {
                var ll = "lat: " + e.data.location[0][1].toFixed(4) + ", long: " + e.data.location[0][2].toFixed(4);
                txt += alertTextHref("+loc", e.data.title, ll);
            }
            if(typeof(e.data.audio)!="undefined") {
                var fn  = pgAudio.getRecordFilename(e.id, e.data.audio);
                var id  = e.id;
                var tag = playMediaHref("+audio", id, fn);
                txt += tag;
            }
        }
        else if(e.page == "timer") {
            if(e.type=="interval")
                txt += dur;
            else if(e.type=="reset") {
                if(typeof(e.data.resetTime)!="undefined")
                    txt += " " + getTimeString(e.data.resetTime);
            }
        }
        else if(e.page == "counter") {
            txt += e.data.count;
            if(e.type=="reset" && e.data.target != 0) {
                if(e.data.count == e.data.target)
                    txt += ", correct";
                else
                    txt += ", incorrect";
            }
        }
        else if(e.page == "home") {
            // login and logout events... nothing to display.
            if(e.type=="error" ||
               e.type=="warn"  ||
               e.type=="log")
                txt += alertTextHref("+text", e.type, e.data.text);
        }
        else {
            console.log("unknown page for event, type: " + e.page + e.type);
        }
    }
    catch(e) {
        txt += " [CORRUPT DATA] ";
    }
    return txt;
    
    function alertTextHref(type, title, text) {
        var txt = ' <a href="" onclick="showAlert(\''+pgUtil.escape(text, true)+'\', \''+pgUtil.escape(title, true)+'\'); return true;" >'+type+'</a>';
        return txt;
    }
    function playMediaHref(type, id, fn) {
        var txt = ' <a href="" onclick="return pgAudio.playRecorded(\''+id+'\', \''+fn+'\');">'+type+'</a>';
        return txt;
    }
    function getTimeString(dur) {
        return pgUtil.getStringFromMS(dur) + " sec";
    }
};


UI.page = new page();
//# sourceURL=page.js
