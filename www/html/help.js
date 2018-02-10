
function Help() {
    Page.call(this, "help");
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
    var head   = this.headerHeight();
    var win    = pgUI.getWindowDims();
    var width  = win.width;
    $("#help_page .content").css({
            'position': "absolute",
            'top':    head+"px" ,
            'width':  width+"px"
            }
    );
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
