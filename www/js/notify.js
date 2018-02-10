


function Notify() {
    // for notifying the user
    //IDs:        [],
    this.nextID = 1;
    this.alertIndex = {};
    this.usePlugin = undefined;
    this.callback = null;
    this.clicked = [];
    //this.inTrigger = false;
}

Notify.prototype.init = function(cb) {
    if(typeof(this.usePlugin)==="undefined") {
        this.usePlugin = !pgUtil.isWebBrowser();
        if(this.usePlugin) {
            cordova.plugins.notification.local.on("click", this.onClick.bind(this));
            cordova.plugins.notification.local.on("trigger", this.onTrigger.bind(this));
            cordova.plugins.notification.local.addActionGroup('mindful', [
                { id: 'yes', title: 'Mindful.' },
                { id: 'no',  title: 'Not Mindful.'}
            ], this.survey, this);
            cordova.plugins.notification.local.on('yes', this.surveyResponse.bind(this, true));
            cordova.plugins.notification.local.on('no', this.surveyResponse.bind(this, false));
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
            if(data.alertIndex)
                this.alertIndex = data.alertIndex;
        }
        else {
            data.alertIndex = this.alertIndex;
        }
    }
    catch(err){
        pgUI_showWarn(err.toString());
        data = {alertIndex: {}};

    }
    return data;
};

Notify.prototype.setNotification = function(category, atTime, hasText, hasSound) {
    if(this.alertIndex[category]) {
        pgUI_showLog("Error: pending notification in " + category);
        this.removeCategory(category);
    }
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
            var notify = i===0;
            var opts = this.getOpts(category, atTime[i], txt, sound, notify);
            if(this.usePlugin) {
                opts.id = this.nextID++;
                cordova.plugins.notification.local.schedule(opts);
                id = opts.id;
            }
            else {
                var time = Math.abs(atTime - pgUtil.getCurrentTime());
                id = setTimeout(this.onTrigger.bind(this,opts), time);
            }
        }
        this.alertIndex[category] = id;
        pgUI_showLog("Set "+category+" notification for: " + atTime);
    }
};

Notify.prototype.getOpts = function(category, atTime, txt, sound, notify) {
    //var catData  = pg.getCategoryData(category);
    var opts = {
        "sound":      sound,
        "trigger":    { "at": new Date(atTime)},
        "foreground": true,
        "data":       {"category": category,
                       "time":     atTime,
                       "notify":   notify,
                       "id":       pg.uniqueEventID()}
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
        opts.actionGroupId = 'mindful';
    }
    opts.data = JSON.stringify(opts.data);
    return opts;
};
    
    // Call any missed callbacks that have elapsed.
Notify.prototype.callElapsed = function(category, running, initializing) {
    if(this.usePlugin) {
        cordova.plugins.notification.local.getTriggered(triggeredCB.bind(this, category, running, initializing));
    }
    else {
        if(initializing) {
            try {
                var id = this.alertIndex[category];
                if (id)
                    clearTimeout(id);
            } catch(err) {}
        }
        else {
            // xxx no notification for this?
        }
    }
    function triggeredCB(category, running, initializing, notifications) {
        // combine notifications with clicked events
        var oldLen = notifications.length;
        notifications = notifications.concat(this.clicked);
        delete(this.clicked);
        this.clicked = [];

        var latestData      = {};
        latestData.alarm    = true;
        latestData.time     = 0;
        latestData.category = category;
        latestData.elapsed  = false;
        if(this.callback && notifications.length) {
            for(var note in notifications) {
                oldLen--;
                var data = notifications[note].data;
                if(typeof(data)==="string") // weirdness in the recent notifcation
                    data = JSON.parse(data);
                if( category === data.category ) {
                    if(data.time > latestData.time && data.notify) {
                        latestData = JSON.parse(JSON.stringify(data));
                        latestData.elapsed = true;//(oldLen < 0);
                    }
                    this.removeID(notifications[note].id);
                }
            }
        }
        if(latestData.time) { // found an event
            latestData.time = pgUtil.getCurrentTime(); // we regard the alarm as having elapsed... now.
            latestData.id = pg.uniqueEventID();
            this.callback(latestData, running);
        }
        else { // no event
            if(initializing)
                cordova.plugins.notification.local.getScheduled(scheduledCB.bind(this, category, running));
        }
    }
    function scheduledCB(category, running, notifications) {
        // the clock is running, but there is no pending event.
        // Do the callback with a zero time.
        var pending = false;
        if(this.callback && notifications.length) {
            now = pgUtil.getCurrentTime();
            for(var note in notifications) {
                var data = JSON.parse(notifications[note].data);
                if(data.category===category && data.notify) {
                    pending = true;
                    break;
                }
            }
        }
        if(running && !pending) {
            latestData = {};
            latestData.category = category;
            latestData.elapsed  = true;
            latestData.alarm    = true;
            latestData.time     = 0;
            latestData.id       = pg.uniqueEventID();
            this.callback( latestData, running );
        }
        if(!running && pending) {
            for(var note in notifications) {
                var data = JSON.parse(notifications[note].data);
                if(data.category === category) {
                    var id = notifications[note].id;
                    cordova.plugins.notification.local.cancel( id );
                }
            }
        }
    }
};

Notify.prototype.removeCategory = function(category) {
    if(!this.usePlugin) {
        this.removeID(this.alertIndex[category]);
        this.alertIndex[category] = null;
        return;
    }
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
        this.alertIndex[category] = null;
        function process(note) {
            var id   = note.id;
            var data = JSON.parse(note.data);
            // xxx This is broken upstream: it should not be double-encoded.
            data = JSON.parse(data);
            if(data.category === category)
                cordova.plugins.notification.local.cancel( id );
        }
    }
};
Notify.prototype.removeID = function(id) {
    for(ndx in this.alertIndex) {
        if(this.alertIndex[ndx] === id)
            this.alertIndex[ndx] = 0;
    }
    if(this.usePlugin) {
        cordova.plugins.notification.local.cancel( id );
    }
    else {
        clearTimeout(id);
    }
};

Notify.prototype.removeAll = function() {
    for(var cat in this.alertIndex) {
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
};
Notify.prototype.onTrigger = function(notification) {
    var data = JSON.parse(notification.data);
    for(ndx in this.alertIndex) {
        if(this.alertIndex[ndx] === notification.id)
            this.alertIndex[ndx] = 0;
    }
    // If we did this, the notification would dismiss immediately.
    //this.removeCategory(data.category);
    data.alarm = true;
    data.elapsed = true;
    data.text  = notification.text;
    data.title = notification.title;
    data.sound = notification.sound;
    if(this.callback && data.notify) {
        this.callback(data);
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
    // unfortunately, the ID might have changed (it was negative).
    // so, we look up events at that exact millisecond.
    var e = pg.getEventsAtTime(data.time);
    pg.addEventDataField(e[0].id, 'mindful', tf);
};

Notify.prototype.setCallback = function(callback) {
    this.callback = callback;
};

var pgNotify = new Notify();
