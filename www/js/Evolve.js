var firepick; (function (firepick) {
	var Evolve = function(generate,compare) {
		assert.ok(generate);	
		this.generate = generate;
		this.compare = compare;
		this.variants = [];
		return this;
	};
	Evolve.prototype.evolve1 = function(variants) {
		var variants1 = variants ? variants : this.variants;
		var variants2 = [];
		var variantMap = {};
		for (var iv=0; iv < variants1.length; iv++) {
			var v = variants1[iv];
			var candidates = this.generate(v, variants1);
			for (var ic=0; ic < candidates.length; ic++) {
				var c = candidates[ic];
				var key = JSON.stringify(c);
				if (!variantMap[key]) {
					variantMap[key] = c;
					variants2.push(c);
				}
			}
		}
		if (this.compare) {
			variants2.sort(this.compare);
		}
		return variants2;
	};
	Evolve.prototype.evolveN = function(n, variants, maxVariants) {
		this.variants = variants;
		for (var i = 0; i < n; i++) {
			this.variants = this.evolve1(this.variants);
			if (maxVariants && this.variants.length > maxVariants) {
				this.variants.splice(maxVariants, this.variants.length);
			}
			//console.log("evolve"+(i+1) + JSON.stringify(this.variants));
		}
		return this.variants;
	};
	firepick.Evolve = Evolve;
	console.log("firepick.Evolve defined");
})(firepick || (firepick = {}));


var firepick; (function (firepick) {
	var N = 200;
	var N2 = N == 2 ? 2 : N/2;
	var self = {
		generate: function(v1, variants1) {
			var variants2 = [v1]; // existing variant is still valid
			var dHigh = N2-v1;
			var dLow = v1-1;
			var dMin = Math.min(dHigh, dLow);
			var v2 = v1 + 2*dMin*Math.random() - dMin;
			var dV = Math.abs(variants1[variants1.length-1] - variants1[0]);
			if (dV === 0) {
				dV = dMin;
			}
			v2 = v1 + 2*dV*Math.random() - dV;
			if (v1 !== v2) {
				variants2.push(v2);
			}
			return variants2;
		},
		compare: function(a,b) {
			return Math.abs(N-a*a) - Math.abs(N-b*b);
		},
		testAll: function(result, scope) {
			var evolve = new firepick.Evolve(self.generate, self.compare);
			assert.equal(1.5, 3/2);
			assert.ok(self.compare(1.4,1) < 0);
			assert.ok(self.compare(1.4,1.41) > 0);
			assert.ok(self.compare(1.4,1.4) == 0);
			var guess1 = (1+N2)/2;
			console.log("guess1:" + guess1);
			var vSolve = evolve.evolveN(50, [guess1], 20);
			console.log("vSolve:" + JSON.stringify(vSolve));
			var solution = vSolve[0];
			assert.ok(Math.abs(N - solution*solution) < N/1000);

			console.log("The square root of " + N + " is " + solution);

			result.outcome = true;
		}
	};

	firepick.EvolveTest = self;
	console.log("firepick.EvolveTest defined: " + JSON.stringify(firepick.EvolveTest));
})(firepick || (firepick = {}));
