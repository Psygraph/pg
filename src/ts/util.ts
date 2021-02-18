//import {Device} from '../../plugins/cordova-plugin-device/';
import * as $ from 'jquery';
declare var cordova: any;

export class PGUtil {
    NO_TIME = 0;
    ONE_SECOND = 1000;
    ONE_MINUTE = 60 * 1000;
    ONE_HOUR = 60 * 60 * 1000;
    ONE_DAY = 24 * 60 * 60 * 1000;
    ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
    ONE_MONTH = 30 * 24 * 60 * 60 * 1000;
    ONE_YEAR = 365 * 24 * 60 * 60 * 1000;
    
    //timezoneOffset: (new Date()).getTimezoneOffset() * 60 * 1000,
    tempURL = '';
    appURL = '';
    persistURL = '';
    soundURL = '';
    mediaURL = '';
    
    // device and platform things
    media;
    audioContext;
    fileTransfer;
    fileUploadOptions;
    resolveLocalFileSystemURL;
    connection;
    device;
    ble;
    calendar;
    browser;
    getUserMedia;
    
    cordova;
    platform;
    isWebBrowser;
    notification;
    geolocation;
    navigator;
    cyclometer;
    compass;
    email;
    tapticEngine;
    
    constructor() {
    }
    init() {
        // @ts-ignore
        this.media = window.Media;
        // @ts-ignore
        this.audioContext = window.AudioContext || window.webkitAudioContext;
        // @ts-ignore
        this.fileTransfer = window.FileTransfer;
        // @ts-ignore
        this.fileUploadOptions = window.FileUploadOptions;
        // @ts-ignore
        this.resolveLocalFileSystemURL = window.resolveLocalFileSystemURL;
        // @ts-ignore
        this.connection = window.Connection;
        // @ts-ignore
        this.device = window.device;
        // @ts-ignore
        this.calendar = window.plugins ? window.plugins.calendar : window.plugins;
        // @ts-ignore
        this.navigator = window.navigator;
        // @ts-ignore
        this.ble = window.ble;
        // @ts-ignore
        this.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.mediaDevices.getUserMedia);
        // @ts-ignore
        this.cordova = window.cordova;
        if (this.device)  {
            this.platform = this.device.platform;
            pgDebug.assert(this.platform === 'Android' || this.platform === 'iOS');
            this.isWebBrowser = false;
        } else {
            this.platform = 'browser';
            this.isWebBrowser = true;
        }
        if(this.cordova && this.cordova.plugins) {
            this.notification = this.cordova.plugins.notification.local;
            this.email = this.cordova.plugins.email;
            this.browser = this.cordova.InAppBrowser;
        }
        // @ts-ignore
        this.geolocation = window.BackgroundGeolocation;
        this.cyclometer = this.navigator.cyclometer;
        this.compass = this.navigator.compass;
        // @ts-ignore
        this.tapticEngine = window.TapticEngine;
    }
    getDateString(date, showMS = true) {
        var dateString = '';
        if (typeof (date) === 'number') {
            date = new Date(date);
        }
        dateString = date.getFullYear() + '-' + (date.getMonth() < 9 ? '0' : '') + (date.getMonth() + 1) + '-' + (date.getDate() < 10 ? '0' : '') + date.getDate() + ' ' + (date.getHours() < 10 ? '0' : '') + date.getHours() + ':' + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes() + ':' + (date.getSeconds() < 10 ? '0' : '') + date.getSeconds();
        if (showMS) {
            dateString += '.' + (date.getMilliseconds() < 100 ? '0' : '') + (date.getMilliseconds() < 10 ? '0' : '') + date.getMilliseconds();
        }
        return dateString;
    }
    titleCase(txt) {
        return txt[0].toUpperCase() + txt.substring(1);
    }
    getCurrentTime() {
        var date = new Date();
        return date.getTime();
    }
    async pause(ms = 1000) {
        return new Promise(wait);
        function wait(resolve, reject) {
            setTimeout(resolve.bind(this,1), ms);
        }
    }
    //getDateString: function(ms) {
    //    var d = new Date(ms - pgUtil.timezoneOffset);
    //    // 2014-09-11T02:32:36.955Z
    //    var s = d.toISOString().slice(0, 23).replace('T', ' ');
    //    return s;
    //},
    zpad(no, digits) {
        no = no.toString();
        while (no.length < digits) {
            no = '0' + no;
        }
        return no;
    }
    getDBStringFromMS(ms, displayMillis) {
        var str = pgUtil.getStringFromMS(ms, displayMillis);
        var arr = str.split(':');
        for (var i = 0; i < arr.length; i++) {
            arr[i] = pgUtil.zpad(arr[i], 2);
        }
        while (arr.length < 4) {
            arr.unshift('00');
        }
        return arr.join(':');
    }
    getStructFromMS(ms) {
        const e = {days: 0, hours: 0, minutes: 0, seconds: 0, milliseconds: 0};
        e.milliseconds = ms % 1000;
        ms = Math.floor(ms / 1000);
        e.seconds = ms % 60;
        ms = Math.floor(ms / 60);
        e.minutes = ms % 60;
        ms = Math.floor(ms / 60);
        e.hours = ms % 24;
        ms = Math.floor(ms / 24);
        e.days = ms;
        return e;
    }
    getStringFromMS(ms, displayMillis = false) {
        const e = this.getStructFromMS(ms);
        var ans;
        // add seconds
        if (e.days || e.hours || e.minutes) {
            ans = pgUtil.zpad(e.seconds, 2);
        } else {
            ans = '' + e.seconds;
        }
        // add minutes
        if (e.days || e.hours) {
            ans = pgUtil.zpad(e.minutes, 2) + ':' + ans;
        } else if (e.minutes) {
            ans = e.minutes + ':' + ans;
        }
        // add hours
        if (e.days) {
            ans = pgUtil.zpad(e.hours, 2) + ':' + ans;
        } else if (e.hours) {
            ans = e.hours + ':' + ans;
        }
        // add days
        if (e.days) {
            ans = e.days + ':' + ans;
        }
        // add milliseconds at centisecond resolution
        if (displayMillis) {
            ans += '.' + pgUtil.zpad(Math.floor(e.milliseconds / 10), 2);
        }
        return ans;
    }
    getMSFromString(s) {
        var dhms = s.split(':');
        var len = dhms.length;
        var msec = 0, sec = 0, min = 0, hour = 0, day = 0;
        if (dhms.length > 0) {
            var seconds = dhms[len - 1].split('.');
            sec = getValFromField(seconds[0]);
            if (seconds.length > 1) {
                msec = getValFromField(seconds[1]) * Math.pow(10, 3 - seconds[1].length);
            }
        }
        if (dhms.length > 1) {
            min = getValFromField(dhms[len - 2]);
        }
        if (dhms.length > 2) {
            hour = getValFromField(dhms[len - 3]);
        }
        if (dhms.length > 3) {
            day = getValFromField(dhms[len - 4]);
        }
        var ans = msec + sec * 1000 + min * 60 * 1000 + hour * 60 * 60 * 1000 + day * 24 * 60 * 60 * 1000;
        return ans;
        function getValFromField(field) {
            var val = 0;
            if (field !== '') {
                val = parseInt(field);
            }
            return val;
        }
    }
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    getAudioExt() {
        let ext;
        if (pgUtil.isWebBrowser) {
            ext = 'wav';
        } else if (pgUtil.platform === 'iOS') {
            ext = 'm4a';
        }// wav
        else if (pgUtil.platform === 'Android') {
            ext = 'aac';
        } // amr
        //else
        //pgDebug.showLog("Error: unkonwn platform");
        return ext;
    }
    //pg.uniqueEventID()
    getRecordFilename(eid, ext = pgUtil.getAudioExt()) {
        const audioFilename = 'pg' + eid + '.' + ext;
        return audioFilename;
    }
    removeExt(txt) {
        return txt.replace(/\.[^/.]+$/, '');
    }
    norm(arr) {
        var n = 0;
        for (var i = 0; i < arr.length; i++) {
            n += arr[i] * arr[i];
        }
        return Math.sqrt(n);
    }
    deepCopy(a) {
        const dat = JSON.stringify(a);
        return JSON.parse(dat);
    }
    arraysIdentical(a, b) {
        var i = a.length;
        if (i !== b.length) {
            return false;
        }
        while (i--) {
            if (a[i] !== b[i]) {
                return false;
            }
        }
        return true;
    }
    isEmpty(obj) {
        return Object.keys(obj).length === 0;
    }
    equal(value, other) {
        // Get the value type
        var type = Object.prototype.toString.call(value);
        // If the two objects are not the same type, return false
        if (type !== Object.prototype.toString.call(other)) {
            return false;
        }
        // If items are not an object or array, return false
        if (['[object Array]', '[object Object]'].indexOf(type) < 0) {
            return false;
        }
        // Compare the length of the length of the two items
        var valueLen = type === '[object Array]' ? value.length : Object.keys(value).length;
        var otherLen = type === '[object Array]' ? other.length : Object.keys(other).length;
        if (valueLen !== otherLen) {
            return false;
        }
        // Compare two items
        var compare = function(item1, item2) {
            // Get the object type
            var itemType = Object.prototype.toString.call(item1);
            // If an object or array, compare recursively
            if (['[object Array]', '[object Object]'].indexOf(itemType) >= 0) {
                if (!pgUtil.equal(item1, item2)) {
                    return false;
                }
            }
            // Otherwise, do a simple comparison
            else {
                // If the two items are not the same type, return false
                if (itemType !== Object.prototype.toString.call(item2)) {
                    return false;
                }
                // Else if it's a function, convert to a string and compare
                // Otherwise, just compare
                if (itemType === '[object Function]') {
                    if (item1.toString() !== item2.toString()) {
                        return false;
                    }
                } else {
                    if (item1 !== item2) {
                        return false;
                    }
                }
            }
        };
        // Compare properties
        if (type === '[object Array]') {
            for (var i = 0; i < valueLen; i++) {
                if (compare(value[i], other[i]) === false) {
                    return false;
                }
            }
        } else {
            for (var key in value) {
                if (key in value) {
                    if (compare(value[key], other[key]) === false) {
                        return false;
                    }
                }
            }
        }
        // If nothing failed, return true
        return true;
    }
    escape(str, encodeForJS = false, encodeForText = true) {
        var div = $.parseHTML('<div></div>');
        if (encodeForText) {
            $(div).append(document.createTextNode(str));
        } else {
            $(div).append($.parseHTML(str));
        }
        var txt = div[0].innerHTML;
        if (encodeForJS) { // needed for onclick handlers
            txt = txt.replace(RegExp('\'', 'g'), '\\&#39;');
            txt = txt.replace(RegExp('\r\n', 'g'), '\\&#10;');
            txt = txt.replace(RegExp('\n', 'g'), '\\&#10;');
        }
        return txt;
    }
    unescape(escapedStr) {
        var div = document.createElement('div');
        div.innerHTML = escapedStr;
        var child = div.childNodes[0];
        return child ? child.nodeValue : '';
    }
    extractDomain(url) {
        var domain;
        //find & remove protocol (http, ftp, etc.) and get domain
        if (url.indexOf('://') > -1) {
            domain = url.split('/')[2];
        } else {
            domain = url.split('/')[0];
        }
        //find & remove port number
        domain = domain.split(':')[0];
        return domain;
    }
    executeAsync(func) {
        setTimeout(func, 0);
    }
    /*
    wait: function(time, type) {
        time = time || 200;
        type = type || "fx";
        return this.queue(type, function() {
                var self = this;
                setTimeout(function() {
                        $(self).dequeue();
                    }, time);
            });
    },
    debugDelay: function(callback) {
        var doCB = false;
        if(debug)
            callback();
        else
            setTimeout(function(){pgUtil.debugDelay(callback);}, 4000);
    },
    */
    sameType(a, b) {
        if (a === '*' || b === '*' || a === b) {
            return true;
        }
        return false;
    }
    isRecordedFile(src) {
        const pre = src.substr(0, 2);
        const ext = pgUtil.getFileExt(src).toLowerCase();
        if (pre === 'pg' && (ext === 'wav' || ext === 'm4a' || ext === 'aac')) {
            return true;
        }
        return false;
    }
    getFileExt(path) {
        return path.split('.').pop();
    }
}

