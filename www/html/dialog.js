
function Dialog() {
    Page.call(this, "dialog");
    this.dlgPage   = $("#dialog_page");
    this.dlgTitle  = this.dlgPage.find(".pg_page_title");
    this.dlgText   = $("#dialogText");
    this.dlgOK     = $("#dialogOK");
    this.dlgCancel = $("#dialogCancel");
    this.dlgOther  = $("#dialogOther");

    this.nextPage = null;
    this.callback = null;

    this.dlgCancel.on('click', this.onCancel.bind(this));
    this.dlgOK.on('click', this.onOK.bind(this));
    this.dlgOther.on('click', this.onOther.bind(this));
}

Dialog.prototype = Object.create(Page.prototype);
Dialog.prototype.constructor = Dialog;

Dialog.prototype.update = function(show) {
};
Dialog.prototype.settings = function() {
};
Dialog.prototype.help = function() {
    return "Modal dialog.";
};

Dialog.prototype.showDialog = function(s, message, callback, nextPage) {
    this.callback = callback;
    this.nextPage = nextPage;
    this.dlgTitle.text(s.title);
    this.dlgText.html(message);
    this.dlgText.find("select").trigger("refresh");
    $(".default").removeClass('default');

    if(typeof(s['true'])!=="undefined") {
        this.dlgOK.html(s['true']);
        this.dlgOK.show();
        this.dlgOK.css('display','');
    }
    else {
        this.dlgOK.html(".");
        this.dlgOK.hide();
    }

    if(typeof(s['false'])!=="undefined") {
        this.dlgCancel.html(s['false']);
        this.dlgCancel.show();
        // sometimes these appear with "inline" defined, for no appearent reason....
        this.dlgCancel.css('display','')
    }
    else {
        this.dlgCancel.html(".");
        this.dlgCancel.hide();
    }

    if(typeof(s['other'])!=="undefined") {
        this.dlgOther.html(s['other']);
        this.dlgOther.show();
        this.dlgOther.css('display','');
    }
    else {
        this.dlgOther.hide();
        this.dlgOther.html(".");
    }

    gotoPage("dialog");
    this.dlgPage.trigger("create");

    var input = $("#dialogText").find("input");
    if(input.length) {
        input[0].focus();
    }
    if(s['true']) {
        this.dlgOK.addClass('default');
    }
};

Dialog.prototype.onCancel = function(e) {
    if(this.nextPage!=="NOP")
        gotoPage(this.nextPage);
    if(this.callback)
        this.callback(0);
    return false;
};
Dialog.prototype.onOK = function(e) {
    if(this.nextPage!=="NOP")
        gotoPage(this.nextPage);
    if(this.callback)
        this.callback(1);
    return false;
};
Dialog.prototype.onOther = function(e) {
    if(this.nextPage!=="NOP")
        gotoPage(this.nextPage);
    if(this.callback)
        this.callback(2);
    return false;
};

UI.dialog = new Dialog();
//# sourceURL=dialog.js
