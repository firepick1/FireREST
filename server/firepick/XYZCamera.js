var should = require("should"),
    module = module || {},
    firepick = firepick || {};
var os = require("os"),
	fs = require("fs"),
	child_process = require("child_process"),
	path = require("path");
firepick.XYZPositioner = require("./XYZPositioner");
firepick.MockCamera = require("./MockCamera");

function isNumeric(obj) {
    return (obj - parseFloat(obj) + 1) >= 0;
}

(function(firepick) {
    function XYZCamera(xyzPositioner, camera) {
        this.xyz = xyzPositioner || new firepick.XYZPositioner();
		should.ok(firepick.XYZPositioner.validate(this.xyz, "XYZCamera(xyzPositioner)"));
		this.camera = camera || new firepick.MockCamera();;
        return this;
    }
	XYZCamera.prototype.home = function() { this.xyz.home(); return this; };
	XYZCamera.prototype.origin = function() { this.xyz.origin(); return this; };
	XYZCamera.prototype.move = function(path) { this.xyz.move(path); return this; };
	XYZCamera.prototype.position = function(path) { return this.xyz.position(); };
	XYZCamera.prototype.isAvailable = function() { 
		return this.xyz.isAvailable && this.xyz.isAvailable(); 
	};
	XYZCamera.prototype.xyzPath = function(x,y,z) {
		return path.join(os.tmpDir(),"XYZCamera_" + x + "_" + y + "_" + z + ".jpg");
	};
	XYZCamera.prototype.captureXYZ = function() {
		var pos = this.xyz.position();
		should.ok(isNumeric(pos.x));
		should.ok(isNumeric(pos.y));
		should.ok(isNumeric(pos.z));
		var fpath = this.xyzPath(pos.x, pos.y, pos.z);
		this.camera.capture();
		fs.writeFileSync(fpath, fs.readFileSync(this.camera.path));
		return this;
	};
	XYZCamera.prototype.calcOffset = function(x,y,z) {
		this.camera.capture();
		var fname = this.xyzPath(x, y, z);
		var cmd = "firesight" +
			" -i " + this.camera.path + 
			" -p server/json/calcOffset.json" +
			" -Dtemplate=" + fname;
		//console.log(cmd);
		var out = child_process.execSync(cmd);
		var jout = JSON.parse(out.toString());
		return jout.result.channels;
	};

    console.log("LOADED	: firepick.XYZCamera");
    module.exports = firepick.XYZCamera = XYZCamera;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.XYZCamera test", function() {
	var camera = new firepick.MockCamera();
	var xyz = new firepick.XYZPositioner();
	var xyzCam = new firepick.XYZCamera(xyz, camera);

	it("should be an XYZPositioner", function() {
		should.ok(firepick.XYZPositioner.validate(xyzCam, "XYZCamera"));
	});
	it("should take a picture at (0,0,0)", function() {
		camera.push("test/camX0Y0Z0a.jpg");
		should.deepEqual({x:0,y:0,z:0}, xyzCam.origin().position());
		should.equal(xyzCam, xyzCam.captureXYZ());
		should.deepEqual({x:0,y:0,z:0},xyzCam.position());
		var camX0Y0Z0a = fs.readFileSync("test/camX0Y0Z0a.jpg");
		var x0y0z0_1 = fs.readFileSync(path.join(os.tmpDir(),"XYZCamera_0_0_0.jpg"));
		should.deepEqual(camX0Y0Z0a, x0y0z0_1);
	});
	it("should take a different picture at (0,0,0)", function() {
		camera.push("test/camX0Y0Z0b.jpg");
		should.deepEqual({x:0,y:0,z:0}, xyzCam.origin().position());
		should.equal(xyzCam, xyzCam.captureXYZ());
		var camX0Y0Z0b = fs.readFileSync("test/camX0Y0Z0b.jpg");
		var x0y0z0_2 = fs.readFileSync(path.join(os.tmpDir(),"XYZCamera_0_0_0.jpg"));
		should.deepEqual(camX0Y0Z0b, x0y0z0_2);
	});
	it("should take a picture at (1,0,0)", function() {
		camera.push("test/camX1Y0Z0.jpg");
		var camX1Y0Z0 = fs.readFileSync("test/camX1Y0Z0.jpg");
		var fx1y0z0 = path.join(os.tmpDir(),"XYZCamera_1_0_0.jpg");
		fs.writeFileSync(fx1y0z0, "");
		should.deepEqual({x:1,y:0,z:0}, xyzCam.move({x:1,y:0,z:0}).position());
		should.equal(xyzCam, xyzCam.captureXYZ(1,0,0));
		should.deepEqual({x:1,y:0,z:0},xyzCam.position());
		x1y0z0 = fs.readFileSync(path.join(os.tmpDir(),"XYZCamera_1_0_0.jpg"));
		should.deepEqual(camX1Y0Z0, x1y0z0);
	});
	it("should calculate the image offset with respect to another XYZ", function() {
		camera.push("test/camX0Y0Z0a.jpg");
		var channels = xyzCam.origin().calcOffset(0,0,0);
		should.deepEqual({dx:0, dy:0, match:"0.995454"}, channels["0"]);
	});
})
