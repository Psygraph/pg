
//
function Filter() {
    this.y = 0;
}
Filter.prototype.reset = function() {};
Filter.prototype.push = function(x) {
    this.y = x;
    return this.y;
};
Filter.prototype.get = function() {
    return this.y;
};
function GammaFilter() {
    Filter.call(this);
    this.x1 = 0;
    this.y1 = 0;
    this.xDecay= 0.9;
    this.yDecay= 0.6;
}
GammaFilter.prototype.reset = function() {
    this.x1 = 0;
    this.y1 = 0;
    this.y  = 0;
};
GammaFilter.prototype.push = function(x) {
    this.y = x - this.y1;
    this.x1 = this.xDecay * this.x1 + (1-this.xDecay) * x;
    this.y1 = this.yDecay * this.y1 + (1-this.yDecay) * this.x1;
    return this.y;
};
function FIRFilter() {
    Filter.call(this);
    this.order = 7;
    //this.coeff = [0.0170,   -0.1612,    0.1732,    0.7317,    0.1732,   -0.1612,    0.0170];
    this.coeff = [-0.0241,   -0.1072,   -0.2259,    0.7150,   -0.2259,   -0.1072,   -0.0241];
    this.tdl;
}
FIRFilter.prototype.reset = function() {
    this.tdl = [0,0,0,0,0,0,0];
};
FIRFilter.prototype.push = function(x) {
    this.y=0;
    for(var i=0; i<this.order-1; i++) {
        this.y += this.tdl[i] * this.coeff[i];
        this.tdl[i] = this.tdl[i+1];
    }
    this.y += this.tdl[this.order-1] * this.coeff[this.order-1];
    this.tdl[this.order-1] = x;
    return this.y;
};