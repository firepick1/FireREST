var should = require("should"),
    module = module || {},
    firepick = firepick || {};
firepick.ImageProcessor = require("./ImageProcessor");
firepick.ImageRef = require("./ImageRef");
firepick.XYZCamera = require("./XYZCamera");
Evolve = require("./Evolve");
FPD = require("./FPD");
Util = require("./Util");
Maximizer = require("./Maximizer");

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
        that.nPlaces.should.not.be.below(0);
		that.dzPolyFit = options.dzPolyFit;
		that.logLevel = options.logLevel || "info";
        that.logTrace = that.logLevel === "trace";
        that.logDebug = that.logTrace || that.logLevel == "debug";

		that.samples = {};
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
	Focus.prototype.imageRefAtZ = function(z) {
        var that = this;
        return that.xyzCam.imageRef({
            x: 0,
            y: 0,
            z: z,
			//tag: "calibration",
        });
	};
    Focus.prototype.sharpness = function(z) {
        var that = this;
        var imgRef = that.imageRefAtZ(z);
		that.samples[z] = imgRef;
        if (!imgRef.exists() || imgRef.sharpness == null) {
            that.captureCount++;
            //imgRef = that.xyzCam.moveTo(imgRef).capture("calibration");
            imgRef = that.xyzCam.moveTo(imgRef).capture();
            imgRef.sharpness = that.ip.sharpness(imgRef).sharpness;
            if (that.logDebug) {
                console.log("DEBUG	:   IMG(" + z + ")" + 
					" sharp:" + that.round(imgRef.sharpness) + " [" + that.captureCount + "]");
            }
        }
        return imgRef.sharpness;
    };
    Focus.prototype.sharpestZ = function() {
        var that = this;
		var captureOld = that.captureCount;
		var fitness = {evaluate:function(z) {
			return that.sharpness(z);
		}};
		var solver = new Maximizer(fitness, {
			nPlaces: that.nPlaces,
			logLevel:that.logLevel,
			dxPolyFit:that.dzPolyFit,
		});
		that.samples = {};
        var rawResult = solver.solve(that.zMin, that.zMax);
		var result = {
			zBest: rawResult.xBest,
			status: rawResult.status,
			samples: [],
		};
		if (that.dzPolyFit == null || that.dzPolyFit != 0) {
			result.zPolyFit = that.round(rawResult.xPolyFit);
			result.zPolyFitAvg = that.round(rawResult.xPolyFitAvg);
		}
		for (var k in that.samples) {
			result.samples.push(Number(k));
		}
        result.samples.sort(function(a,b){
			return a-b;
		});
		if (that.logDebug) {
			console.log("DEBUG	: sharpestZ():" + JSON.stringify(result));
		}
		return result;
    };
	Focus.prototype.bisectThreshold = function(zBelow, zAbove, threshold) {
		var that = this;
		var zBisect = Util.roundN((zBelow+zAbove)/2, that.nPlaces);
		if (zBisect === zAbove || zBisect === zBelow) {
			return zAbove;
		}
		var sharpBisect = that.sharpness(zBisect);
		if (sharpBisect >= threshold) {
			return that.bisectThreshold(zBelow, zBisect, threshold);
		} else {
			return that.bisectThreshold(zBisect, zAbove, threshold);
		}
	};
	Focus.prototype.focalRange = function(threshold) {
		var that = this;
		threshold.should.be.a.Number;
		threshold.should.be.above(0);
		threshold.should.be.below(1);
		var peak = that.sharpestZ();
		var zBest = peak.zBest;
		var sharpMax = that.sharpness(zBest);
		var sharpThreshold = sharpMax * threshold;
		var zLow = zBest;
		var iLow;
		var zHigh = zBest;
		var iHigh;
		for (var i=0; i < peak.samples.length; i++) {
			var z = peak.samples[i];
			var zSharp = that.sharpness(z);
			if (z < zLow && sharpThreshold < zSharp) {
				zLow = z;
				iLow = i;
			}
			if (zHigh < z && sharpThreshold < zSharp) {
				zHigh = z;
				iHigh = i;
			}
		}
		if (iLow > 0) {
			zLow = that.bisectThreshold(peak.samples[iLow-1], zLow, sharpThreshold);
		} else {
			zLow = that.bisectThreshold(that.zMin, zLow, sharpThreshold);
		}
		if (iHigh+1 < peak.samples.length) {
			zHigh = that.bisectThreshold(peak.samples[iHigh+1],zHigh,sharpThreshold);
		} else {
			zHigh = that.bisectThreshold(that.zMax,zHigh,sharpThreshold);
		}
		var result = {
			zLow: zLow,
			zHigh: zHigh,
			zBest: zBest,
			sharpness:{min:that.round(sharpThreshold), max:that.round(sharpMax)},
		};
		if (peak.zPolyFit) {
			result.zPolyFit = peak.zPolyFit;
			result.zPolyFitAvg = peak.zPolyFitAvg;
		}
		if (that.logDebug) {
			console.log("DEBUG	: focalRange(" + threshold + "):" + JSON.stringify(result));
		}
		return result;
	};

    console.log("LOADED	: firepick.Focus");
    module.exports = firepick.Focus = Focus;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.Focus", function() {
    var ip = new firepick.ImageProcessor();
    var fpd = new FPD();
    var useMock = fpd.health() < 1;
    var mockXYZCam = new firepick.XYZCamera(); // mock images
    var xyzCam = useMock ? mockXYZCam : fpd;
    var focus = new firepick.Focus(xyzCam, -110, 20, {
		logLevel: "debug",
		dzPolyFit: 0,
	});
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
            should(result.zBest).within(-19,-16);
			if (focus.dzPolyFit == null) {
				should(result.zPolyFit).within(-19-epsilon,-16+epsilon);
				should(result.zPolyFitAvg).within(-19-epsilon,-16+epsilon);
			}
        }
        should(focus.captureCount - captureOld).below(30);
    });
	it("focalRange(threshold) should calculate the Z-axis focal range", function() {
		this.timeout(50000);
		var result = focus.focalRange(0.7);
		should(result).have.properties(["zLow","zHigh","zBest", "sharpness"]);
		if (useMock) {
			should(result.zLow).within(-34,-34);
			should(result.zHigh).within(5,5);
		}
		should(result.sharpness).have.properties(["min","max"]);
		result.sharpness.min.should.be.a.Number;
		result.sharpness.max.should.be.a.Number;
		result.sharpness.min.should.be.below(result.sharpness.max);
	});
});
