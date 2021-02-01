import {pgUtil, pgDebug} from './util';
import {pg, PG} from './pg';
import * as $ from 'jquery';

export class PGFile {
    tempEntry: any = '';
    appEntry: any = '';
    persistEntry: any = '';
    soundEntry: any = '';
    mediaEntry: any = '';
    pending = {};
    useWebFS = false;
    hex_chr = '0123456789abcdef'.split('');
    base64 = null;
    
    constructor() {
        pgDebug.writeLogCB = this.writeFile.bind(this);
        this.base64 = new Base64();
    }
    
    init() {
        return new Promise(resolver.bind(this));
        function resolver(resolve, reject) {
            pg.deleteAudioFileCB = pgFile.deleteAudioFile;
            pgFile.useWebFS = pgUtil.isWebBrowser;
            if (pgUtil.isWebBrowser) {
                pgUtil.appURL = window.location.origin;
                pgUtil.tempURL = window.location.origin;
                pgUtil.persistURL = window.location.origin;
                pgUtil.mediaURL = window.location.origin + '/assets/media/';
                resolve(true);
            } else {
                // these two do not seem necessary
                //window.requestFileSystem(LocalFileSystem.TEMPORARY,  0, fsSuccess, fsFail);
                //window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, fsSuccess, fsFail);
                // @ts-ignore
                resolveLocalFileSystemURL(pgUtil.cordova.file.cacheDirectory, onFSTemp.bind(this), fsFail.bind(this));
                if (pgUtil.platform === 'iOS') // use the documents directory for iTunes sync
                {
                    pgUtil.resolveLocalFileSystemURL(pgUtil.cordova.file.documentsDirectory, onFSPersist.bind(this), persistFail.bind(this));
                } else {
                    pgUtil.resolveLocalFileSystemURL(pgUtil.cordova.file.dataDirectory, onFSPersist.bind(this), persistFail.bind(this));
                }
                // this call will invoke the callback.
                pgUtil.resolveLocalFileSystemURL(pgUtil.cordova.file.applicationDirectory, onFSApp.bind(this, resolve, reject), fsFail.bind(this, resolve, reject));
            }
        }
        function onFSApp(resolve, reject, fileSystem) {
            function success(fileSystem) {
                //pgFile.mediaEntry = fileSystem;
                //pgUtil.mediaURL = fileSystem.toURL().replace(/\/$/, '');
                pgUtil.mediaURL = "ionic://localhost/assets/media/"
                resolve(true);
            }
            function fail(err) {
                reject('Could not open media file system' + pgUtil.appURL + '/www/assets/media');
            }
            pgFile.appEntry = fileSystem;
            pgUtil.appURL = fileSystem.toURL().replace(/\/$/, '');
            pgUtil.resolveLocalFileSystemURL(pgUtil.appURL + '/www/assets/media', success, fail);
        }
        function onFSTemp(fileSystem) {
            pgFile.tempEntry = fileSystem;
            pgUtil.tempURL = fileSystem.toURL().replace(/\/$/, '');
        }
        function fsSuccess(fileSystem) {
            pgDebug.showLog('Got fileSystem: ' + fileSystem.toString());
        }
        function fsFail(err) {
            pgDebug.showLog('Failed fileSystem: ' + err.toString());
        }
        function onFSPersist(fileSystem) {
            pgFile.persistEntry = fileSystem;
            pgUtil.persistURL = fileSystem.toURL().replace(/\/$/, '');
            pgDebug.showLog('Got persistent FS');
            
            //const soundDir;
            if (pgUtil.device.platform === 'iOS') {
                //soundDir = cordova.file.dataDirectory.replace("/NoCloud","");
                //window.resolveLocalFileSystemURL(soundDir, onFSSound, soundFail);
                pgFile.soundEntry = pgFile.persistEntry;
                pgUtil.soundURL = pgUtil.persistURL;
            } else {
                //soundDir = cordova.file.dataDirectory;
                //window.resolveLocalFileSystemURL(soundDir, onFSSound, soundFail);
                pgFile.soundEntry = pgFile.persistEntry;
                pgUtil.soundURL = pgUtil.persistURL;
            }
        }
        function persistFail(err) {
            pgDebug.showLog('Could not get persistent fileSystem');
            
        }
    }
    
