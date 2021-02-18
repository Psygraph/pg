import {pg} from './pg';
import {pgUtil, pgDebug} from './util';
import * as $ from 'jquery';

class PGUI {
    home = null;
    stopwatch = null;
    timer = null;
    counter = null;
    note = null;
    list = null;
    graph = null;
    map = null;
    about = null;
    preferences = null;
    categories = null;
    login = null;
    
    activePages = [];
    pageInit = false;
    
    state = {accel: {}, orient: {}, location: {}, notify: {}, random: {}, device: {}, bluetooth: {}};
    stateObservers = [];
    
    window = {t: null, pageIndex: null, categoryIndex: null, alertCallback: null, sidenav: null};
    screenshot = 'data:image/png;base64,';
    
    alertCB = null;
    dialogCB = async function(dialogInfo){};
    browserCB = (url) => {pgUtil.browser.open(url, '_blank', 'location=no');};
    
    init() {
        this.setCurrentPage('home');
        this.setCurrentCategory('Uncategorized');
        // @ts-ignore
        window.pgUI = this;
    }
    registerPage(page) {
        this.activePages.push(page);
        if (this.pageInit) {
            page.init();
        }
    }
    callPageInit() {
        this.activePages.forEach(observer => observer.init());
        this.pageInit = true;
    }
    // Add an observer to this.observers.
    addStateObserver(observer) {
        this.stateObservers.push(observer);
    }
    // Loops over this.observers and calls the update method on each observer.
    // The state object will call this method everytime it is updated.
    updateStateObservers(load) {
        this.stateObservers.forEach(observer => observer.updateState(load));
    }
    page() {
        return pg.pages[this.window.pageIndex];
    }
    category() {
        return pg.categories[this.window.categoryIndex];
    }
    setCurrentPage(name: string) {
        pgDebug.showLog("setting page: "+name);
        const index = pg.pages.indexOf(name);
        let num = 0;
        if (index !== -1) {
            num = index;
        }
        this.window.pageIndex = num;
    }
    setCurrentCategory(name: string) {
        const index = pg.categories.indexOf(name);
        let num = 0;
        if (index !== -1) {
            num = index;
        }
        this.window.categoryIndex = num;
    }
    showPage(show) {
        const page = this.page();
        pgUI[page].updateView(show);
    }
    savePage(page = this.page()) {
        if(pgUI[page]) {
            pgUI[page].savePageData();
        }
    }
    resetPage(saveFirst = true) {
        // This is basically a same-page transition.
        // It is only necessary for pages that cache event IDs
        const page = pgUI.page();
        if (saveFirst) {
            this.showPage(false);
        }
        this.showPage(true);
    }
    updateAllPageData() {
        for (var p in pg.pages) {
            var page = pg.pages[p];
            if (pg.pages.indexOf(page) < 0) { // found obsolete page!!!
                delete (pg.pages[p]);
                continue;
            }
            var pd = pg.pageData[page];
            for (var cat in pd.data) { // data contains categories and static data
                if(pg.categories.indexOf(cat) === -1) {
                    //delete (pd.data[cat]); //cant delete, may be static data.
                }
            }
            pg.pageData[page] = pd;
        }
    }
    updateAllPages() {
        for (let page of pg.pages) {
            if (pgUI[page]) {
                pgUI[page].setPageData(pgUI[page].getPageData());
            }
        }
    }
    /*
    gotoPage(page: string) {
        if(this.gotoPageCB) {
            this.gotoPageCB(page);
        }
    }
     */

    displayEventData(e) {
        return pgUI[pgUI.page()].displayEventData(e);
    }
    
    onResize() {
        const id = pgUI.page();
        if (typeof (pgUI[id]) !== 'undefined') {
            pgUI[id].resize();
        }
    }
    openWeb(url) {
        if (pgUtil.isWebBrowser) {
            var w = window.open(url, '_blank');//, 'location=no');
            if (url.substr(url.length - 4, url.length - 1) === '.mp3') {
                const html = '<html><head><style type="text/css">' + 'body {background-color: transparent;' + 'color: white;}' + '</style></head>' + '<body style="margin:0">' + '<embed id="yt" src="' + url + 'width="%0.0f" height="%0.0f"></embed>' + '</body></html>';
                w.document.write(html);
            }
        } else {
            this.browserCB(url);
        }
    }
    
