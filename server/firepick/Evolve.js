var should = require("should"),
    module = module || {},
    firepick = firepick || {};
Util = require("./Util");
Logger = require("./Logger");

(function(firepick) {
    function Evolve(solver, options) {
        var that = this;
        options = options || {};
        should.exist(solver);
        should(solver).have.properties(["breed", "compare", "isDone"]);
        solver.breed.should.be.a.Function;
        solver.compare.should.be.a.Function;
        solver.isDone.should.be.a.Function;
        that.solver = solver;
        that.nSurvivors = options.nSurvivors || 5;
		that.nFamilies = options.nFamilies || that.nSurvivors;
		that.maxGen = options.maxGen || 50;
        should(that.nSurvivors).not.below(1);
		that.logger = options.logger || new Logger();
        that.curGen = [];
        return that;
    };


    ///////////////// INSTANCE ///////////////
    Evolve.prototype.normalize = function(candidates) {
        var that = this;
		var gen = [];
		var candidateMap = {};
        for (var i = 0; i < candidates.length; i++) {
            var c = candidates[i];
            var key = JSON.stringify(c);
            if (!candidateMap[key]) {
                candidateMap[key] = c;
				gen.push(c);
            }
        }
        gen.sort(function(a, b) {
            return that.solver.compare.call(that.solver, a, b);
        });
		return gen;
	};
    Evolve.prototype.spawn = function(candidates) {
        var that = this;
        var gen1 = candidates; 
        var gen2 = that.normalize(gen1);
		var nBreeders = Math.min(gen1.length, that.nSurvivors);
        for (var i1 = 0; i1 < Math.min(gen1.length,that.nFamilies); i1++) {
            var i2 = Math.round(Math.random() * 7919) % nBreeders;
            var parent1 = candidates[Math.min(i1, i2)];
            var parent2 = candidates[Math.max(i1, i2)];
            var kids = that.solver.breed(parent1, parent2);
			gen2.push.apply(gen2, kids);
        }
        return that.normalize(gen2);
    };
    Evolve.prototype.solve = function(gen1) {
        var that = this;
        that.curGen = gen1;
        that.curGen.sort(function(a, b) {
            return that.solver.compare.call(that.solver, a, b);
        });
		var rejects = [];
        for (that.iGen = 0; that.iGen < that.maxGen; that.iGen++) {
            that.status = that.solver.isDone(that.iGen, that.curGen, rejects);
			if (that.status !== false) {
				break;
			}
			var candidates = that.solver.select && that.solver.select(that.curGen) || that.curGen;
            that.curGen = that.spawn(candidates);
            if (that.logger.logTrace) {
                that.logger.trace("spawn#"+that.iGen + "() => " + JSON.stringify(that.curGen));
            }
            if (that.nSurvivors && that.curGen.length > that.nSurvivors) {
                rejects = that.curGen.splice(that.nSurvivors, that.curGen.length) || [];
            }
        }
		that.logger.debug("solve() ", that.iGen, " generations => ", that.curGen[0]);
        return that.curGen;
    };

    ////////////// CLASS ///////////////
    Evolve.mutate = function(value, minValue, maxValue) {
        // breed new value in given range with median==value 
        // using approximately Gaussian distribution
        should(value).be.within(minValue, maxValue);
        var r = (Math.random() + Math.random() + Math.random()) / 3;
        should(r).be.within(0, 1);
        var result = value;
        if (r < 0.5) {
            result = minValue + (value - minValue) * 2 * r;
        } else {
            result = value + (maxValue - value) * (2 * r - 1);
        }
        should(result).be.within(minValue, maxValue);
        return result;
    }
    console.log("LOADED	: firepick.Evolve");
    module.exports = firepick.Evolve = Evolve;
})(firepick || (firepick = {}));

Evolve = firepick.Evolve;

var demo = demo || {};
(function(demo) {
    function SqrtSolver(N,nPlaces) {
        var that = this;
        that.N = N;
        that.N2 = N / 2;
		that.nPlaces = nPlaces || 2;
        return that;
    }
	SqrtSolver.prototype.select = function(candidates) {
        var that = this;
		for (var i=0; i < 5; i++) {	// broad search
			var broadSearch = firepick.Evolve.mutate((1+that.N2)/2, 1, that.N2); 
			candidates.push(broadSearch);
		}
		return candidates;
	};
    SqrtSolver.prototype.isDone = function(index, curGen) {
        var that = this;
        done = false;
        if (Math.abs(that.N - curGen[0] * curGen[0]) < that.N / 1000) {
            done = true;
        }
        return done;
    };
    SqrtSolver.prototype.breed = function(parent1, parent2) {
        var that = this;
		var broadSearch = firepick.Evolve.mutate((1+that.N2)/2, 1, that.N2); 
        var kids = [ 
			//Util.roundN(broadSearch, that.nPlaces) 
			];
        if (parent1 !== parent2) { // no inbreeding
            var spread = Math.abs(parent1 - parent2);
            var low = Math.max(1, parent1 - spread);
            var high = Math.min(that.N2, parent1 + spread);
			var narrowSearch = firepick.Evolve.mutate(parent1, low, high); 
            kids.push(Util.roundN(narrowSearch,that.nPlaces)); 
        }

        return kids;
    };
    SqrtSolver.prototype.compare = function(a, b) { // smaller is "better"
        var that = this;
        var goal = that.N;
        return Math.abs(goal - a * a) - Math.abs(goal - b * b);
    };
    demo.SqrtSolver = SqrtSolver;
})(demo);

(typeof describe === 'function') && describe("firepick.Evolve genetic solver", function() {
    var N = 200;
    var N2 = N == 2 ? 2 : N / 2;
	var solver = new demo.SqrtSolver(N);
	it("should create a new genetic solver with default options", function() {
		var options = {};
		var evolve = new firepick.Evolve(solver);
		should(evolve).have.properties({
			nSurvivors: 5,
			nFamilies: 5,
			maxGen: 50,
		});
		evolve.logger.should.have.properties({logLevel:"info"});
	});
    describe("compute the square root of " + N, function() {
		var evolve = new firepick.Evolve(solver,{
			maxGen:300
		});
        var guess1 = (1 + N2) / 2;
        var epsilon = 0.01;
        var sqrtN = Math.sqrt(N);
        it("should compute the square root of " + N, function() {
            var vSolve = evolve.solve([guess1]);
            should(vSolve).be.Array;
            should(vSolve.length).equal(5);
            should(vSolve[0]).within(sqrtN - epsilon, sqrtN + epsilon);
            should(evolve.status).equal(true);
        });
    });
})
