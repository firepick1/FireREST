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
		that.epsilon = options.epsilon || 0.0000001;
		that.iterations = options.iterations || 10;

		var sAccel = that.vMax * that.tvMax/2;
		var sRatio = 1;
		if (that.vIn === vCruise && vCruise === that.vOut) {
			that.logger.debug("CASE1 vIn:", that.vIn, " vCruise:", vCruise, " vOut:", that.vOut);
			that.tAccel = 0;
			that.vCruise = vCruise;
			that.sAccel = that.tAccel * Math.abs(vCruise-that.vIn)/2;
			that.sDecel = that.tAccel * Math.abs(vCruise-that.vOut)/2;
			that.sCruise = that.S - that.sAccel - that.sDecel;
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
			that.sDecel = 0;
			that.tDecel = 0;
			that.logger.debug("CASE2 vIn:", that.vIn, " vCruise:", vCruise, " vOut:", that.vOut
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
			that.sAccel = 0;
			that.tAccel = 0;
			that.logger.debug("CASE3 vIn:", that.vIn, " vCruise:", vCruise, " vOut:", that.vOut);
		} else if (that.vIn !== vCruise && vCruise !== that.vOut) {
			that.logger.debug("CASE4 vIn:", that.vIn, " vCruise:", vCruise, " vOut:", that.vOut);
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
		}
		that.tCruise = that.sCruise / that.vCruise;
		that.tDecel = that.tDecel == null ? that.tAccel : that.tDecel;
		that.tS = that.tAccel + that.tCruise + that.tDecel;
		that.tauAccel = that.tAccel/that.tS;
		that.tauDecel = 1 - that.tDecel/that.tS;

		that.logger.debug("PHFeed()",
			" S:", that.S, 
			" sRatio:", sRatio,
			" tS:", that.tS,
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
	PHFeed.prototype.argsF = function(tau) {
		var that = this;
		tau.should.be.within(0,1);
		var vIn, vCruise, vOut, T, t, s, phase;
		if (tau <= that.tAccel/that.tS) { 
			vIn = that.vIn;
			vOut = that.vCruise;
			T = that.tAccel; 
			t = tau ? (tau*that.tS) / that.tAccel : 0;
			s = 0;
			phase = "accel";
		} else if (tau <= (that.tAccel+that.tCruise)/that.tS) {
			vIn = that.vCruise;
			vOut = that.vCruise;
			T = that.tCruise;
			t = (tau*that.tS - that.tAccel) / that.tCruise;
			s = that.sAccel;
			phase = "cruise";
		} else {
			vIn = that.vCruise;
			vOut = that.vOut;
			T = that.tDecel;
			t = tau === 1 ? 1 : (tau*that.tS-that.tAccel-that.tCruise)/that.tDecel;
			s = that.sAccel + that.sCruise;
			phase = "decel";
		}
		var result = {vIn:vIn,vOut:vOut,T:T,t:t,s:s,phase:phase};
		that.logger.debug("argsF():",result);
		return result;
	};

	///////////////// INSTANCE API ///////////////
	PHFeed.prototype.interpolate = function(options) {
		var that = this;
		options = options || {};
		var epsilon = options.epsilon || 0.001;
		var n = options.n || 5;
		n.should.be.above(1);
		var result = [];
		var Eprev = 0;
		var sprev = 0;
		var dt = that.tS/n;
		for (var i=1; i<=n; i++) {
			var tau = i/n;
			var E = that.Ekt(Eprev, tau);
			var s = that.ph.s(E);
			var dsdt = (s-sprev)/dt;
			var row = {
				t:tau*that.tS,
				r:that.ph.r(E),
				dsdt:dsdt,
				V:that.V(tau),
				s:s,
			};
			that.logger.info("row:", row);
			result.push(row);
			Eprev = E;
			sprev = s;
		}
		return result;
	};
	PHFeed.prototype.Ekt = function(Ekprevt, tau) {
		var that = this;
		var dE;
		var Ekr = Ekprevt;
		var ph = that.ph;
		var F = that.F(tau);
		var places=6;

		for (var r=0; r<that.iterations; r++) {
			var s = ph.s(Ekr);
			var sigma = ph.sigma(Ekr);
			var fs = F - s;
			dE = (F - s)/sigma;
			Ekr = Math.min(1,Math.max(0,Ekr + dE));
			that.logger.info("Ekt() r:", r, " tau:", tau, 
				" F:", ""+Util.roundN(F,places), 
				" fs:", fs,
				" dE:", ""+dE,
				" Ekr:", ""+Ekr,
				" s:", ""+Util.roundN(s,places),
				" sigma:", sigma);
			if (Math.abs(dE) < that.epsilon) {
				break;
			}
		}

		return Ekr;
	};
	PHFeed.prototype.V = function(tau) {
		var that = this;
		var args = that.argsF(tau);
		return PHFeed.Vtvv(args.t, args.vIn, args.vOut);
	};
	PHFeed.prototype.F = function(tau) {
		var that = this;
		var args = that.argsF(tau);
		return PHFeed.FtvvT(args.t, args.vIn, args.vOut, args.T) + args.s;
	};

	///////////////// CLASS //////////
	PHFeed.Vtvv = function(tau, vIn, vOut) { // feed rate (scalar)
		vIn.should.not.be.below(0);
		vOut.should.not.be.below(0);
		var sum = 0;
		for (var k=0; k <= degree; k++) {
			sum += PHFeed.Vk(vIn,vOut,k) * Bernstein.coefficient(5, k,tau);
		}
		return sum;
	};
	PHFeed.FtvvT = function(tau, vIn, vOut, tTotal) { // distance traveled (scalar)
		tau.should.be.within(0,1);
		var sum = 0;
		for (var k=0; k <= degree+1; k++) {
			sum += PHFeed.Fk(vIn,vOut,k) * Bernstein.coefficient(6, k,tau);
		}
		return sum*tTotal;
	};
	PHFeed.Vk = function(vIn,vOut,k) {
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
	PHFeed.Fk = function(vIn, vOut, k) {
		var sum = 0;
		for (var j=0; j < k; j++) {
			sum += PHFeed.Vk(vIn,vOut,j);
		}
		return sum/(1+degree);
	};


    Logger.logger.info("loaded firepick.PHFeed");
    module.exports = firepick.PHFeed = PHFeed;
})(firepick || (firepick = {}));


(typeof describe === 'function') && describe("firepick.PHFeed", function() {
	var logger = new Logger({
		nPlaces:1,
		logLevel:"debug"
	});
	var epsilon = 0.000001;
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
		var tCruise = (S-1)/vMax;
		phf.should.have.properties({
			vMax:vMax,		// OPTION: maximum velocity (default: 100)
			tvMax:tvMax,	// OPTION: time to reach vMax (default: 0.01)
			vIn:0,			// OPTION: input velocity  (default: 0)
			vCruise:vMax,	// OPTION: cruise velocity (default: vMax)
			vOut:vMax,		// OPTION: output velocity (default: vIn)
			tAccel:tvMax,	// OUTPUT: initial acceleration time
			sAccel:1,		// OUTPUT: initial acceleration distance
			tCruise:tCruise,// OUTPUT: cruise time
			sCruise:4,		// OUTPUT: cruise distance
			tDecel:0,		// OUTPUT: ending deceleration time
			sDecel:0,		// OUTPUT: ending deceleration distance
			tS:0.03,		// OUTPUT: total traversal time
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
		phf.tauAccel.should.be.within(0.285,0.286);
		phf.tauDecel.should.be.within(0.714,0.715);
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
		phf.vMax.should.within(vMax-epsilon,vMax+epsilon);
		phf.vCruise.should.within(vMax-epsilon,vMax+epsilon);
		phf.tauAccel.should.equal(0.5);
		phf.tauDecel.should.equal(0.5);
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
			tS:tS,			// OUTPUT: total traversal time
		});
	});
	it("PHFeed(ph,{vIn:vMax,vOut:0}) should decelerate maximally", function() {
		var vMax = 200;		// maximum velocity mm/s
		var tvMax = 0.01; 	// seconds from rest to vMax
		var S = phline.s(1);
		var sCruise = S - 1;
		var tCruise = sCruise/vMax;
		var phf = new PHFeed(phline,{vIn:vMax,vOut:0, vMax:vMax,tvMax:0.01});
		var tS = phf.tDecel + tCruise;
		phf.sCruise.should.equal(4);
		phf.tauAccel.should.equal(0);
		phf.tauDecel.should.within(0.666,0.667);
		phf.should.have.properties({
			vMax:vMax,		// OPTION: maximum velocity (default: 100)
			tvMax:tvMax,	// OPTION: time to reach vMax (default: 0.01)
			vIn:vMax,		// OPTION: input velocity  (default: 0)
			vCruise:vMax,	// OPTION: cruise velocity (default: vMax)
			vOut:0,			// OPTION: output velocity (default: vIn)
			tAccel:0,		// OUTPUT: initial acceleration time
			sAccel:0,		// OUTPUT: initial acceleration distance
			tCruise:tCruise,// OUTPUT: cruise time
			sCruise:4,		// OUTPUT: cruise distance
			tDecel:tvMax,	// OUTPUT: ending deceleration time
			sDecel:1,		// OUTPUT: ending deceleration distance
			tS:tS,			// OUTPUT: total traversal time
		});
	});
	it("Vtvv(vIn,vOut,tau) should interpolate takeoff velocity for tau:[0,1]", function() {
		PHFeed.Vtvv(0.0, 0, 100).should.equal(0);
		PHFeed.Vtvv(0.1, 0, 100).should.within(0.85, 0.86);
		PHFeed.Vtvv(0.2, 0, 100).should.within(5.79, 5.80);
		PHFeed.Vtvv(0.3, 0, 100).should.within(16.30, 16.31);
		PHFeed.Vtvv(0.4, 0, 100).should.within(31.74, 31.75);
		PHFeed.Vtvv(0.5, 0, 100).should.within(50, 50);
		PHFeed.Vtvv(0.6, 0, 100).should.within(68.25, 68.26);
		PHFeed.Vtvv(0.7, 0, 100).should.within(83.69, 83.70);
		PHFeed.Vtvv(0.8, 0, 100).should.within(94.20, 94.21);
		PHFeed.Vtvv(0.9, 0, 100).should.within(99.14, 99.15);
		PHFeed.Vtvv(1.0, 0, 100).should.equal(100);
	});
	it("Vtvv(vIn,vOut,tau) should interpolate stopping velocity for tau:[0,1]", function() {
		PHFeed.Vtvv(0.0, 100, 0).should.equal(100);
		PHFeed.Vtvv(0.1, 100, 0).should.within(99.14, 99.15);
		PHFeed.Vtvv(0.9, 100, 0).should.within(0.85, 0.86);
		PHFeed.Vtvv(1.0, 100, 0).should.equal(0);
	});
	it("Vtvv(vIn,vOut,tau) should interpolate constant velocity for tau:[0,1]", function() {
		PHFeed.Vtvv(0.0, 100, 100).should.equal(100);
		PHFeed.Vtvv(0.5, 100, 100).should.equal(100);
		PHFeed.Vtvv(1.0, 100, 100).should.equal(100);
	});
	it("Vtvv(vIn,vOut,tau) should interpolate velocity change for tau:[0,1]", function() {
		PHFeed.Vtvv(0.0, 50, 100).should.equal(50);
		PHFeed.Vtvv(0.5, 50, 100).should.equal(75);
		PHFeed.Vtvv(1.0, 50, 100).should.equal(100);
		PHFeed.Vtvv(0.0, 100, 50).should.equal(100);
		PHFeed.Vtvv(0.5, 100, 50).should.equal(75);
		PHFeed.Vtvv(1.0, 100, 50).should.equal(50);
	});
	it("FtvvT(tau,vIn,vOut,T) should interpolate distance traveled for tau:[0,1]", function() {
		var vIn = 0;
		var vOut = 10;
		var T = 1;
		PHFeed.FtvvT(0.0,vIn,vOut,T).should.equal(0);
		PHFeed.FtvvT(0.1,vIn,vOut,T).should.within(0.002,0.003);
		PHFeed.FtvvT(0.2,vIn,vOut,T).should.within(0.031,0.033);
		PHFeed.FtvvT(0.3,vIn,vOut,T).should.within(0.136,0.137);
		PHFeed.FtvvT(0.4,vIn,vOut,T).should.within(0.373,0.374);
		PHFeed.FtvvT(0.5,vIn,vOut,T).should.within(0.781,0.782);
		PHFeed.FtvvT(0.6,vIn,vOut,T).should.within(1.373,1.374);
		PHFeed.FtvvT(0.7,vIn,vOut,T).should.within(2.136,2.137);
		PHFeed.FtvvT(0.8,vIn,vOut,T).should.within(3.031,3.032);
		PHFeed.FtvvT(0.9,vIn,vOut,T).should.within(4.002,4.003);
		PHFeed.FtvvT(1.0,vIn,vOut,T).should.equal(T*vOut/2);
	});
	it("F(tau) should return arc length traversed for tau:[0,1]", function() {
		var phfVV0 = new PHFeed(phline, {vIn:100, vCruise:100, vOut:0, vMax:100, tvMax:0.01});
		phfVV0.F(0).should.equal(0);
		phfVV0.F(0.1).should.within(0.55-epsilon,0.55+epsilon);
		phfVV0.F(0.4).should.within(2.20-epsilon,2.20+epsilon);
		phfVV0.F(0.5).should.within(2.75-epsilon,2.75+epsilon);
		phfVV0.F(0.6).should.within(3.30-epsilon,3.30+epsilon);
		phfVV0.F(0.9).should.within(4.894,4.895);
		phfVV0.F(1).should.equal(5);
		var phf0VV = new PHFeed(phline, {vIn:0, vCruise:100, vOut:100, vMax:100, tvMax:0.01});
		phf0VV.F(0).should.equal(0);
		phf0VV.F(0.4).should.within(1.70-epsilon,1.70+epsilon);
		phf0VV.F(0.5).should.within(2.25-epsilon,2.25+epsilon);
		phf0VV.F(0.6).should.within(2.80-epsilon,2.80+epsilon);
		phf0VV.F(1).should.equal(5);
		var phf0V0 = new PHFeed(phline, {vIn:0, vCruise:100, vOut:0, vMax:100, tvMax:0.01});
		phf0V0.F(0).should.equal(0);
		phf0V0.F(0.1).should.within(0.137,0.138);
		phf0V0.F(0.2).should.within(0.700,0.701);
		phf0V0.F(0.3).should.within(1.300,1.301);
		phf0V0.F(0.4).should.within(1.900,1.901);
		phf0V0.F(0.5).should.within(2.500-epsilon,2.500+epsilon);
		phf0V0.F(0.6).should.within(3.100,3.101);
		phf0V0.F(0.7).should.within(3.700,3.701);
		phf0V0.F(0.8).should.within(4.300,4.301);
		phf0V0.F(0.9).should.within(4.862,4.863);
		phf0V0.F(1).should.equal(5);
	});
	it("V(tau) should return feedrate for tau:[0,1]", function() {
		var phfVV0 = new PHFeed(phline, {vIn:200, vCruise:200, vOut:0, vMax:200, tvMax:0.01});
		phfVV0.V(0).should.equal(200);
		phfVV0.V(0.1).should.equal(200);
		phfVV0.V(0.4).should.equal(200);
		phfVV0.V(0.5).should.equal(200);
		phfVV0.V(0.6).should.equal(200);
		phfVV0.V(0.9).should.within(32.61,32.62);
		phfVV0.V(0.95).should.within(5.32,5.33);
		phfVV0.V(1).should.equal(0);
		var phf0VV = new PHFeed(phline, {vIn:0, vCruise:200, vOut:200, vMax:200, tvMax:0.01});
		phf0VV.V(0).should.equal(0);
		phf0VV.V(0.1).should.within( 32.61, 32.62);
		phf0VV.V(0.2).should.within(136.51,136.52);
		phf0VV.V(0.3).should.within(198.28,198.29);
		phf0VV.V(0.4).should.within(200-epsilon,200+epsilon);
		phf0VV.V(0.5).should.within(200-epsilon,200+epsilon);
		phf0VV.V(0.6).should.equal(200);
		phf0VV.V(1).should.equal(200);
		var phf0V0 = new PHFeed(phline, {vIn:0, vCruise:200, vOut:0, vMax:200, tvMax:0.01});
		phf0V0.V(0).should.equal(0);
		phf0V0.V(0.1).should.within( 47.03, 47.04);
		phf0V0.V(0.4).should.within(200-epsilon,200+epsilon);
		phf0V0.V(0.5).should.equal(200);
		phf0V0.V(0.6).should.within(200-epsilon,200+epsilon);
		phf0V0.V(0.9).should.within( 47.03, 47.04);
		phf0V0.V(1).should.equal(0);
	});
	it("Ekt(Eprev,tau) should compute parametric p for normalized time tau", function() {
		var phf = new PHFeed(phline, {vIn:0, vCruise:200, vOut:0, vMax:200, tvMax:0.01});
		var n = 5;
		var dt = 0.1;
		var E0 = 0;
		var t = 0;
		var E1 = phf.Ekt(E0,0.1);
		E1.should.within(0.0,0.1);
		var E2 = phf.Ekt(E1,0.2);
		E2.should.within(0.0854, 0.0855);
		var E3 = phf.Ekt(E2,0.3);
		E3.should.within(0.2200, 0.2201);
		var E4 = phf.Ekt(E3,0.4);
		E4.should.within(0.3600, 0.3601);
		var E5 = phf.Ekt(E4,0.5);
		E5.should.within(0.5000, 0.5001);
		var E6 = phf.Ekt(E5,0.6);
		E6.should.within(0.6399, 0.6400);
		var E7 = phf.Ekt(E6,0.7);
		E7.should.within(0.7800, 0.7801);
		var E8 = phf.Ekt(E7,0.8);
		E8.should.within(0.9145, 0.9146);
		var E9 = phf.Ekt(E8,0.9);
		E9.should.within(0.9905, 0.9906);
		var E10 = phf.Ekt(E9,1.0);
		E10.should.within(1-epsilon,1);
		phf.Ekt(E0,0).should.equal(0);
	});
	it("interpolate(options) should interpolate {t,tau,E,s,V,F,r} for n time intervals", function() {
		var phf = new PHFeed(phline, {vIn:0, vCruise:200, vOut:0, vMax:200, tvMax:0.01});
		var N = 9;
		var rows = phf.interpolate({n:N});
		rows.length.should.equal(N);
		for (var i=1; i<N; i++) {
			var r0 = rows[i-1];
			var r1 = rows[i];
			r1.t.should.be.above(r0.t); // monotonic
			r1.r.modulus().should.be.above(r0.r.modulus()); // monotonic
			r1.s.should.be.above(r0.s); // monotonic
			r1.dsdt.should.be.within(0,200+epsilon);
		}
		// termination
		rows[N-1].s.should.equal(5);
		rows[N-1].t.should.equal(phf.tS);
		shouldEqualT(rows[N-1].r, new Complex(5,4),epsilon);
		// acceleration
		rows[0].dsdt.should.below(rows[1].dsdt);
		rows[1].dsdt.should.below(rows[2].dsdt);
		// symmetric acceleration/deceleration
		var places=7;
		Util.roundN(rows[0].dsdt,places).should.equal(Util.roundN(rows[N-1].dsdt,places));
		Util.roundN(rows[1].dsdt,places).should.equal(Util.roundN(rows[N-2].dsdt,places));
	});
})
