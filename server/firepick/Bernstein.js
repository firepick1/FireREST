var should = require("should"),
    module = module || {},
    firepick = firepick || {};
Logger = require("./Logger");

(function(firepick) {
    function Bernstein(n,options) {
		var that = this;
		options = options || {};
		should.exist(n);
		n.should.be.above(0);
		that.n = n;
		that.n2 = Math.ceil(n/2);
		that.logger = options.logger || new Logger(options);
		return that;
    };

    ///////////////// INSTANCE ///////////////
	Bernstein.prototype.coefficient = function(k,t) {
		var that = this;
		k.should.not.be.below(0);
		k.should.not.be.above(that.n);
		var result = Util.choose(that.n,k);
		var t1 = (1-t);
		for (var i = 1; i < that.n-k; i++) {
			result = result*t1;
		}
		for (var i = 1; i < k; i++) {
			result = result*t;
		}
		return result;
	};
	Bernstein.prototype.Vk = function(vin,vout,k) {
		var that = this;
		return k < that.n2 ? vin : vout;
	};
	Bernstein.prototype.V = function(vin, vout, t) {
		var that = this;
		var sum = 0;
		for (var k=0; k <= that.n; k++) {
			that.logger.trace("n:", that.n, " k:", k, " t:", t,
				" V(k):", that.Vk(vin,vout,k), 
				" coefficient(k,t):", that.coefficient(k,t));
			sum += that.Vk(vin,vout,k) * that.coefficient(k,t);
		}
		return sum/(1+that.n);
	};
	Bernstein.prototype.Fk = function(vin, vout, k) {
		var that = this;
		var sum = 0;
		for (var j=0; j < k; j++) {
			sum += that.Vk(vin,vout,j);
		}
		return sum/(1+that.n);
	};
	Bernstein.prototype.F = function(vin, vout, t, T) {
		var that = this;
		var sum = 0;
		var n1 = that.n+1;
		T = T || 1;
		for (var k=0; k <= n1; k++) {
			sum += that.Fk(vin,vout,k) * Bernstein.coefficient(n1,k,t);
		}
		return T * sum;
	};

	///////////////// CLASS //////////
	Bernstein.coefficient = function(n,k,t) {
		var result = Util.choose(n,k);
		result.should.not.NaN;
		var t1 = (1-t);
		for (var i = 1; i < n-k; i++) {
			result = result*t1;
		}
		result.should.not.NaN;
		for (var i = 1; i < k; i++) {
			result = result*t;
		}
		result.should.not.NaN;
		return result;
	};

    Logger.logger.info("loaded firepick.Bernstein");
    module.exports = firepick.Bernstein = Bernstein;
})(firepick || (firepick = {}));


(typeof describe === 'function') && describe("firepick.Bernstein", function() {
	var Bernstein = firepick.Bernstein;
	it("new Bernstein(5) should create a 5-degree Bernstein instance", function() {
		var b5 = new Bernstein(5);
		b5.should.have.properties({n:5,n2:3});
	});
	it("coefficient(k,t) should return Bernstein coefficient", function() {
		var b5 = new Bernstein(5);
		b5.coefficient(5,0).should.equal(0);
		b5.coefficient(5,0.5).should.equal(0.0625);
		b5.coefficient(5,1).should.equal(1);
		b5.coefficient(0,0).should.equal(1);
		b5.coefficient(0,0.5).should.equal(0.0625);
		b5.coefficient(0,1).should.equal(0);
		b5.coefficient(1,0).should.equal(5);
		b5.coefficient(1,0.5).should.equal(0.625);
		b5.coefficient(1,1).should.equal(0);
		b5.coefficient(2,0).should.equal(0);
		b5.coefficient(2,0.5).should.equal(1.25);
		b5.coefficient(2,1).should.equal(0);
		b5.coefficient(3,0).should.equal(0);
		b5.coefficient(3,0.5).should.equal(1.25);
		b5.coefficient(3,1).should.equal(0);
		b5.coefficient(4,0).should.equal(0);
		b5.coefficient(4,0.5).should.equal(0.625);
		b5.coefficient(4,1).should.equal(5);
	});
	it("Bernstein.coefficient(n,k,t) should return Bernstein coefficient", function() {
		Bernstein.coefficient(5,5,0).should.equal(0);
		Bernstein.coefficient(5,5,0.5).should.equal(0.0625);
		Bernstein.coefficient(5,5,1).should.equal(1);
		Bernstein.coefficient(5,0,0).should.equal(1);
		Bernstein.coefficient(5,0,0.5).should.equal(0.0625);
		Bernstein.coefficient(5,0,1).should.equal(0);
		Bernstein.coefficient(5,1,0).should.equal(5);
		Bernstein.coefficient(5,1,0.5).should.equal(0.625);
		Bernstein.coefficient(5,1,1).should.equal(0);
		Bernstein.coefficient(5,2,0).should.equal(0);
		Bernstein.coefficient(5,2,0.5).should.equal(1.25);
		Bernstein.coefficient(5,2,1).should.equal(0);
		Bernstein.coefficient(5,3,0).should.equal(0);
		Bernstein.coefficient(5,3,0.5).should.equal(1.25);
		Bernstein.coefficient(5,3,1).should.equal(0);
		Bernstein.coefficient(5,4,0).should.equal(0);
		Bernstein.coefficient(5,4,0.5).should.equal(0.625);
		Bernstein.coefficient(5,4,1).should.equal(5);
	});
	it("V(vin,vout,t) should interpolate velocity on interval t:[0,1]", function() {
		var b5 = new Bernstein(5);
		b5.V(-100,100,0).should.equal(-100);
		b5.V(-100,100,0.1).should.within(-84,-83);
		b5.V(-100,100,0.2).should.within(-65,-64);
		b5.V(-100,100,0.3).should.within(-45,-44);
		b5.V(-100,100,0.4).should.within(-23,-22);
		b5.V(-100,100,0.5).should.within(0,0);
		b5.V(-100,100,0.6).should.within(22,23);
		b5.V(-100,100,0.7).should.within(44,45);
		b5.V(-100,100,0.8).should.within(64,65);
		b5.V(-100,100,0.9).should.within(83,84);
		b5.V(-100,100,1).should.equal(100);
	});
	it("F(vin,vout,t) should interpolate V integral on interval t:[0,1]", function() {
		var b5 = new Bernstein(5);
		b5.F(-100,100,0).should.equal(-100);
		b5.F(-100,100,0.1).should.within(-111,-110);
		b5.F(-100,100,0.2).should.within(-122,-121);
		b5.F(-100,100,0.3).should.within(-130,-129);
		b5.F(-100,100,0.4).should.within(-136,-135);
		b5.F(-100,100,0.5).should.within(-138,-137);
		b5.F(-100,100,0.6).should.within(-136,-135);
		b5.F(-100,100,0.7).should.within(-130,-129);
		b5.F(-100,100,0.8).should.within(-122,-121);
		b5.F(-100,100,0.9).should.within(-111,-110);
		b5.F(-100,100,1).should.equal(-100);
	});
})
