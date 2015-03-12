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

		// Options
        options = options || {};
        firepick.XYZCamera.isInterfaceOf(xyzCam);
        that.xyzCam = xyzCam;
        should(zMin).be.a.Number;
        should(zMax).be.a.Number;
        should(zMin).be.below(zMax);
        that.zMin = zMin;
        that.zMax = zMax;
        that.nPlaces = options.nPlaces || 0;
        should(that.nPlaces).not.below(0);
        that.maxGen = options.maxGen || 30;
		that.nSurvivors = options.nSurvivors || 4;
		that.nFamilies = options.nFamilies || 1;
		that.nElites = options.nElites || (that.nSurvivors);
		that.tolerance = options.tolerance || 1;
		that.eliteAge = options.eliteAge || 10;
		that.stableAge = options.stableAge || 5;
		that.dzPolyFit = options.dzPolyFit || 3;
        that.verbose = options.verbose == null ? true : options.verbose;

		that.samples = [];
        that.captureCount = 0;
        that.ip = new firepick.ImageProcessor();
        return that;
    };

    /////////////// INSTANCE ////////////
	Focus.prototype.round = function(value) { 
        var that = this;
		var nPlaces = that.nPlaces + 1;
		nPlaces.should.be.equal(1);
		return Util.roundN(value, nPlaces); // reporting precision
	};
    Focus.prototype.isDone = function(iGen, curGen, rejects) {
        var that = this;
        var zBest = curGen[0];
        var zWorst = curGen[curGen.length - 1];
        var zDiff = Math.abs(zWorst - zBest);
        if (iGen === 0) {
            that.zLow = that.zMin;
            that.zHigh = that.zMax;
		} else {
			var zMin = zBest;
			var zMax = zBest;
            for (var i = 0; i < curGen.length; i++) {
				zMin = Math.min(zMin, curGen[i]);
				zMax = Math.max(zMax, curGen[i]);
			}
			if (zBest < zWorst) {
				that.zHigh = Math.min(that.zHigh, zMax);
			} else {
				that.zLow = Math.max(that.zLow, zMin);
			}
			for (var i = 0; i < rejects.length; i++) {
				if (zMax < rejects[i] &&  rejects[i] < that.zHigh) {
					that.zHigh = rejects[i];
				}
				if (that.zLow < rejects[i] && rejects[i] < zMin) {
					that.zLow = rejects[i];
				}
			}
        }
		var genKey = JSON.stringify(curGen);
		if (that.genKey !== genKey) {
			that.genKey = genKey;
			that.genKeyGen = iGen;
		}
		if (that.verbose) {
			var msg = "Focus	: GEN_" + iGen + ":" + JSON.stringify(curGen);
			msg += " z:[" + that.zLow + "," + that.zHigh+"]";
			console.log(msg);
		}
		that.doneMsg = null;
        if (that.doneMsg == null && iGen >= that.maxGen) {
            that.doneMsg = "exceeded " + that.maxGen + " generations";
        }
        if (that.zBestPrev !== zBest) {
            that.zBestPrev = zBest;
            that.zBestPrevGen = iGen;
        }
		if (that.doneMsg == null && (iGen-that.genKeyGen+1 >= that.stableAge)) {
			that.doneMsg = "population stable for " + that.stableAge + " generations";
		}
        if (that.doneMsg == null && (iGen - that.zBestPrevGen+1 >= that.eliteAge)) {
            that.doneMsg = "elite survived " + that.eliteAge + " generations";
        }
		return that.doneMsg != null;
    };
	Focus.prototype.select = function(prevGen) {
        var that = this;
		var dz = that.dzPolyFit;
		var zBest = prevGen[0];
		var zWorst = prevGen[prevGen.length-1];
		var zBisect = Util.roundN((that.zLow+that.zHigh)/2,that.nPlaces);
		var zNew1 = Util.roundN(Evolve.mutate(zBisect, that.zLow, that.zHigh), that.nPlaces); 
		prevGen.push(zNew1);
		return prevGen;
	};
    Focus.prototype.breed = function(z1, z2) {
        var that = this;
        var kids = []; 
        if (z1 === z2) {
			// don't inbreed
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
			that.samples.push(imgRef.z);
            if (that.verbose) {
                console.log("Focus	:   IMG" + that.captureCount + "(" + z + ")" + 
					" sharp:" + that.round(imgRef.sharpness));
            }
        }
        return imgRef.sharpness;
    };
	Focus.prototype.polyFit = function(z1,z2,z3) {
        var that = this;
		var pts =[
			{x:z1, y:that.sharpness(z1)},
			{x:z2, y:that.sharpness(z2)},
			{x:z3, y:that.sharpness(z3)},
		];
		if (pts[0].y === pts[1].y && pts[0].y === pts[2].y) { // flat
			return (z1+z2+z3)/3;
		}
		return Util.criticalPoints(pts)[0];
	};
    Focus.prototype.sharpestZ = function() {
        var that = this;
        var evolve = new Evolve(that, {
            nSurvivors: that.nSurvivors,
			nFamilies: that.nFamilies,
			nElites:that.nElites,
        });
		var zDomain = that.zMax - that.zMin;
		var guess = [
			//that.round(that.zMin + zDomain * 1 / 5, that.nPlaces),
			//that.round(that.zMin + zDomain * 2 / 5, that.nPlaces),
			Util.roundN(that.zMin + zDomain * 1 / 3, that.nPlaces),
			//Util.roundN(that.zMin + zDomain * 1 / 2, that.nPlaces),
			Util.roundN(that.zMin + zDomain * 2 / 3, that.nPlaces),
			//that.round(that.zMin + zDomain * 3 / 5, that.nPlaces),
			//that.round(that.zMin + zDomain * 4 / 5, that.nPlaces),
		];
		that.samples = [];
        var vSolve = evolve.solve(guess);
        that.samples.sort();
		var dz = that.dzPolyFit;
        var zBest = vSolve[0];
		var zPolyFitLow = that.polyFit(zBest-dz-1, zBest-1, zBest+dz-1);
		var zPolyFitHigh = that.polyFit(zBest-dz+1, zBest+1, zBest+dz+1);
		var zPolyFitAvg = (zPolyFitLow+zPolyFitHigh)/2;
		var zPolyFit = that.polyFit(zBest-dz, zBest, zBest+dz);
		if (that.verbose) {
			console.log("Focus	: sharpestZ() " + that.doneMsg +
				" zBest:" + Util.roundN(zBest,that.nPlaces) +
				" zPolyFit:" + that.round(zPolyFit) +
				" zPolyFitAvg:" + that.round(zPolyFitAvg) +
				" samples:" + that.samples.length +
				"");
		}
        return {
            zBest: zBest,
			zPolyFit: zPolyFit,
			zPolyFitAvg: zPolyFitAvg,
			samples:that.samples
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
    it("sharpness(0) should compute the sharpness at {x:0,y:0,z:0}", function() {
        var captureOld = focus.captureCount;
        var sharpness = focus.sharpness(0);
        if (useMock) {
            should(sharpness).within(278.8, 278.9);
        }
        should(focus.captureCount).equal(captureOld + 1);
    });
    it("sharpness(-5) should capture an image at (0,0,-5) and return its sharpness", function() {
        var captureOld = focus.captureCount;
        var sharpness = focus.sharpness(-5);
        if (useMock) {
            should(sharpness).within(313.4, 313.5);
        }
        should(focus.captureCount).equal(captureOld + 1);
    });
    it("sharpness(-5) should only capture a coordinate once for sharpness", function() {
        var captureOld = focus.captureCount;
        var sharpness = focus.sharpness(-5);
        if (useMock) {
            should(sharpness).within(313.4, 313.5);
        }
        should(focus.captureCount).equal(captureOld);
    });
    it("sharpestZ() should calculate the Z-axis coordinate with the sharpest focus", function() {
		var epsilon = 0.6;
        this.timeout(50000);
        var captureOld = focus.captureCount;
        var result = focus.sharpestZ();
        if (useMock) {
            should(result.zBest).within(-19,-17);
            should(result.zPolyFit).within(-19-epsilon,-16+epsilon);
            should(result.zPolyFitAvg).within(-19-epsilon,-16+epsilon);
        }
        should(focus.captureCount - captureOld).below(50);
    });
});
