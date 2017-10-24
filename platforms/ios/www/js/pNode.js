//====================================================================
// base class
//====================================================================
var pNode = function(nIn, nOut) {
    this.nIn  = nIn;
    this.nOut = nOut;
    this.t    = 0;
};
pNode.prototype.constructor = pNode;
pNode.prototype.input = function (inp) {
};
pNode.prototype.sideput = function () {
    return new Arr();
};
pNode.prototype.output = function (inp) {
    var value = 0;
    return value;
};
pNode.prototype.roundedOutput = function () {
    var outp = this.output();
    if(outp > 0)
        return [1];
    else
        return [-1];
};
pNode.prototype.addChild = function(child) {
    this.children.push(child);
};
pNode.prototype.reset = function (nIn, nOut) {
    if(typeof(nIn)!=="undefined")
        this.nIn  = nIn;
    if(typeof(nOut)!=="undefined")
        this.nOut = nOut;
    this.act  = 0;
    this.t = 0;
};


// Simple assert function for debugging.
function assert(val) {
    if(!val)
        exit(1);
}

//====================================================================
// series
//====================================================================
var pSeries = function (children) {
    pNode.call(this, children[0].nIn, children[children.length-1].nOut);
    this.children = children;
};
pSeries.prototype = Object.create(pNode.prototype);
pSeries.prototype.constructor = pSeries;
pSeries.prototype.input = function (data) {
    for(i=0; i<this.children.length; i++ ) {
        this.children[i].input(data);
        data = this.children[i].output();
    }
};
pSeries.prototype.sideput = function () {
    var a = new Arr();
    for(i=0; i<this.children.length; i++ ) {
        a.concat(this.children[i].sideput());
    }
    return a;
};
pSeries.prototype.output = function () {
    var data = this.children[this.children.length-1].output();
    return data;
};
pSeries.prototype.reset = function (nIn, nOut) {
    pNode.prototype.reset.call(this, nIn, nOut);
    for(i=0; i<this.children.length; i++ ) {
        this.children[i].reset();
    }
};
//====================================================================
// connect pNodes in parallel
//====================================================================
var pParallel = function (children) {
    pNode.call(this, children[0].nIn, children[0].nOut);
    this.children = children;
    this.out = new Arr(this.children.length);
    // do nodes receive their own last output (AR1?)
    this.selfConnect   = false;
    // Are we only listening to one node?
    this.winnerTakeAll = false;
    this.winner = 0;
    // Is this a recurrent layer?
    this.recurrent     = true;
    // call reset on the children if we are recursive
    if(this.recurrent) {
        for(i=0; i<this.children.length; i++ ) {
            this.children[i].reset(this.nIn*(1+children.length), this.nOut);
        }
    }
};
pParallel.prototype = Object.create(pNode.prototype);
pParallel.prototype.constructor = pParallel;
pParallel.prototype.input = function (data) {
    var err = new Arr(this.children.length);
    var newOut = new Arr(this.children.length);
    // get the output from the previous time step
    for(i=0; i<this.children.length; i++ ) {
        newOut[i] = this.children[i].output();
    }
    var win     = 0;
    var minNorm = Infinity;
    // create a new input vector
    var inp = new Arr();
    inp.concat(data);
    for(i=0; i<this.children.length; i++ ) {
        if(this.recursive) { // add neighboring outputs
            inp.concat(out[i]);
        }
        // calculate the error from the previous time step
        var norm = this.out[i].subtract(data).norm();
        if(norm < minNorm) {
            win = i;
            minNorm = norm;
        }
    }
    // set the winner, otherwise take the output
    // from the first neuron  
    if(this.winnerTakeAll)
        this.winner = win;
    for(var i=0; i<this.children.length; i++ ) {
        if(this.selfConnect) {
            this.children[i].input(inp);
        }
        else {
            // zero out the data from our own previous output
            var tmp = inp;
            for(var j=0; j<this.nIn; j++ ) {
                tmp[(i+1)*this.nIn +j] = 0;
            }
            this.children[i].input(tmp);
        }
    }
};
pParallel.prototype.sideput = function () {
    var a = new Arr();
    for(i=0; i<this.children.length; i++ ) {
        a.concat(this.children[i].sideput());
    }
    return a;
};
pParallel.prototype.output = function () {
    var data = this.out[this.winner].output();
    return data;
};
pParallel.prototype.reset = function (nIn, nOut) {
    pNode.prototype.reset.call(this, nIn, nOut);
    for(i=0; i<this.children.length; i++) {
        this.children[i].reset();
    }
};

