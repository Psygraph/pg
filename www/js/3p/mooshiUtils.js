
if(typeof(require) !== "undefined") { // node.js
    var pako  = require('./pako.js');
    var CRC32 = require('./crc32.js');
    function showLog(txt) {
        console.log(txt);
    }
}


METER_SERVICE      = "1BC5FFA0-0200-62AB-E411-F254E005DBD4";
METER_SERIN        = "1BC5FFA1-0200-62AB-E411-F254E005DBD4";
METER_SEROUT       = "1BC5FFA2-0200-62AB-E411-F254E005DBD4"; 

OAD_SERVICE_UUID   = "1BC5FFC0-0200-62AB-E411-F254E005DBD4";
OAD_IMAGE_IDENTIFY = "1BC5FFC1-0200-62AB-E411-F254E005DBD4";
OAD_IMAGE_BLOCK    = "1BC5FFC2-0200-62AB-E411-F254E005DBD4";
OAD_REBOOT         = "1BC5FFC3-0200-62AB-E411-F254E005DBD4";


function NTYPE() {
}

NTYPE.PLAIN   =0;  // May be an informational node, or a choice in a chooser
NTYPE.LINK    =1;  // A link to somewhere else in the tree
NTYPE.CHOOSER =2;  // The children of a CHOOSER can only be selected by one CHOOSER, and a CHOOSER can only select one child
NTYPE.VAL_U8  =3;  // These nodes have readable and writable values of the type specified
NTYPE.VAL_U16 =4;  // These nodes have rodes have readable and writable values of the type specified
NTYPE.VAL_U32 =5;  // These nodes have readable and writable values of the type specified
NTYPE.VAL_S8  =6;  // These nodes have readable and writable values of the type specified
NTYPE.VAL_S16 =7;  // These nodes have readable and writable values of the type specified
NTYPE.VAL_S32 =8;  // These nodes have readable and writable values of the type specified
NTYPE.VAL_STR =9;  // These nodes have readable and writable values of the type specified
NTYPE.VAL_BIN =10; // These nodes have readable and writable values of the type specified
NTYPE.VAL_FLT =11; // These nodes have readable and writable values of the type specified

NTYPE.code_list = ['PLAIN', 'LINK', 'CHOOSER', 'VAL_U8', 'VAL_U16', 'VAL_U32', 'VAL_S8', 
                   'VAL_S16', 'VAL_S32', 'VAL_STR', 'VAL_BIN', 'VAL_FLT'];

NTYPE.c_type_dict = {
    CHOOSER:'uint8',
    VAL_U8 :'uint8',
    VAL_U16:'uint16',
    VAL_U32:'uint32',
    VAL_S8 :'int8',
    VAL_S16:'int16',
    VAL_S32:'int32',
    VAL_STR:'string_t',
    VAL_BIN:'bin_t',
    VAL_FLT:'float'
};

function default_handler(meter, payload) {
}

function ConfigNode(ntype, name, children) {
    if(typeof(children)=="undefined")
        children  = [];
    this.code     = -1;
    this.ntype    = ntype;
    this.name     = name;
    this.children = [];
    this.parent   = null;
    this.tree     = null;
    this.value    = [];
    this.notification_handler = default_handler;
    for(var i=0; i<children.length; i++) {
        var c = children[i];
        if(typeof(c) == "string") {
            this.children.push(new ConfigNode(NTYPE.PLAIN, c));
        }
        else {
            this.children.push(c);
        }
    }
}

