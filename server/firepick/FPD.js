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
firepick.ImageProcessor = require("./ImageProcessor");
firepick.FireFUSECamera = require("./FireFUSECamera");
firepick.FireFUSEMarlin = require("./FireFUSEMarlin");
firepick.FPDModel = require("./FPDModel");
firepick.XYZCamera = require("./XYZCamera");

(function(firepick) {
    function FPD(options) {
        var that = this;
        options = options || {};
        that.$xyz = options.xyz || new firepick.FireFUSEMarlin();
        that.$camera = options.camera || new firepick.FireFUSECamera();
        that.$imgStore = options.imgStore || new firepick.ImageStore(
            that.$camera, {
                prefix: "FPD",
                suffix: ".jpg"
            }
        );
        that.$imgProc = options.imgProc || new firepick.ImageProcessor(that.$imgStore);
        return that;
    };
    //////////// PRIVATE ////////////////
    function imageFileNames(fpd, imgRef1, imgRef2) {
        should.exist(imgRef1); // expected one or two images
        return [
            imgRef2 == null ? fpd.camera().path : imgRef1.path,
            imgRef2 == null ? imgRef1.path : imgRef2.path
        ];
    }

    ///////////////// INSTANCE //////////////////////
    FPD.prototype.imgPath = function(imgRef) {
        var that = this;
        return imgRef == null ? that.camera().path : imgRef.path;
    };
    FPD.prototype.home = function() {
        var that = this;
        that.$xyz.home();
        return that;
    };
    FPD.prototype.capture = function(tag, version) {
        var that = this;
        var xyz = that.getXYZ();
		var imgRef = {
            x: xyz.x,
            y: xyz.y,
            z: xyz.z,
            tag: tag,
            version: version,
        };
		var theRef = that.$imgStore.peek(imgRef);
        return that.$imgStore.capture(theRef || imgRef);
    };
    FPD.prototype.imageStore = function() {
        var that = this;
        return that.$imgStore;
    };
    FPD.prototype.imageProcessor = function() {
        var that = this;
        return that.$imgProc;
    };
    FPD.prototype.imageRef = function(imgRef) {
        var that = this;
		var theRef = that.$imgStore.peek(imgRef);
		if (theRef == null) {
			var srcRef = imgRef == null ? that.getXYZ() : imgRef;
			theRef = that.$imgStore.load(srcRef);
		}
		return theRef;
    };
    FPD.prototype.camera = function() {
        var that = this;
        return that.$camera;
    }
    FPD.prototype.xyzPositioner = function() {
        var that = this;
        return that.$xyz;
    }
    FPD.prototype.origin = function() {
        var that = this;
        that.$xyz.origin();
        return that;
    };
    FPD.prototype.move = function(path) {
        var that = this;
        that.$xyz.move(path);
        return that;
    };
    FPD.prototype.moveTo = function(xyz) {
        var that = this;
        return that.move(xyz);
    }
    FPD.prototype.getXYZ = function(path) {
        var that = this;
        return that.$xyz.getXYZ();
    };
    FPD.prototype.health = function() {
        var that = this;
        return (
            that.$camera.health() +
            that.$imgStore.health() +
            that.$imgProc.health() +
            that.$xyz.health()
        ) / 4;
    };
    FPD.prototype.image = function(imgRef) {
        var that = this;
        return that.$imgStore.image(imgRef);
    };

    /////////////// CLASS ////////////////
    FPD.validate = function(fpd) {
        var ref = [];
        var ip;
        it("should return an XYZPositioner", function() {
            should(ip = fpd.xyzPositioner()).equal(fpd.$xyz);
        });
        it("should return an ImageProcessor", function() {
            should(ip = fpd.imageProcessor()).equal(fpd.$imgProc);
        });
        it("should return an ImageStore", function() {
            should(fpd.imageStore()).equal(fpd.$imgStore);
        });
        it("should return a Camera", function() {
            should(fpd.camera()).equal(fpd.$camera);
        });
        return true;
    };

    console.log("LOADED	: firepick.FPD");
    module.exports = firepick.FPD = FPD;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.FPD", function() {
    var fpd = new firepick.FPD();
    var fpdMock = new firepick.FPD({
        xyz: new firepick.XYZPositioner(),
        camera: new firepick.Camera([
            "test/camX0Y0Z0a.jpg",
            "test/camX0Y0Z0b.jpg",
            "test/camX1Y0Z0.jpg",
            "test/camX1Y0Z0.jpg",
            "test/camX1Y0Z0.jpg",
        ])
    });
    if (fpd.health() < 1) {
        fpd = fpdMock;
        console.log("STATUS	: FirePick Delta is unavailable. Using mock data");
    }
    it("health() should be 1", function() {
        fpd.xyzPositioner().health().should.equal(1);
        fpd.camera().health().should.equal(1);
        fpd.imageStore().health().should.equal(1);
        fpd.imageProcessor().health().should.equal(1);
        should(fpd.health()).equal(1);
    });
    should.exist(firepick.XYZCamera.validate);
    firepick.XYZCamera.validate(fpd);
    firepick.FPD.validate(fpd);

})
