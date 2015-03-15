var should = require("should"),
    module = module || {},
    firepick = firepick || {};
Evolve = require("./Evolve");
Util = require("./Util");

(function(firepick) {
    function Maximizer(fitness, options) {
        var that = this;

		// Options
        options = options || {};
		should.exist(fitness);
		this.fitness = fitness;
		fitness.should.have.properties(["evaluate"]);
		fitness.evaluate.should.be.a.Function;
        that.nPlaces = options.nPlaces == null ? 3 : options.nPlaces;
        should(that.nPlaces).not.below(0);
        that.maxGen = options.maxGen || 30;
		that.nSurvivors = options.nSurvivors || 4;
		that.nFamilies = options.nFamilies || 1;
		that.bestAge = options.bestAge || 10;
		that.stableAge = options.stableAge || 5;
		that.dxPolyFit = 2;
		for (var i = 0; i < that.nPlaces; i++) {
			that.dxPolyFit /= 10;
		}
		that.dxPolyFit = options.dxPolyFit == null ? that.dxPolyFit : options.dxPolyFit;
		that.logLevel = options.logLevel || "info";
        that.logTrace = that.logLevel === "trace";
        that.logDebug = that.logTrace || that.logLevel == "debug";
		if (that.logTrace) {
			console.log("TRACE	: nPlaces:" + that.nPlaces
				+ " dxPolyFit:" + that.dxPolyFit
			);
		}
        return that;
    };

    /////////////// INSTANCE ////////////
	Maximizer.prototype.round = function(value) { 
        var that = this;
		var nPlaces = that.nPlaces + 1;
		return Util.roundN(value, nPlaces); // reporting precision
	};
    Maximizer.prototype.isDone = function(iGen, curGen, rejects) {
        var that = this;
        var xBest = curGen[0];
        var xWorst = curGen[curGen.length - 1];
        var xDiff = Math.abs(xWorst - xBest);
        if (iGen === 0) {
            that.xLow = that.xMin;
            that.xHigh = that.xMax;
		} else {
			var xMin = xBest;
			var xMax = xBest;
            for (var i = 0; i < curGen.length; i++) {
				xMin = Math.min(xMin, curGen[i]);
				xMax = Math.max(xMax, curGen[i]);
			}
			if (xBest < xWorst) {
				that.xHigh = Math.min(that.xHigh, xMax);
			} else {
				that.xLow = Math.max(that.xLow, xMin);
			}
			for (var i = 0; i < rejects.length; i++) {
				if (xMax < rejects[i] &&  rejects[i] < that.xHigh) {
					that.xHigh = rejects[i];
				}
				if (that.xLow < rejects[i] && rejects[i] < xMin) {
					that.xLow = rejects[i];
				}
			}
        }
		var genKey = JSON.stringify(curGen);
		if (that.genKey !== genKey) {
			that.genKey = genKey;
			that.genKeyGen = iGen;
		}
		if (that.logTrace) {
			var msg = "TRACE	: GEN_" + iGen + ":" + JSON.stringify(curGen);
			msg += " x:[" + that.xLow + "," + that.xHigh+"]";
			console.log(msg);
		}
		that.doneMsg = null;
        if (that.doneMsg == null && iGen >= that.maxGen) {
            that.doneMsg = "exceeded " + that.maxGen + " generations";
        }
        if (that.xBestPrev !== xBest) {
            that.xBestPrev = xBest;
            that.xBestPrevGen = iGen;
        }
		if (that.doneMsg == null && (iGen-that.genKeyGen+1 >= that.stableAge)) {
			that.doneMsg = "population stable for " + that.stableAge + " generations";
		}
        if (that.doneMsg == null && (iGen - that.xBestPrevGen+1 >= that.bestAge)) {
            that.doneMsg = "elite survived " + that.bestAge + " generations";
        }
		return that.doneMsg != null;
    };
	Maximizer.prototype.select = function(prevGen) {
        var that = this;
		var xBest = prevGen[0];
		var xWorst = prevGen[prevGen.length-1];
		var xBisect = Util.roundN((that.xLow+that.xHigh)/2,that.nPlaces);
		var xNew1 = Util.roundN(Evolve.mutate(xBisect, that.xLow, that.xHigh), that.nPlaces); 
		prevGen.push(xNew1);
		return prevGen;
	};
    Maximizer.prototype.breed = function(x1, x2) {
        var that = this;
        var kids = []; 
        if (x1 !== x2) { // don't inbreed
            var spread = Math.abs(x1 - x2);
            var low = Math.max(that.xLow, x1 - spread);
            var high = Math.min(that.xHigh, x1 + spread);
            var xNew2 = Util.roundN(Evolve.mutate(x1, low, high), that.nPlaces);
            kids.push(xNew2); // narrow search
        }

        return kids;
    };
    Maximizer.prototype.compare = function(x1, x2) {
        var that = this;
        var cmp = that.fitness.evaluate(x2) - that.fitness.evaluate(x1);
        if (cmp === 0) {
            return x1 - x2;
        }
        return cmp;
    };
	Maximizer.prototype.polyFit = function(x1,x2,x3) {
        var that = this;
		var pts =[
			{x:x1, y:that.fitness.evaluate(x1)},
			{x:x2, y:that.fitness.evaluate(x2)},
			{x:x3, y:that.fitness.evaluate(x3)},
		];
		if (pts[0].y === pts[1].y && pts[0].y === pts[2].y) { // flat
			return (x1+x2+x3)/3;
		}
		var result = Util.criticalPoints(pts)[0];
		return result;
	};
    Maximizer.prototype.solve = function(xMin,xMax) {
        var that = this;
		should.exists(xMin, "xMin?");
		should.exists(xMax, "xMax?");
		xMin.should.be.a.Number;
		xMax.should.be.a.Number;
		that.xMin = xMin;
		that.xMax = xMax;
		xMin.should.be.below(xMax);
        var evolve = new Evolve(that, {
            nSurvivors: that.nSurvivors,
			nFamilies: that.nFamilies,
        });
		var xDomain = that.xMax - that.xMin;
		var guess = [
			Util.roundN(xMin + xDomain * 1 / 3, that.nPlaces),
			Util.roundN(xMin + xDomain * 2 / 3, that.nPlaces),
		];
        var vSolve = evolve.solve(guess);
		var dx = that.dxPolyFit;
        var xBest = vSolve[0];
		var dAvg = Number("1e-"+that.nPlaces);
		var xLow1 = xBest-dx-dAvg;
		var xLow2 = xBest-dAvg;
		var xLow3 = xBest+dx;
		var xHigh1 = xBest-dx;
		var xHigh2 = xBest+dAvg;
		var xHigh3 = xBest+dx+dAvg;
		if (that.logTrace) {
			console.log("TRACE	: polyFit average of " +
				" low:[" + xLow1 + "," + xLow2 + "," + xLow3 + "]" +
				" high:[" + xHigh1 + "," + xHigh2 + "," + xHigh3 + "]");
		}
        var result = {
            xBest: xBest,
			status: that.doneMsg,
        };
		if (that.dxPolyFit) {
			var xPolyFitLow = that.polyFit(xLow1,xLow2,xLow3);
			var xPolyFitHigh = that.polyFit(xBest-dx, xBest+dAvg, xBest+dx+dAvg);
			var xPolyFitAvg = (xPolyFitLow+xPolyFitHigh)/2;
			var xPolyFit = that.polyFit(xBest-dx, xBest, xBest+dx);
			result.xPolyFit = xPolyFit;
			result.xPolyFitAvg = xPolyFitAvg;
			if (that.logDebug) {
				console.log("DEBUG	: solve() " + that.doneMsg +
					" xBest:" + Util.roundN(xBest,that.nPlaces) +
					" xPolyFit:" + that.round(xPolyFit) +
					" xPolyFitAvg:" + that.round(xPolyFitAvg) +
					"");
			}
		}
        return result;
    };

    console.log("LOADED	: firepick.Maximizer");
    module.exports = firepick.Maximizer = Maximizer;
})(firepick || (firepick = {}));

