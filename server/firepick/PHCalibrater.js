var should = require("should"),
    module = module || {},
    firepick = firepick || {};
ImageProcessor = require("./ImageProcessor");
ImageRef = require("./ImageRef");
XYZCamera = require("./XYZCamera");
ImageRef = require("./ImageRef");
FPD = require("./FPD");
Util = require("./Util");
Maximizer = require("./Maximizer");
Logger = require("./Logger");
PHCurve = require("./PHCurve");
PHFeed = require("./PHFeed");
Complex = require("./Complex");

(function(firepick) {
	var SECONDS_PER_MINUTE = 60;
    function PHCalibrater(xyzCam, options) {
        var that = this;

        XYZCamera.isInterfaceOf(xyzCam);
        that.xyzCam = xyzCam;

		// Options
        options = options || {};
        that.feedMin = options.feedMin || 1000;
        that.feedMax = options.feedMax || 20000;
        that.feedMax.should.be.a.Number;
        that.feedMin.should.be.a.Number;
        that.feedMin.should.be.below(that.feedMax);
		that.feedMin.should.be.above(0);
		that.nInterpolate = options.nInterpolate || 9;
		that.nInterpolate.should.be.above(1);
        that.nPlaces = options.nPlaces || 0;
        that.nPlaces.should.not.be.below(0);
		that.xBasis = options.xBasis == null ? 0 : options.xBasis;
		that.yBasis = options.yBasis == null ? 0 : options.yBasis;
		that.zBasis = options.zBasis == null ? -50 : options.zBasis;
		that.xFar = options.xFar == null ? 90 : options.xFar;
		that.yFar = options.yFar == null ? 90 : options.yFar;
		that.zFar = options.zFar == null ? 0 : options.zFar;
		that.minInterpolate = options.minInterpolate || 5;
		that.maxInterpolate = options.maxInterpolate || 200;
		that.pathIterations = options.pathIterations || 6;
		that.pathIterations.should.be.above(0);
		that.ip = options.imageProcessor || new ImageProcessor(options);
		that.feedRateResolution = options.feedRateResolution || 60; // mm/s
		that.maxPSNR = options.maxPSNR || 50;
		that.minPSNR = options.minPSNR || 24;
		that.maxPSNR.should.be.above(that.minPSNR);
		that.minPSNR.should.be.above(0);
		that.basis = ImageRef.copy({
			x:that.xBasis,
			y:that.yBasis,
			z:that.zBasis,
		});
		that.logger = options.logger || new Logger(options);

		that.phpath = [
			new PHCurve([
				new Complex(0,0),
				new Complex(that.xFar, that.yFar),
			]),
			new PHCurve([
				new Complex(that.xFar, that.yFar),
				new Complex(-that.xFar, -that.yFar),
			]),
			new PHCurve([
				new Complex(-that.xFar, -that.yFar),
				new Complex(0,0),
			]),
		];
		that.samples = {};
        that.captureCount = 0;
        return that;
    };

    /////////////// INSTANCE ////////////
	PHCalibrater.prototype.round = function(value) { 
        var that = this;
		var nPlaces = that.nPlaces + 1;
		nPlaces.should.be.equal(1);
		return Util.roundN(value, nPlaces); // reporting precision
	};
	PHCalibrater.prototype.testPHFeed = function(phf) {
		var that = this;
		var N = that.nInterpolate;
		var rows = phf.interpolate({n:N});
		var path = [];
		for (var i=0; i < rows.length; i++) {
			var row = rows[i];
			path.push({
				x:row.r.re,
				y:row.r.im,
				feedRate: row.dsdt*SECONDS_PER_MINUTE,
			});
			that.logger.trace("path[", i, "] ", path[i]);
		}
		that.xyzCam.move(path);
		return null;
	};
	PHCalibrater.prototype.testPath = function(i,feedRate) {
		var that = this;
		for (var j=0; j < that.phpath.length; j++) {
			var phf = new PHFeed(that.phpath[j], {vMax:feedRate/SECONDS_PER_MINUTE, tvMax:1});
			that.testPHFeed(phf);
		}
	};
	PHCalibrater.prototype.evaluate = function(feedRate) {
		var that = this;
		if (that.samples[feedRate] != null) {
			return that.samples[feedRate];
		}
		that.xyzCam.setFeedRate(that.feedMin);
		that.xyzCam.origin(); // recalibrate
		that.xyzCam.moveTo(that.basis);
		that.basis = that.xyzCam.capture("PHCalibrater-basis");
		that.xyzCam.setFeedRate(feedRate);
		var quality = 0;
		var result;
		for (var i = 0; i < that.pathIterations; i++) {
			that.testPath(i,feedRate);
			var imgRef = that.xyzCam.capture("PHCalibrater"+i, feedRate);
			var q;
			result = that.ip.PSNR(that.basis, imgRef);
			var psnr = result.PSNR;
			var sameness = psnr === "SAME" ? that.maxPSNR : Math.min(that.maxPSNR, (psnr || 0));
			q = feedRate /that.feedMax + sameness;
			result.offset = that.ip.calcOffset(that.basis, imgRef);
			if (result.offset["0"] && result.offset["0"].match) {
				that.logger.debug("evaluate(",feedRate,") result:",result, " q:", q);
				quality += q; // ignore samples with no offset
			} else {
				quality = 0;
				that.logger.debug("evaluate(",feedRate,") result:",result, " feedRate REJECTED");
				break;
			}
		}
		quality = quality/that.pathIterations;
		that.logger.debug("evaluate(",feedRate,") quality:", quality);
		that.samples[feedRate] = quality;
		return quality;
	};
    PHCalibrater.prototype.maxFeedRate = function() {
        var that = this;
		var captureOld = that.captureCount;
		var fitness = {evaluate:function(feedRate) {
			return that.evaluate(feedRate*that.feedRateResolution);
		}};
		var solver = new Maximizer(fitness, {
			nPlaces: that.nPlaces,
			logger:that.logger,
			dxPolyFit:0,
			pinLow: true,
		});
		that.samples = {};
        var rawResult = solver.solve(that.feedMin/that.feedRateResolution, that.feedMax/that.feedRateResolution);
		var feedRate = rawResult.xBest * that.feedRateResolution;
		var result = {
			feedRate: feedRate,
			status: rawResult.status,
			samples: that.samples,
		};
		var nSamples = 0;
		for (var k in that.samples) {
			if (that.samples.hasOwnProperty(k)) {
				nSamples++;
			}
		}
		that.logger.debug("maxFeedRate() => ", feedRate, " samples:", nSamples);
		return result;
    };

	///////////////// CLASS //////////////////

    Logger.logger.info("loaded firepick.PHCalibrater");
    module.exports = firepick.PHCalibrater = PHCalibrater;
})(firepick || (firepick = {}));

