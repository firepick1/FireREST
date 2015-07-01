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
Maximizer = require("./Maximizer");

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
		var dc = new DeltaCalculator();
		var result;

		var zStep = 10; // 10mm gives us reasonable perspective range mid-range
		var zMin = that.xyz.bounds.zMin+zStep; // camera likely useless at zMin
		var zMax = that.xyz.bounds.zMax-zStep; // camera likely useless at zMax
		zMin.should.below(zMax);

		var zhalf = (zMin+zMax)/2;
		var nominal = {
			z1: zhalf-zStep,
			z2: zhalf,
			z3: Math.min(zMax, zhalf+6*zStep),
		};
		var img1 = that.dxAtZ(nominal.z1);
		var img2 = that.dxAtZ(nominal.z2);
		var img3 = that.dxAtZ(nominal.z3);
		while (!img3 && nominal.z2 < nominal.z3) {
			nominal.z3 -= zStep;
			img3 = that.dxAtZ(nominal.z3);
			logger.debug(" img3:", img3);
		}
		nominal.a1 = dc.calcAngles({x:0,y:0,z:nominal.z1}).theta1;
		nominal.a2 = dc.calcAngles({x:0,y:0,z:nominal.z2}).theta1;
		nominal.a3 = dc.calcAngles({x:0,y:0,z:nominal.z3}).theta1;
		nominal.da31 = nominal.a3 - nominal.a1;
		nominal.da21 = nominal.a2 - nominal.a1;

		var fitness = {evaluate:function(a1) {
			var z1 = dc.calcXYZ({theta1:a1,theta2:a1,theta3:a1}).z;
			var a2 = a1 + nominal.da21;
			var z2 = dc.calcXYZ({theta1:a2,theta2:a2,theta3:a2}).z;
			var a3 = a1 + nominal.da31;
			var z3 = dc.calcXYZ({theta1:a3,theta2:a3,theta3:a3}).z;
			var pv = new Perspective(img1.dx, z1, img2.dx, z2);
			var z3pv = pv.viewPosition(img3.dx);
			var dz = -Math.abs(z3pv - z3);
			logger.withPlaces(10).info(
				" a1:", a1, 
				" z1:", z1, 
				" z2:", z2, 
				" z3:", z3, 
				" z3pv:", z3pv, 
				" dz:", dz
			);
			return dz;
		}};
		var solver = new Maximizer(fitness, {
			nPlaces: 2,
			logLevel:"debug",
			////dxPolyFit:that.dzPolyFit,
		});
		var thetaErr = 10;
		var thetaMin = nominal.a1-thetaErr;
		var thetaMax = nominal.a1+thetaErr;
        var rawResult = solver.solve(thetaMin, thetaMax);
		logger.info("rawResult:", rawResult, " nominal:", nominal);
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
