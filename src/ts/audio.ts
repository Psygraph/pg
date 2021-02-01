import {pg} from './pg';
import {pgUtil, pgDebug} from './util';
import {pgUI} from './ui';
import {pgFile} from './file';
import {pgAcceleration} from './signal/accel';

class PGRecorder {
    bufferLen = 4096;
    recBuffers;
    sampleRate = 44100;
    numChannels = 1;
    filename = '';
    source = null;
    maxPower = 0;
    callback = null;
    node = null;
    recording;
    
    constructor() {
    }
    init(context, fn, cb) {
        this.release();
        this.filename = fn;
        this.callback = cb;
        this.node = context.createScriptProcessor(this.bufferLen, this.numChannels, this.numChannels);
        this.node.onaudioprocess = this.processor.bind(this);
    }
    processor(e) {
        for (let i = 0; i < this.numChannels; i++) {
            this.recBuffers[i].push(new Float32Array(e.inputBuffer.getChannelData(i)));
        }
        const lastBuffer = this.recBuffers[0][this.recBuffers[0].length-1];
        for(let i=0; i<lastBuffer.length; i++) {
            this.maxPower = Math.max(lastBuffer[i], this.maxPower);
        }
    }
    getCurrentAmplitude(callback) {
        console.log(this.maxPower);
        callback(this.maxPower);
        this.maxPower = 0;
    }
    record(source, dest) {
        this.source = source;
        this.source.connect(this.node);
        this.node.connect(dest);
        this.recording = true;
    }
    stopRecord() {
        this.source.disconnect(this.node);
        this.node.disconnect();
        const buffers = [];
        for (let i = 0; i < this.numChannels; i++) {
            buffers[i] = this.mergeBuffers(this.recBuffers[i]);
        }
        const interleaved = this.interleave(buffers);
        const data = this.encodeWAV(interleaved);
        this.recording = false;
        return data;
    }
    release() {
        this.recBuffers = [];
        for (let i = 0; i < this.numChannels; i++) {
            this.recBuffers[i] = [];
        }
    }
    mergeBuffers(buffers) {
        let recLength = 0;
        for (let i = 0; i < buffers.length; i++) {
            recLength += buffers[i].length;
        }
        const result = new Float32Array(recLength);
        let offset = 0;
        for (let i = 0; i < buffers.length; i++) {
            result.set(buffers[i], offset);
            offset += buffers[i].length;
        }
        return result;
    }
    interleave(inputBuffers) {
        let length = 0;
        for (let i = 0; i < inputBuffers.length; i++) {
            length += inputBuffers[i].length;
        }
        const result = new Float32Array(length);
        let index = 0;
        let inputIndex = 0;
        while (index < length) {
            for (let i = 0; i < inputBuffers.length; i++) {
                result[index++] = inputBuffers[i][inputIndex];
            }
            inputIndex++;
        }
        return result;
    }
    
    encodeWAV(samples) {
        const buffer = new ArrayBuffer(44 + samples.length * 2 * this.numChannels);
        const view = new DataView(buffer);
        
        writeString(view, 0, 'RIFF');                        // RIFF identifier
        view.setUint32(4, 32 + samples.length * 2, true);    // file length
        writeString(view, 8, 'WAVE');                        // RIFF type
        writeString(view, 12, 'fmt ');                       // format chunk identifier
        view.setUint32(16, 16, true);                        // format chunk length
        view.setUint16(20, 1, true);                         // sample format (raw)
        view.setUint16(22, this.numChannels, true);    // channel count
        view.setUint32(24, this.sampleRate, true);     //sample rate
        view.setUint32(28, this.sampleRate * this.numChannels * 2, true); // byte rate (sample rate * block align)
        view.setUint16(32, this.numChannels * 2, true);  // block align (channel count * bytes per sample)
        view.setUint16(34, 16, true);                        // bits per sample
        writeString(view, 36, 'data');                       // data chunk identifier
        view.setUint32(40, samples.length * 2, true);        // data chunk length */
        floatTo16BitPCM(view, 44, samples);
        return view;
        
        function floatTo16BitPCM(output, offset, input) {
            for (let i = 0; i < input.length; i++, offset += 2) {
                const s = Math.max(-1, Math.min(1, input[i]));
                output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
                //output.setInt16(offset, s * 0x7FFF, true);
            }
        }
        function writeString(view, offset, string) {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        }
    }
    getURI(samples) {
        const encData = pgFile.base64.encode(samples);
        return 'data:audio/wav;base64,' + encData;
    }
}

