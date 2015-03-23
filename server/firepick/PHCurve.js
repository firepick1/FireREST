var should = require("should"),
    module = module || {},
    firepick = firepick || {};
Logger = require("./Logger");
Bernstein = require("./Bernstein");

(function(firepick) {
    function PHCurve(n,options) {
		var that = this;
		options = options || {};
		should.exist(n);
		n.should.be.above(0);
		n.should.be.equal(5); // currently only support quintics
		that.n = n;
		that.n2 = Math.ceil(n/2);
		that.bn = new Bernstein(n);
		that.bn1 = new Bernstein(n+1);
		that.logger = options.logger || new Logger(options);
		return that;
    };

    ///////////////// INSTANCE ///////////////
	PHCurve.prototype.Vk = function(vin,vout,k) {
		var that = this;
		return k < that.n2 ? vin : vout;
	};
	PHCurve.prototype.V = function(vin, vout, t) {
		var that = this;
		var sum = 0;
		for (var k=0; k <= that.n; k++) {
			that.logger.trace("n:", that.n, " k:", k, " t:", t,
				" V(k):", that.Vk(vin,vout,k), 
				" coefficient(k,t):", that.bn.coefficient(k,t));
			sum += that.Vk(vin,vout,k) * that.bn.coefficient(k,t);
		}
		return sum/(1+that.n);
	};
	PHCurve.prototype.Fk = function(vin, vout, k) {
		var that = this;
		var sum = 0;
		for (var j=0; j < k; j++) {
			sum += that.Vk(vin,vout,j);
		}
		return sum/(1+that.n);
	};
	PHCurve.prototype.F = function(vin, vout, t, T) {
		var that = this;
		var sum = 0;
		var n1 = that.n+1;
		T = T || 1;
		for (var k=0; k <= n1; k++) {
			sum += that.Fk(vin,vout,k) * that.bn1.coefficient(k,t);
		}
		return T * sum;
	};

	///////////////// CLASS //////////

    Logger.logger.info("loaded firepick.PHCurve");
    module.exports = firepick.PHCurve = PHCurve;
})(firepick || (firepick = {}));


(typeof describe === 'function') && describe("firepick.PHCurve", function() {
	var PHCurve = firepick.PHCurve;
	it("new PHCurve(5) should create a 5-degree PHCurve instance", function() {
		var b5 = new PHCurve(5);
		b5.should.have.properties({n:5,n2:3});
	});
	it("V(vin,vout,t) should interpolate velocity on interval t:[0,1]", function() {
		var b5 = new PHCurve(5);
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
		var b5 = new PHCurve(5);
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
