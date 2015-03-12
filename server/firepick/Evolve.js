var should = require("should"),
    module = module || {},
    firepick = firepick || {};

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
        that.nElites = options.nElites || 1;
        should(that.nElites).not.below(1);
        that.nSurvivors = options.nSurvivors || 10;
		that.nFamilies = options.nFamilies || that.nSurvivors;
		that.maxGen = options.maxGen || 50;
        should(that.nSurvivors).not.below(1);
        that.verbose = options.verbose == null ? false : options.verbose;
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
            if (that.verbose) {
                console.log("Evolve	: spawn() => " + that.iGen + ": " + JSON.stringify(that.curGen));
            }
            if (that.nSurvivors && that.curGen.length > that.nSurvivors) {
                rejects = that.curGen.splice(that.nSurvivors, that.curGen.length) || [];
            }
        }
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

var demo = demo || {};
(function(demo) {
    function SqrtSolver(N) {
        var that = this;
        that.N = N;
        that.N2 = N / 2;
        return that;
    }
    SqrtSolver.prototype.isDone = function(index, curGen) {
        var that = this;
        that.N.should.equal(200);
        that.N2.should.equal(100);
        done = false;
        if (Math.abs(that.N - curGen[0] * curGen[0]) < that.N / 1000) {
            //console.log("Solved in " + index + " curGen: " + curGen[0]);
            done = true;
        }
        //console.log(index + ". " + JSON.stringify(curGen));
        return done;
    };
    SqrtSolver.prototype.breed = function(parent1, parent2) {
        var that = this;
        var kids = [firepick.Evolve.mutate(parent1, 1, that.N2)]; // broad search
        if (parent1 === parent2) {
            kids.push(firepick.Evolve.mutate(parent1, 1, that.N2));
        } else { // deep search
            var spread = Math.abs(parent1 - parent2);
            var low = Math.max(1, parent1 - spread);
            var high = Math.min(that.N2, parent1 + spread);
            kids.push(firepick.Evolve.mutate(parent1, low, high));
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

    describe("compute the square root of " + N, function() {
        var solver = new demo.SqrtSolver(N);
        var evolve;

        it("should create a new genetic solver with default options", function() {
            var options = {};
            evolve = new firepick.Evolve(solver, options);
            should(evolve).have.properties({
                verbose: false,
                nElites: 1,
                nSurvivors: 10
            });
        });
        var guess1 = (1 + N2) / 2;
        var epsilon = 0.01;
        var sqrtN = Math.sqrt(N);
        it("should compute the square root of " + N, function() {
            var vSolve = evolve.solve([guess1]);
            should(vSolve).be.Array;
            should(vSolve.length).equal(10);
            should(vSolve[0]).within(sqrtN - epsilon, sqrtN + epsilon);
            should(evolve.status).equal(true);
        });
        it("should repeatedly compute the square root of " + N, function() {
            for (var i = 0; i < 10; i++) {
                var vSolve = evolve.solve([guess1]);
                //console.log("Last generation:" + JSON.stringify(vSolve));
                var solution = vSolve[0];
                should(evolve.status).equal(true);
                should(Math.abs(N - solution * solution)).be.below(N / 1000);
            }
        });
    });
})