    setCB(alertCB, dialogCB) {
        this.alertCB = alertCB;
        this.dialogCB = dialogCB;
    }
    showBusy(show) {
    }
    showAlert(title = 'Alert', text="", callback = (data: any) => {}) {
        pgDebug.writeLog(text);
        const alertInfo = {
            header: title, message: text, buttons: [{
                text: 'OK', handler: callback
            }]
        };
        if (this.alertCB) {
            this.alertCB(alertInfo);
        }
    }
    async showDialog(opts, content, callback = (success) => {}) {
        const dialogInfo = {
            opts: opts, content: content, callback: callback,
        };
        if (this.dialogCB) {
            await this.dialogCB(dialogInfo);
        }
    }
    showButtons(show) {
        $('div.modal_page').remove();
        if (show) {
            var T = $('#button_page_template').prop('content');
            var n = $(T.children[0]).clone();
            $('body').prepend(n[0]);
            $('#button_page .fast').each(function(index, element) {
                if (element.onclick) {
                    $(element).on('vclick', element.onclick).prop('onclick', 'return false');
                }
            });
            //var win = pgUI.getWindowDims();
            $('#button_page .lever_container').css({
                'height': '100%', // win.height/2+"px",
                'width': '100%'   // win.width+"px"
            });
        }
    }
    printSelect(id, title, allOpts, selOpt, multiple = false) {
        if (!Array.isArray(selOpt)) {
            selOpt = [selOpt];
        }
        let s = '';
        s += '<ion-item>';
        s += '<ion-label>' + title + '</ion-label>';
        s += '<ion-select id="' + id + '" class="" ';
        if (multiple) {
            s += 'multiple="true" value=[';
            for (var i = 0; i < selOpt.length; i++) {
                s += '"' + selOpt[i] + '",';
            }
            s += ']';
        }
        else {
            s += 'multiple="false" value=';
            for (var i = 0; i < selOpt.length; i++) {
                s += '"' + selOpt[i] + '"';
            }
        }
        s += 'placeholder="' + title + '" >\n';
        for (var i = 0; i < allOpts.length; i++) {
            s += '<ion-select-option value=\'' + allOpts[i] + '\' ';
            s += '>' + allOpts[i] + '</ion-select-option>\n';
        }
        s += '</ion-select>\n';
        s += '</ion-item>';
        return s;
    }
    printCheckbox(id, label, checked) {
        let s = '<label for=\'' + id + '\'>' + label + '</label>';
        s += '<input type=\'checkbox\' id=\'' + id + '\' name=\'' + id + '\' value=\'' + id + '\' ';
        if (checked) {
            s += 'checked ';
        }
        s += '/>';
        return s;
    }
}

export const pgUI = new PGUI();

