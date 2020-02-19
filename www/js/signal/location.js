

function Locometer() {
    Meter.call(this);
    this.bgGeo     = null;
    this.running   = false;
    this.callback  = null;
    //timeout:  undefined by design
    this.warned    = false;

    this.opts =  {
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
        startOnBoot:          false,
        startForeground:      true,
        notificationTitle:    'Psygraph',
        notificationText:     'Tracking location.',
        interval:             10000,
        locationProvider:     (typeof(backgroundGeolocation)!=="undefined") ? backgroundGeolocation.provider.ANDROID_ACTIVITY_PROVIDER : 0,
        // ANDROID_ACTIVITY_PROVIDER options
        fastestInterval:      5000,
        activitiesInterval:   10000,
        stopOnStillActivity:  true,

        // for IOS only
        activityType:            'Other', //'AutomotiveNavigation'
        saveBatteryOnBackground: false
    };
    this.cordovaOpts = {
        maximumAge:         6000,
        timeout:            3000,
        enableHighAccuracy: true
    };
}

Locometer.prototype = Object.create(Meter.prototype);
Locometer.prototype.constructor = Locometer;

Locometer.prototype.init = function() {
    if(!pgUtil.isWebBrowser() && !this.bgGeo &&
       typeof(backgroundGeolocation)!=="undefined") { //
        this.bgGeo = backgroundGeolocation;
    }
};

Locometer.prototype.update = function(show, data) {
    try {
        if(show) {
            this.init();
            if(data.running) {
                this.opts        = data.opts;
                this.cordovaOpts = data.cordovaOpts;
            }
            // the following is done if we were running in the background,
            // otherwise we could collect state
            this.getLocationData(cb.bind(this, data.running));
        }
        else {
            data.running     = this.running;
            data.opts        = this.opts;
            data.cordovaOpts = this.cordovaOpts;
        }
    }
    catch(err){
        pgUI.showWarn(err.toString());
        data = {running: false, opts:this.opts, cordovaOpts:this.cordovaOpts};
    }
    return data;

    function cb(running, pdata) {
        if(running) {
            this.start();
            this.setData(pdata);
        }
    }
};

Locometer.prototype.settingsDialog = function(callback) {
    var title = "Location Settings:";
    var optionText ='<div class="ui-field-contain no-field-separator" data-role="controlgroup">' +
        '<legend></legend>' +
        '<label for="map_powerSaving">Power Saving Mode</label>' +
        '<input type="checkbox" id="map_powerSaving" checked="'+this.opts.powerSaving+'"/>' +
        '</div>' +
        '<div class="ui-field-contain no-field-separator">' +
        '<label for="map_accuracy">Accuracy:</label>' +
        '<input type="range" name="map_accuracy" id="map_accuracy" min="0" max="10" step="1" value="'+this.opts.accuracy+'"/>' +
        '</div>';
    //$("#map_powerSaving").prop("checked", data.powerSaving).checkboxradio("refresh");
    //$("#map_accuracy").val(data.accuracy).trigger("change");

    Meter.prototype.settingsDialog.call(this, title, optionText, setMeter.bind(this));

    function setMeter(clickedOK) {
        if(clickedOK) {
            var opts = {};
            this.opts.powerSaving = $("#map_powerSaving").prop("checked", data.powerSaving).checkboxradio("refresh");
            this.opts.accuracy    = $("#map_accuracy").val(data.accuracy).trigger("change");
            // Accuracy is a value from 0 ( accurate) to 10 (most accurate).
            // radius ranges from 2 to 1002 meters
            var radius = (10-this.opts.accuracy) * 100 + 2;
            this.opts.desiredAccuracy  = Math.round(radius/2);
            this.opts.stationaryRadius = Math.round(radius);
            this.opts.distanceFilter   = Math.round(radius*2);
            // update interval ranges from 1000 to 61000 ms
            var updateInterval = (10-this.opts.accuracy) *6000 + 1000;
            this.opts.interval           = updateInterval;
            this.opts.fastestInterval    = updateInterval/2;
            this.opts.activitiesInterval = updateInterval/2;
            this.opts.saveBatteryOnBackground = (this.opts.accuracy < 5);
            // update the Cordova parameters
            this.cordovaOpts.maximumAge  = updateInterval;
            this.cordovaOpts.timeout     = updateInterval/2;        }
        callback(clickedOK);
    }
};

Locometer.prototype.start = function(restart) {
    this.locationChecker(false);
    if(this.running) {
        pgUI.showError("Location data already being gathered.");
        return;
    }
    this.createData(["location"]);

    // single call to getLocation to get things started.
    this.getCurrentLocation(locationCB.bind(this));
    this.running  = true;
    if(! this.runInBG()) {
        this.watchID = navigator.geolocation.watchPosition(successCB.bind(this,false), failureCB.bind(this), this.cordovaOpts);
    }
    else {
        //this.bgGeo.stop();
        this.bgGeo.configure(successCB.bind(this,true), failureCB.bind(this), this.opts);
        backgroundGeolocation.isLocationEnabled(locationEnabled.bind(this));
    }

    function locationEnabled(enabled) {
        if (enabled) {
            this.bgGeo.start();
        }
        else { // Location services are disabled
            this.checkLocationEnabled();
        }
        function cb(success) {
            if(success) {
                backgroundGeolocation.showAppSettings();
            }
        }
    }
    function successCB(bgGeo, location) {
        if(bgGeo) { // && pg.background {
            // ignore location, since there may be an array of values waiting.
            if(this.callback)
                this.getLocationData(this.callback);
            this.bgGeo.finish();
        }
        else  {
            this.addToPath(pgUtil.getCurrentTime(), location);
            if(this.callback)
                this.callback(this.data.location);
        }
    }
    function failureCB(error) {
        pgUI.showError('GeoLocation error' + error.toString());
        if(this.callback)
            this.callback("Unknown error");
    }
    function locationCB(pdata) {
        if(typeof(pdata) === "string") {
            pgUI.showError('GeoLocation error: "' +pdata +'", lowering accuracy.');
            this.cordovaOpts.enableHighAccuracy = false;
        }
    }
};

