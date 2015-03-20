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
    function FeedRate(xyzCam, feedMin, feedMax, options) {
        var that = this;

        XYZCamera.isInterfaceOf(xyzCam);
        that.xyzCam = xyzCam;
        should(feedMax).be.a.Number;
        should(feedMin).be.a.Number;
        should(feedMin).be.below(feedMax);
		should(feedMin).be.above(0);
        that.feedMin = feedMin;
        that.feedMax = feedMax;

		// Options
        options = options || {};
        that.nPlaces = options.nPlaces || 0;
        that.nPlaces.should.not.be.below(0);
		that.zMax = options.zMax || 0;
		that.xHome = options.xHome || 0;
		that.xFar = options.xFar || 75;
		that.yHome = options.yHome || 0;
		that.yFar = options.yFar || 75;
		that.pathIterations = options.pathIterations || 5;
		that.pathSteps = options.pathSteps || 4;
		that.ip = options.imageProcessor || new ImageProcessor(options);
		that.scale = options.scale || 60; // mm/s
		that.maxPSNR = 50;
		var basis = options.basis || {
			x:options.xHome == null ? 0 : options.xHome,
			y:options.yHome == null ? 0 : options.yHome,
			z:options.zMin == null ? -50 : options.zMin,
		};
		that.basis = ImageRef.copy(basis);
		that.logger = options.logger || new Logger(options);

		that.samples = {};
        that.captureCount = 0;
        return that;
    };

    /////////////// INSTANCE ////////////
	FeedRate.prototype.round = function(value) { 
        var that = this;
		var nPlaces = that.nPlaces + 1;
		nPlaces.should.be.equal(1);
		return Util.roundN(value, nPlaces); // reporting precision
	};
	FeedRate.prototype.testPathA = function(i) {
		var that = this;
		var N = that.pathSteps+i;
		var xStep = (that.xFar-that.basis.x)/N;
		var yStep = (that.yFar-that.basis.y)/N;
		var zStep = (that.zMax-that.basis.z)/N;
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
	FeedRate.prototype.evaluate = function(feedRate) {
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
			that.testPathA(i);
			var imgRef = that.xyzCam.capture("feedrate"+i, feedRate);
			var q;
			result = that.ip.PSNR(that.basis, imgRef);
			var psnr = result.PSNR;
			var sameness = psnr === "SAME" ? that.maxPSNR : Math.min(that.maxPSNR, (psnr || 0));
			q = feedRate /that.feedMax + sameness;
			result.offset = that.ip.calcOffset(that.basis, imgRef);
			if (result.offset["0"] && result.offset["0"].match) {
				quality += q; // ignore samples with no offset
			}
			that.logger.trace("evaluate(",feedRate,") result:",result, " q:", q);
		}
		that.logger.debug("evaluate(",feedRate,") result:",result, " quality:", quality);
		that.samples[feedRate] = quality;
		return quality;
	};
    FeedRate.prototype.maxFeedRate = function() {
        var that = this;
		var captureOld = that.captureCount;
		var fitness = {evaluate:function(feedRate) {
			return that.evaluate(feedRate*that.scale);
		}};
		var solver = new Maximizer(fitness, {
			nPlaces: that.nPlaces,
			logger:that.logger,
			dxPolyFit:0,
		});
		that.samples = {};
        var rawResult = solver.solve(that.feedMin/that.scale, that.feedMax/that.scale);
		var feedRate = rawResult.xBest * that.scale;
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

    console.log("LOADED	: firepick.FeedRate");
    module.exports = firepick.FeedRate = FeedRate;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.FeedRate", function() {
	var mock = {};
	logger = new Logger();
	(function(mock) {
		function MockXYZCamera(basis) {
			var that = this;
			that.xyzCam = new XYZCamera();
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

    var fpd = new FPD();
    var useMock = fpd.health() < 1;
	var basis = {x:0,y:0,z:-40};
    var mockXYZCam = new mock.MockXYZCamera({basis:basis});
    var xyzCam = useMock ? mockXYZCam : fpd;
    var feedRate = new firepick.FeedRate(xyzCam, 
		useMock ? 1000 : 1000, useMock ? 10000 : 25000 , {
		logLevel:"trace",
		imageProcessor: new ImageProcessor(),
		basis:basis,
	});
    it("maxFeedRate() should calculate the maximum feed rate", function() {
        this.timeout(25*60000);
		var epsilon = 0.6;
        var captureOld = feedRate.captureCount;
        var result = feedRate.maxFeedRate();
		should(result.feedRate).within(1000, 20000);
        if (useMock) {
            should(result.feedRate).within(5880, 6000);
        }
    });
});
