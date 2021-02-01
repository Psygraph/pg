import {pgUtil, pgDebug} from '../util';
import {pgUI} from '../ui';
import {Meter} from './meter';
import * as $ from 'jquery';

export class Locometer extends Meter {
    bgGeo = false;
    running = false;
    callback = null;
    //timeout:  undefined by design
    warned = false;
    watchID = -1;
    timeout = null;
    opts = {
        // PG configuration
        powerSaving: true,
        accuracy: 0,
        
        // Geolocation config
        desiredAccuracy: 5,
        stationaryRadius: 10,
        distanceFilter: 15,
        maxLocations: 10000,
        debug: false,
        stopOnTerminate: false, //    url: 'http://192.168.81.15:3000/locations',
        //syncUrl: 'http://192.168.81.15:3000/sync',
        //syncThreshold: 100,
        //httpHeaders: {
        //    'X-FOO': 'bar'
        //},
        
        // for Android only, which logs the events to a file if url=="file://*"
        startOnBoot: false,
        startForeground: true,
        notificationTitle: 'Psygraph',
        notificationText: 'Tracking location.',
        interval: 10000,
        locationProvider: pgUtil.geolocation ? pgUtil.geolocation.provider.ANDROID_ACTIVITY_PROVIDER : 0, // ANDROID_ACTIVITY_PROVIDER options
        fastestInterval: 5000,
        activitiesInterval: 10000,
        stopOnStillActivity: true,
        
        // for IOS only
        activityType: 'Other', //'AutomotiveNavigation'
        saveBatteryOnBackground: false
    };
    cordovaOpts = {
        maximumAge: 2000, timeout: 5000, enableHighAccuracy: true
    };
    bgOpts:any = {};

    constructor() {
        super('location');
        this.running = false;
        this.callback = null;
        //timeout:  undefined by design
        this.warned = false;
    }
    
    init() {
        if (!pgUtil.isWebBrowser && pgUtil.geolocation) { //
            //document.addEventListener('deviceready', onDeviceReady.bind(this), false);
            onDeviceReady.call(this);
        }
        function onDeviceReady() {
            this.bgGeo = true;
            this.bgOpts = {
                locationProvider: pgUtil.geolocation.ACTIVITY_PROVIDER,
                desiredAccuracy: pgUtil.geolocation.HIGH_ACCURACY,
                stationaryRadius: 50,
                distanceFilter: 50,
                notificationTitle: 'Background tracking',
                notificationText: 'enabled',
                debug: false, // handy info about
                startForeground: true,
                interval: 10000,
                fastestInterval: 5000,
                activitiesInterval: 10000,
            };
            pgUtil.geolocation.configure(this.bgOpts);
            pgUtil.geolocation.on('location', this.locationCB.bind(this, false));
            pgUtil.geolocation.on('stationary', this.locationCB.bind(this, true));
            pgUtil.geolocation.on('error', this.failureCB.bind(this));
            pgUtil.geolocation.on('start', function() {
                pgDebug.showLog('BackgroundGeolocation service has been started');
            });
            pgUtil.geolocation.on('stop', function() {
                pgDebug.showLog('BackgroundGeolocation service has been stopped');
            });
            pgUtil.geolocation.on('authorization', function(status) {
                pgDebug.showLog('BackgroundGeolocation authorization status: ' + status);
                if (status !== pgUtil.geolocation.AUTHORIZED) {
                    pgUI.showDialog({title: 'Location disabled', true: 'OK', false: 'Cancel'},
                        'Location services are turned off. Would you like to turn them on?',
                        cb.bind(this));
                }
                function cb(success, data) {
                    if (success) {
                        pgUtil.geolocation.showAppSettings();
                    }
                }
            });
            pgUtil.geolocation.on('background', function() {
                pgDebug.showLog('App is in background');
                // you can also reconfigure service (changes will be applied immediately)
                pgUtil.geolocation.configure({ debug: true });
            });
            pgUtil.geolocation.on('foreground', function() {
                pgDebug.showLog('App is in foreground');
                pgUtil.geolocation.configure({ debug: false });
            });
            pgUtil.geolocation.on('http_authorization', () => {
                pgDebug.showLog('App needs to authorize the http requests');
            });
            pgUtil.geolocation.checkStatus(function(status) {
                pgDebug.showLog('BackgroundGeolocation service is running: ' + status.isRunning);
                pgDebug.showLog('BackgroundGeolocation services enabled: ' + status.locationServicesEnabled);
                pgDebug.showLog('BackgroundGeolocation auth status: ' + status.authorization);
            });
        }
    }
    getAllSignalsNV() {
        return [
            {name: "Location", value:"location"},
        ];
    }
    update(show, data) {
        try {
            if (show) {
                if (data.running) {
                    this.opts = data.opts;
                    this.cordovaOpts = data.cordovaOpts;
                    //this.start();
                    this.data.location = data.location;
                }
            } else {
                data.running = this.running;
                data.opts = this.opts;
                data.cordovaOpts = this.cordovaOpts;
                data.location = this.data.location;
            }
        } catch (err) {
            pgDebug.showWarn(err.toString());
            data = {running: false, opts: this.opts, cordovaOpts: this.cordovaOpts};
        }
        return data;
        
        function cb(running, pdata) {
        }
    }
    settingsDialog(callback) {
        const opts = this.settingsDialogOpts('Location Settings', gatherData);
        const content = `
            <ion-item>
                <ion-label>Power Saving Mode:</ion-label>
                <ion-checkbox id="map_powerSaving" checked="` + !!this.opts.powerSaving + `"></ion-checkbox>
            </ion-item>
            <ion-item>
                <ion-label>Accuracy:</ion-label>
                <ion-range id="map_accuracy" min="0" max="10" step="1" value="` + this.opts.accuracy + `"></ion-range>
            </ion-item>`;
        //$("#map_powerSaving").prop("checked", data.powerSaving).checkboxradio("refresh");
        //$("#map_accuracy").val(data.accuracy).trigger("change");
        super.settingsDialog(opts, content, setMeter.bind(this));
        function gatherData() {
            return {
                powerSaving: $('#map_powerSaving').attr('aria-checked') == "true",
                accuracy: $('#map_accuracy').val(),
            };
        }
        function setMeter(success, data) {
            if (success) {
                this.opts.powerSaving = data.powerSaving;
                this.opts.accuracy = data.accuracy;
                // Accuracy is a value from 0 ( accurate) to 10 (most accurate).
                // radius ranges from 2 to 1002 meters
                const radius = (10 - this.opts.accuracy) * 100 + 2;
                this.opts.desiredAccuracy = Math.round(radius / 2);
                this.opts.stationaryRadius = Math.round(radius);
                this.opts.distanceFilter = Math.round(radius * 2);
                // update interval ranges from 1000 to 61000 ms
                const updateInterval = (10 - this.opts.accuracy) * 6000 + 1000;
                this.opts.interval = updateInterval;
                this.opts.fastestInterval = updateInterval / 2;
                this.opts.activitiesInterval = updateInterval / 2;
                this.opts.saveBatteryOnBackground = (this.opts.accuracy < 5);
                // update the Cordova parameters
                this.cordovaOpts.maximumAge = updateInterval;
                this.cordovaOpts.timeout = updateInterval / 2;
            }
            callback(success);
        }
    }
    