ConfigNode.prototype.toString = function() {
    var s = '';
    if(this.code != -1)
        s += this.code.toString() + ':';
    s += NTYPE.code_list[this.ntype] + ":";
    s += this.name;
    if(this.value.length)
        s += ":" + this.value.toString();
    return s;
};
ConfigNode.prototype.getIndex = function() {
    return this.parent.children.indexOf(this);
};
ConfigNode.prototype.getPath = function(rval) {
    if(typeof(rval)=="undefined")
        rval = [];
    if(this.parent) {
        this.parent.getPath(rval);
        rval.append(self.getIndex());
    }
    return rval;
};
ConfigNode.prototype.getLongName = function(rval, sep) {
    sep = (typeof(sep)=="undefined") ? '_' : sep;
    
    if(typeof(rval)=="undefined")
        rval = this.name;
    else
        rval = sep.join((this.name,rval))
    if(! this.parent)
        return rval.slice(1);
    else
        return this.parent.getLongName(rval);
};
ConfigNode.prototype.needsShortCode = function() {
    if( this.ntype == NTYPE.PLAIN ||
        this.ntype == NTYPE.LINK)
        return false;
    return true;
};
ConfigNode.prototype.assignShortCode = function(code) {
    this.code=code;
};
function ConfigTree(root) {
    this.root = root;
}
ConfigTree.prototype.enumerate = function(n,indent) {
    if(typeof(n) == "undefined")
        n = this.root;
    if(typeof(indent) == "undefined")
        indent = 0;   
    showLog( "  ".repeat(indent) + n.toString() );
    for(var i=0; i<n.children.length; i++) {
        var c = n.children[i];
        this.enumerate(c, indent+1);
    }
    if(!indent)
        showLog("");   
};
/*
ConfigTree.prototype.serialize = function() {
    // Decided not to use msgpack for simplicity.  We have such a reductive structure we can do it
    // more easily ourselves
    var r = new Uint8Array();
    this.walk(on_each.bind(this));
    return r.decode('ascii');

    function on_each(node) {
        r.append(node.ntype);
        r.append(len(node.name));
        for(c in node.name)
            r.append(ord(c));
        r.append(node.children.length);
    }
};
*/
ConfigTree.prototype.deserialize = function(bytes) {
    var ntype = bytes[0];
    var nlen  = bytes[1];
    var name  = ab2str(bytes.slice(2,2+nlen));
    var n_children = bytes[2+nlen];
    bytes = bytes.slice(3+nlen);
    var children = [];
    for(var i=0; i<n_children; i++) {
        // bytes must be passed by reference for this to work.
        var obj = this.deserialize(bytes);
        children[i] = obj.node;
        bytes       = obj.bytes;
    }
    return {node:  new ConfigNode(ntype, name, children), 
            bytes: bytes};
};
/*
ConfigTree.prototype.pack = function() {
    var plain = this.serialize();
    var compressed = pako.deflate(plain);
    return compressed;
};
*/
function ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
}
function str2ab(str) {
    var buf = new ArrayBuffer(str.length); // 2 bytes for each char
    var bufView = new Uint8Array(buf);
    for (var i=0, strLen=str.length; i<strLen; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    return bufView;
}
ConfigTree.prototype.unpack = function(compressed) {
        var data    = pako.inflate(compressed);
        // Convert gunzipped byteArray back to ascii string:
        var bytes = new Uint8Array(data);
        var strData = String.fromCharCode.apply(null, bytes);
        //var bytes = str2ab(plain);
        //var bytes = plain;
        var obj = this.deserialize(data);
        this.root = obj.node;
        this.assignShortCodes();
};
ConfigTree.prototype.assignShortCodes = function() {
    // TODO: Rename this function... it's become a general reference refresher for the tree
    var g_code = [0];
    this.walk(on_each.bind(this));
    function on_each(node) {
        node.tree = this;
        for(var i=0; i<node.children.length; i++) {
            var c = node.children[i];
            c.parent = node;
        }
        if(node.needsShortCode()) {
            node.assignShortCode(g_code[0]);
            g_code[0] += 1;
        }
    }
};
ConfigTree.prototype.getNodeAtLongname = function(longname) {
    var longname = longname.toUpperCase();
    var tokens   = longname.split(':');
    var n = this.root;
    for(var i=0; i<tokens.length; i++) {
        token = tokens[i];
        var found=false;
        for(var j=0; j<n.children.length; j++) {
            c = n.children[j];
            if(c.name == token) {
                n = c;
                found=true;
                break;
            }
        }
        if(!found)
            return null;
    }
    return n;
};
ConfigTree.prototype.getNodeAtPath = function(path) {
    var n = this.root;
    for(i in path) {
        n = n.children[i];
    }
    return n;
};
ConfigTree.prototype.walk = function(call_on_each, node) {
    if(!node) {
        this.walk(call_on_each, this.root);
        return;
    }
    for(var i=0; i<node.children.length; i++) {
        var c = node.children[i];
        call_on_each(c);
        this.walk(call_on_each, c);
    }
};
ConfigTree.prototype.getShortCodeList = function() {
    var rval={};
    this.walk(for_each);
    return rval;

    function for_each(node) {
        if(node.code != -1)
            rval[node.code]=node;
    }
};


// Helper class to pack and unpack integers and floats from a buffer
function BytePack(bytebuf) {
    this.i = 0;
    this.bytes = (typeof(bytebuf)=="undefined") ? [] : bytebuf;
}

BytePack.prototype.putByte = function(v) {
    this.bytes.push(v);
};

BytePack.prototype.putBytes = function(v) {
    for(var i=0; i<v.length; i++) {
        var byte = v[i];   
        this.putByte(byte);
    }
};
BytePack.prototype.putInt = function(v, b) {
    b = (typeof(b)=="undefined") ? 1 : b;
    while(b) {
        this.putByte( v & 0xFF);
        v >>= 8;
        b -= 1;
    }
};
BytePack.prototype.putFloat = function(v, b) {
    b = (typeof(b)=="undefined") ? 1 : b;
    var farr = new Float32Array(b);
    for(var i=0; i<b; i++)
        farr[i] = v[i];
    var barr = new Uint8Array(farr.buffer);
    this.putBytes(barr);
};

BytePack.prototype.get = function(b, signed, t) {
    b = (typeof(b)=="undefined") ? 1 : b;
    signed = (typeof(signed)=="undefined") ? false : signed;
    t = (typeof(t)=="undefined") ? "int" : t;
    
    if(t == "int") {
        if(b > this.getBytesRemaining())
            throw "UnderflowException";
        var r = 0;
        var s = 0;
        var top_b = 0;
        while (b) {
            top_b = this.bytes[this.i];
            r += top_b << s;
            s += 8;
            this.i += 1;
            b -= 1;
        }
        // Sign extend
        if(signed && top_b & 0x80) {
            r -= 1 << s;
        }
        return r;
    }
    else if(t=="float") {
        if(4 > this.getBytesRemaining())
            throw "UnderflowException";
        var barr = this.bytes.slice(this.i,this.i+4);
        var farr = new Float32Array(barr.buffer);
        this.i += 4;
        return farr[0];
    }
    else {
        throw "bad type";
    }
};

BytePack.prototype.getBytes = function(max_bytes) {
    if(typeof(max_bytes)==="undefined")
        rval = this.bytes.slice(this.i);
    else
        rval = this.bytes.slice(this.i, this.i +max_bytes);
    this.i += rval.length;
    return rval;
};

BytePack.prototype.getBytesRemaining = function() {
    return this.bytes.length - this.i;
};
    
if(typeof(require) === "undefined") {
    var module = {};
}
module.exports = {
    'NTYPE':      NTYPE,
    'ConfigNode': ConfigNode,
    'ConfigTree': ConfigTree,
    'BytePack':   BytePack,
    'CRC32':      CRC32
};
var mooshiUtils = {};
mooshiUtils.exports = module.exports;
