


function Notify() {
    this.nextID       = 1;
    this.alertIndices = {};
    this.usePlugin    = undefined;
    this.callback     = null;
    this.clicked      = [];
}

Notify.prototype.init = function(cb) {
    if(typeof(this.usePlugin)==="undefined") {
        //var browser = document.URL.match(/^https?:/);
        var browser = pgUtil.isWebBrowser();
        this.usePlugin = !browser;
        if(this.usePlugin) {
            cordova.plugins.notification.local.on("click", this.onClick.bind(this));
            cordova.plugins.notification.local.on("trigger", this.onTrigger.bind(this));
            //cordova.plugins.notification.local.addActions('mindful', [
            cordova.plugins.notification.local.addActionGroup('mindful', [
                { id: 'yes', title: 'Mindful' },
                { id: 'no',  title: 'Not Mindful'}
            ], this.survey, this);
            cordova.plugins.notification.local.on('yes', this.surveyResponse.bind(this, true));
            cordova.plugins.notification.local.on('no', this.surveyResponse.bind(this, false));
            if(cordova.plugins.notification.local['fireQueuedEvents'])
                cordova.plugins.notification.local.fireQueuedEvents();
        }
        this.nextID = Math.floor(Math.random() * 10000);
        //cordova.plugins.notification.local.getAll(
        //    function (notifications) {
        //        for(var note in notifications) {
        //            var data = JSON.parse(notifications[note].data);
        //            this.alertIndex[data.category] = notifications[note].id;
        //            if(typeof(this.alertIndex[data.category]) != "undefined")
        //                showLog("Error: previous notification for " + category);
        //        }
        //    });
        return true;
    }
    return false;
};

Notify.prototype.update = function(show, data) {
    try {
        if(show) {
            this.init();
            if(data.alertIndices)
                this.alertIndices = data.alertIndices;
        }
        else {
            data.alertIndices = this.alertIndices;
        }
    }
    catch(err){
        pgUI_showWarn(err.toString());
        data = {alertIndices: {}};

    }
    return data;
};

Notify.prototype.setNotification = function(category, atTime, countdownTime, hasText, hasSound) {
    if(this.alertIndices[category] && this.alertIndices[category].length) {
        pgUI_showLog("Error: pending notification in " + category);
        this.removeCategory(category);
    }
    this.alertIndices[category] = [];
    var sound = null;
    if(hasSound) {
        pgAudio.getCategorySound(category, true, cb.bind(this));
    }
    else
        cb.call(this,"");

    function cb(sound) {
        var numNotifications = atTime.length; //atTime.length;
        var id=0;
        var txt = {title:"",text:""};
        for(var i=numNotifications-1; i>=0; i--) {
            if(hasText)
                txt = pg.getCategoryText(category);
            var opts = this.getOpts(category, atTime[i], countdownTime[i], txt, sound);
            if(this.usePlugin) {
                opts.id = this.nextID++;
                cordova.plugins.notification.local.schedule(opts);
                id = opts.id;
            }
            else {
                var time = Math.abs(atTime[i] - pgUtil.getCurrentTime());
                id = setTimeout(this.onTrigger.bind(this,opts), time);
            }
            this.alertIndices[category].push(id);
        }
        pgUI_showLog("Set "+category+" notification for: " + atTime);
    }
};

Notify.prototype.getOpts = function(category, atTime, countdownTime, txt, sound) {
    //var catData  = pg.getCategoryData(category);
    var opts = {
        "sound":      sound,
        "trigger":    { "at": new Date(atTime)},
        "foreground": true,
        "data":       {"category":  category,
                       "time":      atTime,
                       "resetTime": countdownTime,
                       "id":        pg.uniqueEventID()}
    };
    // show the icon only on android
    if(!pgUtil.isWebBrowser() && device.platform==="Android")
        opts.icon = "res://icon.png";
    if(txt) {
        opts.title      = txt.title;
        opts.data.title = txt.title;
        var len = txt.text.length;
        if(len) {
            var text = txt.text[pgUtil.randomInt(0,len-1)];
            // should the following happen only on IOS?
            var re = new RegExp("<br/>", "g");
            text = text.replace(re, "\n");
            opts.text = text;
            opts.data.text = text;
        }
    }
    if(category === "Uncategorized" || !txt) {
        opts.title      = " ";
        opts.data.title = " ";
    }
    if(this.usePlugin) {
        opts.text = $(opts.text).text(); // convert to plain text
        //opts.actions = 'mindful';
        opts.actionGroupId = 'mindful';
    }
    opts.data = JSON.stringify(opts.data);
    return opts;
};
    
