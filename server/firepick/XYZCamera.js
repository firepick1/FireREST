var should = require("should"),
    module = module || {},
    firepick = firepick || {};
var os = require("os"),
	fs = require("fs"),
	child_process = require("child_process"),
	path = require("path");
firepick.XYZPositioner = require("./XYZPositioner");
firepick.Camera = require("./Camera");
firepick.ImageRef = require("./ImageRef");
firepick.ImageStore = require("./ImageStore");

(function(firepick) {
    function XYZCamera(xyzPositioner, imgStore) {
        this.xyz = xyzPositioner || new firepick.XYZPositioner();
		this.imgStore = imgStore || new firepick.ImageStore(
			new firepick.Camera(), 
			{ prefix:"XYZCamera", suffix:".jpg" }
		);
        return this;
    };

	///////////////// INSTANCE //////////////////////
	XYZCamera.prototype.imagePath = function(imgRef) {
		return imgRef == null ?  this.imgStore.camera.path : this.pathOf(imgRef);
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
	XYZCamera.prototype.moveTo = function(x,y,z) {
		this.move({x:x,y:y,z:z});
		return this;
	}
	XYZCamera.prototype.position = function(path) { return this.xyz.position(); };
	XYZCamera.prototype.health = function() { 
		return (this.imgStore.health() + this.xyz.health())/2;
	};
	XYZCamera.prototype.pathOf = function(imgRef) { return this.imgStore.pathOf(imgRef); };
	XYZCamera.prototype.captureSave = function(state, version) {
		var imgRef = this.imgRef.copy().setState(state).setVersion(version);
		return this.imgStore.image(imgRef);
	};

    console.log("LOADED	: firepick.XYZCamera");
    module.exports = firepick.XYZCamera = XYZCamera;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.XYZCamera test", function() {
	var camera = new firepick.Camera([
		"test/camX0Y0Z0a.jpg",
		"test/camX0Y0Z0b.jpg",
		"test/camX1Y0Z0.jpg",
		"test/camX0Y0Z0a.jpg",
		"test/camX0Y0Z0b.jpg",
		"test/camX1Y0Z0.jpg",
	]);
	var imgStore = new firepick.ImageStore(camera, "ImageStore", ".jpg");
	var xyz = new firepick.XYZPositioner(); 

	var xyzCam = new firepick.XYZCamera(xyz, imgStore);
	var ref = [];
	it("should be an XYZPositioner", function() {
		should.ok(firepick.XYZPositioner.validate(xyzCam));
	});
	it("should take a picture at (0,0,0)", function() {
		var ref000_test_1 = new firepick.ImageRef(0,0,0,{state:"test",version:1});
		this.timeout(5000);
		ref.push(xyzCam.moveTo(0,0,0).captureSave("test", 1));
		should.equal(0, ref000_test_1.compare(ref[0]));
	});
	it("should take a different picture at (0,0,0)", function() {
		var ref000_test_2 = new firepick.ImageRef(0,0,0,{state:"test",version:2});
		this.timeout(10000);
		ref.push(xyzCam.moveTo(0,0,0).captureSave("test", 2));
		should.equal(0, ref000_test_2.compare(ref[1]));
	});
	it("should take a picture at (1,0,0)", function() {
		var ref100_test_3 = new firepick.ImageRef(1,0,0,{state:"test",version:3});
		this.timeout(5000);
		ref.push(xyzCam.moveTo(1,0,0).captureSave("test",3));
		should.equal(0, ref100_test_3.compare(ref[2]));
	});
	it("should have taken the right pictures", function() {
		should.exist(ref);
		should(ref.length).equal(3);
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
