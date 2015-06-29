var should = require("should"),
    module = module || {},
    firepick = firepick || {};
var fs = require("fs");
var path = require("path");
var os = require("os");
var child_process = require("child_process");
Camera = require("./Camera");
ImageRef = require("./ImageRef");
ImageStore = require("./ImageStore");
Logger = require("./Logger");

(function(firepick) {
	var logger = new Logger();
    function ImageProcessor(options) {
		var that = this;
		options = options || {};
		that.imgStore = options.imageStore || new ImageStore();
		that.version = 1;
        return that;
    }

    /////////////// INSTANCE ////////////
    ImageProcessor.prototype.firesight_cmd = function(imgRef, pipeline, args, resultFilter) {
		var that = this;
		var fname = ImageProcessor.getPath(imgRef);
        var cmd = "firesight -i " + ImageProcessor.getPath(imgRef) + " -p server/json/" + pipeline;
        if (args) {
            cmd += " " + args;
        }
		var imgRefCmd = ImageRef.copy(imgRef);
		imgRefCmd.setTag(pipeline);
		imgRefCmd.setVersion(that.version);
		var imgRefCached = that.imgStore.peek(imgRefCmd);
		var result;
		if (imgRefCached == null) {
			try {
				var out = child_process.execSync(cmd);
				var jout = JSON.parse(out.toString());
				logger.trace(cmd, " => ", jout);
				result = jout;
			} catch(err) {
				logger.info("ERROR:", err == null ? err : err.cmd);
				result = err;
			}
			result = resultFilter ? {result:resultFilter(result)} : result;
			imgRefCmd.result = result;
			logger.debug("imgRefCmd:", imgRefCmd);
			that.imgStore.load(imgRefCmd);
		} else {
			result = imgRefCached.result;
		}
		logger.debug("firesight_cmd(", result,") ", cmd);
		return result;
    };
    ImageProcessor.prototype.health = function() {
        return 1;
    };
    ImageProcessor.prototype.calcOffset = function(imgRef1, imgRef2) {
		var that = this;
        var jout = that.firesight_cmd(imgRef1, "calcOffset.json",
            "-Dtemplate=" + imgRef2.path);
        return jout.result.channels && jout.result.channels['0'] ?
			jout.result.channels : null;
    };
    ImageProcessor.prototype.meanStdDev = function(imgRef) {
		var that = this;
        return that.firesight_cmd(imgRef, "meanStdDev.json").result;
    };
    ImageProcessor.prototype.matchTemplate = function(imgRef, tmpltRef) {
		var that = this;
        return that.firesight_cmd(imgRef, "matchTemplate.json", 
			"-Dtemplate="+tmpltRef.path).result;
    };
    ImageProcessor.prototype.sharpness = function(imgRef) {
		var that = this;
        return that.firesight_cmd(imgRef, "sharpness.json").result;
    };
    ImageProcessor.prototype.measureGrid = function(imgRef) {
		var that = this;
        return that.firesight_cmd(imgRef, "measureGrid.json",
			"-Dtemplate=server/img/cross32.png", function(rawResult) {
			return {grid:{
				x: rawResult && rawResult.result && rawResult.result["grid.x"] || null,
				y: rawResult && rawResult.result && rawResult.result["grid.y"] || null,
			}};
		}).result;
    };
    ImageProcessor.prototype.PSNR = function(imgRef1, imgRef2) {
		var that = this;
        return that.firesight_cmd(imgRef1, "PSNR.json",
            "-Dpath=" + imgRef2.path).result;
    };

    /////////////// GLOBAL /////////////
	ImageProcessor.logger = logger;
	ImageProcessor.getPath = function(imgRef) {
		imgRef.should.have.properties(["path"]);
		return imgRef.path;
	}
    ImageProcessor.validate = function(ip) {
		ip.version++;
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
					ip.version++;
                    var result = ip.calcOffset(ref000a, ref000b);
					should.exist(result);
					should.exist(result[0]);
                    should.equal(result[0].dx, 0);
                    should.equal(result[0].dy, 0);
                });
                it("should show non-zero offset for two images at different location", function() {
					ip.version++;
                    var result = ip.calcOffset(ref000a, ref100);
					should.exist(result);
					should.exist(result[0]);
                    should(result[0].dx * result[0].dx).above(10);
                    should(result[0].dy * result[0].dy).below(5);
                });
                it("should return nothing for dissimilar images", function() {
					ip.version++;
                    var result = ip.calcOffset(ref000a, refDuck);
                    should.not.exist(result);
                });
            });
            describe("validating meanStdDev", function() {
                it("should calculate the mean and standard deviation of an image", function() {
					ip.version++;
                    var result = ip.meanStdDev(ref000a);
                    //console.log(JSON.stringify(result));
                    should.deepEqual(result, {
                        "mean": [252.663, 254.641, 251.631, 0.0],
                        "stdDev": [2.11665, 1.92387, 9.66363, 0.0]
                    });
                });
            });
            describe("validating sharpness", function() {
                it("sharpness(imgRef) should calculate the sharpness of an image", function() {
					ip.version++;
                    var result = ip.sharpness(ref000a);
                    should.deepEqual(result, {
                        "sharpness": 3.05462
                    });
                });
            });
            describe("validating PSNR", function() {
                it("PSNR(imgRef1,imgRef2) should calculate the Power Signal to Noise Ratio of two images", function() {
					ip.version++;
                    var result = ip.PSNR(ref000a, ref000b);
                    should.deepEqual(result, {
                        "PSNR": 52.5422
                    });
                });
            });
			/* TBD
            describe("validating matchTemplate", function() {
                it("matchTemplate(imgRef,tmpltRef) should locate all subimages that match given template", function() {
                    var result = ip.matchTemplate(ref000a, tmpltRef);
                });
            });
			*/
        });
        return true;
    };

    Logger.logger.info("loaded firepick.ImageProcessor");
    module.exports = firepick.ImageProcessor = ImageProcessor;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.ImageProcessor test", function() {
    var ip = new firepick.ImageProcessor();
    firepick.ImageProcessor.validate(ip);

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
	var refZ_40 = {
		x: 0,
		y: 0,
		z: -40,
		path: "test/XP005_Z-040X0Y0@1#1.jpg"
	};
	var refZ_80 = {
		x: 0,
		y: 0,
		z: -80,
		path: "test/XP005_Z-080X0Y0@1#1.jpg"
	};
	it("image calculations are cached by operation unless version is incremented", function() {
		ip.calcOffset(ref000a, ref000b)[0].dx.should.equal(0);
		ip.calcOffset(ref000a, ref100)[0].dx.should.equal(0);
		ip.version++;
		ip.calcOffset(ref000a, ref100)[0].dx.should.not.equal(0);
	});
	it("should show zero offset for two images at same location", function() {
		ip.version++;
		var result = ip.calcOffset(ref000a, ref000b);
		should.exist(result);
		should.exist(result[0]);
		should.equal(result[0].dx, 0);
		should.equal(result[0].dy, 0);
	});
	it("should show non-zero offset for two images at different location", function() {
		ip.version++;
		var result = ip.calcOffset(ref000a, ref100);
		should.exist(result);
		should.exist(result[0]);
		should(result[0].dx * result[0].dx).above(10);
		should(result[0].dy * result[0].dy).below(5);
	});
	it("should return nothing for dissimilar images", function() {
		ip.version++;
		var result = ip.calcOffset(ref000a, refDuck);
		should.not.exist(result);
	});
	it("should calculate the mean and standard deviation of an image", function() {
		ip.version++;
		var result = ip.meanStdDev(ref000a);
		//console.log(JSON.stringify(result));
		should.deepEqual(result, {
			"mean": [252.663, 254.641, 251.631, 0.0],
			"stdDev": [2.11665, 1.92387, 9.66363, 0.0]
		});
	});
	it("sharpness(imgRef) should calculate the sharpness of an image", function() {
		ip.version++;
		var result = ip.sharpness(ref000a);
		should.deepEqual(result, {
			"sharpness": 3.05462
		});
	});
	it("PSNR(imgRef1,imgRef2) should calculate the Power Signal to Noise Ratio of two images", function() {
		ip.version++;
		var result = ip.PSNR(ref000a, ref000b);
		should.deepEqual(result, {
			"PSNR": 52.5422
		});
	});
	it("measureGrid(imgRef1,imgRef2) should measure grid line separation", function() {
		ip.version++;
		should.deepEqual(ip.measureGrid(refZ_40), {
			"grid":{
				x:8.79561, 
				y:8.846
			}
		});
		should.deepEqual(ip.measureGrid(refZ_80), {
			"grid":{x:null,y:null}
		});
	});
});
