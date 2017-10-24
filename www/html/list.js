
function list() {
    page.call(this, "list");
    this.initialized = false;
    this.categoryCache = null;
    this.scroll = null;
    this.lastSelected = null;
};

list.prototype = Object.create(page.prototype);
list.prototype.constructor = list;

list.prototype.update = function(show) {
    this.lastSelected = null;
    if(!show) {
        return;
    }
    // select according to the selectedEvents list
    if(!this.initialized || !pgUtil.equal(pg.categories, this.categoryCache) ) {
        this.categoryCache = pgUtil.deepCopy(pg.categories);
        var txt = '<ul data-role="listview" data-inset="true" id="list_eventAction">';
        txt += '<li data-role="list-divider"><i>Select action</i></li>';
        var click = "return UI.list.selectAction('delete');";
        txt += '<li data-icon="false"><a href="" onclick="'+click+'">Delete events</a></li>';
        var click = "return UI.list.selectAction('clearCache');";
        txt += '<li data-icon="false"><a href="" onclick="'+click+'">Clear event cache</a></li>';
        for(i=pg.categories.length-1; i>=0; i--) {
            if(i == pg.categoryIndex)
                continue;
            click = "return UI.list.selectAction('cat:"+pg.categories[i]+"');";
            txt += '<li data-icon="false"><a href="" onclick="'+click+'"><i>Change category</i>: '+pg.categories[i]+'</a></li>';
        }
        txt += '</ul>';
        $("#list_action").html(txt);
        $("#list_eventAction").listview().listview("refresh");

        // reset the "Select Events..." popup
        txt = '<ul data-role="listview" data-inset="true" id="list_eventSelect">';
        txt += '<li data-role="list-divider"><i>Select events</i></li>';
        click = "return UI.list.selectEvents('all');";
        txt += '<li data-icon="false"><a href="" onclick="'+click+'">Select all</a></li>';
        click = "return UI.list.selectEvents('none');";
        txt += '<li data-icon="false"><a href="" onclick="'+click+'">Select none</a></li>';
        for(i=0; i<pg.pages.length; i++) {
            if(pg.pages[i]=="list"  ||
               pg.pages[i]=="chart" ||
               pg.pages[i]=="graph")
                continue;
            click = "return UI.list.selectEvents('tool:"+pg.pages[i]+"');";
            txt += '<li data-icon="false"><a href="" onclick="'+click+'"><i>tool</i>: '+pg.pages[i]+'</a></li>';
        }
        txt += '</ul>';
        $("#list_select").html(txt);
        $("#list_eventSelect").listview().listview("refresh");

        this.initialized = true;
    }
    // Add the events
    //////////////////////////////////////
    var data = this.getPageData();
    var events = pg.getEvents();
    var s = "";
    s += "<thead><tr>";
    var nCols = 0;
    if(data.showID) {
        s += "<th class=data>ID</th>";
        nCols ++;
    }
    if(data.showDate) {
        s += "<th class=data>Time</th>";
        nCols ++;
    }
    if(data.showPage) {
        if(pg.category() == "*")
            s += "<th class=data>Category, Tool, Type</th>";
        else
            s += "<th class=data>Tool, Type</th>";
        nCols ++;
    }
    if(data.showData) {
        s += "<th class=data>Data</th>";
        nCols ++;
    }
    s += "</tr></thead>";
    s += "<tbody>";
    var eventsDisplayed = false;
    for (var i=0; i<events.length; i++) {
        var e = pgUtil.parseEvent(events[i]);
        if(data.pageFilter.indexOf(e.page) == -1)
            continue;
        eventsDisplayed = true;
        s += "<tr class='data eid' id=\""+ e.id.toString() +"\">";
        if(data.showID) {
            var id = e.id.toString();
            s += "<td class=data>"+id+"<input type='checkbox' id=\"cb_" + id + "\" value='";
            s += "' /></td>";
        }
        if(data.showDate) {
            s += "<td class=data>" + pgUtil.getDateString(e.start) + "</td>";
        }
        if(data.showPage) {
            if(pg.category() == "*")
                s += "<td class=data>" + e.category + ", "+ e.page + ", " + e.type + "</td>";
            else
                s += "<td class=data>" + e.page + ", " + e.type + "</td>";
        }
        if(data.showData) {
            var edata = pgUtil.displayEventData(e);
            s += "<td class=data>" + edata + "</td>";
        }
        s += "</tr>";
    }
    if(!eventsDisplayed) {
        s += "<tr><td class='fill' height='100%' colspan='" +nCols +"'>No events.</td></tr>";
    }
    else {
        s += "<tr><td class='fill' height='100%' colspan='" +nCols +"'>&nbsp;</td></tr>";
    }
    s += "</tbody>";
    $("#eventlist").html(s);

    // add the onClick listener for event selection
    $("tr.data").click(this.eventSelected.bind(this));

    this.resize();
    this.selectEvents("");
};

