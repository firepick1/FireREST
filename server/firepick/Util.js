var should = require("should"),
    module = module || {},
    firepick = firepick || {};

(function(firepick) {
    var that = {};
    var id = 0;
    that.id = id++;

    function Util(solver, options) {
        this.id = id++;
        return this;
    };

    ///////////////// INSTANCE ///////////////
    Util.prototype.thisId = function() {
        return this.id;
    }
    Util.prototype.thatId = function() {
        return that.id;
    }
    Util.prototype.id = function() {
        return id;
    }
    Util.id = function() {
        return id;
    }
    Util.roundN = function(value, places) {
		places = places || 0;
		if (places === 0) {
			return Math.round(value);
		}
        return +(Math.round(value + "e+" + places) + "e-" + places);
    };
	Util.lagrange = function(x,pts) {
		should.exist(pts, "expected lagrange(x,[{x,y},...])");
		pts.length.should.be.equal(3); // for now...
		var p1 = pts[0];
		var p2 = pts[1];
		var p3 = pts[2];
		return p1.y * (x-p2.x)*(x-p3.x)/((p1.x-p2.x)*(p1.x-p3.x))
			 + p2.y * (x-p1.x)*(x-p3.x)/((p2.x-p1.x)*(p2.x-p3.x))
		     + p3.y * (x-p1.x)*(x-p2.x)/((p3.x-p1.x)*(p3.x-p2.x));
	};
	Util.polyFit = function(pts) {
		should.exist(pts, "expected polyFit([{x,y},...])");
		pts.length.should.be.equal(3); // for now...
		var p1 = pts[0];
		var p2 = pts[1];
		var p3 = pts[2];
		return [
			p1.y/((p1.x-p2.x)*(p1.x-p3.x)) + 
			p2.y/((p2.x-p1.x)*(p2.x-p3.x)) + 
			p3.y/((p3.x-p1.x)*(p3.x-p2.x)),
	
			-p1.y*(p2.x+p3.x)/((p1.x-p2.x)*(p1.x-p3.x))
			-p2.y*(p1.x+p3.x)/((p2.x-p1.x)*(p2.x-p3.x))
		    -p3.y*(p1.x+p2.x)/((p3.x-p1.x)*(p3.x-p2.x)),
			
			p1.y*p2.x*p3.x/((p1.x-p2.x)*(p1.x-p3.x))
			+ p2.y*p1.x*p3.x/((p2.x-p1.x)*(p2.x-p3.x))
			+ p3.y*p1.x*p2.x/((p3.x-p1.x)*(p3.x-p2.x))
			];
	};
	Util.criticalPoints = function(pts) { 
		should.exist(pts, "expected criticalPoints([{x,y},...])");
		pts.length.should.be.equal(3); // for now...
		var abc = Util.polyFit(pts);
		var x0 = -abc[1]/(2*abc[0]); // -b/2a
		return [x0];
	};
	Util.sample = function(xMin, xMax, xStep, fx) {
		xMin.should.be.a.Number;
		xMax.should.be.a.Number;
		xMin.should.be.below(xMax);
		var xySum = 0;
		var ySum = 0;
		var n = 0;
		for (var x = xMin; x <= xMax; x += xStep) {
			var y = fx(x);
			xySum += x*y;
			ySum += y;
			n++;
		}
		return {
			yAvg: ySum/n,
			xAvg: xySum/ySum
		}
	}

    console.log("LOADED	: firepick.Util");
    module.exports = firepick.Util = Util;
})(firepick || (firepick = {}));

(function(firepick) {
    function Caller(callee) {
        this.callee = callee;
        return this;
    };
    Caller.prototype.invoke = function(eThat, eThis) {
        should.equal(this.callee.thatId(), eThat);
        should.equal(this.callee.thisId(), eThis);
    };
    firepick.Caller = Caller;
})(firepick);

(typeof describe === 'function') && describe("firepick.Util", function() {
    it("should roundN(3.14159,2) to two places", function() {
        should(firepick.Util.roundN(3.14159, 2)).equal(3.14);
    });
    it("should do this and that", function() {
        var util1 = new firepick.Util();
        var util2 = new firepick.Util();
        should.equal(util1.thatId(), 0);
        should.equal(util1.thisId(), 1);
        should.equal(util2.thatId(), 0);
        should.equal(util2.thisId(), 2);
        var caller1 = new firepick.Caller(util1);
        var caller2 = new firepick.Caller(util2);
        caller1.invoke(0, 1);
        caller2.invoke(0, 2);
    });
	var quadratic = function(x,a,b,c) {
		return a*x*x + b*x + c;
	};
	var fx = function(x) {
		return quadratic(x, 1, 2, 3);
	};
	var epsilon = 0.000001;
	it("lagrange(x,pts) should compute the Lagrange polynomial for 3 points", function() {
		var pts = [{x:1,y:fx(1)},{x:3,y:fx(3)},{x:5,y:fx(5)}];
		should(Util.lagrange(1,pts)).be.within(6-epsilon,6+epsilon);
		should(Util.lagrange(3,pts)).be.within(18-epsilon,18+epsilon);
		should(Util.lagrange(2,pts)).be.within(11-epsilon,11+epsilon);
	});
	it("polyFit(pts) should calculate the polynomial coefficients for 3 points", function() {
		var pts = [{x:1,y:fx(1)},{x:3,y:fx(3)},{x:5,y:fx(5)}];
		var abc = Util.polyFit(pts);
		should(abc.length).equal(3);
		should(abc[0]).be.equal(1);
		should(abc[1]).be.equal(2);
		should(abc[2]).be.equal(3);
	});
	it("criticalPoints(pts) calculates critical points for a 3 data point polynomial", function() {
		var pts = [{x:1,y:fx(1)},{x:3,y:fx(3)},{x:5,y:fx(5)}];
		var crit = Util.criticalPoints(pts);
		crit.should.be.within(-1-epsilon,-1+epsilon);
		Util.lagrange(crit+epsilon,pts).should.be.above(Util.lagrange(crit,pts));
		Util.lagrange(crit-epsilon,pts).should.be.above(Util.lagrange(crit,pts));
	});
})
