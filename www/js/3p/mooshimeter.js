
if(typeof(require) !== "undefined") { // node.js
    mooshiUtils = {};
    mooshiUtils.exports = require('./mooshiUtils.js');
    function showLog(msg) {
        console.log(msg);
    }
}
var NTYPE      = mooshiUtils.exports.NTYPE;
var ConfigNode = mooshiUtils.exports.ConfigNode;
var ConfigTree = mooshiUtils.exports.ConfigTree;
var BytePack   = mooshiUtils.exports.BytePack;
var CRC32      = mooshiUtils.exports.CRC32;


function bufferCat(a,b) {
    var c = new (a.constructor)(a.length + b.length);
    c.set(a, 0);
    c.set(b, a.length);
    return c;
    //return Buffer.concat([a,b]);
}

// Test of config tree build
function buildTree() {
    // Abbreviations
    var root = new ConfigNode(NTYPE.PLAIN, '', [
                new ConfigNode(NTYPE.PLAIN, 'ADMIN', [
                    new ConfigNode(NTYPE.VAL_U32,'CRC32'),
                    new ConfigNode(NTYPE.VAL_BIN,'TREE'),
                    new ConfigNode(NTYPE.VAL_STR,'DIAGNOSTIC')
                ])
            ]);
    var tree = new ConfigTree(root);
    tree.assignShortCodes();
    return tree;
}

function Mooshimeter(meter) {
    this.meter = meter;
    this.seq_n     = 0;
    this.aggregate = new Uint8Array();

    // Initialize tree
    this.tree = buildTree();
    this.code_list = this.tree.getShortCodeList();
    // Assign an expander function to the tree node
    node = this.tree.getNodeAtLongname('ADMIN:TREE');
    node.notification_handler = expandReceivedTree.bind(this);

    function expandReceivedTree(meter, payload) {
        var payload_str = String.fromCharCode.apply(String, payload);
        this.tree.unpack(payload);
        this.code_list = this.tree.getShortCodeList();
        this.tree.enumerate();
        // Calculate the CRC32 of received tree
        crc_node = this.tree.getNodeAtLongname('ADMIN:CRC32');
        var checksum = CRC32.bstr(payload_str);
        showLog("Computed checksum: " + checksum);
        crc_node.value = checksum;
    }
}

Mooshimeter.isMooshimeter = function(p, callback) {
    if( p.advertisement.serviceUuids.length &&
        ( p.advertisement.serviceUuids[0].toUpperCase() == METER_SERVICE || 
            p.advertisement.serviceUuids[0].toUpperCase() == METER_SERVICE.replace(/-/g,"")) )
        return true;
    return false;
};

Mooshimeter.prototype.connect = function(callback) {
    this.loadTree();
    // Wait for us to load the command tree
    waitForConnect.call(this);
    
    function waitForConnect() {
        if(this.tree.getNodeAtLongname('SAMPLING:TRIGGER')==null) {
            setTimeout(waitForConnect.bind(this), 200);
            return;
        }
        // Unlock the meter by writing the correct CRC32 value
        // The CRC32 node's value is written when the tree is received
        var checksum = this.tree.getNodeAtLongname('admin:crc32').value;
        this.sendCommand('admin:crc32 ' + checksum );
        showLog("Sent checksum: " + checksum);
        // complete the initialization
        this.sendCommand('TIME_UTC ' + pgUtil.getCurrentTime()/1000 );
        this.sendCommand('LOG:ON 0');
        this.sendCommand('LOG:INTERVAL 60');
        callback(true);
    }
};

Mooshimeter.prototype.sendCommand = function(cmd) {
    // cmd might contain a payload, in which case split it out
    var arr  = cmd.split(' ');
    node_str = arr[0];
    payload_str = "";
    if(arr.length > 1)
        payload_str = arr[1];
    
    var node = this.tree.getNodeAtLongname(node_str);
    if(!node) {
        showLog('Node '+node_str+' not found!');
        return;
    }
    if(node.code === -1) {
        if(node.needsShortCode()) {
            showLog('This command does not have a value associated.');
            showLog('Children of this command: ');
            this.tree.enumerate(node);
            process.exit(1);
        }
    }
    var b = new BytePack();
    if(payload_str==="") {
        b.putByte(node.code);
    }
    else {
        b.putByte(node.code + 0x80);
        if(node.ntype === NTYPE.PLAIN) {
            showLog("This command doesn't accept a payload");
            return;
        }
        else if(node.ntype === NTYPE.CHOOSER) {
            b.putInt(parseInt(payload_str))
        }
        else if(node.ntype === NTYPE.LINK) {
            showLog("This command doesn't accept a payload");
            return;
        }
        else if(node.ntype === NTYPE.VAL_U8) {
            b.putInt(parseInt(payload_str))
        }
        else if(node.ntype === NTYPE.VAL_U16) {
            b.putInt(parseInt(payload_str),2);
        }
        else if(node.ntype === NTYPE.VAL_U32) {
            b.putInt(parseInt(payload_str),4);
        }
        else if(node.ntype === NTYPE.VAL_S8) {
            b.putInt(int(payload_str));
        }
        else if(node.ntype === NTYPE.VAL_S16) {
            b.putInt(parseInt(payload_str),2);
        }
        else if(node.ntype === NTYPE.VAL_S32) {
            b.putInt(parseInt(payload_str),4);
        }
        else if(node.ntype === NTYPE.VAL_STR) {
            b.putInt(payload_str.length,2);
            b.putBytes(payload_str);
        }
        else if(node.ntype === NTYPE.VAL_BIN) {
            showLog("This command doesn't accept a payload");
            return;
        }
        else if(node.ntype === NTYPE.VAL_FLT) {
            b.putFloat(parseFloat(payload_str));
        }
        else {
            // error
        }
    }
    this.writeToMeter(b.bytes);
};

