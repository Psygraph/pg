
var counter = function () {
    page.call(this, "counter");
    this.count = 0;
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
}

counter.prototype = Object.create(page.prototype);
counter.prototype.constructor = counter;

counter.prototype.update = function(show, state) {
    if(!show) {
        this.setMotionResponse("none");
        return {};
    }
    if(!this.initialized) {
        this.initialized = true;
        $("#counter_enso").knob(this.knobOpts);
        $("#counter_enso").trigger('configure', this.knobOpts);
    }
    // nothing to do for state
    // show the last count in this category.
    var e = pg.mostRecentEvent(pg.category(), "counter");
    if(e) {
        if(e.type=="reset")
            this.count = 0;
        else
            this.count = e.data.count;
    }
    else {
        this.count = 0;
    }
    var data = this.getPageData();
    this.setValue();
    this.resize();
    this.setMotionResponse(data.motionAlarm, data.motionVal);
};

counter.prototype.setValue = function() {
    var data = this.getPageData();
    $("#counter_edit").val(this.count);
    if(!data.showEnso) {
        $("#counter_enso").trigger('configure', {fgColor: "rgba(0,0,0,0)"});
    }
    else {
        if(this.count < data.countTarget-1)
            $("#counter_enso").trigger('configure', this.knobOpts);
        else if(this.count == data.countTarget-1)
            $("#counter_enso").trigger('configure', this.knobOptsAtTarget);
        else
            $("#counter_enso").trigger('configure', this.knobOptsOverTarget);
        var frac = 100 * (this.count) / data.countTarget;
        $('#counter_enso').val(frac).trigger('change');
    }
};

counter.prototype.settings = function() {
    var data = this.getPageData();
    if(arguments.length) {
        $("#counter_target").val(data.countTarget).change();
        $("#counter_motionSlider").val(data.motionVal).change();
        $("#counter_motionAlarm").val(data.motionAlarm).change();
        $("#counter_showEnso").prop("checked", data.showEnso).checkboxradio('refresh');
        $("#counter_targetBehavior").val(data.countTargetBehavior).change();
        if(pgUtil.isWebBrowser()) {
            $("#counter_motion").hide();
        }
        UI.settings.pageCreate();
    }
    else {
        if(! pgUtil.isWebBrowser()) {
            data.motionAlarm  = $("#counter_motionAlarm").val();
            data.motionVal    = parseFloat($("#counter_motionSlider").val());
        }
        data.showEnso           = $("#counter_showEnso")[0].checked;
        data.countTarget         = parseInt($("#counter_target").val());
        data.countTargetBehavior = $("#counter_targetBehavior").val();
        return data;
    }
};

counter.prototype.resize = function() {
    page.prototype.resize.call(this, false);
};

counter.prototype.setMotionResponse = function(response, val) {
    pgAccel.stop();
    if(response != "none" && ! pgUtil.isWebBrowser()) {
        pgAccel.onShake(onMotion, val);
        pgAccel.start({"updateInterval" : 200});
    }
    function onMotion() {
        var data = UI.counter.getPageData();
        if(data.motionAlarm=="beep") {
            pgAudio.beep();
        }
        else if(data.motionAlarm=="sound") {
            var idx = pgAudio.alarm(false);
            setTimeout(pgAudio.stopAlarm.bind(idx),60);
        }
        else if(data.motionAlarm=="silent") {
        }
        else {
            showLog("Error in motion callback");
        }
        UI.counter.startStop("motion");
    }
};

counter.prototype.getPageData = function() {
    var data = pg.getPageData("counter", pg.category());
    if(! ('motionAlarm' in data))
        data.motionAlarm = "none";
    if(! ('motionVal' in data))
        data.motionVal = 6;
    if(! ('showEnso' in data))
        data.showEnso = true;
    if(! ('countTarget' in data))
        data.countTarget = 10;
    if(! ('countTargetBehavior' in data))
        data.countTargetBehavior = "sound";
    return data;
};

counter.prototype.lever = function(arg) {
    if(arg=="left") {
        this.reset();
    }
    else if(arg=="right") {
        this.startStop();
    }
};

counter.prototype.startStop = function(trigger) {
    var data = this.getPageData();
    this.count += 1;
    var time = pgUtil.getCurrentTime();
    var eventData = {count: this.count};
    if(trigger)
        data.trigger = trigger;
    pg.addNewEvents({page: "counter", type: "count", start: time, data: eventData}, true);
    syncSoon();
    this.setValue();
    return false; // prevent click from being handled elsewhere
};

counter.prototype.reset = function() {
    var data = this.getPageData();
    this.count += 1;
    var giveFeedback = false;
    var correct = false;
    if(data.countTarget != 0) {
        correct = (this.count == data.countTarget);
        if(data.countTargetBehavior == "sound")
            giveFeedback = true;
    }
    var time = pgUtil.getCurrentTime();
    var eventData = {count: this.count}
    if(data.countTarget)
        eventData.target = data.countTarget;
    this.count = 0;
    pg.addNewEvents({page: "counter", type: "reset", start: time, data: eventData}, true);
    syncSoon();
    if(giveFeedback)
        pgAudio.giveFeedback(correct);
    this.setValue();
    return false; // prevent click from being handled elsewhere
};


UI.counter = new counter();
//# sourceURL=counter.js
