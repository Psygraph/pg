
function help() {
    page.call(this, "help");
    this.intro = true;
}

help.prototype = Object.create(page.prototype);
help.prototype.constructor = help;

help.prototype.update = function(show, state) {
    if(!show) {
        this.setIntro(false);
        return {'intro': this.intro};
    }
    else {
        if(typeof(state)!="undefined")
            this.intro = state.intro;
        if(this.intro) {
            // optionally show an intro to the application
            this.intro = false;
        }
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
    var head   = this.headerHeight();
    var win    = getWindowDims();
    var width  = win.width;
    $("#help_page .content").css({
            'position': "absolute",
            'top':    head+"px" ,
            'width':  width+"px"
            }
    );
};

help.prototype.setIntro = function(value) {
    this.intro = value;
    $("#help .scrollable").scrollTop(0);
    PGEN.writePsygraph({'accepted': value});
};

UI.help = new help();
//# sourceURL=help.js
