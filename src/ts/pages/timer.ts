import {pg} from '../pg';
import {pgUtil, pgDebug} from '../util';
import {pgUI} from '../ui';
import {Ticker} from '../ticker';
//import {pgNotify} from '../notify';
import {ButtonPage} from './page';


export class Timer extends ButtonPage {
    setTimeCB = null;
    setDurCB = null;
    clock = null;
    tempCategory = null;
    initializing = false;
    calendarOffset = {};
    visible = false;
    pgNotify;
    
    constructor(opts) {
        super('timer', opts);
        this.clock = null;
        this.tempCategory = null;
        this.initializing = false;
        this.calendarOffset = {};
        this.pgNotify = opts.pgNotify;
    }
    init( opts) {
        if(!this.initialized) {
            super.init(opts);
            this.pgNotify.setCallback(this.notificationCallback.bind(this));
            this.clock = new Ticker(this.timerCallback.bind(this), 50);
            //this.recomputeCalendar();
            // see if there are any notifications that need to be removed.
             for (let i = 0; i < pg.categories.length; i++) {
                const cat = pg.categories[i];
                this.restart(true, cat);
            }
        }
        else
           super.init(opts);
        this.setTimeCB = opts.setTimeCB;
        this.setDurCB = opts.setDurCB;
    }
    updateView(show) {
        super.updateView(show);
        if (show) {
            this.restart(false);
            this.refreshTimer();
        } else {
            this.clock.stop();
        }
    }
    
    getPageData() {
        const data = super.getPageData();
        for(let cat of pg.categories) {
            if (!('alarmSound' in data[cat])) {
                data[cat].alarmSound = true;
            }
            if (!('alarmText' in data[cat])) {
                data[cat].alarmText = true;
            }
            if (!('calendar' in data[cat])) {
                data[cat].calendar = 0;
            }
            if (!('startTime' in data[cat])) {
                data[cat].startTime = 0;
            }
            if (!('timerDuration' in data[cat])) {
                data[cat].timerDuration = 4 * 1000;
            }
            if (!('random' in data[cat])) {
                data[cat].random = true;
            }
            if (!('repeat' in data[cat])) {
                data[cat].repeat = 0;
            }
            if (!('countdownTimes' in data[cat])) {
                data[cat].countdownTimes = this.computeNewCountdowns(data, cat);
            }
        }
        return data;
    }
    getAllRepeatNV() {
        const repeats = [{value: 0, name: 'None'}, {value: 1, name: '1 Time'}, {value: 2, name: '2 Times'}, {
            value: 3, name: '3 Times'
        }, {value: 4, name: '4 Times'}, {value: 5, name: '5 Times'}, {value: 6, name: '6 Times'}, {value: 7, name: '7 Times'}, {
            value: 8, name: '8 Times'
        }, {value: 9, name: '9 Times'}, {value: 10, name: '10 Times'},];
        return repeats;
    }
    isVisible() {
        return this.visible && (pgUI.page() === 'timer');
    }
    refreshTimer(cat=pgUI.category()) {
        let ctime = 0;
        if (this.pageData[cat].countdownTimes.length) {
            ctime = this.pageData[cat].countdownTimes[0];
        }
        this.setDurCB(pgUtil.getStringFromMS(ctime, false));
        this.clock.setCountdown(ctime);
        const e = this.getElapsedTimer();
        if (this.isRunning()) {
            this.clock.start(e.startTime, e.duration);
        } else {
            this.clock.stop(e.duration);
        }
    }
    
