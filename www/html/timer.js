
function Timer() {
    ButtonPage.call(this, "timer");
    this.clock             = null;

    this.tempCategory = null;
    this.visible = true;

    this.timerWidget    = $('#countdown_timer');
    this.durationWidget = $('#countdown_duration');
}

Timer.prototype = Object.create(ButtonPage.prototype);
Timer.prototype.constructor = Timer;

Timer.prototype.update = function(show, data) {
    ButtonPage.prototype.update.call(this, show, data);
    if(show) {
        var initializing = !this.clock;
        if (initializing) {
            this.durationWidget.prop("disabled", true);
            pgNotify.setCallback(this.notificationCallback.bind(this));
            this.clock = new Clock(this.timerCallback.bind(this), 50, function (a, b, c) {});
            // see if there are any notifications that need to be removed.
            // we have to run this after setting the state because we set the startTime
            pgNotify.callElapsed(pg.category(), this.isRunning(), true);
            this.pushCategory(pg.category());
            for (var i = 0; i < pg.categories.length; i++) {
                if(this.tempCategory === pg.categories[i])
                    continue;
                gotoCategory(pg.categories[i]);
                pgNotify.callElapsed(pg.category(), this.isRunning(), true);
            }
            this.popCategory();
        }
        if(this.visible) {
            var restart = this.isRunning();
            if (restart)
                this.start(true);
            else
                this.refreshTimer();
            this.resize();
        }
    }
    else {
        if(this.clock)
            this.clock.stop();
    }
    return data;
};

Timer.prototype.pushCategory = function(cat) {
    this.tempCategory = pg.category();
    this.visible = false;
    if(cat !== pg.category())
        gotoCategory(cat);
};
Timer.prototype.popCategory = function() {
    gotoCategory(this.tempCategory);
    this.tempCategory = null;
    this.visible = true;
};
Timer.prototype.refreshTimer = function() {
    var data = this.getPageData();
    this.durationWidget.val(pgUtil.getStringFromMS(data.countdownTime));
    this.clock.setCountdown(data.countdownTime);
    var e = this.getElapsedTimer();
    if(this.isRunning()) {
        this.clock.startFromTime(e.startTime);
    }
    else {
        this.clock.setElapsedMS(e.duration);
    }
};

Timer.prototype.settings = function(show, data) {
    if(show) {
        $("#timer_alarm").val(data.timerAlarm).change();
        $("#timer_loop").prop('checked', data.loop).checkboxradio("refresh");
        $("#countdown_setDuration").val(pgUtil.getStringFromMS(data.countdownInterval));
        $("#countdown_setRandom").val(pgUtil.getStringFromMS(data.randomInterval));
        if(pgUtil.isWebBrowser())
            $("#timer_extraAlarmsDiv").hide();
    }
    else {
        data.timerAlarm        = $("#timer_alarm").val();
        data.loop              = $("#timer_loop")[0].checked;
        data.countdownInterval = pgUtil.getMSFromString($("#countdown_setDuration").val());
        data.randomInterval    = pgUtil.getMSFromString($("#countdown_setRandom").val());
        data.extraAlarms       = parseInt($("#timer_extraAlarms").val());
        data.countdownTime     = this.computeNewCountdown(data);
        this.refreshTimer(data);
    }
    return data;
};

Timer.prototype.resize = function() {
    Page.prototype.resize.call(this, false);
};

Timer.prototype.getPageData = function() {
    var data = pg.getPageData("timer", pg.category());
    if(! ('timerAlarm' in data))
        data.timerAlarm = "both";
    if(! ('loop' in data))
        data.loop = 0;
    if(! ('startTime' in data))
        data.startTime = 0;
    if(! ('countdownInterval' in data))
        data.countdownInterval = 4*1000;
    if(! ('randomInterval' in data))
        data.randomInterval = 4*1000;
    if(! ('extraAlarms' in data))
        data.extraAlarms = 0;
    if(! ('countdownTime' in data))
        data.countdownTime  = this.computeNewCountdown(data);
    return data;
};

Timer.prototype.setNotification = function(atTime) {
    if(atTime < pgUtil.getCurrentTime()) {
        atTime = pgUtil.getCurrentTime() + 200;
        pgUI_showLog("Error: notification scheduled in the past.");
    }
    var pageData = this.getPageData();
    var hasSound = pageData.timerAlarm==="sound" || pageData.timerAlarm==="both";
    var hasText  = pageData.timerAlarm==="text" || pageData.timerAlarm==="both";
    var data = this.getPageData();
    var times = [atTime];
    //if(data.loop) {
        for(var i=0; i<data.extraAlarms; i++) 
            times[times.length] = times[times.length-1] + this.computeNewCountdown();
    //}
    this.unsetNotification();
    pgNotify.setNotification(pg.category(), times, hasText, hasSound);
};

Timer.prototype.unsetNotification = function() {
    pgNotify.removeCategory(pg.category());
    pgUI_showLog("Unset "+pg.category()+" notification.");
};

