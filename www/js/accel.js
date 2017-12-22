
var pgAccel = {
    accelWatchId:         null,
    orientWatchId:        null,
    opts:                 { updateInterval: 250, watchRot: false, watchAccel: true },
    //previousAcceleration: new Array(),
    previousRotation:     new Array(),
    previousOrientation:  new Array(),
    lastAcc:              {t: 0, x:0, y:0, z:0},
    lastRot:              {t: 0, a:0, b:0, g:0},
    lastOrient:           {t: 0, orient:0},
    category:             "",
    startTime:            0,
    running:              false,

    // Start watching the accelerometer
    start: function (opts) {
        opts = typeof(opts)!="undefined" ? opts : {};
        if(pgAccel.accelWatchID || pgAccel.orientWatchID) {
            showError("Accel already running");
            return;
        }
        if(typeof(opts.restarting)=="undefined") {
            //pgAccel.previousAcceleration = new Array();
            pgAccel.previousRotation     = new Array();
            pgAccel.previousOrientation  = new Array();
        }
        pgAccel.running = true;
        pgAccel.startTime = pgUtil.getCurrentTime();
        pgAccel.category = pg.category();
        for(i in opts) {
            if(i == "updateInterval"   ||
               i == "watchRotation"    ||
               i == "watchOrientation" ||
               i == "watchAcceleration"){
                pgAccel.opts[i] = opts[i];
            }
        }
        if(typeof(navigator.cyclometer)!="undefined") {
            if(pgAccel.accelWatchID==null && pgAccel.opts.watchAcceleration) {
                var opts = {frequency: pgAccel.opts.updateInterval};
                //navigator.cyclometer.start(pgAccel.opts.updateInterval);
                pgAccel.accelWatchId = navigator.cyclometer.watchAcceleration(accelSuccess, accelFail, opts);
            }
        }
        else {
            accelFail();
        }
        if(typeof(navigator.compass)!="undefined") {
            if(pgAccel.orientWatchID==null && pgAccel.opts.watchOrientation) {
                var opts = {frequency: pgAccel.opts.updateInterval};
                pgAccel.orientWatchId = navigator.compass.watchHeading(orientSuccess, orientFail, opts);
            }
        }

        function accelSuccess() {
        }
        function accelFail() {
            showError("Could not gather acceleration data.");
        }
        function orientSuccess(heading) {
            var len = pgAccel.previousOrientation.length;
            pgAccel.previousOrientation[len] = [ heading.timestamp,
                                                 heading.magneticHeading
            ];
            pgAccel.lastOrient = {t: heading.timestamp, orient: heading.magneticHeading};
        }  
        function orientFail(compassError) {
            showError('Compass error: ' + compassError.code);
        }
    },

    hasCompass: function(callback) {
        var d = $.Deferred();
        $.when(d).done(callback);
        if(typeof(navigator.compass)=="undefined") {
            d.resolve(false);
        }
        else {
            d.resolve(true);
            //navigator.compass.getCurrentHeading(onSuccess, onError);
        }
        function onSuccess(heading) {
            d.resolve(true);
        }
        function onError(error) {
            d.resolve(false);
        }
    },

    update: function(starting, state) {
        if(!starting) {
            var state = {running:     pgAccel.running,
                         opts:        pgAccel.opts,
                         prevAccel:   pgAccel.getAccelerationData(),//pgAccel.previousAcceleration,
                         prevRot:     pgAccel.previousRotation,
                         prevOrient:  pgAccel.previousOrientation
                        };
            return state;
        }
        if(typeof(state)!="undefined") { //starting
            pgAccel.opts                 = state.opts;
            pgAccel.setAccelerationData(state.prevAccel);
            pgAccel.previousRotation     = state.prevRot;
            pgAccel.previousOrientation  = state.prevOrient;
            if(state.running)
                pgAccel.start({restarting: true});
        }
    },

    // Stop watching the cyclometer
    stop: function() {
        if (pgAccel.accelWatchId != null) {
            navigator.cyclometer.clearWatch(pgAccel.accelWatchId);
            //navigator.cyclometer.stop();
            pgAccel.accelWatchId = null;
        }
        if(pgAccel.orientWatchId != null) {
            navigator.compass.clearWatch(pgAccel.orientWatchId);
            pgAccel.orientWatchId = null;
        }
        pgAccel.running = false;
    },
    // get the accumulated accel data
    getAccelerationData: function() {
        if(typeof(navigator.cyclometer)=="undefined")
            return [];
        return navigator.cyclometer.getPreviousAcceleration();
    },
    setAccelerationData: function(data) {
        if(typeof(navigator.cyclometer)!="undefined")
            return navigator.cyclometer.setPreviousAcceleration(data);
    },
    // get the accumulated rotation data
    getRotationData: function() {
        return pgAccel.previousRotation;
    },
    // get the accumulated rotation data
    getOrientationData: function() {
        return pgAccel.previousOrientation;
    },
    // watch a running cyclometer for a shake
    onShake: function(shakeCB, threshold) {
        //navigator.cyclometer.offShake(shakeCB);
        navigator.cyclometer.offShake("all");
        navigator.cyclometer.onShake(shakeCB, threshold);
    },
    
};