    setNotification(atTime, cat = pgUI.category()) {
        if (atTime < pgUtil.getCurrentTime()) {
            const missed = pgUtil.getCurrentTime() - atTime;
            atTime = pgUtil.getCurrentTime() + 200;
            pgDebug.showLog('Error: notification scheduled ' + missed + 'ms in the past.');
        }
        const times = [atTime]; // + this.pageData[cat].countdownTimes[0]]; this is already accounted for in the atTime
        for (let i = 1; i < this.pageData[cat].countdownTimes.length; i++) {
            times[times.length] = times[times.length - 1] + this.pageData[cat].countdownTimes[i];
        }
        //this.unsetNotification();
        this.pgNotify.setNotification(cat, times, this.pageData[cat].countdownTimes, this.pageData[cat].alarmText, this.pageData[cat].alarmSound);
    }
    unsetNotification(cat = pgUI.category()) {
        this.pgNotify.removeCategory(cat);
        pgDebug.showLog('Unset ' + cat + ' notification.');
    }
    // The following method has posed a problem for the infrastructure because it is a notification
    // which may pertain to a non-current category (i.e. not the one returned by pgUI.category() ).
    // We used to pass around a category parameter, which is error prone.
    // We now just pay the overhead of switching the global (pg) category
    notificationCallback(type, notifyData, running = false) {
        pgDebug.showLog('Received ' + type + ', ' + notifyData.category + ' notification callback at: ' + pgUtil.getCurrentTime() + ' with time : ' + notifyData.time);
        
        if (type === 'survey') {
            // unfortunately, the ID might have changed (it was negative).
            // so, we look up events at that exact millisecond.
            //var e = pg.getEventsAtTime(notifyData.time, );
            //if(e.length===1) {
            //    pg.addEventDataField(e[0].id, 'mindful', notifyData.survey);
            //}
            //else {
            // There were no events: create one.
            const edata = {
                mindful: notifyData.survey
            };
            pg.addNewEvents({'page': 'timer', 'category': notifyData.category, 'type': 'response', 'start': notifyData.time, 'data': edata}, true);
            //}
        } else if (type === 'elapsed') {
            // There was no notification, but perhaps there should have been.
            //this.reset(notifyData.time, {});
        } else if (type === 'trigger') {
            //this.refreshTimer();
            const scheduledEnd = notifyData.time;
            const id = notifyData.id;
            const resetTime = notifyData.resetTime;
            if (scheduledEnd !== 0) {
                this.notify(scheduledEnd, id, resetTime, notifyData.category);
            }
        //} else if (type === 'updateView') {
        //    this.updateView(true);
        } else {
            pgDebug.showError('Unknown notify callback type');
        }
    }
    // this event is really a composite of stop, reset, and start
    notify(scheduledTime, id, resetTime, cat) {
        const time = pgUtil.getCurrentTime();
        
        if (!this.isRunning(cat)) {
            pgDebug.showError('Timer alarm when no timer running.');
            return;
        }
        // stop()
        this.stop(scheduledTime - 1, cat);
        // update timers
        this.pageData[cat].countdownTimes.shift();
        if (this.pageData[cat].countdownTimes.length) {
            this.addResetEvent(scheduledTime, true, cat);
            this.start(false, scheduledTime + 1, cat);
        }
    }
    timerCallback(ms) {
        this.setTimeCB(pgUtil.getStringFromMS(ms, false));
    }
    
    // In Start, we call reset (if the timer is zero),
    // set the startTime to zero, home several interrupts,
    // and begin the clock.
    restart(resetNotifications, cat=pgUI.category()) {
        if (resetNotifications) {
            this.pgNotify.removeCategory(cat);
        }
        const restart = this.isRunning(cat);
        if (restart) {
            pgDebug.showLog('Calling restart for ' + cat);
            const time = pgUtil.getCurrentTime();
            let ctime = this.pageData[cat].startTime;
            let i = 0, j = 0;
            for (; i < this.pageData[cat].countdownTimes.length; i++) {
                this.pageData[cat].startTime = ctime;
                ctime += this.pageData[cat].countdownTimes[i];
                if (ctime > time) {
                    break;
                }
                j++;
            }
            while (j--) // at least some of the alarms have elapsed
            {
                this.pageData[cat].countdownTimes.shift();
            }
            if (this.pageData[cat].countdownTimes.length) { // there are still some alarms left
                super.start(true, pgUtil.getCurrentTime(), cat);
                // Since there might have been some completed time on the clock, subtract that from ctime.
                if (this.pageData[cat].countdownTimes.length) {
                    const e = this.getElapsedTimer(cat);
                    ctime -= e.duration;
                    if (ctime <= 0) {
                        ctime = 100;
                    }
                }
                if (resetNotifications) {
                    this.setNotification(ctime, cat);
                }
            } else {
                // we are actually stopped.
                super.stop(pgUtil.getCurrentTime(), cat);
                this.pageData[cat].startTime = 0;
                if (resetNotifications) {
                    this.unsetNotification(cat);
                }
            }
        }
    }
    start(restart = false, time = pgUtil.getCurrentTime(), cat=pgUI.category()) {
        if (this.pageData[cat].countdownTimes.length) {
            const e = this.getElapsedTimer();
            const remaining = this.pageData[cat].countdownTimes[0] - e.duration;
            super.start(restart);
            this.pageData[cat].startTime = time;
            // Set notifications
            this.setNotification(time + remaining);
            this.refreshTimer();
        }
    }
    stop(time = pgUtil.getCurrentTime(), cat=pgUI.category()) {
        super.stop(time);
        this.unsetNotification();
        //this.clock.stop();
        pg.addNewEvents({
            'page': 'timer',
            'category': cat,
            'type': 'interval',
            'start': this.pageData[cat].startTime,
            'duration': time - this.pageData[cat].startTime
        }, true);
        this.pageData[cat].startTime = 0;
        this.refreshTimer();
    }
    reset(time = pgUtil.getCurrentTime(), cat=pgUI.category()) {
        super.reset(time);
        const running = this.isRunning();
        
        if (running) {
            this.stop(time - 1);
        }
        // add the new event
        this.addResetEvent(time, false);
        if (this.pageData[cat].countdownTimes.length === 0) {
            this.pageData[cat].countdownTimes = this.computeNewCountdowns();
        }
        // If we are called from the pgNotify callback, reschedule
        if (running) {
            this.start(false, time + 1);
        }
        // update the clock
        this.refreshTimer();
    }
    
