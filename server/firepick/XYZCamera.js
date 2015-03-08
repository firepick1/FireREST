var should = require("should"),
    module = module || {},
    firepick = firepick || {};
var fs = require("fs");
firepick.ImageRef = require("./ImageRef");
firepick.ImageRef = require("./ImageRef");
firepick.ImageStore = require("./ImageStore");

(function(firepick) {
    function XYZCamera(options) {
		var that = this;
        options = options || {};
        that.mockImages = {};
        var mockPaths = options.mockPaths || firepick.XYZCamera.mockPaths;
        for (var i in mockPaths) {
            var imgRef = firepick.XYZCamera.mockImageRef(mockPaths[i]);
            var name = firepick.ImageRef.keyOf(imgRef);
            that.mockImages[name] = imgRef;
            that.defaultRef = that.defaultRef || imgRef;
            that.zMax = Math.max(that.zMax || imgRef.z, imgRef.z);
        }
        return that;
    };

	var ref000 = new firepick.ImageRef(0,0,0);

    /////////////// INSTANCE ////////////////
    XYZCamera.prototype.health = function() {
        return 1;
    };
    XYZCamera.prototype.origin = function() {
		var that = this;
        return that.moveTo(ref000);
    };
    XYZCamera.prototype.moveTo = function(xyz) {
		var that = this;
		should.exist(xyz);
		if (that.xyz == null) {
			should(xyz).have.properties(["x","y","z"]);
			that.xyz = {x:xyz.x,y:xyz.y,z:xyz.z};
		} else {
			that.xyz.x = xyz.x == null ? that.xyz.x : xyz.x;
			that.xyz.y = xyz.y == null ? that.xyz.y : xyz.y;
			that.xyz.z = xyz.z == null ? that.xyz.z : xyz.z;
		}
        return that;
    };
    XYZCamera.prototype.getXYZ = function() {
		var that = this;
        return that.xyz;
    };
    XYZCamera.prototype.capture = function(tag, version) {
		var that = this;
        var imgRef = firepick.ImageRef.copy(that.xyz);
        if (tag != null) {
            imgRef.tag = tag;
        }
        if (version != null) {
            imgRef.version = version;
        }
        return that.imageRef(imgRef);
    }
    XYZCamera.prototype.imageRef = function(imgRef) {
		var that = this;
		imgRef = imgRef || that.xyz || that.ref000;
        var name = firepick.ImageRef.keyOf(imgRef);
        var foundRef = that.mockImages[name];
        if (foundRef == null) {
            var newImgPath = that.defaultRef.path;
            if (imgRef.x === 0 && imgRef.y === 0) { // mock with next greater available z
                if (imgRef.z < that.zMax) {
                    var z = Math.floor(imgRef.z) + 1;
                    newImgPath = that.imageRef(new firepick.ImageRef().setZ(z)).path;
                }
            } else { // mock all images from z-axis 
				newImgPath = that.imageRef(new firepick.ImageRef().setZ(imgRef.z)).path;
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
            that.mockImages[name] = foundRef;
        }
        return foundRef;
    };

    /////////////// CLASS ////////////////
    XYZCamera.mockImageRef = function(path) {
        var prefix_tokens = path.split('Z');
        var xyz = prefix_tokens[1];
        var suffix_tokens = xyz.split('@');
        xyz = suffix_tokens[0];
        var z_tokens = xyz.split("X");
        var xy_tokens = z_tokens[1].split("Y");
        return new firepick.ImageRef(Number(xy_tokens[0]),Number(xy_tokens[1]), Number(z_tokens[0]),
			{ path: path });
    };
	XYZCamera.isInterfaceOf = function(xyzCam) {
		should.exist(xyzCam);
		xyzCam.origin.should.be.a.Function;
		xyzCam.moveTo.should.be.a.Function;
		xyzCam.getXYZ.should.be.a.Function ;
		xyzCam.capture.should.be.a.Function;
		xyzCam.imageRef.should.be.a.Function;
		return true;
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
			should(xyz).have.properties({x:0,y:0,z:0});
        });
        it("should moveTo({x:1,y:2,z:3})", function() {
            xyzCam.moveTo({x:1,y:2,z:3}).should.equal(xyzCam);
            var xyz = xyzCam.getXYZ();
			should(xyz).have.properties({x:1,y:2,z:3});
        });
        it("should moveTo({z:5})", function() {
            xyzCam.moveTo({z:5}).should.equal(xyzCam);
            var xyz = xyzCam.getXYZ();
			should(xyz).have.properties({x:1,y:2,z:5});
        });
        var img000;
        var stat000;
        it("should capture an image and return its path with moveTo({x:0,y:0,z:0}).capture()", function() {
            img000 = xyzCam.moveTo({x:0,y:0,z:0}).capture();
			should(img000).have.properties({x:0,y:0,z:0});
            img000.path.should.be.a.String;
            stat000 = fs.statSync(img000.path);
            stat000.size.should.be.above(0);
        });
        var img00m5;
        var stat00m5;
        it("should take and save a different image at {x:0,y:0,z:-5}", function() {
            img00m5 = xyzCam.moveTo({x:0,y:0,z:-5}).capture();
			should(img00m5).have.properties({x:0,y:0,z:-5});
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
		it("origin().imageRef() should return an image reference to origin", function() {
			this.timeout(5000);
			var ref = xyzCam.origin().imageRef();
			should(xyzCam.getXYZ()).properties({x:0,y:0,z:0});
			should(ref.constructor.name).equal("ImageRef");
			should(ref).instanceof(firepick.ImageRef);
			should(ref).properties({x:0,y:0,z:0});
			should(ref.path).be.a.String;
			should(ref.path.length).be.above(0);
		});
		it("imageRef() should return a unique image reference to current location", function() {
			var ref = xyzCam.moveTo({x:1,y:2,z:3}).imageRef();
			should(ref).instanceof(firepick.ImageRef);
			should(ref).properties({x:1,y:2,z:3});
			should(ref.path).be.a.String;
			should(ref.path.length).be.above(0);
		});
		it("imageRef() should retain client decorations after capture()", function() {
			var ref = xyzCam.imageRef();
			ref.aDecoration = "hello";
			var ref2 = xyzCam.capture();
		//	ref2.should.have.properties({aDecoration:"hello"});
			var ref3 = xyzCam.imageRef();
		//	ref3.should.have.properties({aDecoration:"hello"});
		});
		it("imageRef({x:3,y:2,z:1}) should resolve an incomplete image reference", function() {
			var ref = xyzCam.imageRef({x:3,y:2,z:1});
			should(ref).instanceof(firepick.ImageRef);
			should(ref).properties({x:3,y:2,z:1});
			should(ref.path).be.a.String;
			should(ref.path.length).be.above(0);
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
    firepick.XYZCamera.validate(xyzCam);
    it("should parse a mock image reference", function() {
        var path102 = "test/XP005_Z2X1Y0@1#1.jpg";
        var ref102 = firepick.XYZCamera.mockImageRef(path102);
		should(ref102).have.properties({x:1,y:0,z:2});
        ref102.should.have.ownProperty("path");
        ref102.path.should.equal(path102);
    });
    it("should use test/XP005_Z0X0Y0@1#1.jpg as path for (0,0,0)", function() {
        var ref000 = xyzCam.origin().capture();
		should(ref000).have.properties({x:0,y:0,z:0});
        should(ref000).not.have.ownProperty("tag");
        should(ref000).not.have.ownProperty("version");
        should(ref000.path).equal("test/XP005_Z0X0Y0@1#1.jpg");
    });
    it("should use test/XP005_Z5X0Y0@1#1.jpg as path for (0,0,1)", function() {
        var ref001 = xyzCam.moveTo({x:0,y:0,z:1}).capture();
		should(ref001).have.properties({x:0,y:0,z:1});
        should(ref001).not.have.ownProperty("tag");
        should(ref001).not.have.ownProperty("version");
        should(ref001.path).equal("test/XP005_Z5X0Y0@1#1.jpg");
    });
    it("should use test/XP005_Z5X0Y0@1#1.jpg as path for {x:1,y:2,z:4}", function() {
        var ref124 = xyzCam.moveTo({x:1,y:2,z:4}).capture();
		should(ref124).have.properties({x:1,y:2,z:4});
        should(ref124).not.have.ownProperty("tag");
        should(ref124).not.have.ownProperty("version");
        should(ref124.path).equal("test/XP005_Z5X0Y0@1#1.jpg");
    });
})
