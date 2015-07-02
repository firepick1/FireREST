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
		that.eTheta = that.options.eTheta || 0;
		that.zStep = that.options.zStep || 10; // 10mm gives us reasonable perspective range mid-range
		that.zMin = that.options.zMin == null ? 0 : that.options.zMin;
		that.zMid = that.options.zMid == null ? -40 : that.options.zMid;
		that.zMax = that.options.zMax == null ? -50 : that.options.zMax;
		that.dc = new DeltaCalculator({
			eTheta1: that.eTheta,
			eTheta2: that.eTheta,
			eTheta3: that.eTheta,
		});

		// Options
        options = options || {};
		return that;
	}

	///////////////// INSTANCE  //////////////////
	DeltaCalibrator.prototype.gridAtZ = function(z) {
		var that = this;
		var imgRef = new ImageRef(0,0,z,{tag:"calibrateHome"});
		that.xyz.move(imgRef);
		imgRef = that.camera.capture(imgRef);
		var dx = that.ip.measureGrid(imgRef).grid.x;
		var dy = that.ip.measureGrid(imgRef).grid.y;
		return dx ? {z:z, dx:dx, dy:dy} : null;
	}
	DeltaCalibrator.prototype.calibrateHome_nominal = function() {
		var that = this;

		//var zMin = that.xyz.bounds.zMin+that.zStep; // camera likely useless at zMin
		//var zMax = that.xyz.bounds.zMax-that.zStep; // camera likely useless at zMax
		//zMin.should.below(zMax);
		//var zhalf = (zMin+zMax)/2;
		var nominal = {
			z1: that.zMin,
			z2: that.zMid,
			z3: that.zMax,
		};
		nominal.img1 = that.gridAtZ(nominal.z1);
		nominal.img2 = that.gridAtZ(nominal.z2);
		nominal.img3 = that.gridAtZ(nominal.z3);
		//while (!nominal.img3 && nominal.z2 < nominal.z3) {
			//nominal.z3 -= that.zStep;
			//nominal.img3 = that.gridAtZ(nominal.z3);
		//}
		nominal.a1 = that.dc.calcAngles({x:0,y:0,z:nominal.z1}).theta1;
		nominal.a2 = that.dc.calcAngles({x:0,y:0,z:nominal.z2}).theta1;
		nominal.a3 = that.dc.calcAngles({x:0,y:0,z:nominal.z3}).theta1;
		nominal.da31 = nominal.a3 - nominal.a1;
		nominal.da21 = nominal.a2 - nominal.a1;
		logger.trace("nominal:",nominal);

		return nominal; 
	}
	DeltaCalibrator.prototype.calibrateHome = function() {
		var that = this;
		var nominal = that.calibrateHome_nominal();

		var fitness = {evaluate:function(a1) {
			var z1 = that.dc.calcXYZ({theta1:a1,theta2:a1,theta3:a1}).z;
			var a2 = a1 + nominal.da21;
			var z2 = that.dc.calcXYZ({theta1:a2,theta2:a2,theta3:a2}).z;
			var a3 = a1 + nominal.da31;
			var z3 = that.dc.calcXYZ({theta1:a3,theta2:a3,theta3:a3}).z;
			var pv = new Perspective(nominal.img1.dx, z1, nominal.img2.dx, z2);
			var z3pv = pv.viewPosition(nominal.img3.dx);
			var dz = -Math.abs(z3pv - z3);
			logger.withPlaces(10).debug(
				" a1:", a1, 
				" z1:", z1, 
				" z2:", z2, 
				" z3:", z3, 
				" z3pv:", z3pv, 
				" dz:", dz
			);
			return dz;
		}};
		if (!nominal.img1) {
			logger.warn("calibrateHome() could not process grid image at z:", nominal.z1);
		} else if (!nominal.img2) {
			logger.warn("calibrateHome() could not process grid image at z:", nominal.z2);
		} else if (!nominal.img3) {
			logger.warn("calibrateHome() could not process grid image at z:", nominal.z3);
		} else {
			nominal.eTheta = null;
			var solver = new Maximizer(fitness, {
				//nPlaces: 3,
				logLevel:logger.logLevel,
				//dxPolyFit:true,
			});
			var thetaErr = 10;
			var thetaMin = nominal.a1-thetaErr;
			var thetaMax = nominal.a1+thetaErr;
			var rawResult = solver.solve(thetaMin, thetaMax);
			logger.debug("rawResult:", rawResult);
			nominal.eTheta = rawResult.xBest - nominal.a1;
		}
		return nominal;	
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
		logger.setLevel("debug");
		//fs.bounds.zMax = 30;
		//fs.bounds.zMin = fs.bounds.zMax-120;
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
		var cal = new DeltaCalibrator(fs, camera, {
			zMax: -00, // upper comparison point
			zMid: -40,
			zMin: -50, // lower comparison point
			imageProcessor: imgProc,
		});
		var result = cal.calibrateHome();
		//imgStore.serialize(fname); /* uncomment this line to save new values */
		logger.debug("calibrateHome(): ", result);
		should.exist(result.eTheta, "eTheta is null");
		result.eTheta.should.within(3.200,3.201);
		return result;
	});
});
