
function Help() {
    Page.call(this, "help");
    this.scrollbar = tinyscrollbar($("#help_scrollbar")[0]);
}

Help.prototype = Object.create(Page.prototype);
Help.prototype.constructor = Help;

Help.prototype.update = function(show, data) {
    if(show) {
        if(data.intro) {
            // optionally show an intro to the application
        }
        this.resize();
    }
    else {
        data.intro = false;
        this.setIntro(false);
    }
    return data;
};

Help.prototype.settings = function(show, data) {
    if(show) {
    }
    else {
        data = {version:1};
    }
    return data;
};

Help.prototype.resize = function() {
    var head    = this.headerHeight();
    var win     = pgUI.getWindowDims();
    var height  = win.height - (head);
    $("#help_main").css({
        position: "absolute",
        width:  "100%",
        height: height+"px",
        top:    head+"px"
        }
    );
    $("#helpDiv").css({
        height: height+"px",
        xxxtop:    head+"px"
    });
    this.scrollbar.update({trackSize: height});
};

Help.prototype.setIntro = function(value) {
    $("#help .scrollable").scrollTop(0);
    PGEN.writePsygraph({'accepted': value});
};

Help.prototype.getPageData = function() {
    var data = pg.getPageData("help", "Uncategorized");
    if(! ('intro' in data))
        data.intro = true;
    return data;
};

UI.help = new Help();
//# sourceURL=help.js
