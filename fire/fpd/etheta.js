#! /usr/local/bin/node

console.log("SCRIPT	: etheta.js");
console.log("HELP	: computes FirePick Delta global homing angle error");

var jslib = "../../server/firepick";
DeltaCalibrator = require(jslib + "/DeltaCalibrator");

var fireStep = new FireStep();
var camera = new Camera();
var calib = new DeltaCalibrator(fireStep, camera);

var logger = DeltaCalibrator.logger;
var fname = "test/DeltaCalibrator_calibrateHome.json";

logger.setLevel("debug");
fireStep.bounds.zMax = 10;
fireStep.bounds.zMin = -110;
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
var cal = new DeltaCalibrator(fireStep, camera, {
	imageProcessor: imgProc,
});
var result = cal.calibrateHome();
logger.debug("calibrateHome(): ", result);
