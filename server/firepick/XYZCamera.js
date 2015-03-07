var should = require("should"),
    module = module || {},
    firepick = firepick || {};
var fs = require("fs");
firepick.FPD = require("./FPD");
firepick.ImageRef = require("./ImageRef");

(function(firepick) {
    function XYZCamera(options) {
		this.xyz = {x:0,y:0,z:0};
        return this;
    };

    /////////////// INSTANCE ////////////////
	XYZCamera.prototype.origin = function() {
		return this.moveTo(0,0,0);
	};
	XYZCamera.prototype.moveTo = function(x,y,z) {
		this.xyz = {x:x,y:y,z:z};
		return this;
	};
	XYZCamera.prototype.getXYZ = function() {
		return this.xyz;
	};
	XYZCamera.prototype.capture = function() {
		var imgRef = firepick.ImageRef.copy(this.xyz);
		if (this.xyz.x === 0 && this.xyz.y === 0 && this.xyz.z === 0) {
			imgRef.path = "test/camX0Y0Z0a.jpg";
		} else {
			imgRef.path = "test/XP005_Z-005X0Y0@1#1.jpg";
		}
		return imgRef;
	};
    /////////////// CLASS ////////////////
    XYZCamera.validate = function(xyzCam) {
        var ref = [];
        var ip;
        it("should home and move to the XYZ origin", function() {
            this.timeout(5000);
            xyzCam.origin().should.equal(xyzCam);
			var xyz = xyzCam.getXYZ();
			xyz.should.exist;
			xyz.x.should.equal(0);
			xyz.y.should.equal(0);
			xyz.z.should.equal(0);
        });
		it("should move to a different XYZ", function() {
			xyzCam.moveTo(1,2,3).should.equal(xyzCam);
			var xyz = xyzCam.getXYZ();
			xyz.should.exist;
			xyz.x.should.equal(1);
			xyz.y.should.equal(2);
			xyz.z.should.equal(3);
		});
		var img000;
		var stat000;
        it("should take and save an image at (0,0,0)", function() {
            img000 = xyzCam.moveTo(0, 0, 0).capture();
			img000.x.should.equal(0);
			img000.y.should.equal(0);
			img000.z.should.equal(0);
			img000.path.should.be.a.String;
			stat000 = fs.statSync(img000.path);
			stat000.size.should.be.above(0);
        });
		var img00m5;
		var stat00m5;
        it("should take and save a different image at (0,0,-5)", function() {
            img00m5 = xyzCam.moveTo(0, 0, -5).capture();
			img00m5.x.should.equal(0);
			img00m5.y.should.equal(0);
			img00m5.z.should.equal(-5);
			img00m5.path.should.be.a.String;
			img00m5.path.should.not.equal(img000.path);
			stat00m5 = fs.statSync(img00m5.path);
			stat00m5.size.should.be.above(0);
			stat00m5.size.should.not.equal(stat000.size);
		});
        return true;
    };

    console.log("LOADED	: firepick.XYZCamera");
    module.exports = firepick.XYZCamera = XYZCamera;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.XYZCamera test", function() {
    var xyzCam = new firepick.XYZCamera();
    firepick.XYZCamera.validate(xyzCam);
})