Mooshimeter.prototype.loadTree = function() {
    this.sendCommand('ADMIN:TREE');
};

Mooshimeter.prototype.attachCallback = function(node_path, notify_cb) {
    if(typeof(notify_cb) === "undefined")
        notify_cb = function(meter,val){};
    var node = this.tree.getNodeAtLongname(node_path);
    if(!node) {
        showLog('Could not find node at '+ node_path);
        return;
    }
    node.notification_handler = notify_cb;
};

Mooshimeter.prototype.writeToMeter = function(bytes) {
    if(bytes.length > 19)
        Error("Payload too long!");
    // Put in the sequence number
    var b = new BytePack();
    b.putByte(0); // seq ntrue
    b.putBytes(bytes); 
    this.meter.write(b.getBytes());
};

Mooshimeter.prototype.readFromMeter = function(bytes) {
    if(bytes.length==0)
        return;
    var b     = new BytePack(bytes);
    var seq_n = b.get(1) & 0xFF;
    if(seq_n != (this.seq_n+1)%0x100) {
        showLog('Received out of order packet!');
        showLog('Expected: ' + this.seq_n+1);
        showLog('Got     : ' + seq_n);
    }
    this.seq_n = seq_n;
    this.aggregate = bufferCat(this.aggregate, b.bytes.slice(1));
    // Attempt to decode a message, if we succeed pop the message off the byte queue
    while(this.aggregate.length > 0) {
        try {
            var b = new BytePack(this.aggregate);
            var shortcode = b.get();
            try {
                node = this.code_list[shortcode];
            }
            catch(KeyError) {
                    showLog('Received an unrecognized shortcode!');
                    return;
            }
            if(node.ntype === NTYPE.PLAIN) {
                pgUI.showError("bad ntype");
            }
            else if(node.ntype === NTYPE.CHOOSER)
                node.notification_handler(this, b.get(1));
            else if(node.ntype === NTYPE.LINK)
                pgUI.showError("bad ntype");
            else if (node.ntype === NTYPE.VAL_U8)
                node.notification_handler(this, b.get(1));
            else if (node.ntype === NTYPE.VAL_U16)
                node.notification_handler(this, b.get(2));
            else if (node.ntype === NTYPE.VAL_U32)
                node.notification_handler(this, b.get(4));
            else if (node.ntype === NTYPE.VAL_S8)
                node.notification_handler(this, b.get(1, true));
            else if (node.ntype === NTYPE.VAL_S16)
                node.notification_handler(this, b.get(2, true));
            else if (node.ntype === NTYPE.VAL_S32)
                node.notification_handler(this, b.get(4, true));
            else if (node.ntype === NTYPE.VAL_STR) {
                var expecting_bytes = b.get(2);
                if(b.getBytesRemaining() < expecting_bytes) {
                    return;
                }
                node.notification_handler(this, b.getBytes(expecting_bytes));
            }
            else if (node.ntype === NTYPE.VAL_BIN) {
                var expecting_bytes = b.get(2);
                if(b.getBytesRemaining() < expecting_bytes) {
                    return;
                }
                node.notification_handler(this, b.getBytes(expecting_bytes));
            }
            else if (node.ntype === NTYPE.VAL_FLT) {
                node.notification_handler(this, b.get(4, true, "float"));
            }
            else 
                pgUI.showError('Unknwn');
            this.aggregate = this.aggregate.slice(b.i);
        }
        catch(UnderflowException) {
            // An underflow exception here does not indicate anything sinister.  It just means we had to split a packet.
            // across multiple BLE connection events.
            //showLog('underflow');
            return;
        }
    }
};

module.exports = Mooshimeter;