    addResetEvent(time, isNotification, cat=pgUI.category()) {
        const edata = {resetTime: 0, elapsed: 0};
        edata.resetTime = this.pageData[cat].countdownTimes[0];
        edata.elapsed = isNotification;
        // add the new event
        pg.addNewEvents({
            page: 'timer', category: cat, type: 'reset', start: time, data: edata
        }, true);
    }
    
    computeNewCountdowns(data = this.pageData, cat=pgUI.category()) {
        const countdowns = [];
        for (let i = 0; i <= data[cat].repeat; i++) {
            let randomAmt = 0;
            if (data[cat].random) {
                randomAmt += data[cat].timerDuration * Math.random();
            }
            countdowns.push(Math.floor(data[cat].timerDuration + randomAmt));
        }
        return countdowns;
    }
    getElapsedTimer(cat=pgUI.category()) {
        const e = pg.getEventsInPage('timer', cat);
        const startTime = this.pageData[cat].startTime;
        const running = startTime !== 0;
        // We are not allowed to use the page data in this computation.
        // however, the first event will have no prior reset events, so needs a starting value.
        //let countdownTime  = data.countdownTimes.length ? data.countdownTimes[0] : 0;
        let duration = 0.0;
        let resetTime = 0.0;
        let eventStart = 0.0;
        let eventEnd = 0.0;
        let eventDur = 0.0;
        
        for (let i = 0; i < e.length; i++) {
            const event = pg.parseEvent(e[i]);
            if (event.type === 'interval') {
                eventStart = event.start;
                eventDur = event.duration;
                eventEnd = event.start + event.duration;
                if (resetTime) {
                    if (eventEnd > resetTime) {
                        duration += (eventEnd - resetTime);
                    }
                    break;
                } else {
                    duration += event.duration;
                }
            } else if (event.type === 'reset') {
                if (resetTime) {
                    continue;
                }
                resetTime = event.start;
            }
        }
        
        if (!running && !this.pageData[cat].countdownTimes.length) {
            duration = 0;
        }
        // If we are running, the client should use the start time.
        // otherwise, the client should use the duration.
        return {'startTime': startTime, 'duration': duration, 'running': running};
    }
}

/*
recomputeCalendar(category) {
    category = category || pgUI.category();
    if(this.pageData[cat].calendar)
        pgNotify.getCalendarTime(category, cb.bind(this));

    function cb(ms) {
        this.calendarOffset[category] = ms > 0 ? ms : 0;
    }
};
timerStartTime() {
    var time = 0;
    if (this.pageData[cat].calendar && this.calendarOffset[pgUI.category()])
        time = this.calendarOffset[pgUI.category()];
    if(! time)
        time = new Date().getTime();
    return time;
};
*/