    start() {
        if (this.running) {
            pgDebug.showError('Location data already being gathered.');
            return;
        }
        this.createData(['location']);
        // single call to getLocation to get things started.
        this.getCurrentLocation(this.locationCB.bind(this, false));
        this.running = true;
        if (!this.bgGeo) {
            //this.compassPremissioniOS();
            this.watchID = navigator.geolocation.watchPosition(this.locationCB.bind(this, false), this.failureCB.bind(this), this.cordovaOpts);// eslint-disable-line
        } else {
            pgUtil.geolocation.start();
        }
    }

    locationCB(stationary, location) {
        // handle your locations here
        if(this.bgGeo) {
            if(! ("time" in location)) {
                location.time = pgUtil.getCurrentTime();
            }
            this.addToPath(location.time, location);
            if (this.callback) {
                pgUtil.geolocation.startTask(
                    ((taskKey) => {
                    this.callback(this.data.location);
                    pgUtil.geolocation.endTask(taskKey);
                }).bind(this) );
            }
        }
        else {
            this.addToPath(pgUtil.getCurrentTime(), location);
            if (this.callback) {
                this.callback(this.data.location);
            }
        }
    }
    failureCB(error) {
        //pgDebug.showError('GeoLocation error' + error.toString());
        if (this.callback) {
            this.callback('Unknown error');
        }
    }
    async stop(): Promise<number> {
        return new Promise(finish.bind(this));
        function finish(resolve, reject) {
            if (this.bgGeo) {
                pgUtil.geolocation.stop();
                this.getLocationData(cb);
            } else {
                navigator.geolocation.clearWatch(this.watchID);
                this.watchID = null;
                resolve(2);
            }
            this.running = false;
            function cb(data) {
                pgUtil.geolocation.deleteAllLocations(() => {resolve(1)}, () => {reject("unknown")});
            }
        }
    }
    setCallback(cb) {
        this.callback = cb;
    }