list.prototype.settings = function() {
    if(arguments.length) {
        //var data = arguments[0];
        var data = this.getPageData();
        var eventPages = pgUtil.deepCopy(pg.allEventPages);
        if(pg.getUserDataValue("debug"))
            eventPages.push("home","map");
        var s = pgUtil.selectPages("list_pages", "Show events from:", eventPages, data.pageFilter);
        s += "<div class='ui-field-contain no-field-separator' data-role='controlgroup'>";
        s += "<legend>Columns to display:</legend>";
        s += printCheckbox("list_showID",   "ID",   data.showID);
        s += printCheckbox("list_showDate", "Time", data.showDate);
        s += printCheckbox("list_showPage", "Tool,type", data.showPage);
        s += printCheckbox("list_showData", "Data", data.showData);
        s += "</div>";
        UI.settings.setPageContent(s);
        UI.settings.pageCreate();
    }
    else {
        var data = {
            pageFilter: $("#list_pages").val(),
            showID:     $("#list_showID")[0].checked,
            showDate:   $("#list_showDate")[0].checked,
            showPage:   $("#list_showPage")[0].checked,
            showData:   $("#list_showData")[0].checked,
        };
        return data;
    }
    function printCheckbox(id, label, checked) {
        s = "<label for='" +id+ "'>" +label+ "</label>";
        s += "<input type='checkbox' id='" + id + "' name='"+id+"' value='"+id+"' ";
        if(checked)
            s += "checked ";
        s += "/>";
        return s;
    }
};

list.prototype.getPageData = function() {
    var data = pg.getPageData("list", pg.category());
    if(! ('pageFilter' in data))
        data.pageFilter = ["stopwatch","note"];
    if(! ('showID' in data))
        data.showID = false;
    if(! ('showDate' in data))
        data.showDate = true;
    if(! ('showPage' in data))
        data.showPage = true;
    if(! ('showData' in data))
        data.showData = true;
    return data;
};

list.prototype.resize = function() {
    var head    = $("#list_header").outerHeight(true);
    var ctrls   = $("#list_controls").outerHeight(true);
    var subHead = $("#subheader_list").outerHeight(true);
    var win = getWindowDims();
    var height  = win.height - (head+ctrls+subHead);
    var width   = win.width;
    $("#list_table").height(height);
    $("#list_table").width(width);
};