Locometer.prototype.stop = function(callback) {
    if(this.runInBG()) {
        this.bgGeo.stop();
    }
    else {
        navigator.geolocation.clearWatch(this.watchID);
        this.watchID = null;
    }
    this.running = false;
    this.locationChecker(true);
    this.getLocationData(cb.bind(this));
    function cb(path) {
        callback();
    }
};

Locometer.prototype.setCallback = function(cb) {
    this.callback = cb;
    //this.locationChecker(this.callback != null);
};

Locometer.prototype.runInBG = function() {
    return this.bgGeo && this.opts.powerSaving;
};

Locometer.prototype.locationChecker = function(run, interval) {
    interval = typeof(interval)!=="undefined" ? interval : 3000;
    if(run) {
        if(this.running) {
            //showWarn("Cannot run location checker when location gathering is running.");
            return;
        }
        if(typeof(this.timeout) !== "undefined") {
            //showWarn("Ran location checker twice");
            clearInterval(this.timeout);
        }
        this.timeout = setInterval(posChecker.bind(this), interval);
    }
    else {
        if(typeof(this.timeout) !== "undefined") {
            clearInterval(this.timeout);
            delete(this.timeout);
        }
    }
    function posChecker() {
        this.getCurrentLocation(posCallback.bind(this));

        function posCallback(pdata) {
            if(this.callback)
                this.callback(pdata);
        }
    }
};

Locometer.prototype.getCurrentLocation  = function(callback) {
    // if we are running, we should just return the last collected point
    if(this.running) {
        var len = this.data.location.length;
        if(len) {
            callback( [this.data.location[len-1]] );
            return;
        }
    }
    if(navigator.geolocation) {
        //var options = { enableHighAccuracy: true, maximumAge: 500, timeout: 6000 };
        //var watchID = navigator.geolocation.watchPosition(successCB, failCB, options);
        //var timeout = setTimeout( function() { navigator.geolocation.clearWatch( watchID ); }, 6000 );
        navigator.geolocation.getCurrentPosition(successCB.bind(this), failCB.bind(this), this.cordovaOpts);
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
        if(!this.warned) {
            pgUI.showWarn("Could not get the current location: " + err.message + ". Are GPS and/or cell networks available?");
            this.warned = true;
        }
        callback([]);
    }
};

Locometer.prototype.getLocationData = function(callback) {
    if(this.runInBG()) {
        this.bgGeo.getValidLocations(cb.bind(this));
    }
    else {
        callback(this.data.location);
    }
    function cb (locations) {
        for(var location in locations) {
            var loc = locations[location];
            this.addToPath(loc.time, loc);
        }
        for(var location in locations) {
            var loc = locations[location];
            this.bgGeo.deleteLocation(loc.id);
        }
        callback(this.data.location);
    }
};

Locometer.prototype.addToPath = function(time, location) {
    var lat;
    var lng;
    var alt=0;
    if(typeof(location.coords) !== "undefined") {
        if(typeof(location.coords.latitude)!=="undefined")
            lat = location.coords.latitude;
        if(typeof(location.coords.longitude)!=="undefined")
            lng = location.coords.longitude;
        if(location.coords.altitude)
            alt = location.coords.altitude;
    }
    else {
        if(typeof(location.latitude)!=="undefined")
            lat = location.latitude;
        if(typeof(location.longitude)!=="undefined")
            lng = location.longitude;
    }
    if(location.altitude)
        alt = location.altitude;
    if(typeof(lat)==="undefined" || typeof(lng)==="undefined") {
        pgUI.showWarn("Received empty location");
        return;
    }
    for(var i=0; i<this.data.location.length; i++) {
        if(this.data.location[i][0] > time) {
            this.data.location.splice(i,0,[ time, lat, lng, alt ]);
            return;
        }
        else if(this.data.location[i][0] === time) {
            pgUI.showLog("Multiple locations with the same timestamp.");
        }
    }
    this.pushData([ time, lat, lng, alt ]);
};
Locometer.prototype.checkLocationEnabled = function() {
    backgroundGeolocation.isLocationEnabled(locationEnabled.bind(this));
    function locationEnabled(enabled) {
        if(!enabled) {
            pgUI.showDialog({title: "Location disabled", true: "OK", false: "Cancel"},
                       'Location services are turned off. Would you like to turn them on?',
                       cb);
        }
    }
    function cb(success) {
        if(success) {
            backgroundGeolocation.showLocationSettings();
        }
    }
};

Locometer.prototype.getDistance = function(path) {
    var sum = 0;
    for(var i=1; i<path.length; i++) {
        var a = {lat: path[i-1][1], lng: path[i-1][2]};
        var b = {lat: path[i][1], lng: path[i][2]};
        sum += calculate_distance(a,b);
    }
    return sum;

    var units = "english"; // miles, not km
    function calculate_distance(a, b) {
        var R = (units === "english") ? 3958.7558 : 6371;

        var dLat = (a.lat - b.lat) * Math.PI / 180;
        var dLon = (a.lng - b.lng) * Math.PI / 180;
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
};


var pgLocation = new Locometer();


