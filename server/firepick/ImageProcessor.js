var should = require("should"),
    module = module || {},
    firepick = firepick || {};
var fs = require("fs");
var path = require("path");
var os = require("os");
firepick.Camera = require("./Camera");
firepick.ImageRef = require("./ImageRef");
firepick.ImageStore = require("./ImageStore");
firepick.FireSight = require("./FireSight");

(function(firepick) {
    function ImageProcessor(imgStore) {
		this.imgStore = imgStore || new firepick.ImageStore();
		this.firesight = new firepick.FireSight();
        return this;
    }
	/////////////// INSTANCE ////////////
	ImageProcessor.prototype.health = function() {
		return this.imgStore.health();
	};
	ImageProcessor.prototype.imgPath = function(imgRef) {
		return this.imgStore.imgPath(imgRef);
	}
	ImageProcessor.prototype.calcOffset = function(imgRef1, imgRef2) {
		return this.firesight.calcOffset(this.imgPath(imgRef1), this.imgPath(imgRef2));
	};
	ImageProcessor.prototype.meanStdDev = function(imgRef) {
		return this.firesight.meanStdDev(this.imgPath(imgRef));
	};
	ImageProcessor.prototype.sharpness = function(imgRef) {
		return this.firesight.sharpness(this.imgPath(imgRef));
	};
	ImageProcessor.prototype.PSNR = function(imgRef1, imgRef2) {
		return this.firesight.PSNR(this.imgPath(imgRef1), this.imgPath(imgRef2));
	};
	
	/////////////// GLOBAL /////////////
	ImageProcessor.validate = function(imgProcessor) {
		describe("ImageProcessor.validate(" + imgProcessor.constructor.name + ")", function() {
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
