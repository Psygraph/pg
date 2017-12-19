
function note() {
    page.call(this, "note");
    this.initialized = false;
    this.lastText = {};
    
    // audio recording
    this.recording     = false;
    this.eid           = 0;
    this.audioFilename = "";
}

note.prototype = Object.create(page.prototype);
note.prototype.constructor = note;

note.prototype.update = function(show, state) {
    var data = this.getPageData();
    if(!show) {
        var noteText = this.getNoteText();
        this.lastText[pg.category()] = {'title': $("#noteTitle").val(),
                                        'text':  noteText};
        if(this.recording)
            this.annotate(); // stop recording if we leave the page.
        if(tinyMCE.activeEditor)
            tinyMCE.activeEditor.selection.collapse();
        return {lastText: this.lastText};
    }
    if(typeof(state)!="undefined") {
        this.lastText = state.lastText;
    }
    else { // set an initial value
        this.lastText[pg.category()] = {'title': "Title",
                                        'text':  "Text"};
    }
    if(!this.initialized) {
        $('#note_stop').hide().prop('disabled', true);
        $('#note_start').show().prop('disabled', false);
        this.initialized = true;
    }
    this.createEnhancedEditor(data.enhancedEditor);
    this.updateText();
    this.updateAudio();
    this.resize();
};

note.prototype.resize = function() {
    page.prototype.resize.call(this, false);
    var header = this.headerHeight();
    var win    = getWindowDims();
    var height = win.height - (header);
    var titleHeight  = $("#noteTitleDiv").outerHeight(true);
    var buttonHeight = $("#note_submit").outerHeight(true);
    var magic = 32;
    $("#noteTextContainer").outerHeight(height - (titleHeight+buttonHeight+magic));
    var width  = win.width;

    $("#"+this.name+"_page .content").css({
            position: "absolute",
                'top':    header, 
                'height': height,
                'width':  width+"px"
                });
};

note.prototype.settings = function() {
    if(arguments.length) {
        var data = this.getPageData();
        $("#note_addLocation").prop("checked", data['addLocation']).checkboxradio("refresh");
        $("#note_showConfirmation").prop("checked", data['showConfirmation']).checkboxradio("refresh");
        $("#note_enhancedEditor").prop("checked", data['enhancedEditor']).checkboxradio("refresh");
        UI.settings.pageCreate();
    }
    else {
        return { 
            addLocation:      $("#note_addLocation")[0].checked,
            showConfirmation: $("#note_showConfirmation")[0].checked,
            enhancedEditor:   $("#note_enhancedEditor")[0].checked
        };
    }
};

note.prototype.createEnhancedEditor = function(show) {
    if(show) {
        if(tinyMCE.activeEditor)
            return; // already created
        var win = getWindowDims();
        var height = 320; // win.height/2,
        var mce_opts = {
            selector: 'textarea',
            menubar: false,
            resize: false,
            min_height: height,
            max_height: height,
            height: height,
            autoresize_min_height: height,
            autoresize_max_height: height,
            plugins: [
                'advlist autoresize charmap colorpicker hr link', //fullscreen 
                'lists spellchecker wordcount'
            ],
            toolbar: 'undo redo | insert | styleselect', // fullscreen | cut copy paste
            content_css: 'css/content.css'
        };
        tinymce.init(mce_opts);
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
        if(! tinyMCE.activeEditor)
            return; // already destroyed
        tinymce.remove(tinyMCE.activeEditor);
    }
};

note.prototype.updateText = function() {
    var s = {'title':"", 'text':""};
    if(typeof(this.lastText[pg.category()])!="undefined") {
        s = this.lastText[pg.category()];
    }
    $("#noteTitle").val(s.title);
    var data = this.getPageData();
    if(data.enhancedEditor)
        tinyMCE.activeEditor.setContent(s.text, {format : 'raw'});
    else
        $("#noteText").val(s.text);
};

note.prototype.getPageData = function() {
    var data = pg.getPageData("note", pg.category());
    if(! ('showConfirmation' in data))
        data.showConfirmation = true;
    if(! ('addLocation' in data))
        data.addLocation      = false;
    if(! ('enhancedEditor' in data))
        data.enhancedEditor   = false;
    return data;
};

note.prototype.lever = function(arg) {
    if(arg=="right") {
        this.annotate();
    }
    else if(arg=="left") {
        this.submit();
    }
};