var mock = {};
(function(mock) {
	function MockXYZCamera(options) {
		var that = this;
		var basis = options.basis || {x:0,y:0,z:-50};
		that.xyzCam = new XYZCamera(options);
		that.goodRate = options.goodRate || 4400;
		that.basis = ImageRef.copy(basis);
		that.goodImage = ImageRef.copy(basis).setPath("test/XP005_Z0X0Y0@1#1.jpg");
		that.badImage = ImageRef.copy(basis).setPath("test/XP005_Z5X0Y0@1#1.jpg");
		return that;
	};

	/////////////// INSTANCE ////////////
	MockXYZCamera.prototype.capture = function(tag, version) {
		var that = this;
		if (that.xyzCam.feedRate > that.goodRate) {
			return that.badImage;
		}
		return that.goodImage;
	};
	MockXYZCamera.prototype.setFeedRate = function(feedRate) {
		var that = this;
		that.xyzCam.setFeedRate(feedRate);
		return that;
	};
	MockXYZCamera.prototype.origin = function() {
		var that = this;
		that.xyzCam.origin;
		return that;
	};
	MockXYZCamera.prototype.move = function(path) {
		var that = this;
		that.xyzCam.move(path);
		return that;
	};
	MockXYZCamera.prototype.moveTo = function(x,y,z) {
		var that = this;
		that.xyzCam.moveTo(x,y,z);
		return that;
	};
	MockXYZCamera.prototype.getXYZ = function() {
		var that = this;
		return that.xyzCam.getXYZ();
	};
	MockXYZCamera.prototype.imageRef = function(ref) {
		var that = this;
		return that.xyzCam.imageRef(ref);
	};

	mock.MockXYZCamera = MockXYZCamera;
})(mock);

(typeof describe === 'function') && describe("firepick.PHCalibrater", function() {
	var PHCalibrater = firepick.PHCalibrater;
	logger = new Logger({logLevel:"debug"});
    var fpd = new FPD();
    var useMock = fpd.health() < 1;
    var mockXYZCam = new mock.MockXYZCamera({
		logger:logger,
	});
	XYZCamera.isInterfaceOf(mockXYZCam);
    var xyzCam = useMock ? mockXYZCam : fpd;
	it("should have default options", function() {
		var phc = new PHCalibrater(xyzCam);
		phc.should.have.properties({
			xBasis:0,				// basis reference image x
			yBasis:0,				// basis reference image y
			zBasis:-50,				// basis reference image z
			xFar:90,				// farthest test path x
			yFar:90,				// farthest test path y
			zFar:0,					// farthest test path z
			feedMin:1000,			// minimum feed rate
			feedMax:20000,			// maximum feed rate
			minInterpolate:5,		// minimum interpolation segments per PHCurve
			maxInterpolate:200,		// maximum interpolation segments per PHCurve
			pathIterations: 6,		// number of paths tested per feed rate
			maxPSNR: 50,			// maximum power signal-to-noise ration
			minPSNR: 24,			// minimum acceptable PSNR ratio
			feedRateResolution: 60,	// minimum difference between testing feed rates
		});
	});
	it("TESTTESTevaluate(feedRate) should return the quality of a feed rate", function() {
		var N = 3;
		var phc = new PHCalibrater(xyzCam, {
			pathIterations: N,
			logger:logger,
		});
		this.timeout(25*60000);
		phc.evaluate(4400).should.within(24,50+1);
	});
	return;
    it("maxFeedRate() should calculate the maximum feed rate", function() {
		var phc = new PHCalibrater(xyzCam, {
			feedMin:useMock ? 1000 : 1000, 
			feedMax:useMock ? 10000 : 25000,
			logger:logger,
		});
        this.timeout(25*60000);
		var epsilon = 0.6;
        var captureOld = phc.captureCount;
        var result = phc.maxFeedRate();
		should(result.feedRate).within(1000, 20000);
        if (useMock) {
            should(result.feedRate).within(5500, 6000);
        }
    });
});
