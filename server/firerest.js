console.log("loading express...");
var express = require('express');
var fs = require('fs');
var app = express();
var post_enabled = false;
var firerest = {};

var kue = require('kue');
var jobs = kue.createQueue();
var firepick = require('./firepick/firepick.js');

express.static.mime.define({
    'application/json': ['fire']
});

app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
});

// By default, use reference implementation
var __appdir = "www/";
var config_file = __appdir + 'config.json';
var dirs = ['bootstrap', 'img', 'css', 'js', 'lib'];
for (var i = 0; i < dirs.length; i++) {
    var urlpath = '/firerest/' + dirs[i];
    var filepath = __appdir + dirs[i];
    app.use(urlpath, express.static(filepath));
    console.log("INFO\t: Mapping urlpath:" + urlpath + " to:" + filepath);
}
app.get('/firerest/index.html', function(req, res) {
    res.sendfile('www/index.html');
});
app.get('/', function(req, res) {
    res.redirect('firerest/index.html');
});
app.get('/index.html', function(req, res) {
    res.redirect('firerest/index.html');
});

app.use(express.bodyParser());

firerest.post_saved_png = function(req, res) {
    var filepath = req.path.replace(/^\/firerest/, firefuse_dir);
    var data = [];

    req.on('data', function(datum) {
        data[data.length] = datum;
    });
    req.on('end', function() {
        if (post_enabled) {
            var buf = Buffer.concat(data);
            console.log('INFO\t: POST file:' + filepath + ' buf:' + buf.length);
            fs.writeFileSync(filepath, buf);
            res.end();
        } else {
            console.log("INFO\t: POST HTTP405 file:" + filepath + " json:" + data);
            res.send(405, {
                error: "This FireREST web service does not support properties.json updates"
            });
        }
    });

    res.send({
        status: "ok"
    });
};

firerest.post_firefuse = function(req, res, next) {
    var filepath = req.path.replace(/^\/firerest/, firefuse_dir);
    var data = '';
    req.on('data', function(datum) {
        data += datum;
    });
    req.on('end', function() {
        if (post_enabled) {
            console.log("INFO\t: POST file:" + filepath + " json:" + data);
            fs.writeFile(filepath, data, function() {
                res.end();
            });
        } else {
            console.log("INFO\t: POST HTTP405 file:" + filepath + " json:" + data);
            res.send(405, {
                error: "This FireREST web service does not support properties.json updates"
            });
        }
    });
};

// If possible, use FireFUSE
console.log("INFO\t: Looking for FireFUSE...");
var firefuse_dir = "/dev/firefuse";
var cv_dir = "/dev/firefuse/cv";
var cnc_dir = "/dev/firefuse/cnc";
var sync_dir = "/dev/firefuse/sync";
var post_gcode_fire;

if (fs.existsSync(cv_dir)) {
    config_file = firefuse_dir + '/config.json';
    app.use('/firerest/cv', express.static(cv_dir));
    app.use('/firerest/sync', express.static(sync_dir));
    app.use('/firerest/cnc', express.static(cnc_dir));
    console.log("INFO\t: Found FireFUSE!");
    console.log("INFO\t: Mapping /firerest/cv to: " + cv_dir);
    console.log("INFO\t: Mapping /firerest/sync to: " + sync_dir);
    console.log("INFO\t: Mapping /firerest/cnc to: " + cnc_dir);
    post_enabled = true;
    post_gcode_fire = firerest.post_firefuse;
} else {
    app.use('/firerest/cv', express.static('www/cv'));
    app.use('/firerest/cnc', express.static('www/cnc'));
    app.use('/firerest/sync/cv', express.static('www/cv'));
    app.use('/firerest/sync/cnc', express.static('www/cnc'));
    post_gcode_fire = function(req, res, next) {
        res.send(405, {
            error: "This FireREST web service does not support POST to gcode.fire"
        });
    };
    console.log("INFO\t: FireFUSE is not available. FireREST is demo mode only");
}
app.use('/firerest/html', express.static('www/html'));
app.use('/firerest/partials', express.static('www/partials'));

app.get('/firerest/config.json', function(req, res) {
    res.sendfile(config_file);
});

app.post(/.*\/properties.json$/, firerest.post_firefuse);
app.post(/.*\/saved.png$/, firerest.post_saved_png);
app.post(/.*\/gcode.fire$/, post_gcode_fire);

///////////////////////// CHOOSE HTTP PORT ////////////////////////
// Choose port 80 if you are comfortable having your web server operate with root-level access
//var firerest_port=80; // sudo node server/firerest.js
var firerest_port = 8080; // node server/firerest.js

app.listen(firerest_port);
console.log('SUCCESS\t: FireREST listening on port ' + firerest_port);
