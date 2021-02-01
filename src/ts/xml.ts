import {pgDebug, pgUtil} from './util';
import {pgFile} from './file';
import {pg} from './pg';

import * as $ from 'jquery';

export class PGXML {
    dom;
    ser;
    
    constructor() {
    }
    init(url, callback=(success)=>{}) {
        if (pgUtil.isWebBrowser) {
            url = pgUtil.mediaURL + url;
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, false);
            xhr.send();
            this.dom = (new DOMParser()).parseFromString(xhr.response, 'text/xml');
            //this.dom = xhr.responseXML; // DOMParser
            this.ser = new XMLSerializer();
            callback(true);
        } else {
            url = 'ionic://localhost/assets/media/' + url;
            //url = window.Ionic.WebView.convertFileSrc(url);
            $.ajax({
                type: "GET",
                crossDomain: false,
                url: url,
                dataType: 'text',
                success: cb.bind(this,true),
                error: cb.bind(this,false)
            });
        }
        function cb(success, data) {
            if(success) {
                this.dom = (new DOMParser()).parseFromString(data, 'text/xml');
                //this.dom = xhr.responseXML; // DOMParser
                this.ser = new XMLSerializer();
                pgDebug.showLog('LOADED xml file: ' + url);
                callback(true);
            } else {
                pgDebug.showError('Could not load xml file: ' + url);
                callback(false);
            }
        }
    }
    
    getID(name) {
        var node = this.dom.getElementById(name);
        return node;
    }
    
    getChildByName(node, name) {
        if (!node) {
            const nodeSet = this.dom.evaluate('//U', this.dom, null, XPathResult.ANY_UNORDERED_NODE_TYPE, null);
            node = nodeSet.singleNodeValue;
            if (!node) {
                return null;
            }
        }
        for (var i = 0; i < node.childNodes.length; i++) {
            var c = node.childNodes[i];
            if (c.nodeName !== '#text' && c.nodeName !== '#comment') {
                if (c.getAttribute('name') === name) {
                    return c;
                }
            }
        }
        return null;
    }
    
    thingToString(node) {
        // var str = node.innerHTML;  // doesnt work on mobile IOS, which has no such method.
        var str = this.ser.serializeToString(node);
        str = str.replace('<thing>', '');
        str = str.replace('</thing>', '');
        str = str.replace('<thing/>', '');
        return str;
    }
    
    getThings(node) {
        var things = [];
        if ($.type(node) === 'string') {
            node = this.dom.getElementById(node);
        }
        if (!node) {
            return things;
        }
        // if there are children of this node, make a recursive call.
        if (node.childNodes && node.childNodes.length && (node.getElementsByTagName('thing').length || node.getElementsByTagName('ref').length)) {
            for (var i = 0; i < node.childNodes.length; i++) {
                var c = node.childNodes[i];
                if (c.nodeName != '#text') {
                    var newThings = this.getThings(c);
                    things = things.concat(newThings);
                }
            }
        } else {
            // we either have a thing or an xpath
            if (node.tagName == 'thing') {
                // the terminal node for all queries: a thing with no children.
                things[things.length] = node;
            } else if (node.tagName == 'ref') {
                // we should have a ref with an XPath at this point.
                var path = node.getAttribute('src');
                var childNodes = this.dom.evaluate(path, this.dom, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
                var node2;
                while (node2 = childNodes.iterateNext()) {
                    var newThings = this.getThings(node2);
                    things = things.concat(newThings);
                }
            } else {
                pgDebug.showError('Unknown tag: ' + node.tagName);
            }
        }
        return things;
    }
    
    // hand-rolled, string-only, XML-RPC with a single string response
    xmlRpcSend(url, args) {
        var message = xmlRpcWrite(args);
        var xhr = new XMLHttpRequest();
        xhr.open('POST', url, false);
        
        try {
            xhr.send(message);
            
            var dom = (new DOMParser()).parseFromString(xhr.response, 'text/xml');
            var nodeSet = dom.evaluate('//methodResponse/params/param/value/string', dom, null, XPathResult.ANY_UNORDERED_NODE_TYPE, null);
            const node = nodeSet.singleNodeValue;
            
            var ser = new XMLSerializer();
            var str = ser.serializeToString(node);
            str = str.replace('<string>', '');
            str = str.replace('</string>', '');
            return str;
        } catch (err) {
            pgDebug.showLog('Error: ' + err.name);
            return '';
        }
        
        function xmlRpcWrite(args) {
            var message = '<?xml version="1.0" encoding="UTF-8"?>';
            message += '<methodCall><methodName>' + args[0] + '</methodName><params>\n';
            for (var i = 1; i < args.length; i++) {
                message += '  <param><value><string>' + args[i] + '</string></value></param>\n';
            }
            message += '</params></methodCall>\n';
            return message;
        }
    }
    getCategoryText(cat: string, callback=(success)=>{}, reset = false) {
        if (reset || typeof (pg.categoryText[cat]) === 'undefined') {
            pg.categoryText[cat] = {};
            pg.categoryText[cat].title = cat;
            pg.categoryText[cat].text = [""];
            var data = pg.getCategoryData();
            var url = data[cat].text;
            this.init(url, cb.bind(this));
        }
        else {
            callback(true);
        }
        function cb(success) {
            // get the child "text", then get its descendents.
            var catNode = this.getChildByName(null, 'text');
            if (catNode) {
                // this.xml[cat].title = catNode.getAttribute("name");
                var things = this.getThings(catNode);
                for (var j = 0; j < things.length; j++) {
                    pg.categoryText[cat].text[j] = this.thingToString(things[j]);
                }
            }
            callback(success);
        }
    }
}

export const pgXML = new PGXML();