///////////////////////////////////////////////////

export class PGAudio {
    player = [];
    recorder = null;
    feedback = null;
    permCheck = false;
    context = null;
    mediaStreamSource = null;
    powerMeterTimer = null;
    
    IDX_RECORDED = 0;
    IDX_RESERVED = 1;
    
    alarmEl;
    recordEl;
    
    constructor() {
        this.recorder = new PGRecorder();
    }
    init(alarmEl, recordEl) {
        this.alarmEl = alarmEl;
        this.recordEl = recordEl;
        this.alarmEl.addEventListener('error', function(err) {
            pgDebug.showLog('Cannot alarm: ' + err.message);
        });
        this.alarmEl.load();
    }
    mkNiceDir(dir) {
        // on Mac, the audio player wants absolute directories, not file:// URL's
        if (pgUtil.platform === 'iOS' && dir.slice(0, 7) === 'file://') {
            dir = dir.slice(7);
        }
        return dir;
    }
    play(index, src) {
        try {
            this.player[index] = new pgUtil.media(src, this.playSuccess.bind(this, index), this.playError.bind(this, index));
            this.player[index].setVolume('0.8');
            // Play audio
            this.player[index].play();
        } catch (err) {
            this.playError(index, err);
        }
    }
    playRecorded(id, fn) {
        if (pgUtil.isWebBrowser) {
            const src = wpURL(id);
            if (!this.recordEl.paused) {
                //this.recordEl.src = '';
                this.recordEl.pause();
            } else {
                this.recordEl.onerror = () => {
                    audioCB(src, false, src);
                };
                if(pg.username === "") {
                    // pgUI.showAlert("You are not logged in, audio file access is not possible.");
                }
                else {
                    this.recordEl.src = src;
                }
                this.recordEl.load();
                this.recordEl.play();
            }
        } else {
            pgFile.existFile(fn, foundLocalFile.bind(this, id, fn), 'sound');
        }
        
        function audioCB(fn, success, src) {
            if (!success) {
                pgUI.showAlert("Audio Device",'Could not play audio file: ' + fn);
            } else {
                if (pgUtil.isWebBrowser) {
                    this.recordEl.onerror = null;
                } else {
                    src = this.mkNiceDir(src);
                    this.play(this.IDX_RECORDED, src);
                }
            }
        }
        function wpURL(id) {
            let wpUrl = pg.getMediaServerURL() + '?action=downloadFile';
            wpUrl += '&id=' + id;
            wpUrl += '&username=' + pg.username;
            wpUrl += '&cert=' + pg.cert;
            //wp_url += "&filename=" + fn;
            return wpUrl;
        }
        function playRecordedSrc(src, fn) {
            if (this.player[this.IDX_RECORDED]) {
                this.stop(this.IDX_RECORDED);
            } else {
                pgFile.copySoundFile(src, audioCB.bind(this, fn), fn);
            }
        }
        function foundLocalFile(id, fn, local) {
            if (local) { //the file was found locally
                playRecordedSrc.call(this, fn, fn);
            } else { // download the file
                // If we are logged in, online
                if (pg.loggedIn && pg.online) {
                    playRecordedSrc(wpURL(id), fn);
                } else {
                    pgUI.showAlert("File System",'No local audio file for event ' + id);
                }
            }
        }
    }
    nextPlayerIndex() {
        return Math.max(this.player.length, this.IDX_RESERVED);
    }
    getCategorySound(cat, callback = (success) => {}) {
        let data = pg.getCategoryData();
        let src = data[cat].sound;
        if (!pgUtil.isWebBrowser && src.indexOf('http') === 0) {
            // try to cache a local version.
            if (pgUtil.platform === 'iOS') {
                const tempFN = pgFile.getFileName(src);
                pgFile.copySoundFile(src, foundLocalFile.bind(this, src), tempFN);
                return;
            }
        }
        if (src.indexOf('http') !== 0 && src.indexOf('file') !== 0 && src.indexOf('data:') !== 0) {
            if (!pgUtil.isWebBrowser) {
                src = 'assets/media/' + src;
            } else {
                src = 'assets/media/' + src;
            }
        }
        pg.categorySound[cat] = src;
        callback(true);
        function foundLocalFile(src, success, url) {
            if (success) {
                pg.categorySound[cat] = url;
                pgDebug.showLog('Created local audio file (' + url + ') from (' + src + ').');
            } else {
                pg.categorySound[cat] = src;
                pgDebug.showWarn('Could not create local audio file (' + url + ') from (' + src + ').');
            }
            callback(success);
        }
    }
    