// The following method has posed a problem for the infrastructure because it is a notification
// which may pertain to a non-current category (i.e. not the one returned by pg.category() ).
// We used to pass around a category parameter, which is error prone.
// We now just pay the overhead of switching the global (pg) category
Timer.prototype.notificationCallback = function(notifyData, running) {
    running = typeof(running)!== "undefined" ? running : false;
    // remove the notification. This allows our app to play sound and display text.
    pgUI_showLog("Received " +notifyData.category +" notification callback at: " + pgUtil.getCurrentTime() + " with time : " + notifyData.time);

    this.pushCategory(notifyData.category);
    //this.refreshTimer();
    var scheduledEnd = notifyData.time;
    var id = notifyData.id;
    if(scheduledEnd !== 0) {
        this.notifyReset(scheduledEnd, id);
    }
    else {
        // There was no notification, but perhaps there should have been.
        // Call reset anyway to restart the clock.
        var data = this.getPageData();
        scheduledEnd   = data.startTime + data.countdownTime;
        if(running) {
            this.notifyReset(scheduledEnd, id);
        }
    }
    this.popCategory();
 };

Timer.prototype.timerCallback = function(ms) {
    var str = pgUtil.getStringFromMS(ms, true);
    this.timerWidget.val(str);
    //var category = page.category();
    //var startMsec = this.startTime[category];
    //var frac = 100 * (startMsec-ms) / startMsec;
    //$('#timer_knob').val(frac).trigger('change');
};

Timer.prototype.start = function(restart) {
    if(restart) {
        this.refreshTimer();
        ButtonPage.prototype.start.call(this, restart);
    }
    else {
        var data = this.getPageData();
        var time = pgUtil.getCurrentTime()+1; // this will occur after any reset
        var e = this.getElapsedTimer();
        var remaining = e.duration;
        if(!remaining) {
            remaining = data.countdownTime;
            this.clock.setCountdown(remaining);
            this.reset();
            this.clock.startFromTime(time);
        }
        else
            this.clock.start();
        ButtonPage.prototype.start.call(this, restart);
        this.setPageDataField("startTime", time);
        // Set a notification.
        // This may mean that both the timer and the notification attempt to trigger the Reset()
        this.setNotification(time + remaining);
    }
};
Timer.prototype.stop = function(time, isNotification) {
    time = (typeof(time) !== "undefined") ? time : pgUtil.getCurrentTime()+1; // ensure this will occur after any reset
    isNotification = (typeof(isNotification) !== "undefined") ? isNotification : false;
    ButtonPage.prototype.stop.call(this);
    if(!isNotification)
        this.unsetNotification();
    this.clock.stop();
    var data = this.getPageData();
    pg.addNewEvents({'page': "timer",
        'type': "interval",
        'start': data.startTime,
        'duration': time - data.startTime
    }, true);
    data.startTime = 0;
    this.setPageData(data);
    this.refreshTimer();
};

Timer.prototype.reset = function() {
    ButtonPage.prototype.reset.call(this);
    var time           = pgUtil.getCurrentTime();
    var data           = this.getPageData();

    // add the new event
    var edata = {'resetTime': data.countdownTime, 'complete': false};
    pg.addNewEvents({'page': "timer", 'type': "reset", 'start': time, 'data': edata}, true);
    // If we are called from the pgNotify callback, reschedule
    if (this.isRunning()) { // always true
        this.setNotification(time + data.countdownTime);
    }
    // update the clock
    this.refreshTimer();
};
Timer.prototype.notifyReset = function(scheduledTime, id) {
    ButtonPage.prototype.reset.call(this);
    var time           = pgUtil.getCurrentTime();
    var currentPage    = (pg.page()==="timer");
    var data           = this.getPageData();
    var finished       = !data.loop;

    // trigger startStop if we have finished
    var resetTime = time;
    if(finished) {
        resetTime = scheduledTime;
        // set the start time, execute the alarm.
        if(this.isRunning())
            this.stop(resetTime, true); // was "time", could be notification.time
        if(currentPage)
            this.refreshTimer();
    }
    // add the new event
    var newInterval = this.computeNewCountdown();
    data.countdownTime = newInterval;
    this.setPageDataField("countdownTime", newInterval);

    var edata = {'resetTime': newInterval, 'complete': true};
    pg.addNewEvents({'id': id, 'page': "timer", 'type': "reset", 'start': resetTime, 'data': edata}, true);
    if(!finished) {
        this.setNotification(time + newInterval);
        // if this is the current page, update the clock
        if (currentPage) {
            this.refreshTimer();
        }
    }
};
Timer.prototype.computeNewCountdown = function(data) {
    data = data || this.getPageData();
    return Math.floor(data.countdownInterval + data.randomInterval * Math.random() );
};

Timer.prototype.getElapsedTimer = function() {
    var e         = pg.getEventsInPage("timer");
    var data      = this.getPageData();
    var startTime = data.startTime;
    var running        = startTime !== 0;
    // We are not allowed to use the page data in this computation.
    // however, the first event will have no prior reset events, so needs a starting value.
    var countdownTime  = this.computeNewCountdown(data);
    //var countdownTime  = data.countdownTime;
    //var countdownTime  = 0.0;
    var duration       = 0.0;
    var resetTime      = 0.0;
    
    if(running) {
        var elapsedTime = 0.0;
        for(var i=0; i<e.length; i++) {
            var event = pgUtil.parseEvent(e[i]);
            if(event.type==="interval") {
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
            else if(event.type === "reset") {
                if(resetTime === 0) {
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
            if(event.type==="interval") {
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
            else if(event.type === "reset") {
                if(!resetTime) {
                    countdownTime = parseInt(event.data.resetTime);
                    resetTime     = event.start;
                }
            }
        }
    }
    // If we are running, the client should use the start time.
    // otherwise, the client should use the duration.
    return {'countdownTime': countdownTime, 'startTime': startTime, 'duration': duration, 'running': running};
};

UI.timer = new Timer();
//# sourceURL=timer.js
