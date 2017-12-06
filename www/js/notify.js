

var pgNotify = {
    // for notifying the user
    //IDs:        [],
    nextID:      1,
    alertIndex:  {},
    usePlugin:   undefined,
    callback:    null,
    clicked:     [],
    inTrigger:   false,
    
    init: function(cb) {
        if(typeof(pgNotify.usePlugin)=="undefined") {
            pgNotify.usePlugin = !pgUtil.isWebBrowser();
            if(pgNotify.usePlugin) {
                cordova.plugins.notification.local.on("click", pgNotify.onClick);
                cordova.plugins.notification.local.on("trigger", pgNotify.onTrigger);
            }
            pgNotify.nextID = Math.floor(Math.random() * 10000);
            //cordova.plugins.notification.local.getAll(
            //    function (notifications) {
            //        for(var note in notifications) {
            //            var data = JSON.parse(notifications[note].data);
            //            pgNotify.alertIndex[data.category] = notifications[note].id;
            //            if(typeof(pgNotify.alertIndex[data.category]) != "undefined") 
            //                showLog("Error: previous notification for " + category);
            //        }
            //    });
            return true;
        }
        return false;
    },
    state: function(newState) {
        pgNotify.init();
        if(typeof(newState) != "undefined") {
            pgNotify.alertIndex = newState;
        }
        return pgNotify.alertIndex;
    },
    
    setNotification: function(category, atTime, hasText, hasSound) {
        pgNotify.init();
        if(pgNotify.alertIndex[category]) {
            showLog("Error: pending notification in " + category);
            pgNotify.removeCategory(category);
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
            var txt = null;
            for(var i=numNotifications-1; i>=0; i--) {
                if(hasText)
                    txt = pg.getCategoryText(category);
                var notify = i==0;
                var opts = this.getOpts(category, atTime[i], txt, sound, notify);
                if(pgNotify.usePlugin) {
                    opts.id = pgNotify.nextID++;
                    cordova.plugins.notification.local.schedule(opts);
                    id = opts.id;
                }
                else {
                    var time = Math.abs(atTime - pgUtil.getCurrentTime());
                    id = setTimeout(pgNotify.onTrigger.bind(this,opts), time);
                }
            }
            pgNotify.alertIndex[category] = id;
            showLog("Set "+category+" notification for: " + atTime);
        }
    },
    
    getOpts: function(category, atTime, txt, sound, notify) {
        //var catData  = pg.getCategoryData(category);
        var opts = {
            "sound":      sound,
            "trigger":    { "at": new Date(atTime)},
            "foreground": true,
            "data":       {"category": category, 
                           "time":     atTime,
                           "notify":   notify}
        };
        // show the icon only on android
        if(!pgUtil.isWebBrowser() && device.platform=="Android")
            opts.icon = "res://icon.png";
        if(category == "Uncategorized") {
            opts.title      = " ";
            opts.data.title = " ";
        }
        else {
            opts.title      = txt.title;
            opts.data.title = txt.title;
        }
        if(txt) {
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
        if(pgNotify.usePlugin) {
            opts.text = $(opts.text).text(); // convert to plain text
        }
        opts.data = JSON.stringify(opts.data);
        return opts;
    },
    
    // Call any missed callbacks that have elapsed.
    callElapsed: function(category, running, initializing) {
        if(pgNotify.usePlugin) {
            cordova.plugins.notification.local.getTriggered(triggeredCB.bind(this, category, running, initializing));
        }
        else {
            if(initializing) {
                var id = this.alertIndex[category];
                if(id)
                    clearTimeout(id);
            }
            else {
                // xxx no notification for this?
            }
        }
        function triggeredCB(category, running, initializing, notifications) {
            // combine notifications with clicked events
            var oldLen = notifications.length;
            notifications = notifications.concat(pgNotify.clicked);
            delete(pgNotify.clicked);
            pgNotify.clicked = [];
            
            var latestData      = {};
            latestData.alarm    = true;
            latestData.time     = 0;
            latestData.category = category;
            latestData.elapsed  = false;
            if(pgNotify.callback && notifications.length) {
                for(var note in notifications) {
                    oldLen--;
                    var data = notifications[note].data;
                    if(typeof(data)=="string") // weirdness in the recent notifcation
                        data = JSON.parse(data);
                    if( category == data.category ) {
                        if(data.time > latestData.time && data.notify) {
                            latestData = JSON.parse(JSON.stringify(data));
                            latestData.elapsed = true;//(oldLen < 0);
                        }
                        pgNotify.removeID(notifications[note].id);
                    }
                }
            }
            if(latestData.time) { // found an event
                latestData.time = pgUtil.getCurrentTime(); // we regard the alarm as having elapsed... now.
                pgNotify.callback(latestData, running);
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
            if(pgNotify.callback && notifications.length) {
                now = pgUtil.getCurrentTime();
                for(var note in notifications) {
                    var data = JSON.parse(notifications[note].data);
                    if(data.category==category && data.notify) {
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
                pgNotify.callback( latestData, running );
            }
            if(!running && pending) {
                for(var note in notifications) {
                    var data = JSON.parse(notifications[note].data);
                    if(data.category == category) {
                        var id = notifications[note].id;
                        cordova.plugins.notification.local.cancel( id );
                    }
                }
            }
        }
    },
    
    removeCategory: function(category) {
        if(!pgNotify.usePlugin) {
            pgNotify.removeID(pgNotify.alertIndex[category]);
            pgNotify.alertIndex[category] = null;
            return;
        }
        cordova.plugins.notification.local.getAll(cb);
        function cb(notifications) {
            if(!notifications)
                showLog("Invalid NULL notification in removeList");
            else if(Array.isArray(notifications)) {
                for(var n in notifications)
                    process(notifications[n]);
            }
            else
                process(notifications);
            pgNotify.alertIndex[category] = null;
            function process(note) {
                var id   = note.id;
                var data = JSON.parse(note.data);
                // xxx This is broken upstream: it should not be double-encoded.
                data = JSON.parse(data);
                if(data.category == category)
                    cordova.plugins.notification.local.cancel( id );
            }
        }
    },
    removeID: function(id) {
        for(ndx in pgNotify.alertIndex) {
            if(pgNotify.alertIndex[ndx] == id)
                pgNotify.alertIndex[ndx] = 0;
        }
        if(pgNotify.usePlugin) {
            cordova.plugins.notification.local.cancel( id );
        }
        else {
            clearTimeout(id);
        }
    },
    /*
    removeList: function(note) {
        if(!note)
            showLog("Invalid NULL notification in removeList");
        else if(Array.isArray(note)) {
            for(var n in note)
                process(n);
        }
        else
            process(note);
        function process(note) {
            if(note.hasOwnProperty('id'))
                cordova.plugins.notification.local.cancel( note.id );
            else
                showLog("Invalid notification ID in removeList");
            if(note.hasOwnProperty('data')) {
                var data = JSON.parse(note.data);
                cordova.plugins.notification.local.cancel( note.id );
                if(data.nextID)
                    cordova.plugins.notification.local.get(data.nextID, pgNotify.removeList.bind(this));
            }
        }
    },
    */
    removeAll: function() {
        for(var cat in pgNotify.alertIndex) {
            pgNotify.removeCategory(cat);
        }
        if(pgNotify.usePlugin) {
            // just to be sure
            cordova.plugins.notification.local.cancelAll();
        }
    },
    onClick: function(notification) {
        var len = pgNotify.clicked.length;
        pgNotify.clicked[len] = notification;
    },
    onTrigger: function(notification) {
        var data = JSON.parse(notification.data);
        for(ndx in pgNotify.alertIndex) {
            if(pgNotify.alertIndex[ndx] == notification.id)
                pgNotify.alertIndex[ndx] = 0;
        }
        // If we did this, the notification would dismiss immediately.
        //pgNotify.removeCategory(data.category);
        data.alarm = true;
        data.elapsed = true;
        data.text  = notification.text;
        data.title = notification.title;
        data.sound = notification.sound;
        if(pgNotify.callback && data.notify) {
            pgNotify.callback(data);
        }
        pgNotify.alarm(data);
    },
    alarm: function(opts) {
        if(!pgNotify.usePlugin) {
            if(opts.text) {
                showAlert(opts.text, opts.title);
            }
            if(opts.sound) {
                var idx = pgAudio.alarm(opts.category);
                setPageChangeCallback(function(){pgAudio.stopAlarm(idx)});
            }
        }
        else {
            if(device.platform=="Android" && pg.background)
                return;
            // If our app is open, the system does not display a notification, so we do so here.
            //if(opts.text) {
            //    showAlert(opts.text, opts.title);
            //}
            //if(opts.sound) {
            //    var idx = pgAudio.alarm(opts.category);
            //    setPageChangeCallback(function(){pgAudio.stopAlarm(idx)});
            //}
        }
    },
    setCallback: function(callback) { 
        pgNotify.callback = callback;
    }
};