    alarm(category = pgUI.category(), shakeToStop = true, callback = (index) => {}) {
        this.getCategorySound(category, cb.bind(this));
        function cb(success) {
            let src = pg.categorySound[category];
            let index = -1;
            if (!pgUtil.isWebBrowser) {
                // play the file
                index = this.nextPlayerIndex();
                this.play(index, src);
                // enable shake-to-stop
                if (shakeToStop) {
                    pgAcceleration.start();
                    pgAcceleration.onShake('audio', this.stop.bind(this, index));
                }
            }
            // next try using HTML5
            else {
                this.alarmEl.pause();
                try {
                    this.alarmEl.fastSeek(0);
                } catch (err) {
                }
                this.alarmEl.volume = 0.9;
                // Play audio
                const promise = this.alarmEl.play();
                if (promise !== undefined) {
                    promise.catch(function() {
                        pgDebug.showLog('Cannot create alarm (audio autoplay disabled?)');
                    });
                }
            }
            callback(index);
        }
    }
    playSuccess(index) {
        // yay.  Must not be Monday.
        if (this.player[index]) {
            this.player[index].release();
            this.player[index] = null;
        }
    }
    playError(index, err) {
        // this.beep(); We are getting a weird non-error
        if (this.player[index]) {
            this.player[index].release();
            this.player[index] = null;
        }
        if ('message' in err) {
            pgDebug.showLog('Error playing file: ' + err.message);
        } else {
            pgDebug.showLog('Error playing recorded file');
        }
    }
    reward(correct) {
        // create audio feedback signals
        if (!this.feedback) {
            this.feedback = [];
            this.feedback[0] = new Audio();     // create the HTML5 audio element
            this.feedback[1] = new Audio();     // create the HTML5 audio element
            this.feedback[0].src = pgUtil.mediaURL + '/punish.mp3';
            this.feedback[1].src = pgUtil.mediaURL + '/reward.mp3';
        }
        const index = correct ? 1 : 0;
        this.feedback[index].play();
    }
    buzz(type="warning") {// success | warning | error
        if (pgUtil.tapticEngine) {
            pgUtil.tapticEngine.notification({type: type});
        }
    }
    beep(){
        this.buzz();
        this.reward(true);
    }
    getRecordPermissions() {
        function errorCallback(perm) {
            pgDebug.showWarn('Audio permission not turned on');
        }
        function checkPermissionCallback(perm, status) {
            if (!status.hasPermission) {
                const permissions = pgUtil.cordova.plugins.permissions;
                permissions.requestPermission(perm, function(status) {
                    if (!status.hasPermission) {
                        errorCallback(perm);
                    }
                }, errorCallback.bind(this, perm));
            }
        }
        
        if (!pgUtil.isWebBrowser && pgUtil.platform === 'Android' && !this.permCheck) {
            const permissions = pgUtil.cordova.plugins.permissions;
            permissions.checkPermission(permissions.RECORD_AUDIO, checkPermissionCallback.bind(this, permissions.RECORD_AUDIO), null);
            permissions.checkPermission(permissions.WRITE_EXTERNAL_STORAGE, checkPermissionCallback.bind(this, permissions.WRITE_EXTERNAL_STORAGE), null);
            this.permCheck = true;
        }
        return true;
    }
    async record(callback, filename) {
        if (this.recorder.recording) {
            pgUI.showAlert("Error",'You can only record one thing at a time');
            callback(false);
            return;
        }
        if (!pgUtil.isWebBrowser) {
            pgFile.getRecordingPath(gotPath.bind(this), filename);
        } else {
            if (navigator.mediaDevices.getUserMedia) {
                try {
                    let stream = await navigator.mediaDevices.getUserMedia({audio: true, video: false});
                    webSuccess.call(this, callback, stream);
                } catch(err) {
                    webFail.call(this, callback, err);
                }
            }
            else if(navigator.getUserMedia) {
                navigator.getUserMedia({audio: true, video: false}, webSuccess.bind(this, callback), webFail.bind(this, callback));
            }
            else {
                pgUI.showAlert("Recording error", 'Recording unavailable on this browser.');
                return callback(false);
            }
        }
        function deviceSuccess(e) {
            callback(true);
        }
        function deviceFail(e) {
            pgDebug.showError('Recording failed: ' + JSON.stringify(e));
            callback(false);
        }
        // Periodically make callbacks with amplitude information.
        function recordCallback(callback, ms) {
            if (this.recorder) {
                this.recorder.getCurrentAmplitude(success.bind(this), error.bind(this));
            }
            function success(power) {
                callback(true, {'max': power, 'sec': ms / 1000});
                this.powerMeterTimer = setTimeout(recordCallback.bind(this, callback, ms), ms);
            }
            function error(err) {
                pgDebug.showLog(err);
            }
        }
        function webSuccess(callback, stream) {
            this.context = new pgUtil.audioContext();
            this.mediaStreamSource = this.context.createMediaStreamSource(stream);
            if (this.context.state === 'suspended') {
                this.context.resume();
            }
            this.recorder.init(this.context, filename, callback);
            this.recorder.numChannels = 1;
            this.recorder.sampleRate = 44100;
            this.recorder.record(this.mediaStreamSource, this.context.destination);
            recordCallback.call(this, callback, 200);
        }
        function webFail(callback, error) {
            pgDebug.showLog('Recording failed (error code ' + error.code + ')');
            callback(false);
        }
        function gotPath(path) {
            if (!path) {
                if (this.recorder) {
                    this.recorder.release();
                    this.recorder = null;
                }
                pgDebug.showLog('Recording file error');
            } else {
                path = this.mkNiceDir(path);
                pgDebug.showLog('Recording filename: ' + path);
                // Record audio
                this.recorder = new pgUtil.media(path, deviceSuccess.bind(this), deviceFail.bind(this));
                this.recorder.startRecord();
                recordCallback.call(this, callback, 200);
            }
        }
    }
    
