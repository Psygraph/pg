
function timer() {
    page.call(this, "timer");
    this.clock             = null;
    // the following two are per-category.
    this.startTime         = {};
    this.countdownDuration = {};

    this.timerWidget    = null;
    this.durationWidget = null;
}

timer.prototype = Object.create(page.prototype);
timer.prototype.constructor = timer;

timer.prototype.update = function(show, state) {
    var initializing = ! this.clock;
    if(initializing) {
        this.timerWidget    = $('#countdown_timer');
        this.durationWidget = $('#countdown_duration');
        pgNotify.setCallback(this.notificationCallback.bind(this));
        this.clock  = new Clock(this.timerCallback.bind(this), 50, function(a,b,c){});
    }
    var category = pg.category();
    if(!show) {
        if(this.clock)
            this.clock.stop();
        var notifyState = pgNotify.state();
        //showLog("Storing startTime: " + pgUtil.getStringFromMS(this.startTime.Uncategorized) );
        return {'startTime': this.startTime, 
                'countdownDuration': this.countdownDuration, 
                'notifyState': notifyState };
    }
    //showLog("startTime: " + pgUtil.getStringFromMS(this.startTime.Uncategorized) );
    if(typeof(state) != "undefined") {
        this.startTime = state.startTime;
        this.countdownDuration = state.countdownDuration;
        //showLog("Restoring startTime: " + pgUtil.getStringFromMS(this.startTime.Uncategorized) );
        pgNotify.state(state.notifyState);
    }
    this.refreshTimer(category);
    if(initializing) {  // see if there are any notifications that need to be removed.
        // we have to run this after setting the state because we set the startTime
        for(var i=0; i<pg.categories.length; i++) {
            var cat = pg.categories[i];
            if(typeof(this.countdownDuration[category])=="undefined") {
                var e = this.getElapsedTimer(category);
                this.countdownDuration[category] = e.countdownTime;
            }
            var running = this.running(cat);
            pgNotify.callElapsed(cat, running, true);
        }
    }
    this.resize();
};

timer.prototype.refreshTimer = function(category) {
    category = (typeof(category) != "undefined") ? category : pg.category();
    var data = this.getPageData();
    var e = this.getElapsedTimer(category);
    if(typeof(this.countdownDuration[category])=="undefined")
        this.countdownDuration[category] = e.countdownTime;
    this.durationWidget.val(pgUtil.getStringFromMS(this.countdownDuration[category]));
    this.clock.setCountdown(this.countdownDuration[category]);
    if(e.running == 1) {
        this.clock.startFromTime(e.startTime);
    }
    else {
        this.clock.setElapsedMS(e.duration);
    }
    $("#countdown_duration").show();
    if(e.running == 1) {
        $('#timer_start').hide().prop('disabled', true);
        $('#timer_stop').show().prop('disabled', false);
    } else {
        $('#timer_start').show().prop('disabled', false);
        $('#timer_stop').hide().prop('disabled', true);
    }
    return e.running;
};

