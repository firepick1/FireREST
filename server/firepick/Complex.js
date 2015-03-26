var should = require("should"),
    module = module || {},
    firepick = firepick || {};

(function(firepick) { var that = {};

    function Complex(re,im) {
        var that = this;
		that.re = re || 0;
		that.im = im || 0;
		return that;
    };

    ///////////////// INSTANCE ///////////////
    Complex.prototype.modulus = function() {
		var that = this;
		return Math.sqrt(that.re*that.re + that.im * that.im);
    };
	Complex.prototype.add = function(c2) {
		var that = this;
		that.re += c2.re;
		that.im += c2.im;
		return that;
	};
	Complex.prototype.sqrt = function() {
		var that = this;
		var modulus = that.modulus();
		var p = Math.sqrt((modulus+that.re)/2);
		var q = Math.sqrt((modulus-that.re)/2);
		if (that.im >= 0) {
			return new Complex(p,q);
		} else {
			return new Complex(p,-q);
		}
	};
	Complex.prototype.plus = function(c2) {
		var that = this;
		return new Complex(that.re+c2.re, that.im+c2.im);
	};
	Complex.prototype.minus = function(c2) {
		var that = this;
		return new Complex(that.re-c2.re, that.im-c2.im);
	};
	Complex.prototype.times = function(c2) {
		var that = this;
		return new Complex(that.re*c2.re-that.im*c2.im, 
			that.re*c2.im+that.im*c2.re);
	};
	Complex.prototype.conj = function() {
		var that = this;
		return new Complex(that.re, -that.im);
	};
	Complex.prototype.div = function(c2) {
		var that = this;
		var denom = c2.re*c2.re + c2.im*c2.im;
		return new Complex(
			(that.re*c2.re+that.im*c2.im)/denom,
			(that.im*c2.re-that.re*c2.im)/denom);
	};
	Complex.prototype.recip = function() {
		var that = this;
		var denom = that.re*that.re + that.im*that.im;
		return new Complex(that.re/denom, -that.im/denom);
	};
	Complex.prototype.isNear = function(c2, epsilon) {
		var that = this;
		var dRe = that.re - c2.re;
		var dIm = that.im - c2.im;
		var modulus = Math.sqrt(dRe*dRe + dIm*dIm);
		epsilon.should.be.Number;
		return modulus <= epsilon;
	};

	//////////////// CLASS ////////////
	Complex.from = function(xy) {
		if (xy instanceof Complex) {
			return xy;
		}
		if (xy.hasOwnProperty("x")) {
			return new Complex(xy.x, xy.y);
		}
		if (xy.hasOwnProperty("re")) {
			return new Complex(xy.re, xy.im);
		}
		return new Complex(xy);
	};
	Complex.times = function(a,b) {
		return Complex.from(a).times(Complex.from(b));
	};
	Complex.minus = function(a,b) {
		return Complex.from(a).minus(Complex.from(b));
	};
	Complex.plus = function(a,b) {
		return Complex.from(a).plus(Complex.from(b));
	};
	Complex.div = function(a,b) {
		return Complex.from(a).div(Complex.from(b));
	};

    Logger.logger.info("loaded firepick.Complex");
    module.exports = firepick.Complex = Complex;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.Complex", function() {
	var Complex = firepick.Complex;
	it("new Complex(re,im) should create a complex number", function() {
		var c1 = new Complex(1,2);
		c1.should.have.properties({re:1,im:2});
	});
	it("c.modulus() should return the modulus of a complex number", function() {
		var c1 = new Complex(3,4);
		c1.modulus().should.equal(5);
		new Complex(4,3).modulus().should.equal(5);
	});
	it("c1.plus(c2) should return the complex sum", function() {
		var c13 = new Complex(1,3);
		var c24 = new Complex(2,4);
		should.deepEqual(c13.plus(c24),new Complex(3,7));
		should.deepEqual(c24.plus(c13),new Complex(3,7));
	});
	it("c1.minus(c2) should return the complex difference", function() {
		var c13 = new Complex(1,3);
		var c24 = new Complex(2,4);
		should.deepEqual(c13.minus(c24),new Complex(-1,-1));
		should.deepEqual(c24.minus(c13),new Complex(1,1));
	});
	it("c1.times(c2) should return the complex product", function() {
		var c13 = new Complex(1,3);
		var c24 = new Complex(2,4);
		should.deepEqual(c13.times(c24),new Complex(1*2-3*4,1*4+3*2));
		should.deepEqual(c24.times(c13),new Complex(1*2-3*4,1*4+3*2));
	});
	it("c.conj() should return the complex conjugate", function() {
		should.deepEqual(new Complex(1,2).conj(), new Complex(1,-2));
	});
	it("c.recip() should return the reciprocal", function() {
		var c13 = new Complex(1,3);
		var cr = c13.recip();
		cr.re.should.be.within(0.1,0.1);
		cr.im.should.be.within(-0.3,-0.3);
		var crr = cr.recip();
		crr.re.should.be.within(1,1);
		crr.im.should.be.within(2.999999999999999,3);
	});
	it("c1.div(c2) should return the complex quotient", function() {
		var c13 = new Complex(1,3);
		var c24 = new Complex(2,4);
		var result = c13.div(c24);
		result.re.should.be.within(0.7,0.7);
		result.im.should.be.within(0.1,0.1);
	});
	it("Complex.times(a,b) should handle real and complex numbers", function() {
		var c36 = [
			Complex.times(3, new Complex(1,2)),
			Complex.times(new Complex(1,2), 3),
			Complex.times(new Complex(3), new Complex(1,2)),
			Complex.times(new Complex(1,2), new Complex(3)),
		];
		for (var i = 0; i < c36.length; i++) {
			c36[i].re.should.equal(3);
			c36[i].im.should.equal(6);
		}
	});
	it("c1.add(c2) should increment a complex number", function() {
		var sum = new Complex();
		var c12 = new Complex(1,2);
		should.deepEqual(sum.add(c12), new Complex(1,2));
		should.deepEqual(sum.add(c12), new Complex(2,4));
		should.deepEqual(sum.add(c12), new Complex(3,6));
	});
	it("c.sqrt() should return the complex square root", function() {
		should.deepEqual(new Complex(25).sqrt(), new Complex(5));
		should.deepEqual(new Complex(-1).sqrt(), new Complex(0,1));
		should.deepEqual(new Complex(3,4).sqrt(), new Complex(2,1));
		var c21 = new Complex(2,1);
		should.deepEqual(Complex.times(c21,c21), new Complex(3,4));
	});
	it("from(xy) should convert to a complex number", function() {
		should.deepEqual(Complex.from(new Complex(1,2)), new Complex(1,2));
		should.deepEqual(Complex.from({x:1,y:2}), new Complex(1,2));
	});
	it("c1.isNear(c2,e) should return true if c1 is in neighborhood of c2", function() {
		var c11 = new Complex(1,1);
		new Complex(1.07,1.07).isNear(c11,0.1).should.equal(true);
		new Complex(1.08,1.08).isNear(c11,0.1).should.equal(false);
	});
})
