var should = require("should"),
    module = module || {},
    firepick = firepick || {};
var os = require("os"),
	fs = require("fs"),
	child_process = require("child_process"),
	path = require("path");
firepick.XYZPositioner = require("./XYZPositioner");
firepick.MockCamera = require("./MockCamera");
firepick.ImageRef = require("./ImageRef");

function isNumeric(obj) {
    return (obj - parseFloat(obj) + 1) >= 0;
}

(function(firepick) {
    function XYZCamera(xyzPositioner, camera) {
        this.xyz = xyzPositioner || new firepick.XYZPositioner();
		should.ok(firepick.XYZPositioner.validate(this.xyz, "XYZCamera(xyzPositioner)"));
		this.camera = camera || new firepick.MockCamera();
        return this;
    }
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
		var fname = firepick.ImageRef.nameOf(imgRef, "XYZCamera", ".jpg");
		return path.join(os.tmpDir(),fname);
	}

	XYZCamera.prototype.xyzPath = function(x,y,z,state,version) {
		x = (typeof x === 'undefined' || x === null) ? this.imgRef.x : x;
		y = (typeof y === 'undefined' || y === null) ? this.imgRef.y : y;
		z = (typeof z === 'undefined' || z === null) ? this.imgRef.z : z;
		var imgRef = new firepick.ImageRef(x,y,z,state,version);
		return path.join(os.tmpDir(),imgRef.name("XYZCamera", ".jpg"));
	};
	XYZCamera.prototype.captureSave = function(state, version) {
		var imgRef = this.imgRef.copy().setState(state).setVersion(version);
		var fpath = this.pathOf(imgRef);
		this.camera.capture();
		fs.writeFileSync(fpath, fs.readFileSync(this.camera.path));
		return imgRef;
	};
	XYZCamera.prototype.calcOffset = function(imgRef1, imgRef2) {
		should.exist(imgRef1);
		var fname1 = this.camera.path;
		var fname2 = this.pathOf(imgRef1);
		if (typeof imgRef2 !== 'undefined') {
			fname1 = fname2;
			fname2 = this.pathOf(imgRef2);
		}
		var cmd = "firesight" +
			" -i " + fname1 + 
			" -p server/json/calcOffset.json" +
			" -Dtemplate=" + fname2;
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
		this.timeout(5000);
		camera.push("test/camX0Y0Z0a.jpg");
		should.deepEqual({x:0,y:0,z:0}, xyzCam.origin().position());
		var ref000 = xyzCam.captureSave();
		should.equal(0, firepick.ImageRef.compare({x:0,y:0,z:0}, ref000));
		should.deepEqual({x:0,y:0,z:0},xyzCam.position());
		var camX0Y0Z0a = fs.statSync("test/camX0Y0Z0a.jpg");
		var x0y0z0_1 = fs.statSync(xyzCam.xyzPath(0,0,0));
		should.equal(camX0Y0Z0a.size, x0y0z0_1.size);
	});
	it("should take a different picture at (0,0,0)", function() {
		camera.push("test/camX0Y0Z0b.jpg");
		should.deepEqual({x:0,y:0,z:0}, xyzCam.origin().position());
		var ref000 = xyzCam.captureSave();
		should.equal(0, firepick.ImageRef.compare({x:0,y:0,z:0}, ref000));
		var camX0Y0Z0b = fs.statSync("test/camX0Y0Z0b.jpg");
		var x0y0z0_2 = fs.statSync(xyzCam.xyzPath(0,0,0));
		should.deepEqual(camX0Y0Z0b.size, x0y0z0_2.size);
	});
	it("should take a picture at (1,0,0)", function() {
		camera.push("test/camX1Y0Z0.jpg");
		var camX1Y0Z0 = fs.statSync("test/camX1Y0Z0.jpg");
		var fx1y0z0 = xyzCam.xyzPath(1,0,0);
		fs.writeFileSync(fx1y0z0, "");
		should.deepEqual({x:1,y:0,z:0}, xyzCam.move({x:1,y:0,z:0}).position());
		var ref100 = xyzCam.captureSave();
		should.equal(0, firepick.ImageRef.compare({x:1,y:0,z:0}, ref100));
		should.deepEqual({x:1,y:0,z:0},xyzCam.position());
		x1y0z0 = fs.statSync(fx1y0z0);
		should.equal(camX1Y0Z0.size, x1y0z0.size);
	});
	it("should calculate the current image offset with respect to another XYZ", function() {
		camera.push("test/camX0Y0Z0a.jpg");
		xyzCam.captureSave();
		var channels = xyzCam.origin().calcOffset({x:0,y:0,z:0});
		should.deepEqual({dx:0, dy:0, match:"0.995454"}, channels["0"]);
	});
	it("should calculate the image offset of two saved images", function() {
		camera.push("test/camX0Y0Z0b.jpg");
		camera.push("test/camX1Y0Z0.jpg");
		var ref000_test1 = xyzCam.captureSave("eagle",1);
		xyzCam.move({x:1});
		var ref100_test1 = xyzCam.captureSave("hawk",1);
		var channels = xyzCam.origin().calcOffset(ref000_test1, ref100_test1);
		should.deepEqual({dx:-5, dy:1, match:"0.916843"}, channels["0"]);
	});
})
