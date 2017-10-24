

var pgNotify = {
    // for notifying the user
    //IDs:        [],
    nextID:     1,
    alertIndex: {},
    usePlugin:  undefined,
    callback:   null,
    clicked:    [],
    inTrigger:  false,
    
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
        var catData  = pg.getCategoryData(category);
        var txt      = pg.getCategoryText(category);
        var len      = txt.text.length;
        var opts = {
            "sound":    "",
            "at":       new Date(atTime),
            "data":     {"category": category, "time": atTime}
        };
        if(category == "Uncategorized") {
            opts.title      = " ";
            opts.data.title = " ";
        }
        else {
            opts.title      = txt.title;
            opts.data.title = txt.title;
        }
        if(hasText) {
            if(len) {
                var text = txt.text[pgUtil.randomInt(0,len-1)];
                // should the following happen only on IOS?
                var re = new RegExp("<br/>", "g");
                text = text.replace(re, "\n");
                opts.text = text;
                opts.data.text = text;
            }
        }
        if(hasSound) {
            pgAudio.getCategorySound(category, true, cb.bind(this, opts));
            // We need to play the sound ourselves if we want to turn it off by shaking.
        }
        else
            cb(opts, opts.sound);
        
        function cb(opts,fn) {
            opts.sound = fn;
            pgNotify.add(category, opts);
            showLog("Set "+category+" notification for: " + atTime + " using "+opts.sound);
        }
    },
    
//timer.prototype.alarm = function(category, opts) {
//    var data = this.getPageData(category);
//    if(opts.alarm) {
//        if(opts.elapsed==false)
//            opts = pgNotify.getNotificationOpts(category, 0);
//        if((data.timerAlarm=="text" || data.timerAlarm=="both") &&
//           category==pg.category()) {
//            if(opts.text!="undefined") {
//                // xxx this should be shown by pgNotify
//                showAlert(opts.text, opts.title);
//            }
//        }
//    }
//};

    add: function(category, opts) {
        pgNotify.init();
        // At time, optionally:
        // * show text/title alert
        // * play sound
        // * perform callback
        
        // show the icon only on android
        if(!pgUtil.isWebBrowser() && device.platform=="Android")
            opts.icon = "res://icon.png";
        // opts.icon = "file://assets/www/img/logo.png";
        // remove the showText field
        delete opts.showText;
        
        if(pgNotify.alertIndex[category]) {
            showLog("Error: pending notification in " + category);
            pgNotify.remove(category);
        }

        var id;
        if(pgNotify.usePlugin) {
            id = pgNotify.nextID++;
            opts.text = $(opts.text).text(); // convert to plain text
            opts.id   = id;
            cordova.plugins.notification.local.schedule(opts);
        }
        else {
            var time = Math.abs(opts.data.time - pgUtil.getCurrentTime());
            opts.data = JSON.stringify(opts.data); // to be conformant with local notifications.
            id = setTimeout(pgNotify.onTrigger.bind(this,opts), time);
        }
        pgNotify.alertIndex[category] = id;
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
            
            var latestData = {};
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
                        if(data.time > latestData.time) {
                            latestData = JSON.parse(JSON.stringify(data));
                            latestData.elapsed = true;//(oldLen < 0);
                        }
                        pgNotify.removeID(notifications[note].id);
                    }
                }
            }
            if(latestData.time) { // found an event
                latestData.time = pgUtil.getCurrentTime(); // we regard the alarm as having elapsed... now.
                pgNotify.callback( latestData );
                // xxx showAlert(opts.text, opts.title);
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
                    if(data.category == category) {
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
                pgNotify.callback( latestData );
                // xxx showAlert(opts.text, opts.title);
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
    
    remove: function(category) {
        // This should be the only method that removes notifications.
        // otherwise we will have ID's for notifications that no longer exist.
        var id = pgNotify.alertIndex[category];
        if(id) {
            if(pgNotify.usePlugin) {
                if(!pgNotify.inTrigger)
                    cordova.plugins.notification.local.cancel( id );
            }
            else {
                clearTimeout(id);
            }
        }
        //delete(pgNotify.alertIndex[category]);
        pgNotify.alertIndex[category] = null;
    },
    removeID: function(id) {
        // try to use the remove() method if there is a category match.
        for(var cat in pgNotify.alertIndex) {
            var localID = pgNotify.alertIndex[cat];
            if(localID && localID == id) {
                pgNotify.remove(cat);
                return;
            }
        }
        // we dont have an index, it might be an expired notification from a previous session
        if(pgNotify.usePlugin) {
            cordova.plugins.notification.local.cancel( id );
        }
        else {
            clearTimeout(id);
        }
    },
    removeAll: function() {
        for(var cat in pgNotify.alertIndex) {
            pgNotify.remove(cat);
        }
        if(pgNotify.usePlugin) {
            // just to be sure
            cordova.plugins.notification.local.cancelAll();
        }
        else {
            // xxx
        }
    },
    onClick: function(notification) {
        var len = pgNotify.clicked.length;
        pgNotify.clicked[len] = notification;
        //pgNotify.removeAll();
        //if(notification.text && notification.title)
        //    showAlert(notification.text, notification.title);
        //if(pgNotify.callback) {
        //    var data = JSON.parse(notification.data);
        //    pgNotify.callback(data);
        //}
    },
    onTrigger: function(notification) {
        var data = JSON.parse(notification.data);
        pgNotify.remove(data.category);
        data.alarm = true;
        data.elapsed = true;
        data.text  = notification.text;
        data.title = notification.title;
        data.sound = notification.sound;
        if(pgNotify.callback) {
            pgNotify.callback(data);
        }
        pgNotify.alarm(data);
    },
    alarm: function(opts) {
        // sound the alarm!
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
            // If our app is open, the system does not display a notification, so we do so here.
            if(opts.text) {
                showAlert(opts.text, opts.title);
            }
            if(opts.sound) {
                var idx = pgAudio.alarm(opts.category);
                setPageChangeCallback(function(){pgAudio.stopAlarm(idx)});
            }
        }
    },
    setCallback: function(callback) { 
        pgNotify.callback = callback;
    }
};
