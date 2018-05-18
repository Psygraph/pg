
function Timer() {
    ButtonPage.call(this, "timer");
    this.clock          = null;
    this.tempCategory   = null;
    this.initializing   = false;
    //this.visible        = true;
    this.timerWidget    = $('#countdown_timer');
    this.durationWidget = $('#countdown_duration');
    this.calendarOffset = {};
    pgNotify.setCallback(this.notificationCallback.bind(this));
}

Timer.prototype = Object.create(ButtonPage.prototype);
Timer.prototype.constructor = Timer;

Timer.prototype.update = function(show, data) {
    this.data = ButtonPage.prototype.update.call(this, show, data);
    if(show) {
        if(!this.clock) {
            this.initializing = true;
            this.durationWidget.prop("disabled", true);
            this.clock = new Clock(this.timerCallback.bind(this), 50, function (a, b, c) {});
            // see if there are any notifications that need to be removed.
            // we have to run this after setting the state because we set the startTime
            //pgNotify.callElapsed(pg.category(), this.isRunning());
            //this.recomputeCalendar();
            this.pushCategory(pg.category());
            for (var i = 0; i < pg.categories.length; i++) {
                var cat = pg.categories[i];
                if(this.tempCategory === cat)
                    continue;
                //pgNotify.callElapsed(pg.category(), this.isRunning());
                //this.recomputeCalendar();
                this.restart(cat);
            }
            this.popCategory();
            this.restart(pg.category());
            this.initializing = false;
        }
        if(!this.initializing) {
            this.refreshTimer();
            this.resize();
        }
    }
    else {
        if(this.clock)
            this.clock.stop();
    }
    return this.data;
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
    var ctime = 0;
    if(this.data.countdownTimes.length)
        ctime = this.data.countdownTimes[0];
    this.durationWidget.val(pgUtil.getStringFromMS(ctime, false) );
    this.clock.setCountdown(ctime);
    var e = this.getElapsedTimer();
    if(this.isRunning()) {
        this.clock.startFromTime(e.startTime);
    }
    else {
        this.clock.setElapsedMS(e.duration);
    }
};

Timer.prototype.settings = function(show) {
    if(show) {
        $("#timer_alarm").val(this.data.timerAlarm).change();
        //$("#timer_calendar").prop('checked', this.data.loop).checkboxradio("refresh");
        //$("#countdown_setDuration").val(pgUtil.getStringFromMS(this.data.countdownInterval, true));
        //$("#countdown_setRandom").val(pgUtil.getStringFromMS(this.data.randomInterval, true));
        $("#countdown_setDuration").val(pgUtil.getDBStringFromMS(this.data.countdownInterval, false));
        $("#countdown_setRandom").val(pgUtil.getDBStringFromMS(this.data.randomInterval, false));
        $("#timer_numTimers").val(this.data.numTimers).trigger("change");
        //$("#countdown_setDuration").datebox('setTheDate', pgUtil.getStringFromMS(this.data.countdownInterval, false));
        //$("#countdown_setRandom").datebox('setTheDate', pgUtil.getStringFromMS(this.data.randomInterval, false));
    }
    else {
        this.data.timerAlarm        = $("#timer_alarm").val();
        //this.data.calendar        = !! $("#timer_calendar")[0].checked;
        //$(input).datebox('getLastDur');
        this.data.countdownInterval = pgUtil.getMSFromString($("#countdown_setDuration").val());
        this.data.randomInterval    = pgUtil.getMSFromString($("#countdown_setRandom").val());
        this.data.numTimers         = parseInt($("#timer_numTimers").val());
        this.data.countdownTimes    = this.computeNewCountdowns();
        this.refreshTimer();
    }
};

Timer.prototype.resize = function() {
    Page.prototype.resize.call(this, false);
};

Timer.prototype.getPageData = function(cat) {
    cat = (typeof(cat) !== "undefined") ? cat : pg.category();
    var data = ButtonPage.prototype.getPageData.call(this, cat);
    if(! ('timerAlarm' in data))
        data.timerAlarm        = "both";
    if(! ('calendar' in data))
        data.calendar          = 0;
    if(! ('startTime' in data))
        data.startTime         = 0;
    if(! ('countdownInterval' in data))
        data.countdownInterval = 4*1000;
    if(! ('randomInterval' in data))
        data.randomInterval    = 4*1000;
    if(! ('numTimers' in data))
        data.numTimers         = 1;
    if(! ('countdownTimes' in data))
        data.countdownTimes    = this.computeNewCountdowns(data);
    return data;
};

Timer.prototype.setNotification = function(atTime) {
    if(atTime < pgUtil.getCurrentTime()) {
        var missed = pgUtil.getCurrentTime() - atTime;
        atTime = pgUtil.getCurrentTime() + 200;
        pgUI.showLog("Error: notification scheduled "+missed +"ms in the past.");
    }
    var hasSound = this.data.timerAlarm==="sound" || this.data.timerAlarm==="both";
    var hasText  = this.data.timerAlarm==="text"  || this.data.timerAlarm==="both";
    var times = [atTime]; // + this.data.countdownTimes[0]]; this is already accounted for in the atTime
    for(var i=1; i<this.data.countdownTimes.length; i++)
        times[times.length] = times[times.length-1] + this.data.countdownTimes[i];
    //this.unsetNotification();
    pgNotify.setNotification(pg.category(), times, this.data.countdownTimes, hasText, hasSound);
};

