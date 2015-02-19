var firepick; (function (firepick) {
	var mutateDefault = function(value,minValue,maxValue) {
		// generate new value in given range with median==value 
		// using approximately Gaussian distribution
		assert.ok(minValue <= value);
		assert.ok(value <= maxValue);
		var r = (Math.random()+Math.random()+Math.random())/3;
		assert.ok(0<=r && r<=1);
		var result = value;
		if (r < 0.5) { 
			result = minValue + (value-minValue)*2*r;	
		} else {
			result = value + (maxValue-value)*(2*r-1);
		}
		assert.ok(minValue <= result);
		assert.ok(result <= maxValue);
		return result;
	}
	var Evolve = function(generate,compare) {
		assert.ok(generate);	
		this.generate = generate;
		this.compare = compare;
		this.mutate = mutateDefault;
		this.generation = [];
		return this;
	};
	Evolve.prototype.evolve1 = function(generation) {
		var generation1 = generation ? generation : this.generation;
		var generation2 = [];
		var variantMap = {};
		for (var iv1=0; iv1 < generation1.length; iv1++) {
			var v = generation1[iv1];
			var iv2 = Math.round(Math.random() * 7919) % generation.length;
			var parent1 = generation[Math.min(iv1,iv2)];
			var parent2 = generation[Math.max(iv1,iv2)];
			var candidates = this.generate(parent1, parent2);
			for (var ic=0; ic < candidates.length; ic++) {
				var c = candidates[ic];
				var key = JSON.stringify(c);
				if (!variantMap[key]) {
					variantMap[key] = c;
					generation2.push(c);
				}
			}
		}
		if (this.compare) {
			generation2.sort(this.compare);
		}
		return generation2;
	};
	Evolve.prototype.evolveN = function(n, generation, maxVariants) {
		this.generation = generation;
		for (var i = 0; i < n; i++) {
			this.generation = this.evolve1(this.generation);
			if (maxVariants && this.generation.length > maxVariants) {
				this.generation.splice(maxVariants, this.generation.length);
			}
			//console.log("evolve"+(i+1) + JSON.stringify(this.generation));
		}
		return this.generation;
	};
	firepick.Evolve = Evolve;
	console.log("firepick.Evolve defined");
})(firepick || (firepick = {}));


var firepick; (function (firepick) {
	var N = 200;
	var N2 = N == 2 ? 2 : N/2
	var generate = function(parent1, parent2) {
		var kid1 = parent1;	// keep better solution 
		var kid2;
		if (parent1 === parent2) {
			kid2 = evolve.mutate(parent1, 1, N2);
		} else {
			var spread = Math.abs(parent1-parent2);
			kid2 = evolve.mutate(parent1, Math.max(1, parent1-spread), Math.min(N2,parent1+spread));
		}

		return [kid1, kid2];
	};
	var	compare = function(a,b) {
		return Math.abs(N-a*a) - Math.abs(N-b*b);
	};
	var evolve = new firepick.Evolve(generate, compare);
	var self = {
		testAll: function(result, scope) {
			assert.equal(1.5, 3/2);
			assert.ok(compare(1.4,1) < 0);
			assert.ok(compare(1.4,1.41) > 0);
			assert.ok(compare(1.4,1.4) == 0);
			var guess1 = (1+N2)/2;
			console.log("guess1:" + guess1);
			for (var i = 0; i < 10; i++) {
				var vSolve = evolve.evolveN(30, [guess1], 20);
				console.log("vSolve:" + JSON.stringify(vSolve));
				var solution = vSolve[0];
				assert.ok(Math.abs(N - solution*solution) < N/1000);
			}

			console.log("The square root of " + N + " is " + solution);

			result.outcome = true;
		}
	};

	firepick.EvolveTest = self;
	console.log("firepick.EvolveTest defined: " + JSON.stringify(firepick.EvolveTest));
})(firepick || (firepick = {}));
