import {pg} from '../pg';
import {pgUtil, pgDebug} from '../util';
import {pgNet} from '../net';
import {pgUI} from '../ui';
import {pgFile} from '../file';
import {Page} from './page';
import * as $ from 'jquery';

export class Login extends Page {
    loggingIn = false;
    startTime = 0;
    //resolve;
    //reject;
    
    constructor(opts) {
        super('login', opts);
        this.loggingIn = false;
        this.startTime = new Date().getTime();
    }
    init(opts) {
        super.init(opts);
    }
    getPageData() {
        var data = super.getPageData();
        if (!('username' in data)) {
            data.username = 'anonymous';
        }
        if (!('email' in data)) {
            data.email = '';
        }
        if (!('server' in data) || data.server=="") {
            data.server = 'localhost';
        }
        if (!('cert' in data)) {
            data.cert = '';
        }
        if (!('certExpiration' in data)) {
            data.certExpiration = '';
        }
        return data;
    }
    getAllServersNV() {
        const servers = [
            {value: 'localhost', name: 'localhost'},
            {value: 'https://psygraph.com', name: 'Psygraph.com'},
        ];
        return servers;
    }
    getServerLink() {
        const serverURL = 'http://' + pgUtil.extractDomain(this.pageData['Uncategorized'].server);
        return '<a href=\'\' onClick=\'return pgUtil.openWeb("' + serverURL + '")\'>' + serverURL + '</a>';
    }
    getRegisterLink(txt) {
        const serverURL = 'http://' + pgUtil.extractDomain(this.pageData['Uncategorized'].server);
        return '<a href=\'\' onClick=\'return pgUtil.openWeb("' + serverURL + '/register")\'>' + txt + '</a>';
    }
    updateView(show) {
        super.updateView(show);
        if (show) {
        } else {
        }
    }
    isLoggedIn() {
        return pg.loggedIn;
    }
    async verifyUser(username, server) {
        return new Promise(resolver.bind(this));
        function resolver(resolve, reject) {
            pgNet.verifyUser(server, username, verifyUserCB.bind(this));
            function verifyUserCB(err) {
                if (err === 'user') {
                    reject('No account (username: ' + username + ') at server: ' + server + ', you may need to create an account.');
                } else if (err === 'server') {
                    reject('There was a problem contacting the server: ' + server + ', Please check your internet connection.');
                } else {
                    resolve(1);
                }
            }
        }
    }
    login(username, password, email, server, callback= (success) => {}) {
        if (pg.loggedIn) {
            return;
        }
        pgDebug.showLog('LOGIN_BEGIN');
        this.loggingIn = true;
        if (server === 'localhost') {
            pgNet.localLogin(username, this.endLogin.bind(this, callback));
        } else {
            if (!pg.online) {
                pgUI.showDialog({
                    title: 'Not online', true: 'OK'
                }, '<p>This device is not currently online, operating in offline mode.</p>');
                pgNet.localLogin(username, this.endLogin.bind(this, callback));
            } else {
                pgNet.serverLogin(server, username, password, this.pageData['Uncategorized'].cert, this.endLogin.bind(this, callback, username, password, email, server));
            }
        }
    }
    endLogin(callback, username, password, email, server, success) {
        if(success) {
            pgDebug.showLog('login success');
            this.pageData['Uncategorized'].username = username;
            this.pageData['Uncategorized'].password = password;
            this.pageData['Uncategorized'].email    = email;
            this.pageData['Uncategorized'].server   = server;
        }
        else {
            pgDebug.showLog('login success');
        }
        pgDebug.showLog('LOGIN_END');
        pgNet.logEvent('login');
        this.loggingIn = false;
        callback(success);
    }
    logout() {
        if (!pg.loggedIn) {
            pgNet.logout();
        }
    }
    logoutAndErase() {
        pgNet.logout();
        pg.init();
    }
}