// Call any missed callbacks that have elapsed.
Notify.prototype.callElapsed = function(category, running) {
    if (this.usePlugin) {
        cordova.plugins.notification.local.getAll(notifyCB.bind(this, category, running), this);
    }
    else {
        // just clear all of the indicies, since the timers are not persistent.
        this.removeCategory(category);
    }
    function notifyCB(category, running, notifications) {
        // The intent of this method is to send notification callbacks for all events that transpired while the app was sleeping
        notifications = notifications.concat(this.clicked);
        delete(this.clicked);
        this.clicked = [];

        for(var note in notifications) {
            pgUI_showLog("notification: " + notifications[note].data);
            if(!notifications[note].isTriggered())
                continue;
            var data = notifications[note].data;
            if(typeof(data)==="string") // weirdness in the recent notifcation
                data = JSON.parse(data);
            if( category === data.category ) {
                this.removeID(notifications[note].id);
                var latestData      = {};
                latestData.alarm    = true;
                latestData.time     = 0;
                latestData.category = category;
                latestData.elapsed  = false;
                latestData.time     = pgUtil.getCurrentTime(); // we regard the alarm as having elapsed... now.
                latestData.id       = pg.uniqueEventID();
                this.callback("elapsed", latestData, running);
            }
        }
    }
};

Notify.prototype.removeCategory = function(category) {
    if(!this.usePlugin) {
        try {
            for(i in this.alertIndices[category]) {
                var id = this.alertIndices[category][i];
                if (id)
                    this.removeID(id);
            }
        }
        catch(err) {
        }
        this.alertIndices[category] = [];
    }
    else
        cordova.plugins.notification.local.getAll(cb.bind(this));
    function cb(notifications) {
        if(!notifications)
            pgUI_showLog("Invalid NULL notification in removeList");
        else if(Array.isArray(notifications)) {
            for(var n in notifications)
                process(notifications[n]);
        }
        else
            process(notifications);
        this.alertIndices[category] = [];
        function process(note) {
            var id   = note.id;
            var data = JSON.parse(note.data);
            // xxx This is broken upstream: it should not be double-encoded.
            data = JSON.parse(data);
            if(data.category === category) {
                // only cancel scheduled notifications, otherwise the sound will stop playing (Android)
                if(cordova.plugins.notification.local.isTriggered(id)) {
                    setTimeout( cordova.plugins.notification.local.cancel.bind(this,id), 4000);
                }
                else {
                    cordova.plugins.notification.local.cancel( id );
                }
            }
        }
    }
};
Notify.prototype.removeID = function(id) {
    for(ndx in this.alertIndices) {
        for(i in this.alertIndices[ndx]) {
            if (this.alertIndices[ndx][i] === id) {
                this.alertIndices[ndx].slice(i, 1);
                break;
            }
        }
    }
    if(this.usePlugin) {
        cordova.plugins.notification.local.cancel( id );
    }
    else {
        clearTimeout(id);
    }
};

