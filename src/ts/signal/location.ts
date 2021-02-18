import {pgUtil, pgDebug} from '../util';
import {pgUI} from '../ui';
import {Meter} from './meter';
import * as $ from 'jquery';

export class Locometer extends Meter {
    bgGeo = false;
    running = false;
    locationListener = (path: [], cat: string = '') => {};
    locationTimer = null;
    warned = false;
    permission = false;
    watchID = -1;
    timeout = null;
    navigatorOpts = {
        maximumAge: 2000, timeout: 5000, enableHighAccuracy: true
    };
    bgOpts:any = {};
    
    constructor() {
        super('location');
        this.running = false;
        this.warned = false;
        // @ts-ignore
        window.skipLocalNotificationReady = true;
    }
    
    init() {
        this.addSignal('location');
        this.createData(['location']);
        if (!pgUtil.isWebBrowser && pgUtil.geolocation) {
            this.bgGeo = true;
            this.bgOpts = {
                powerSaving: true,
                accuracy: 5,
                locationProvider: pgUtil.geolocation.DISTANCE_FILTER_PROVIDER,
                desiredAccuracy: pgUtil.geolocation.MEDIUM_ACCURACY,
                stationaryRadius: 10,
                distanceFilter: 15,
                notificationTitle: 'Background tracking',
                notificationText: 'enabled',
                debug: false, // handy info about
                startForeground: true,
                interval: 10000,
                fastestInterval: 5000,
                activitiesInterval: 10000,
            };
            onDeviceReady.call(this);
        }
        function onDeviceReady() {
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
            //pgUtil.geolocation.on('authorization', this.doPermissions.bind(this));
            pgUtil.geolocation.on('background', function() {
                pgDebug.showLog('App is in background');
                // you can also reconfigure service (changes will be applied immediately)
                pgUtil.geolocation.configure({debug: true});
            });
            pgUtil.geolocation.on('foreground', function() {
                pgDebug.showLog('App is in foreground');
                pgUtil.geolocation.configure({debug: false});
            });
            pgUtil.geolocation.on('http_authorization', () => {
                pgDebug.showLog('App needs to authorize the http requests');
            });
        }
    }
    async doPermissions(callback = (success) => {}) {
        if(this.permission) {
            callback(true);
            return;
        }
        else {
            const opts = {
                title: 'Access device location?', true: 'OK', false: 'Cancel'
            };
            const content = `<p class="inset">In order to collect device location data when you have requested it (i.e. use of GPS to map your activites),
                please grant the device permission to monitor your location at all times (even when the app is in the background).</p>`;
            await pgUI.showDialog(opts, content, cb.bind(this));
        }
        function cb(success, data) {
            if (success) {
                this.permission = true;
                pgUtil.geolocation.checkStatus(authorized.bind(this));
            } else {
                this.permission = false;
                callback(false);
            }
            function authorized(status) {
                pgDebug.showLog('BackgroundGeolocation authorization status: ' + status.authorization);
                callback(true);
            }
        }
    }
    getAllSignalsNV() {
        return [{name: 'Location', value: 'location'},];
    }
    update(show, data) {
        try {
            if (show) {
                if (pgUtil.isEmpty(data)) {
                    throw new Error('empty struct');
                }
                this.bgOpts = data.bgOpts;
                this.navigatorOpts = data.navigatorOpts;
                this.permission = data.permission;
                this.data.location = data.location;
            } else {
                data.running = this.running;
                data.bgOpts = this.bgOpts;
                data.navigatorOpts = this.navigatorOpts;
                data.permission = this.permission;
                data.location = this.data.location;
            }
        } catch (err) {
            pgDebug.showWarn(err.toString());
            data = {running: false, bgOpts: this.bgOpts, navigatorOpts: this.navigatorOpts,
                permission: false, location: []
            };
        }
        return data;
    }
    settingsDialog(callback) {
        const opts = this.settingsDialogOpts('Location Settings', gatherData);
        const content = `
            <ion-item>
                <ion-label>Power Saving Mode:</ion-label>
                <ion-checkbox id="map_powerSaving" checked="` + !!this.bgOpts.powerSaving + `"></ion-checkbox>
            </ion-item>
            <ion-item>
                <ion-label>Accuracy:</ion-label>
                <ion-range id="map_accuracy" min="0" max="10" step="1" pin="true" value="` + this.bgOpts.accuracy + `"></ion-range>
            </ion-item>`;
        //$("#map_powerSaving").prop("checked", data.powerSaving).checkboxradio("refresh");
        //$("#map_accuracy").val(data.accuracy).trigger("change");
        this.doSettingsDialog(opts, content, setMeter.bind(this));
        function gatherData() {
            return {
                powerSaving: $('#map_powerSaving').attr('aria-checked') == 'true',
                accuracy: $('#map_accuracy').val(),
            };
        }
        function setMeter(success, data) {
            if (success) {
                this.bgOpts.powerSaving = data.powerSaving;
                this.bgOpts.accuracy = data.accuracy;
                // Accuracy is a value from 0 ( accurate) to 10 (most accurate).
                if(this.bgOpts.accuracy >= 9) {
                    this.bgOpts.desiredAccuracy = pgUtil.geolocation.HIGH_ACCURACY;
                }
                else if(this.bgOpts.accuracy >= 6) {
                    this.bgOpts.desiredAccuracy = pgUtil.geolocation.MEDIUM_ACCURACY;
                }
                else if(this.bgOpts.accuracy >= 3) {
                    this.bgOpts.desiredAccuracy = pgUtil.geolocation.LOW_ACCURACY;
                }
                else {
                    this.bgOpts.desiredAccuracy = pgUtil.geolocation.PASSIVE_ACCURACY;
                }
                // radius ranges from 2 to 1002 meters
                const radius = (10 - this.bgOpts.accuracy) * 100 + 2;
                this.bgOpts.desiredAccuracy = Math.round(radius / 2);
                this.bgOpts.stationaryRadius = Math.round(radius);
                this.bgOpts.distanceFilter = Math.round(radius * 2);
                // update interval ranges from 1000 to 61000 ms
                const updateInterval = (10 - this.bgOpts.accuracy) * 6000 + 1000;
                this.bgOpts.interval = updateInterval;
                this.bgOpts.fastestInterval = updateInterval / 2;
                this.bgOpts.activitiesInterval = updateInterval / 2;
                this.bgOpts.saveBatteryOnBackground = (this.bgOpts.accuracy < 5);
                // update the Cordova parameters
                this.navigatorOpts.maximumAge = updateInterval;
                this.navigatorOpts.timeout = updateInterval / 2;
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
        this.running = true;
        if (!this.bgGeo) {
            this.getCurrentLocation();
            this.watchID = navigator.geolocation.watchPosition(this.locationCB.bind(this, false), this.failureCB.bind(this), this.navigatorOpts);// eslint-disable-line
        } else {
            // get permissions
            this.doPermissions(startCB.bind(this));
        }
        function startCB(success) {
            if (success) {
                this.getCurrentLocation(start.bind(this));
            }
            function start(location) {
                pgUtil.geolocation.start();
                // Do we need to run something in the foreground?
                this.locationTimer = setInterval(this.getLocationData.bind(this), 2000);
            }
        }
    }
    
    locationCB(stationary, location) {
        this.addToPath(location);
        if (this.bgGeo) {
            setTimeout(this.locationListener.bind(this, this.data.location), 100);
            //pgUtil.geolocation.startTask(((taskKey) => {
            //    this.locationListener(this.data.location);
            //    pgUtil.geolocation.endTask(taskKey);
            //}).bind(this));
        } else {
            this.locationListener(this.data.location);
        }
    }
    failureCB(error) {
        pgDebug.showWarn('GeoLocation error' + error.toString());
    }
    async stop(): Promise<number> {
        return new Promise(finish.bind(this));
        function finish(resolve, reject) {
            if (this.bgGeo) {
                pgUtil.geolocation.stop();
                clearInterval(this.locationTimer);
                this.locationTimer = null;
                this.getLocationData(cb.bind(this));
            } else {
                navigator.geolocation.clearWatch(this.watchID);
                this.watchID = null;
                resolve(2);
            }
            this.running = false;
            function cb(data) {
                pgUtil.geolocation.deleteAllLocations(
                    () => {resolve(1);},
                    () => {reject('unknown');}
                );
            }
        }
    }
    setCallback(cb) {
        this.locationListener = cb;
    }
    
    getCurrentLocation(callback = (array) => {}) {
        // if we are running, we should just return the last collected point
        const len = this.data.location.length;
        if (this.running && len) {
            callback(this.data.location[len - 1]);
        } else {
            if (this.bgGeo) {
                this.doPermissions(permCB.bind(this));
            } else {
                navigator.geolocation.getCurrentPosition(successCB.bind(this), failCB.bind(this), this.navigatorOpts);
            }
        }
        function permCB(success) {
            if(success) {
                pgUtil.geolocation.getCurrentLocation(successCB.bind(this), failCB.bind(this), this.navigatorOpts);
            }
        }
        function successCB(pos) {
            this.addToPath(pos);
            const point = this.data.location[this.data.location.length-1];
            callback(point);
        }
        function failCB(err) {
            if (!this.warned) {
                pgDebug.showWarn('Could not get the current location: ' + err.message + '. Are GPS and/or cell networks available?');
                this.warned = true;
            }
            callback([]);
        }
    }
    getLocationData(callback = (location) => {}) {
        if (this.bgGeo) {
            pgUtil.geolocation.getValidLocations(cb.bind(this));
        } else {
            callback(this.data.location);
        }
        function cb(locations) {
            for (const loc of locations) {
                this.addToPath(loc);
            }
            callback(this.data.location);
        }
    }
    addToPath(location) {
        let lat;
        let lng;
        let alt = 0;
        let time = pgUtil.getCurrentTime();
        if (Array.isArray(location)) {
            time = location[0];
            lat = location[1];
            lng = location[2];
            alt = location[3];
        }
        else {
            if ('time' in location) {
                time = location.time;
            }
            if ('coords' in location) {
                location = location.coords;
            }
            if ('latitude' in location) {
                lat = location.latitude;
            }
            if ('longitude' in location) {
                lng = location.longitude;
            }
            if ('altitude' in location) {
                alt = location.altitude || 0;
            }
        }
        if (typeof (lat) === 'undefined' || typeof (lng) === 'undefined') {
            pgDebug.showWarn('Received empty location');
            return;
        }
        if (isNaN(lat) || isNaN(lng)) {
            pgDebug.showWarn('Location was NaN');
            return;
        }
        if (time === 0) {
            pgDebug.showWarn('Time was 0');
            return;
        }
        for (let i = 0; i < this.data.location.length; i++) {
            if (this.data.location[i][0] > time) {
                this.data.location.splice(i, 0, [time, lat, lng, alt]);
                return;
            } else if (this.data.location[i][0] === time) {
                if (this.data.location[i][1] === lat && this.data.location[i][2] === lng) {
                    return;
                } else {
                    pgDebug.showLog('Multiple locations with the same timestamp: ' + time);
                }
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

