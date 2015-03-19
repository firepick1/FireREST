var should = require("should"),
    module = module || {},
    child_process = require("child_process"),
    firepick = firepick || {};
var fs = require("fs");
var path = require("path");
var os = require("os");
Camera = require("./Camera");
ImageRef = require("./ImageRef");
ImageStore = require("./ImageStore");
Logger = require("./Logger");

(function(firepick) {
    function ImageProcessor(options) {
		options = options || {};
		this.logger = options.logger || new Logger(options);
        return this;
    }

    /////////////// INSTANCE ////////////
    ImageProcessor.prototype.firesight_cmd = function(fname1, pipeline, args) {
		var that = this;
        var cmd = "firesight -i " + fname1 + " -p server/json/" + pipeline;
        if (args) {
            cmd += " " + args;
        }
        var out = child_process.execSync(cmd);
        var jout = JSON.parse(out.toString());
		that.logger.debug(cmd, " => ", jout);
        return jout;
    };
    ImageProcessor.prototype.health = function() {
        return 1;
    };
    ImageProcessor.prototype.calcOffset = function(imgRef1, imgRef2) {
		var that = this;
        var jout = that.firesight_cmd(imgRef1.path, "calcOffset.json",
            "-Dtemplate=" + imgRef2.path);
        return jout.result.channels['0'];
    };
    ImageProcessor.prototype.meanStdDev = function(imgRef) {
		var that = this;
        return that.firesight_cmd(imgRef.path, "meanStdDev.json").result;
    };
    ImageProcessor.prototype.sharpness = function(imgRef) {
		var that = this;
        return that.firesight_cmd(imgRef.path, "sharpness.json").result;
    };
    ImageProcessor.prototype.PSNR = function(imgRef1, imgRef2) {
		var that = this;
        return that.firesight_cmd(imgRef1.path, "PSNR.json",
            "-Dpath=" + imgRef2.path).result;
    };

    /////////////// GLOBAL /////////////
    ImageProcessor.validate = function(ip) {
        describe("ImageProcessor.validate(" + ip.constructor.name + ")", function() {
            var ref000a = {
                x: 0,
                y: 0,
                z: 0,
                path: "test/camX0Y0Z0a.jpg"
            };
            var ref000b = {
                x: 0,
                y: 0,
                z: 0,
                path: "test/camX0Y0Z0b.jpg"
            };
            var ref100 = {
                x: 0,
                y: 0,
                z: 0,
                path: "test/camX1Y0Z0.jpg"
            };
            var refDuck = {
                x: 0,
                y: 0,
                z: 0,
                path: "test/duck.jpg"
            };
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