timer.prototype.settings = function() {
    if(arguments.length) {
        var data = this.getPageData();
        var s = "";
        s += "<div class='ui-field-contain no-field-separator'>";
        s += "  <label for='timerAlarm'>Timer alarm:</label>";
        s += "  <select id='timerAlarm' value='Timer alarm' title='Timer alarm' data-native-menu='false'>";
        s += "    <option value='none'>none</option>";
        s += "    <option value='text'>text</option>";
        s += "    <option value='sound'>sound</option>";
        s += "    <option value='both'>both</option>";
        s += "  </select>";
        s += "</div>";
        s += "<div class='ui-field-contain no-field-separator' data-role='controlgroup'>";
        s += "<legend>Loop:</legend>";
        s += printCheckbox("loop", "Loop", data['loop']);
        s += "</div>";

        if(pg.getUserDataValue("debug")) {
            s += "<div class='ui-field-contain no-field-separator'>";
            s += "  <label for='extraAlarms:'>Additional alarms:</label>";
            var alarmVal = data.extraAlarms.toString();
            s += "  <input class='settings' type='text' id='extraAlarms' value='"+alarmVal+"'/>";
            s += "</div>";
        }
        s += "<div class='ui-field-contain no-field-separator'>";
        s += "  <label for='countdownTime'>Countdown Time (d,h,m,s):</label>";
        var timeVal = pgUtil.getStringFromMS(data.countdownTime);
        s += "  <input class='settings' type='text' id='countdownTime' value='"+timeVal+"'/>";
        s += "</div>";
        s += "<div class='ui-field-contain no-field-separator'>";
        s += "  <label for='randomInterval'>Random interval (d,h,m,s):</label>";
        var randVal = pgUtil.getStringFromMS(data.randomInterval);
        s += "  <input class='settings' type='text' id='randomInterval' value='"+randVal+"'/>";
        s += "</div>";
        
        UI.settings.setPageContent(s);
        $("#timerAlarm").val(data.timerAlarm).change();

        var dbOpts = {
            mode: "durationflipbox",
            //useInline: false,
            useButton: true,
            lockInput: false,
            showInitialValue: true
        };
        $('#countdownTime').datebox(dbOpts);
        $('#randomInterval').datebox(dbOpts);
        // the following are necessary to get dateBox to display the icon within the input element.
        $('#countdownTime').parent().parent().css('display','flex');
        $('#randomInterval').parent().parent().css('display','flex');
        var initDate = $("#countdownTime").data('jtsage-datebox').initDate;
        $('#countdownTime').datebox('setTheDate', new Date(initDate.getTime() + Math.round(data.countdownTime,1000) ));
        $('#randomInterval').datebox('setTheDate', new Date(initDate.getTime() + Math.round(data.randomInterval,1000) ));
        UI.settings.pageCreate();
    }
    else {
        this.refreshTimer();
        var data = {
            //timerType:      $("#timerType").val(),
            timerAlarm:     $("#timerAlarm").val(),
            loop:           $("#loop")[0].checked,
            countdownTime:  pgUtil.getMSFromString($("#countdownTime").val()),
            randomInterval: pgUtil.getMSFromString($("#randomInterval").val())
        };
        var oldData = this.getPageData();
        if(pg.getUserDataValue("debug"))
            data.extraAlarms = parseInt($("#extraAlarms").val());
        else
            data.extraAlarms = oldData.extraAlarms;
        var countdownTime = Math.floor(data.countdownTime + data.randomInterval * Math.random() );
        // should the following set all categories?
        var category = pg.category();
        this.countdownDuration[category] = countdownTime;
        this.refreshTimer(category);
        return data;
    }
};

//timer.prototype.changeCountdownValue = function(value) {
//var data = this.getPageData();
//data.countdownTime = value;//this.durationWidget.value;
// no way to update this value xxx
//this.setPageData(data);
//}
timer.prototype.running = function(cat) {
    return this.startTime.hasOwnProperty(cat) && (this.startTime[cat] > 0);
};
    
timer.prototype.getPageData = function(category) {
    category = (typeof(category) != "undefined") ? category : pg.category();
    var data = pg.getPageData("timer", category);
    if(! ('timerAlarm' in data))
        data.timerAlarm     = "sound";
    if(! ('loop' in data))
        data.loop           = 0;
    if(! ('countdownTime' in data))
        data.countdownTime  = 60*1000;
    if(! ('randomInterval' in data))
        data.randomInterval = 0;
    if(! ('extraAlarms' in data))
        data.extraAlarms = 0;
    return data;
};

timer.prototype.lever = function(arg) {
    if(arg=="left") {
        this.reset(pg.category(), false);
    }
    else if(arg=="right") {
        this.startStop();
    }
};

