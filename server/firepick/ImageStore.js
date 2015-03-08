var should = require("should"),
    module = module || {},
    firepick = firepick || {};
var fs = require("fs");
var path = require("path");
var os = require("os");
firepick.Camera = require("./Camera");
firepick.ImageRef = require("./ImageRef");

function isNumeric(obj) {
    return (obj - parseFloat(obj) + 1) >= 0;
}

(function(firepick) {
    function ImageStore(camera, options) {
        var that = this;
        that.camera = camera || new firepick.Camera();
        that.images = options && options.images || {};
        that.path = options && options.path || os.tmpDir();
        that.prefix = options && options.prefix || "ImageStore";
        that.suffix = options && options.suffix || ".jpg";
        return that;
    };
    /////////////// INSTANCE ////////////
    ImageStore.prototype.health = function() {
        var that = this;
        return that.camera.health();
    };
    ImageStore.prototype.pathOf = function(imgRef) {
        var that = this;
        if (imgRef) {
            var name = that.prefix + firepick.ImageRef.keyOf(imgRef) + that.suffix;
            return path.join(os.tmpDir(), name);
        } else {
            return that.camera.path;
        }
    };
    ImageStore.prototype.parseImageRef = function(path) {
        var that = this;
        var suffixPos = path.lastIndexOf(that.suffix);
        path = suffixPos < 0 ? path : path.slice(0, suffixPos);
        var prefixPos = path.indexOf(that.prefix);
        path = prefixPos < 0 ? path : path.slice(prefixPos + that.prefix.length);
        return firepick.ImageRef.parse(path);
    }
    ImageStore.prototype.clear = function() {
        var that = this;
        that.images = {};
        return that;
    };
    ImageStore.prototype.peek = function(imgRef) {
        var that = this;
        should.exist(imgRef);
        var key = firepick.ImageRef.keyOf(imgRef);
        return that.images[key];
    }
    ImageStore.prototype.load = function(imgRef, srcPath) {
        var that = this;
        imgRef = imgRef instanceof firepick.ImageRef ?
            imgRef : firepick.ImageRef.copy(imgRef);
        srcPath = srcPath || imgRef.path;
        should.exist(srcPath);
        var key = firepick.ImageRef.keyOf(imgRef);
        var dstPath = that.pathOf(imgRef);
        fs.writeFileSync(dstPath, fs.readFileSync(srcPath));
        var newRef = firepick.ImageRef.copy(imgRef);
        newRef.path = dstPath;
        that.images[key] = newRef;
        return newRef;
    }
    ImageStore.prototype.capture = function(imgRef) {
        var that = this;
        should.exist(imgRef);
        that.camera.capture();
        return that.load(imgRef, that.camera.path);
    }
    ImageStore.prototype.image = function(imgRef) {
        var that = this;
        should.exist(imgRef);
        var key = firepick.ImageRef.keyOf(imgRef);
        if (that.images[key] == null) {
            that.capture(imgRef);
        }
        return that.images[key];
    }

    /////////////// GLOBAL /////////////
    ImageStore.validate = function(imgStore) {
        var storeClass = imgStore.constructor.name;
        describe("ImageStore.validate(" + storeClass + ")", function() {
            var ref123 = new firepick.ImageRef(1, 2, 3, {
                tag: "test",
                version: 1
            });
            it("should implement pathOf", function() {
                var path123 = imgStore.pathOf(ref123);
                should(path123.indexOf("_1_2_3")).above(-1);
                should(path.basename(path123)).equal(imgStore.prefix + "_1_2_3#test_1" + imgStore.suffix);
            });
            it("should parse an ImageREf from a path", function() {
                var path123 = imgStore.pathOf(ref123);
                var parse123 = imgStore.parseImageRef(path123);
                should.equal(0, firepick.ImageRef.compare(parse123, ref123));
            });
            var stat1;
            var img123;
            it("should return unique, client-mutable image", function() {
                img123 = imgStore.image(ref123);
                should.exist(img123);
                should.not.exist(img123.size);
                var stat1 = fs.statSync(imgStore.pathOf(ref123));
                should.exist(stat1);
                img123.size = stat1.size;
                img123["color"] = "pink";
                var img2 = imgStore.image(ref123);
                should(img123.color).equal(img2.color);
            });
        });
    };

    console.log("LOADED	: firepick.ImageStore");
    module.exports = firepick.ImageStore = ImageStore;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.ImageStore test", function() {
    var camera1 = new firepick.Camera(["test/camX0Y0Z0a.jpg"]);
    var camera2 = new firepick.Camera(["test/camX0Y0Z0a.jpg"]);
    var imgStore = new firepick.ImageStore(camera1);
    var imgStoreTest = new firepick.ImageStore(camera2, {
        prefix: "Test",
        suffix: ".JPG"
    });
    firepick.ImageStore.validate(imgStore);
    firepick.ImageStore.validate(imgStoreTest);

    describe("Test ImageStore extensions", function() {
        var ref123 = new firepick.ImageRef(1, 2, 3, {
            tag: "test",
            version: 1
        });
        it("should clear", function() {
            should(imgStore.clear()).equal(imgStore);
            should.not.exist(imgStore.peek(ref123));
        });
        /*
        it("should load an external image", function() {
            var raw123_6 = {
                x: 1,
                y: 2,
                z: 3,
                tag: "test",
                version: 6
            };
            var ref123_6 = firepick.ImageRef.copy(raw123_6);
            var peek123_6 = imgStore.peek(raw123_6);
            should.not.exist(peek123_6);
            imgStore.load(raw123_6, "test/camX0Y0Z0a.jpg");
            peek123_6 = imgStore.peek(raw123_6);
            peek123_6.x.should.equal(ref123_6.x);
            peek123_6.y.should.equal(ref123_6.y);
            peek123_6.z.should.equal(ref123_6.z);
            peek123_6.tag.should.equal(ref123_6.tag);
            peek123_6.version.should.equal(ref123_6.version);
            should.notStrictEqual(peek123_6, ref123_6);
            var ref123_7 = new firepick.ImageRef(1, 2, 3, {
                tag: "test",
                version: 7,
                path: "test/camX0Y0Z0a.jpg"
            });
            var peek123_7 = imgStore.peek(ref123_7);
            should.not.exist(peek123_7);
            peek123_7 = imgStore.load(ref123_7);
            peek123_7.x.should.equal(ref123_7.x);
            peek123_7.y.should.equal(ref123_7.y);
            peek123_7.z.should.equal(ref123_7.z);
            peek123_7.tag.should.equal(ref123_7.tag);
            peek123_7.version.should.equal(ref123_7.version);
        });
		*/
    });
})
