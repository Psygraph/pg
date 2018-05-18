if(pgUtil.isWebBrowser()) "use strict";


var pgFile = {
    tempEntry:    "",
    tempURL:      "",
    appEntry:     "",
    appURL:       "",
    persistEntry: "",
    persistURL:   "",
    soundEntry:   "",
    soundURL:     "",
    mediaEntry:   "",
    mediaURL:     "",
    pending:      {},
    useWebFS:     pgUtil.isWebBrowser(),
    initialized:  false,

    init: function(callback) {
        callback = typeof(callback)!=="undefined" ? callback : function(){};
        if(pgFile.initialized) {
            callback(true);
        }
        else {
            pgFile.initialized = true;
            pgFile.useWebFS = pgUtil.isWebBrowser();
            if(pgUtil.isWebBrowser()) {
                pgFile.appURL      = window.location;
                pgFile.tempURL     = window.location;
                pgFile.persistURL  = window.location;
                pgFile.mediaURL    = window.location + "/media/";
                pgFile.initialized = true;
                callback(true);
            }
            else {
                // these two do not seem necessary
                //window.requestFileSystem(LocalFileSystem.TEMPORARY,  0, fsSuccess, fsFail);
                //window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, fsSuccess, fsFail);
                window.resolveLocalFileSystemURL(cordova.file.cacheDirectory, onFSTemp, fsFail);
                if(device.platform==="iOS") // use the documents directory for iTunes sync
                    window.resolveLocalFileSystemURL(cordova.file.documentsDirectory, onFSPersist, persistFail);
                else
                    window.resolveLocalFileSystemURL(cordova.file.dataDirectory, onFSPersist, persistFail);
                // this call will invoke the callback.
                window.resolveLocalFileSystemURL(cordova.file.applicationDirectory, onFSApp, fsFail);
            }
        }
        function onFSApp(fileSystem) {
            pgFile.appEntry = fileSystem;
            pgFile.appURL   = fileSystem.toURL().replace(/\/$/, "");
            window.resolveLocalFileSystemURL(pgFile.appURL+"/www/media", success, fail);
            function success(fileSystem) {
                pgFile.mediaEntry = fileSystem;
                pgFile.mediaURL   = fileSystem.toURL().replace(/\/$/, "");
                callback(true);
            }
            function fail(err) {
                pgUI.showLog("Could not open media file system");
                callback(false);
            }
        }
        function onFSTemp(fileSystem) {
            pgFile.tempEntry = fileSystem;
            pgFile.tempURL   = fileSystem.toURL().replace(/\/$/, "");
        }
        function fsSuccess(fileSystem) {
            pgUI.showLog("Got fileSystem: " +fileSystem.toString());
        }
        function fsFail(err) {
            pgUI.showLog("Failed fileSystem: " +err.toString());
        }
        function onFSPersist(fileSystem) {
            pgFile.persistEntry = fileSystem;
            pgFile.persistURL   = fileSystem.toURL().replace(/\/$/, "");
            pgUI.showLog("Got persistent FS");

            //var soundDir;
            if(device.platform==="iOS") {
                //soundDir = cordova.file.dataDirectory.replace("/NoCloud","");
                //window.resolveLocalFileSystemURL(soundDir, onFSSound, soundFail);
                pgFile.soundEntry = pgFile.persistEntry;
                pgFile.soundURL   = pgFile.persistURL;
            }
            else {
                //soundDir = cordova.file.dataDirectory;
                //window.resolveLocalFileSystemURL(soundDir, onFSSound, soundFail);
                pgFile.soundEntry = pgFile.persistEntry;
                pgFile.soundURL   = pgFile.persistURL;
            }
            pgFile.initialized = true;
        }
        function persistFail(err) {
            pgUI.showLog("Could not get persistent fileSystem");
            pgFile.initialized = false;
        }
        /*
        function onFSSound(fileSystem) {
            //fileSystem.getDirectory('Sounds', { create: true },
            //                        function(subDirEntry) {
            //                            pgFile.soundEntry = subDirEntry;
            //                            pgFile.soundURL   = subDirEntry.toURL().replace(/\/$/, "");
            //                            showLog("Created Sounds directory: "+pgFile.soundURL);
            //                        },
            //                        function() {
            pgFile.soundEntry = fileSystem;
            pgFile.soundURL   = fileSystem.toURL().replace(/\/$/, "");
            //pgUI.showError("Could not create Sounds directory.");
            //                        }
            //);
        }
        function soundFail(err) {
            pgUI.showLog("Could not get Sounds fileSystem");
        }
        */
    },
    getAppURL: function() {return pgFile.appURL;},
    getMediaURL: function() {return pgFile.mediaURL;},
    getTempURL: function() {return pgFile.tempURL;},
    getPersistURL: function() {return pgFile.persistURL;},
    //getSoundURL: function() {return pgFile.soundURL;},

    saveDataURI: function(category, data, callback) {
        callback = typeof(callback)!=="undefined" ? callback : function(){};
        if(pgUtil.isWebBrowser())
            return data; // we cannot save files using a web browser except on chrome.
        // decode base64 data:audio/mpeg;base64,
        var mimeEnd     = data.indexOf(";base64,");
        var mime        = data.substring(5, mimeEnd);
        var filename    = "pg_" + category;
        if(mime==="audio/wav") {
            filename += ".wav";
        }
        else if(mime==="audio/mpeg") {
            filename += ".mp3";
        }
        else if(mime==="text/xml" || mime==="application/xml") {
            filename += ".xml";
        }
        else if(mime==="text/css") {
            filename += ".css";
        }
        else {
            pgUI.showAlert("Unknown file type: "+mime, "Error");
            callback(false);
	    return "Unknown file type: "+mime;
        }
        var decodedData = pgUtil.base64.decodeArrayBuffer(data.substring(mimeEnd+8));
        pgFile.writeBinaryFile(filename, decodedData, callback);
        return pgFile.getPersistURL() +"/"+ filename;
    },

    existFile: function(filename, callback, dir) {
        callback = typeof(callback)!=="undefined" ? callback : function(){};
        dir = typeof(dir) !== "undefined" ? dir : "persist";
        if(pgFile.useWebFS) {
            for (var i = 0; i < localStorage.length; i++){
                if ( localStorage.key(i) === filename ) {
                    callback(true);
                    return;
                }
            }
            callback(false);
        }
        else {
            if(dir==="temp")
                pgFile.tempEntry.getFile(filename, {create: false, exclusive: false}, success, fail);
            else if(dir==="sound")
                pgFile.soundEntry.getFile(filename, {create: false, exclusive: false}, success, fail);
            else if(dir==="persist")
                pgFile.persistEntry.getFile(filename, {create: false, exclusive: false}, success, fail);
        }
        function success(entry) {
            callback(true);
        }
        function fail() {
            callback(false);
        }
    },
    deleteFile: function(filename) {
        if(pgFile.useWebFS) {
            localStorage.removeItem(filename);
        }
        else {
            pgFile.persistEntry.getFile(filename, {create: false, exclusive: true}, remove);
        }
        function remove(entry) {
            entry.remove();
        }
    },
    deleteAllFiles: function() {
        pgFile.deleteFile("com.psygraph");
        pgFile.deleteFile("com.psygraph.pg");
        pgFile.deleteFile("com.psygraph.events");
        pgFile.deleteFile("com.psygraph.state");
        pgFile.deleteFile("com.psygraph.lastError");
        if(pgFile.useWebFS) {
            for (var i = 0; i < localStorage.length; i++){
                localStorage.removeItem( localStorage.key(i) );
            }
        }
        else {
            pgFile.forAllFiles("persist", localDelete);
         }
        function localDelete(parent, entry, promise) {
            entry.remove();
            promise.resolve();
        }
    },
    readFile: function(filename, callback, parse, ent) {
        callback = typeof(callback)!=="undefined" ? callback : function(){};
        parse    = typeof(parse)!=="undefined" ? parse : true;
        ent      = typeof(ent)!=="undefined" ? ent : pgFile.persistEntry;
        if(pgFile.useWebFS) {
            var data = localStorage.getItem(filename);
            if(data && data.length) {
                pgUI.showLog("Reading file: " + filename +" size: "+data.length);
                var s = "";
                try {
                    s = JSON.parse(data);
                }
                catch(err) {}
                if(s==="")
                    callback(false, s);
                else
                    callback(true, s);
            }
            else {
                fail();
            }
        }
        else {
            ent.getFile(filename, {create: false, exclusive: false}, success, fail);
        }
        function success(ent) {
            ent.file(win, fail);
            function win(file) {
                var reader = new FileReader();
                reader.onloadend = function (evt) {
                    pgUI.showLog("read success: "+filename);
                    var s = "";
                    try {
                        if(parse)
                            s = JSON.parse(evt.target.result);
                        else
                            s = evt.target.result
                    }
                    catch (err) {
                        pgUI.showError(err.message);
                    }
                    if(s==="")
                        callback(false, s);
                    else
                        callback(true, s);
                };
                reader.readAsText(file);
            }
        }
        function fail(evt) {
            pgUI.showLog("Could not read file: "+filename);
            callback(false, null);
        }
    },
    writeFile: function(filename, struct, callback, log) {
        log = typeof(log)!=="undefined" ? log : true;
        var data = JSON.stringify(struct);
        pgFile.writeData(filename, data, callback, log);
    },
    writeData: function(filename, data, callback, log) {
        log = typeof(log)!=="undefined" ? log : true;
        callback = typeof(callback)!=="undefined" ? callback : function(){};
        //if(filename.indexOf("com.")==0)
        //    filename = pgFile.getPersistURL() +"/" +filename;
        if(pgFile.useWebFS) {
            if(log)
                pgUI.showLog("Writing file: " + filename +" size: "+data.length);
            var oldData = localStorage.getItem(filename);
            localStorage.removeItem(filename);
            var len = localStorage.length;
            try {
                localStorage.setItem(filename, data);
            }
            catch (err) {
                if(log) {
                    pgUI.showLog(err);
                    pgUI.showDialog({title: "Storage Error", true: "OK"},
                        "<p>" + err.message + "</p>" +
                        "<p>Try deleting events to increase available space.</p>",
                        callback.bind(false, ""));
                }
                return;
            }
            var s = (len < localStorage.length);
            if(!s)
                localStorage.setItem(filename, oldData);
            callback(s, "");
        }
        else {
            pgFile.persistEntry.getFile(filename, {create: true, exclusive: false}, success, fail1);
        }
        function success(ent) {
            ent.createWriter(win1, fail1);
            function win1(writer) {
                writer.onwrite = function(evt) {
                    if(log)
                        pgUI.showLog("write success: "+filename);
                    callback(true, ent.toURL());
                };
                writer.onerror = function(evt) {
                    if(log)
                        pgUI.showWarn("Write failed: " +filename +", " + evt.toString());
                    callback(false, "");
                };
                writer.write(data);
            }
        }
        function fail1(evt) {
            if(log)
                pgUI.showWarn("write fail: "+filename);
            callback(false, "");
        }
    },
    writeBinaryFile: function(filename, data, callback) { // pass in an ArrayBuffer
        callback = typeof(callback)!=="undefined" ? callback : function(){};
        pgFile.persistEntry.getFile(filename, {create: true, exclusive: false}, success.bind(this), fail.bind(this));
        function success(ent) {
            ent.createWriter(win, fail);
            function win(writer) {
                writer.onwrite = function(evt) {
                    pgUI.showLog("write success: "+filename);
                    callback(true);
                };
                writer.write(data);
            }
        }
        function fail(evt) {
            pgUI.showLog("write fail: "+filename);
            callback(false);
        }
    },

    getRecordingPath: function(callback, filename) {
        pgFile.soundEntry.getFile(filename, {create: true, exclusive: false }, gotFile.bind(this,true), gotFile.bind(this,false));
        function gotFile(success, fileEntry) {
            if(success) {
                callback(fileEntry.toURL());
            }
            else
                callback();
        }
    },
    
    basename: function(str) {
        var base = new String(str).substring(str.lastIndexOf('/') + 1);
        //if(base.lastIndexOf(".") != -1)
        //    base = base.substring(0, base.lastIndexOf("."));
        return base;
    },
    // In fact, we create a temporary file in the temp directory
    copySoundFile: function(src, callback, fn) {
        var tmpFile = "temp_" + fn;
        pgFile.existFile(tmpFile, cb.bind(this, tmpFile), "temp");
        function cb(tmpFile, success) {
            if(success) {
                callback(true, pgFile.getTempURL() +"/" +tmpFile);
                return;
            }
            if(src.indexOf("http")===0) {
                var fileTransfer = new FileTransfer();
                var fileURL = pgFile.getTempURL() +"/" +tmpFile;
                fileTransfer.download(
                    src,
                    fileURL,
                    function(ent) {
                        callback(true, ent.toURL());
                    },
                    function(err) {
                        pgUI.showLog("Error copying temp file("+src+"): " + err.source);
                        callback(false, src);
                    }
                );
            }
            else {
                pgFile.tempEntry.getFile(tmpFile, {create: false, exclusive: true}, remove, create);
             }
        }
        function remove(entry) {
            // we should not end up here, since if the file existed, we would have played it.
            entry.remove(create, fail);
        }
        function create() {
            pgFile.soundEntry.getFile(src, {create: false, exclusive: false}, success, fail);
            function success(srcEntry) {
                srcEntry.copyTo(pgFile.tempEntry, tmpFile, s2, fail);
                function s2(ent) {
                    callback(true, ent.toURL());
                }
            }
        }
        function fail(err) {
            pgUI.showLog("Error copying temp file("+src+"): " + err.message);
            callback(false);
        }
    },
    
    forAllFiles: function(dir, callback, doneCB) {
        doneCB = typeof(doneCB)!=="undefined" ? doneCB : function(){};
        var entry;
        if(dir==="persist")
            entry = pgFile.persistEntry;
        else if(dir==="sound")
            entry = pgFile.soundEntry;
        var directoryReader = entry.createReader();
        // Get a list of all the entries in the directory
        directoryReader.readEntries(cb,fail);

        function cb(entries) {
            // This is too complicated, but its fun.  We chain together bound function calls in a for-loop,
            // and link them together with deferred promises.  There must be a design pattern in there somewhere.
            var lastCB = doneCB;
            for (var i=0; i<entries.length; i++) {
                var promise = $.Deferred();
                $.when(promise).then(lastCB);
                lastCB = callback.bind(this, entry, entries[i], promise);
            }
            lastCB();
        }
        function fail(error) {
            pgUI.showError("Failed to read entry: " + error.message);
            doneCB();
        }
    },

    listDir: function(dir, ext, callback) {
        pgFile.appEntry.getDirectory('www/media', { create: false }, createReader);
        function createReader(dirEnt) {
            // Get a list of all the entries in the directory
            var dirReader = dirEnt.createReader();
            dirReader.readEntries(cb,fail);
        }
        function cb(entries) {
            var files = [];
            for (var i=0; i<entries.length; i++) {
                var fn = entries[i].name;
                var fnExt = pgFile.getFileExt(fn);
                if(ext==="*" || ext===fnExt)
                    files[files.length] = fn;
            }
            callback(files);
        }
        function fail(error) {
            pgUI.showLog("Failed to read directory: " + dir);
            callback([]);
        }
    },

    // when we change the event IDs to positive numbers, they have the potential to be uploaded.
    renameFileIDs: function(ids) {
        if(pgUtil.isWebBrowser()) {
            for(var i=0; i<ids.length; i++) {
                var oldFN = pgAudio.getRecordFilename(ids[i][0]);
                var newFN = pgAudio.getRecordFilename(ids[i][1]);
                if(pgFile.pending[oldFN]) {
                    var blob = pgFile.pending[oldFN];
                    pgFile.uploadAudioFile(newFN, blob, pgFile.unscheduleUpload.bind(this, oldFN));
                }
            }
        }
        else {
            pgFile.forAllFiles("persist", rename);
        }
        function rename(parent, entry, promise) {
            if(parent) {
                for(var i=0; i<ids.length; i++) {
                    var oldFN = pgAudio.getRecordFilename(ids[i][0]);
                    if(entry.name === oldFN) {
                        var newFN = pgAudio.getRecordFilename(ids[i][1]);
                        entry.moveTo(parent, newFN, success, fail);
                        break;
                    }
                }
            }
            promise.resolve();
            function success() {
                pgUI.showLog("Moved file: " +oldFN+ ", "+ newFN);
                syncSoon(true);
            }
            function fail(){
                pgUI.showLog("Didn't move file: " +oldFN+ ", "+ newFN);
            }
        }
    },

    // Delete all files
    deleteAudioFiles: function() {
        if(pgUtil.isWebBrowser())
            return;
        pgFile.forAllFiles("persist", pgFile.localDeleteFile.bind(this,false) );
        pgFile.forAllFiles("sound", pgFile.localDeleteFile.bind(this,true) );
    },
    // Delete a (recorded) single file.
    deleteAudioFile: function(filename, promise) {
        if(typeof(promise)!=="undefined")
            promise.resolve();
        if(pgUtil.isWebBrowser())
            return;
        pgFile.persistEntry.getFile(filename, {create:false},
                                    pgFile.localDeleteFile.bind(this, pgFile.persistEntry)
                                   );
    },
    localDeleteFile: function(deleteAll, parent, entry) {
        var filename = entry.name;
        if(deleteAll || pgAudio.isRecordedFile(filename)) {
            entry.remove();
        }
    },
    scheduleUpload: function(filename, blob) {
        pgFile.pending[filename] = blob;
    },
    unscheduleUpload: function(filename, success) {
        if(success)
            delete pgFile.pending[filename];
    },

    uploadAudioFile: function(filename, blob, callback) {
        var formData = new FormData();
        var eventInfo = pgAudio.eventInfoForFile(filename);
        formData.append('title',     eventInfo.title);
        formData.append('text',      eventInfo.text);
        formData.append('category',  eventInfo.category);
        formData.append('location',  eventInfo.location);
        formData.append('eid',       "" + eventInfo.id);
        formData.append('action',    "uploadFile");
        formData.append('fileKey',   "mediaFile");
        formData.append('filename',  filename);
        formData.append('username',  pg.username);
        formData.append('cert',      pg.cert);
        formData.append('mediaFile', blob, filename);

        var postURL = pg.getMediaServerURL();
        var xhr = new XMLHttpRequest();
        xhr.addEventListener("load",  successCB, false);
        xhr.addEventListener("error", failCB, false);
        xhr.open('POST', postURL, true);
        //xhr.setRequestHeader('Content-Type', "application/json");
        // mime type: "audio/mp4";
        xhr.send(formData);  // multipart/form-data
        function successCB(evt) {
            pgUI.showLog("Response: " + evt.target.status + ", " + evt.target.response);
            callback(true);
        }
        function failCB(evt) {
            pgUI.showLog("Error: " + evt.target.status);
            callback(false);
        }
    },
    // Upload all audio files.
    getAudioFilenames: function(callback) {
        var names = [];
        pgFile.forAllFiles("persist", getFilename, finished);
        function getFilename(parent, entry, promise) {
            var fileURL = entry.toURL();
            var filename = entry.name;
            if(pgAudio.isRecordedFile(filename) ) {
                names.push(fileURL);
            }
            promise.resolve();
        }
        function finished() {
            callback(names);
        }
    },
    // Upload all audio files.
    uploadAudioFiles: function(force, callback) {
        callback = typeof(callback)!=="undefined" ? callback : function(){};
        if(pgUtil.isWebBrowser()) {
            callback();
            return;
        }
        if(!force && !pg.canUploadFiles()) {
            callback();
            return;
        }
        pgFile.forAllFiles("persist", postFile, callback);
        function postFile(parent, entry, promise) {
            var postURL = pg.getMediaServerURL();
            var fileURL = entry.toURL();
            var filename = entry.name;
            if(! pgAudio.isRecordedFile(filename) ) {
                promise.resolve();
                return;
            }
            else {
                if(filename.indexOf("-") !== -1) {
                    // ID not resolved yet: wait.
                    promise.resolve();
                    return;
                }
                var eventInfo = pgAudio.eventInfoForFile(filename);
                if(!eventInfo) {
                    // No event for this file, we should probably delete it.
                    promise.resolve();
                    return;
                }
                var options = new FileUploadOptions();
                options.fileKey     = "mediaFile";
                options.fileName    = filename;
                var ext = pgFile.getFileExt(filename);
                options.mimeType    = "audio/" + ext;
                options.chunkedMode = false;
                options.headers     = {Connection: "close"};
                options.httpMethod  = "POST";

                var params = {};
                params.filename = options.fileName.replace("pg", "pg_"+pg.username+"_");
                params.username = pg.username;
                params.cert     = pg.cert;
                params.eid      = "" + eventInfo.id;                
                params.title    = eventInfo.title;
                params.text     = eventInfo.text;
                params.category = eventInfo.category;
                params.location = eventInfo.location;
                params.action   = "uploadFile";
                options.params  = params;

                try {
                    var ft = new FileTransfer();
                    ft.upload(fileURL, encodeURI(postURL), success, fail, options);
                }
                catch (err) {
                    pgUI.showWarn("Could not upload file: " +fileURL);
                    promise.resolve();
                }
            }
            function success(r) {
                if(r.responseCode===200) {
                    if(r.response !== "" && r.response !== "OK") {
                        pgUI.showBusy(false);
                        pgUI.showAlert(r.response, "Upload Error", function(){promise.resolve();});
                        return;
                    }
                    else {
                        // xxx We should not remove uploaded files.
                        // If we don't, though, we need a mechanism to ensure that they are not uploaded twice.
                        entry.remove();
                        // xxx we should not have knowledge of the note tool in the file system layer
                        UI.note.audioFileUploaded(filename);
                        pgUI.showLog("Posted file: "+fileURL+" to: "+encodeURI(postURL));
                        pgUI.showLog("Response = " + r.response + "Sent = "     + r.bytesSent);
                    }
                }
                else {
                    pgUI.showWarn("Could not upload file: " +r.responseCode +" "+ r.response);
                }
                promise.resolve();
            }
            function fail(error) {
                pgUI.showLog("Could not upload "+fileURL+". Code = " + error.code);
                pgUI.showLog("upload error source " + error.source);
                pgUI.showLog("upload error target " + error.target);
                promise.resolve();
            }
        }
    },

    getFileName: function(path) {
        return path.split('\\').pop().split('/').pop();
    },
    getFilePath: function(path) {
        return path.substring(0, Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"))); 
    },
    getFileExt: function(path) {
        return path.split('.').pop();
    }
};