    saveDataURI(category, data, callback = function(success) {/**/
    }) {
        if (pgUtil.isWebBrowser) {
            return data;
        } // we cannot save files using a web browser except on chrome.
        // decode base64 data:audio/mpeg;base64,
        const mimeEnd = data.indexOf(';base64,');
        const mime = data.substring(5, mimeEnd);
        let filename = 'pg_' + category;
        if (mime === 'audio/wav') {
            filename += '.wav';
        } else if (mime === 'audio/mpeg') {
            filename += '.mp3';
        } else if (mime === 'text/xml' || mime === 'application/xml') {
            filename += '.xml';
        } else if (mime === 'text/css') {
            filename += '.css';
        } else {
            //pgUI.showAlert("Unknown file type: "+mime, "Error");
            callback(false);
            return 'Unknown file type: ' + mime;
        }
        const decodedData = this.base64.decodeArrayBuffer(data.substring(mimeEnd + 8));
        this.writeBinaryFile(filename, decodedData, callback);
        return pgUtil.persistURL + '/' + filename;
    }
    
    existFile(filename, callback = function(success) {
    }, dir = 'persist') {
        function success(entry) {
            callback(true);
        }
        function fail() {
            callback(false);
        }
        
        if (this.useWebFS) {
            for (let i = 0; i < localStorage.length; i++) {
                if (localStorage.key(i) === filename) {
                    callback(true);
                    return;
                }
            }
            callback(false);
        } else {
            if (dir === 'temp') {
                this.tempEntry.getFile(filename, {
                    create: false, exclusive: false
                }, success, fail);
            } else if (dir === 'sound') {
                this.soundEntry.getFile(filename, {
                    create: false, exclusive: false
                }, success, fail);
            } else if (dir === 'persist') {
                this.persistEntry.getFile(filename, {
                    create: false, exclusive: false
                }, success, fail);
            }
        }
    }
    deleteFile(filename) {
        function remove(entry) {
            entry.remove();
        }
        if (this.useWebFS) {
            localStorage.removeItem(filename);
        } else {
            this.persistEntry.getFile(filename, {create: false, exclusive: true}, remove);
        }
    }
    deleteAllFiles() {
        function localDelete(parent, entry, promise) {
            entry.remove();
            promise.resolve();
        }
        this.deleteFile('com.psygraph');
        this.deleteFile('com.psygraph.pg');
        this.deleteFile('com.psygraph.events');
        this.deleteFile('com.psygraph.state');
        this.deleteFile('com.psygraph.lastError');
        if (this.useWebFS) {
            for (let i = 0; i < localStorage.length; i++) {
                localStorage.removeItem(localStorage.key(i));
            }
        } else {
            this.forAllFiles('persist', localDelete);
        }
    }
    readFile(filename, callback = function(success, rslt) {/**/
    }, parse = true, ent = pgFile.persistEntry) {
        function fail(evt) {
            pgDebug.showLog('Could not read file: ' + filename);
            callback(false, null);
        }
        function success(ent) {
            function win(file) {
                const reader = new FileReader();
                reader.onloadend = function(evt) {
                    pgDebug.showLog('read success: ' + filename);
                    let s = '';
                    try {
                        if (parse) {
                            // @ts-ignore
                            s = JSON.parse(evt.target.result);
                        } else { // @tslint-ignore
                            // @ts-ignore
                            s = evt.target.result;
                        }
                    } catch (err) {
                        pgDebug.showError(err.message);
                    }
                    if (s === '') {
                        callback(false, s);
                    } else {
                        callback(true, s);
                    }
                };
                reader.readAsText(file);
            }
            ent.file(win, fail);
        }
        if (this.useWebFS) {
            const data = localStorage.getItem(filename);
            if (data && data.length) {
                pgDebug.showLog('Reading file: ' + filename + ' size: ' + data.length);
                let s = '';
                try {
                    s = JSON.parse(data);
                } catch (err) {/**/
                }
                if (s === '') {
                    callback(false, s);
                } else {
                    callback(true, s);
                }
            } else {
                fail([]);
            }
        } else {
            ent.getFile(filename, {create: false, exclusive: false}, success, fail);
        }
    }
    writeFile(filename, struct, callback = function(success, msg) {
    }, log = true) {
        const data = JSON.stringify(struct);
        this.writeData(filename, data, callback, log);
    }
    writeData(filename, data, callback = function(success, msg) {
    }, log = true) {
        function fail1(evt) {
            if (log) {
                pgDebug.showWarn('write fail: ' + filename);
            }
            callback(false, '');
        }
        function success(ent) {
            function win1(writer) {
                writer.onwrite = function(evt) {
                    if (log) {
                        pgDebug.showLog('write success: ' + filename);
                    }
                    callback(true, ent.toURL());
                };
                writer.onerror = function(evt) {
                    if (log) {
                        pgDebug.showWarn('Write failed: ' + filename + ', ' + evt.toString());
                    }
                    callback(false, '');
                };
                writer.write(data);
            }
            ent.createWriter(win1, fail1);
        }
        //if(filename.indexOf("com.")==0)
        //    filename = this.getPersistURL() +"/" +filename;
        if (this.useWebFS) {
            if (log) {
                pgDebug.showLog('Writing file: ' + filename + ' size: ' + data.length);
            }
            const oldData = localStorage.getItem(filename);
            localStorage.removeItem(filename);
            const len = localStorage.length;
            try {
                localStorage.setItem(filename, data);
            } catch (err) {
                if (log) {
                    const msg = 'Storage error' + err;
                    pgDebug.showLog(msg);
                    callback(false, msg);
                    //pgUI.showDialog({title: "Storage Error", true: "OK"},
                    //    "<p>" + err.message + "</p>" +
                    //    "<p>Try deleting events to increase available space.</p>",
                    //    callback.bind(false, ""));
                }
                return;
            }
            const s = (len < localStorage.length);
            if (!s) {
                localStorage.setItem(filename, oldData);
            }
            callback(s, '');
        } else {
            this.persistEntry.getFile(filename, {create: true, exclusive: false}, success, fail1);
        }
    }
    writeBinaryFile(filename, data, callback) { // pass in an ArrayBuffer
        callback = typeof (callback) !== 'undefined' ? callback : function() {/**/
        };
        function fail(evt) {
            pgDebug.showLog('write fail: ' + filename);
            callback(false);
        }
        function success(ent) {
            function win(writer) {
                writer.onwrite = function(evt) {
                    pgDebug.showLog('write success: ' + filename);
                    callback(true);
                };
                writer.write(data);
            }
            ent.createWriter(win, fail);
        }
        this.persistEntry.getFile(filename, {create: true, exclusive: false}, success.bind(this), fail.bind(this));
    }
    
