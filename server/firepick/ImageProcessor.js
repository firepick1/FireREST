var should = require("should"),
    module = module || {},
    child_process = require("child_process"),
    firepick = firepick || {};
var fs = require("fs");
var path = require("path");
var os = require("os");
firepick.Camera = require("./Camera");
firepick.ImageRef = require("./ImageRef");
firepick.ImageStore = require("./ImageStore");

(function(firepick) {
    function ImageProcessor(imgStore) {
        this.imgStore = imgStore || new firepick.ImageStore();
        return this;
    }

    ////////// INTERNAL ////////////////
    function firesight_cmd(fname1, pipeline, args) {
        var cmd = "firesight -i " + fname1 + " -p server/json/" + pipeline;
        if (args) {
            cmd += " " + args;
        }
        //console.log(cmd);
        var out = child_process.execSync(cmd);
        var jout = JSON.parse(out.toString());
        //console.log(JSON.stringify(jout));
        return jout;
    };

    /////////////// INSTANCE ////////////
    ImageProcessor.prototype.health = function() {
        return this.imgStore.health();
    };
    ImageProcessor.prototype.pathOf = function(imgRef) {
        return imgRef.path || this.imgStore.pathOf(imgRef);
    }
    ImageProcessor.prototype.calcOffset = function(imgRef1, imgRef2) {
        var jout = firesight_cmd(this.pathOf(imgRef1), "calcOffset.json",
            "-Dtemplate=" + this.pathOf(imgRef2));
        return jout.result.channels['0'];
    };
    ImageProcessor.prototype.meanStdDev = function(imgRef) {
        return firesight_cmd(this.pathOf(imgRef), "meanStdDev.json").result;
    };
    ImageProcessor.prototype.sharpness = function(imgRef) {
        return firesight_cmd(this.pathOf(imgRef), "sharpness.json").result;
    };
    ImageProcessor.prototype.PSNR = function(imgRef1, imgRef2) {
        return firesight_cmd(this.pathOf(imgRef1), "PSNR.json",
            "-Dpath=" + this.pathOf(imgRef2)).result;
    };

    /////////////// GLOBAL /////////////
    ImageProcessor.validate = function(ip) {
        describe("ImageProcessor.validate(" + ip.constructor.name + ")", function() {
            var ref000a = new firepick.ImageRef(0, 0, 0, {
                tag: "a",
                path: "test/camX0Y0Z0a.jpg"
            });
            var ref000b = new firepick.ImageRef(0, 0, 0, {
                tag: "b",
                path: "test/camX0Y0Z0b.jpg"
            });
            var ref100 = new firepick.ImageRef(1, 0, 0, {
                path: "test/camX1Y0Z0.jpg"
            });
            var refDuck = new firepick.ImageRef(0, 0, 0, {
                tag: "duck",
                path: "test/duck.jpg"
            });
            ip.imgStore.load(ref000a);
            ip.imgStore.load(ref000b);
            ip.imgStore.load(ref100);
            ip.imgStore.load(refDuck);
            describe("validating calcOffset", function() {
                it("should show zero offset for two images at same location", function() {
                    var result = ip.calcOffset(ref000a, ref000b);
                    should.equal(result.dx, 0);
                    should.equal(result.dy, 0);
                });
                it("should show non-zero offset for two images at different location", function() {
                    var result = ip.calcOffset(ref000a, ref100);
                    //console.log(JSON.stringify(result));
                    should(result.dx * result.dx).above(10);
                    should(result.dy * result.dy).below(5);
                });
                it("should return nothing for dissimilar images", function() {
                    var result = ip.calcOffset(ref000a, refDuck);
                    should.not.exist(result);
                });
            });
            describe("validating meanStdDev", function() {
                it("should calculate the mean and standard deviation of an image", function() {
                    var result = ip.meanStdDev(ref000a);
                    //console.log(JSON.stringify(result));
                    should.deepEqual(result, {
                        "mean": [252.6633875, 254.64116250000001, 251.63050625000002, 0.0],
                        "stdDev": [2.1166523155330208, 1.9238660682581448, 9.6636286206944533, 0.0]
                    });
                });
            });
            describe("validating sharpness", function() {
                it("should calculate the sharpness of an image", function() {
                    var result = ip.sharpness(ref000a);
                    should.deepEqual(result, {
                        "sharpness": 3.0546240601503762
                    });
                });
            });
            describe("validating PSNR", function() {
                it("should calculate the Power Signal to Noise Ratio of two images", function() {
                    var result = ip.PSNR(ref000a, ref000b);
                    should.deepEqual(result, {
                        "PSNR": 52.54224351193264
                    });
                });
            });
        });
        return true;
    };

    console.log("LOADED	: firepick.ImageProcessor");
    module.exports = firepick.ImageProcessor = ImageProcessor;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.ImageProcessor test", function() {
    var ip = new firepick.ImageProcessor();
    firepick.ImageProcessor.validate(ip);
})
