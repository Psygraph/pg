import {PG, pg, E_TYPE, E_START, E_DUR} from '../pg';
import {pgUtil, pgDebug} from '../util';
import {pgUI} from '../ui';
import {pgNet} from '../net';
import {pgFile} from '../file';
//import {pgAudio} from '../audio';
//import {pgXML} from '../xml';

import * as $ from 'jquery';

export class Page {
    name = '';
    initialized;
    pageData: any = {}; //this is a cache of the page data, so that the client does not need to reach into the PG
    size = {height: 0, width: 0};
    pgAudio;
    pgXML;
    
    constructor(name, opts) {
        this.name = name;
        this.initialized = false;
        this.pgAudio = opts.pgAudio;
        this.pgXML = opts.pgXML;
    }
    init(opts = {}) {
        //pgUI.setCurrentPage(this.name);
        if(!this.initialized) {
            this.pageData = this.getPageData();
            this.initialized = true;
        }
    }
    getPageData() {
        const page = this.name;
        let data = pg.getPageData(page);
        //if(! ('applyAll' in data))
        //    data.applyAll = true;
        return data;
    }
    /*
    getPageDataField(name, cat=pgUI.category()) {
        const data = this.getPageData(cat);
        return data[name];
    }
    */
    setPageData(newData) {
        this.pageData = newData;
    }
    savePageData() {
        const page = this.name;
        const oldPageData = pg.getPageData(page);
        if (!pgUtil.equal(oldPageData, this.pageData)) {
            const pmtime = pgUtil.getCurrentTime();
            pg.setPageData(pmtime, this.pageData, page);
        }
    }
    /*
    setPageDataField(name, value, cat=pgUI.category()) {
        const page = this.name;
        const data = this.getPageData(cat);
        data[name] = value;
        this.setPageData(data, cat);
    }
    */
    // update is called in response to show or hide
    updateData(load, applyAll) {
        if (load) {
            this.pageData = this.getPageData();
            //pgNet.logEvent('updateData');
        } else {
            this.savePageData();
            this.updateSettings(applyAll);
            pgNet.syncSoon();
        }
    }
    updateView(show) {
        if (show) {
            pgUI.setCurrentPage(this.name);
            this.pgAudio.stopAlarm(-1);
            pgNet.logEvent('updateView');
        }
    }
    hasSignal(signal, cat = pgUI.category()) {
        //data= typeof(data)!=="undefined" ? data : this.getPageData();
        return this.pageData[cat].signals.indexOf(signal) >= 0;
    }
    
    lever(arg) {
        if (arg === 'left') {
            // NOP
        } else if (arg === 'right') {
            // NOP
        }
    }
    tripleClick() {
        // NOP
    }
    /*
        headerHeight() {
            return $("#"+this.name+"_page .header").outerHeight(true);
        }
        contentWidth() {
            const win    = pgUI.getWindowDims();
            return win.width;
        }
     */
    needsResize(size = {height: 0, width: 0}) {
        if (this.size == size || size.height == 0 || size.width == 0) {
            return false;
        }
        return true;
    }
    resize(size = {height: 0, width: 0}) {
        if(size.height==0) {
            pgDebug.showError("resize called with a value of zero");
        }
        else
            this.size = size;
    }
    