    getCurrentLocation(callback= (array)=>{} ) {
        // if we are running, we should just return the last collected point
        if (this.running) {
            const len = this.data.location.length;
            if (len) {
                callback([this.data.location[len - 1]]);
                return;
            }
        }
        if (!this.bgGeo) {
            //const options = { enableHighAccuracy: true, maximumAge: 500, timeout: 6000 };
            //const watchID = navigator.geolocation.watchPosition(successCB, failCB, options);
            //const timeout = setTimeout( function() { navigator.geolocation.clearWatch( watchID ); }, 6000 );
            navigator.geolocation.getCurrentPosition(successCB.bind(this), failCB.bind(this), this.cordovaOpts);// eslint-disable-line
        } else {
            callback([]);
        }
        function successCB(pos) {
            const point = [pos.timestamp, pos.coords.latitude, pos.coords.longitude, pos.coords.altitude];
            if (point[3] == null) {
                point[3] = 0;
            }
            callback([point]);
        }
        function failCB(err) {
            if (!this.warned) {
                pgDebug.showWarn('Could not get the current location: ' + err.message + '. Are GPS and/or cell networks available?');
                this.warned = true;
            }
            callback([]);
        }
    }
    getLocationData(callback) {
        if (this.bgGeo) {
            pgUtil.geolocation.getLocations(cb.bind(this));
        } else {
            callback(this.data.location);
        }
        function cb(locations) {
            for (const location in locations) {
                const loc = locations[location];
                this.addToPath(loc.time, loc);
            }
            callback(this.data.location);
        }
    }
    addToPath(time, location) {
        let lat;
        let lng;
        let alt = 0;
        if ("coords" in location) {
            location = location.coords;
        }
        if ("latitude" in location) {
            lat = location.latitude;
        }
        if ("longitude" in location) {
            lng = location.longitude;
        }
        if ("altitude" in location) {
            alt = location.altitude;
        }
        if (typeof (lat) === 'undefined' || typeof (lng) === 'undefined') {
            pgDebug.showWarn('Received empty location');
            return;
        }
        for (let i = 0; i < this.data.location.length; i++) {
            if (this.data.location[i][0] > time) {
                this.data.location.splice(i, 0, [time, lat, lng, alt]);
                return;
            } else if (this.data.location[i][0] === time) {
                pgDebug.showLog('Multiple locations with the same timestamp: ' + time);
            }
        }
        this.pushData([time, lat, lng, alt]);
    }

    getDistance(path) {
        let sum = 0;
        for (let i = 1; i < path.length; i++) {
            const a = {lat: path[i - 1][1], lng: path[i - 1][2]};
            const b = {lat: path[i][1], lng: path[i][2]};
            sum += calculateDistance(a, b);
        }
        return sum;
        
        function calculateDistance(a, b) {
            const units = 'english'; // miles, not km
            const R = (units === 'english') ? 3958.7558 : 6371;
            
            const dLat = (a.lat - b.lat) * Math.PI / 180;
            const dLon = (a.lng - b.lng) * Math.PI / 180;
            const a2 = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a2));
            return R * c;
        }
    }
}

export const pgLocation = new Locometer();


/*
runInBG() {
    return pgUtil.geolocation && this.opts.powerSaving;
}
locationChecker(run, interval = 8000) {
    if (run) {
        if (this.running) {
            //showWarn("Cannot run location checker when location gathering is running.");
            return;
        }
        if (typeof (this.timeout) !== 'undefined') {
            //showWarn("Ran location checker twice");
            clearInterval(this.timeout);
        }
        this.timeout = setInterval(posChecker.bind(this), interval); // eslint-disable-line
    } else {
        if (typeof (this.timeout) !== 'undefined') {
            clearInterval(this.timeout);
            delete (this.timeout);
        }
    }
    function posChecker() {
        this.getCurrentLocation(posCallback.bind(this));// eslint-disable-line
        
        function posCallback(pdata) {
            if (this.callback) {
                this.callback(pdata);
            }
        }
    }
}
*/

/*
compassPremissioniOS() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            if (typeof DeviceOrientationEvent['requestPermission'] === 'function') {
                DeviceOrientationEvent['requestPermission']()
                    .then(permissionState => {
                        if (permissionState === 'granted') {
                            window.addEventListener('deviceorientation', (event) => {
                                this.currentCompass$.next(event['webkitCompassHeading']);
                            });
                            resolve('User accepted');
                        } else {
                            reject('User declined');
                        }
                    })
                    .catch(console.error);
            }
        } else {
            alert('deviceorientation is not supported by this browser.');
            this.sendError('deviceorientation = null ("deviceorientation is not supported by this browser.")');
        }
    });
}
*/
