// Define the Arr class.
window.Arr = (function() {

    function Arr() {
        var a = Object.create( Array.prototype );
        if( arguments.length==1 && 
           typeof(arguments[0]) == "number" ) {
            a = [arguments[0]];
        }
        //if(arguments.length > 0) {
        //a = Array(arguments[0]);
        else {
            a = (Array.apply( a, arguments ) || a);
        }
        Arr.injectClassMethods( a );
        return a;
    }
    Arr.injectClassMethods = function( a ){
        for (var method in Arr.prototype){
            if (Arr.prototype.hasOwnProperty( method )){
                a[ method ] = Arr.prototype[ method ];
            }
        }
        return a;
    };
    Arr.fromArray = function( array ){
        var a = Arr.apply( null, array );
        return a;
    };
    Arr.isArray = function( value ){
        var stringValue = Object.prototype.toString.call( value );
        return stringValue.toLowerCase() === "[object array]";
    };

    // Define the class methods.
    Arr.prototype = {
        copy: function() {
            return Arr.fromArray(this);
        },
        concat: function(value) {
            if (Arr.isArray( value )){
                for (var j=0; j<value.length; j++){
                    this.concat(value[j]);
                }
            } 
            else {
                Array.prototype.push.call( this, value );
            }
            return this;
        },
        add: function( value ) {
            if (Arr.isArray( value )){
                for (var i=0; i<this.length; i++){
                    this[i] += value[i];
                }
            } 
            else {
                for (var i=0; i<this.length; i++){
                    this[i] += value;
                }
            }
            return this;
        },
        subtract: function( value ) {
            if (Arr.isArray( value )){
                for (var i=0; i<this.length; i++){
                    this[i] -= value[i];
                }
            } 
            else {
                for (var i=0; i<this.length; i++){
                    this[i] -= value;
                }
            }
            return this;
        },
        multiply: function( value ) {
            if (Arr.isArray( value )){
                for (var i=0; i<this.length ; i++){
                    this[i] *= value[i];
                }
            } 
            else {
                for (var i=0; i<this.length ; i++){
                    this[i] *= value;
                }
            }
            return this;
        },
        sum: function() {
            var val = 0;
            for (var i=0; i<this.length; i++){
                val += this[i];
            }
            return val;
        },
        norm: function() {
            var val = 0;
            for (var i=0; i<this.length; i++){
                val += this[i]*this[i];
            }
            return val;
        },
        size: function(len) {
            if(typeof(len) !== "undefined")
                this.length = len;
            return this;
        },
        zero: function(len) {
            this.size(len);
            for(var i=0; i<this.length; i++)
                this[i] = 0;
            return this;
        },
        randomize: function(len) {
            this.size(len);
            for(var i=0; i<this.length; i++)
                this[i] = Math.random();
            return this;
        },
        normalize: function() {
            var s = this.norm();
            for(var i=0; i<this.length; i++)
                this[i] = this[i] / s;
            return this;
        }
    };
    return( Arr );
}).call( {} );

function arrDot(a,b) {
    var val = 0;
    for (var i=0; i<a.length; i++){
        val += a[i]*b[i];
    }
    return val;
}
function arrMultiply(a,b) {
    var val = new Arr();
    for (var i=0; i<a.length; i++){
        val[i] = a[i]*b[i];
    }
    return val;
}
