var should = require("should"),
    module = module || {},
    firepick;
var child_process = require('child_process');
var fs = require('fs');
var temp = require('temp');
temp.track();

(function(firepick) {
    function MockCamera(images) {
        this.tmpFile = temp.openSync({prefix:'MockCamera',suffix:'.jpg'});
		this.path = this.tmpFile.path;
        this.images = images || [];
        return this;
    }
    MockCamera.prototype.capture = function() {
        if (this.images.length === 0) {
			throw "MockCamera has no images";
		}

		var image = this.images[0];
		this.images = this.images.slice(1);
		var cmd = "cp " + image + " " + this.path;
		//console.log(cmd);
		var out = child_process.execSync(cmd);
		return this;
    }
    MockCamera.prototype.push = function(imagePath) {
        this.images.push(imagePath);
		return this;
    }

    console.log("LOADED	: firepick.MockCamera");
    module.exports = firepick.MockCamera = MockCamera;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.MockCamera test", function() {
	var emptyCamera = new firepick.MockCamera();
    var camera = new firepick.MockCamera([
		"test/camX0Y0Z0a.jpg",
		"test/camX0Y0Z0a.jpg",
		"test/camX0Y0Z0b.jpg",
		"test/camX1Y0Z0.jpg"
	]);

    it("should have camera path", function() {
        should(camera.path).match(/^.*MockCamera.*\.jpg$/, 'temporary camera path');
    });
	var camX0Y0Z0a = fs.statSync("test/camX0Y0Z0a.jpg");
	should(camX0Y0Z0a.size).above(0);
	var camX0Y0Z0b = fs.statSync("test/camX0Y0Z0b.jpg");
	should(camX0Y0Z0b.size).above(0);
	var camX1Y0Z0 = fs.statSync("test/camX1Y0Z0.jpg");
	should(camX1Y0Z0.size).above(0);
	should.notEqual(camX0Y0Z0a.size, camX0Y0Z0b.size);
	should.notEqual(camX0Y0Z0a.size, camX1Y0Z0.size);
	should.notEqual(camX0Y0Z0b.size, camX1Y0Z0.size);
	it("should capture images if available", function() {
		(function(){emptyCamera.capture();}).should.throw();
		should(camera.capture()).equal(camera);
		should(fs.statSync(camera.path).size).equal(camX0Y0Z0a.size);
		camera.capture();
		should(fs.statSync(camera.path).size).equal(camX0Y0Z0a.size);
		camera.capture();
		should(fs.statSync(camera.path).size).equal(camX0Y0Z0b.size);
		camera.capture();
		should(fs.statSync(camera.path).size).equal(camX1Y0Z0.size);
	});
	it("should capture new images with push", function() {
		(function(){emptyCamera.capture();}).should.throw();
		should(emptyCamera.push("test/camX0Y0Z0a.jpg")).equal(emptyCamera);
		emptyCamera.capture();
		should(fs.statSync(emptyCamera.path).size).equal(camX0Y0Z0a.size);
		(function(){emptyCamera.capture();}).should.throw();
	});
});