list.prototype.eventSelected = function(e) {
    var id = null;
    var row = null;
    if(e.target.type == "checkbox") {
        var checkbox = e.target;
        row = checkbox.parentNode.parentNode;
        id = parseInt(checkbox.id);
    }
    else if(e.target.nodeName == "TD") { //a row was selected, select the checkbox.
        row = e.target.parentNode;
        id = parseInt(row.id);
    }
    if(id) {
        this.listSelectEvent(id);
        // select all rows between row and this.lastSelected
        if(this.lastSelected && e.shiftKey) {
            thisE = pg.getEventFromID(id);
            lastE = pg.getEventFromID(this.lastSelected);
            if(id == this.lastSelected)
                return true;
            this.lastSelected = null;
            var nextRow;
            var lastRow;
            if(thisE[E_START] > lastE[E_START]) {
                nextRow = $(row)[0].nextSibling;
                lastRow = $("#"+ lastE[E_ID])[0].previousSibling;
            }
            else {
                nextRow = $("#"+ lastE[E_ID])[0].nextSibling;
                lastRow = $(row)[0].previousSibling;
            }
            if(nextRow != lastRow.nextSibling)
                while(nextRow) {
                    id = parseInt(nextRow.id);
                    this.listSelectEvent(id);
                    if(nextRow==lastRow)
                        break;
                    nextRow = nextRow.nextSibling;
                }
        }
        else {
            this.lastSelected = id;
        }
        return true;
    }
};

list.prototype.listSelectEvent = function(id) {
    var row = $("#" +id);
    var checkbox = null;
    var data = this.getPageData();
    if(data.showID)
        checkbox = $("#cb_" + id)[0];
    if(pg.isEventSelected(id)) {
        pg.unselectEvent( id );
        if(checkbox)
            checkbox.checked = false;
        if(row)
            $(row).removeClass("selected");
    }
    else {
        pg.selectEvent( id );
        if(checkbox)
            checkbox.checked = true;
        if(row)
            $(row).addClass("selected");
    }
};

list.prototype.selectEvents = function(selection) {
    if(selection == "") {
        var ids = pg.getSelectedEventIDs();
        var list = $(".eid");
        for(var i=0; i<list.length; i++) {
            var row = list[i];
            var id  = row.id;
            var checkbox = $("#cb_" + id);
            if(ids.indexOf(parseInt(id)) == -1) {
                checkbox.checked = false;
                $(row).removeClass("selected");
            }
            else {
                checkbox.checked = true;
                $(row).addClass("selected");
            }
        }
    }
    else if(selection == "all") { // select all
        pg.selectEvents("*");
        this.selectEvents("");
    }
    else if(selection.substring(0,5) == "tool:") { // select events for a particular page
        var page = selection.substring(5,selection.length);
        var ids = pg.getEventIDsInPage(page);
        if(ids.length)
            pg.selectEvents(ids);
        this.selectEvents("");
    }
    else if(selection == "duplicates") { // select duplicates
        var id = [];
        var list = $(".eid");
        for(var i=0; i<list.length; i++) {
            id[i] = parseInt(list[i].id);
        }
        var ids = pg.findDuplicates(id);
        if(ids.length)
            pg.selectEvents(ids);
        this.selectEvents("");
    }
    else if(selection == "none") { // select none
        pg.unselectEvents(pg.category());
        this.selectEvents("");
    }
    else {
        console.log ("Unknown selection: " + selection);
    }
    $('#list_select').popup().popup('close');
    return false;
};

list.prototype.selectAction = function(selection) {
    var list = $(".eid.selected");
    var id = [];
    for(var i=0; i<list.length; i++) {
        newids = parseInt(list[i].id);
        id[id.length] = newids;
    }
    if(selection == "") {
        // no-op.
    }
    else if(selection.substring(0,4) == "cat:") {
        var cat = selection.substring(4,selection.length);
        pg.changeEventCategory(id, cat);
        this.update(true);
    }
    else if(selection == "delete") {
        pg.deleteEventIDs(id);
        syncSoon(true);
        this.update(true);
    }
    else if(selection == "clearCache") {
        pg.deleteEventIDs(id, false);
        syncSoon(true);
        this.update(true);
    }
    else {
        console.log ("Unknown selection: " + selection);
    }
    $('#list_action').popup().popup('close');
    return false;
};

UI.list = new list();
//# sourceURL=list.js
