var should = require("should"),
    module = module || {},
    firepick = firepick || {};
var fs = require("fs");
firepick.FPD = require("./FPD");
firepick.ImageRef = require("./ImageRef");
firepick.ImageRef = require("./ImageRef");
firepick.ImageStore = require("./ImageStore");

(function(firepick) {
    function XYZCamera(options) {
        options = options || {};
        this.mockImages = {};
        var mockPaths = options.mockPaths || firepick.XYZCamera.mockPaths;
        for (var i in mockPaths) {
            var imgRef = firepick.XYZCamera.parseMockPath(mockPaths[i]);
            var name = firepick.ImageRef.nameOf(imgRef);
            this.mockImages[name] = imgRef;
            this.defaultRef = this.defaultRef || imgRef;
            this.zMax = Math.max(this.zMax || imgRef.z, imgRef.z);
        }
        return this;
    };

	var ref000 = new firepick.ImageRef(0,0,0);

    /////////////// INSTANCE ////////////////
    XYZCamera.prototype.health = function() {
        return 1;
    };
    XYZCamera.prototype.origin = function() {
        return this.moveTo(0, 0, 0);
    };
    XYZCamera.prototype.moveTo = function(x, y, z) {
        this.xyz = {
            x: x,
            y: y,
            z: z
        };
        return this;
    };
    XYZCamera.prototype.getXYZ = function() {
        return this.xyz;
    };
    XYZCamera.prototype.capture = function(tag, version) {
        var imgRef = firepick.ImageRef.copy(this.xyz);
        if (tag != null) {
            imgRef.tag = tag;
        }
        if (version != null) {
            imgRef.version = version;
        }
        return this.resolve(imgRef);
    }
    XYZCamera.prototype.resolve = function(imgRef) {
		imgRef = imgRef || this.xyz || this.ref000;
        var name = firepick.ImageRef.nameOf(imgRef);
        var foundRef = this.mockImages[name];
        if (foundRef == null) {
            var newImgPath = this.defaultRef.path;
            if (imgRef.x === 0 && imgRef.y === 0) { // mock with next greater available z
                if (imgRef.z < this.zMax) {
                    var z = Math.floor(imgRef.z) + 1;
                    newImgPath = this.resolve(new firepick.ImageRef().setZ(z)).path;
                }
            } else { // mock all images from z-axis 
				newImgPath = this.resolve(new firepick.ImageRef().setZ(imgRef.z)).path;
            }
            foundRef = new firepick.ImageRef(imgRef.x, imgRef.y, imgRef.z, {
                path: newImgPath
            });
            if (imgRef.tag != null) {
                foundRef.tag = imgRef.tag;
            }
            if (imgRef.version != null) {
                foundRef.version = imgRef.version;
            }
            this.mockImages[name] = foundRef;
        }
        return foundRef;
    };

    /////////////// CLASS ////////////////
    XYZCamera.parseMockPath = function(path) {
        var prefix_tokens = path.split('Z');
        var xyz = prefix_tokens[1];
        var suffix_tokens = xyz.split('@');
        xyz = suffix_tokens[0];
        var z_tokens = xyz.split("X");
        var xy_tokens = z_tokens[1].split("Y");
        return {
            x: Number(xy_tokens[0]),
            y: Number(xy_tokens[1]),
            z: Number(z_tokens[0]),
            path: path,
        };
    };
	XYZCamera.isInterfaceOf = function(xyzCam) {
		should.exist(xyzCam);
		xyzCam.origin.should.be.a.Function;
		xyzCam.moveTo.should.be.a.Function;
		xyzCam.getXYZ.should.be.a.Function ;
		xyzCam.capture.should.be.a.Function;
		xyzCam.resolve.should.be.a.Function;
	};
    XYZCamera.validate = function(xyzCam) {
        var ref = [];
        var ip;
		it("firepick.XYZCamera.isInterfaceOf", function() {
			firepick.XYZCamera.isInterfaceOf(xyzCam);
		});
        it("should origin(), re-calibrating as necessary", function() {
            this.timeout(5000);
            xyzCam.origin().should.equal(xyzCam);
        });
        it("should, at the origin, have getXYZ() == (0,0,0)", function() {
            var xyz = xyzCam.getXYZ();
            xyz.should.exist;
            xyz.x.should.equal(0);
            xyz.y.should.equal(0);
            xyz.z.should.equal(0);
        });
        it("should moveTo(1,2,3)", function() {
            xyzCam.moveTo(1, 2, 3).should.equal(xyzCam);
            var xyz = xyzCam.getXYZ();
            xyz.should.exist;
            xyz.x.should.equal(1);
            xyz.y.should.equal(2);
            xyz.z.should.equal(3);
        });
        var img000;
        var stat000;
        it("should capture an image and return its path with moveTo(0,0,0).capture()", function() {
            img000 = xyzCam.moveTo(0, 0, 0).capture();
            should.exist(img000);
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
            should(img00m5.tag).be.undefined;
            stat00m5 = fs.statSync(img00m5.path);
            stat00m5.size.should.be.above(0);
            stat00m5.size.should.not.equal(stat000.size);
        });
        var imgTest
        it("should tag captured image with {tag:'attempt',version:7} using capture('attempt',7)", function() {
            imgTest = xyzCam.capture('attempt', 7);
            should.exist(imgTest);
			should(imgTest).properties({x:0,y:0,z:-5,tag:"attempt",version:7});
            imgTest.path.should.be.a.String;
        });
		it("resolve() should return an image reference to current location", function() {
			var ref = xyzCam.moveTo(1,2,3).resolve();
			should(ref.constructor).properties({name:"ImageRef"});
			should(ref).properties({x:1,y:2,z:3});
		});
        return true;
    };
    XYZCamera.mockPaths = [
        "test/XP005_Z20X0Y0@1#1.jpg",
        "test/XP005_Z15X0Y0@1#1.jpg",
        "test/XP005_Z10X0Y0@1#1.jpg",
        "test/XP005_Z5X0Y0@1#1.jpg",
        "test/XP005_Z0X0Y0@1#1.jpg",
        "test/XP005_Z-005X0Y0@1#1.jpg",
        "test/XP005_Z-010X0Y0@1#1.jpg",
        "test/XP005_Z-015X0Y0@1#1.jpg",
        "test/XP005_Z-020X0Y0@1#1.jpg",
        "test/XP005_Z-025X0Y0@1#1.jpg",
        "test/XP005_Z-030X0Y0@1#1.jpg",
        "test/XP005_Z-035X0Y0@1#1.jpg",
        "test/XP005_Z-040X0Y0@1#1.jpg",
        "test/XP005_Z-045X0Y0@1#1.jpg",
        "test/XP005_Z-050X0Y0@1#1.jpg",
        "test/XP005_Z-055X0Y0@1#1.jpg",
        "test/XP005_Z-060X0Y0@1#1.jpg",
        "test/XP005_Z-065X0Y0@1#1.jpg",
        "test/XP005_Z-070X0Y0@1#1.jpg",
        "test/XP005_Z-075X0Y0@1#1.jpg",
        "test/XP005_Z-080X0Y0@1#1.jpg",
        "test/XP005_Z-085X0Y0@1#1.jpg",
        "test/XP005_Z-090X0Y0@1#1.jpg",
        "test/XP005_Z-095X0Y0@1#1.jpg",
        "test/XP005_Z-100X0Y0@1#1.jpg",
        "test/XP005_Z-105X0Y0@1#1.jpg",
        "test/XP005_Z-110X0Y0@1#1.jpg",
    ];

    console.log("LOADED	: firepick.XYZCamera");
    module.exports = firepick.XYZCamera = XYZCamera;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.XYZCamera", function() {
    var xyzCam = new firepick.XYZCamera();
    it("should parse a mock image reference", function() {
        var path102 = "test/XP005_Z2X1Y0@1#1.jpg";
        var ref102 = firepick.XYZCamera.parseMockPath(path102);
        ref102.x.should.equal(1);
        ref102.y.should.equal(0);
        ref102.z.should.equal(2);
        ref102.should.have.ownProperty("path");
        ref102.path.should.equal(path102);
    });
    it("should use test/XP005_Z0X0Y0@1#1.jpg as path for (0,0,0)", function() {
        var ref000 = xyzCam.origin().capture();
        should.exist(ref000);
        ref000.x.should.equal(0);
        ref000.y.should.equal(0);
        ref000.z.should.equal(0);
        should(ref000).not.have.ownProperty("tag");
        should(ref000).not.have.ownProperty("version");
        should(ref000.path).equal("test/XP005_Z0X0Y0@1#1.jpg");
    });
    it("should use test/XP005_Z5X0Y0@1#1.jpg as path for (0,0,1)", function() {
        var ref001 = xyzCam.moveTo(0, 0, 1).capture();
        should.exist(ref001);
        ref001.x.should.equal(0);
        ref001.y.should.equal(0);
        ref001.z.should.equal(1);
        should(ref001).not.have.ownProperty("tag");
        should(ref001).not.have.ownProperty("version");
        should(ref001.path).equal("test/XP005_Z5X0Y0@1#1.jpg");
    });
    it("should use test/XP005_Z5X0Y0@1#1.jpg as path for (1,2,4)", function() {
        var ref124 = xyzCam.moveTo(1, 2, 4).capture();
        should.exist(ref124);
        ref124.x.should.equal(1);
        ref124.y.should.equal(2);
        ref124.z.should.equal(4);
        should(ref124).not.have.ownProperty("tag");
        should(ref124).not.have.ownProperty("version");
        should(ref124.path).equal("test/XP005_Z5X0Y0@1#1.jpg");
    });
    firepick.XYZCamera.validate(xyzCam);
})