timer.prototype.setNotification = function(category, atTime) {
    if(atTime < pgUtil.getCurrentTime()) {
        atTime = pgUtil.getCurrentTime() + 200;
        showLog("Error: notification scheduled in the past.");
    }
    var pageData = this.getPageData(category);
    var hasSound = pageData.timerAlarm=="sound" || pageData.timerAlarm=="both";
    var hasText  = pageData.timerAlarm=="text" || pageData.timerAlarm=="both";
    var data = this.getPageData(category);
    var times = [atTime];
    if(data.loop) {
        for(var i=0; i<data.extraAlarms; i++) 
            times[times.length] = times[times.length-1] + this.computeNewInterval(category);
    }
    pgNotify.setNotification(category, times, hasText, hasSound);
};

timer.prototype.unsetNotification = function(category) {
    pgNotify.removeCategory(category);
    showLog("Unset "+category+" notification.");
};

timer.prototype.notificationCallback = function(data, running) {
    running = typeof(running)!= "undefined" ? running : false;
    // remove the notification. This allows our app to play sound and display text.
    showLog("Received " +data.category +" notification callback at: " + pgUtil.getCurrentTime() + " with time : " + data.time);
    var eventRunning;
    if(data.time != 0) {
        eventRunning = this.refreshTimer(data.category);
        this.reset(data.category, true, data);
    }
    else {
        // There was no notification, but perhaps there should have been.
        // Call reset anyway to restart the clock.
        eventRunning = this.refreshTimer(data.category);
        if(running) {
            this.reset(data.category, true);
            //this.startStop(data.category); //stop
            //this.startStop(data.category); //start
        }
    }
    //if(running != eventRunning)
    //showAlert("eventRunning: "+eventRunning+", running: "+running);
};

timer.prototype.timerCallback = function(ms) {
    var str = pgUtil.getStringFromMS(ms, true);
    this.timerWidget.val(str);
    //var category = page.category();
    //var startMsec = this.startTime[category];
    //var frac = 100 * (startMsec-ms) / startMsec;
    //$('#timer_knob').val(frac).trigger('change');
};

timer.prototype.startStop = function(category, time) {
    category = (typeof(category) != "undefined") ? category : pg.category();
    var remaining = this.clock.getRemaining();
    if(remaining==0 && !this.running(category) ) {
        this.reset(category, false);
        remaining = this.clock.getRemaining();
    }
    time = (typeof(time) != "undefined") ? time : pgUtil.getCurrentTime()+1;// this will occur after any reset
    var currentPage = pg.page()=="timer" && pg.category()==category;
    if(! this.running(category)) {
        var data = this.getPageData(category);
        var dur = this.countdownDuration[category];
        if(dur==0)
            return;  // there is no zero-length countdown.
        this.clock.setCountdown(dur);
        this.clock.start();
        $('#timer_start').hide().prop('disabled', true);
        $('#timer_stop').show().prop('disabled', false);
        this.startTime[category] = time;
        // Set a notification.
        // This may mean that both the timer and the notification attempt to trigger the Reset()
        this.setNotification(category, time + remaining);
    }
    else {
        this.unsetNotification(category);
        this.clock.stop();
        $('#timer_start').show().prop('disabled', false);
        $('#timer_stop').hide().prop('disabled', true);
        pg.addNewEvents({'page': "timer",
                    'type': "interval",
                    'start': this.startTime[category],
                    'duration': time - this.startTime[category],
                    }, true);
        this.startTime[category] = 0;
        this.refreshTimer(category);
        //this.unsetNotification(category);
    }
    syncSoon(true);
    return false;
};

timer.prototype.computeNewInterval = function(category) {
    var data = this.getPageData(category);
    var interval = Math.floor(data.countdownTime + data.randomInterval * Math.random() );
    return interval;
};

