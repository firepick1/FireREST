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
firepick.FireSight = require("./FireSight");
firepick.FireFUSECamera = require("./FireFUSECamera");
firepick.FireFUSEMarlin = require("./FireFUSEMarlin");

(function(firepick) {
    function FPD(options) {
		options = options || {};
		this.xyz = options.xyz || new firepick.XYZPositioner();
		this.camera = options.camera || new firepick.Camera([
			"test/camX0Y0Z0a.jpg",
			"test/camX0Y0Z0b.jpg",
			"test/camX1Y0Z0.jpg",
		]);
		this.imgStore = options.imgStore || new firepick.ImageStore(
			this.camera, { prefix:"FPD", suffix:".jpg" }
		);
		this.firesight = options.firesight || new firepick.FireSight();
        return this;
    };
	//////////// PRIVATE ////////////////
	function imageFileNames(fpd, imgRef1, imgRef2) {
		should.exist(imgRef1); // expected one or two images
		return [
			imgRef2 == null ? fpd.imgStore.camera.path : fpd.pathOf(imgRef1),
			imgRef2 == null ? fpd.pathOf(imgRef1) : fpd.pathOf(imgRef2)
		];
	}

	///////////////// INSTANCE //////////////////////
	FPD.prototype.imgPath = function(imgRef) {
		return imgRef == null ?  this.camera.path : this.pathOf(imgRef);
	};
	FPD.prototype.home = function() { this.xyz.home(); return this; };
	FPD.prototype.origin = function() { 
		this.xyz.origin(); 
		this.imgRef = firepick.ImageRef.copy(this.xyz.position());
		return this; 
	};
	FPD.prototype.move = function(path) { 
		this.xyz.move(path); 
		this.imgRef = firepick.ImageRef.copy(this.xyz.position());
		return this; 
	};
	FPD.prototype.moveTo = function(x,y,z) {
		this.move({x:x,y:y,z:z});
		return this;
	}
	FPD.prototype.position = function(path) { return this.xyz.position(); };
	FPD.prototype.health = function() { 
		return (this.imgStore.health() + this.xyz.health())/2;
	};
	FPD.prototype.pathOf = function(imgRef) { 
		should.exist(imgRef);
		return this.imgStore.pathOf(imgRef); 
	};
	FPD.prototype.captureSave = function(state, version) {
		var imgRef = this.imgRef.copy().setState(state).setVersion(version);
		return this.imgStore.capture(imgRef);
	};
	FPD.prototype.imgCalcOffset = function(imgRef1, imgRef2) {
		return this.firesight.calcOffset(this.imgPath(imgRef1), this.imgPath(imgRef2));
	};
	FPD.prototype.imgMeanStdDev = function(imgRef) {
		return this.firesight.meanStdDev(this.imgPath(imgRef));
	};
	FPD.prototype.imgSharpness = function(imgRef) {
		return this.firesight.sharpness(this.imgPath(imgRef));
	};
	FPD.prototype.imgPSNR = function(imgRef1, imgRef2) {
		return this.firesight.PSNR(this.imgPath(imgRef1), this.imgPath(imgRef2));
	};

	/////////////// CLASS ////////////////
	FPD.validate = function(fpd) {
		var ref = [];
		it("should home and move to the origin", function() {
			this.timeout(5000);
			fpd.origin();
			should.deepEqual(fpd.position(), {x:0,y:0,z:0});
		});
		it("should take two different pictures at (0,0,0)", function() {
			this.timeout(5000);
			ref.push(fpd.moveTo(0,0,0).captureSave("test", 1));
			ref.push(fpd.captureSave("test", 2));
			var result = fpd.imgPSNR(ref[0], ref[1]);
			should.notEqual(result.PSNR, "SAME");
		});
		it("should take an offset picture at (1,0,0)", function() {
			this.timeout(5000);
			ref.push(fpd.moveTo(1,0,0).captureSave("test",3));
			var diff = fpd.imgCalcOffset(ref[1],ref[2]);
			should.exist(diff.dx);
			should.exist(diff.dy);
			should(diff.dx*diff.dx).above(10);
			should(diff.dy*diff.dy).below(5);
		});
		return true;
	};

    console.log("LOADED	: firepick.FPD");
    module.exports = firepick.FPD = FPD;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.FPD test", function() {
	var fpd = new firepick.FPD();
	should.ok(firepick.FPD.validate(fpd));
})
