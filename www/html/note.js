
function Note() {
    ButtonPage.call(this, "note");
    // audio recording
    this.eid           = 0;
    this.audioFilename = "";
    this.recording     = false;
}

Note.prototype = Object.create(ButtonPage.prototype);
Note.prototype.constructor = Note;

Note.prototype.update = function(show, data) {
    this.data = ButtonPage.prototype.update.call(this, show, data);
    if(show) {
        //this.createEnhancedEditor(data.enhancedEditor);
        this.updateText();
        this.updateAudio();
        this.resize();
    }
    else {
        this.data.lastText = {
            'title': this.getNoteTitle(),
            'text':  this.getNoteText()
        };
        // stop recording if we leave the page.
        if(this.recording)
            this.stop();
        //if(tinyMCE.activeEditor)
        //    tinyMCE.activeEditor.selection.collapse();
    }
    return this.data;
};

Note.prototype.settings = function(show) {
    if(show) {
        $("#note_addText").prop("checked", this.data.addText).checkboxradio("refresh");
        $("#note_addLocation").prop("checked", this.data.addLocation).checkboxradio("refresh");
        $("#note_showConfirmation").prop("checked", this.data.showConfirmation).checkboxradio("refresh");
        //$("#note_enhancedEditor").prop("checked", this.data.enhancedEditor).checkboxradio("refresh");
    }
    else {
        this.data.addText=          $("#note_addText")[0].checked;
        this.data.addLocation=      $("#note_addLocation")[0].checked;
        this.data.showConfirmation= $("#note_showConfirmation")[0].checked;
        //this.data.enhancedEditor=   $("#note_enhancedEditor")[0].checked
        //this.createEnhancedEditor(this.data.enhancedEditor);
    }
    return this.data;
};
Note.prototype.resize = function() {
    Page.prototype.resize.call(this, false);
    var header = this.headerHeight();
    var subheader = $("#note_page div.category").outerHeight(true);
    var win    = pgUI.getWindowDims();
    var titleHeight  = $("#noteTitleDiv").outerHeight(true);
    var buttonHeight = $("#note_submit").outerHeight(true);
    var textContainerHeight = win.height - (header+subheader+titleHeight+buttonHeight+12);
    var textContainerHeight = Math.max(textContainerHeight, 240);
    if(this.data.addText) {
        $("#noteTextContainer").show();
    }
    else {
        $("#noteTextContainer").hide();
    }
    $("#noteTextContainer").outerHeight(textContainerHeight);
    $("#noteText").outerHeight(textContainerHeight-12);
    var width  = win.width;

    $("#"+this.name+"_page .content").css({
            position: "absolute",
                'top':    header, 
                'height': win.height - (header),
                'width':  width+"px"
                });
};

/*
note.prototype.createEnhancedEditor = function(show) {
    if(show) {
        if(!tinyMCE.activeEditor) {
            this.resize();
            var height = $("#noteTextContainer").height()*2/3;
            var mce_opts = {
                selector: 'textarea',
                menubar: false,
                resize: false,
                min_height: height,
                max_height: height,
                height: height,
                plugins: [
                    'advlist charmap colorpicker hr link', //fullscreen 
                    'lists spellchecker wordcount'
                ],
                toolbar: 'undo redo | insert | styleselect', // fullscreen | cut copy paste
                content_css: 'css/content.css'
            };
            try {
                tinymce.init(mce_opts);
            }
            catch(e){}
        }
        //tinymce.activeEditor.on('ObjectResizeStart', function(e) {
        //            // Prevent resize
        //            //e.preventDefault();
        //    });
        //tinymce.activeEditor.on('ObjectResized', function(e) {
        //        //console.log(e.target, e.width, e.height);
        //        this.resize();
        //    });
        //$('textarea.tinymce').tinymce({
        //        theme_advanced_resizing: false,
        //        theme_advanced_resizing_use_cookie : false
        //            });
        //$("textarea.tinymce").contents().find("body").css({
        //        "height": "100%",
        //            "overflow": "auto",
        //            "-webkit-overflow-scrolling": "touch"
        //            });
    }
    else {
        if(tinyMCE.activeEditor) {
            tinymce.remove(tinyMCE.activeEditor);
            //tinyMCE.activeEditor = null;
        }
    }
    this.resize();
};
*/
Note.prototype.updateText = function() {
    $("#noteTitle").val(this.data.lastText.title);
    //if(data.enhancedEditor)
    //    tinyMCE.activeEditor.setContent(s.text, {format : 'raw'});
    //else
    $("#noteText").val(this.data.lastText.text);
};

