var should = require("should"),
    module = module || {},
    firepick;
var child_process = require('child_process');
var fs = require('fs');
var temp = require('temp');
temp.track();
var Logger = require("./Logger");
var ImageRef = require("./ImageRef");

(function(firepick) {
	var logger = new Logger();
    function Camera(mockImages) {
		var that = this;
        that.tmpFile = temp.openSync({
            prefix: 'Camera',
            suffix: '.jpg'
        });
        that.path = that.tmpFile.path;
        that.mockImages = mockImages || [];
        return that;
    };
    ///////// GLOBAL /////////////
    Camera.validate = function(camera) {
		should.exist(camera);
		if (camera.health() === 0) {
			should.throws((function() { camera.capture(); }));
		} else {
			// take a picture
			var stat1;
			var imgRef = camera.capture();
			should.exist(imgRef.path);
			should.doesNotThrow(function() {
				stat1 = fs.statSync(imgRef.path);
			});
			should(stat1.size).above(0);

			// take a different picture
			var stat2;
			should.doesNotThrow(function() {
				stat2 = fs.statSync(camera.capture().path);
				should.exist(stat2);
			});
			should.exist(stat1);
			should.exist(stat2);
			should(stat2.size).above(0);
			should(stat2.size).not.equal(stat1.size);
		}
    };

    ////////// INSTANCE ////////////
    Camera.prototype.health = function() {
		var that = this;
        return that.mockImages.length > 0 ? 1 : 0;
    }
    Camera.prototype.capture = function(imgRef) {
		var that = this;
        if (that.mockImages.length === 0) {
            throw new Error("Camera has no mockImages");
        }
		var result = imgRef ? ImageRef.copy(imgRef) : new ImageRef(null,null,null);

        var imgPath = that.mockImages[0];
		imgPath.should.be.ok;
        that.mockImages = that.mockImages.slice(1);
        //var cmd = "cp " + imgPath + " " + that.path;
        //logger.debug(cmd);
        //var out = child_process.execSync(cmd);
		result.path = imgPath;
        return result;
    }
	Camera.prototype.pushMock = function(mockImage) {
		var that = this;
		var stat = fs.statSync(mockImage);
		stat.should.exist;
		stat.size.should.above(0);
		that.mockImages.push(mockImage);
		return that;
	}

	///////////// CLASS ///////////
	
    Logger.logger.info("loaded firepick.Camera");
    module.exports = firepick.Camera = Camera;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.Camera test", function() {
	var Camera = firepick.Camera;
    var emptyCamera = new firepick.Camera();
    var camera = new firepick.Camera([
        "test/camX0Y0Z0a.jpg",
        "test/camX0Y0Z0b.jpg",
    ]);

    Camera.validate(camera);
    Camera.validate(emptyCamera);
	it("pushMock() should queue a mock image for capture()", function() {
		var c = new Camera();
		var mockImage = "test/camX0Y0Z0a.jpg";
		var statExpected = fs.statSync(mockImage);
		c.pushMock(mockImage);
		var statActual = fs.statSync(c.capture().path);
		should.exist(statExpected);
		should.equal(statActual.size, statExpected.size);
	});
})
