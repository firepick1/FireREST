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
        options = options || {};
        this.$xyz = options.xyz || new firepick.XYZPositioner();
        this.$camera = options.camera || new firepick.Camera([
            "test/camX0Y0Z0a.jpg",
            "test/camX0Y0Z0b.jpg",
            "test/camX1Y0Z0.jpg",
        ]);
        this.$imgStore = options.imgStore || new firepick.ImageStore(
            this.$camera, {
                prefix: "FPD",
                suffix: ".jpg"
            }
        );
        this.$imgProc = options.imgProc || new firepick.ImageProcessor(this.$imgStore);
        return this;
    };
    //////////// PRIVATE ////////////////
    function imageFileNames(fpd, imgRef1, imgRef2) {
        should.exist(imgRef1); // expected one or two images
        return [
            imgRef2 == null ? fpd.camera().path : fpd.pathOf(imgRef1),
            imgRef2 == null ? fpd.pathOf(imgRef1) : fpd.pathOf(imgRef2)
        ];
    }

    ///////////////// INSTANCE //////////////////////
    FPD.prototype.imgPath = function(imgRef) {
        return imgRef == null ? this.camera().path : this.pathOf(imgRef);
    };
    FPD.prototype.home = function() {
        this.$xyz.home();
        return this;
    };
    FPD.prototype.imageStore = function() {
        return this.$imgStore;
    }
    FPD.prototype.imageProcessor = function() {
        return this.$imgProc;
    }
    FPD.prototype.camera = function() {
        return this.$camera;
    }
    FPD.prototype.xyz = function() {
        return this.$xyz;
    }
    FPD.prototype.origin = function() {
        this.$xyz.origin();
        this.$imgRef = firepick.ImageRef.copy(this.$xyz.getXYZ());
        return this;
    };
    FPD.prototype.move = function(path) {
        this.$xyz.move(path);
        this.$imgRef = firepick.ImageRef.copy(this.$xyz.getXYZ());
        return this;
    };
    FPD.prototype.moveTo = function(x, y, z) {
        this.move({
            x: x,
            y: y,
            z: z
        });
        return this;
    }
    FPD.prototype.getXYZ = function(path) {
        return this.$xyz.getXYZ();
    };
    FPD.prototype.health = function() {
        return (
            this.$camera.health() +
            this.$imgStore.health() +
            this.$imgProc.health() +
            this.$xyz.health()
        ) / 4;
    };
    FPD.prototype.capture = function(tag, version) {
        var imgRef = this.$imgRef.copy().setTag(tag).setVersion(version);
        return this.$imgStore.capture(imgRef);
    };

    /////////////// CLASS ////////////////
    FPD.validate = function(fpd) {
        var ref = [];
        var ip;
        it("should return an image processor", function() {
            should(ip = fpd.imageProcessor()).equal(fpd.$imgProc);
        });
        it("should return an image store", function() {
            should(fpd.imageStore()).equal(fpd.$imgStore);
        });
        it("should return a camera", function() {
            should(fpd.camera()).equal(fpd.$camera);
        });
        return true;
    };

    console.log("LOADED	: firepick.FPD");
    module.exports = firepick.FPD = FPD;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.FPD test", function() {
    var fpd = new firepick.FPD();
    firepick.XYZCamera.validate(fpd);
    firepick.FPD.validate(fpd);
})
