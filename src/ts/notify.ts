import {pg} from './pg';
import {pgUtil, pgDebug} from './util';
import {pgUI} from './ui';
import * as $ from 'jquery';


export class PGNotify {
    nextID = 1;
    alertIndices = {};
    usePlugin = undefined;
    callback = null;
    clicked = [];
    pgAudio;
    pgXML;
    
    constructor() {
        this.nextID = 1;
        this.alertIndices = {};
        this.callback = null;
        this.clicked = [];
    }
    init(opts) {
        this.pgAudio = opts.pgAudio;
        this.pgXML = opts.pgXML;
        pgUI.addStateObserver(this);
        this.usePlugin = !pgUtil.isWebBrowser;
        if (this.usePlugin) {
            pgUtil.notification.on('click', this.onClick.bind(this));
            pgUtil.notification.on('trigger', this.onTrigger.bind(this));
            //pgUtil.notification.addActions('mindful', [
            pgUtil.notification.addActionGroup('mindful', [
                {id: 'yes', title: 'Mindful'},
                {id: 'no', title: 'Not Mindful'}]);
            pgUtil.notification.on('yes', this.surveyResponse.bind(this, true));
            pgUtil.notification.on('no', this.surveyResponse.bind(this, false));
            if (pgUtil.notification['fireQueuedEvents']) {
                pgUtil.notification.fireQueuedEvents();
            }
        }
        this.nextID = Math.floor(Math.random() * 10000);
        
        this.removeCategory("*");
        
        //pgUtil.notification.getAll(
        //    function (notifications) {
        //        for(var note in notifications) {
        //            var data = JSON.parse(notifications[note].data);
        //            this.alertIndex[data.category] = notifications[note].id;
        //            if(typeof(this.alertIndex[data.category]) != "undefined")
        //                showLog("Error: previous notification for " + category);
        //        }
        //    });
    }
    updateState(tf) {
        if (tf) {
            this.update(true, pgUI.state.notify);
        } else {
            pgUI.state.notify = this.update(false, pgUI.state.notify);
        }
    }
    update(show, data) {
        try {
            if (show) {
                if (data.alertIndices) {
                    this.alertIndices = data.alertIndices;
                }
            } else {
                data.alertIndices = this.alertIndices;
            }
        } catch (err) {
            pgDebug.showWarn(err.toString());
            data = {alertIndices: {}};
            
        }
        return data;
    }
    setNotification(category, atTime, countdownTime, hasText, hasSound) {
        if (this.alertIndices[category] && this.alertIndices[category].length) {
            pgDebug.showLog('Error: pending notification in ' + category);
            this.removeCategory(category);
        }
        this.alertIndices[category] = [];
        //let sound = null;
        this.pgXML.getCategoryText(category, this.pgAudio.getCategorySound.bind(this.pgAudio, category, cb1.bind(this)));
        
        function cb1(success) {
            let snd = '';
            let txt = '';
            const numNotifications = atTime.length; //atTime.length;
            let id = 0;
            for (let i = numNotifications - 1; i >= 0; i--) {
                if (hasText) {
                    txt = pg.categoryText[category];
                }
                if (hasSound) {
                    snd = 'file://' + pg.categorySound[category];
                }
                const opts = this.getOpts(category, atTime[i], countdownTime[i], txt, snd);
                if (this.usePlugin) {
                    opts.id = this.nextID++;
                    pgUtil.notification.schedule(opts);
                    id = opts.id;
                } else {
                    const time = Math.abs(atTime[i] - pgUtil.getCurrentTime());
                    id = setTimeout(this.onTrigger.bind(this, opts), time);
                }
                this.alertIndices[category].push(id);
            }
            pgDebug.showLog('Set ' + category + ' notification for: ' + atTime);
        }
    }
    getOpts(category, atTime, countdownTime, txt, sound) {
        //let catData  = pg.getCategoryData(category);
        const opts = {
            'sound': sound,
            'trigger': {'at': new Date(atTime)},
            'foreground': true,
            'data': '',
            icon: null,
            title: null,
            text: null,
            actionGroupId: null
        };
        const optData = {
            'category': category, 'time': atTime, 'resetTime': countdownTime, 'id': pg.uniqueEventID(), 'title': '', 'text': ''
        };
        // show the icon only on android
        if (!pgUtil.isWebBrowser && pgUtil.device.platform === 'Android') {
            opts.icon = 'res://icon.png';
        }
        if (txt) {
            opts.title = txt.title;
            optData.title = txt.title;
            const len = txt.text.length;
            if (len) {
                let text = txt.text[pgUtil.randomInt(0, len - 1)];
                // should the following happen only on IOS?
                const re = new RegExp('<br/>', 'g');
                text = text.replace(re, '\n');
                opts.text = text;
                optData.text = text;
            }
        }
        if (category === 'Uncategorized' || !txt) {
            opts.title = ' ';
            optData.title = ' ';
        }
        if (this.usePlugin) {
            opts.text = $(opts.text).text(); // convert to plain text
            //opts.actions = 'mindful';
            opts.actionGroupId = 'mindful';
        }
        opts.data = JSON.stringify(optData);
        return opts;
    }
    /*
    // Call any missed callbacks that have elapsed.
    callElapsed(category, running) {
        // clear all of the indices
        if (this.usePlugin) {
            pgUtil.notification.getAll(notifyCB.bind(this, category), this);
        }
        function notifyCB(category, notifications) {
            // The intent of this method is to send notification callbacks for all events that transpired while the app was sleeping
            notifications = notifications.concat(this.clicked);
            delete(this.clicked);
            this.clicked = [];
    
            for(let note in notifications) {
                pgUtil.notification.isTriggered(notifications[note].id, cb.bind(this, notifications[note]));
            }
    
            function cb(notification, triggered) {
                const data = JSON.parse(notification.data);
                if (typeof(data) === "string") // weirdness in the recent release of local.notification
                    data = JSON.parse(data);
                if (category === data.category) {
                    pgDebug.showLog("Removing notification " + notification.id  + ": " + notification.data);
                    this.removeID(notification.id, true);
                    if(triggered && false) {
                        //if (!triggered)
                        //    pgDebug.showLog("Notification should have triggered: " + notifications[note].id);
                        const latestData = {};
                        latestData.alarm = true;
                        latestData.time = 0;
                        latestData.category = category;
                        latestData.elapsed = false;
                        latestData.time = pgUtil.getCurrentTime(); // we regard the alarm as having elapsed... now.
                        latestData.id = pg.uniqueEventID();
                        this.callback("elapsed", latestData, running);
                    }
                }
            }
        }
    }
    */
    removeCategory(category) {
        if (!this.usePlugin) {
            try {
                for (const i in this.alertIndices[category]) {
                    const id = this.alertIndices[category][i];
                    if (id) {
                        this.removeID(id);
                    }
                }
            } catch (err) { // do nothing
            }
        } else {
            if(category=="*")
                pgUtil.notification.clearAll();
            else
                pgUtil.notification.getAll(this.remove.bind(this, category));
        }
        this.alertIndices[category] = [];
    }
    removeID(id) {
        for (const ndx in this.alertIndices) {
            for (const i in this.alertIndices[ndx]) {
                if (this.alertIndices[ndx][i] === id) {
                    this.alertIndices[ndx].slice(i, 1);
                    break;
                }
            }
        }
        if (this.usePlugin) {
            pgUtil.notification.get(id, this.remove.bind(this, '*'));
        } else {
            clearTimeout(id);
        }
    }
    remove(category, notifications) {
        for (const n in notifications) {
            const notification = notifications[n];
            let data = JSON.parse(notification.data);
            data = JSON.parse(data);
            if (category === '*' || data.category === category) {
                const triggered = data.time < 1000 + pgUtil.getCurrentTime();
                // only cancel triggered notifications after a timeout, otherwise the sound will stop playing
                if (triggered) {
                    setTimeout(this.cancel.bind(this, notification.id, data.time), 12000);
                } else {
                    this.cancel(notification.id, data.time);
                }
            }
        }
        //if (this.callback) {
        //    this.callback('updateView');
        //}
    }
    cancel(id, time) {
        pgDebug.showLog('cancelling notification: ' + time);
        pgUtil.notification.cancel(id);
    }
    
