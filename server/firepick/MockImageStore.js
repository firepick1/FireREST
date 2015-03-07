var should = require("should"),
    module = module || {},
    firepick = firepick || {};
var fs = require("fs");
var path = require("path");
var os = require("os");
firepick.ImageRef = require("./ImageRef");
firepick.ImageStore = require("./ImageStore");

function isNumeric(obj) {
    return (obj - parseFloat(obj) + 1) >= 0;
}

(function(firepick) {

    function MockImageStore(options) {
        options = options || {};
        this.images = {};
        this.path = options.path || os.tmpDir();
        this.prefix = options.prefix || "MockImageStore";
        this.suffix = options.suffix || ".jpg";
        var mockPaths = options.mockPaths || firepick.MockImageStore.mockPaths;
        for (var i in mockPaths) {
            var ref = firepick.MockImageStore.parseMockPath(mockPaths[i]);
            var path = this.pathOf(ref);
            this.images[path] = ref;
        }
        return this;
    }

    /////////////// INSTANCE ////////////
    MockImageStore.prototype.health = function() {
        return 1;
    };
    MockImageStore.prototype.pathOf = function(imgRef) {
        if (imgRef == null) {
		}
		if (imgRef.path) {
            var name = firepick.ImageRef.nameOf(imgRef, this.prefix, this.suffix);
            return path.join(os.tmpDir(), name);
        } else {
            return this.camera.path;
        }
    };
    MockImageStore.prototype.capture = function(imgRef) {
        return this.image(imgRef);
    }
    MockImageStore.prototype.image = function(imgRef) {
        should.exist(imgRef);
        var name = firepick.ImageRef.nameOf(imgRef, this.prefix, this.suffix);
        if (this.images[name] == null) { var img00z = this.image({x:0, y: 0, z:imgRef.z}); this.images[name] = new firepick.ImageRef(imgRef.x, imgRef.y, imgRef.z, {
				path: img00z.path
			});
        }
        return this.images[name];
    }

    ////////////////// CLASS ////////////////////
    MockImageStore.parseMockPath = function(path) {
        var prefix_tokens = path.split('Z');
        var xyz = prefix_tokens[1];
        var suffix_tokens = xyz.split('@');
        xyz = suffix_tokens[0];
        var z_tokens = xyz.split("X");
        var xy_tokens = z_tokens[1].split("Y");
        return {
            x: Number(xy_tokens[0]),
            y: Number(xy_tokens[1]),
            z: Number(z_tokens[0]),
            path: path,
        };
    }
    MockImageStore.mockPaths = [
        "test/XP005_Z20X0Y0@1#1.jpg",
        "test/XP005_Z15X0Y0@1#1.jpg",
        "test/XP005_Z10X0Y0@1#1.jpg",
        "test/XP005_Z5X0Y0@1#1.jpg",
        "test/XP005_Z0X0Y0@1#1.jpg",
        "test/XP005_Z-005X0Y0@1#1.jpg",
        "test/XP005_Z-010X0Y0@1#1.jpg",
        "test/XP005_Z-015X0Y0@1#1.jpg",
        "test/XP005_Z-020X0Y0@1#1.jpg",
        "test/XP005_Z-025X0Y0@1#1.jpg",
        "test/XP005_Z-030X0Y0@1#1.jpg",
        "test/XP005_Z-035X0Y0@1#1.jpg",
        "test/XP005_Z-040X0Y0@1#1.jpg",
        "test/XP005_Z-045X0Y0@1#1.jpg",
        "test/XP005_Z-050X0Y0@1#1.jpg",
        "test/XP005_Z-055X0Y0@1#1.jpg",
        "test/XP005_Z-060X0Y0@1#1.jpg",
        "test/XP005_Z-065X0Y0@1#1.jpg",
        "test/XP005_Z-070X0Y0@1#1.jpg",
        "test/XP005_Z-075X0Y0@1#1.jpg",
        "test/XP005_Z-080X0Y0@1#1.jpg",
        "test/XP005_Z-085X0Y0@1#1.jpg",
        "test/XP005_Z-090X0Y0@1#1.jpg",
        "test/XP005_Z-095X0Y0@1#1.jpg",
        "test/XP005_Z-100X0Y0@1#1.jpg",
        "test/XP005_Z-105X0Y0@1#1.jpg",
        "test/XP005_Z-110X0Y0@1#1.jpg",
    ];

    console.log("LOADED	: firepick.MockImageStore");
    module.exports = firepick.MockImageStore = MockImageStore;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.MockImageStore test", function() {
    var is = new firepick.MockImageStore();
    it("should parse a mock image reference", function() {
        var path102 = "test/XP005_Z2X1Y0@1#1.jpg";
        var ref102 = firepick.MockImageStore.parseMockPath(path102);
        ref102.x.should.equal(1);
        ref102.y.should.equal(0);
        ref102.z.should.equal(2);
        ref102.path.should.equal(path102);
    });

//    firepick.ImageStore.validate(is);
})
