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
    Complex.prototype.norm = function() {
		var that = this;
		return Math.sqrt(that.re*that.re + that.im * that.im);
    };
	Complex.prototype.add = function(c2) {
		var that = this;
		that.re += c2.re;
		that.im += c2.im;
		return that;
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

	//////////////// CLASS ////////////
	Complex.times = function(a,b) {
		if (a instanceof Complex) {
			if (b instanceof Complex) {
				return a.times(b);
			}
			return new Complex(a.re*b, a.im*b);
		} else {
			if (b instanceof Complex) {
				return new Complex(a*b.re, a*b.im);
			} else {
				return new Complex(a * b);
			}
		}
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
	it("norm() should return the norm of a complex number", function() {
		var c1 = new Complex(3,4);
		c1.norm().should.equal(5);
		new Complex(4,3).norm().should.equal(5);
	});
	it("plus(c) should add a complex number to another", function() {
		var c13 = new Complex(1,3);
		var c24 = new Complex(2,4);
		should.deepEqual(c13.plus(c24),new Complex(3,7));
		should.deepEqual(c24.plus(c13),new Complex(3,7));
	});
	it("minus(c) should subtract a complex number to another", function() {
		var c13 = new Complex(1,3);
		var c24 = new Complex(2,4);
		should.deepEqual(c13.minus(c24),new Complex(-1,-1));
		should.deepEqual(c24.minus(c13),new Complex(1,1));
	});
	it("times(c) should multiply a complex number with another", function() {
		var c13 = new Complex(1,3);
		var c24 = new Complex(2,4);
		should.deepEqual(c13.times(c24),new Complex(1*2-3*4,1*4+3*2));
		should.deepEqual(c24.times(c13),new Complex(1*2-3*4,1*4+3*2));
	});
	it("conj() should return the complex conjugate", function() {
		should.deepEqual(new Complex(1,2).conj(), new Complex(1,-2));
	});
	it("recip() should return the reciprocal", function() {
		var c13 = new Complex(1,3);
		var cr = c13.recip();
		cr.re.should.be.within(0.1,0.1);
		cr.im.should.be.within(-0.3,-0.3);
		var crr = cr.recip();
		crr.re.should.be.within(1,1);
		crr.im.should.be.within(2.999999999999999,3);
	});
	it("div(c) should divide a complex by another", function() {
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
	it("add(c) should sum up a complex number", function() {
		var sum = new Complex();
		var c12 = new Complex(1,2);
		should.deepEqual(sum.add(c12), new Complex(1,2));
		should.deepEqual(sum.add(c12), new Complex(2,4));
		should.deepEqual(sum.add(c12), new Complex(3,6));
	});
})
