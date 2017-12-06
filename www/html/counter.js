
var counter = function () {
    page.call(this, "counter");
    this.count = 0;
    this.initialized = false;
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
        var knobOpts = {min:  0,
                        max:  100, 
                        step: 0.1,
                        readOnly: true,
                        rotation: "clockwise",
                        lineCap : "round",
                        fgColor: "rgba(0,0,0,1)",
                        bgColor: "rgba(0,0,0,0)"
        };
        $("#counter_enso").knob(knobOpts);
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
    if(!data.showCount) {
        $("#counter_edit").val("");
        $("#counter_enso").trigger('configure', {fgColor: "rgba(0,0,0,0)"});
    }
    else {
        $("#counter_edit").val(this.count);
        $("#counter_enso").trigger('configure', {fgColor: "rgba(0,0,0,1)"});
        var frac = 100 * (this.count+1) / data.countTarget;
        $('#counter_enso').val(frac).trigger('change');
    }
    this.resize();
    this.setMotionResponse(data.motionAlarm, data.motionVal);
};

counter.prototype.settings = function() {
    var data = this.getPageData();
    if(arguments.length) {
        s = "<div class='ui-field-contain no-field-separator' data-role='controlgroup'>";
        if(!pgUtil.isWebBrowser()) {
            s += "<fieldset>";
            s += "<label for='motionSlider'>Motion threshold:</label>";
            s += "<input type='range' name='motionSlider' id='motionSlider' value='" + data.motionVal + "' min='0' max='20' step='0.1'>";
            s += "</fieldset>";
            s += "<fieldset>";
            s += "<div class='ui-field-contain no-field-separator'>";
            s += "  <label for='motionAlarm'>Motion alarm:</label>";
            s += "  <select id='motionAlarm' value='Motion alarm' title='Motion alarm' data-native-menu='false'>";
            s += "    <option value='none'>none</option>";
            s += "    <option value='silent'>silent</option>";
            s += "    <option value='beep'>beep/buzz</option>";
            s += "    <option value='sound'>sound</option>";
            s += "  </select>";
            s += "</div>";
            s += "</fieldset>";
        }
        s += "<fieldset>";
        s += "<label for='countTarget'>Count target:</label>";
        s += "<input type='range' name='countTarget' id='countTarget' value='" + data.countTarget + "' min='0' max='20' step='1'>";
        s += "</fieldset>";
        s += "<fieldset>";
        s += "<div class='ui-field-contain no-field-separator'>";
        s += "  <label for='countTargetBehavior'>Count target behavior:</label>";
        s += "  <select id='countTargetBehavior' value='Count target behavior' title='Count target behavior' data-native-menu='false'>";
        s += "    <option value='none'>none</option>";
        s += "    <option value='sound'>sound</option>";
        s += "  </select>";
        s += "</div>";
        s += "</fieldset>";
        s += printCheckbox("counter_showCount", "Show count", data.showCount);

        s += "</div>";
        UI.settings.setPageContent(s);

        if(!pgUtil.isWebBrowser())
            $("#motionAlarm").val(data.motionAlarm).change();
        $("#countTargetBehavior").val(data.countTargetBehavior).change();
        UI.settings.pageCreate();
    }
    else {
        if(! pgUtil.isWebBrowser()) {
            data.motionAlarm  = $("#motionAlarm").val();
            data.motionVal    = parseFloat($("#motionSlider").val());
        }
        data.showCount           = $("#counter_showCount")[0].checked;
        data.countTarget         = parseInt($("#countTarget").val());
        data.countTargetBehavior = $("#countTargetBehavior").val();
        return data;
    }
};

counter.prototype.resize = function() {
    page.prototype.resize.call(this, false);
};

counter.prototype.setMotionResponse = function(response, val) {
    if(response != "none" && ! pgUtil.isWebBrowser()) {
        pgAccel.shake(this.onMotion.bind(this), val, 2000);
        pgAccel.start();
    }
    else {
        pgAccel.stop();
    }
};

counter.prototype.onMotion = function() {
    var data = this.getPageData();
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
    this.startStop("motion");
};

counter.prototype.getPageData = function() {
    var data = pg.getPageData("counter", pg.category());
    if(! ('motionAlarm' in data))
        data.motionAlarm = "none";
    if(! ('motionVal' in data))
        data.motionVal = 6;
    if(! ('showCount' in data))
        data.showCount = true;
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
    if(data.showCount) {
        $("#counter_edit").val(this.count);
        if(data.countTarget != 0) {
            var frac = 100 * (this.count+1) / data.countTarget;
            $('#counter_enso').val(frac).trigger('change');
        }
    }
    var time = pgUtil.getCurrentTime();
    var eventData = {count: this.count};
    if(trigger)
        data.trigger = trigger;
    pg.addNewEvents({page: "counter", type: "count", start: time, data: eventData}, true);
    syncSoon();
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
    if(data.showCount) {
        $("#counter_edit").val(this.count);
        if(data.countTarget != 0) {
            var frac = 100 * (this.count+1) / data.countTarget;
            $('#counter_enso').val(frac).trigger('change');
        }
    }
    syncSoon();
    if(giveFeedback)
        pgAudio.giveFeedback(correct);
    return false; // prevent click from being handled elsewhere
};


UI.counter = new counter();
//# sourceURL=counter.js
