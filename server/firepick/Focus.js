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
        should(that.nPlaces).not.below(0);
        that.maxGen = options.maxGen || 30;
		that.nSurvivors = options.nSurvivors || 4;
		that.nFamilies = options.nFamilies || 1;
		that.tolerance = options.tolerance || 1;
		that.bestAge = options.bestAge || 10;
		that.stableAge = options.stableAge || 5;
		that.dzPolyFit = options.dzPolyFit || 3;
		that.logLevel = options.logLevel || "info";
        that.logTrace = that.logLevel === "trace";
        that.logDebug = that.logTrace || that.logLevel == "debug";

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
	Focus.prototype.imageRefAtZ = function(z) {
        var that = this;
        return that.xyzCam.imageRef({
            x: 0,
            y: 0,
            z: z
        });
	};
	Focus.prototype.evaluate = function(z) {
        var that = this;
		return that.sharpness(z);
	};
    Focus.prototype.sharpness = function(z) {
        var that = this;
        var imgRef = that.imageRefAtZ(z);
        if (!imgRef.exists() || imgRef.sharpness == null) {
            that.captureCount++;
            imgRef = that.xyzCam.moveTo(imgRef).capture();
            imgRef.sharpness = that.ip.sharpness(imgRef).sharpness;
			that.samples.push(imgRef.z);
            if (that.logTrace) {
                console.log("TRACE	:   IMG" + that.captureCount + "(" + z + ")" + 
					" sharp:" + that.round(imgRef.sharpness));
            }
        }
        return imgRef.sharpness;
    };
    Focus.prototype.sharpestZ = function() {
        var that = this;
		var captureOld = that.captureCount;
		var solver = new Maximizer(that, {
			nPlaces: that.nPlaces,
			logLevel:that.logLevel,
		});
		that.samples = [];
        var rawResult = solver.solve(that.zMin, that.zMax);
        that.samples.sort();
		var result = {
			zBest: rawResult.xBest,
			zPolyFit: rawResult.xPolyFit,
			zPolyFitAvg: rawResult.xPolyFitAvg,
			status: rawResult.status,
			samples: that.samples,
		};
		if (that.logDebug) {
			console.log("DEBUG	: sharpestZ() " + result.status +
				" zBest:" + Util.roundN(result.zBest,that.nPlaces) +
				" zPolyFit:" + that.round(result.zPolyFit) +
				" zPolyFitAvg:" + that.round(result.zPolyFitAvg) +
				" samples:" + result.samples.length +
				"");
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
		logLevel: "trace",
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
            should(result.zBest).within(-19,-17);
            should(result.zPolyFit).within(-19-epsilon,-16+epsilon);
            should(result.zPolyFitAvg).within(-19-epsilon,-16+epsilon);
        }
        should(focus.captureCount - captureOld).below(50);
    });
});
