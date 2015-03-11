var should = require("should"),
    module = module || {},
    firepick = firepick || {};

(function(firepick) {
    function Evolve(solver, options) {
        var that = this;
        options = options || {};
        should.exist(solver);
        should(solver).have.properties(["generate", "compare", "isDone"]);
        solver.generate.should.be.a.Function;
        solver.compare.should.be.a.Function;
        solver.isDone.should.be.a.Function;
        that.solver = solver;
        that.nElite = options.nElite || 1;
        should(that.nElite).not.below(1);
        that.nSurvivors = options.nSurvivors || 10;
        should(that.nSurvivors).not.below(1);
        that.verbose = options.verbose == null ? false : options.verbose;
        that.generation = [];
        return that;
    };


    ///////////////// INSTANCE ///////////////
    Evolve.prototype.evolve1 = function(generation) {
        var that = this;
        var generation1 = generation ? generation : that.generation;
        var generation2 = [];
        var variantMap = {};
        for (var i = 0; i < Math.min(generation.length, that.nElite); i++) {
            var c = generation1[i];
            var key = JSON.stringify(c);
            if (!variantMap[key]) {
                variantMap[key] = c;
                generation2.push(c);
            }
        }
        for (var iv1 = 0; iv1 < generation1.length; iv1++) {
            var v = generation1[iv1];
            var iv2 = Math.round(Math.random() * 7919) % Math.min(generation.length, that.nSurvivors);
            var parent1 = generation[Math.min(iv1, iv2)];
            var parent2 = generation[Math.max(iv1, iv2)];
            var candidates = that.solver.generate(parent1, parent2);
            for (var ic = 0; ic < candidates.length; ic++) {
                var c = candidates[ic];
                var key = JSON.stringify(c);
                if (!variantMap[key]) {
                    variantMap[key] = c;
                    generation2.push(c);
                }
            }
        }
        generation2.sort(function(a, b) {
            return that.solver.compare.call(that.solver, a, b);
        });
        return generation2;
    };
    Evolve.prototype.solve = function(generation) {
        var that = this;
        that.generation = generation;
        that.generation.sort(function(a, b) {
            return that.solver.compare.call(that.solver, a, b);
        });
        for (that.iGeneration = 0;
            (that.status = that.solver.isDone(that.iGeneration, that.generation)) === false; that.iGeneration++) {
            that.generation = that.evolve1(that.generation);
            if (that.verbose) {
                //console.log("generation " + that.iGeneration + ": " + JSON.stringify(that.generation));
            }
            if (that.nSurvivors && that.generation.length > that.nSurvivors) {
                that.generation.splice(that.nSurvivors, that.generation.length);
            }
        }
        return that.generation;
    };

    ////////////// CLASS ///////////////
    Evolve.mutate = function(value, minValue, maxValue) {
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
    SqrtSolver.prototype.isDone = function(index, generation) {
        var that = this;
        that.N.should.equal(200);
        that.N2.should.equal(100);
        done = false;
        if (Math.abs(that.N - generation[0] * generation[0]) < that.N / 1000) {
            //console.log("Solved in " + index + " generations: " + generation[0]);
            done = true;
        }
        if (index >= 100) {
            //console.log("Giving up after " + index + " generations");
            done = true;
        }
        //console.log(index + ". " + JSON.stringify(generation));
        return done;
    };
    SqrtSolver.prototype.generate = function(parent1, parent2) {
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
                nElite: 1,
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
