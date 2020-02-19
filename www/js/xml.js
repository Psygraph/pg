
function UXML (url) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, false);
    xhr.send();
    this.dom = (new DOMParser()).parseFromString(xhr.response, "text/xml");
    //this.dom = xhr.responseXML; // DOMParser
    this.ser = new XMLSerializer();
}

UXML.prototype.getID = function(name) {
    var node = this.dom.getElementById(name);
    return node;
};                

UXML.prototype.getChildByName = function(node, name) {
    if(!node) {
        nodeSet = this.dom.evaluate("//U", this.dom, null, XPathResult.ANY_UNORDERED_NODE_TYPE, null);
        node = nodeSet.singleNodeValue;
        if(!node)
            return null;
    }
    for(var i=0; i<node.childNodes.length; i++) {
        var c = node.childNodes[i];
        if(c.nodeName !== "#text" &&
           c.nodeName !== "#comment") {
            if(c.getAttribute("name") === name) {
                return c;
            }
        }
    }
    return null;
};

UXML.prototype.thingToString = function(node) {
    // var str = node.innerHTML;  // doesnt work on mobile IOS, which has no such method.
    var str = this.ser.serializeToString(node);
    str = str.replace("<thing>","");
    str = str.replace("</thing>","");
    str = str.replace("<thing/>","");
    return str;
};

UXML.prototype.getThings = function(node) {
    var things = [];
    if($.type(node) === "string")
        node = this.dom.getElementById(node);
    if(!node)
        return things;
    // if there are children of this node, make a recursive call.
    if( node.childNodes && node.childNodes.length &&
        (  node.getElementsByTagName("thing").length ||
           node.getElementsByTagName("ref").length )) {
        for(var i=0; i<node.childNodes.length; i++) {
            var c = node.childNodes[i];
            if(c.nodeName != "#text") {
                var newThings = this.getThings(c);
                things = things.concat(newThings);
            }
        }
    }
    else {
        // we either have a thing or an xpath
        if(node.tagName == "thing") {
            // the terminal node for all queries: a thing with no children.
            things[things.length] = node;
        }
        else if(node.tagName == "ref") {
            // we should have a ref with an XPath at this point.
            var path       = node.getAttribute("src");
            var childNodes = this.dom.evaluate(path, this.dom, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
            var node2;
            while(node2 = childNodes.iterateNext()) {
                var newThings = this.getThings(node2);
                things = things.concat(newThings);
            }
        }
        else {
            pgUI.showError("Unknown tag: "+ node.tagName);
        }
    }
    return things;
};

// =====================================================================
// hand-rolled, string-only, XML-RPC with a single string response
// =====================================================================
function xmlRpcSend(url, args) {
    var message = xmlRpcWrite(args);
    var xhr = new XMLHttpRequest();
    xhr.open("POST", url, false);

    try {
        xhr.send(message);
        
        var dom = (new DOMParser()).parseFromString(xhr.response, "text/xml");
        var nodeSet = dom.evaluate("//methodResponse/params/param/value/string", dom, null, XPathResult.ANY_UNORDERED_NODE_TYPE, null);
        node = nodeSet.singleNodeValue;
        
        var ser = new XMLSerializer();
        var str = ser.serializeToString(node);
        str = str.replace("<string>","");
        str = str.replace("</string>","");
        return str;
    }
    catch (err) {
        pgUI.showLog("Error: " + err.name);
        return "";
    }

    function xmlRpcWrite(args) {
        var message = '<?xml version="1.0" encoding="UTF-8"?>';
        message += "<methodCall><methodName>" + args[0] + "</methodName><params>\n";
        for(var i=1; i<args.length; i++) {
            message += "  <param><value><string>" + args[i] + "</string></value></param>\n";
        }
        message += "</params></methodCall>\n";
    return message;
    }
}