    getRecordingPath(callback, filename) {
        function gotFile(success, fileEntry) {
            if (success) {
                callback(fileEntry.toURL());
            } else {
                callback();
            }
        }
        this.soundEntry.getFile(filename, {create: true, exclusive: false}, gotFile.bind(this, true), gotFile.bind(this, false));
    }
    
    basename(str) {
        const base = new String(str).substring(str.lastIndexOf('/') + 1);
        //if(base.lastIndexOf(".") != -1)
        //    base = base.substring(0, base.lastIndexOf("."));
        return base;
    }
    // In fact, we create a temporary file in the temp directory
    copySoundFile(src, callback, fn) {
        const tmpFile = 'temp_' + fn;
        this.existFile(tmpFile, cb.bind(this, tmpFile), 'temp');
        function cb(tmpFile, success) {
            function fail(err) {
                pgDebug.showLog('Error copying temp file(' + src + '): ' + err.message);
                callback(false);
            }
            function create() {
                function success(srcEntry) {
                    function s2(ent) {
                        callback(true, ent.toURL());
                    }
                    srcEntry.copyTo(this.tempEntry, tmpFile, s2.bind(this), fail.bind(this));
                }
                this.soundEntry.getFile(src, {create: false, exclusive: false}, success.bind(this), fail.bind(this));
            }
            function remove(entry) {
                // we should not end up here, since if the file existed, we would have played it.
                entry.remove(create.bind(this), fail.bind(this));
            }
            if (success) {
                callback(true, this.getTempURL() + '/' + tmpFile);
                return;
            }
            if (src.indexOf('http') === 0) {
                const fileTransfer = new pgUtil.fileTransfer();
                const fileURL = this.getTempURL() + '/' + tmpFile;
                fileTransfer.download(src, fileURL, function(ent) {
                    callback(true, ent.toURL());
                }, function(err) {
                    pgDebug.showLog('Error copying temp file(' + src + '): ' + err.source);
                    callback(false, src);
                });
            } else {
                this.tempEntry.getFile(tmpFile, {create: false, exclusive: true}, remove.bind(this), create.bind(this));
            }
        }
    }
    