    removeAll() {
        for (const cat in this.alertIndices) {
            this.removeCategory(cat);
        }
        if (this.usePlugin) {
            // just to be sure
            pgUtil.notification.cancelAll();
        }
    }
    onClick(notification) {
        const len = this.clicked.length;
        this.clicked[len] = notification;
        if (notification.text) {
            pgUI.showAlert(notification.title, notification.text);
        }
    }
    onTrigger(notification) {
        const data = JSON.parse(notification.data);
        for (const ndx in this.alertIndices) {
            for (const i in this.alertIndices[ndx]) {
                if (this.alertIndices[ndx][i] === notification.id) {
                    this.alertIndices[ndx].slice(i, 1);
                }
            }
        }
        // If we did this, the notification would dismiss immediately.
        //this.removeCategory(data.category);
        data.alarm = true;
        data.elapsed = true;
        data.text = notification.text;
        data.title = notification.title;
        data.sound = notification.sound;
        //data.foreground = notification.foreground;
        if (this.callback) {
            this.callback('trigger', data);
        }
        this.alarm(data);
    }
    alarm(opts) {
        if (!this.usePlugin) {
            if (opts.text) {
                pgUI.showAlert(opts.title, opts.text);
            }
            if (opts.sound) {
                const idx = this.pgAudio.alarm(opts.category);
            }
        }
    }
    