//====================================================================
// connect pNodes in a recurrent layer
//====================================================================
var pRecurrent = function (children) {
    pNode.call(this, children[0].nIn, children[0].nOut*children.length);
    this.children = children;
    this.out = new Arr(this.children.length);
    // do nodes receive their own last output (AR1?)
    this.selfConnect   = false;
    // call reset on the children
    if(this.recurrent) {
        for(i=0; i<this.children.length; i++ ) {
            this.children[i].reset(this.nIn*(1+children.length), this.nOut);
        }
    }
};
pRecurrent.prototype = Object.create(pNode.prototype);
pRecurrent.prototype.constructor = pRecurrent;
pRecurrent.prototype.input = function (data) {
    // create the new input vector
    for(var i=0; i<this.children.length; i++ ) {
        var inp = new Arr();
        inp.concat(data);
        for(var j=0; j<this.children.length; j++ ) {
            // zero out the data from our own previous output
            if(j==i && !this.selfConnect)
                continue;
            inp.concat(this.out[j]);
        }
        this.children[i].input(inp);
    }
    // compute the new outputs
    for(i=0; i<this.children.length; i++ ) {
        this.out = this.children[i].output();
    }
};
pRecurrent.prototype.output = function () {
    var data = (new Arr()).concat(this.out);
    return data;
};
pRecurrent.prototype.reset = function (nIn, nOut) {
    pNode.prototype.reset.call(this, nIn, nOut);
};

//====================================================================
// ARMA(1) predictor
//====================================================================
var pARMA = function (nIn, nOut, AR) {
    AR = typeof AR !== 'undefined' ? AR : true;
    pNode.call(this, nIn, nOut);
    this.w   = (new Arr()).randomize(nIn+1);
    this.inp = (new Arr()).zero(nIn+1);
    this.act = Math.random();
    this.AR  = AR;
};
pARMA.prototype = Object.create(pNode.prototype);
pARMA.prototype.constructor = pARMA;
pARMA.prototype.input = function (inp) {
    this.t ++;
    this.learnRate = 0.1;//(1/this.t);

    // compute the last error
    var err = this.output()-inp[0];
    // update the weights for the last error
    this.w.multiply(1-this.learnRate);
    var delta = this.inp.copy().multiply(2 *err *this.learnRate);
    this.w.subtract(delta);

    // normalize
    this.w.normalize();

    // compute the input vector with our previous activation
    // (if we are configured for AutoRegressive inputs).
    if(this.AR)
        this.inp = (new Arr()).concat(inp).concat(this.act);
    else
        this.inp = (new Arr()).concat(inp);

    // update the output
    this.act = arrDot(this.inp, this.w);
};
pARMA.prototype.output = function () {
    return new Arr(this.act);
};
pARMA.prototype.reset = function (nIn, nOut) {
    pNode.prototype.reset.call(this, nIn, nOut);
    this.w   = (new Arr()).randomize(this.nIn+1);
    this.inp = (new Arr()).zero(this.nIn+1);
    this.act = Math.random();
};

//====================================================================
// tapped delay line
//====================================================================
var pTDL = function (nIn, nOut) {
    pNode.call(this, nIn, nOut);
    assert(nOut % nIn == 0);
    //memLen = nOut / nIn;
    this.memory = (new Arr()).zero(nOut);
};
pTDL.prototype = Object.create(pNode.prototype);
pTDL.prototype.constructor = pTDL;
pTDL.prototype.input = function (inp) {
    // update memory
    this.memory = inp.concat(this.memory);
    this.memory.splice(this.nOut, this.nIn);
};
pTDL.prototype.output = function () {
    return this.memory;
};
pTDL.prototype.reset = function (nIn, nOut) {
    pNode.prototype.reset.call(this, nIn, nOut);
    this.memory = (new Arr()).zero(this.nOut);
};

//====================================================================
// neural network
//====================================================================
function pNet(nIn, nOut, nHid) {
    nHid = typeof nHid !== 'undefined' ? nHid : 3;
    pNode.call(this, nIn, nOut);

    this.learnRate = 0.2;
    this.nHid = nHid;
    layerOpts = {
        squash: Neuron.squash.TANH,
        bias: 0
    };
    this.inputNeurons  = new Layer(this.nIn);
    this.inputNeurons.set(layerOpts);
    this.outputNeurons = new Layer(this.nOut);
    this.outputNeurons.set(layerOpts);

    if(nHid) {
        this.hiddenNeurons = new Layer(this.nHid);
        this.hiddenNeurons.set(layerOpts);
        this.inputNeurons.project(this.hiddenNeurons);
        this.hiddenNeurons.project(this.outputNeurons);
        this.network = new Network({
            input: this.inputNeurons,
            hidden: [this.hiddenNeurons],
            output: this.outputNeurons
        });
    }
    else {
        this.inputNeurons.project(this.outputNeurons);
        this.network = new Network({
            input: this.inputNeurons,
            output: this.outputNeurons
        });
    }
    //var data = Array.apply(null, new Array(nIn)).map(Number.prototype.valueOf,0);
    //this.network.activate(data);
    this.outp = (new Arr()).size(nOut);
    //this.network.optimized = false;
}
pNet.prototype = Object.create(pNode.prototype);
pNet.prototype.constructor = pNet;

pNet.prototype.input = function (data) {
    this.network.propagate(this.learnRate, data);
    this.outp = this.network.activate(data);
};
pNet.prototype.output = function () {
    return this.outp;
};
