
import {ButtonPage} from './page';
import {pg} from '../pg';
import {pgUtil} from '../util';
import {pgNet} from '../net';
import {pgUI}         from '../ui';
//import {pgAudio}     from '../audio';
//import {pgLocation}     from '../signal/location';
import * as $ from 'jquery';

export class Note extends ButtonPage {
    eid = 0;
    audioFilename = "";
    recording = false;
    showAudioControlsCB = null;
    titleCB;
    textCB;
    pgAudio;
    pgLocation;
    
    constructor(opts) {
        super("note", opts);
        // audio recording
        this.eid = 0;
        this.audioFilename = "";
        this.recording = false;
        this.pgLocation = opts.pgLocation;
    }
    init(opts) {
        super.init(opts);
        this.titleCB = opts.titleCB;
        this.textCB = opts.textCB;
        this.showAudioControlsCB = opts.showAudioControlsCB;
    }
    getPageData() {
        var data = super.getPageData();
        for(let cat of pg.categories) {
            if (!('addText' in data[cat])) {
                data[cat].addText = false;
            }
            if (!('addLocation' in data[cat])) {
                data[cat].addLocation = false;
            }
            if (!('showConfirmation' in data[cat])) {
                data[cat].showConfirmation = true;
            }
            if (!('lastText' in data[cat])) {
                data[cat].lastText = {'title': "Title", 'text': "Text"};
            }
        }
        return data;
    }
    updateView(show) {
        super.updateView(show);
        let cat=pgUI.category();
        if (show) {
            this.updateText();
            this.updateAudio();
        } else {
            this.pageData[cat].lastText = {
                'title': this.getNoteTitle(),
                'text': this.getNoteText()
            };
            // stop recording if we leave the page.
            if (this.recording)
                this.stop();
        }
    }
    
    /*    resize(size={height:0,width:0}) {
    if(super.needsResize(size)) {
        var titleHeight = $("#noteTitleDiv").outerHeight(true);
        var buttonHeight = $("#note_submit").outerHeight(true);
        var textContainerHeight = size.height - (titleHeight + buttonHeight);
        var textContainerHeight = Math.max(textContainerHeight, 240);
        $("#noteTextContainer").outerHeight(textContainerHeight);
        $("#noteText").outerHeight(textContainerHeight - 12);
        var width = size.width;
    }

    $("#" + this.name + "_page .content").css({
        position: "absolute",
        'top': header,
        'height': size.height - (header),
        'width': width + "px"
    });

    }
    */
    updateText(cat=pgUI.category()) {
        this.titleCB(this.pageData[cat].lastText.title);
        this.textCB(this.pageData[cat].lastText.text);
    }
    audioFileUploaded(filename) {
        // user notification is now achieved via email from the server.
        //if(this.pageData[cat].showConfirmation)
        //    pgUI.showAlert("Uploaded file: "+filename+", removed from local file system.");
    }
    
    start(restart=false) {
        super.start(restart);
        // get audio recording permissions
        this.pgAudio.getRecordPermissions();
        if (pgUI.note.eid !== 0) {
            pgUI.showAlert("","You must delete the current audio attachment before recording another attachment");
            return false;
        }
        // logic here to wait for audio to complete.
        this.recording = true;
        this.eid = pg.uniqueEventID();
        this.audioFilename = pgUtil.getRecordFilename(this.eid);
        this.pgAudio.record(this.audioCB.bind(this), this.audioFilename);
        return false;
    }
    audioCB(success, meter) {
        if (typeof (meter) !== "undefined") {
            // display metering information
            if(this.isRunning())
                this.stopID.fadeTo(meter.sec, 0.4 + 0.6 * meter.max);
            else
                this.stopID.css('opacity', '1');
            return;
        }
        if (success) {
            this.updateAudio();
        } else {
            this.eid = 0;
        }
        this.recording = false;
    }
    stop() {
        super.stop();
        if (this.recording) {
            this.pgAudio.stopRecord();
        }
    }
    reset(cat=pgUI.category()) {
        super.reset();
        if (this.recording) {    // wait for the user to stop recording.
            return false;
        }
        const time = pgUtil.getCurrentTime();
        var noteTitle = this.getNoteTitle();
        var noteText = this.getNoteText();
        var eventData:any = {};
        
        var hasTitle = (noteTitle !== "");
        var hasText = (noteText !== "");
        var hasAudio = this.eid !== 0;
        var hasLocation = false;
        
        if (!hasTitle && !hasText && !hasAudio)
            return;
        if(hasTitle) {
            eventData.title = noteTitle;
        }
        if(hasText) {
            eventData.text = noteText;
        }
        if (hasAudio) {
            eventData.audio = pgUtil.getAudioExt();
        }
        // logic here to wait for both location and audio to complete.
        if (!this.eid) {
            // we did not have a recording, so generate some event info.
            this.eid = pg.uniqueEventID();
        }
        
        if (this.pageData[cat].addLocation) {
            this.pgLocation.getCurrentLocation(posCB.bind(this));
        } else {
            addEvent.call(this);
        }
        return false;
        
        function posCB(path) {
            if (typeof (path) === "string") {
                // xxx handle error
            } else if (path.length) {
                var lat = path[path.length - 1][1];
                var lng = path[path.length - 1][2];
                var alt = path[path.length - 1][3];
                eventData.location = [[pgUtil.getCurrentTime(), lat, lng, alt]];
                hasLocation = true;
            }
            addEvent.call(this);
        }
        
        function addEvent(cat=pgUI.category()) {
            // this is called when other callbacks have completed
            pg.addNewEvents({
                id: this.eid,
                time: pgUtil.getCurrentTime(),
                category: pgUI.category(),
                page: pgUI.page(),
                type: "text",
                data: eventData
            }, true);
            
            // erase the data, since it has been submitted.
            this.eid = 0;
            this.pageData[cat].lastText = {'title': "", 'text': ""};
            this.updateText();
            this.updateAudio();
            
            if (this.pageData[cat].showConfirmation) {
                var includedData = [];
                if (hasText)
                    includedData.push("text");
                if (hasAudio)
                    includedData.push("audio");
                if (hasLocation)
                    includedData.push("location");
                var s = "<p>Data included: ";
                if (hasText || hasAudio || hasLocation)
                    s += includedData.join();
                else
                    s += "none";
                s += ".</p>";
                pgUI.showDialog({'title': "Created note: " + eventData.title, true: "OK"}, s);
            }
            pgNet.syncSoon();
        }
    }
    
    updateAudio() {
        if (pgUI.note.eid)
            this.showAudioControlsCB(true);
        else
            this.showAudioControlsCB(false);
    }
    playRecorded() {
        var fn = pgUtil.getRecordFilename(this.eid);
        this.pgAudio.playRecorded(this.eid, fn);
    }
    deleteRecorded() {
        if (!this.recording) {
            this.eid = 0;
            this.updateAudio();
        }
    }
    getNoteTitle() {
        return this.titleCB();
    }
    getNoteText(cat=pgUI.category()) {
        var noteText = "";
        if (this.pageData[cat].addText)
            noteText = this.textCB();
        return noteText;
    }
}
