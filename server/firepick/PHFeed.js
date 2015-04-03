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
		that.tvMax = options.tvMax || 1;		// time to reach maximum velocity
		that.vIn = options.vIn || 0; 			// input velocity
		var vCruise = options.vCruise || that.vMax;	// cruising velocity	
		that.vOut = options.vOut == null ? that.vIn : options.vOut; 	// output velocity
		that.vIn.should.not.below(0);
		that.vOut.should.not.below(0);
		vCruise.should.not.below(0);

		var sAccel = that.vMax * that.tvMax/2;
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
				var t1 = that.tvMax;
				var v1 = that.vMax;
				var sRatio = that.S / sAccel;
				that.tvMax = Math.sqrt(sRatio * t1*t1*t1/v1);
				that.vMax *= that.tvMax/t1;
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
				var t1 = that.tvMax;
				var v1 = that.vMax;
				var sRatio = that.S / sAccel;
				that.tvMax = Math.sqrt(sRatio * t1*t1*t1/v1);
				that.vMax *= that.tvMax/t1;
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
			var tS = that.S*2 / vCruise;
			that.tAccel = options.tAccel ? Math.max(options.tAccel, tS/2) : tS/2; 
			var vS = that.S / that.tAccel;
			if (vS > vCruise) {
				that.vCruise = vCruise;
				that.sAccel = (that.tAccel * vCruise)/2;
				that.sDecel = that.sAccel;
				that.sCruise = that.S - that.sAccel - that.sDecel;
			} else {
				that.vCruise = vS;
				that.sAccel = (that.tAccel * vS)/2;
				that.sDecel = that.sAccel;
				that.sScruise = 0;
			}
			var vCruiseNew = that.vCruise;
			//that.vCruise = vCruise;
			that.tCruise = that.sScruise / that.vCruise;
		}
		that.tDecel = that.tDecel == null ? that.tAccel : that.tDecel;
		that.tS = that.tAccel + that.tCruise + that.tDecel;

		that.logger.info("PHFeed()",
			" S:", that.S, 
			" vS:", vS,
			" sAccel:", that.sAccel,
			" sDecel:", that.sDecel,
			" sCruise:", that.sCruise,
			" tCruise:", that.tCruise,
			" vIn:", that.vIn,
			" vCruiseNew:", vCruiseNew,
			" vCruiseOld:", vCruise, 
			" vOut:", that.vOut,
			"");

		return that;
    };

	/////////////// PRIVATE ////////////////

	///////////////// INSTANCE API ///////////////
	PHFeed.prototype.V = function(tau, vIn, vOut) { // feed rate (scalar)
		var that = this;
		var args = that.argsF(vIn, vOut);
		var sum = 0;
		for (var k=0; k <= degree; k++) {
			that.logger.trace("V() k:", k, " tau:", tau,
				" Vk(k):", that.Vk(args.vi,args.vo,k), 
				" coefficient(k,tau):", bn.coefficient(k,tau));
			sum += that.Vk(args.vi,args.vo,k) * bn.coefficient(k,tau);
		}
		return sum;
	};
	PHFeed.prototype.F = function(tau, vIn, vOut, tTotal) { // distance traveled (scalar)
		var that = this;
		var args = that.argsF(vIn, vOut, tTotal);
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
	PHFeed.prototype.argsF = function(vIn, vOut, tTotal) {
		var that = this;
		var vi = vIn == null ? 0 : Math.min(that.vCruise, vIn);
		vi.should.not.be.below(0);
		var vo;
		if (vOut == null) {
			vo = vi ? vi : that.vCruise;
		} else {
			vo = Math.min(that.vCruise, vOut);
		}
		vo.should.not.be.below(0);
		var dv = Math.abs(vo-vi);
		var tS = dv ? that.S * 2/ dv : that.S / vi;
		var minT = dv ? Math.max(that.tAccel * dv/that.vCruise) : tS;
		var T = Math.max(tS, tTotal == null ? minT : Math.max(tTotal, minT));
		that.logger.trace("argsF() T:",T, " S:", that.S, " vi:", vi, " vo:", vo, 
			" tS:", tS, " tAccel:", that.tAccel, " minT:", minT, " dv:", dv, " vCruise:", that.vCruise);
		T.should.not.be.below(0);
		if (vo != vi && T < that.tAccel * dv / that.vCruise) {
			vo = that.vCruise * T / that.tAccel + vi; 
		}

		return {vi:vi,vo:vo,T:T};
	}
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
	PHFeed.prototype.Fvt = function(vIn, vOut, tau) {
		var that = this;
		var sum = 0;
		var n1 = degree+1;
		for (var k=0; k <= n1; k++) {
			sum += that.Fk(vIn,vOut,k) * bn1.coefficient(k,tau);
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
	it("new PHFeed(ph,options) should create a PHFeed for a PHCurve", function() {
		var phfDefault = new PHFeed(phline);
		var S = phline.s(1);
		S.should.equal(5);
		var default_vCruise = 100;
		var vMax = default_vCruise;
		phfDefault.vCruise.should.equal(default_vCruise);
		phfDefault.should.have.properties({
			vMax: vMax,
			vCruise:default_vCruise,	// maximum velocity (mm/s)
		});
		var options = {vMax:vMax, vCruise: default_vCruise};
		new PHFeed(phline,options).should.have.properties(phfDefault);
	});
	it("argsF(vIn,vOut,tTotal) should return default values", function() {
		//var phf1 = new PHFeed(phline,{vCruise:1000,tAccel:1});
		//phf1.argsF(1,10,2).should.have.properties({vi:1,vo:10,T:2});
		//phf1.argsF().should.have.properties({vi:0,vo:1000,T:1});
		//phf1.argsF(0).should.have.properties({vi:0,vo:1000,T:1});
		//phf1.argsF(0,1000).should.have.properties({vi:0,vo:1000,T:1});
		//phf1.argsF(0,9999).should.have.properties({vi:0,vo:1000,T:1});
		//phf1.argsF(0,500).should.have.properties({vi:0,vo:500,T:0.5});
		//phf1.argsF(0,1000,0.001).should.have.properties({vi:0,vo:1000,T:1});
		//phf1.argsF(0,10).should.have.properties({vi:0,vo:10,T:1});
		//phf1.argsF(500,500).should.have.properties({vi:500,vo:500,T:0.01});
		//phf1.argsF(5000,5000).should.have.properties({vi:1000,vo:1000,T:0.005});
		//phf1.argsF(500).should.have.properties({vi:500,vo:500,T:0.01});
		//phf1.argsF(5000).should.have.properties({vi:1000,vo:1000,T:0.005});
		//phf1.argsF(1000,0).should.have.properties({vi:1000,vo:0,T:1});

		//var phf2 = new PHFeed(phline,{vCruise:1000,tAccel:2});
		//
		//phf2.argsF(1,2,3).should.have.properties({vi:1,vo:2,T:10});
		//phf2.argsF().should.have.properties({vi:0,vo:1000,T:2});
		//phf2.argsF(0).should.have.properties({vi:0,vo:1000,T:2});
		//phf2.argsF(0,1000).should.have.properties({vi:0,vo:1000,T:2});
	});
	it("PHFeed(ph,{vIn:v,vCruise:v}) should maintain constant feedrate", function() {
		var phf = new PHFeed(phline,{vIn:5,vCruise:5});
		phf.vCruise.should.equal(5);
		phf.should.have.properties({
			vMax:100,	// OPTION: maximum velocity (default: 100)
			tvMax:1,	// OPTION: time to reach vMax (default: 1)
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
		var phf = new PHFeed(phline,{vOut:vMax, vMax:vMax,tvMax:0.01});
		phf.should.have.properties({
			vMax:vMax,		// OPTION: maximum velocity (default: 100)
			tvMax:tvMax,	// OPTION: time to reach vMax (default: 1)
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
	it("TESTTEST PHFeed(ph,{vIn:vMax,vOut:0}) should decelerate maximally", function() {
		var vMax = 200;		// maximum velocity mm/s
		var tvMax = 0.01; 	// seconds from rest to vMax
		var S = phline.s(1);
		var phf = new PHFeed(phline,{vIn:vMax,vOut:0, vMax:vMax,tvMax:0.01});
		phf.vOut.should.equal(0);
		phf.sCruise.should.equal(4);
		phf.should.have.properties({
			vMax:vMax,		// OPTION: maximum velocity (default: 100)
			tvMax:tvMax,	// OPTION: time to reach vMax (default: 1)
			vIn:vMax,		// OPTION: input velocity  (default: 0)
			vCruise:vMax,	// OPTION: cruise velocity (default: vMax)
			vOut:0,			// OPTION: output velocity (default: vIn)
			tAccel:0,		// OUTPUT: initial acceleration time
			sAccel:0,		// OUTPUT: initial acceleration distance
			tCruise:2*(S-1)/vMax,	// OUTPUT: cruise time
			sCruise:4,		// OUTPUT: cruise distance
			tDecel:tvMax,		// OUTPUT: ending deceleration time
			sDecel:1,		// OUTPUT: ending deceleration distance
			tS:0.05,		// OUTPUT: total traversal time
		});
	});

	it("V(vIn,vOut,tau) should interpolate takeoff velocity for tau:[0,1]", function() {
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
	it("V(vIn,vOut,tau) should interpolate stopping velocity for tau:[0,1]", function() {
		var phf = new PHFeed(phstep,{logger:logger});
		phf.V(0.0, 100, 0).should.equal(100);
		phf.V(0.1, 100, 0).should.within(99.14, 99.15);
		phf.V(0.9, 100, 0).should.within(0.85, 0.86);
		phf.V(1.0, 100, 0).should.equal(0);
	});
	it("V(vIn,vOut,tau) should interpolate constant velocity for tau:[0,1]", function() {
		var phf = new PHFeed(phstep,{logger:logger});
		phf.V(0.0, 100).should.equal(100);
		phf.V(0.5, 100).should.equal(100);
		phf.V(1.0, 100).should.equal(100);
	});
	it("V(vIn,vOut,tau) should interpolate velocity change for tau:[0,1]", function() {
		var phf = new PHFeed(phstep,{logger:logger});
		phf.V(0.0, 50, 100).should.equal(50);
		phf.V(0.5, 50, 100).should.equal(75);
		phf.V(1.0, 50, 100).should.equal(100);
		phf.V(0.0, 100, 50).should.equal(100);
		phf.V(0.5, 100, 50).should.equal(75);
		phf.V(1.0, 100, 50).should.equal(50);
	});
	it("Fvt(vIn,vOut,tau) should interpolate distance traveled for tau:[0,1]", function() {
		var phf = new PHFeed(phline,{
			maxV:1000,
			logger:logger
		});
		var S = phline.s(1);
		S.should.equal(5);
		var vIn = 0;
		var vOut = 10;
		phf.F(0.0,vIn,vOut).should.equal(0);
		phf.F(0.1,vIn,vOut).should.within(0.002,0.003);
		phf.F(0.2,vIn,vOut).should.within(0.031,0.033);
		phf.F(0.3,vIn,vOut).should.within(0.136,0.137);
		phf.F(0.4,vIn,vOut).should.within(0.373,0.374);
		phf.F(0.5,vIn,vOut).should.within(0.781,0.782);
		phf.F(0.6,vIn,vOut).should.within(1.373,1.374);
		phf.F(0.7,vIn,vOut).should.within(2.136,2.137);
		phf.F(0.8,vIn,vOut).should.within(3.031,3.032);
		phf.F(0.9,vIn,vOut).should.within(4.002,4.003);
		phf.F(1.0,vIn,vOut).should.equal(S);
	});
})
