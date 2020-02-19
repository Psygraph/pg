
var Counter = function () {
    ButtonPage.call(this, "counter");
    this.initialized = false;
    this.knobOpts = {min:      0,
                     max:      100, 
                     step:     0.1,
                     readOnly: true,
                     rotation: "clockwise",
                     lineCap : "round",
                     fgColor:  "rgba(0,0,0,1)",
                     bgColor:  "rgba(0,0,0,0)"
                    };
    this.knobOptsAtTarget   = {fgColor:  "rgba(  0, 215, 0, 1)"};
    this.knobOptsOverTarget = {fgColor:  "rgba(215,   0, 0, 1)"};
    this.enso = $("#counter_enso");
    this.edit = $("#counter_edit");
};

Counter.prototype = Object.create(ButtonPage.prototype);
Counter.prototype.constructor = Counter;

Counter.prototype.update = function(show, data) {
    this.data = ButtonPage.prototype.update.call(this, show, data);
    if(show) {
        if (!this.initialized) {
            this.initialized = true;
            this.enso.knob(this.knobOpts);
            this.enso.trigger('configure', this.knobOpts);
        }
        this.count = 0;
        var e = pg.mostRecentEvent(pg.category(), "counter");
        if (e) {
            if (e.type === "reset")
                this.count = 0;
            else
                this.count = e.data.count;
        }
        this.setValue();
        this.setMotionResponse(true);
        this.resize();
    }
    else {
        this.setMotionResponse(false);
    }
    return this.data;
};

Counter.prototype.settings = function(show) {
    if(show) {
        $("#counter_target").val(this.data.countTarget).change();
        $("#counter_motionSlider").val(this.data.motionVal).change();
        $("#counter_motionAlarm").val(this.data.motionAlarm).change();
        //$("#counter_showEnso").prop("checked", this.data.showEnso).checkboxradio('refresh');
        $("#counter_targetBehavior").val(this.data.countTargetBehavior).change();
        if(pgUtil.isWebBrowser()) {
            $("#counter_motion").hide();
        }
    }
    else {
        if(! pgUtil.isWebBrowser()) {
            this.data.motionAlarm  = $("#counter_motionAlarm").val();
            this.data.motionVal    = parseFloat($("#counter_motionSlider").val());
        }
        //this.data.showEnso          = $("#counter_showEnso")[0].checked;
        this.data.countTarget         = parseInt($("#counter_target").val());
        this.data.countTargetBehavior = $("#counter_targetBehavior").val();
    }
    return this.data;
};

Counter.prototype.resize = function() {
    Page.prototype.resize.call(this, false);
};

Counter.prototype.setValue = function() {
    var countTarget = this.data.countTarget;
    //var category = pg.category();
    //var count = 0;
    //if(this.event[category]) {
    //    count = this.event[category].data.count;
    //}
    var count = this.count;

    this.edit.val(count);
    if(!this.data.showEnso || !countTarget) {
        this.enso.trigger('configure', {fgColor: "rgba(0,0,0,0)"});
    }
    else {
        if(count < countTarget)
            this.enso.trigger('configure', this.knobOpts);
        else if(count === countTarget)
            this.enso.trigger('configure', this.knobOptsAtTarget);
        else
            this.enso.trigger('configure', this.knobOptsOverTarget);
        var frac = 100 * (this.count) / this.data.countTarget;
        this.enso.val(frac).trigger('change');
    }
};

Counter.prototype.setMotionResponse = function(on) {
    if( pgUtil.isWebBrowser() )
        return;
    if(on && this.data.motionAlarm !== "none") {
        pgAccel.onShake("accel", onMotion.bind(this), this.data.motionVal);
        pgAccel.start();
    }
    else {
        pgAccel.offShake("accel");
    }

    function onMotion(motion) {
        if(this.data.motionAlarm==="beep") {
            pgAudio.beep();
        }
        else if(this.data.motionAlarm==="sound") {
            pgAudio.alarm(pg.category(), false, cb);
        }
        else if(this.data.motionAlarm==="silent") {
        }
        else {
            pgUI.showLog("Error in motion callback");
        }
        this.start();
        function cb(idx) {
            //setTimeout(pgAudio.stopAlarm.bind(pgAudio, idx), 4000);
        }
    }
};

Counter.prototype.getPageData = function(cat) {
    cat = (typeof(cat) !== "undefined") ? cat : pg.category();
    var data = ButtonPage.prototype.getPageData.call(this, cat);
    if(! ('motionAlarm' in data))
        data.motionAlarm = "none";
    if(! ('motionVal' in data))
        data.motionVal = 1;
    if(! ('showEnso' in data))
        data.showEnso = true;
    if(! ('countTarget' in data))
        data.countTarget = 10;
    if(! ('countTargetBehavior' in data))
        data.countTargetBehavior = "sound";
    return data;
};

Counter.prototype.start = function(restart, cause) {
    restart = restart || false;
    cause = (typeof(cause)!=="undefined") ? cause : 'button';
    ButtonPage.prototype.start.call(this,restart);
    var category = pg.category();
    this.count ++;
    var eventData = {countTarget: this.data.countTarget,
        count: this.count};
    var event = {page: "counter",
        type: "count",
        category: category,
        start: pgUtil.getCurrentTime(),
        data: eventData
    };
    //this.data.event = event;
    pg.addNewEvents(event, true);
    this.setValue();
    this.stop();
};

Counter.prototype.stop = function() {
    ButtonPage.prototype.stop.call(this);
    /*
    var data = this.getPageData();
    var time = pgUtil.getCurrentTime();
    var category = pg.category();
    var event = this.event[category];
    event.data.duration = time - event.data.start;
    var target = this.event[category].data.countTarget;
    var length = this.event[category].data.count.length;
    if(length) {
        pg.addNewEvents(event, true);
        syncSoon();
        this.feedback(length, target);
    }
    this.event[category] = null;
    */
};

Counter.prototype.reset = function() {
    ButtonPage.prototype.reset.call(this);
    var category = pg.category();
    var target = this.data.countTarget;
    var count = this.count;

    this.feedback(count, target);
    var eventData = {countTarget: target,
                     count: count};
    var event = {page: "counter",
        type: "reset",
        category: category,
        start: pgUtil.getCurrentTime(),
        data: eventData
    };
    pg.addNewEvents(event, true);
    this.count = 0;
    this.setValue();
    /*
    if(this.running) {
        var data = this.getPageData();
        var category = pg.category();
        this.count += 1;
        var val = [pgUtil.getCurrentTime(), cause];
        this.event[category].data.count.push(val);
        this.setValue();
    }
    */
};

Counter.prototype.feedback = function(count, target) {
    if(count && target) {
        var correct = (count === target);
        if(this.data.countTargetBehavior === "sound")
            pgAudio.reward(correct);
    }
};

Counter.prototype.lever = function(arg) {
    if(arg==="left") {
        this.reset();
    }
    else if(arg==="right") {
        this.start();
    }
};

UI.counter = new Counter();
//# sourceURL=counter.js
