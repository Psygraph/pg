import {pgDebug} from './util';

//====================================================================
// base class
//====================================================================
export class pNode {
    nIn = 0;
    nOut = 0;
    t = 0;
    act = 0;
    
    constructor(nIn = 0, nOut = 0) {
        this.nIn = nIn;
        this.nOut = nOut;
        this.t = 0;
    }
    
    input(inp) {
    }
    
    sideput() {
        return [];
    }
    
    output() {
        var value = 0;
        return value;
    }
    
    roundedOutput() {
        var outp = this.output();
        if (outp > 0) {
            return [1];
        } else {
            return [-1];
        }
    }
    
    addChild = function(child) {
        this.children.push(child);
    };
    
    reset(nIn, nOut) {
        if (typeof (nIn) !== 'undefined') {
            this.nIn = nIn;
        }
        if (typeof (nOut) !== 'undefined') {
            this.nOut = nOut;
        }
        this.act = 0;
        this.t = 0;
    }
}

//====================================================================
// series
//====================================================================
export class pSeries extends pNode {
    children;
    
    constructor(children) {
        super(children[0].nIn, children[children.length - 1].nOut);
        this.children = children;
    }
    
    input(data) {
        for (let i = 0; i < this.children.length; i++) {
            this.children[i].input(data);
            data = this.children[i].output();
        }
    }
    sideput() {
        var a = [];
        for (let i = 0; i < this.children.length; i++) {
            a.concat(this.children[i].sideput());
        }
        return a;
    }
    output() {
        var data = this.children[this.children.length - 1].output();
        return data;
    }
    reset(nIn, nOut) {
        super.reset(nIn, nOut);
        for (let i = 0; i < this.children.length; i++) {
            this.children[i].reset();
        }
    }
}

// ====================================================================
// connect pNodes in parallel
//====================================================================
class pParallel extends pNode {
    children;
    out = null;
    // do nodes receive their own last output (AR1?)
    selfConnect = false;
    // Are we only listening to one node?
    winnerTakeAll = false;
    winner = 0;
    // Is this a recurrent layer?
    recurrent = true;
    
    constructor(children) {
        super(children[0].nIn, children[0].nOut);
        this.children = children;
        this.out = pgMath.zeroArray(this.children.length);
        this.selfConnect = false;
        this.winnerTakeAll = false;
        this.winner = 0;
        this.recurrent = true;
        if (this.recurrent) {
            for (let i = 0; i < this.children.length; i++) {
                this.children[i].reset(this.nIn * (1 + children.length), this.nOut);
            }
        }
    }
    
    input(data) {
        var err = pgMath.zeroArray(this.children.length);
        var newOut = pgMath.zeroArray(this.children.length);
        // get the output from the previous time step
        for (let i = 0; i < this.children.length; i++) {
            newOut[i] = this.children[i].output();
        }
        var win = 0;
        var minNorm = Infinity;
        // create a new input vector
        var inp = [];
        inp.concat(data);
        for (let i = 0; i < this.children.length; i++) {
            if (this.recurrent) { // add neighboring outputs
                //inp.concat(out[i]);
            }
            // calculate the error from the previous time step
            var norm = this.out[i].subtract(data).norm();
            if (norm < minNorm) {
                win = i;
                minNorm = norm;
            }
        }
        // set the winner, otherwise take the output
        // from the first neuron
        if (this.winnerTakeAll) {
            this.winner = win;
        }
        for (let i = 0; i < this.children.length; i++) {
            if (this.selfConnect) {
                this.children[i].input(inp);
            } else {
                // zero out the data from our own previous output
                var tmp = inp;
                for (let j = 0; j < this.nIn; j++) {
                    tmp[(i + 1) * this.nIn + j] = 0;
                }
                this.children[i].input(tmp);
            }
        }
    }
    sideput() {
        var a = [];
        for (let i = 0; i < this.children.length; i++) {
            a.concat(this.children[i].sideput());
        }
        return a;
    }
    output() {
        var data = this.out[this.winner].output();
        return data;
    }
    reset(nIn, nOut) {
        super.reset(nIn, nOut);
        for (let i = 0; i < this.children.length; i++) {
            this.children[i].reset();
        }
    }
}

//====================================================================
// connect pNodes in a recurrent layer
//====================================================================
class pRecurrent extends pNode {
    children = null;
    out = null;
    // do nodes receive their own last output (AR1?)
    selfConnect = false;
    recurrent = false;
    
    constructor(children) {
        super(children[0].nIn, children[0].nOut * children.length);
        this.children = children;
        this.out = pgMath.zeroArray(this.children.length);
        this.selfConnect = false;
        // call reset on the children
        if (this.recurrent) {
            for (let i = 0; i < this.children.length; i++) {
                this.children[i].reset(this.nIn * (1 + children.length), this.nOut);
            }
        }
    }
    
