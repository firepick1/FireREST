var should = require("should"),
    module = module || {},
    firepick = firepick || {};

(function(firepick) {
    function Evolve(solver, options) {
		options = options || {};
		should.exist(solver);
		should(solver).have.properties(["generate", "compare", "isDone"]);
		solver.generate.should.be.a.Function;
		solver.compare.should.be.a.Function;
		solver.isDone.should.be.a.Function;
		this.solver = solver;
        this.mutate = options.mutate || mutateDefault;
        should(this.mutate).be.a.Function;
        this.nElite = options.nElite || 1;
        should(this.nElite).not.below(1);
        this.nSurvivors = options.nSurvivors || 10;
        should(this.nSurvivors).not.below(1);
		this.verbose = options.verbose == null ? true : options.verbose;

        this.generation = [];
        return this;
    };

    ////////////// PRIVATE ////////////////
    function mutateDefault(value, minValue, maxValue) {
        // generate new value in given range with median==value 
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
		if (this.verbose) {
			console.log("mutateDefault(" + value + "," + minValue + "," + maxValue + " => " + result);
		}
        return result;
    }

    ///////////////// INSTANCE ///////////////
    Evolve.prototype.evolve1 = function(generation) {
        var generation1 = generation ? generation : this.generation;
        var generation2 = [];
        for (var i = 0; i < Math.min(generation.length, this.nElite); i++) {
            generation2.push(generation1[i]);
        }
        var variantMap = {};
        for (var iv1 = 0; iv1 < generation1.length; iv1++) {
            var v = generation1[iv1];
            var iv2 = Math.round(Math.random() * 7919) % Math.min(generation.length, this.nSurvivors);
            var parent1 = generation[Math.min(iv1, iv2)];
            var parent2 = generation[Math.max(iv1, iv2)];
            var candidates = this.solver.generate(parent1, parent2, mutateDefault);
            for (var ic = 0; ic < candidates.length; ic++) {
                var c = candidates[ic];
                var key = JSON.stringify(c);
                if (!variantMap[key]) {
                    variantMap[key] = c;
                    generation2.push(c);
                }
            }
        }
		generation2.sort(this.solver.compare);
        return generation2;
    };
    Evolve.prototype.solve = function(generation) {
        this.generation = generation;
        for (this.iGeneration = 0;
            (this.status = this.solver.isDone(this.iGeneration, this.generation)) === false; 
			this.iGeneration++) {
            this.generation = this.evolve1(this.generation);
			if (this.verbose) {
				console.log("generation " + this.iGeneration + ": " + JSON.stringify(this.generation));
			}
            if (this.nSurvivors && this.generation.length > this.nSurvivors) {
                this.generation.splice(this.nSurvivors, this.generation.length);
            }
        }
        return this.generation;
    };
    console.log("LOADED	: firepick.Evolve");
    module.exports = firepick.Evolve = Evolve;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.Evolve genetic solver", function() {
    var N = 200;
    var N2 = N == 2 ? 2 : N / 2

	function Solver() {
		return this;
	}
	Solver.prototype.isDone = function(index, generation) {
        if (Math.abs(N - generation[0] * generation[0]) < N / 1000) {
            //console.log("Solved in " + index + " generations: " + generation[0]);
            return true;
        }
        if (index >= 100) {
            //console.log("Giving up after " + index + " generations");
            return true;
        }
        return false;
    };
	Solver.prototype.generate = function(parent1, parent2, mutate) {
        var kids = [mutate(parent1, 1, N2)]; // broad search
        if (parent1 === parent2) {
            kids.push(mutate(parent1, 1, N2));
        } else { // deep search
            var spread = Math.abs(parent1 - parent2);
            var low = Math.max(1, parent1 - spread);
            var high = Math.min(N2, parent1 + spread);
            kids.push(mutate(parent1, low, high));
        }

        return kids;
    };
	Solver.prototype.compare = function(a,b) {
        return Math.abs(N - a * a) - Math.abs(N - b * b);
    };

    describe("compute the square root of " + N, function() {
		var solver = new Solver();
        var evolve;
		
		it("should create a new genetic solver with default options", function() {
			var options = {};
			evolve	= new firepick.Evolve(solver, options);
			should(evolve).have.properties({verbose:true, nElite:1, nSurvivors:10});
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