    getSummary(page, cat) {
        const events = pg.getEventsInPage(page, cat);
        const count = events.length;
        const range = 30 * 24 * 60 * 60 * 1000;
        const start = pgUtil.getCurrentTime() - range;
        let txt = '';
        if (page === 'stopwatch' || page === 'timer') {
            let sec = 0;
            for (let i = 0; i < events.length; i++) {
                if (events[i][E_TYPE] === 'interval') {
                    sec += events[i][E_DUR] / 1000;
                }
                if (events[i][E_START] < start) {
                    break;
                }
            }
            const hours = sec / (60 * 60);
            txt = hours.toFixed(3) + ' hours';
        }
            //else if(page=="timer") {
            //    for(const i=0; i<events.length; i++) {
            //    }
            //}
            //else if(page=="counter") {
            //}
            //else if(page=="note") {
        //}
        else {
            txt = count + ' events';
        }
        return txt;
    }
    eventShowAlert(title, text) {
        pgUI.showAlert(pgUtil.escape(title, true),
            pgUtil.escape(text, true));
    }
    eventPlayMedia(id, fn) {
        this.pgAudio.playRecorded(id, fn);
    }
    displayEventData(e) {
        let text = '';
        let onclick = [];
        try {
            const dur = getTimeString(e.duration);
            if ((e.page === 'stopwatch' || e.page === 'map') && (e.type === 'interval')) {
                text += dur;
                for (const field in e.data) {
                    if (field === 'location') {
                        const loc = e.data.location[0]; // just look at the first location
                        const ll = 'lat: ' + loc[1].toFixed(4) + ', long: ' + loc[2].toFixed(4);
                        text += '+loc';
                        onclick[onclick.length] = this.eventShowAlert.bind(this, 'location', ll);
                        if (typeof (e.data.distance) !== 'undefined') {
                            text += ' ' + e.data.distance.toFixed(2) + ' miles';
                        }
                    } else if (field === 'acceleration') {
                        text += ' +acc';
                    } else if (field === 'orientation') {
                        text += ' +orient';
                    } else if (field === 'heartRate') {
                        text += ' +HR';
                    } else if (field === 'orientation') {
                        text += ' +orient';
                    } else if (field === 'temperature') {
                        text += ' +temp';
                    } else if (field === 'analog1') {
                        text += ' +analog1';
                    } else if (field === 'analog2') {
                        text += ' +analog2';
                    } else if (field === 'random') {
                        text += ' +rand';
                    }
                }
            } else if (e.page === 'stopwatch' && e.type === 'reset') {
                // resets have nothing to display
            } else if (e.page === 'note' || (e.page === 'map' && e.type === 'marker')) {
                text += '"'+pgUtil.escape(e.data.title)+'"';
                if (typeof (e.data.text) !== 'undefined') {
                    //const title = e.data.title !== "" ? e.data.title : "note";
                    text += ' +text';
                    onclick[onclick.length] = this.eventShowAlert.bind(this, e.data.title, e.data.text);
                }
                if (typeof (e.data.location) !== 'undefined') {
                    const ll = 'lat: ' + e.data.location[0][1].toFixed(4) + ', long: ' + e.data.location[0][2].toFixed(4);
                    text += ' +loc';
                    onclick[onclick.length] = this.eventShowAlert.bind(this, e.data.title, ll);
                }
                if (typeof (e.data.audio) !== 'undefined') {
                    const fn = pgUtil.getRecordFilename(e.id, e.data.audio);
                    const id = e.id;
                    text += ' +audio';
                    onclick[onclick.length] = this.eventPlayMedia.bind(this, id, fn);
                }
            } else if (e.page === 'timer') {
                if (e.type === 'interval') {
                    text += dur;
                } else if (e.type === 'reset') {
                    if (typeof (e.data['resetTime']) !== 'undefined') {
                        text += ' ' + getTimeString(e.data.resetTime);
                    }
                    if (typeof (e.data['mindful']) !== 'undefined') {
                        if (e.data.mindful) {
                            text += ', Mindful';
                        } else {
                            text += ', Not mindful';
                        }
                    }
                }
            } else if (e.page === 'counter') {
                text += e.data.count;
                if (e.type === 'reset' && e.data.target !== 0) {
                    if (e.data.count === e.data.target) {
                        text += ', correct';
                    } else {
                        text += ', incorrect';
                    }
                }
            } else if (e.page === 'home') {
                if (e.type === 'login') {
                    text += dur;
                }
                if (e.type === 'error' || e.type === 'warn' || e.type === 'log') {
                    text += '+text';
                    onclick[onclick.length] = this.eventShowAlert.bind(this, e.type, e.data.text);
                }
            } else {
                console.log('unknown page for event, type: ' + e.page + e.type);
            }
        } catch (err) {
            text += ' [CORRUPT DATA] ';
            // xxx we should probably delete this event.
        }
        return {text: text, onclick: onclick};
        function getTimeString(dur) {
            let t = pgUtil.getStringFromMS(dur, true);
            t = t + ' sec';
            return t;
        }
    }
    gotoCategory(cat) {
        // save page state, goto new category, load page state
        this.updateView(false);
        pgUI.setCurrentCategory(cat);
        this.updateView(true);
    }
    // ======= PAGE SETTINGS ======
    updateSettings(cat = pgUI.category(), applyAll = false) {
        const page = this.name;
        let catData;
        let newCatData;
        
        const localPG = new PG();
        localPG.init();
        localPG.copy(pg, false);
        // handle a change in categories
        if (this.name === 'categories') {
            if (!pgUtil.equal(this.pageData.categories, localPG.categories)) {
                localPG.setCategories(this.pageData.categories);
            }
            newCatData = localPG.getCategoryData();
            catData = pg.getCategoryData();
            const colorEqual = pgUtil.equal(catData[cat].color, newCatData[cat].color);
            if (!pgUtil.equal(catData[cat].sound, newCatData[cat].sound)) {
                this.pgAudio.alarm();
            }
            if (!pgUtil.equal(catData[cat].text, newCatData[cat].text)) {
                this.pgXML.getCategoryText(cat, (success)=>{}, true);
            }
        }
        if (applyAll) {
            for (let i = 0; i < this.pageData.categories.length; i++) {
                localPG.setPageDataForCategory(this.pageData[cat], page, this.pageData.categories[i]);
            }
        } else {
            localPG.setPageDataForCategory(this.pageData[cat], page, cat);
        }
        
        // no-op if settings have not changed
        if (pgFile.encodePG(localPG, true) !== pgFile.encodePG(pg, true)) {
            // Here we might download and cache the CSS or TEXT files.
            localPG.setDirty(true);
            pg.copy(localPG, false);
            pgNet.writePG(pg, fileWriteCB.bind(this));
        }
        function fileWriteCB(success) {
            if (!success) {
                pgUI.showAlert("warning",'Could not write data locally');
            }
            // copy changes to network if necessary
            pgNet.updateSettings(pg, netWriteCB.bind(this));
            pgNet.syncSoon();
            
            function netWriteCB(success) {
                if (!success) {
                    pgUI.showAlert("warning",'Could not update data on server');
                }
            }
        }
    }
}

