var should = require("should"),
    module = module || {},
    firepick = firepick || {};
ImageProcessor = require("./ImageProcessor");
ImageRef = require("./ImageRef");
XYZCamera = require("./XYZCamera");
Util = require("./Util");
Logger = require("./Logger");
FireStep = require("./FireStep");
Perspective = require("./Perspective");

(function(firepick) {
	var logger = new Logger();

    function DeltaCalibrator(xyz, camera, options) {
        var that = this;

        XYZPositioner.validate(xyz);
		Camera.validate(camera);
		that.options = options || {};
		that.ip = that.options.imageProcessor || new ImageProcessor();
        that.xyz = xyz;
		that.camera = camera;
		that.imgProc = that.options.imageProcessor || new ImageProcessor();

		// Options
        options = options || {};
		return that;
	}

	///////////////// INSTANCE  //////////////////
	DeltaCalibrator.prototype.dxAtZ = function(z) {
		var that = this;
		var imgRef = new ImageRef(0,0,z,{tag:"calibrateHome"});
		that.xyz.move(imgRef);
		imgRef = that.camera.capture(imgRef);
		var dx = that.ip.measureGrid(imgRef).grid.x;
		return dx ? {z:z, dx:dx} : null;
	}
	DeltaCalibrator.prototype.calibrateHome = function() {
		var that = this;
		var result;
		var zStep = 10; // 10mm gives us reasonable perspective range mid-range
		var zMin = that.xyz.bounds.zMin+zStep; // camera likely useless at zMin
		var zMax = that.xyz.bounds.zMax-zStep; // camera likely useless at zMax
		zMin.should.below(zMax);
		var zHalf = (zMin+zMax)/2;
		var mHalf = that.dxAtZ(zHalf);
		var mLow = that.dxAtZ(zHalf-zStep);
		var pv = new Perspective(mLow.dx, mLow.z, mHalf.dx, mHalf.z);
		var z = Math.min(zMax, zHalf+6*zStep);
		var mHigh = that.dxAtZ(z);
		while (!mHigh && zHalf < z) {
			z -= zStep;
			mHigh = that.dxAtZ(z);
			logger.debug(" mHigh:", mHigh);
		}
		var zHigh = pv.viewPosition(mHigh.dx);
		logger.info("zHigh:", zHigh, " mHigh:", mHigh, " mHalf:", mHalf, " mLow:", mLow);
	}
	
	///////////////// CLASS //////////////////
	DeltaCalibrator.logger = logger;

    Logger.logger.info("loaded firepick.DeltaCalibrator");
    module.exports = firepick.DeltaCalibrator = DeltaCalibrator;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.DeltaCalibrator", function() {
	var DeltaCalibrator = firepick.DeltaCalibrator;
	var logLevel = "info";
	var logger = DeltaCalibrator.logger;
	var camera = new Camera();
	var fs = new FireStep();
	
	it("should calibrate a FireStep delta machine with a camera", function() {
		var cal = new DeltaCalibrator(fs, camera);
		cal.camera.should.equal(camera);
		cal.xyz.should.equal(fs);
	});
	it("TESTTESTcalibrateHome() should measure the delta homing error", function() {
		// https://github.com/firepick1/fpd-vision/tree/master/XP008-Homing-Error
		var fname = "test/DeltaCalibrator_calibrateHome.json";
		//this.timeout(10000);
		fs.bounds.zMax = 20;
		fs.bounds.zMin = -100;
		camera.pushMock("test/XP005_Z-100X0Y0@1#1.jpg");
		camera.pushMock("test/XP005_Z-090X0Y0@1#1.jpg");
		camera.pushMock("test/XP005_Z-080X0Y0@1#1.jpg");
		camera.pushMock("test/XP005_Z-070X0Y0@1#1.jpg");
		camera.pushMock("test/XP005_Z-060X0Y0@1#1.jpg");
		camera.pushMock("test/XP005_Z-050X0Y0@1#1.jpg");
		camera.pushMock("test/XP005_Z-040X0Y0@1#1.jpg");
		camera.pushMock("test/XP005_Z-030X0Y0@1#1.jpg");
		camera.pushMock("test/XP005_Z-020X0Y0@1#1.jpg");
		camera.pushMock("test/XP005_Z-010X0Y0@1#1.jpg");
		camera.pushMock("test/XP005_Z0X0Y0@1#1.jpg");
		camera.pushMock("test/XP005_Z10X0Y0@1#1.jpg");
		camera.pushMock("test/XP005_Z20X0Y0@1#1.jpg");
		var imgStore = new ImageStore(camera);
		imgStore.deserialize(fname);
		var imgProc = new ImageProcessor({imageStore:imgStore});
		var cal = new DeltaCalibrator(fs, camera, {imageProcessor: imgProc});
		cal.calibrateHome();
		//imgStore.serialize(fname);
	});
});
