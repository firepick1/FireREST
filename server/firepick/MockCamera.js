var should = require("should"),
    module = module || {},
    firepick;
var child_process = require('child_process');
var fs = require('fs');
var temp = require('temp');
temp.track();

(function(firepick) {
    function MockCamera() {
        this.tmpFile = temp.openSync({prefix:'MockCamera',suffix:'.jpg'});
		this.path = this.tmpFile.path;
        this.images = [];
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
    }
    MockCamera.prototype.push = function(imagePath) {
        this.images.push(imagePath);
    }

    console.log("LOADED	: firepick.MockCamera");
    module.exports = firepick.MockCamera = MockCamera;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.MockCamera test", function() {
    var camera = new firepick.MockCamera();

    it("should have camera path", function() {
        should(camera.path).match(/^.*MockCamera.*\.jpg$/, 'temporary camera path');
    });
	it("should capture images", function() {
		(function(){camera.capture();}).should.throw();

		camera.push("test/camX0Y0Z0a.jpg");
		camera.push("test/camX0Y0Z0a.jpg");
		camera.push("test/camX0Y0Z0b.jpg");
		camera.push("test/camX1Y0Z0.jpg");
		var camX0Y0Z0a = fs.statSync("test/camX0Y0Z0a.jpg");
		should(camX0Y0Z0a.size).above(0);
		var camX0Y0Z0b = fs.statSync("test/camX0Y0Z0b.jpg");
		should(camX0Y0Z0b.size).above(0);
		var camX1Y0Z0 = fs.statSync("test/camX1Y0Z0.jpg");
		should(camX1Y0Z0.size).above(0);
		should.notEqual(camX0Y0Z0a.size, camX0Y0Z0b.size);
		should.notEqual(camX0Y0Z0a.size, camX1Y0Z0.size);
		should.notEqual(camX0Y0Z0b.size, camX1Y0Z0.size);

		camera.capture();
		should(fs.statSync(camera.path).size).equal(camX0Y0Z0a.size);
		camera.capture();
		should(fs.statSync(camera.path).size).equal(camX0Y0Z0a.size);
		camera.capture();
		should(fs.statSync(camera.path).size).equal(camX0Y0Z0b.size);
		camera.capture();
		should(fs.statSync(camera.path).size).equal(camX1Y0Z0.size);

		(function(){camera.capture();}).should.throw();
	});

});