    inputs(data) {
        // create the new input vector
        for (var i = 0; i < this.children.length; i++) {
            var inp = [];
            inp.concat(data);
            for (var j = 0; j < this.children.length; j++) {
                // zero out the data from our own previous output
                if (j == i && !this.selfConnect) {
                    continue;
                }
                inp.concat(this.out[j]);
            }
            this.children[i].inputs(inp);
        }
        // compute the new outputs
        for (let i = 0; i < this.children.length; i++) {
            this.out = this.children[i].outputs();
        }
    }
    outputs() {
        var data = Array.from(this.out);
        return data;
    }
    reset(nIn, nOut) {
        super.reset(nIn, nOut);
    }
}

//====================================================================
// ARMA(1) predictor
//====================================================================
export class pARMA extends pNode {
    w;
    inp;
    act;
    AR;
    learnRate;
    
    constructor(nIn, nOut, AR = true) {
        super(nIn, nOut);
        this.w = pgMath.randomArray(nIn + 1);
        this.inp = pgMath.zeroArray(nIn + 1);
        this.act = Math.random();
        this.AR = AR;
    }
    
    input(inp) {
        this.t++;
        this.learnRate = 0.1;//(1/this.t);
        
        // compute the last error
        var err = this.output() - inp[0];
        // update the weights for the last error
        this.w = pgMath.multiply(this.w, 1 - this.learnRate);
        var delta = pgMath.multiply(inp, 2 * err * this.learnRate);
        this.w = pgMath.subtract(this.w, delta);
        
        // normalize
        this.w = pgMath.normalize(this.w);
        
        // compute the input vector with our previous activation
        // (if we are configured for AutoRegressive inputs).
        if (this.AR) {
            this.inp = inp.concat(this.act);
        }
        
        // update the output
        this.act = pgMath.dot(this.inp, this.w);
    }
    output() {
        return this.act;
    }
    reset(nIn, nOut) {
        super.reset(nIn, nOut);
        this.w = pgMath.randomArray(this.nIn + 1);
        this.inp = pgMath.zeroArray(this.nIn + 1);
        this.act = Math.random();
    }
}

//====================================================================
// tapped delay line
//====================================================================
export class pTDL extends pNode {
    memory;
    
    constructor(nIn, nOut) {
        super(nIn, nOut);
        pgDebug.assert(nOut % nIn == 0);
        //memLen = nOut / nIn;
        this.memory = pgMath.zeroArray(nOut);
    }
    
    input(inp) {
        // update memory
        this.memory = inp.concat(this.memory);
        this.memory.splice(this.nOut, this.nIn);
    }
    output() {
        return this.memory;
    }
    reset(nIn, nOut) {
        super.reset(nIn, nOut);
        this.memory = pgMath.zeroArray(this.nOut);
    }
}

//====================================================================
// neural network
//====================================================================
/*
class pNet {
    constructor(nIn, nOut, nHid=3) {
        super(nIn, nOut);

        this.learnRate = 0.2;
        this.nHid = nHid;
        let layerOpts = {
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

    input(data) {
        this.network.propagate(this.learnRate, data);
        this.outp = this.network.activate(data);
    }
    output() {
        return this.outp;
    }
}
*/

export class pgMath {
    static random() {
        return Math.random();
    }
    static randomArray(len) {
        let a = [];
        for (var i = 0; i < len; i++) {
            a[i] = Math.random();
        }
        return a;
    }
    static zeroArray(len) {
        let a = [];
        for (var i = 0; i < len; i++) {
            a[i] = 0;
        }
        return a;
    }
    static dot(a, b) {
        var val = 0;
        for (var i = 0; i < a.length; i++) {
            val += a[i] * b[i];
        }
        return val;
    }
    static sum(a) {
        var val = 0;
        for (var i = 0; i < a.length; i++) {
            val += a[i];
        }
        return val;
    }
    static multiply(array, scalar) {
        return array.map(a => a * scalar);
    }
    static divide(array, scalar) {
        return array.map(a => a / scalar);
    }
    static add(array, scalar) {
        return array.map(a => a + scalar);
    }
    static subtract(array, scalar) {
        return array.map(a => a - scalar);
    }
    static norm(array) {
        var val = 0;
        for (var i = 0; i < array.length; i++) {
            val += array[i] * array[i];
        }
        return val;
    }
    static normalize(array) {
        var norm = this.norm(array);
        return this.divide(array, norm);
    }
    static mean(array) {
        return pgMath.sum(array) / array.length;
    }
}
