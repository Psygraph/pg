
var pgAudio = {
    // for playing media
    player:       [],
    recorder:     null,
    alarmer:      null,
    feedback:     null,
    permCheck:    false,

    IDX_RECORDED: 0,
    IDX_RESERVED: 1,

    getAudioExt: function() {
        if(pgUtil.isWebBrowser())
            ext = "wav";
        else if(device.platform==="iOS")
            ext = "m4a"; // wav
        else if(device.platform==="Android")
            ext = "aac"; // amr
        else
            pgUI.showLog("Error: unkonwn platform");
        return ext;
    },
    getRecordFilename: function(eid, ext) {
        ext = typeof(ext)!=="undefined" ? ext : pgAudio.getAudioExt();
        eid = typeof(eid)!=="undefined" ? eid : pg.uniqueEventID();
        var audioFilename = "pg" +eid +"." +ext;
        return audioFilename;
    },
    isRecordedFile: function(src) {
        var pre = src.substr(0,2);
        var ext = pgFile.getFileExt(src).toLowerCase();
        if( pre==="pg" && (ext === "wav" || ext === "m4a" || ext === "aac"))
            return true;
        return false;
    },
    mkNiceDir: function(dir) {
        // on Mac, the audio player wants absolute directories, not file:// URL's
        if(device.platform === "iOS" && dir.slice(0,7)==="file://")
            dir = dir.slice(7);
        return dir;
    },
    eventInfoForFile: function(src) {
        var info = null;
        if(pgAudio.isRecordedFile(src)) {
            var eid = parseInt(src.substr(2,src.length-3));
            var e = pg.getEventFromID(eid);
            if(e) {
                var event = pgUtil.parseEvent(e);
                info = {};
                info.category = event.category;
                info.title    = event.data.hasOwnProperty("title") ? event.data.title : ""; 
                info.text     = event.data.hasOwnProperty("text") ? event.data.text : "";
                info.location = "";
                if(event.data.hasOwnProperty("location")) {
                    info.location = "Lat: " +event.data.location[0][1] + ", Lng: " + event.data.location[0][2];
                }
                info.id = eid;
            }
        }
        return info;
    },
    
    play: function(index, src) {
        try {
            pgAudio.player[index] = new Media(src, 
                                              pgAudio.playSuccess.bind(this,index), 
                                              pgAudio.playError.bind(this,index));
            pgAudio.player[index].setVolume('0.8');
            // Play audio
            pgAudio.player[index].play();
        }
        catch (err) {
            pgAudio.playError(index, err);
        }
    },

    playRecorded: function(id, fn) {
        if(pgUtil.isWebBrowser()) {
            var src = wpURL(id);
            if(pg.username === "") {
                pgUI.showAlert("You are not logged in, audio file access is not possible.");
            }
            var rec    = $("#record")[0];
            var recSrc = $("#recordSrc")[0];
            if(!rec.paused) {
                recSrc.src = "";
                rec.pause();
            }
            else {
                rec.onerror = function() {audioCB(false, src);};
                recSrc.src = src;
                rec.load();
                rec.play();
            }
        }
        else {
            pgFile.existFile(fn, foundLocalFile.bind(this, id, fn), "sound");
        }
        function foundLocalFile(id, fn, local) {
            if(local) { //the file was found locally
                playRecordedSrc(fn, fn);
            }
            else { // download the file
                // If we are logged in, online
                if(pg.loggedIn && pg.online) {
                    playRecordedSrc( wpURL(id), fn);
                }
                else
                    pgUI.showAlert("No local audio file for event " +id);
            }
        }
        function playRecordedSrc(src, fn) {
            if(pgAudio.player[pgAudio.IDX_RECORDED]) {
                pgAudio.stop(pgAudio.IDX_RECORDED);
            }
            else {
                pgFile.copySoundFile(src, audioCB.bind(this, fn), fn);
            }
        }
        function audioCB(fn, success, src) {
            if(!success) {
                pgUI.showAlert("Could not play audio file: " + fn);
            }
            else {
                if(pgUtil.isWebBrowser()) {
                    $("#record")[0].onerror = null;
                }
                else {
                    src = pgAudio.mkNiceDir(src);
                    pgAudio.play(pgAudio.IDX_RECORDED, src);
                }
            }
        }
        function wpURL(id) {
            var wp_url = pg.getMediaServerURL() + "?action=downloadFile";
            wp_url += "&id="       + id;
            wp_url += "&username=" + pg.username;
            wp_url += "&cert="     + pg.cert;
            //wp_url += "&filename=" + fn;
            return wp_url;
        }
    },
    
    nextPlayerIndex: function() {
        return Math.max(pgAudio.player.length, pgAudio.IDX_RESERVED);
    },

    getCategorySound: function(category, forNotification, callback) {
        //callback = typeof(callback)!="undefined" ? callback : false;
        var src = pg.getCategoryData(category).sound;
        if(!pgUtil.isWebBrowser() && src.indexOf("http") === 0) {
            // try to cache a local version.
            if(device.platform==="iOS") {
                var tempFN = pgFile.getFileName(src);
                pgFile.copySoundFile(src, foundLocalFile, tempFN);
                return;
            }
        }
        if(src.indexOf("http") !== 0 &&
           src.indexOf("file") !== 0 &&
           src.indexOf("data:") !== 0) {
            if(!pgUtil.isWebBrowser() && forNotification) {
                if (device.platform === "iOS") {
                    src = "file://media/" + src;
                }
                else {
                    src = "file://media/" + src;
                }
            }
            else {
                if(device.platform==="iOS") {
                    src = "media/" + src;
                }
                else {
                    src = pgFile.getMediaURL() + "/" + src;
                    //src = src.replace("file://", "");
                }
            }
        }
        callback(src);

        function foundLocalFile(success, url) {
            if(success) {
                if(forNotification) { // ios needs relative paths.
                    if(device.platform==="iOS")
                        url = "res:/" +pgFile.getFileName(url);
                    //else
                    //    url = "file://data/data/com.psygraph.pg/files/Sounds/" +pgFile.getFileName(url);
                }
                callback(url);
                pgUI.showLog("Created local audio file ("+url+") from ("+src+").");
            }
            else {
                pgUI.showWarn("Could not create local audio file ("+url+") from ("+src+").");
                callback(src);
            }
        }
    },
    
    alarm: function(category, shakeToStop, callback) {
        category = typeof(category)!=="undefined" ? category : pg.category();
        shakeToStop = typeof(shakeToStop)!=="undefined" ? shakeToStop : true;
        callback = typeof(callback)!=="undefined" ? callback : function(){};
        pgAudio.getCategorySound(category, false, cb.bind(this));
        function cb(src) {
            var index = -1;
            if(!pgUtil.isWebBrowser()) {
                // play the file
                index = pgAudio.nextPlayerIndex();
                pgAudio.play(index, src);
                // enable shake-to-stop
                if(shakeToStop) {
                    pgAccel.start();
                    pgAccel.onShake("audio", pgAudio.stop.bind(this,index) );
                }
            }
            // next try using HTML5
            else {
                index = 0;
                if (pgAudio.alarmer == null) {
                    pgAudio.alarmer = $("#alarm")[index];
                    pgAudio.alarmer.addEventListener("error",
                                                     function(err){pgUI.showLog("Cannot alarm: " + err.message)}
                    );
                }
                else {
                    pgAudio.alarmer.pause();
                }
                if($("#alarmSrc")[0].src !== src) {
                    $("#alarmSrc")[0].src = src;
                    pgAudio.alarmer.load();
                }
                else {
                try {
                    pgAudio.alarmer.fastSeek(0);
                } catch (err) {}
                }
                pgAudio.alarmer.volume = 0.9;
                // Play audio
                var promise = pgAudio.alarmer.play();
                if (promise !== undefined) {
                    promise.catch(function() {
                            pgUI.showLog("Cannot create alarm (audio autoplay disabled?)");
                        });
                }
            }
            callback(index);
        }
    },
    playSuccess: function(index) {
        // yay.  Must not be Monday.
        if(pgAudio.player[index]) {
            pgAudio.player[index].release();
            pgAudio.player[index] = null;
        }
    },
    playError: function(index, err) {
        // pgAudio.beep(); We are getting a weird non-error
        if(pgAudio.player[index]) {
            pgAudio.player[index].release();
            pgAudio.player[index] = null;
        }
        if(err.hasOwnProperty("message")) {
            pgUI.showLog("Error playing file: " + err.message);
        }
        else {
            pgUI.showLog("Error playing recorded file");
        }
    },
    beep: function() {
        if(navigator.notification) {
            navigator.vibrate(500);
            navigator.notification.beep(1);
        }
    },
    reward: function(correct) {
        // create audio feedback signals
        if(! pgAudio.feedback) {
            pgAudio.feedback = new Array();
            pgAudio.feedback[0] = new Audio();     // create the HTML5 audio element
            pgAudio.feedback[1] = new Audio();     // create the HTML5 audio element
            pgAudio.feedback[0].src = "media/punish.mp3";
            pgAudio.feedback[1].src = "media/reward.mp3";
        }
        var index = correct ? 1 : 0;
        pgAudio.feedback[index].play();
    },
    buzz: function() {
        if(navigator.notification) {
            navigator.vibrate(240);
        }
    },
    getRecordPermissions: function() {
        if(!pgUtil.isWebBrowser()     && 
           device.platform==="Android" &&
           !pgAudio.permCheck) {
            var permissions = cordova.plugins.permissions;
            permissions.checkPermission(permissions.RECORD_AUDIO, 
                                      checkPermissionCallback.bind(this,permissions.RECORD_AUDIO), null);
            permissions.checkPermission(permissions.WRITE_EXTERNAL_STORAGE, 
                                        checkPermissionCallback.bind(this,permissions.WRITE_EXTERNAL_STORAGE), null);
            pgAudio.permCheck = true;
        }
        return true;
        
        function checkPermissionCallback(perm, status) {
            if(!status.hasPermission) {
                permissions.requestPermission(
                    perm,
                    function(status) {
                        if(!status.hasPermission)
                            errorCallback(perm);
                    },
                    errorCallback.bind(this,perm));
            }
        }
        function errorCallback(perm) {
            pgUI.showWarn('Audio permission not turned on');
        }
    },
    record: function(callback, filename) {
        if(pgAudio.recorder) {
            pgUI.showAlert("You can only record one thing at a time", "Error");
            callback(false);
            return;
        }
        if(!pgUtil.isWebBrowser()) {
            pgFile.getRecordingPath(gotPath.bind(this), filename);
            function gotPath(path) {
                if(!path) {
                    if(pgAudio.recorder) {
                        pgAudio.recorder.release();
                        pgAudio.recorder = null;
                    }
                    pgUI.showLog('Recording file error');
                }
                else {
                    path = pgAudio.mkNiceDir(path);
                    pgUI.showLog("Recording filename: " + path);
                    // Record audio
                    pgAudio.recorder = new Media(path, deviceSuccess.bind(this), deviceFail.bind(this));
                    pgAudio.recorder.startRecord();
                    recordCallback(callback, 200);
                }
            }
        }
        else {
            navigator.getUserMedia = (navigator.getUserMedia ||
                                      navigator.webkitGetUserMedia || 
                                      navigator.mozGetUserMedia ||
                                      navigator.mediaDevices.getUserMedia);
            
            if(!navigator.getUserMedia) {
                pgUI.showAlert('Recording unavailable on this browser.');
                return callback(false);
            }
            navigator.getUserMedia( {audio:true, video: false}, 
                                    webSuccess.bind(this, callback), 
                                    webFail.bind(this, callback) );
        }
        
        function webSuccess(callback, stream) {        
            var context = window.AudioContext || window.webkitAudioContext;
            pgAudio.context  = new context();
            pgAudio.mediaStreamSource = pgAudio.context.createMediaStreamSource(stream);
            
            pgRecorder.init(pgAudio.context, filename, callback);
            pgAudio.recorder       = pgRecorder;
            pgRecorder.numChannels = 1;
            pgRecorder.sampleRate  = 44100;
            pgRecorder.record(pgAudio.mediaStreamSource, pgAudio.context.destination);
	        recordCallback(callback, 200);
        }
        function webFail(callback, error) {
            pgUI.showLog('Recording failed (error code ' + error.code + ')');
            callback(false);
        }
        function deviceSuccess(e){
            callback(true);
        }
        function deviceFail(e){
            pgUI.showError("Recording failed: "+JSON.stringify(e));
            callback(false);
        }
	    // Periodically make callbacks with amplitude information.
	    function recordCallback(callback, ms) {
	        if(pgAudio.recorder) {
		        pgAudio.recorder.getCurrentAmplitude(success, error);
	        }
            function success(power) {
		        callback(true, {'max': power, 'sec': ms/1000});
		        setTimeout(function(){recordCallback(callback,ms);}, ms);
            }
            function error(err) {
                pgUI.showLog(err);
            }
	    }
    },
    
    stop: function(index) {
        if(index===-1) {
            for(var j=0; j<pgAudio.player.length; j++) {
                stopIndex(j);
            }
        }
        else
            stopIndex(index);
        // cleanup array if its empty
        for(var j=0; j<pgAudio.player.length; j++) {
            if(pgAudio.player[j] != null)
                return;
        }
        pgAudio.player = [];
        function stopIndex(i) {
            if(pgAudio.player[i]) {
                pgAudio.player[i].stop();
                pgAudio.player[i].release();
                pgAudio.player[i] = null;
            }
        }
    },
    stopAlarm: function(index) {
        if(index===0) {
            pgAudio.alarmer.pause();
            //pgAudio.alarmer = null;
        }
        else {
            pgAudio.stop(index);
        }
    },
    stopRecord: function() {
        if(pgAudio.recorder) {
            if(!pgUtil.isWebBrowser()) {
                pgAudio.recorder.stopRecord();
                pgAudio.recorder.release();
            }
            else {
                var data = pgRecorder.stopRecord();
                var rawData = new Uint8Array(data.buffer);
                $("#recordSrc")[0].src = pgRecorder.getURI(rawData);
                $("#record")[0].load();
                $("#record")[0].play();
                var blob = new Blob([rawData], {type: "audio/wav"});
                pgFile.scheduleUpload(pgAudio.recorder.filename, blob);
                pgRecorder.release();
                pgRecorder.callback(true);
            }
            pgAudio.recorder = null;
            pgUI.showLog("Finished recording");
        }
    }
};

