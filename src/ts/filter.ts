//
export class pgFilter {
    y;
    
    constructor() {
        this.y = 0;
    }
    
    reset() {
    }
    push(x) {
        this.y = x;
        return this.y;
    }
    get() {
        return this.y;
    }
}

class pgGammaFilter extends pgFilter {
    x1 = 0;
    y1 = 0;
    xDecay = 0.9;
    yDecay = 0.6;
    
    constructor() {
        super();
        this.x1 = 0;
        this.y1 = 0;
        this.xDecay = 0.9;
        this.yDecay = 0.6;
    }
    
    reset() {
        this.x1 = 0;
        this.y1 = 0;
        this.y = 0;
    }
    
    push(x) {
        this.y = x - this.y1;
        this.x1 = this.xDecay * this.x1 + (1 - this.xDecay) * x;
        this.y1 = this.yDecay * this.y1 + (1 - this.yDecay) * this.x1;
        return this.y;
    }
}

class pgFIRFilter extends pgFilter {
    order;
    coeff;
    tdl;
    
    constructor() {
        super();
        this.order = 7;
        //this.coeff = [0.0170,   -0.1612,    0.1732,    0.7317,    0.1732,   -0.1612,    0.0170];
        this.coeff = [-0.0241, -0.1072, -0.2259, 0.7150, -0.2259, -0.1072, -0.0241];
        this.tdl;
    }
    reset() {
        this.tdl = [0, 0, 0, 0, 0, 0, 0];
    }
    push(x) {
        this.y = 0;
        for (let i = 0; i < this.order - 1; i++) {
            this.y += this.tdl[i] * this.coeff[i];
            this.tdl[i] = this.tdl[i + 1];
        }
        this.y += this.tdl[this.order - 1] * this.coeff[this.order - 1];
        this.tdl[this.order - 1] = x;
        return this.y;
    }
}
