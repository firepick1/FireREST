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

(function(firepick) {
    function FeedRateCalibrater(xyzCam, options) {
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
        that.nPlaces = options.nPlaces || 0;
        that.nPlaces.should.not.be.below(0);
		that.xBasis = options.xBasis == null ? 0 : options.xBasis;
		that.yBasis = options.yBasis == null ? 0 : options.yBasis;
		that.zBasis = options.zBasis == null ? -50 : options.zBasis;
		that.xFar = options.xFar == null ? 90 : options.xFar;
		that.yFar = options.yFar == null ? 90 : options.yFar;
		that.zFar = options.zFar == null ? 0 : options.zFar;
		that.pathIterations = options.pathIterations || 6;
		that.pathIterations.should.be.above(0);
		that.pathMinSteps = options.pathMinSteps || 3;
		that.pathMinSteps.should.be.above(0);
		that.ip = options.imageProcessor || new ImageProcessor(options);
		that.resolution = options.resolution || 60; // mm/s
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

		that.samples = {};
        that.captureCount = 0;
        return that;
    };

    /////////////// INSTANCE ////////////
	FeedRateCalibrater.prototype.round = function(value) { 
        var that = this;
		var nPlaces = that.nPlaces + 1;
		nPlaces.should.be.equal(1);
		return Util.roundN(value, nPlaces); // reporting precision
	};
	FeedRateCalibrater.prototype.testPathA = function(i) {
		var that = this;
		var N = that.pathMinSteps+i;
		var xStep = (that.xFar-that.basis.x)/N;
		var yStep = (that.yFar-that.basis.y)/N;
		var zStep = (that.zFar-that.basis.z)/N;
		for (var i=1; i<=N; i++) {
			that.xyzCam.moveTo({
				x:that.basis.x + i*xStep,
				z:that.basis.z + i*zStep
			}); 
		}
		for (var i=1; i<=N; i++) {
			that.xyzCam.moveTo({
				y:that.basis.y + i*yStep,
			}); 
		}
		that.xyzCam.moveTo(that.basis);
	};
	FeedRateCalibrater.prototype.testPathB = function(i) {
		var that = this;
		var N = Util.fibonacci(i+2);
		var dx = (that.xFar-that.basis.x)/N;
		var dy = (that.yFar-that.basis.y)/N;
		var dz = (that.zFar-that.basis.z)/N;
		var nSteps = Math.max(that.pathMinSteps,5);
		var xStep = dx/nSteps;
		var yStep = dy/nSteps;
		var zStep = dz/nSteps;
		for (var i=1; i<=nSteps; i++) {
			that.xyzCam.moveTo({
				x:that.basis.x + i*xStep,
				z:that.basis.z + i*zStep
			}); 
		}
		for (var i=1; i<=nSteps; i++) {
			that.xyzCam.moveTo({
				y:that.basis.y + i*yStep,
			}); 
		}
		that.xyzCam.moveTo(that.basis);
	};
	FeedRateCalibrater.prototype.testPathC = function(i) {
		var that = this;
		that.fibStart = that.fibStart || 2;
		while (Util.fibonacci(that.fibStart) < that.pathMinSteps) {
			that.fibStart++;
		}
		var N = Util.fibonacci(that.fibStart+i);
		var xStep = (that.xFar-that.basis.x)/N;
		var yStep = (that.yFar-that.basis.y)/N;
		var zStep = (that.zFar-that.basis.z)/N;
		for (var i=1; i<=N; i++) {
			that.xyzCam.moveTo({
				x:that.basis.x + i*xStep,
				z:that.basis.z + i*zStep
			}); 
		}
		for (var i=1; i<=N; i++) {
			that.xyzCam.moveTo({
				y:that.basis.y + i*yStep,
			}); 
		}
		that.xyzCam.moveTo(that.basis);
	};
	FeedRateCalibrater.prototype.evaluate = function(feedRate) {
		var that = this;
		if (that.samples[feedRate] != null) {
			return that.samples[feedRate];
		}
		that.xyzCam.setFeedRate(that.feedMin);
		that.xyzCam.origin(); // recalibrate
		that.xyzCam.moveTo(that.basis);
		that.basis = that.xyzCam.capture("feedrate-basis");
		that.xyzCam.setFeedRate(feedRate);
		var quality = 0;
		var result;
		for (var i = 0; i < that.pathIterations; i++) {
			that.testPathC(i);
			var imgRef = that.xyzCam.capture("feedrate"+i, feedRate);
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
				that.logger.debug("evaluate(",feedRate,") result:",result, " FEEDRATE REJECTED");
				break;
			}
		}
		that.logger.debug("evaluate(",feedRate,") quality:", quality);
		that.samples[feedRate] = quality;
		return quality;
	};
    FeedRateCalibrater.prototype.maxFeedRate = function() {
        var that = this;
		var captureOld = that.captureCount;
		var fitness = {evaluate:function(feedRate) {
			return that.evaluate(feedRate*that.resolution);
		}};
		var solver = new Maximizer(fitness, {
			nPlaces: that.nPlaces,
			logger:that.logger,
			dxPolyFit:0,
			pinLow: true,
		});
		that.samples = {};
        var rawResult = solver.solve(that.feedMin/that.resolution, that.feedMax/that.resolution);
		var feedRate = rawResult.xBest * that.resolution;
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

    Logger.logger.info("loaded firepick.FeedRateCalibrater");
    module.exports = firepick.FeedRateCalibrater = FeedRateCalibrater;
})(firepick || (firepick = {}));

