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
    function XYZCamera(xyzPositioner, camera) {
        this.xyz = xyzPositioner || new firepick.XYZPositioner();
		should.ok(firepick.XYZPositioner.validate(this.xyz, "XYZCamera(xyzPositioner)"));
		this.camera = camera || new firepick.MockCamera();
        return this;
    };
	XYZCamera.validate = function(xyzCam) {
		var ref = [];
		it("should be an XYZPositioner", function() {
			should.ok(firepick.XYZPositioner.validate(xyzCam, "XYZCamera"));
		});
		it("should take a picture at (0,0,0)", function() {
			this.timeout(5000);
			should.deepEqual({x:0,y:0,z:0}, xyzCam.origin().position());
			ref.push(xyzCam.captureSave("test", 1));
			should.equal(0, firepick.ImageRef.compare({x:0,y:0,z:0,state:"test",version:1}, ref[0]));
			should.deepEqual({x:0,y:0,z:0},xyzCam.position());
		});
		it("should take a different picture at (0,0,0)", function() {
			should.deepEqual({x:0,y:0,z:0}, xyzCam.origin().position());
			ref.push(xyzCam.captureSave("test", 2));
			should.equal(0, firepick.ImageRef.compare({x:0,y:0,z:0,state:"test", version:2}, ref[1]));
		});
		it("should take a picture at (1,0,0)", function() {
			should.deepEqual({x:1,y:0,z:0}, xyzCam.move({x:1,y:0,z:0}).position());
			ref.push(xyzCam.captureSave("test",3));
			should.equal(0, firepick.ImageRef.compare({x:1,y:0,z:0,state:"test",version:3}, ref[2]));
			should.deepEqual({x:1,y:0,z:0},xyzCam.position());
		});
		it("should calculate the current image offset with respect to another XYZ", function() {
			xyzCam.captureSave("test", 4);
			var channels = xyzCam.origin().calcOffset(ref[1]);
			should.exist(channels[0]);
			should(channels[0].dx).within(-1,1);
			should(channels[0].dy).within(-1,1);
		});
		it("should calculate the image offset of two saved images", function() {
			ref.push(xyzCam.captureSave("eagle",4));
			xyzCam.move({x:1});
			ref.push(xyzCam.captureSave("hawk",5));
			var channels = xyzCam.origin().calcOffset(ref[3],ref[4]);
			should.exist(channels[0]);
			should(channels[0].dx).within(-6,-4);
			should(channels[0].dy).within(-1,1);
		});
		return ref;
	};
	XYZCamera.prototype.home = function() { this.xyz.home(); return this; };
	XYZCamera.prototype.origin = function() { 
		this.xyz.origin(); 
		this.imgRef = firepick.ImageRef.copy(this.xyz.position());
		return this; 
	};
	XYZCamera.prototype.move = function(path) { 
		this.xyz.move(path); 
		this.imgRef = firepick.ImageRef.copy(this.xyz.position());
		return this; 
	};
	XYZCamera.prototype.position = function(path) { return this.xyz.position(); };
	XYZCamera.prototype.isAvailable = function() { 
		return this.xyz.isAvailable && this.xyz.isAvailable(); 
	};
	XYZCamera.prototype.pathOf = function(imgRef) {
		return path.join(os.tmpDir(),imgRef.name("XYZCamera", ".jpg"));
	};
	XYZCamera.prototype.imageRefOf = function(path) {
		var $tokens = path.split('#');
		var _tokens = $tokens[0].split('_');
		if ($tokens.length > 1) {
			var _tokens1 = $tokens[1].split('_');
			_tokens.push(_tokens1[0],_tokens1[1]);
		}
		return new firepick.ImageRef(
			_tokens[1]+0, /* x */
			_tokens[2]+0, /* y */
			_tokens[3]+0, /* z */
			_tokens[4], /* state */
			_tokens[5]); /* version */
	};
	XYZCamera.prototype.pathOf = function(imgRef) {
		should.exist(imgRef);
		var fname = firepick.ImageRef.nameOf(imgRef, "XYZCamera", ".jpg");
		return path.join(os.tmpDir(),fname);
	}
	XYZCamera.prototype.captureSave = function(state, version) {
		var imgRef = this.imgRef.copy().setState(state).setVersion(version);
		var fpath = this.pathOf(imgRef);
		this.camera.capture();
		fs.writeFileSync(fpath, fs.readFileSync(this.camera.path));
		return imgRef;
	};
	XYZCamera.prototype.calcOffset = function(imgRef1, imgRef2) {
		should.exist(imgRef1);
		var nArgs = typeof imgRef2 === 'undefined' ? 1 : 2;
		var fname1 = nArgs === 1 ? this.camera.path : this.pathOf(imgRef1);
		var fname2 = nArgs === 1 ? this.pathOf(imgRef1) : this.pathOf(imgRef2);
		var jout = firesight(fname1, "calcOffset.json", "-Dtemplate=" + fname2);
		return jout.result.channels;
	};

    console.log("LOADED	: firepick.XYZCamera");
    module.exports = firepick.XYZCamera = XYZCamera;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.XYZCamera test", function() {
	var camera = new firepick.FireFUSECamera();
	if (!camera.isAvailable()) {
		camera = new firepick.MockCamera();
		camera.push("test/camX0Y0Z0a.jpg");	// ref000_1
		camera.push("test/camX0Y0Z0b.jpg"); // ref000_2
		camera.push("test/camX1Y0Z0.jpg");	// ref100_3
		camera.push("test/camX0Y0Z0a.jpg");	
		camera.push("test/camX0Y0Z0b.jpg");
		camera.push("test/camX1Y0Z0.jpg");
	}
	var xyz = new firepick.FireFUSEMarlin();
	if (!xyz.isAvailable()) { 
		xyz = new firepick.XYZPositioner(); 
	}

	var xyzCam = new firepick.XYZCamera(xyz, camera);
	var ref = firepick.XYZCamera.validate(xyzCam);
	it("should have taken the right pictures", function() {
		should.exist(ref);
		should(ref.length).equal(5);
		var fs0 = fs.statSync(xyzCam.pathOf(ref[0]));
		var camX0Y0Z0a = fs.statSync("test/camX0Y0Z0a.jpg");
		should.equal(camX0Y0Z0a.size, fs0.size);
		var camX0Y0Z0b = fs.statSync("test/camX0Y0Z0b.jpg");
		var fs000_2 = fs.statSync(xyzCam.pathOf(ref[1]));
		should.deepEqual(camX0Y0Z0b.size, fs000_2.size);
		var fs100_3 = fs.statSync(xyzCam.pathOf(ref[2]));
		var camX1Y0Z0 = fs.statSync("test/camX1Y0Z0.jpg");
		should.equal(camX1Y0Z0.size, fs100_3.size);
	});
})
