import {pg} from '../pg';
import {pgUtil} from '../util';
import {pgNet}  from '../net';
import {pgUI}   from '../ui';
import {Page}   from './page';

import * as $ from 'jquery';

export class List extends Page {
    categoryCache = null;
    lastSelected = null;
    selectingRange = false;
    
    tableHeaders = [];
    tableData = [];
    
    constructor(opts) {
        super("list", opts);
        this.categoryCache = null;
        this.lastSelected = null;
        this.selectingRange = false;
    }
    init(opts) {
        super.init(opts);
    }
    getPageData() {
        var data = super.getPageData();
        for (let cat of pg.categories) {
            if (!('pages' in data[cat])) {
                data[cat].pages = ['stopwatch', 'timer', 'counter', 'note'];
            }
            if (!('showID' in data[cat])) {
                data[cat].showID = false;
            }
            if (!('showDate' in data[cat])) {
                data[cat].showDate = true;
            }
            if (!('showPage' in data[cat])) {
                data[cat].showPage = true;
            }
            if (!('showData' in data[cat])) {
                data[cat].showData = true;
            }
        }
        return data;
    }
    getAllPagesNV() {
        const allPages = [
            {name:"Home",value:"home"},
            {name:"Stopwatch",value:"stopwatch"},
            {name:"Timer",value:"timer"},
            {name:"Counter",value:"counter"},
            {name:"Note",value:"note"},
        ];
        return allPages;
    }
    getAllEventSelectionsNV() {
        const allSelections = [
            {value:'all', name:'Select all'},
            {value:'none', name:'Select none'},
            //{value:'range', name:'Select range'},
            {value:'tool:home', name:'home'},
            {value:'tool:stopwatch', name:'stopwatch'},
            {value:'tool:counter', name:'counter'},
            {value:'tool:timer', name:'timer'},
            {value:'tool:note', name:'note'},
        ];
        return allSelections;
    }
    getAllEventActionsNV() {
        let allActions = [{name:"Delete",value:"delete"}];
        for (let i=0; i<pg.numCategories(); i++) {
            let cat = pg.categories[i];
            allActions.push({name:"Category: "+cat, value:"cat:"+cat});
        }
        return allActions;
    }
    getTableHeaders(cat=pgUI.category()) {
        this.tableHeaders = [];
        if (this.pageData[cat].showID) {
            this.tableHeaders.push({ field: 'ID'});
        }
        if (this.pageData[cat].showDate) {
            this.tableHeaders.push({ field: 'Date'});
        }
        if (this.pageData[cat].showPage) {
            this.tableHeaders.push({ field: 'Page'});
            //if (pgUI.category() === "*")
            //    s += "<th class=data>Category, Tool, Type</th>";
            //else
            //    s += "<th class=data>Tool, Type</th>";
        }
        if (this.pageData[cat].showData) {
            this.tableHeaders.push({ field: 'Data'});
        }
        return this.tableHeaders;
    }
    getTableData(cat=pgUI.category()) {
        this.tableData = [];
        var events = pg.getEvents(pgUI.category());
        for (var i = 0; i < events.length; i++) {
            var e = pg.parseEvent(events[i]);
            if (this.pageData[cat].pages.indexOf(e.page) === -1) continue;
            let page = e.page + ", " + e.type;
            if (pgUI.category() === "*") {
                page = e.category + ", " + page;
            }
            this.tableData.push({
                click: "itemClick(" + e.id + ");",
                ID: e.id.toString(),
                Date: pgUtil.getDateString(e.start),
                Page: page,
                Data: this.displayEventData(e),
            });
        }
        return this.tableData;
    }
    updateView(show) {
        super.updateView(show);
        this.lastSelected = null;
        if (show) {
        }
    }
    isEventSelected(id) {
        return pg.isEventSelected(id);
    }
    listSelectEvent(id) {
        var row = $("#" +id);
        if(pg.isEventSelected(id)) {
            pg.unselectEvent( id );
            if(row)
                $(row).removeClass("selected");
        }
        else {
            pg.selectEvent( id );
            if(row)
                $(row).addClass("selected");
        }
        pgNet.syncSoon();
    }
    selectEvents(selection) {
        if(selection === "") {
            var ids = pg.getSelectedEventIDs(pgUI.category());
            var list = $(".eid");
            for(var i=0; i<list.length; i++) {
                var row = list[i];
                var id  = row.id;
                if(ids.indexOf(parseInt(id)) === -1) {
                    $(row).removeClass("selected");
                }
                else {
                    $(row).addClass("selected");
                }
            }
        }
        else if(selection === "all") { // select all
            pg.selectEvents("*");
            this.selectEvents("");
        }
        else if(selection.substring(0,5) === "tool:") { // select events for a particular page
            var page = selection.substring(5,selection.length);
            var ids = pg.getEventIDsInPage(page,pgUI.category());
            if(ids.length)
                pg.selectEvents(ids);
            this.selectEvents("");
        }
        /*
        else if(selection === "duplicates") { // select duplicates
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
        */
        else if(selection === "none") { // select none
            pg.unselectEvents(pgUI.category());
            this.selectEvents("");
        }
        else if(selection === "range") { // select none
            //pgUI.showDialog({title: "Enter start date", true: "OK", false: "Cancel"},
            //    "<input id=\"list_dateStart\" type=\"text\" data-role=\"date\">",
            //    pwcb.bind(this)
            //);
            this.selectingRange = true;
        }
        else {
            console.log ("Unknown selection: " + selection);
        }
        pgNet.syncSoon();
    }
    eventAction(selection) {
        var list = $(".eid.selected");
        var id = [];
        for(var i=0; i<list.length; i++) {
            const newids = parseInt(list[i].id);
            id[id.length] = newids;
        }
        if(selection === "") {
            // no-op.
        }
        else if(selection.substring(0,4) === "cat:") {
            var cat = selection.substring(4,selection.length);
            pg.changeEventCategory(id, cat);
            this.updateView(true);
        }
        else if(selection === "delete") {
            pg.deleteEventIDs(id);
            pgNet.syncSoon();
            this.updateView(true);
        }
        else if(selection === "clearCache") {
            pg.deleteEventIDs(id, false);
            pgNet.syncSoon();
            this.updateView(true);
        }
        else {
            console.log ("Unknown selection: " + selection);
        }
    }
    showAlert(title, text) {
        console.log("clicked");
        pgUI.showAlert(pgUtil.escape(title, true), pgUtil.escape(text, true));
    }
    playRecorded(id, fn) {
        this.pgAudio.playRecorded(id, fn);
    }
}
