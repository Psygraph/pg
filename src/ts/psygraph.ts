// Pages with GUIs
import {Home} from './pages/home';
import {Stopwatch} from './pages/stopwatch';
import {Counter} from './pages/counter';
import {Timer} from './pages/timer';
import {Note} from './pages/note';
import {List} from './pages/list';
import {Graph} from './pages/graph';
import {Map} from './pages/map';
import {About} from './pages/about';
import {Categories} from './pages/categories';
import {Login} from './pages/login';
import {Preferences} from './pages/preferences';

// objects with State
import {pgAudio} from './audio.js';
import {pgNotify} from './notify.js';
import {pgAcceleration} from './signal/accel.js';
import {pgLocation} from './signal/location.js';
import {pgRandom} from './signal/random.js';
import {pgOrientation} from './signal/orient.js';
import {pgBluetooth} from './signal/bluetooth.js';
import {pgDevices} from './signal/device.js';

// general-purpose modules
import {pg} from './pg';
import {pgUI} from './ui';
import {pgUtil, pgDebug} from './util';
import {pgFile} from './file';
import {pgNet} from './net';
import {pgXML} from './xml';

export let WORDPRESS = '';
export let WP_CATEGORY = '';
export let WP_SERVER = '';
export let WP_USERNAME = '';
export let WP_CERT = '';
export let WP_HIST = '';
export let WP_EXTRA = () => {};

export class Psygraph {
    constructor() {
    }
    static async init() {
        console.log('starting initialization');
        try {
            await pgUtil.init();
            await pg.init();
            await pgFile.init();
            await pgUI.init();
            await pgNet.init();
            
            pgAcceleration.init();
            pgAudio.init(document.getElementById("alarm"), document.getElementById("record"));
            pgBluetooth.init();
            pgLocation.init();
            pgNotify.init({pgAudio, pgXML});
            pgRandom.init();
            pgOrientation.init();
            pgDevices.init(pgRandom, pgAcceleration, pgOrientation, pgLocation, pgBluetooth);
            
            let opts = {pgDevices, pgAcceleration, pgAudio, pgNotify, pgLocation, pgXML};
            pgUI.home = new Home(opts);
            pgUI.stopwatch = new Stopwatch(opts);
            pgUI.counter = new Counter(opts);
            pgUI.timer = new Timer(opts);
            pgUI.note = new Note(opts);
            pgUI.list = new List(opts);
            pgUI.graph = new Graph(opts);
            pgUI.map = new Map(opts);
            pgUI.about = new About(opts);
            pgUI.categories = new Categories(opts);
            pgUI.preferences = new Preferences(opts);
            pgUI.login = new Login(opts);
            
            await this.begin();
            pgUI.callPageInit();
        } catch (error) {
            console.error('ERROR:' + error);
        }
        console.log('finished initialization');
    }
    static async begin() {
        if (WORDPRESS !== '') {
            // the WP_* variables are set if index.html is served by wp.php
            pgUI.screenshot = 'wordpress,';
            pg.setReadOnly(true);
            return new Promise(Psygraph.wordpress);
        } else {
            pgUI.screenshot = 'not wordpress,';
            return new Promise(Psygraph.readPsygraph);
        }
    }
    static readPsygraph(resolve, reject) {
        // If we find one of these files sitting around, we encountered a login error.
        // So we ask the user if they wish to reset the local files.
        pgNet.readPsygraph(handleFile);
        function handleFile(success, data) {
            if (success) {
                if(data.error) {
                    let event = data.error;
                    pgFile.deleteFile('com.psygraph.lastError'); // try to handle once only
                    pgUI.showDialog({
                        'title': event.data.title, true: 'Delete', false: 'Cancel'
                    }, '<p>There was an uncaught error during the previous login: ' + event.data.text + '</p>'
                        + '<p>Do you wish to delete the local data and settings?</p>', deleteCB.bind(event));
                } else {
                    pgUI.setCurrentPage(data.page);
                    pgUI.setCurrentCategory(data.category);
                    if (data.server !== "localhost" && data.loggedIn) {
                        pgNet.serverLogin(data.server, data.username, '', data.cert, loginCB);
                    } else {
                        pgNet.localLogin(data.username, loginCB);
                    }
                }
            }
            else {
                pgUI.setCurrentPage("about");
                pgUI.setCurrentCategory("Uncategorized");
                if(true)
                    pgNet.localLogin("", loginCB);
                else
                    loginCB(true);
            }
            function deleteCB(success, event) {
                if (success) {
                    pgFile.deleteFile('com.psygraph.pg');
                    pgFile.deleteFile('com.psygraph.events');
                    pgDebug.showLog('Error: Deleted PG on user request.');
                    this.logoutAndErase(cb2.bind(event));
                } else {
                    cb2(event);
                }
                function cb2(event) {
                    pgNet.localLogin("", loginCB);
                    pg.addNewEvents(event, true);
                }
            }
            function loginCB(success) {
                resolve(1);
            }
        }
    }
    static wordpress(resolve, reject) {
        pgNet.localLogin(WP_USERNAME, callback);
        function callback(success) {
            // If we were started by wordpress, execute whatever actions might be desired
            pgDebug.showLog('Starting wordpress actions...');
            if (pg.categories.indexOf('*') < 0) {
                pg.categories.push('*');
            }
            pgNet.downloadEvents(cb);
            function writeImage(fn, url) {
                pgUI.screenshot = url;
            }
            function cb(success) {
                if (!success) {
                    pgDebug.showWarn('Failed to download events.');
                }
                // update settings
                //pgUI.gotoPage("home");
                //pgUI.gotoCategory(category);
                pgUI.home.setPageDataField('history', '' + WP_HIST);
                pgUI.home.setPageDataField('interval', 'day');
                pgUI.home.setPageDataField('signals', ['stopwatch', 'counterCorrect', 'timer', 'timerMindful']);
                pgUI.showPage(true);
                // generate a screenshot of the home page.
                pgUI.home.graph.makeImage(WP_CATEGORY, writeImage.bind(this, 'home.png'));
                WP_EXTRA();
                pgDebug.showLog('Wordpress actions finished.');
                resolve(3);
            }
        }
    }
}
