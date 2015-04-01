var should = require("should"),
    module = module || {},
    firepick = firepick || {};
Logger = require("./Logger");
Bernstein = require("./Bernstein");
Tridiagonal = require("./Tridiagonal");
PHCurve = require("./PHCurve");

(function(firepick) {
	var degree = 5;
	var bn = new Bernstein(5);
	var bn1 = new Bernstein(6);

    function PHFeed(phcurve,options) {
		var that = this;
		should.exist(phcurve, "expected PHCurve");
		options = options || {};
		that.T = options.T || 1; // seconds from 0-maxV
		that.maxV = options.maxV || 60*10000; // mm/min
		that.logger = options.logger || new Logger(options);
		that.ph = phcurve;
		return that;
    };

	/////////////// PRIVATE ////////////////

    ///////////////// INSTANCE API ///////////////
	PHFeed.prototype.V = function(vin, vout, tau) {
		var that = this;
		var sum = 0;
		for (var k=0; k <= degree; k++) {
			that.logger.trace("V() k:", k, " tau:", tau,
				" Vk(k):", that.Vk(vin,vout,k), 
				" coefficient(k,tau):", bn.coefficient(k,tau));
			sum += that.Vk(vin,vout,k) * bn.coefficient(k,tau);
		}
		return sum;
	};
	PHFeed.prototype.F = function(vin, vout, tau, T) {
		var that = this;
		var sum = 0;
		for (var k=0; k <= degree+1; k++) {
			that.logger.debug("F() k:", k, " tau:", tau,
				" Fk(k):", that.Fk(vin,vout,k), 
				" coefficient(k,tau):", bn1.coefficient(k,tau));
			sum += that.Fk(vin,vout,k) * bn1.coefficient(k,tau);
		}
		return sum*T;
	};

	///////////// INSTANCE OTHER ////////////////
	PHFeed.prototype.Vk = function(vin,vout,k) {
		var that = this;
		switch (k) {
			case 0: return vin;
			case 1: return vin;
			case 2: return vin;
			case 3: return vout;
			case 4: return vout;
			case 5: return vout;
			default: should.fail("k:"+k);
		}
	};
	PHFeed.prototype.Fk = function(vin, vout, k) {
		var that = this;
		var sum = 0;
		for (var j=0; j < k; j++) {
			sum += that.Vk(vin,vout,j);
		}
		return sum/(1+degree);
	};
	PHFeed.prototype.Fvt = function(vin, vout, tau) {
		var that = this;
		var sum = 0;
		var n1 = degree+1;
		for (var k=0; k <= n1; k++) {
			sum += that.Fk(vin,vout,k) * bn1.coefficient(k,tau);
		}
		return that.T * sum;
	};

	///////////////// CLASS //////////

    Logger.logger.info("loaded firepick.PHFeed");
    module.exports = firepick.PHFeed = PHFeed;
})(firepick || (firepick = {}));


(typeof describe === 'function') && describe("firepick.PHFeed", function() {
	var logger = new Logger({
		nPlaces:1,
		logLevel:"debug"
	});
	var PHFeed = firepick.PHFeed;
	var pts = [
		{x:0,y:0},
		{x:1,y:0},
		{x:2,y:1},
		{x:3,y:1},
		{x:4,y:1}, 
	]; 
	var phstep = new PHCurve(pts);
	function shouldEqualT(c1,c2,epsilon) { 
		epsilon = epsilon || 0.001; 
		c1.should.instanceof(Complex);
		c2.should.instanceof(Complex);
		c1.isNear(c2, epsilon).should.equal(true, 
			"expected:" + c2.stringify({nPlaces:3}) +
			" actual:" + c1.stringify({nPlaces:3}));
	};
	it("new PHFeed(ph,[pts]) should create a PHFeed for a PHCurve", function() {
		var phf = new PHFeed(phstep);
		phf.should.have.properties({
			T:1 // time to reach max velocity
		});
	});
	it("V(vin,vout,tau) should interpolate velocity on interval tau:[0,1]", function() {
		var phf = new PHFeed(phstep,{logger:logger});
		phf.V(-100,100,0).should.equal(-100);
		phf.V(-100,100,0.1).should.within(-98.29,-98.28);
		phf.V(-100,100,0.2).should.within(-88.42,-88.41);
		phf.V(-100,100,0.3).should.within(-67.39,-67.38);
		phf.V(-100,100,0.4).should.within(-36.52,-36.51);
		phf.V(-100,100,0.5).should.within(0,0);
		phf.V(-100,100,0.6).should.within(36.51,36.52);
		phf.V(-100,100,0.7).should.within(67.38,67.39);
		phf.V(-100,100,0.8).should.within(88.41,88.42);
		phf.V(-100,100,0.9).should.within(98.28,98.29);
		phf.V(-100,100,1).should.equal(100);
	});
	it("Fvt(vin,vout,tau) should interpolate V integral on interval tau:[0,1]", function() {
		var phline = new PHCurve([
			{x:1,y:1},
			{x:5,y:4},
		]);
		var phf = new PHFeed(phline,{logger:logger});
		var S = phline.s(1);
		S.should.equal(5);
		var vin = 0;
		var vout = 10;
		var T = 2/vout;
		phf.F(vin,vout,0,T).should.equal(0);
		//phf.F(vin,vout,0.5,T).should.within(0.156,0.157);
		//phf.F(vin,vout,0.6,T).should.within(0.274,0.275);
		//phf.F(vin,vout,1,T).should.equal(vout*T/2);
	});
})