note.prototype.audioFileUploaded = function(filename) {
    var data = this.getPageData();
    if(data.showConfirmation)
        showAlert("Uploaded file: "+filename+", removed from local file system.");
};

note.prototype.annotate = function() {
    // get audio recording permissions
    pgAudio.getRecordPermissions();

    if(this.recording) {
        pgAudio.stopRecord();
        // hide the stop button
        $('#note_stop').hide().prop('disabled', true);
        $('#note_start').show().prop('disabled', false);
        return false;
    }
    else if(UI.note.eid != 0) {
        showAlert("You must delete the current audio attachment before recording another attachment");
        return false;
    }
    // toggle the status
    $('#note_start').hide().prop('disabled', true);
    $('#note_stop').show().prop('disabled', false);

    // logic here to wait for audio to complete.
    this.recording      = true;
    this.eid            = pg.uniqueEventID();
    this.audioFilename  = pgAudio.getRecordFilename(this.eid);
    pgAudio.record(audioCB, this.audioFilename);
    return false;

    function audioCB(success, meter) {
        if(typeof(meter)!="undefined") {
            // display metering information
            $('#note_stop').fadeTo(meter.sec, 0.4 + 0.6*meter.max);
            return;
        }
        if(success) {
            UI.note.updateAudio();
        }
        else {
            UI.note.eid=0;
        }
        $('#note_stop').css('opacity', '1');
        UI.note.recording = false;
    }
};

note.prototype.deleteAudio = function() {
    if(!this.recording) {
        UI.note.eid=0;
        UI.note.updateAudio();
    }
};

note.prototype.updateAudio = function() {
    var txt = "";
    if(UI.note.eid!=0) {
        var fn  = pgAudio.getRecordFilename(UI.note.eid);
        txt += '<div class="ui-grid-b">';
        txt += ' <div class = "ui-hide-label ui-block-a">';
        txt += '   <p>Audio:</p>';
        txt += ' </div><div class = "ui-hide-label ui-block-b">';
        txt += '   <input type="button" onclick="return pgAudio.playRecorded(\''+UI.note.eid+'\', \''+fn+'\');" value="Listen" />';
        txt += ' </div><div class = "ui-hide-label ui-block-c">';
        txt += '   <input type="button" onclick="return UI.note.deleteAudio();" value="Delete" />';
        txt += ' </div>';
        txt += '</div>';
    }
    $("#note_audio").html(txt);
    $("#note_audio input").button();
};

note.prototype.getNoteText = function() {
    var data = this.getPageData();
    var noteText = "";
    if(! data.enhancedEditor) {
        noteText = $("#noteText").val();
    }
    else {
        this.createEnhancedEditor(true);
        if(tinyMCE.activeEditor.getContent({format : 'text'}) != "")
            noteText = tinyMCE.activeEditor.getContent({format : 'raw'});
    }
    return noteText;
};

note.prototype.submit = function() {
    if(this.recording) {    // wait for the user to stop recording.
        return false;
    }
    var time          = pgUtil.getCurrentTime();
    var noteTitle     = $("#noteTitle").val();
    var noteText      = this.getNoteText();
    var eventData     = {'title': noteTitle};
    
    var hasText     = (noteText != "");
    var hasAudio    = this.eid != 0;
    var hasLocation = false;

    // logic here to wait for both location and audio to complete.
    if(!this.eid) {
        // we did not have a recording, so generate some event info.
        this.eid           = pg.uniqueEventID();
    }
    
    var data = this.getPageData();
    if(data.addLocation) {
        pgLocation.getCurrentLocation(posCB.bind(this));
    }
    else {
        addEvent.call(this);
    }
    return false;
    
    function posCB(path) {
        if(typeof(path)=="string") {
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
        this.lastText[pg.category()] = {'title': "", 'text': ""};
        this.updateText();
        this.updateAudio();
        
        var includedData = [];
        if(hasText)
            includedData.push("text");
        if(hasAudio)
            includedData.push("audio");
        if(hasLocation)
            includedData.push("location");
        var s = "<p>Data included: ";
        if(hasText || hasAudio || hasLocation)
            s += includedData.join();
        else
            s += "none";
        s += ".</p>";
        if(data.showConfirmation)
            showDialog( {'title': "Note created", true: "OK"},
                        s, function(ok){} );
        syncSoon();
    }
};

UI.note = new note();
//# sourceURL=note.js
