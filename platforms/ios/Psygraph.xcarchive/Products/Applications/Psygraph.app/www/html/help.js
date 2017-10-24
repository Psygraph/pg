
function help() {
    page.call(this, "help");
    this.intro    = true;
    this.overview = true;
}

help.prototype = Object.create(page.prototype);
help.prototype.constructor = help;

help.prototype.setIntro = function(value) {
    value = typeof(value)!="undefined" ? value : true;
    this.intro = value;
    if(!this.intro) { // we are being closed
        $("#help .scrollable").scrollTop(0);
        PGEN.writePsygraph({'accepted': true});
        // get audio recording permissions
        pgAudio.getRecordPermissions();
        // go to the home page
        gotoPage("home", true);
        // In case they wanted to go to the help page first:
        //UI.help.doOverview(true);      
    }
    return true;
};

help.prototype.pageHelp = function(page) {
    var id = "#" +page +"Help";
    //$(id +" > strong").remove();
    if(!pgUtil.isWebBrowser())
        $(id +" img").remove();
    var s = $(id).html();
    s += "<p><br/></p>";
    return s;
};

help.prototype.setOverview = function(overview) {
    this.overview = overview;
};

help.prototype.doOverview = function(overview) {
    this.overview = overview;
    resetPage();
    return true;
};

help.prototype.updateMenus = function() { 
    var header;
    if(this.intro) {
        $("#help_leftButton").hide();
        $("#help_rightButton").hide();
        $("#help_title").html("Psygraph");
    }
    else {
        $("#help_leftButton").show();
        $("#help_rightButton").show();
        $("#help_title").html("help");
        if(!this.overview) {
            $("#help_rightButton").html("General");
            $("#help_rightButton").attr("data-icon","arrow-u");
            $("#help_rightButton").removeClass("ui-icon-arrow-d").addClass("ui-icon-arrow-u");
            $("#help_rightButton").attr("onclick", "return UI.help.doOverview(true);");
        }
        else {
            $("#help_rightButton").html("Specific");
            $("#help_rightButton").attr("data-icon","arrow-d");
            $("#help_rightButton").removeClass("ui-icon-arrow-u").addClass("ui-icon-arrow-d");
            $("#help_rightButton").attr("onclick", "return UI.help.doOverview(false);");
        }
        $("#help_rightButton").trigger("refresh");
    }
    //$("#help").trigger("refresh");
    return false;
};
    
help.prototype.update = function(show, state) {
    if(!show) {
        return {'intro': this.intro};
    }
    else {
        if(typeof(state)!="undefined")
            this.intro = state.intro;
        this.updateMenus();
        if(this.intro) {
            var s = this.pageHelp("eula");
            s += '<input type="button" value="I Agree to Terms" onclick="return UI.help.setIntro(false);"></input>';
            s += "<p><br/></p>";
            $("#helpPage").html(s);
        }
        else {
            var s;
            if(this.overview) {
                s = this.pageHelp("introduction");
            } else {
                var page = pg.page();
                var s = this.pageHelp(page);
            }
            $("#helpPage").html(s);
        }
        $("#helpPage").trigger("create");
        $("#help").trigger("refresh");
        this.resize();
    }
};
    
help.prototype.settings = function() {
    if(arguments.length) {
    }
    else {
        return {version:1};
    }
};

help.prototype.resize = function() {
    // our content is scollable, so dont resize it to the window size.
    // But do disallow horizontal scroll.
    var head    = $("#" + this.name + "_header").outerHeight(true);
    var foot    = $("#" + this.name + "_footer").outerHeight(true);
    var win     = getWindowDims();
    var height  = win.height - (head);
    var width   = win.width;
    $("#helpDiv").css( {
            'top': head-1,
            'height': height
            });
};

UI.help = new help();
//# sourceURL=help.js
