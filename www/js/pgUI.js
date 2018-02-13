var pgUI = {
    getWindowDims : function(current) {
        current = typeof(current)!="undefined" ? current : true;
        var win = {};
        if(!current && (
            Math.abs(window.orientation)==90 ||
            Math.abs(window.orientation)==-90 )) {
            win.width  = $(window).height(); 
            win.height = $(window).width();
        }
        else {
            // these are "pre-rotated"
            win.width  = $(window).width();
            win.height = $(window).height();
        }
        return win;
    },

    printSelect: function(id, title, allOpts, selOpt, multiple) {
        multiple = typeof(multiple)=="undefined" ? false : multiple;
        if(! Array.isArray(selOpt))
            selOpt = [selOpt];
        var s = "";
        s += "<legend>"+title+"</legend>";
        s += '<select id="'+id+'" class="needsclick" data-native-menu="false" ';
        if(multiple)
            s += 'multiple="multiple"';
        s += '>\n';
        s += '<option data-placeholder="true">'+title+'</option>\n';
        for(var i=0; i<allOpts.length; i++) {
            s += "<option value='"+ allOpts[i] +"' ";
            if(selOpt.indexOf(allOpts[i]) != -1)
                s += 'selected="selected" ';
            s += ">"+ allOpts[i] +"</option>\n";            
        }
        s += "</select>\n";
        return s;
    },
    printCheckbox : function(id, label, checked) {
        s = "<label for='" +id+ "'>" +label+ "</label>";
        s += "<input type='checkbox' id='" + id + "' name='"+id+"' value='"+id+"' ";
        if(checked)
            s += "checked ";
        s += "/>";
        return s;
    },

    closePopup: function(sourceElement, onswitched) {
        var afterClose = function() {
            sourceElement.off("popupafterclose", afterClose);  
            if (onswitched && typeof onswitched === "function"){
                onswitched();
            }
        };    
        sourceElement.on("popupafterclose", afterClose);
        sourceElement.popup("close");
    },
    switchPopup: function(sourceElement, destinationElement, onswitched) {
        var afterClose = function() {
            destinationElement.popup("open").trigger("create");
            sourceElement.off("popupafterclose", afterClose);  
            if (onswitched && typeof onswitched === "function"){
                onswitched();
            }
        };    
        sourceElement.on("popupafterclose", afterClose);
        sourceElement.popup("close");
    },

    showDialog: function(s, message, callback) {
        callback = callback || function(){};
        UI.dialog.showDialog(s, message, callback);
    },
    showBusy: function(show) {
        $('div.modal_page').remove();
        if(show) {
            var T  = $("#busy_template").prop('content');
            var n   = $(T.children[0]).clone();
            $('body').prepend(n[0]);
        }
    },
    showButtons: function(show) {
        $('div.modal_page').remove();
        if(show) {
            var T   = $("#button_page_template").prop('content');
            var n   = $(T.children[0]).clone();
            $('body').prepend(n[0]);
            $("#button_page .fast").each(function(index, element) {
                if (element.onclick) {
                    $(element).on('vclick', element.onclick).prop('onclick', "return false");
                }
            });
            var win = pgUI.getWindowDims();
            $("#button_page .lever_container").css({
                'height':       win.height/2+"px",
                'width':    win.width+"px"
            });
        }
    },
    showAlert: function(message, title, cb) {
        title   = typeof(title)!=="undefined" ? title : "Alert";
        message = pgUtil.escape(message, false, false);
        title   = pgUtil.escape(title, false, false);
        var modal     = typeof(cb)!=="undefined" ? false : true;
        UI.window.alertCallback = typeof(cb)!="undefined" ? cb : null;
        $(".default").removeClass('default');

        $("#pgAlert").remove();
        var html = '<div id="pgAlert" data-role="popup" id="popupDialog" data-overlay-theme="a" data-theme="a"'+
            'data-position-to="window" data-dismissible="'+ !modal +'" class="ui-content" >'+
            '<div id="alertHead" data-role="header" data-theme="a"><h1>'+title+'</h1></div>'+
            '<div id="alertBody" role="main" class="ui-content">'+
            '<div id="alertText">'+message+'</div>'+
            '<a href="" class="ui-btn ui-corner-all ui-shadow default" '+
            'onclick="$(\'#pgAlert\').popup(\'close\');return pgUI.alertCallbackHolder();">OK</a>'+
            '</div></div>';
        var dlg = $(html);
        $("body").append(dlg);
        $("#pgAlert").enhanceWithin();
        $("#pgAlert").popup().popup("open");
    },

    alertCallbackHolder: function(l) {
        if(UI.window.alertCallback)
            UI.window.alertCallback.apply(this, arguments);
        return false;
    },

    menu_leftButton: function() {
        var page   = getPage();
        var pgPage = pg.page();
        if (page==="help"     ||
            page==="about"    ||
            page==="dialog"   ||
            page==="categories" ||
            page==="preferences") {
            if(getSection()==="help")
                gotoSectionMain();
            else
                gotoPage(pg.page());
        }
        else {
            pgUI.slideNav(!pgUI.isSlideNavOpen());
        }
        return false;
    },
    menu_rightButton: function() {
        var page = getPage();
        if (page === "preferences" ||
            page === "categories") {
            gotoSectionHelp();
        }
        else {
            $("#" + page + "_page .rightMenu").popup("open");
        }
        return false;
    },
    isSlideNavOpen: function() {
        if(!UI.window.sidenav)
            UI.window.sidenav = $(".sidenav");
        return UI.window.sidenav.css("width") !== "0px";
    },
    slideNav: function(open) {
        var isOpen = pgUI.isSlideNavOpen();
        if (open && !isOpen) {
            UI.window.sidenav.css("width", "250px");
        }
        else if(!open && isOpen) {
            UI.window.sidenav.css("width", "0px");
        }
    },
    menu_action: function(action) {
        var page = pg.page();
        if(action==="about") {
            gotoPage("about");
        }
        else if(action==="preferences") {
            gotoPage("preferences");
        }
        else if(action==="categories") {
            gotoPage("categories");
        }
        else if(action==="login") {
            pgUI.closePopup($('#'+page+'_page .rightMenu'), pgLogin.loginUser.bind(pgLogin));
        }
        else if(action==="event") {
            pgUI.switchPopup($('#'+page+'_page .rightMenu'), $('#'+page+'_page .eventPopupMenu'));
        }
        else if(action==="help") {
            gotoPage("help");
        }
        else {
            pgUI_showError("Unknown menu command");
        }
        return true;
    }
};


function pgUI_showLog(msg) {
    console.log(msg);
}
function pgUI_showWarn(msg) {
    console.warn('WARNING: ' +msg);
    if(pg.debug()) {
        pg.addNewEvents({page: "home", type: "warn", data: {'text': msg}}, true);
    }
}
function pgUI_showError(msg) {
    console.error('ERROR: ' +msg);
    if(pg.debug()) {
        pg.addNewEvents({page: "home", type: "error", data: {'text': msg}}, true);
    }
}