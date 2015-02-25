var should = require("should"),
    module = module || {},
    firepick;
var child_process = require('child_process');
var fs = require('fs');

var Camera = require("./Camera.js");

(function(firepick) {
    function Camera(path) {
        this.path = path || '/dev/firefuse/cv/1/camera.jpg';
        return this;
    }
    Camera.prototype.withPath = function(path) {
        this.path = path;
        return this;
    }

    console.log("firepick.Camera");
    module.exports = firepick.Camera = Camera;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.Camera test", function() {
    var camera = new firepick.Camera();
    var cam_ab = new firepick.Camera("/a/b");

    function assertCommand(result, expected) {
        should(result).equal(cal, "expected fluent call returning cal object");
        should(output).equal(expected);
        output = undefined;
    }

    it("should have camera path", function() {
        should(camera.path).equal('/dev/firefuse/cv/1/camera.jpg', 'default camera path');
        should(cam_ab.path).equal('/a/b', 'constructor camera path');
        should(cam_ab.withPath('/x/y').path).equal('/x/y', 'withPath()');
    });
    it("should call firesight shell command", function() {
        should.exist(child_process);
        should.doesNotThrow(function() {
            var out = child_process.execSync('firesight -version', {
                encoding: 'utf8'
            });
            var jout = JSON.parse(out);
            should.exist(jout.version);
        });
    });

});