function nl2br(str, is_xhtml) {
    var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br />' : '<br>';
    return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2');
}

/*
String.prototype.capitalizeFirstLetter() {
    return this.charAt(0).toUpperCase() + this.slice(1);
};

function def(a,b) {
    return (typeof(a) !== 'undefined') ?  a : b;
}
*/

export class PGDebug {
    log = [];
    debug = false;
    writeLogCB = null;
    
    assert(value, msg = 'unknown') {
        if (!value) {
            pgDebug.showError("Assertion " + msg);
        }
    }
    writeLog(msg) {
        if (pgDebug.debug) {
            pgDebug.log.push(msg);
            pgDebug.writeLogCB("com.psygraph.log", pgDebug.log, () => {}, false);
        }
    }
    
    showDebug(msg) {
        console.log(msg);
        pgDebug.writeLog(msg);
    }
    showLog(msg) {
        console.log(msg);
        pgDebug.writeLog(msg);
    }
    showWarn(msg) {
        msg = 'WARNING: ' + msg;
        console.warn(msg);
        pgDebug.writeLog(msg);
    }
    showError(msg) {
        msg = 'ERROR: ' + msg;
        console.error(msg);
        pgDebug.writeLog(msg);
    }
}

export const pgUtil = new PGUtil();
export const pgDebug = new PGDebug();
