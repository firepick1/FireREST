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
        that.maxGenerations = options.maxGenerations || 30;
		that.nBreeders = options.nBreeders || 4;
		that.nFamilies = options.nFamilies || 1;
		that.nElites = options.nElites || (that.nBreeders);
		that.tolerance = options.tolerance || 1;
		that.eliteAge = options.eliteAge || 8;
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
    Focus.prototype.isDone = function(iGen, curGen) {
        var that = this;
        var zBest = curGen[0];
        var zWorst = curGen[curGen.length - 1];
        var zDiff = Math.abs(zWorst - zBest);
		var zGuess;
		var zPolyFit;
		if (curGen.length >= 3) {
			zGuess = that.polyFit(curGen[0],curGen[1],curGen[2]);
			if (zDiff <= 2*that.dzPolyFit) {
				var dz = that.dzPolyFit + (iGen%2);
				zPolyFit = that.polyFit(zBest-dz, zBest, zBest+dz);
			}
		}
		if (that.verbose) {
			var msg = "Focus	: GEN_" + iGen + " " + JSON.stringify(curGen);
			msg += zGuess && " zGuess:" + that.round(zGuess) || "";
			msg += zPolyFit && " zPolyFit:" + that.round(zPolyFit) || "";
			console.log(msg);
		}
        if (iGen === 0) {
            that.zLow = that.zMin;
            that.zHigh = that.zMax;
        } else {
            if (zBest < zWorst) {
                that.zHigh = zWorst; // no need to look above zWorst
                for (var i = 0; i < curGen.length; i++) {
                    that.zHigh = Math.max(that.zHigh, curGen[i]);
                }
            } else if (zBest > zWorst) {
				that.zLow = zWorst; // no need to look below zWorst
                for (var i = 0; i < curGen.length; i++) {
                    that.zLow = Math.min(that.zLow, curGen[i]);
                }
            }
        }
		that.doneMsg = null;
        if (that.doneMsg == null && iGen >= that.maxGenerations) {
            that.doneMsg = "exceeded " + that.maxGenerations + " generations";
        }
        //if (that.doneMsg == null && zGuess && zDiff <= that.tolerance) { // candidates roughly same
         //   that.doneMsg = "|zWorst-zBest| <= " + that.tolerance;
        //}
        if (that.zBestPrev !== zBest) {
            that.zBestPrev = zBest;
            that.zBestPrevGen = iGen;
        }
        if (that.doneMsg == null && zGuess && (iGen - that.zBestPrevGen+1 >= that.eliteAge)) {
            that.doneMsg = "elite survived " + that.eliteAge + " generations";
        }
		return that.doneMsg != null;
    };
	Focus.prototype.select = function(prevGen) {
		return prevGen;
	};
    Focus.prototype.breed = function(z1, z2) {
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
            nBreeders: that.nBreeders,
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
        var zBest = vSolve[0];
		var zPolyFit = that.polyFit(zBest-that.dzPolyFit, zBest, zBest+that.dzPolyFit);
		if (that.verbose) {
			console.log("Focus	: sharpestZ() " + that.doneMsg +
				" zBest:" + that.round(zBest) +
				" zPolyFit:" + that.round(zPolyFit) +
				"");
		}
        return {
            zBest: zBest,
			zPolyFit: zPolyFit,
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
            should(result.zPolyFit).within(-17-epsilon,-17+epsilon);
        }
        should(focus.captureCount - captureOld).below(50);
    });
});