    stop(index) {
        function stopIndex(i) {
            if (this.player[i]) {
                this.player[i].stop();
                this.player[i].release();
                this.player[i] = null;
            }
        }
        if (index === -1) {
            for (let j = 0; j < this.player.length; j++) {
                stopIndex.call(this, j);
            }
        } else {
            stopIndex(index);
        }
        // cleanup array if its empty
        for (let j = 0; j < this.player.length; j++) {
            if (this.player[j] != null) {
                return;
            }
        }
        this.player = [];
    }
    stopAlarm(index = 0) {
        if (index == 0) {
            this.alarmEl.pause();
        } else {
            this.stop(index);
        }
    }
    stopRecord() {
        if (this.recorder) {
            if (!pgUtil.isWebBrowser) {
                this.recorder.stopRecord();
                this.recorder.release();
            } else {
                const data = this.recorder.stopRecord();
                const rawData = new Uint8Array(data.buffer);
                this.recordEl.src = this.recorder.getURI(rawData);
                this.recordEl.load();
                this.recordEl.play();
                const blob = new Blob([rawData], {type: 'audio/wav'});
                pgFile.scheduleUpload(this.recorder.filename, blob);
                this.recorder.release();
                this.recorder.callback(true);
                clearTimeout(this.powerMeterTimer);
                this.powerMeterTimer = null;
            }
            pgDebug.showLog("Finished recording");
        }
    }
}

export const pgAudio = new PGAudio();