var pgRecorder = {
    bufferLen   : 4096,
    recBuffers  : [],
    sampleRate  : 44100,
    numChannels : 1,
    filename    : "",
    source      : null,
    maxPower    : 0,

    init: function(context, fn, cb) {
        pgRecorder.release();
        pgRecorder.filename = fn;
        pgRecorder.callback = cb;
        pgRecorder.node = context.createScriptProcessor(pgRecorder.bufferLen, 
                                                        pgRecorder.numChannels, 
                                                        pgRecorder.numChannels);
        pgRecorder.node.onaudioprocess = function(e) {
            for(var i=0; i<pgRecorder.numChannels; i++) {
                pgRecorder.recBuffers[i].push(e.inputBuffer.getChannelData(i));
            }
            var max = e.inputBuffer.getChannelData(0).reduce(function(a, b) {
                    return Math.max(a, b);
                });
            pgRecorder.maxPower = Math.max(max, pgRecorder.maxPower);
        };
    },
    
    getCurrentAmplitude: function(callback) {
        callback(pgRecorder.maxPower);
        pgRecorder.maxPower = 0;
    },
    record: function(source, dest) {
        pgRecorder.source = source;
        pgRecorder.source.connect(pgRecorder.node);
        pgRecorder.node.connect(dest);
    },
    stopRecord: function() {
        pgRecorder.source.disconnect(pgRecorder.node);
        pgRecorder.node.disconnect();
        var buffers = [];
        for(var i=0; i<pgRecorder.numChannels; i++)
            buffers[i] = pgRecorder.mergeBuffers(pgRecorder.recBuffers[i]);
        var interleaved = pgRecorder.interleave(buffers);
        var data = pgRecorder.encodeWAV(interleaved);
        return data;
    },
    release: function() {
        pgRecorder.recBuffers = new Array();
        for(var i=0; i<pgRecorder.numChannels; i++)
            pgRecorder.recBuffers[i] = new Array();
    },
    mergeBuffers: function(buffers) {
        var recLength = 0;
        for (var i = 0; i < buffers.length; i++)
            recLength += buffers[i].length;
        var result = new Float32Array(recLength);
        var offset = 0;
        for (var i = 0; i < buffers.length; i++){
            result.set(buffers[i], offset);
            offset += buffers[i].length;
        }
        return result;
    },
    interleave: function(inputBuffers) {
        var length = 0;
        for(var i=0; i<inputBuffers.length; i++)
            length += inputBuffers[i].length;
        var result = new Float32Array(length);
        var index = 0;
        var inputIndex = 0;
        while (index < length) {
            for(var i=0; i<inputBuffers.length; i++)
                result[index++] = inputBuffers[i][inputIndex];
            inputIndex++;
        }
        return result;
    },
    
    encodeWAV: function(samples) {
        var buffer = new ArrayBuffer(44 + samples.length * 2 * pgRecorder.numChannels);
        var view = new DataView(buffer);
        
        writeString(view, 0, 'RIFF');                        // RIFF identifier
        view.setUint32(4, 32 + samples.length * 2, true);    // file length
        writeString(view, 8, 'WAVE');                        // RIFF type
        writeString(view, 12, 'fmt ');                       // format chunk identifier
        view.setUint32(16, 16, true);                        // format chunk length
        view.setUint16(20, 1, true);                         // sample format (raw)
        view.setUint16(22, pgRecorder.numChannels, true);    // channel count
        view.setUint32(24, pgRecorder.sampleRate, true);     //sample rate
        view.setUint32(28, pgRecorder.sampleRate *pgRecorder.numChannels*2, true); // byte rate (sample rate * block align)
        view.setUint16(32, pgRecorder.numChannels*2, true);  // block align (channel count * bytes per sample)
        view.setUint16(34, 16, true);                        // bits per sample
        writeString(view, 36, 'data');                       // data chunk identifier
        view.setUint32(40, samples.length * 2, true);        // data chunk length */
        floatTo16BitPCM(view, 44, samples);
        return view;

        function floatTo16BitPCM(output, offset, input){
            for (var i = 0; i < input.length; i++, offset+=2){
                var s = Math.max(-1, Math.min(1, input[i]));
                output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            }
        }
        function writeString(view, offset, string){
            for (var i = 0; i < string.length; i++){
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        }
    },
    getURI: function (samples) {
        var encData = pgUtil.base64.encode(samples);
        return 'data:audio/wav;base64,' +encData;
    }
    
};

