var should = require("should"),
    module = module || {},
    firepick;
var child_process = require('child_process');
var fs = require('fs');
var temp = require('temp');
temp.track();

(function(firepick) {
    function Camera(mockImages) {
        this.tmpFile = temp.openSync({
            prefix: 'Camera',
            suffix: '.jpg'
        });
        this.path = this.tmpFile.path;
        this.mockImages = mockImages || [];
        return this;
    };
    ///////// GLOBAL /////////////
    Camera.validate = function(camera) {
        describe("Camera.validate(" + camera.constructor.name + ")", function() {
            it("should exist", function() {
                should.exist(camera);
            });
            if (camera.health() === 0) {
                it("should throw an Error if unavailable", function() {
                    should.throws((function() {
                        camera.capture();
                    }));
                });
            } else {
                var stat1;
                it("should take a picture if available", function() {
                    should(camera.capture()).equal(camera);
                    should.exist(camera.path);
                    should.doesNotThrow(function() {
                        stat1 = fs.statSync(camera.path);
                    });
                    should(stat1.size).above(0);
                });
                it("should take a different picture", function() {
                    var stat2;
                    should.doesNotThrow(function() {
                        stat2 = fs.statSync(camera.capture().path);
                        should.exist(stat2);
                    });
                    should.exist(stat1);
                    should.exist(stat2);
                    should(stat2.size).above(0);
                    should(stat2.size).not.equal(stat1.size);
                });
            }
            return true;
        });
    };

    ////////// INSTANCE ////////////
    Camera.prototype.health = function() {
        return this.mockImages.length > 0 ? 1 : 0;
    }
    Camera.prototype.capture = function() {
        if (this.mockImages.length === 0) {
            throw new Error("Camera has no mockImages");
        }

        var image = this.mockImages[0];
        this.mockImages = this.mockImages.slice(1);
        var cmd = "cp " + image + " " + this.path;
        //console.log(cmd);
        var out = child_process.execSync(cmd);
        return this;
    }

    console.log("LOADED	: firepick.Camera");
    module.exports = firepick.Camera = Camera;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.Camera test", function() {
    var emptyCamera = new firepick.Camera();
    var camera = new firepick.Camera([
        "test/camX0Y0Z0a.jpg",
        "test/camX0Y0Z0b.jpg",
    ]);

    firepick.Camera.validate(camera);
    firepick.Camera.validate(emptyCamera);
});
