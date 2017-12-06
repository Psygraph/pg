
function help() {
    page.call(this, "help");
    this.intro    = true;
}

help.prototype = Object.create(page.prototype);
help.prototype.constructor = help;

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
            var page = pg.page(); // would be nice to scroll to this section...
            var s = this.pageHelp("all");
        }
        $("#helpPage").html(s);
        $("#helpPage").trigger("create");
        $("#help").trigger("refresh");
        this.resize();
        setTimeout(this.resize.bind(this), 1000);
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
    var head   = $("#" + this.name + "_header").outerHeight(true);
    var win    = getWindowDims();
    var width  = win.width;
    $("#"+this.name+"_content").css({
            'position': "absolute",
                'top':    head+"px" ,
                'width':  width+"px"
                }
    );
};

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
    }
    return true;
};

help.prototype.pageHelp = function(page) {
    if(page=="all") {
        var s = this.pageHelp("introduction");
        for(var i in pg.pages) {
            s += this.pageHelp(pg.pages[i]);
        }
    }
    else {
        var id = "#" +page +"Help";
        //$(id +" > strong").remove();
        if(!pgUtil.isWebBrowser())
            $(id +" img").remove();
        var s = $(id)[0].outerHTML;
        s += "<p><br/></p><hr/>";
    }
    return s;
};

help.prototype.updateMenus = function() { 
    var header;
    if(this.intro) {
        $("#help_leftButton").hide();
        $("#help_title").html("Psygraph");
    }
    else {
        $("#help_leftButton").show();
        $("#help_title").html("help");
    }
    return false;
};
    

UI.help = new help();
//# sourceURL=help.js