    forAllFiles(dir, callback, doneCB = () => {}) {
        let entry;
        if (dir === 'persist') {
            entry = this.persistEntry;
        } else if (dir === 'sound') {
            entry = this.soundEntry;
        }
        const directoryReader = entry.createReader();
        // Get a list of all the entries in the directory
        directoryReader.readEntries(cb.bind(this, entry), fail.bind(this));
        function fail(error) {
            pgDebug.showError('Failed to read entry: ' + error.message);
            doneCB();
        }
        function cb(entry, entries) {
            // This is too complicated, but its fun.  We chain together bound function calls in a for-loop,
            // and link them together with deferred promises.  There must be a design pattern in there somewhere.
            let lastCB = doneCB;
            for (let i = 0; i < entries.length; i++) {
                const promise = $.Deferred();
                $.when(promise).then(lastCB);
                lastCB = callback.bind(this, entry, entries[i], promise);
            }
            lastCB();
        }
    }
    
    listDir(dir, ext, callback) {
        this.appEntry.getDirectory('/www/assets/media', {create: false}, createReader.bind(this));
        function fail(error) {
            pgDebug.showLog('Failed to read directory: ' + dir);
            callback([]);
        }
        function cb(entries) {
            const files = [];
            for (let i = 0; i < entries.length; i++) {
                const fn = entries[i].name;
                const fnExt = pgUtil.getFileExt(fn);
                if (ext === '*' || ext === fnExt) {
                    files[files.length] = fn;
                }
            }
            callback(files);
        }
        function createReader(dirEnt) {
            // Get a list of all the entries in the directory
            const dirReader = dirEnt.createReader();
            dirReader.readEntries(cb.bind(this), fail.bind(this));
        }
    }
    
    // when we change the event IDs to positive numbers, they have the potential to be uploaded.
    renameFileIDs(ids) {
        function rename(parent, entry, promise) {
            function success(oldFN, newFN) {
                pgDebug.showLog('Moved file: ' + oldFN + ', ' + newFN);
            }
            function fail(oldFN, newFN) {
                pgDebug.showLog('Didn\'t move file: ' + oldFN + ', ' + newFN);
            }
            if (parent) {
                for (let i = 0; i < ids.length; i++) {
                    const oldFN = this.getRecordFilename(ids[i][0]);
                    if (entry.name === oldFN) {
                        const newFN = this.getRecordFilename(ids[i][1]);
                        entry.moveTo(parent, newFN, success.bind(this, oldFN, newFN), fail.bind(this, oldFN, newFN));
                        break;
                    }
                }
            }
            promise.resolve();
        }
        if (pgUtil.isWebBrowser) {
            for (let i = 0; i < ids.length; i++) {
                const oldFN = pgUtil.getRecordFilename(ids[i][0]);
                const newFN = pgUtil.getRecordFilename(ids[i][1]);
                if (this.pending[oldFN]) {
                    const blob = this.pending[oldFN];
                    this.uploadAudioFile(newFN, blob, this.unscheduleUpload.bind(this, oldFN));
                }
            }
        } else {
            this.forAllFiles('persist', rename.bind(this));
        }
    }
    
    // Delete all files
    deleteAudioFiles() {
        if (pgUtil.isWebBrowser) {
            return;
        }
        this.forAllFiles('persist', this.localDeleteFile.bind(this, false));
        this.forAllFiles('sound', this.localDeleteFile.bind(this, true));
    }
    // Delete a (recorded) single file.
    deleteAudioFile(filename, promise) {
        if (typeof (promise) !== 'undefined') {
            promise.resolve();
        }
        if (pgUtil.isWebBrowser) {
            return;
        }
        this.persistEntry.getFile(filename, {create: false}, this.localDeleteFile.bind(this, this.persistEntry));
    }
    localDeleteFile(deleteAll, parent, entry) {
        const filename = entry.name;
        if (deleteAll || pgUtil.isRecordedFile(filename)) {
            entry.remove();
        }
    }
    scheduleUpload(filename, blob) {
        this.pending[filename] = blob;
    }
    unscheduleUpload(filename, success) {
        if (success) {
            delete this.pending[filename];
        }
    }
    
