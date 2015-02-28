var should = require("should"),
    module = module || {},
    firepick = firepick || {};
var os = require("os"),
	fs = require("fs"),
	child_process = require("child_process"),
	path = require("path");
firepick.FireFUSECamera = require("./FireFUSECamera");
firepick.FireFUSEMarlin = require("./FireFUSEMarlin");
firepick.XYZPositioner = require("./XYZPositioner");
firepick.XYZCamera = require("./XYZCamera");
firepick.MockCamera = require("./MockCamera");
firepick.ImageRef = require("./ImageRef");

function isNumeric(obj) {
    return (obj - parseFloat(obj) + 1) >= 0;
}

(function(firepick) {
	function firesight(fname1, pipeline, args) {
		var cmd = "firesight -i " + fname1 + " -p server/json/" + pipeline + " " + args;
		//console.log(cmd);
		var out = child_process.execSync(cmd);
		return JSON.parse(out.toString());
	};
    function XYZCameraFactory(xyzPositioner, camera) {
        this.xyz = xyzPositioner || new firepick.XYZPositioner();
		should.ok(firepick.XYZPositioner.validate(this.xyz, "XYZCameraFactory(xyzPositioner)"));
		this.camera = camera || new firepick.MockCamera();
        return this;
    };
	XYZCameraFactory.create = function() {
		var xyz = new firepick.FireFUSEMarlin();
		if (!xyz.isAvailable()) {
			xyz = new firepick.XYZPositioner();
		}
		var camera = new firepick.FireFUSECamera();
		if (!camera.isAvailable()) {
			camera = new firepick.MockCamera([
				"test/camX0Y0Z0a.jpg",
				"test/camX1Y0Z0.jpg",
			]);
		}
		return new firepick.XYZCamera(xyz, camera);
	}
    console.log("LOADED	: firepick.XYZCameraFactory");
    module.exports = firepick.XYZCameraFactory = XYZCameraFactory;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.XYZCameraFactory test", function() {
	var xyzCam = firepick.XYZCameraFactory.create();
	var ref000 = new firepick.ImageRef(0,0,0);
	var ref100 = new firepick.ImageRef(1,0,0);
	var ref = [];
	it("should take a picture at (0,0,0)", function() {
		this.timeout(5000);
		should(xyzCam.origin()).equal(xyzCam);
		should(firepick.ImageRef.compare(xyzCam.position(), ref000)).equal(0);
		ref.push(xyzCam.captureSave());
		should(firepick.ImageRef.compare(ref[0],ref000)).equal(0);
	});
	it("should take a picture at (1,0,0)", function() {
		this.timeout(5000);
		should(xyzCam.move(ref100)).equal(xyzCam);
		should(firepick.ImageRef.compare(xyzCam.position(), ref100)).equal(0);
		ref.push(xyzCam.captureSave());
		should(firepick.ImageRef.compare(ref[1],ref100)).equal(0);
	});
	it("should calculate the current image offset with respect to another XYZ", function() {
		this.timeout(5000);
		var channels = xyzCam.calcOffset(ref[0],ref[1]);
		should.exist(channels[0]);
		should.exist(channels[0].dx);
		should.exist(channels[0].dy);
		var d2 = channels[0].dx * channels[0].dx + channels[0].dy * channels[0].dy;
		should(d2).within(16, 64);
	});
})
