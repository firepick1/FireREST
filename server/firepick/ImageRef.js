var should = require("should"),
    module = module || {},
    firepick;
var child_process = require('child_process');
var fs = require('fs');
var temp = require('temp');
temp.track();

(function(firepick) {
    function ImageRef(x, y, z, properties) {
        this.x = x || 0;
        this.y = y || 0;
        this.z = z || 0;
        if (properties) {
            should.ok(typeof properties === 'object');
            for (var prop in properties) {
                if (properties.hasOwnProperty(prop) && properties[prop] != null) {
                    this[prop] = properties[prop];
                }
            }
        }
        return this;
    }

    //////////////// CLASS //////////////////////
    ImageRef.copy = function(refSrc) {
        return new ImageRef(refSrc.x, refSrc.y, refSrc.z, refSrc);
    }
    ImageRef.keyOf = function(imgRef) {
        var key = "_" + imgRef.x + "_" + imgRef.y + "_" + imgRef.z;

        if (imgRef.tag || imgRef.version) {
            key += "#" + (imgRef.tag || "");
        }
        if (imgRef.version) {
            key += "_" + imgRef.version;
        }
        return key;
    }
    ImageRef.parse = function(path) {
        var $tokens = path.split('#');
        var _tokens = $tokens[0].split('_');
        if ($tokens.length > 1) {
            var _tokens1 = $tokens[1].split('_');
            _tokens.push(_tokens1[0]);
            if (_tokens1.length > 1) {
                var suffixTokens = _tokens1[1].split('.');
                _tokens.push(suffixTokens[0]);
            }
        }
        return new firepick.ImageRef(
            Number(_tokens[1]), /* x */
            Number(_tokens[2]), /* y */
            Number(_tokens[3]), /* z */ {
                tag: _tokens[4],
                version: _tokens[5]
            });
    };
    ImageRef.compare = function(img1, img2) {
        var cmp =
            ((img1.x || 0) - (img2.x || 0)) ||
            ((img1.y || 0) - (img2.y || 0)) ||
            ((img1.z || 0) - (img2.z || 0));
        if (cmp === 0) {
            var s1 = img1.tag || "";
            var s2 = img2.tag || "";
            cmp = (s1 === s2 ? 0 : (s1 < s2 ? -1 : 1));
        }
        cmp = cmp || ((img1.version || 0) - (img2.version || 0));
        return cmp;
    };

    //////////////// INSTANCE /////////////////////
    ImageRef.prototype.copy = function() {
        return ImageRef.copy(this);
    };
    ImageRef.prototype.setPath = function(path) {
        path.should.be.a.String;
        this.path = path;
        return this;
    };
    ImageRef.prototype.setVersion = function(version) {
        if (version == null) {
            delete this.version;
        } else {
            this.version = version;
        }
        return this;
    };
    ImageRef.prototype.setTag = function(tag) {
        if (tag == null) {
            delete this.tag;
        } else {
            this.tag = tag;
        }
        return this;
    };
    ImageRef.prototype.setX = function(x) {
        this.x = x;
        return this;
    };
    ImageRef.prototype.setY = function(y) {
        this.y = y;
        return this;
    };
    ImageRef.prototype.setZ = function(z) {
        this.z = z;
        return this;
    };
    ImageRef.prototype.name = function(prefix, suffix) {
        return (prefix || "") + ImageRef.keyOf(this) + (suffix || "");
    };
    ImageRef.prototype.compare = function(that) {
        return ImageRef.compare(this, that);
    };
    ImageRef.prototype.exists = function() {
        try {
            fs.statSync(this.path);
            return true;
        } catch (err) {
            return false; // silly nodejs is deprecating fs.exists()
        }
    };
    ImageRef.prototype.round = function(xplaces, yplaces, zplaces) {
        xplaces = xplaces == null ? 0 : xplaces;
        yplaces = yplaces == null ? xplaces : yplaces;
        zplaces = zplaces == null ? yplaces : zplaces;
        this.x = +(Math.round(this.x + "e+" + xplaces) + "e-" + xplaces);
        this.y = +(Math.round(this.y + "e+" + yplaces) + "e-" + yplaces);
        this.z = +(Math.round(this.z + "e+" + zplaces) + "e-" + zplaces);
        return this;
    };

    console.log("LOADED	: firepick.ImageRef");
    module.exports = firepick.ImageRef = ImageRef;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.ImageRef test", function() {
    var ref000 = new firepick.ImageRef();
    var ref123 = new firepick.ImageRef(1, 2, 3);

    it("should undefined be tested as == null", function() {
        var undef;
        should.equal(true, undef == null);
        should.equal(true, null == null);
        should.equal(false, "a" == null);
        should.equal(false, function() {
            return null;
        } == null);
    });
    it("should be created", function() {
        should.equal(0, ref000.x);
        should.equal(0, ref000.y);
        should.equal(0, ref000.z);
        should.equal(1, ref123.x);
        should.equal(2, ref123.y);
        should.equal(3, ref123.z);
    });
    it("should be comparable", function() {
        should.equal(0, firepick.ImageRef.compare({
            x: 0,
            y: 0,
            z: 0
        }, ref000));
        should.equal(0, firepick.ImageRef.compare({
            z: 3,
            y: 2,
            x: 1
        }, ref123));
        should(firepick.ImageRef.compare(ref000, ref123)).be.below(0);
        should(firepick.ImageRef.compare(ref123, ref000)).be.above(0);
        should(firepick.ImageRef.compare({
            x: 0,
            y: 0,
            z: 0
        }, {
            x: 0,
            y: 0,
            z: 3
        })).be.below(0);
        should(firepick.ImageRef.compare({
            x: 0,
            y: 0,
            z: 0
        }, {
            x: 0,
            y: 0,
            z: 0,
            tag: "test"
        })).be.below(0);
        should(firepick.ImageRef.compare({
            x: 0,
            y: 0,
            z: 0,
            tag: "test",
            version: 1
        }, {
            x: 0,
            y: 0,
            z: 0,
            tag: "test"
        })).be.above(0);
        should(ref000.compare(ref123)).be.below(0);
    });
    it("should copy", function() {
        var ref123a4 = new firepick.ImageRef(1, 2, 3, {
            tag: "a",
            version: 4
        });
        var ref123a4_copy1 = ref123a4.copy();
        var ref123a4_copy2 = firepick.ImageRef.copy(ref123a4);
        should.equal(0, ref123a4.compare(ref123a4_copy1));
        should.equal(0, ref123a4.compare(ref123a4_copy2));
        should.equal(0, ref123a4_copy1.compare(ref123a4_copy2));
        should.equal(0, ref123a4_copy1.compare({
            version: 4,
            tag: "a",
            z: 3,
            y: 2,
            x: 1
        }));
    });
    it("should have a name", function() {
        var ref123a4 = new firepick.ImageRef(1, 2, 3, {
            tag: "a",
            version: 4
        });
        var ref123_4 = ref123.copy().setVersion(4);
        var ref123b = ref123.copy().setTag('b');
        should.equal("_1_2_3", ref123.name());
        should.equal("prefix_1_2_3.jpg", ref123.name("prefix", ".jpg"));
        should.equal("prefix_1_2_3#a_4.jpg", ref123a4.name("prefix", ".jpg"));
        should.equal("_1_2_3#_4.jpg", ref123_4.name("", ".jpg"));
        should.equal("prefix_1_2_3#b", ref123b.name("prefix"));
    });
    it("should have a parseable name", function() {
        var ref123a5 = new firepick.ImageRef(1, 2, 3, {
            tag: "a",
            version: 5
        });
        var name123a5 = ref123a5.name("/a/b/c", ".jpg");
        var refParse = firepick.ImageRef.parse(name123a5);
        should.equal(0, firepick.ImageRef.compare(refParse, ref123a5));
    });
    it("should have chained setters", function() {
        var ref = new firepick.ImageRef(0, 0, 0);
        ref = ref.setX(1);
        ref = ref.setY(2);
        ref = ref.setZ(3);
        ref = ref.setTag("A");
        ref = ref.setVersion(4);
        should(ref).have.properties({
            x: 1,
            y: 2,
            z: 3,
            tag: "A",
            version: 4
        });
    });
    it("should round", function() {
        var ref123 = new firepick.ImageRef(1, 2, 3);
        var x = 1.09871;
        var y = 2.2463;
        var z = 3.3192;
        var ref = new firepick.ImageRef(x, y, z);
        should.notDeepEqual(ref, ref123);
        should.deepEqual(ref.round(), ref123); // rounds actual ImageRef
        should.deepEqual(ref, ref123);
        should.deepEqual(new firepick.ImageRef(x, y, z).round(), ref123);
        should.deepEqual(new firepick.ImageRef(x, y, z).round(1), new firepick.ImageRef(1.1, 2.2, 3.3));
        should.deepEqual(new firepick.ImageRef(x, y, z).round(0, 1), new firepick.ImageRef(1, 2.2, 3.3));
        should.deepEqual(new firepick.ImageRef(x, y, z).round(0, 0, 1), new firepick.ImageRef(1, 2, 3.3));
        should.deepEqual(new firepick.ImageRef(x, y, z).round(3), new firepick.ImageRef(1.099, 2.246, 3.319));
    });
    it("exists() should return true iff image reference path exists", function() {
        new firepick.ImageRef(0, 0, 0, {
            path: "no/such/file"
        }).exists().should.equal(false);
        new firepick.ImageRef(0, 0, 0).exists().should.equal(false);
        new firepick.ImageRef(0, 0, 0, {
            path: "test/camX0Y0Z0a.jpg"
        }).exists().should.equal(true);
    });
});