var mock = {};
(function(mock) {
	function MockXYZCamera(options) {
		var that = this;
		var basis = options.basis || {x:0,y:0,z:-50};
		that.xyzCam = new XYZCamera(options);
		that.basis = ImageRef.copy(basis);
		that.goodImage = ImageRef.copy(basis).setPath("test/XP005_Z0X0Y0@1#1.jpg");
		that.badImage = ImageRef.copy(basis).setPath("test/XP005_Z5X0Y0@1#1.jpg");
		return that;
	};

	/////////////// INSTANCE ////////////
	MockXYZCamera.prototype.capture = function(tag, version) {
		var that = this;
		if (that.xyzCam.feedRate > 6000) {
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

(typeof describe === 'function') && describe("firepick.FeedRateCalibrater", function() {
	var FeedRateCalibrater = firepick.FeedRateCalibrater;
	var logLevel = "info";
	logger = new Logger({logLevel:logLevel});
    var fpd = new FPD();
    var useMock = true; // fpd.health() < 1;
    var mockXYZCam = new mock.MockXYZCamera({
		logger:logger,
	});
    var xyzCam = useMock ? mockXYZCam : fpd;
	it("should have default options", function() {
		var frdefault = new FeedRateCalibrater(xyzCam);
		frdefault.should.have.properties({
			xBasis:0,			// basis reference image x
			yBasis:0,			// basis reference image y
			zBasis:-50,			// basis reference image z
			xFar:90,			// farthest test path x
			yFar:90,			// farthest test path y
			zFar:0,				// farthest test path z
			feedMin:1000,		// minimum feed rate
			feedMax:20000,		// maximum feed rate
			pathIterations: 6,	// number of paths tested per feedrate
			pathMinSteps: 3,	// minimum number of steps per test path
			maxPSNR: 50,		// maximum power signal-to-noise ration
			minPSNR: 24,		// minimum acceptable PSNR ratio
			resolution: 60,		// minimum difference between testing feedrates
		});
	});
    it("maxFeedRate() should calculate the maximum feed rate", function() {
        this.timeout(25*60000);
		var fr = new FeedRateCalibrater(xyzCam, {
			feedMin:useMock ? 1000 : 1000, 
			feedMax:useMock ? 10000 : 25000,
			logLevel:logLevel,
			imageProcessor: new ImageProcessor(),
			pathIterations: 1,	// faster unit test
		});
		var epsilon = 0.6;
        var captureOld = fr.captureCount;
        var result = fr.maxFeedRate();
		should(result.feedRate).within(1000, 20000);
        if (useMock) {
            should(result.feedRate).within(5200, 6000);
        }
    });
});
