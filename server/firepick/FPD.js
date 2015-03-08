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
        this.$xyz = options.xyz || new firepick.FireFUSEMarlin();
        this.$camera = options.camera || new firepick.FireFUSECamera();
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
	FPD.prototype.capture = function(tag, version) {
		var imgRef = firepick.ImageRef.copy(this.getXYZ()).setTag(tag).setVersion(version);
		return this.$imgStore.capture(imgRef);
	};
    FPD.prototype.imageStore = function() {
        return this.$imgStore;
    };
    FPD.prototype.imageProcessor = function() {
        return this.$imgProc;
    };
	FPD.prototype.pathOf = function(imgRef) {
		return this.$imgStore.pathOf(imgRef);
	};
	FPD.prototype.imageRef = function(imgRef) {
		imgRef = imgRef || this.getXYZ() || {x:0,y:0,z:0};
		return firepick.ImageRef.copy(imgRef).setPath(this.pathOf(imgRef));
	};
    FPD.prototype.camera = function() {
        return this.$camera;
    }
    FPD.prototype.xyzPositioner= function() {
        return this.$xyz;
    }
    FPD.prototype.origin = function() {
        this.$xyz.origin();
        return this;
    };
    FPD.prototype.move = function(path) {
        this.$xyz.move(path);
        return this;
    };
    FPD.prototype.moveTo = function(xyz) {
        return this.move(xyz);
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
	FPD.prototype.image = function(imgRef) {
		return this.$imgStore.image(imgRef);
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