// UI things =============================================
/*

export function onBackKeyDown() {
  //pgUI.gotoPage(pgUI.page());
}

export function onError(err) {
  const text  = err.message;
  const title = "Error: " +pgFile.basename(err.filename) +":" +err.lineno;
  //logEvent("error", {text: text, title: title});
  //if(pgLogin.loggingIn) {
  //  pgUI.showAlert(text, title);
  //}
  else if(pgDebug.debug) {
    pgUI.showAlert(text, title);
  }
  // returning true overrides the default window behaviour (i.e. we handled the error).
  return true;
}

function lever(arg) {
  const page = pgUI.getPage();
  if( page !== "" &&
      (pg.allPages.indexOf(page) !== -1 || page==="about"))
    UI[page].lever(arg);
}

let mouseClicks = 0, mouseTimer = null;
function onSingleTap(ev) {//
}
function onDoubleTap(ev) {//
}
export function singleClick(ev) {
}

function isInInputArea(e) {
  let isInput =
      e.target.type === "text"     ||
      e.target.type === "textarea" ||
      e.target.type === "search"   ||
      e.target.type === "input"    ||
      e.target.type === "password" ||
      e.target.type === "select";
  isInput = isInput || $(e.target).closest(".select2").length;
  return isInput;
}
export function onKeyDown(e) {
  // we handle pagination commands in keydown to prevent screen scrolling.
  // xxx There might be a better way to do this,
  // in which case we can move this code into keypress()
  if(isInInputArea(e))
    return false;
  const evt=(e)?e:(window.event)?window.event:null;
  if(evt) {
    const key=(evt.charCode)?evt.charCode:
        ((evt.keyCode)?evt.keyCode:((evt.which)?evt.which:0));
    switch(key) {
      case 37: // left arrow
        //pgUI.goLeft(e);
        break;
      case 39: // right arrow
        //pgUI.goRight(e);
        break;
      case 38: // up arrow
        //pgUI.goUp(e);
        break;
      case 40: // down arrow
        //pgUI.goDown(e);
        break;
      case 27: // "ESC"
        //pgUI.gotoPage(pgUI.page());
        break;
      case 188: // ",", hopefully less than without shift
        lever("left");
        break;
        //case 32: // space
      case 190: // ".", hopefully greater than without shift
        lever("right");
        break;
      default:
        return false;
    }
    //pgAudio.stopAlarm();
    return true;
  }
  return false;
}
function onKeyPress(e) {
  if(isInInputArea(e))
    return false;
  const evt=(e)?e:(window.event)?window.event:null;
  if(evt) {
    const key=(evt.charCode)?evt.charCode:
        ((evt.keyCode)?evt.keyCode:((evt.which)?evt.which:0));
    const dflt = $('.default');
    switch(key) {
      case 13: // return key
        if(dflt.length===1)
          dflt.click();
        else
          pgDebug.showLog("Too many defaults");
        break;
      default:
        return true;
    }
    return false;
  }
  return true;
}

static menu_leftButton() {
  var page   = pgUI.getPage();
  var pgPage = pgUI.page();
  if (page==="about"     ||
      page==="about"    ||
      page==="dialog"   ||
      page==="categories" ||
      page==="preferences") {
    if(pgUI.getSection()==="about")
      pgUI.gotoSectionMain();
    else
      pgUI.gotoPage(pgUI.page());
  }
  else {
    pgUI.slideNav(!pgUI.isSlideNavOpen());
  }
  return false;
}
static menu_rightButton() {
  var page = pgUI.getPage();
  if (page === "preferences" ||
      page === "categories") {
    //pgUI.gotoSectionHelp();
  }
  else {
    $("#" + page + "_page .rightMenu").popup("open");
  }
  return false;
}
static isSlideNavOpen() {
  if(!pgUI.window.sidenav)
    pgUI.window.sidenav = $(".sidenav");
  return pgUI.window.sidenav.css("width") !== "0px";
}
static slideNav(open) {
  var isOpen = pgUI.isSlideNavOpen();
  if (open && !isOpen) {
    pgUI.window.sidenav.css("width", "250px");
  }
  else if(!open && isOpen) {
    pgUI.window.sidenav.css("width", "0px");
  }
}
static menu_action(action) {
  var page = pgUI.page();
  if(action==="about") {
    pgUI.gotoPage("about");
  }
  else if(action==="preferences") {
    pgUI.gotoPage("preferences");
  }
  else if(action==="categories") {
    pgUI.gotoPage("categories");
  }
  else if(action==="login") {
    pgUI.closePopup($('#'+page+'_page .rightMenu'), pgLogin.loginUser.bind(pgLogin));
  }
  else if(action==="event") {
    pgUI.switchPopup($('#'+page+'_page .rightMenu'), $('#'+page+'_page .eventPopupMenu'));
  }
  else if(action==="about") {
    //pgUI.gotoPage("about");
  }
  else {
    pgDebug.showError("Unknown menu command");
  }
  return true;
}
*/