Note.prototype.getPageData = function(cat) {
    cat = (typeof(cat) !== "undefined") ? cat : pg.category();
    var data = ButtonPage.prototype.getPageData.call(this, cat);
    if(! ('addText' in data))
        data.addText          = false;
    if(! ('addLocation' in data))
        data.addLocation      = false;
    if(! ('showConfirmation' in data))
        data.showConfirmation = true;
    if(! ('lastText' in data))
        data.lastText = {'title': "Title", 'text':  "Text"};
    //if(! ('enhancedEditor' in data))
    //    data.enhancedEditor   = false;
    return data;
};

Note.prototype.audioFileUploaded = function(filename) {
    // user notification is now achieved via email from the server.
    //if(this.data.showConfirmation)
    //    pgUI.showAlert("Uploaded file: "+filename+", removed from local file system.");
};

Note.prototype.start = function(restart) {
    ButtonPage.prototype.start.call(this,restart);
    // get audio recording permissions
    pgAudio.getRecordPermissions();
    if(UI.note.eid !== 0) {
        pgUI.showAlert("You must delete the current audio attachment before recording another attachment");
        return false;
    }
    // logic here to wait for audio to complete.
    this.recording      = true;
    this.eid            = pg.uniqueEventID();
    this.audioFilename  = pgAudio.getRecordFilename(this.eid);
    pgAudio.record(audioCB.bind(this), this.audioFilename);
    return false;

    function audioCB(success, meter) {
        if(typeof(meter)!=="undefined") {
            // display metering information
            this.stopID.fadeTo(meter.sec, 0.4 + 0.6*meter.max);
            return;
        }
        if(success) {
            UI.note.updateAudio();
        }
        else {
            UI.note.eid=0;
        }
        this.stopID.css('opacity', '1');
        UI.note.recording = false;
    }
};

Note.prototype.stop = function() {
    ButtonPage.prototype.stop.call(this);
    if(this.recording) {
        pgAudio.stopRecord();
    }
};

Note.prototype.reset = function() {
    ButtonPage.prototype.reset.call(this);
    if(this.recording) {    // wait for the user to stop recording.
        return false;
    }
    var time          = pgUtil.getCurrentTime();
    var noteTitle     = this.getNoteTitle();
    var noteText      = this.getNoteText();
    var eventData     = {'title': noteTitle};

    var hasTitle    = (noteTitle !== "");
    var hasText     = (noteText !== "");
    var hasAudio    = this.eid !== 0;
    var hasLocation = false;

    if(!hasTitle && !hasText && !hasAudio)
        return;

    // logic here to wait for both location and audio to complete.
    if(!this.eid) {
        // we did not have a recording, so generate some event info.
        this.eid           = pg.uniqueEventID();
    }
    
    if(this.data.addLocation) {
        pgLocation.getCurrentLocation(posCB.bind(this));
    }
    else {
        addEvent.call(this);
    }
    return false;
    
    function posCB(path) {
        if(typeof(path)==="string") {
            // xxx handle error
        }
        else if(path.length) {
            var lat = path[path.length-1][1];
            var lng = path[path.length-1][2];
            var alt = path[path.length-1][3];
            eventData.location = [[pgUtil.getCurrentTime(), lat, lng, alt]];
            hasLocation = true;
        }
        addEvent.call(this);
    }

    function addEvent() {
        // if we get here, eventData has been updated by audio and location data
        if(hasText) {
            eventData.text = noteText;
        }
        if(hasAudio) {
            eventData.audio = pgAudio.getAudioExt();
        }
        
        // this is called when other callbacks have completed
        pg.addNewEvents({ id:       this.eid,
                          time:     pgUtil.getCurrentTime(),
                          category: pg.category(),
                          page:     pg.page(),
                          type:     "text",
                          data:     eventData
            }, true);

        // erase the data, since it has been submitted.
        this.eid = 0;
        this.data.lastText = {'title': "", 'text': ""};
        this.updateText();
        this.updateAudio();

        if(this.data.showConfirmation) {
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
        syncSoon();
    }
};


Note.prototype.updateAudio = function() {
    if(UI.note.eid)
        $("#note_audio").show();
    else
        $("#note_audio").hide();
};

Note.prototype.playRecorded = function() {
    var fn = pgAudio.getRecordFilename(this.eid);
    pgAudio.playRecorded(this.eid, fn);
};
Note.prototype.deleteRecorded = function() {
    if(!this.recording) {
        UI.note.eid=0;
        UI.note.updateAudio();
    }
};

Note.prototype.getNoteTitle = function() {
    return $("#noteTitle").val();
};

Note.prototype.getNoteText = function() {
    var noteText = "";
    if(this.data.addText)
        noteText = $("#noteText").val();
    //if(this.data.enhancedEditor) {
    //    this.createEnhancedEditor(true);
    //    if(tinyMCE.activeEditor.getContent({format : 'text'}) != "")
    //        noteText = tinyMCE.activeEditor.getContent({format : 'raw'});
    //}
    return noteText;
};


UI.note = new Note();
//# sourceURL=note.js