timer.prototype.reset = function(category, complete, notification) {
    var isNotification = (typeof(notification) != "undefined") ? true : false;
    var time           = pgUtil.getCurrentTime();
    var currentPage    = (pg.page()=="timer") && (pg.category()==category);
    var data           = this.getPageData(category);
    var newInterval    = this.countdownDuration[category];//pgUtil.getMSFromString(this.durationWidget.value);
    var scheduledEnd   = this.startTime[category] + this.countdownDuration[category];
    if(isNotification)
        scheduledEnd = notification.time;
    var finished       = complete && data.loop==0;

    // add the new event
    if(complete) {
        newInterval = this.computeNewInterval(category);
        this.countdownDuration[category] = newInterval;
    }
    var edata = {'resetTime': newInterval, 'complete': complete};
    pg.addNewEvents({'page': "timer", 'type': "reset", 'category': category, 'start': time, 'data': edata}, true);
    
    // trigger startStop if we have finished
    if(finished) {
        // set the start time, execute the alarm.
        if(this.running(category))
            this.startStop(category, scheduledEnd); // was "time", could be notification.time
        if(currentPage)
            this.refreshTimer(category);
    }
    else {
        // If we are called from the pgNotify callback, reschedule
        if(newInterval) {
            if(complete) {
                if(isNotification) {
                    this.setNotification(category, time + newInterval);
                }
            }
            else {
                if(this.running(category)) {
                    this.unsetNotification(category);
                    this.setNotification(category, time + newInterval);
                }
            }
        }
        
        // if this is the current page, update the clock
        if(currentPage) {
            this.refreshTimer(category);
        }
    }
    // execute the alarm.
    //if(complete && isNotification)
    //    this.alarm(category, notification);
    syncSoon();
    return false;
};

timer.prototype.getElapsedTimer = function(category) {
    var e              = pg.getEventsInPage("timer", category);
    var startTime      = 0;
    if(this.startTime.hasOwnProperty(category))
        startTime = this.startTime[category];
    var running        = startTime != 0;
    var data           = this.getPageData(category);
    //var countdownTime  = data.countdownTime;
    var countdownTime  = Math.floor(data.countdownTime + data.randomInterval * Math.random() );
    var duration       = 0.0;
    var resetTime      = 0.0;
    
    if(running) {
        var elapsedTime = 0.0;
        for(var i=0; i<e.length; i++) {
            var event = pgUtil.parseEvent(e[i]);
            if(event.type=="interval") {
                var eventStartTime = event.start;
                var eventDuration  = event.duration;
                var eventStopTime  = event.start + event.duration;
                if(resetTime) {
                    if(eventStopTime > resetTime) {
                        elapsedTime += (eventStopTime-resetTime);
                    }
                    break;
                }
                else
                    elapsedTime += event.duration;
            }
            else if(event.type == "reset") {
                if(resetTime == 0) {
                    countdownTime = parseInt(event.data.resetTime);
                    resetTime     = event.start;
                }
                if(event.start > startTime) {
                    startTime = event.start;
                }
            }
        }
        startTime   -= elapsedTime;
    }
    else {
        for(var i=0; i<e.length; i++) {
            var event = pgUtil.parseEvent(e[i]);
            if(event.type=="interval") {
                var eventStartTime = event.start;
                var eventDuration  = event.duration;
                var eventStopTime  = event.start + event.duration;
                if(resetTime) {
                    if(eventStopTime > resetTime) {
                        // running at the time of the reset.
                        if(eventStartTime > resetTime) {
                            // error in event order
                        }
                        // stopped at the time of reset
                        duration += (eventStopTime-resetTime);
                        //duration += (resetTime - eventStartTime);
                    }
                    break;
                }
                else
                    duration += event.duration;
            }
            else if(event.type == "reset") {
                if(!resetTime) {
                    countdownTime = parseInt(event.data.resetTime);
                    resetTime     = event.start;
                }
            }
        }
    }
    // If we are running, the client should use the start time.
    // otherwise, the client should use the duration.
    var ans = {'countdownTime': countdownTime, 'startTime': startTime, 'duration': duration, 'running': running};
    return ans;
};

UI.timer = new timer();
//# sourceURL=timer.js
