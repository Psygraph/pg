

var pgLocation = {
    bgGeo:            null,
    previousLocation: new Array(),
    running:          false,
    callback:         null,
    //timeout:  undefined by design
    warned:           false,

    opts: {
        // PG configuration
        powerSaving:       true,

        // Geolocation config
        desiredAccuracy:   5,
        stationaryRadius:  10,
        distanceFilter:    15,
        maxLocations:      10000,
        debug:             false,
        stopOnTerminate:   false,
        //    url: 'http://192.168.81.15:3000/locations',
        //syncUrl: 'http://192.168.81.15:3000/sync',
        //syncThreshold: 100,
        //httpHeaders: {
        //    'X-FOO': 'bar'
        //},
        
        // for Android only, which logs the events to a file if url=="file://*"
        startOnBoot:       false,
        startForeground:   true,
        notificationTitle: 'Psygraph',
        notificationText:  'Tracking location.',
        interval:          10000,
        locationProvider:  (typeof(backgroundGeolocation)!="undefined") ? backgroundGeolocation.provider.ANDROID_ACTIVITY_PROVIDER : 0,
        // ANDROID_ACTIVITY_PROVIDER options
        fastestInterval:      5000,
        activitiesInterval:   10000,
        stopOnStillActivity:  true,

        // for IOS only
        activityType:            'Other', //'AutomotiveNavigation'
        saveBatteryOnBackground: false
    },

    init: function() {
        if(!pgUtil.isWebBrowser() && !pgLocation.bgGeo &&
           typeof(backgroundGeolocation)!="undefined") { // 
            pgLocation.bgGeo = backgroundGeolocation;
        }
    },
    
    cordovaOpts: {
        maximumAge: 6000,
        timeout:    3000,
        enableHighAccuracy: true
    },
    
    setCallback: function(cb) {
        pgLocation.callback = cb;
        pgLocation.locationChecker(pgLocation.callback != null);
    },

    runInBG: function() {
        return pgLocation.bgGeo && pgLocation.opts.powerSaving;
    },

    locationChecker: function(run, interval) {
        interval = typeof(interval)!="undefined" ? interval : 3000;
        if(run) {
            if(pgLocation.running) {
                //showWarn("Cannot run location checker when location gathering is running.");
                return;
            }
            if(typeof(pgLocation.timeout) != "undefined") {
                //showWarn("Ran location checker twice");
                clearInterval(pgLocation.timeout);
            }
            pgLocation.timeout = setInterval(posChecker, interval);
        }
        else {
            if(typeof(pgLocation.timeout) != "undefined") {
                clearInterval(pgLocation.timeout);
                delete(pgLocation.timeout);
            }
        }
        function posChecker() {
            pgLocation.getCurrentLocation(posCallback);
            
            function posCallback(data) {
                if(pgLocation.callback)
                    pgLocation.callback(data);
            }
        }
    },

    getCurrentLocation : function(callback) {
        // if we are running, we should just return the last collected point
        if(pgLocation.running) {
            var len = pgLocation.previousLocation.length;
            if(len) {
                callback( [pgLocation.previousLocation[len-1]] );
                return;
            }
        }
        if(navigator.geolocation) {
            //var options = { enableHighAccuracy: true, maximumAge: 500, timeout: 6000 };
            //var watchID = navigator.geolocation.watchPosition(successCB, failCB, options);
            //var timeout = setTimeout( function() { navigator.geolocation.clearWatch( watchID ); }, 6000 );
            navigator.geolocation.getCurrentPosition(successCB, failCB, pgLocation.cordovaOpts);
        }
        else
            callback();
        function successCB(pos) {
            point = [ pos.timestamp,
                      pos.coords.latitude,
                      pos.coords.longitude,
                      pos.coords.altitude
                    ];
            if(point[3]==null)
                point[3]=0;
            callback([point]);
        }
        function failCB(err) {
            if(!pgLocation.warned) {
                showWarn("Could not get the current location: " + err.message + ". Are GPS and/or cell networks available?");
                pgLocation.warned = true;
            }
            callback([]);
        }
    },

    getLocationData: function(callback) {
        if(pgLocation.runInBG()) {
            pgLocation.bgGeo.getValidLocations(cb);
        }
        else {
            callback(pgLocation.previousLocation);
        }
        function cb (locations) {
            for(var location in locations) {
                var loc = locations[location];
                pgLocation.addToPath(loc.time, loc);
            }
            for(var location in locations) {
                var loc = locations[location];
                pgLocation.bgGeo.deleteLocation(loc.id);
            }
            callback(pgLocation.previousLocation);
        }
    },

    addToPath: function(time, location) {
        var lat;
        var lng;
        var alt=0;
        if(typeof(location.coords) != "undefined") {
            if(typeof(location.coords.latitude)!="undefined")
                lat = location.coords.latitude;
            if(typeof(location.coords.longitude)!="undefined")
                lng = location.coords.longitude;
            if(location.coords.altitude)
                alt = location.coords.altitude;
        }
        else {
            if(typeof(location.latitude)!="undefined")
                lat = location.latitude;
            if(typeof(location.longitude)!="undefined")
                lng = location.longitude;
        }
        if(location.altitude)
            alt = location.altitude;
        if(typeof(lat)=="undefined" || typeof(lng)=="undefined") {
            showWarn("Received empty location");
            return;
        }
        for(var i=0; i<pgLocation.previousLocation.length; i++) {
            if(pgLocation.previousLocation[i][0] > time) {
                pgLocation.previousLocation.splice(i,0,[ time, lat, lng, alt ]);
                return;
            }
            else if(pgLocation.previousLocation[i][0] == time) {
                showWarn("We should not have multiple location data with the same timestamp.");
            }
        }
        pgLocation.previousLocation.push([ time, lat, lng, alt ]);
    },
    update: function(starting, state) {
        if(!starting) {
            var state = {running:     pgLocation.running,
                         opts:        pgLocation.opts,
                         cordovaOpts: pgLocation.cordovaOpts
            };
            return state;
        }
        if(typeof(state)!="undefined" && state.opts) { //starting
            if(state.running) {
                pgLocation.opts        = state.opts;
                pgLocation.cordovaOpts = state.cordovaOpts;
            }
            pgLocation.getLocationData(cb.bind(this,state.running));
        }
        function cb(running, data) {
            if(running)
                pgLocation.start({restarting: true});
        }
    },
    start: function(opts) {
        pgLocation.init();
        pgLocation.locationChecker(false);
        if(pgLocation.running) {
            showError("Location data already being gathered.");
            return;
        }
        if(typeof(opts.restarting)=="undefined")
            pgLocation.previousLocation = new Array();
        for(i in opts) {
            if(i == "accuracy") {
                // Accuracy is a value from 0 ( accurate) to 10 (most accurate).
                // radius ranges from 2 to 1002 meters
                var radius = (10-opts[i]) * 100 + 2;
                pgLocation.opts.desiredAccuracy  = Math.round(radius/2);
                pgLocation.opts.stationaryRadius = Math.round(radius);
                pgLocation.opts.distanceFilter   = Math.round(radius*2);

                // update interval ranges from 1000 to 61000 ms
                var updateInterval = (10-opts[i]) *6000 + 1000;
                pgLocation.opts.interval           = updateInterval;
                pgLocation.opts.fastestInterval    = updateInterval/2;
                pgLocation.opts.activitiesInterval = updateInterval/2;

                pgLocation.opts.saveBatteryOnBackground = (opts[i] < 5);
             
                // update the Cordova parameters
                pgLocation.cordovaOpts.maximumAge         = updateInterval;
                pgLocation.cordovaOpts.timeout            = updateInterval/2;
                //pgLocation.cordovaOpts.enableHighAccuracy = opts[i] > 5;
            }
            else if( i=="powerSaving" ) {
                pgLocation.opts.powerSaving = opts[i];
            }
        }

        // single call to getLocation to get things started.
        pgLocation.getCurrentLocation(locationCB.bind(this));
        pgLocation.running  = true;
        if(! pgLocation.runInBG()) {
            pgLocation.watchID = navigator.geolocation.watchPosition(successCB.bind(this,false), failureCB, pgLocation.cordovaOpts);
        }
        else {
            // xxx do we _need_ to stop and restart?  Or is the service still running?
            if(typeof(opts.restarting)!="undefined")
                pgLocation.bgGeo.stop();
            pgLocation.bgGeo.configure(successCB.bind(this,true), failureCB, pgLocation.opts);
            backgroundGeolocation.isLocationEnabled(locationEnabled);
        }
        
        function locationEnabled(enabled) {
            if (enabled) {
                pgLocation.bgGeo.start(
                    function () {
                        showLog("Location service started successfully.");
                    },
                    function (error) {
                        // Tracking has not started because of error
                        if (error.code === 2) {
                            showDialog({title: "Location disabled", true: "OK", false: "Cancel"},
                                       'Location detection is not enabled for this app. Would you like to open the app settings?', 
                                       cb.bind(this,1));
                        }
                        else {
                            showAlert('Location monitoring failed: ' + error.message);
                        }
                    }
                );
            } 
            else { // Location services are disabled
                showDialog({title: "Location disabled", true: "OK", false: "Cancel"},
                           'Location services are truned off. Would you like to turn them on?', 
                           cb.bind(this,2));
            }
            function cb(type, success) {
                if(success) {
                    if(type==1)
                        typebackgroundGeolocation.showAppSettings();
                    else if(type==2)
                        backgroundGeolocation.showLocationSettings();
                }
            }
        }
        function successCB(bgGeo, location) {
            if(bgGeo) { // && pg.background {
                // ignore location, since there may be an array of values waiting.
                if(pgLocation.callback)
                    pgLocation.getLocationData(pgLocation.callback);
                pgLocation.bgGeo.finish();
            }
            else  {
                pgLocation.addToPath(pgUtil.getCurrentTime(), location);
                if(pgLocation.callback)
                    pgLocation.callback(pgLocation.previousLocation);
            }
        }
        function failureCB(error) {
            showError('GeoLocation error' + error.toString());
            if(pgLocation.callback)
                pgLocation.callback("Unknown error");
        }
        function locationCB(data) {
            if(typeof(data) == "string") {
                showError('GeoLocation error: "' +data +'", lowering accuracy.');
                pgLocation.cordovaOpts.enableHighAccuracy = false;
            }
        }
    },
    stop: function() {
        if(pgLocation.runInBG()) {
            pgLocation.bgGeo.stop();
        }
        else {
            navigator.geolocation.clearWatch(pgLocation.watchID);
            pgLocation.watchID = null;
        }
        pgLocation.running = false;
        pgLocation.locationChecker(true);
    },
    
    getPathLength: function(path) {
        var sum = 0;
        for(var i=1; i<path.length; i++) {
            var a = {lat: path[i-1][1], lng: path[i-1][2]};
            var b = {lat: path[i][1], lng: path[i][2]};
            sum += calculate_distance(a,b);
        }
        return sum;

        var units = "english"; // miles, not km
        function calculate_distance(a, b) {
            var R = (units == "english") ? 3958.7558 : 6371;

            var dLat = (a.lat - b.lat) * Math.PI / 180;
            var dLon = (a.lng - b.lng) * Math.PI / 180;
            var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        }
    }
};