    uploadAudioFile(filename, blob, callback) {
        function successCB(evt) {
            pgDebug.showLog('Response: ' + evt.target.status + ', ' + evt.target.response);
            callback(true);
        }
        function failCB(evt) {
            pgDebug.showLog('Error: ' + evt.target.status);
            callback(false);
        }
        const formData = new FormData();
        const eventInfo = pg.eventInfoForFile(filename);
        formData.append('title', eventInfo.title);
        formData.append('text', eventInfo.text);
        formData.append('category', eventInfo.category);
        formData.append('location', eventInfo.location);
        formData.append('eid', '' + eventInfo.id);
        formData.append('action', 'uploadFile');
        formData.append('fileKey', 'mediaFile');
        formData.append('filename', filename);
        formData.append('username', pg.username);
        formData.append('cert', pg.cert);
        formData.append('mediaFile', blob, filename);
        
        const postURL = pg.getMediaServerURL();
        const xhr = new XMLHttpRequest();
        xhr.addEventListener('load', successCB, false);
        xhr.addEventListener('error', failCB, false);
        xhr.open('POST', postURL, true);
        //xhr.setRequestHeader('Content-Type', "application/json");
        // mime type: "audio/mp4";
        xhr.send(formData);  // multipart/form-data
    }
    // Upload all audio files.
    getAudioFilenames(callback) {
        const names = [];
        function getFilename(parent, entry, promise) {
            const fileURL = entry.toURL();
            const filename = entry.name;
            if (pgUtil.isRecordedFile(filename)) {
                names.push(fileURL);
            }
            promise.resolve();
        }
        function finished() {
            callback(names);
        }
        this.forAllFiles('persist', getFilename.bind(this), finished.bind(this));
    }
    
    // Upload all audio files.
    uploadAudioFiles(force, callback) {
        callback = typeof (callback) !== 'undefined' ? callback : function() {
        };
        function postFile(parent, entry, promise) {
            function success(filename, r) {
                if (r.responseCode === 200) {
                    if (r.response !== '' && r.response !== 'OK') {
                        pgDebug.showWarn('Could not upload file: ' + r.response);
                        //pgUI.showBusy(false);
                        //pgUI.showAlert(r.response, "Upload Error", function(){promise.resolve();});
                        //return;
                    } else {
                        // xxx We should not remove uploaded files.
                        // If we don't, though, we need a mechanism to ensure that they are not uploaded twice.
                        entry.remove();
                        // xxx we should not have knowledge of the note tool in the file system layer
                        //pgUI.note.audioFileUploaded(filename);
                        //pgDebug.showLog("Posted file: "+fileURL+" to: "+encodeURI(postURL));
                        pgDebug.showLog('Response = ' + r.response + 'Sent = ' + r.bytesSent);
                    }
                } else {
                    pgDebug.showWarn('Could not upload file: ' + r.responseCode + ' ' + r.response);
                }
                promise.resolve();
            }
            function fail(filename, error) {
                pgDebug.showLog('Could not upload ' + filename + '. Code = ' + error.code);
                pgDebug.showLog('upload error source ' + error.source);
                pgDebug.showLog('upload error target ' + error.target);
                promise.resolve();
            }
            const postURL = pg.getMediaServerURL();
            const fileURL = entry.toURL();
            const filename = entry.name;
            if (!pgUtil.isRecordedFile(filename)) {
                promise.resolve();
                return;
            } else {
                if (filename.indexOf('-') !== -1) {
                    // ID not resolved yet: wait.
                    promise.resolve();
                    return;
                }
                const eventInfo = pg.eventInfoForFile(filename);
                if (!eventInfo) {
                    // No event for this file, we should probably delete it.
                    promise.resolve();
                    return;
                }
                const options = new pgUtil.fileUploadOptions();
                options.fileKey = 'mediaFile';
                options.fileName = filename;
                const ext = pgUtil.getFileExt(filename);
                options.mimeType = 'audio/' + ext;
                options.chunkedMode = false;
                options.headers = {Connection: 'close'};
                options.httpMethod = 'POST';
                
                const params: any = {};
                params.filename = options.fileName.replace('pg', 'pg_' + pg.username + '_');
                params.username = pg.username;
                params.cert = pg.cert;
                params.eid = '' + eventInfo.id;
                params.title = eventInfo.title;
                params.text = eventInfo.text;
                params.category = eventInfo.category;
                params.location = eventInfo.location;
                params.action = 'uploadFile';
                options.params = params;
                
                try {
                    const ft = new pgUtil.fileTransfer();
                    ft.upload(fileURL, encodeURI(postURL), success.bind(this, filename), fail.bind(this, filename), options);
                } catch (err) {
                    pgDebug.showWarn('Could not upload file: ' + fileURL);
                    promise.resolve();
                }
            }
        }
        if (pgUtil.isWebBrowser) {
            callback();
            return;
        }
        if (!force && !pg.canUploadFiles()) {
            callback();
            return;
        }
        this.forAllFiles('persist', postFile, callback);
    }
    