Timer.prototype.unsetNotification = function() {
    pgNotify.removeCategory(pg.category());
    pgUI.showLog("Unset "+pg.category()+" notification.");
};

// The following method has posed a problem for the infrastructure because it is a notification
// which may pertain to a non-current category (i.e. not the one returned by pg.category() ).
// We used to pass around a category parameter, which is error prone.
// We now just pay the overhead of switching the global (pg) category
Timer.prototype.notificationCallback = function(type, notifyData, running) {
    running = running || false;
    pgUI.showLog("Received "+type+ ", " +notifyData.category +" notification callback at: " + pgUtil.getCurrentTime() + " with time : " + notifyData.time);

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
        pgUI.showError("Unknown notify callback type");
    }
    this.popCategory();
 };

Timer.prototype.timerCallback = function(ms) {
    var str = pgUtil.getStringFromMS(ms, false);
    this.timerWidget.val(str);
};

// In Start, we call reset (if the timer is zero),
// set the startTime to zero, schedule several interrupts,
// and begin the clock.
Timer.prototype.restart = function(cat) {
    pgNotify.removeCategory(cat);
    gotoCategory(cat);
    var restart = this.isRunning();
    if(restart) {
        pgUI.showLog("Calling restart for " +cat);
        var time = pgUtil.getCurrentTime();
        // see if we really should be running according to startTime and countdownTimes.
        var ctime = this.data.startTime;
        var i=0, j=0;
        for( ; i<this.data.countdownTimes.length; i++) {
            this.data.startTime = ctime;
            ctime += this.data.countdownTimes[i];
            if(ctime > time) {
                break;
            }
            j++;
        }
        while(j--) // at least some of the alarms have elapsed
            this.data.countdownTimes.shift();
        if(this.data.countdownTimes.length) { // there are still some alarms left
            ButtonPage.prototype.start.call(this, true);
            this.setNotification(ctime);
        }
        else {
            // we are actually stopped.
            ButtonPage.prototype.stop.call(this);
            this.data.startTime = 0;
            this.unsetNotification();
        }
    }
};
Timer.prototype.start = function() {
    var time = pgUtil.getCurrentTime();
    if (this.data.countdownTimes.length) {
        var remaining = this.data.countdownTimes[0];
        ButtonPage.prototype.start.call(this, false);
        this.data.startTime = time;
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
    pg.addNewEvents({
        'page': "timer",
        'type': "interval",
        'start': this.data.startTime,
        'duration': time - this.data.startTime
    }, true);
    this.data.startTime = 0;
    this.refreshTimer();
};

Timer.prototype.reset = function(time, edata) {
    time = (typeof(time) !== "undefined") ? time : pgUtil.getCurrentTime();
    isNotification = (typeof(edata) !== "undefined");
    ButtonPage.prototype.reset.call(this);

    if(!isNotification) {
        this.data.countdownTimes = this.computeNewCountdowns();
        edata = {};
        edata.resetTime = this.data.countdownTimes[0];
        edata.elapsed = false;
    }
    else {
        edata.elapsed = true;
    }
    // add the new event
    pg.addNewEvents({'page': "timer", 'type': "reset", 'start': time, 'data': edata}, true);
    // If we are called from the pgNotify callback, reschedule
    if(!isNotification && this.isRunning()) {
        this.unsetNotification();
        this.setNotification(time + this.data.countdownTimes[0]);
    }
    // update the clock
    this.refreshTimer();
};

// this event is really a composite of stop, reset, and start
Timer.prototype.notify = function(scheduledTime, id, resetTime) {
    var time            = pgUtil.getCurrentTime();

    if(!this.isRunning()) {
        pgUI.showError("Timer alarm when no timer running.");
        return;
    }
    // stop()
    this.stop(scheduledTime-1);
    // update timers
    this.data.countdownTimes.shift();
    if(this.data.countdownTimes.length) {
        // reset()
        this.reset(scheduledTime, {resetTime: this.data.countdownTimes[0]});
        // start()
        this.start();
    }
};
/*
Timer.prototype.recomputeCalendar = function(category) {
    category = category || pg.category();
    if(this.data.calendar)
        pgNotify.getCalendarTime(category, cb.bind(this));

    function cb(ms) {
        this.calendarOffset[category] = ms > 0 ? ms : 0;
    }
};
Timer.prototype.timerStartTime = function() {
    var time = 0;
    if (this.data.calendar && this.calendarOffset[pg.category()])
        time = this.calendarOffset[pg.category()];
    if(! time)
        time = new Date().getTime();
    return time;
};
*/
Timer.prototype.computeNewCountdowns = function() {
    var countdowns = [];
    for(var i=0; i<this.data.numTimers; i++) {
        countdowns.push(1000*Math.floor((this.data.countdownInterval + this.data.randomInterval * Math.random())/1000 ));
    }
    return countdowns;
};

Timer.prototype.getElapsedTimer = function() {
    var e         = pg.getEventsInPage("timer");
    var startTime = this.data.startTime;
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
        if(!this.data.countdownTimes.length)
            duration = 0;
    }
    // If we are running, the client should use the start time.
    // otherwise, the client should use the duration.
    return {'startTime': startTime, 'duration': duration, 'running': running};
};

UI.timer = new Timer();
//# sourceURL=timer.js
