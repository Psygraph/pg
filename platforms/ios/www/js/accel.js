
var pgAccel = {
    accelWatchId:         null,
    orientWatchId:        null,
    opts:                 { updateInterval: 250, watchRot: false, watchAccel: true },
    previousAcceleration: new Array(),
    previousRotation:     new Array(),
    previousOrientation:  new Array(),
    lastAcc:              {t: 0, x:0, y:0, z:0},
    lastRot:              {t: 0, a:0, b:0, g:0},
    lastOrient:           {t: 0, orient:0},
    lastShakeTime:        0,
    shakeCallBack:        null,
    shakeVal:             null,
    shakeTimeout:         800,
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
            pgAccel.previousAcceleration = new Array();
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
        if(typeof(navigator.accelerometer)!="undefined") {
            if(pgAccel.accelWatchID==null && pgAccel.opts.watchAcceleration) {
                var opts = {frequency: pgAccel.opts.updateInterval};
                pgAccel.accelWatchId = navigator.accelerometer.watchAcceleration(accelSuccess, accelFail, opts);
            }
        }
        //else if (window.DeviceMotionEvent) {
        //    window.addEventListener('devicemotion', pgAccel.deviceMotionCB, false);
        //}
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
            navigator.accelerometer.getCurrentAcceleration(pgAccel.accelerationCB, null);
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
        if(typeof(navigator.compass)=="undefined")
            d.resolve(false);
        else
            navigator.compass.getCurrentHeading(onSuccess, onError);
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
                         prevAccel:   pgAccel.previousAcceleration,
                         prevRot:     pgAccel.previousRotation,
                         prevOrient:  pgAccel.previousOrientation
                        };
            return state;
        }
        if(typeof(state)!="undefined") { //starting
            pgAccel.opts                 = state.opts;
            pgAccel.previousAcceleration = state.prevAccel;
            pgAccel.previousRotation     = state.prevRot;
            pgAccel.previousOrientation  = state.prevOrient;
            if(state.running)
                pgAccel.start({restarting: true});
        }
    },

    // Stop watching the accelerometer
    stop: function() {
        if (pgAccel.accelWatchId != null) {
            navigator.accelerometer.clearWatch(pgAccel.watchId);
            pgAccel.accelWatchId = null;
            pgAccel.shakeCallBack = null;
            pgAccel.lastShakeTime = 0;
        }
        if(pgAccel.orientWatchId != null) {
            navigator.compass.clearWatch(pgAccel.orientWatchId);
            pgAccel.orientWatchId = null;
        }
        pgAccel.running = false;
    },
    // get the accumulated accel data
    getAccelerationData: function() {
        return pgAccel.previousAcceleration;
    },
    // get the accumulated rotation data
    getRotationData: function() {
        return pgAccel.previousRotation;
    },
    // get the accumulated rotation data
    getOrientationData: function() {
        return pgAccel.previousOrientation;
    },
    
    // watch a running accelerometer for a shake
    shake: function(onShake, shakeVal, shakeTimeout) {
        pgAccel.shakeVal      = typeof(shakeVal)!="undefined" ? shakeVal : 12;
        pgAccel.shakeTimeout  = typeof(shakeTimeout)!="undefined" ? shakeTimeout : 1000;
        pgAccel.shakeCallBack = onShake;
    },
    deviceMotionCB: function(event) {
        // Grab the acceleration from the results
        var acc = event.acceleration;
        if(typeof(acc)=="undefined" || 
           typeof(acc.x)=="undefined")
            return;
        pgAccel.lastAcc.x += acc.x;
        pgAccel.lastAcc.y += acc.y;
        pgAccel.lastAcc.z += acc.z;

        var rot = event.rotationRate;
        pgAccel.lastRot.a += rot.alpha;
        pgAccel.lastRot.b += rot.beta;
        pgAccel.lastRot.g += rot.gamma;

        var time = pgUtil.getCurrentTime();
        // new acceleration event
        if(pgAccel.opts.watchAccel &&
           time >= pgAccel.lastAcc.t + pgAccel.opts.updateInterval) {
            var len = pgAccel.previousAcceleration.length;
            pgAccel.previousAcceleration[len] = [ time,
                                                  pgAccel.lastAcc.x,
                                                  pgAccel.lastAcc.y,
                                                  pgAccel.lastAcc.z ];
            pgAccel.lastAcc = {t: time, x:0, y:0, z:0};
        }
        // new rotation event
        if(pgAccel.opts.watchRot &&
           time >= pgAccel.lastRot.t + pgAccel.opts.updateInterval) {
            var len = pgAccel.previousRotation.length;
            pgAccel.previousRotation[len] = [ time,
                                              pgAccel.lastRot.a,
                                              pgAccel.lastRot.b,
                                              pgAccel.lastRot.g ];
            pgAccel.lastRot = {t: time, a:0, b:0, g:0};
        }
    },
    // Gets the current acceleration snapshot from the last accelerometer watch
    // Assess the current acceleration parameters to determine a shake
    accelerationCB: function(acc) {
        if(typeof(acc)=="undefined" || 
           typeof(acc.x)=="undefined")
            return;
        var len = pgAccel.previousAcceleration.length;
        pgAccel.previousAcceleration[len] = [ acc.timestamp,
                                              acc.x,
                                              acc.y,
                                              acc.z ];
        pgAccel.detectShake();
    },
    detectShake: function() {
        var len = pgAccel.previousAcceleration.length;
        if (len > 1) {
            var prev = pgAccel.previousAcceleration[len-2];
            var last = pgAccel.previousAcceleration[len-1];
            var delta = {};
            delta.x = Math.pow(prev[1]-last[1], 2);
            delta.y = Math.abs(prev[2]-last[2], 2);
            delta.z = Math.abs(prev[3]-last[3], 2);

            var timeSinceLast = last[0] - pgAccel.lastShakeTime;
            if (timeSinceLast > pgAccel.shakeTimeout &&
                Math.sqrt(delta.x + delta.y + delta.z) > pgAccel.shakeVal) {
                // Shake detected
                if (typeof(pgAccel.shakeCallBack)=="function") {
                    pgUtil.executeAsync(pgAccel.shakeCallBack);
                }
                pgAccel.lastShakeTime = last[0];//pgUtil.getCurrentTime();
            }
        }
    }

};