    surveyResponse(tf, notification, eopts) {
        pgDebug.showLog('Survey Response: '+tf);
        const data = JSON.parse(notification.data);
        data.survey = tf;
        if (this.callback) {
            this.callback('survey', data);
        }
    }
    
    setCallback(callback) {
        this.callback = callback;
    }
    scheduleCalendar(create) {
        if (pgUtil.isWebBrowser) {
            return;
        }
        
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
        const title = pgUI.category();
        const eventLocation = null;
        const notes = 'Event created by Psygraph';
        const calOptions = pgUtil.calendar.getCalendarOptions(); // grab the defaults
        calOptions.firstReminderMinutes = 30;
        calOptions.secondReminderMinutes = 5;
        calOptions.recurrence = 'daily'; // supported are: daily, weekly, monthly, yearly
        calOptions.recurrenceEndDate = null;
        calOptions.recurrenceInterval = 1;
        //calOptions.url                   = "https://psygraph.com";
        
        function cb(tf) {
            function success(message) {
                //alert("Success: " + message);
            }
            function failure(message) {
                alert('Error: ' + message);
            }
            if (create) {
                pgUtil.calendar.createEventInteractivelyWithOptions(title, eventLocation, notes, startDate, endDate, calOptions, success.bind(this), failure.bind(this));
            }
        }
        
        this.deleteCalendar(cb.bind(this));
        
    }
    deleteCalendar(callback) {
        const title = pgUI.category();
        const eventLocation = null;
        const notes = null;
        const eventDate = new Date().getTime();
        const oneYear = 365 * 24 * 60 * 60 * 1000;
        const startDate = new Date(eventDate - oneYear);
        const endDate = new Date(eventDate + oneYear);
        
        function failure(message) {
            //alert("Error: " + message);
            callback(false);
        }
        function success(event) {
            const id = event.id;
            pgUtil.calendar.deleteEventById(id, null, callback.bind(true), failure);
        }
        pgUtil.calendar.findEvent(title, eventLocation, notes, startDate, endDate, success.bind(this), failure.bind(this));
    }
    getCalendarTime(category, callback) {
        const title = category;
        const eventLocation = null;
        const notes = null;
        const eventDate = new Date().getTime();
        const oneYear = 365 * 24 * 60 * 60 * 1000;
        const startDate = new Date(eventDate - oneYear);
        const endDate = new Date(eventDate + oneYear);
        
        function success(event) {
            let time = new Date(event.startDate).getTime() - new Date().getTime();
            if (time < 0) {
                time = 0;
            }
            callback(time);
        }
        function failure(message) {
            callback(0);
        }
        pgUtil.calendar.findEvent(title, eventLocation, notes, startDate, endDate, success.bind(this), failure.bind(this));
    }
}

export const pgNotify = new PGNotify();
