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
		var maxV = options.maxV || 100; // maximum mm/s
		that.logger = options.logger || new Logger(options);
		that.ph = phcurve;
		that.S = that.ph.s(1);
		var tS = that.S*2 / maxV;
		that.tAccel = options.tAccel ? Math.max(options.tAccel, tS/2) : tS/2; 
		that.tDecel = that.tAccel;
		var vS = that.S / that.tAccel;
		if (vS > maxV) {
			that.maxV = maxV;
			that.sAccel = (that.tAccel * maxV)/2;
			that.sDecel = that.sAccel;
			that.sCruise = that.S - that.sAccel - that.sDecel;
		} else {
			that.maxV = vS;
			that.sAccel = (that.tAccel * vS)/2;
			that.sDecel = that.sAccel;
			that.sScruise = 0;
		}
		that.logger.trace("PHFeed() maxV:", that.maxV, 
			" maxV:", maxV, 
			" S:", that.S, 
			" sAccel:", that.sAccel,
			" sDecel:", that.sDecel,
			" sCruise:", that.sCruise,
			" tCruise:", that.tCruise
			);
		that.maxV = maxV;
		that.tCruise = that.sScruise / that.maxV;

		return that;
    };

	/////////////// PRIVATE ////////////////

	///////////////// INSTANCE API ///////////////
	PHFeed.prototype.V = function(tau, vin, vout) { // feed rate (scalar)
		var that = this;
		var args = that.argsF(vin, vout);
		var sum = 0;
		for (var k=0; k <= degree; k++) {
			that.logger.trace("V() k:", k, " tau:", tau,
				" Vk(k):", that.Vk(args.vi,args.vo,k), 
				" coefficient(k,tau):", bn.coefficient(k,tau));
			sum += that.Vk(args.vi,args.vo,k) * bn.coefficient(k,tau);
		}
		return sum;
	};
	PHFeed.prototype.F = function(tau, vin, vout, tTotal) { // distance traveled (scalar)
		var that = this;
		var args = that.argsF(vin, vout, tTotal);
		var sum = 0;
		for (var k=0; k <= degree+1; k++) {
			that.logger.trace("F() k:", k, " tau:", tau,
				" Fk(k):", that.Fk(args.vi,args.vo,k), 
				" coefficient(k,tau):", bn1.coefficient(k,tau));
			sum += that.Fk(args.vi,args.vo,k) * bn1.coefficient(k,tau);
		}
		return sum*args.T;
	};

	///////////// INSTANCE OTHER ////////////////
	PHFeed.prototype.argsF = function(vin, vout, tTotal) {
		var that = this;
		var vi = vin == null ? 0 : Math.min(that.maxV, vin);
		vi.should.not.be.below(0);
		var vo;
		if (vout == null) {
			vo = vi ? vi : that.maxV;
		} else {
			vo = Math.min(that.maxV, vout);
		}
		vo.should.not.be.below(0);
		var dv = Math.abs(vo-vi);
		var tS = dv ? that.S * 2/ dv : that.S / vi;
		var minT = dv ? Math.max(that.tAccel * dv/that.maxV) : tS;
		var T = Math.max(tS, tTotal == null ? minT : Math.max(tTotal, minT));
		that.logger.trace("argsF() T:",T, " S:", that.S, " vi:", vi, " vo:", vo, 
			" tS:", tS, " tAccel:", that.tAccel, " minT:", minT, " dv:", dv, " maxV:", that.maxV);
		T.should.not.be.below(0);
		if (vo != vi && T < that.tAccel * dv / that.maxV) {
			vo = that.maxV * T / that.tAccel + vi; 
		}

		return {vi:vi,vo:vo,T:T};
	}
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
	it("new PHFeed(ph,options) should create a PHFeed for a PHCurve", function() {
		var phline = new PHCurve([
			{x:1,y:1},
			{x:5,y:4},
		]);
		var phfDefault = new PHFeed(phline);
		var S = phline.s(1);
		S.should.equal(5);
		var default_maxV = 100;
		var tAccel = S / default_maxV;
		phfDefault.should.have.properties({
			tAccel:tAccel,	// seconds to reach max velocity
			maxV:default_maxV,	// maximum velocity (mm/s)
		});
		var options = {tAccel:tAccel, maxV: default_maxV};
		new PHFeed(phline,options).should.have.properties(phfDefault);
	});
	it("argsF(vin,vout,tTotal) should return default values", function() {
		var phline = new PHCurve([
			{x:1,y:1},
			{x:5,y:4},
		]);
		var phf1 = new PHFeed(phline,{maxV:1000,tAccel:1});
		phf1.argsF(1,10,2).should.have.properties({vi:1,vo:10,T:2});
		phf1.argsF().should.have.properties({vi:0,vo:1000,T:1});
		phf1.argsF(0).should.have.properties({vi:0,vo:1000,T:1});
		phf1.argsF(0,1000).should.have.properties({vi:0,vo:1000,T:1});
		phf1.argsF(0,9999).should.have.properties({vi:0,vo:1000,T:1});
		phf1.argsF(0,500).should.have.properties({vi:0,vo:500,T:0.5});
		phf1.argsF(0,1000,0.001).should.have.properties({vi:0,vo:1000,T:1});
		phf1.argsF(0,10).should.have.properties({vi:0,vo:10,T:1});
		phf1.argsF(500,500).should.have.properties({vi:500,vo:500,T:0.01});
		phf1.argsF(5000,5000).should.have.properties({vi:1000,vo:1000,T:0.005});
		phf1.argsF(500).should.have.properties({vi:500,vo:500,T:0.01});
		phf1.argsF(5000).should.have.properties({vi:1000,vo:1000,T:0.005});
		phf1.argsF(1000,0).should.have.properties({vi:1000,vo:0,T:1});

		var phf2 = new PHFeed(phline,{maxV:1000,tAccel:2});
		phf2.argsF(1,2,3).should.have.properties({vi:1,vo:2,T:10});
		phf2.argsF().should.have.properties({vi:0,vo:1000,T:2});
		phf2.argsF(0).should.have.properties({vi:0,vo:1000,T:2});
		phf2.argsF(0,1000).should.have.properties({vi:0,vo:1000,T:2});
	});

	it("V(vin,vout,tau) should interpolate takeoff velocity for tau:[0,1]", function() {
		var phf = new PHFeed(phstep,{logger:logger});
		phf.V(0.0, 0, 100).should.equal(0);
		phf.V(0.1, 0, 100).should.within(0.85, 0.86);
		phf.V(0.2, 0, 100).should.within(5.79, 5.80);
		phf.V(0.3, 0, 100).should.within(16.30, 16.31);
		phf.V(0.4, 0, 100).should.within(31.74, 31.75);
		phf.V(0.5, 0, 100).should.within(50, 50);
		phf.V(0.6, 0, 100).should.within(68.25, 68.26);
		phf.V(0.7, 0, 100).should.within(83.69, 83.70);
		phf.V(0.8, 0, 100).should.within(94.20, 94.21);
		phf.V(0.9, 0, 100).should.within(99.14, 99.15);
		phf.V(1.0, 0, 100).should.equal(100);
	});
	it("V(vin,vout,tau) should interpolate stopping velocity for tau:[0,1]", function() {
		var phf = new PHFeed(phstep,{logger:logger});
		phf.V(0.0, 100, 0).should.equal(100);
		phf.V(0.1, 100, 0).should.within(99.14, 99.15);
		phf.V(0.9, 100, 0).should.within(0.85, 0.86);
		phf.V(1.0, 100, 0).should.equal(0);
	});
	it("V(vin,vout,tau) should interpolate constant velocity for tau:[0,1]", function() {
		var phf = new PHFeed(phstep,{logger:logger});
		phf.V(0.0, 100).should.equal(100);
		phf.V(0.5, 100).should.equal(100);
		phf.V(1.0, 100).should.equal(100);
	});
	it("V(vin,vout,tau) should interpolate velocity change for tau:[0,1]", function() {
		var phf = new PHFeed(phstep,{logger:logger});
		phf.V(0.0, 50, 100).should.equal(50);
		phf.V(0.5, 50, 100).should.equal(75);
		phf.V(1.0, 50, 100).should.equal(100);
		phf.V(0.0, 100, 50).should.equal(100);
		phf.V(0.5, 100, 50).should.equal(75);
		phf.V(1.0, 100, 50).should.equal(50);
	});
	it("Fvt(vin,vout,tau) should interpolate distance traveled for tau:[0,1]", function() {
		var phline = new PHCurve([
			{x:1,y:1},
			{x:5,y:4},
		]);
		var phf = new PHFeed(phline,{
			maxV:1000,
			logger:logger
		});
		var S = phline.s(1);
		S.should.equal(5);
		var vin = 0;
		var vout = 10;
		phf.F(0.0,vin,vout).should.equal(0);
		phf.F(0.1,vin,vout).should.within(0.002,0.003);
		phf.F(0.2,vin,vout).should.within(0.031,0.033);
		phf.F(0.3,vin,vout).should.within(0.136,0.137);
		phf.F(0.4,vin,vout).should.within(0.373,0.374);
		phf.F(0.5,vin,vout).should.within(0.781,0.782);
		phf.F(0.6,vin,vout).should.within(1.373,1.374);
		phf.F(0.7,vin,vout).should.within(2.136,2.137);
		phf.F(0.8,vin,vout).should.within(3.031,3.032);
		phf.F(0.9,vin,vout).should.within(4.002,4.003);
		phf.F(1.0,vin,vout).should.equal(S);
	});
})