export class ButtonPage extends Page {
    resetID;
    startID;
    stopID;
    
    constructor(name, opts) {
        super(name, opts);
    }
    init(opts = {}) {
        super.init(opts);
        this.resetID = $('#' + this.name + '_page input.reset');
        this.startID = $('#' + this.name + '_page input.start');
        this.stopID  = $('#' + this.name + '_page input.stop');
    }
    getPageData() {
        let data = super.getPageData();
        for(let cat of pg.categories) {
            if (!('running' in data[cat])) {
                data[cat].running = false;
            }
        }
        return data;
    }
    updateView(show, cat=pgUI.category()) {
        super.updateView(show);
        if (show) {
            try {
                this.setRunning(this.pageData[cat].running);
            } catch (err) {
                pgDebug.showWarn(err.toString());
                this.pageData[cat].running = false;
                this.setRunning(this.pageData[cat].running);
            }
        }
        else {
        }
    }
    start(restart = false, time = pgUtil.getCurrentTime(), cat=pgUI.category()) {
        this.setRunning(true);
        pgNet.syncSoon();
    }
    stop(time = pgUtil.getCurrentTime(), cat=pgUI.category()) {
        if (!this.isRunning(cat)) {
            pgDebug.showError('Clock is already stopped');
        }
        this.setRunning(false, cat);
        pgNet.syncSoon();
    }
    reset(time = pgUtil.getCurrentTime(), cat=pgUI.category()) {
        pgNet.syncSoon();
    }
    
    setRunning(running, cat=pgUI.category()) {
        //pgDebug.showLog("Setting running status to "+running+" for page: "+this.name+", cat: "+pgUI.category());
        //console.trace();
        this.pageData[cat].running = running;
        if (!this.startID) {
            return;
        }
        if (running) {
            this.startID.hide().prop('disabled', true);
            this.stopID.show().prop('disabled', false);
            //$("#button_page .lever_button.start").hide().prop('disabled', true);
            //$("#button_page .lever_button.stop").show().prop('disabled', false);
        } else {
            this.startID.show().prop('disabled', false);
            this.stopID.hide().prop('disabled', true);
            //$("#button_page .lever_button.start").show().prop('disabled', false);
            //$("#button_page .lever_button.stop").hide().prop('disabled', true);
        }
    }
    isRunning(cat = pgUI.category()) {
        return this.pageData[cat].running;
    }
    lever(arg) {
        if (arg === "left") {
            this.reset();
        } else if (arg === "right") {
            if (this.isRunning()) {
                this.stop();
            } else {
                this.start();
            }
        }
    }
    buttonClick(type) {
        const page = pgUI[pgUI.page()];
        if (type === "start") {
            this.start();
        } else if (type === "stop") {
            this.stop();
        } else if (type === "reset") {
            this.reset();
        }
    }
    tripleClick() {
        pgUI.showButtons(true);
    }
}
