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
		that.ph = phcurve;
		that.S = that.ph.s(1);

		options = options || {};
		that.logger = options.logger || new Logger(options);
		that.vMax = options.vMax || 100; 		// maximum velocity
		that.tvMax = options.tvMax || 0.01;		// time to reach maximum velocity
		that.vIn = options.vIn || 0; 			// input velocity
		var vCruise = options.vCruise || that.vMax;	// cruising velocity	
		that.vOut = options.vOut == null ? that.vIn : options.vOut; 	// output velocity
		that.vIn.should.not.below(0);
		that.vOut.should.not.below(0);
		vCruise.should.not.below(0);

		var sAccel = that.vMax * that.tvMax/2;
		var sRatio = 1;
		if (that.vIn === vCruise && vCruise === that.vOut) {
			that.logger.info("CASE1 vIn:", that.vIn, " vCruise:", vCruise, " vOut:", that.vOut);
			that.tAccel = 0;
			that.vCruise = vCruise;
			that.sAccel = that.tAccel * Math.abs(vCruise-that.vIn)/2;
			that.sDecel = that.tAccel * Math.abs(vCruise-that.vOut)/2;
			that.sCruise = that.S - that.sAccel - that.sDecel;
			that.tCruise = that.sCruise / that.vCruise;
		} else if (that.vIn !== vCruise && vCruise === that.vOut) {
			if (sAccel > that.S) {
				sRatio = that.S / sAccel;
				that.vMax *= sRatio;
				sAccel = that.S;
			}
			that.sAccel = sAccel;
			that.vCruise = that.vMax;
			that.tAccel = that.tvMax;
			that.sCruise = that.S - that.sAccel;
			that.tCruise = 2 * that.sCruise / that.vCruise;
			that.sDecel = 0;
			that.tDecel = 0;
			that.logger.info("CASE2 vIn:", that.vIn, " vCruise:", vCruise, " vOut:", that.vOut
				, " tvMax:", that.tvMax
				, " vMax:", that.vMax
				, " sAccel:", sAccel
			);
		} else if (that.vIn === vCruise && vCruise !== that.vOut) {
			if (sAccel > that.S) {
				sRatio = that.S / sAccel;
				that.vMax *= sRatio;
				sAccel = that.S;
			}
			that.sDecel = sAccel;
			that.vCruise = that.vMax;
			that.tDecel = that.tvMax;
			that.sCruise = that.S - that.sDecel;
			that.tCruise = 2 * that.sCruise / that.vCruise;
			that.sAccel = 0;
			that.tAccel = 0;
			that.logger.info("CASE3 vIn:", that.vIn, " vCruise:", vCruise, " vOut:", that.vOut);
		} else if (that.vIn !== vCruise && vCruise !== that.vOut) {
			that.logger.info("CASE4 vIn:", that.vIn, " vCruise:", vCruise, " vOut:", that.vOut);
			if (sAccel > that.S/2) {
				sRatio = (that.S /2) / sAccel;
				that.vMax *= sRatio;
				sAccel = that.S/2;
			}
			that.vCruise = that.vMax;
			that.sAccel = sAccel;
			that.tAccel = that.tvMax;
			that.sDecel = sAccel;
			that.tDecel = that.tvMax;
			that.sCruise = that.S - 2*sAccel;
			that.tCruise = that.sCruise / that.vCruise;
		}
		that.tDecel = that.tDecel == null ? that.tAccel : that.tDecel;
		that.tS = that.tAccel + that.tCruise + that.tDecel;

		that.logger.info("PHFeed()",
			" S:", that.S, 
			" sRatio:", sRatio,
			" vMax:", that.vMax,
			" tvMax:", ""+that.tvMax,
			" sAccel:", that.sAccel,
			" sDecel:", that.sDecel,
			" sCruise:", that.sCruise,
			" tCruise:", that.tCruise,
			" vIn:", that.vIn,
			" vCruise:", that.vCruise, 
			" vOut:", that.vOut,
			"");

		return that;
    };

	/////////////// PRIVATE ////////////////

	///////////////// INSTANCE API ///////////////
	PHFeed.prototype.Vtvv = function(tau, vIn, vOut) { // feed rate (scalar)
		var that = this;
		vIn.should.not.be.below(0);
		vOut.should.not.be.below(0);
		var sum = 0;
		for (var k=0; k <= degree; k++) {
			that.logger.trace("Vtvv() k:", k, " tau:", tau,
				" Vk(k):", that.Vk(vIn,vOut,k), 
				" coefficient(k,tau):", bn.coefficient(k,tau));
			sum += that.Vk(vIn,vOut,k) * bn.coefficient(k,tau);
		}
		return sum;
	};
	PHFeed.prototype.FtvvT = function(tau, vIn, vOut, tTotal) { // distance traveled (scalar)
		var that = this;
		var sum = 0;
		for (var k=0; k <= degree+1; k++) {
			that.logger.trace("FtvvT() k:", k, " tau:", tau,
				" Fk(k):", that.Fk(vIn,vOut,k), 
				" coefficient(k,tau):", bn1.coefficient(k,tau));
			sum += that.Fk(vIn,vOut,k) * bn1.coefficient(k,tau);
		}
		return sum*tTotal;
	};

	///////////// INSTANCE OTHER ////////////////
	PHFeed.prototype.Vk = function(vIn,vOut,k) {
		var that = this;
		switch (k) {
			case 0: return vIn;
			case 1: return vIn;
			case 2: return vIn;
			case 3: return vOut;
			case 4: return vOut;
			case 5: return vOut;
			default: should.fail("k:"+k);
		}
	};
	PHFeed.prototype.Fk = function(vIn, vOut, k) {
		var that = this;
		var sum = 0;
		for (var j=0; j < k; j++) {
			sum += that.Vk(vIn,vOut,j);
		}
		return sum/(1+degree);
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
	var phstep = new PHCurve([
		{x:0,y:0},
		{x:1,y:0},
		{x:2,y:1},
		{x:3,y:1},
		{x:4,y:1}, 
	]);
	var phline = new PHCurve([
		{x:1,y:1},
		{x:5,y:4},
	]);
	function shouldEqualT(c1,c2,epsilon) { 
		epsilon = epsilon || 0.001; 
		c1.should.instanceof(Complex);
		c2.should.instanceof(Complex);
		c1.isNear(c2, epsilon).should.equal(true, 
			"expected:" + c2.stringify({nPlaces:3}) +
			" actual:" + c1.stringify({nPlaces:3}));
	};
	it("PHFeed(ph,{vIn:v,vCruise:v}) should maintain constant feedrate", function() {
		var phf = new PHFeed(phline,{vIn:5,vCruise:5});
		phf.should.have.properties({
			vMax:100,	// OPTION: maximum velocity (default: 100)
			tvMax:0.01,	// OPTION: time to reach vMax (default: 0.01)
			vIn:5,		// OPTION: input velocity  (default: 0)
			vCruise:5,	// OPTION: cruise velocity (default: vMax)
			vOut:5,		// OPTION: output velocity (default: vIn)
			tAccel:0,	// OUTPUT: initial acceleration time
			sAccel:0,	// OUTPUT: initial acceleration distance
			tCruise:1,	// OUTPUT: cruise time
			sCruise:5,	// OUTPUT: cruise distance
			tDecel:0,	// OUTPUT: ending deceleration time
			sDecel:0,	// OUTPUT: ending deceleration distance
			tS:1,		// OUTPUT: total traversal time
		});
	});
	it("PHFeed(ph,{vOut:vMax}) should accelerate maximally", function() {
		var vMax = 200;		// maximum velocity mm/s
		var tvMax = 0.01; 	// seconds from rest to vMax
		var S = phline.s(1);
		var phf = new PHFeed(phline,{vOut:vMax, vMax:vMax,tvMax:tvMax});
		phf.should.have.properties({
			vMax:vMax,		// OPTION: maximum velocity (default: 100)
			tvMax:tvMax,	// OPTION: time to reach vMax (default: 0.01)
			vIn:0,			// OPTION: input velocity  (default: 0)
			vCruise:vMax,	// OPTION: cruise velocity (default: vMax)
			vOut:vMax,		// OPTION: output velocity (default: vIn)
			tAccel:tvMax,	// OUTPUT: initial acceleration time
			sAccel:1,		// OUTPUT: initial acceleration distance
			tCruise:2*(S-1)/vMax,	// OUTPUT: cruise time
			sCruise:4,		// OUTPUT: cruise distance
			tDecel:0,		// OUTPUT: ending deceleration time
			sDecel:0,		// OUTPUT: ending deceleration distance
			tS:0.05,		// OUTPUT: total traversal time
		});
	});
	it("PHFeed(ph,{vMax:v,tvMax:t}) should from rest to rest ASAP", function() {
		var vMax = 200;		// maximum velocity mm/s
		var tvMax = 0.01; 	// seconds from rest to vMax
		var S = phline.s(1);
		var sAccel = 1;
		var sCruise = S - 2*sAccel;
		var tCruise = sCruise/vMax;
		var tS = tvMax + tCruise + tvMax;
		var phf = new PHFeed(phline,{vMax:vMax,tvMax:tvMax});
		phf.should.have.properties({
			vMax:vMax,		// OPTION: maximum velocity (default: 100)
			tvMax:tvMax,	// OPTION: time to reach vMax (default: 0.01)
			vIn:0,			// OPTION: input velocity  (default: 0)
			vCruise:vMax,	// OPTION: cruise velocity (default: vMax)
			vOut:0,			// OPTION: output velocity (default: vIn)
			tAccel:tvMax,	// OUTPUT: initial acceleration time
			sAccel:sAccel,	// OUTPUT: initial acceleration distance
			tCruise:tCruise,// OUTPUT: cruise time
			sCruise:sCruise,// OUTPUT: cruise distance
			tDecel:tvMax,	// OUTPUT: ending deceleration time
			sDecel:sAccel,	// OUTPUT: ending deceleration distance
			tS:tS			// OUTPUT: total traversal time
		});
	});
	it("PHFeed(ph,{vMax:v,tvMax:t}) should clip vMax", function() {
		var vMax = (0.025/0.026)*200;		// maximum velocity mm/s
		var tvMax = 0.026; 	// seconds from rest to vMax
		var S = phline.s(1);
		var sAccel = 2.5;
		var sCruise = S - 2*sAccel;
		var tCruise = sCruise/vMax;
		var tS = tvMax + tCruise + tvMax;
		var phf = new PHFeed(phline,{vMax:200,tvMax:tvMax});
		var epsilon = 0.0000001;
		phf.vMax.should.within(vMax-epsilon,vMax+epsilon);
		phf.vCruise.should.within(vMax-epsilon,vMax+epsilon);
		phf.should.have.properties({
			tvMax:tvMax,	// OPTION: time to reach vMax (default: 0.01)
			vIn:0,			// OPTION: input velocity  (default: 0)
			vOut:0,			// OPTION: output velocity (default: vIn)
			tAccel:tvMax,	// OUTPUT: initial acceleration time
			sAccel:sAccel,	// OUTPUT: initial acceleration distance
			tCruise:tCruise,// OUTPUT: cruise time
			sCruise:sCruise,// OUTPUT: cruise distance
			tDecel:tvMax,	// OUTPUT: ending deceleration time
			sDecel:sAccel,	// OUTPUT: ending deceleration distance
			tS:tS			// OUTPUT: total traversal time
		});
	});
	it("PHFeed(ph,{vIn:vMax,vOut:0}) should decelerate maximally", function() {
		var vMax = 200;		// maximum velocity mm/s
		var tvMax = 0.01; 	// seconds from rest to vMax
		var S = phline.s(1);
		var tCruise = 2 * (S-1)/vMax;
		var phf = new PHFeed(phline,{vIn:vMax,vOut:0, vMax:vMax,tvMax:0.01});
		phf.sCruise.should.equal(4);
		phf.should.have.properties({
			vMax:vMax,			// OPTION: maximum velocity (default: 100)
			tvMax:tvMax,		// OPTION: time to reach vMax (default: 0.01)
			vIn:vMax,			// OPTION: input velocity  (default: 0)
			vCruise:vMax,		// OPTION: cruise velocity (default: vMax)
			vOut:0,				// OPTION: output velocity (default: vIn)
			tAccel:0,			// OUTPUT: initial acceleration time
			sAccel:0,			// OUTPUT: initial acceleration distance
			tCruise:tCruise,	// OUTPUT: cruise time
			sCruise:4,			// OUTPUT: cruise distance
			tDecel:tvMax,		// OUTPUT: ending deceleration time
			sDecel:1,			// OUTPUT: ending deceleration distance
			tS:0.05,			// OUTPUT: total traversal time
		});
	});

	it("Vtvv(vIn,vOut,tau) should interpolate takeoff velocity for tau:[0,1]", function() {
		var phf = new PHFeed(phstep,{logger:logger});
		phf.Vtvv(0.0, 0, 100).should.equal(0);
		phf.Vtvv(0.1, 0, 100).should.within(0.85, 0.86);
		phf.Vtvv(0.2, 0, 100).should.within(5.79, 5.80);
		phf.Vtvv(0.3, 0, 100).should.within(16.30, 16.31);
		phf.Vtvv(0.4, 0, 100).should.within(31.74, 31.75);
		phf.Vtvv(0.5, 0, 100).should.within(50, 50);
		phf.Vtvv(0.6, 0, 100).should.within(68.25, 68.26);
		phf.Vtvv(0.7, 0, 100).should.within(83.69, 83.70);
		phf.Vtvv(0.8, 0, 100).should.within(94.20, 94.21);
		phf.Vtvv(0.9, 0, 100).should.within(99.14, 99.15);
		phf.Vtvv(1.0, 0, 100).should.equal(100);
	});
	it("Vtvv(vIn,vOut,tau) should interpolate stopping velocity for tau:[0,1]", function() {
		var phf = new PHFeed(phstep,{logger:logger});
		phf.Vtvv(0.0, 100, 0).should.equal(100);
		phf.Vtvv(0.1, 100, 0).should.within(99.14, 99.15);
		phf.Vtvv(0.9, 100, 0).should.within(0.85, 0.86);
		phf.Vtvv(1.0, 100, 0).should.equal(0);
	});
	it("Vtvv(vIn,vOut,tau) should interpolate constant velocity for tau:[0,1]", function() {
		var phf = new PHFeed(phstep,{logger:logger});
		phf.Vtvv(0.0, 100, 100).should.equal(100);
		phf.Vtvv(0.5, 100, 100).should.equal(100);
		phf.Vtvv(1.0, 100, 100).should.equal(100);
	});
	it("Vtvv(vIn,vOut,tau) should interpolate velocity change for tau:[0,1]", function() {
		var phf = new PHFeed(phstep,{logger:logger});
		phf.Vtvv(0.0, 50, 100).should.equal(50);
		phf.Vtvv(0.5, 50, 100).should.equal(75);
		phf.Vtvv(1.0, 50, 100).should.equal(100);
		phf.Vtvv(0.0, 100, 50).should.equal(100);
		phf.Vtvv(0.5, 100, 50).should.equal(75);
		phf.Vtvv(1.0, 100, 50).should.equal(50);
	});
	it("FtvvT(tau,vIn,vOut,T) should interpolate distance traveled for tau:[0,1]", function() {
		var phf = new PHFeed(phline,{
			logger:logger
		});
		var S = phline.s(1);
		S.should.equal(5);
		var vIn = 0;
		var vOut = 10;
		var T = 1;
		phf.FtvvT(0.0,vIn,vOut,T).should.equal(0);
		phf.FtvvT(0.1,vIn,vOut,T).should.within(0.002,0.003);
		phf.FtvvT(0.2,vIn,vOut,T).should.within(0.031,0.033);
		phf.FtvvT(0.3,vIn,vOut,T).should.within(0.136,0.137);
		phf.FtvvT(0.4,vIn,vOut,T).should.within(0.373,0.374);
		phf.FtvvT(0.5,vIn,vOut,T).should.within(0.781,0.782);
		phf.FtvvT(0.6,vIn,vOut,T).should.within(1.373,1.374);
		phf.FtvvT(0.7,vIn,vOut,T).should.within(2.136,2.137);
		phf.FtvvT(0.8,vIn,vOut,T).should.within(3.031,3.032);
		phf.FtvvT(0.9,vIn,vOut,T).should.within(4.002,4.003);
		phf.FtvvT(1.0,vIn,vOut,T).should.equal(S);
	});
})