    getFileName(path) {
        return path.split('\\').pop().split('/').pop();
    }
    getFilePath(path) {
        return path.substring(0, Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')));
    }
    
    encodePG(pgo, doMD5) {
        var s = {
            'username': pgo.username,
            'cert': pgo.cert,
            'certExpiration': pgo.certExpiration, //"category":       pgo.category(),
            'categories': pgo.categories, //"page":           pgo.page(),
            'pages': pgo.pages,
            'server': pgo.server,
            'useServer': pgo.useServer,
            'loggedIn': pgo.loggedIn,
            'categoryData': encodeData.call(this, pgo.categoryData, doMD5),
            'pageData': encodeData.call(this, pgo.pageData, doMD5),
            'dirtyFlag': pgo.dirtyFlag,
            'mtime': pgo.mtime,
            'version': pgo.version
            //"online":         pgo.online,
            //"events",         pgo.events,
            //"deletedEvents",  pgo.deletedEvents,
            //"selectedEvents", pgo.selectedEvents,
        };
        return JSON.stringify(s);
        function encodeData(data, doMD5) {
            var ans = {};
            for (var field in data) {
                if (doMD5) { // && data[field].substring(0,5)=="data:")
                    ans[field] = {};
                    var j = JSON.stringify(data[field].data);
                    ans[field]['data'] = 'md5:' + this.md5(j);
                    ans[field]['mtime'] = data[field].mtime;
                } else {
                    ans[field] = data[field];
                }
            }
            return ans;
        }
    }
    decodePG(string) {
        var s = JSON.parse(string);
        var mypg = new PG();
        mypg.username = s.username;
        mypg.cert = s.cert;
        mypg.certExpiration = s.certExpiration;
        //mypg.email           = s.email;
        mypg.categories = s.categories;
        mypg.pages = s.pages;
        mypg.server = s.server;
        mypg.useServer = s.useServer;
        mypg.loggedIn = s.loggedIn;
        //mypg.categoryData    = s.categoryData;
        mypg.pageData = s.pageData;
        mypg.dirtyFlag = s.dirtyFlag;
        mypg.mtime = s.mtime;
        //mypg.setCurrentCategory(s.category);
        //mypg.setCurrentPage(s.page);
        // don't decode the version.
        return mypg;
        //mypg.online          = s.online,
        //mypg.events          = s.events;
        //mypg.deletedEvents   = s.deletedEvents;
        //mypg.selectedEvents  = s.selectedEvents;
    }
    md5(s) {
        return hex(md51(s));
        
        function md51(s) {
            var txt = '';
            var n = s.length, state = [1732584193, -271733879, -1732584194, 271733878], i;
            for (i = 64; i <= s.length; i += 64) {
                md5cycle(state, md5blk(s.substring(i - 64, i)));
            }
            s = s.substring(i - 64);
            var tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            for (i = 0; i < s.length; i++) {
                tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
            }
            tail[i >> 2] |= 0x80 << ((i % 4) << 3);
            if (i > 55) {
                md5cycle(state, tail);
                for (i = 0; i < 16; i++) {
                    tail[i] = 0;
                }
            }
            tail[14] = n * 8;
            md5cycle(state, tail);
            return state;
        }
        
        function md5cycle(x, k) {
            var a = x[0], b = x[1], c = x[2], d = x[3];
            
            a = ff(a, b, c, d, k[0], 7, -680876936);
            d = ff(d, a, b, c, k[1], 12, -389564586);
            c = ff(c, d, a, b, k[2], 17, 606105819);
            b = ff(b, c, d, a, k[3], 22, -1044525330);
            a = ff(a, b, c, d, k[4], 7, -176418897);
            d = ff(d, a, b, c, k[5], 12, 1200080426);
            c = ff(c, d, a, b, k[6], 17, -1473231341);
            b = ff(b, c, d, a, k[7], 22, -45705983);
            a = ff(a, b, c, d, k[8], 7, 1770035416);
            d = ff(d, a, b, c, k[9], 12, -1958414417);
            c = ff(c, d, a, b, k[10], 17, -42063);
            b = ff(b, c, d, a, k[11], 22, -1990404162);
            a = ff(a, b, c, d, k[12], 7, 1804603682);
            d = ff(d, a, b, c, k[13], 12, -40341101);
            c = ff(c, d, a, b, k[14], 17, -1502002290);
            b = ff(b, c, d, a, k[15], 22, 1236535329);
            
            a = gg(a, b, c, d, k[1], 5, -165796510);
            d = gg(d, a, b, c, k[6], 9, -1069501632);
            c = gg(c, d, a, b, k[11], 14, 643717713);
            b = gg(b, c, d, a, k[0], 20, -373897302);
            a = gg(a, b, c, d, k[5], 5, -701558691);
            d = gg(d, a, b, c, k[10], 9, 38016083);
            c = gg(c, d, a, b, k[15], 14, -660478335);
            b = gg(b, c, d, a, k[4], 20, -405537848);
            a = gg(a, b, c, d, k[9], 5, 568446438);
            d = gg(d, a, b, c, k[14], 9, -1019803690);
            c = gg(c, d, a, b, k[3], 14, -187363961);
            b = gg(b, c, d, a, k[8], 20, 1163531501);
            a = gg(a, b, c, d, k[13], 5, -1444681467);
            d = gg(d, a, b, c, k[2], 9, -51403784);
            c = gg(c, d, a, b, k[7], 14, 1735328473);
            b = gg(b, c, d, a, k[12], 20, -1926607734);
            
            a = hh(a, b, c, d, k[5], 4, -378558);
            d = hh(d, a, b, c, k[8], 11, -2022574463);
            c = hh(c, d, a, b, k[11], 16, 1839030562);
            b = hh(b, c, d, a, k[14], 23, -35309556);
            a = hh(a, b, c, d, k[1], 4, -1530992060);
            d = hh(d, a, b, c, k[4], 11, 1272893353);
            c = hh(c, d, a, b, k[7], 16, -155497632);
            b = hh(b, c, d, a, k[10], 23, -1094730640);
            a = hh(a, b, c, d, k[13], 4, 681279174);
            d = hh(d, a, b, c, k[0], 11, -358537222);
            c = hh(c, d, a, b, k[3], 16, -722521979);
            b = hh(b, c, d, a, k[6], 23, 76029189);
            a = hh(a, b, c, d, k[9], 4, -640364487);
            d = hh(d, a, b, c, k[12], 11, -421815835);
            c = hh(c, d, a, b, k[15], 16, 530742520);
            b = hh(b, c, d, a, k[2], 23, -995338651);
            
            a = ii(a, b, c, d, k[0], 6, -198630844);
            d = ii(d, a, b, c, k[7], 10, 1126891415);
            c = ii(c, d, a, b, k[14], 15, -1416354905);
            b = ii(b, c, d, a, k[5], 21, -57434055);
            a = ii(a, b, c, d, k[12], 6, 1700485571);
            d = ii(d, a, b, c, k[3], 10, -1894986606);
            c = ii(c, d, a, b, k[10], 15, -1051523);
            b = ii(b, c, d, a, k[1], 21, -2054922799);
            a = ii(a, b, c, d, k[8], 6, 1873313359);
            d = ii(d, a, b, c, k[15], 10, -30611744);
            c = ii(c, d, a, b, k[6], 15, -1560198380);
            b = ii(b, c, d, a, k[13], 21, 1309151649);
            a = ii(a, b, c, d, k[4], 6, -145523070);
            d = ii(d, a, b, c, k[11], 10, -1120210379);
            c = ii(c, d, a, b, k[2], 15, 718787259);
            b = ii(b, c, d, a, k[9], 21, -343485551);
            
            x[0] = add32(a, x[0]);
            x[1] = add32(b, x[1]);
            x[2] = add32(c, x[2]);
            x[3] = add32(d, x[3]);
        }
        function cmn(q, a, b, x, s, t) {
            a = add32(add32(a, q), add32(x, t));
            return add32((a << s) | (a >>> (32 - s)), b);
        }
        function ff(a, b, c, d, x, s, t) {
            return cmn((b & c) | ((~b) & d), a, b, x, s, t);
        }
        function gg(a, b, c, d, x, s, t) {
            return cmn((b & d) | (c & (~d)), a, b, x, s, t);
        }
        function hh(a, b, c, d, x, s, t) {
            return cmn(b ^ c ^ d, a, b, x, s, t);
        }
        function ii(a, b, c, d, x, s, t) {
            return cmn(c ^ (b | (~d)), a, b, x, s, t);
        }
        function md5blk(s) {
            var md5blks = [], i;
            for (i = 0; i < 64; i += 4) {
                md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
            }
            return md5blks;
        }
        function rhex(n) {
            var s = '', j = 0;
            for (; j < 4; j++) {
                s += pgFile.hex_chr[(n >> (j * 8 + 4)) & 0x0F] + pgFile.hex_chr[(n >> (j * 8)) & 0x0F];
            }
            return s;
        }
        function hex(x) {
            for (var i = 0; i < x.length; i++) {
                x[i] = rhex(x[i]);
            }
            return x.join('');
        }
        
        function add32(x, y) {
            //if (md5('hello') != '5d41402abc4b2a76b9719d911017c592') {
            //    var lsw = (x & 0xFFFF) + (y & 0xFFFF),
            //    msw = (x >> 16) + (y >> 16) + (lsw >> 16);
            //    return (msw << 16) | (lsw & 0xFFFF);
            //}
            //else {
            return (x + y) & 0xFFFFFFFF;
            //}
        }
    }
    
    
}

// The following base64 code is a combination of an encoder and decoder.
// The decoder piece needs the following copyright. -arogers
/*
  Copyright (c) 2011, Daniel Guerrero
  All rights reserved.
  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:
  * Redistributions of source code must retain the above copyright
  notice, this list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright
  notice, this list of conditions and the following disclaimer in the
  documentation and/or other materials provided with the distribution.
  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
  ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
  DISCLAIMED. IN NO EVENT SHALL DANIEL GUERRERO BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
  SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
class Base64 {
    chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    encLookup = [];
    
    constructor() {
        for (var i = 0; i < 4096; i++) {
            this.encLookup[i] = this.chars[i >> 6] + this.chars[i & 0x3F];
        }
    }
    encode(src) {
        var len = src.length;
        var dst = '';
        var i = 0;
        while (len > 2) {
            var n = (src[i] << 16) | (src[i + 1] << 8) | src[i + 2];
            dst += this.encLookup[n >> 12] + this.encLookup[n & 0xFFF];
            len -= 3;
            i += 3;
        }
        if (len > 0) {
            var n1 = (src[i] & 0xFC) >> 2;
            var n2 = (src[i] & 0x03) << 4;
            if (len > 1) {
                n2 |= (src[++i] & 0xF0) >> 4;
            }
            dst += this.chars[n1];
            dst += this.chars[n2];
            if (len == 2) {
                var n3 = (src[i++] & 0x0F) << 2;
                n3 |= (src[i] & 0xC0) >> 6;
                dst += this.chars[n3];
            }
            if (len == 1) {
                dst += '=';
            }
            dst += '=';
        }
        return dst;
    }
    // will return a  Uint8Array type
    decodeArrayBuffer(input) {
        var bytes = (input.length / 4) * 3;
        var ab = new ArrayBuffer(bytes);
        this.decode(input, ab);
        
        return ab;
    }
    decode(input, arrayBuffer) {
        //get last chars to see if are valid
        var lkey1 = this.chars.indexOf(input.charAt(input.length - 1));
        var lkey2 = this.chars.indexOf(input.charAt(input.length - 2));
        
        var bytes = (input.length / 4) * 3;
        if (lkey1 == 64) {
            bytes--;
        } //padding chars, so skip
        if (lkey2 == 64) {
            bytes--;
        } //padding chars, so skip
        
        var uarray;
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;
        var j = 0;
        
        if (arrayBuffer) {
            uarray = new Uint8Array(arrayBuffer);
        } else {
            uarray = new Uint8Array(bytes);
        }
        
        input = input.replace(/[^A-Za-z0-9+/=]/g, "");
        
        for (i = 0; i < bytes; i += 3) {
            //get the 3 octects in 4 ascii chars
            enc1 = this.chars.indexOf(input.charAt(j++));
            enc2 = this.chars.indexOf(input.charAt(j++));
            enc3 = this.chars.indexOf(input.charAt(j++));
            enc4 = this.chars.indexOf(input.charAt(j++));
            
            chr1 = (enc1 << 2) | (enc2 >> 4);
            chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            chr3 = ((enc3 & 3) << 6) | enc4;
            
            uarray[i] = chr1;
            if (enc3 != 64) {
                uarray[i + 1] = chr2;
            }
            if (enc4 != 64) {
                uarray[i + 2] = chr3;
            }
        }
        return uarray;
    }
}

export const pgFile = new PGFile();