var demo = demo || {};
(function(demo) {
    function SqrtSolver(N) {
        var that = this;
        that.N = N;
        that.N2 = N / 2;
        return that;
    }
    SqrtSolver.prototype.evaluate = function(x) {
        var that = this;
        return - Math.abs(that.N - x*x);
    };
    demo.SqrtSolver = SqrtSolver;
})(demo);

(typeof describe === 'function') && describe("firepick.Maximizer", function() {
	it("should have default options", function() {
		var N = 200;
		var sqrtSolver = new demo.SqrtSolver(N);
		var max = new firepick.Maximizer(sqrtSolver);
		max.should.have.properties({
			nPlaces: 3,		// x domain precision
			maxGen: 30,		// maximum number of generations to iterate
			nSurvivors: 4,	// generation culling threshold
			nFamilies: 1,	// number of breeding pairs per generation
			bestAge: 10,	// terminate if best candidate is same for this many generations
			stableAge: 5,	// terminate if this many successive generations are the same
			dxPolyFit:0.002,	// polynomial fitting interval = 2*dxPolyFit + 1
			logLevel:"info"	// info, debug, trace
		});
	});
    it("should calculate sqrt(200) using demo.SqrtSolver(200)", function() {
		var N = 200;
		var sqrtSolver = new demo.SqrtSolver(N);
		var solver = new firepick.Maximizer(sqrtSolver);
        var result = solver.solve(1,100);
		var ans = Math.sqrt(N);
		var epsilon = 0.05;
		should(result.xBest).within(ans-epsilon,ans+epsilon);
		should(result.xPolyFit).within(ans-epsilon*10,ans+epsilon*10);
		should(result.xPolyFitAvg).within(ans-epsilon*10,ans+epsilon*10);
    });
});
