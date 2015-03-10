var should = require("should"),
    module = module || {},
    firepick = firepick || {};
firepick.ImageProcessor = require("./ImageProcessor");
firepick.ImageRef = require("./ImageRef");
firepick.XYZCamera = require("./XYZCamera");
Evolve = require("./Evolve");
firepick.FPD = require("./FPD");
Util = require("./Util");

(function(firepick) {
    function Focus(xyzCam, zMin, zMax, options) {
        var that = this;
        options = options || {};
        firepick.XYZCamera.isInterfaceOf(xyzCam);
        that.xyzCam = xyzCam;
        should(zMin).be.a.Number;
        should(zMax).be.a.Number;
        should(zMin).be.below(zMax);
        that.zMin = zMin;
        that.zMax = zMax;
        that.nPlaces = options.nPlaces || 0;
        that.maxGenerations = options.maxGenerations || 20;
		that.samples = [];
        should(that.nPlaces).not.below(0);
        that.captureCount = 0;
        that.verbose = options.verbose == null ? true : options.verbose;
        that.ip = new firepick.ImageProcessor();
        return that;
    };

    /////////////// INSTANCE ////////////
	Focus.prototype.round = function(value) { 
        var that = this;
		return Util.roundN(value, that.nPlaces+1); // reporting precision
	};
    Focus.prototype.isDone = function(index, generation) {
        var that = this;
		var zSharpSum = 0;
		var sharpSum = 0;
		var zTotal = 0;
        for (var i=0; i<generation.length; i++) {
            var z = generation[i];
			zTotal += z;
			var sz = that.sharpness(z);
			zSharpSum += z * sz;
			sharpSum += sz;
        }
		var zAvgGen = zTotal / generation.length;	// generation average
		var zSharpAvgGen = zSharpSum / sharpSum;	// generation sharpness weighted average
		// zAvg = exponential average of average generation z
		var w = 0.8;
		that.zAvg = w*zAvgGen + (1-w)*(that.zAvg||(that.zMin+that.zMax)/2);	
		that.zSharpAvg = w*zSharpAvgGen + (1-w)*(that.zSharpAvg||(that.zMin+that.zMax)/2);
        console.log("Focus	: " + index + ": " + JSON.stringify(generation) + 
			" zAvgGen:" + that.round(zAvgGen) +
			" zSharpAvgGen:" + that.round(zSharpAvgGen) );
        var zFirst = generation[0];
        var zLast = generation[generation.length - 1];
        var zDiff = Math.abs(zLast - zFirst);
        if (index === 0) {
            that.zLow = that.zMin;
            that.zHigh = that.zMax;
            console.log("");
        } else {
            if (zFirst < zLast) {
                that.zHigh = zLast; // no need to look above zLast
                for (var i = 0; i < generation.length; i++) {
                    that.zHigh = Math.max(that.zHigh, generation[i]);
                }
            } else if (zFirst > zLast) {
				that.zLow = zLast; // no need to look below zLast
                for (var i = 0; i < generation.length; i++) {
                    that.zLow = Math.min(that.zLow, generation[i]);
                }
            }
        }
        var doneMsg;
        if (doneMsg == null && index >= that.maxGenerations) {
            doneMsg = "exceeded " + that.maxGenerations + " generations";
        }
        if (doneMsg == null && index > 1 && zDiff <= 1) { // candidates roughly same
            doneMsg = "all solutions similar";
        }
        if (that.lastCandidate !== zFirst) {
            that.lastCandidate = zFirst;
            that.lastCandidateIndex = index;
        }
        if (doneMsg == null && (index - that.lastCandidateIndex >= 3)) {
            doneMsg = "elite survived 3 generations";
        }
        if (doneMsg == null) {
            return false;
        }
        console.log("Focus	: calcSharpestZ() " + doneMsg +
            " => z:" + that.round(zFirst) +
            " zAvg:" + that.round(that.zAvg) +
            " zSharpAvg:" + that.round(that.zSharpAvg) +
            " sharpness:" + that.round(that.sharpness(zFirst)));
        return true;
    };

    Focus.prototype.generate = function(z1, z2) {
        var that = this;
		var zNew1 = Util.roundN(Evolve.mutate(z1, that.zLow, that.zHigh), that.nPlaces); 
        var kids = [zNew1]; // broad search
        if (z1 === z2) {
			var zNew2 = Util.roundN(Evolve.mutate(z1, that.zLow, that.zHigh), that.nPlaces); 
            kids.push(zNew2); // broad search
        } else { 
            var spread = Math.abs(z1 - z2);
            var low = Math.max(that.zLow, z1 - spread);
            var high = Math.min(that.zHigh, z1 + spread);
            var zNew2 = Util.roundN(Evolve.mutate(z1, low, high), that.nPlaces);
            kids.push(zNew2); // narrow search
        }

        return kids;
    };
    Focus.prototype.compare = function(z1, z2) {
        var that = this;
        var cmp = that.sharpness(z2) - that.sharpness(z1);
        if (cmp === 0) {
            return z1 - z2;
        }
        return cmp;
    };
	Focus.prototype.imageRefAtZ = function(z) {
        var that = this;
        return that.xyzCam.imageRef({
            x: 0,
            y: 0,
            z: z
        });
	};
    Focus.prototype.sharpness = function(z) {
        var that = this;
        var imgRef = that.imageRefAtZ(z);
        if (!imgRef.exists() || imgRef.sharpness == null) {
            that.captureCount++;
            imgRef = that.xyzCam.moveTo(imgRef).capture();
            imgRef.sharpness = that.ip.sharpness(imgRef).sharpness;
			that.zSharpSum += z * imgRef.sharpness;
			that.sharpSum += imgRef.sharpness;
			that.samples.push(imgRef.z);
            if (that.verbose) {
                console.log("Focus	: sharpness#" + that.captureCount + "(" + z + ") " + 
				that.round(imgRef.sharpness) + 
					" zSharpAvg:" + that.round(that.zSharpSum/that.sharpSum));
            }
        }
        return imgRef.sharpness;
    };
    Focus.prototype.calcSharpestZ = function() {
        var that = this;
        var evolve = new Evolve(that, {
            nSurvivors: 4
        });
        var z1 = that.round(that.zMin + (that.zMax - that.zMin) / 3, that.nPlaces);
        var z2 = that.round(that.zMin + (that.zMax - that.zMin) * 2 / 3, that.nPlaces);
		that.zSharpSum = 0;
		that.sharpSum = 0;
		that.samples = [];
        var guess;
        if (that.sharpness(z1) > that.sharpness(z2)) {
            guess = [z1, z2];
        } else {
            guess = [z2, z1];
        }
        that.lastCandidateAge = 0;
        var vSolve = evolve.solve(guess);
        that.samples.sort(function(a, b) {
            return that.compare(a,b);
        });
        var zBest = vSolve[0];
		var nAbove = 0;
		var nBelow = 0;
		var zSharpSum = 0;
		var sharpSum = 0;
		for (var i=1; i < that.samples.length; i++) {
			var z = that.samples[i];
			var sharp = that.sharpness(z);
			if (z > zBest && nAbove < 3) {
				nAbove++;
				zSharpSum += z*sharp;
				sharpSum += sharp;
			}
			if (z < zBest && nBelow < 3) {
				nBelow++;
				zSharpSum += z*sharp;
				sharpSum += sharp;
			}
		}
		console.log("neighborhood weighted average z:" + that.round(zSharpSum/sharpSum));

        return {
            z: zBest,
			zSharpAvg: that.zSharpSum / that.sharpSum,
            sharpness: that.sharpness(zBest)
        };
    };

    console.log("LOADED	: firepick.Focus");
    module.exports = firepick.Focus = Focus;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.Focus", function() {
    var ip = new firepick.ImageProcessor();
    var fpd = new firepick.FPD();
    var useMock = fpd.health() < 1;
    var mockXYZCam = new firepick.XYZCamera(); // mock images
    var xyzCam = useMock ? mockXYZCam : fpd;
    var focus = new firepick.Focus(xyzCam, -110, 20);
    it("compute the sharpness at {x:0,y:0,z:0}", function() {
        var captureOld = focus.captureCount;
        var sharpness = focus.sharpness(0);
        if (useMock) {
            should(sharpness).within(278.8, 278.9);
        }
        should(focus.captureCount).equal(captureOld + 1);
    });
    it("compute the sharpness at {x:0,y:0,z:-5}", function() {
        var captureOld = focus.captureCount;
        var sharpness = focus.sharpness(-5);
        if (useMock) {
            should(sharpness).within(313.4, 313.5);
        }
        should(focus.captureCount).equal(captureOld + 1);
    });
    it("should only capture a coordinate once for sharpness", function() {
        var captureOld = focus.captureCount;
        var sharpness = focus.sharpness(-5);
        if (useMock) {
            should(sharpness).within(313.4, 313.5);
        }
        should(focus.captureCount).equal(captureOld);
    });
    it("should calculate the Z-axis coordinate with the sharpest images", function() {
        this.timeout(50000);
        var captureOld = focus.captureCount;
        var result = focus.calcSharpestZ();
        if (useMock) {
            should(result.z).within(-20, -15);
            should(result.sharpness).within(338.6, 338.7);
        }
        should(focus.captureCount - captureOld).below(50);
    });
});