Notify.prototype.removeAll = function() {
    for(var cat in this.alertIndices) {
        this.removeCategory(cat);
    }
    if(this.usePlugin) {
        // just to be sure
        cordova.plugins.notification.local.cancelAll();
    }
};
Notify.prototype.onClick = function(notification) {
    var len = this.clicked.length;
    this.clicked[len] = notification;
    if(notification.text) {
        pgUI.showAlert(notification.text, notification.title);
    }
};
Notify.prototype.onTrigger = function(notification) {
    var data = JSON.parse(notification.data);
    for(ndx in this.alertIndices) {
        for(i in this.alertIndices[ndx]) {
            if (this.alertIndices[ndx][i] === notification.id)
                this.alertIndices[ndx].slice(i, 1);
        }
    }
    // If we did this, the notification would dismiss immediately.
    //this.removeCategory(data.category);
    data.alarm   = true;
    data.elapsed = true;
    data.text    = notification.text;
    data.title   = notification.title;
    data.sound   = notification.sound;
    //data.foreground = notification.foreground;
    if(this.callback) {
        this.callback("trigger", data);
    }
    this.alarm(data);
};
Notify.prototype.alarm = function(opts) {
    if(!this.usePlugin) {
        if(opts.text) {
            pgUI.showAlert(opts.text, opts.title);
        }
        if(opts.sound) {
            var idx = pgAudio.alarm(opts.category);
        }
    }
};

Notify.prototype.survey = function(notification) {
    pgUI_showLog("Survey");
};
Notify.prototype.surveyResponse = function(tf, notification, eopts) {
    pgUI_showLog("Survey Response");
    var data = JSON.parse(notification.data);
    data.survey = tf;
    if(this.callback) {
        this.callback("survey", data);
    }
};

Notify.prototype.setCallback = function(callback) {
    this.callback = callback;
};

Notify.prototype.scheduleCalendar = function(create) {
    if(pgUtil.isWebBrowser())
        return;

    var startDate     = new Date();
    var endDate       = new Date(startDate.getTime() + 30*60*1000);
    var title         = pg.category();
    var eventLocation = null;
    var notes         = "Event created by Psygraph";
    var calOptions    = window.plugins.calendar.getCalendarOptions(); // grab the defaults
    calOptions.firstReminderMinutes  = 30;
    calOptions.secondReminderMinutes = 5;
    calOptions.recurrence            = "daily"; // supported are: daily, weekly, monthly, yearly
    calOptions.recurrenceEndDate     = null;
    calOptions.recurrenceInterval    = 1;
    //calOptions.url                   = "https://psygraph.com";

    this.deleteCalendar(cb.bind(this));

    function cb(tf) {
        if(create) {
            window.plugins.calendar.createEventInteractivelyWithOptions(
                title, eventLocation, notes, startDate, endDate, calOptions, success.bind(this), failure.bind(this));
        }
    }
    function success(message) {
        //alert("Success: " + message);
    }
    function failure(message) {
        alert("Error: " + message);
    }
};
Notify.prototype.deleteCalendar = function(callback) {
    var title         = pg.category();
    var eventLocation = null;
    var notes         = null;
    var eventDate     = new Date().getTime();
    var oneYear       = 365*24*60*60*1000;
    var startDate     = new Date(eventDate-oneYear);
    var endDate       = new Date(eventDate+oneYear);

    window.plugins.calendar.findEvent(title,eventLocation,notes,startDate,endDate,success.bind(this),failure.bind(this));
    function success(event) {
        var id = event.id;
        window.plugins.calendar.deleteEventById(id, null, callback.bind(true), failure);
    }
    function failure(message) {
        //alert("Error: " + message);
        callback(false);
    }
};
Notify.prototype.getCalendarTime = function(category, callback) {
    var title         = category;
    var eventLocation = null;
    var notes         = null;
    var eventDate     = new Date().getTime();
    var oneYear       = 365*24*60*60*1000;
    var startDate     = new Date(eventDate-oneYear);
    var endDate       = new Date(eventDate+oneYear);

    window.plugins.calendar.findEvent(title,eventLocation,notes,startDate,endDate,success.bind(this),failure.bind(this));
    function success(event) {
        var time = new Date(event.startDate).getTime() - new Date.getTime();
        if(time < 0)
            time = 0;
        callback(time);
    }
    function failure(message) {
        callback(0);
    }
};

var pgNotify = new Notify();
