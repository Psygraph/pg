
function Timer() {
    ButtonPage.call(this, "timer");
    this.clock          = null;
    this.tempCategory   = null;
    this.visible        = true;
    this.timerWidget    = $('#countdown_timer');
    this.durationWidget = $('#countdown_duration');
    pgNotify.setCallback(this.notificationCallback.bind(this));
}

Timer.prototype = Object.create(ButtonPage.prototype);
Timer.prototype.constructor = Timer;

Timer.prototype.update = function(show, data) {
    ButtonPage.prototype.update.call(this, show, data);
    if(show) {
        var initializing = !this.clock;
        if (initializing) {
            this.durationWidget.prop("disabled", true);

            this.clock = new Clock(this.timerCallback.bind(this), 50, function (a, b, c) {});
            // see if there are any notifications that need to be removed.
            // we have to run this after setting the state because we set the startTime
            pgNotify.callElapsed(pg.category(), this.isRunning());
            this.pushCategory(pg.category());
            for (var i = 0; i < pg.categories.length; i++) {
                if(this.tempCategory === pg.categories[i])
                    continue;
                gotoCategory(pg.categories[i]);
                pgNotify.callElapsed(pg.category(), this.isRunning());
            }
            this.popCategory();
        }
        if(this.isVisible()) {
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
    var cat = this.tempCategory;
    this.tempCategory = null;
    this.visible = true;
    if(cat !== pg.category())
        gotoCategory(cat);
};
Timer.prototype.isVisible = function() {
    return this.visible && (pg.page() === "timer");
};
Timer.prototype.refreshTimer = function() {
    var data = this.getPageData();
    var ctime = 0;
    if(data.countdownTimes.length)
        ctime = data.countdownTimes[0];
    this.durationWidget.val(pgUtil.getStringFromMS(ctime) );
    this.clock.setCountdown(ctime);
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
        //$("#timer_loop").prop('checked', data.loop).checkboxradio("refresh");
        $("#countdown_setDuration").val(pgUtil.getStringFromMS(data.countdownInterval));
        $("#countdown_setRandom").val(pgUtil.getStringFromMS(data.randomInterval));
        $("#timer_numTimers").val(data.numTimers).change();
    }
    else {
        data.timerAlarm        = $("#timer_alarm").val();
        //data.loop            = $("#timer_loop")[0].checked;
        data.countdownInterval = pgUtil.getMSFromString($("#countdown_setDuration").val());
        data.randomInterval    = pgUtil.getMSFromString($("#countdown_setRandom").val());
        data.numTimers         = parseInt($("#timer_numTimers").val());
        data.countdownTimes    = this.computeNewCountdowns(data);
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
    //if(! ('loop' in data))
    //    data.loop = 0;
    if(! ('startTime' in data))
        data.startTime = 0;
    if(! ('countdownInterval' in data))
        data.countdownInterval = 4*1000;
    if(! ('randomInterval' in data))
        data.randomInterval = 4*1000;
    if(! ('numTimers' in data))
        data.numTimers = 1;
    if(! ('countdownTimes' in data))
        data.countdownTimes = this.computeNewCountdowns(data);
    return data;
};

Timer.prototype.setNotification = function(atTime) {
    if(atTime < pgUtil.getCurrentTime()) {
        atTime = pgUtil.getCurrentTime() + 200;
        pgUI_showLog("Error: notification scheduled in the past.");
    }
    var pageData = this.getPageData();
    var hasSound = pageData.timerAlarm==="sound" || pageData.timerAlarm==="both";
    var hasText  = pageData.timerAlarm==="text"  || pageData.timerAlarm==="both";
    var data = this.getPageData();
    var times = [atTime]; // + data.countdownTimes[0]]; this is already accounted for in the atTime
    for(var i=1; i<data.countdownTimes.length; i++)
        times[times.length] = times[times.length-1] + data.countdownTimes[i];
    this.unsetNotification();
    pgNotify.setNotification(pg.category(), times, data.countdownTimes, hasText, hasSound);
};

Timer.prototype.unsetNotification = function() {
    pgNotify.removeCategory(pg.category());
    pgUI_showLog("Unset "+pg.category()+" notification.");
};

// The following method has posed a problem for the infrastructure because it is a notification
// which may pertain to a non-current category (i.e. not the one returned by pg.category() ).
// We used to pass around a category parameter, which is error prone.
// We now just pay the overhead of switching the global (pg) category
Timer.prototype.notificationCallback = function(type, notifyData, running) {
    running = running || false;
    pgUI_showLog("Received "+type+ ", " +notifyData.category +" notification callback at: " + pgUtil.getCurrentTime() + " with time : " + notifyData.time);

    this.pushCategory(notifyData.category);
    if(type==="survey") {
        // unfortunately, the ID might have changed (it was negative).
        // so, we look up events at that exact millisecond.
        //var e = pg.getEventsAtTime(notifyData.time);
        //if(e.length===1) {
        //    pg.addEventDataField(e[0].id, 'mindful', notifyData.survey);
        //}
        //else {
            // There were no events: create one.
            var edata = {
                mindful: notifyData.survey
            };
            pg.addNewEvents({'page': "timer", 'type': "response", 'start': notifyData.time, 'data': edata}, true);
        //}
    }
    else if(type==="elapsed") {
        // There was no notification, but perhaps there should have been.
        //this.reset(notifyData.time, {});
    }
    else if(type==="trigger") {
        //this.refreshTimer();
        var scheduledEnd = notifyData.time;
        var id           = notifyData.id;
        var resetTime    = notifyData.resetTime;
        if(scheduledEnd !== 0) {
            this.notify(scheduledEnd, id, resetTime);
        }
    }
    else {
        pgUI_showError("Unknown notify callback type");
    }
    this.popCategory();
 };

Timer.prototype.timerCallback = function(ms) {
    var str = pgUtil.getStringFromMS(ms, true);
    this.timerWidget.val(str);
};

// In Start, we call reset (if the timer is zero),
// set the startTime to zero, schedule several interrupts,
// and begin the clock.
Timer.prototype.start = function(restart, time) {
    restart = restart || false;
    time = (typeof(time) !== "undefined") ? time : pgUtil.getCurrentTime();
    if(restart) {
        var data = this.getPageData();
        // see if we really should be running according to startTime and countdownTimes.
        var ctime = data.startTime;
        var i=0;
        for( ; i<data.countdownTimes.length; i++) {
             ctime += data.countdownTimes[i];
             if(ctime > time)
                 break;
        }
        if(i>0) { // at least some of the alarms have elapsed
            while(--i >= 0)
                data.countdownTimes.shift();
            this.setPageDataField("countdownTimes", data.countdownTimes);
        }
        if(data.countdownTimes.length) { // there are still some alarms left
            ButtonPage.prototype.start.call(this, true);
            this.setNotification(ctime);
        }
        else {
            // we are actually stopped.
            ButtonPage.prototype.stop.call(this);
            this.setPageDataField("startTime", 0);
            this.unsetNotification();
        }
        this.refreshTimer();
    }
    else {
        var data = this.getPageData();
        var time = pgUtil.getCurrentTime();
        if(!data.countdownTimes.length) {
            return;  //they must press reset.
        }
        var remaining = data.countdownTimes[0];
        ButtonPage.prototype.start.call(this, restart);
        this.setPageDataField("startTime", time);
        // Set notifications
        this.setNotification(time + remaining);
        this.refreshTimer();
    }
};
Timer.prototype.stop = function(time) {
    time = (typeof(time) !== "undefined") ? time : pgUtil.getCurrentTime();
    ButtonPage.prototype.stop.call(this);
    this.unsetNotification();
    this.clock.stop();
    var data = this.getPageData();
    pg.addNewEvents({
        'page': "timer",
        'type': "interval",
        'start': data.startTime,
        'duration': time - data.startTime
    }, true);
    this.setPageDataField("startTime", 0);
    this.refreshTimer();
};

Timer.prototype.reset = function(time, edata) {
    time = (typeof(time) !== "undefined") ? time : pgUtil.getCurrentTime();
    isNotification = (typeof(edata) !== "undefined");
    ButtonPage.prototype.reset.call(this);
    var data = this.getPageData();

    if(!isNotification) {
        data.countdownTimes = this.computeNewCountdowns();
        this.setPageData(data);
        edata = {};
        edata.resetTime = data.countdownTimes[0];
        edata.elapsed = false;
    }
    else {
        edata.elapsed = true;
    }
    // add the new event
    pg.addNewEvents({'page': "timer", 'type': "reset", 'start': time, 'data': edata}, true);
    // If we are called from the pgNotify callback, reschedule
    if(!isNotification && this.isRunning()) {
        this.setNotification(time + data.countdownTimes[0]);
    }
    // update the clock
    this.refreshTimer();
};

// tis event is really a composite of stop, reset, and start
Timer.prototype.notify = function(scheduledTime, id, resetTime) {
    var time            = pgUtil.getCurrentTime();
    var data            = this.getPageData();

    if(!this.isRunning()) {
        pgUI_showError("Timer alarm when no timer running.");
        return;
    }
    // stop()
    this.stop(scheduledTime-1);
    // update timers
    data.countdownTimes.shift();
    this.setPageDataField("countdownTimes", data.countdownTimes);
    if(data.countdownTimes.length) {
        // reset()
        this.reset(scheduledTime, {resetTime: data.countdownTimes[0]});
        // start()
        this.start(false);
    }
};
Timer.prototype.computeNewCountdowns = function(data) {
    data = data || this.getPageData();
    var countdowns = [];
    for(var i=0; i<data.numTimers; i++)
        countdowns.push(Math.floor(data.countdownInterval + data.randomInterval * Math.random() ));
    return countdowns;
};

Timer.prototype.getElapsedTimer = function() {
    var e         = pg.getEventsInPage("timer");
    var data      = this.getPageData();
    var startTime = data.startTime;
    var running   = startTime !== 0;
    // We are not allowed to use the page data in this computation.
    // however, the first event will have no prior reset events, so needs a starting value.
    //var countdownTime  = data.countdownTimes.length ? data.countdownTimes[0] : 0;
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
                    resetTime     = event.start;
                }
                if(event.start > startTime) {
                    startTime = event.start;
                }
            }
        }
        startTime -= elapsedTime;
    }
    else {
        for(var i=0; i<e.length; i++) {
            var event = pgUtil.parseEvent(e[i]);
            if(event.type==="interval") {
                var eventStartTime  = event.start;
                var eventDuration   = event.duration;
                var eventStopTime   = event.start + event.duration;
                if(resetTime) {
                    if(eventStopTime > resetTime) {
                        // running at the time of the reset.
                        if(eventStartTime > resetTime) {
                            // error in event order
                        }
                        // stopped at the time of reset
                        duration += (eventStopTime-resetTime);
                    }
                    break;
                }
                else
                    duration += event.duration;
            }
            else if(event.type === "reset") {
                if(!resetTime) {
                    resetTime = event.start;
                }
            }
        }
        if(!data.countdownTimes.length)
            duration = 0;
    }
    // If we are running, the client should use the start time.
    // otherwise, the client should use the duration.
    return {'startTime': startTime, 'duration': duration, 'running': running};
};

UI.timer = new Timer();
//# sourceURL=timer.js
