console.log("loading express...");
var express = require('express');
var fs = require('fs');
var app = express();
var post_properties = false;
var firerest={};

express.static.mime.define({'application/json': ['fire']});

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
  console.log("Mapping urlpath:" + urlpath + " to:" + filepath);
}
app.get('/firerest/index.html', function(req,res) { res.sendfile('www/index.html'); });
app.get('/', function(req,res) { res.redirect('firerest/index.html'); });
app.get('/index.html', function(req,res) { res.redirect('firerest/index.html'); });

app.use(express.bodyParser());

// If possible, use FireFUSE
console.log("Looking for FireFUSE...");
var firefuse_dir = "/dev/firefuse";
var cv_dir = "/dev/firefuse/cv";
var cnc_dir = "/dev/firefuse/cnc";
var sync_dir = "/dev/firefuse/sync";
if (fs.existsSync(cv_dir)) {
  config_file = firefuse_dir + '/config.json';
  app.use('/firerest/cv', express.static(cv_dir));
  app.use('/firerest/sync', express.static(sync_dir));
  app.use('/firerest/cnc', express.static(cnc_dir));
  console.log("Found FireFUSE!");
  console.log("Mapping /firerest/cv to: " + cv_dir);
  console.log("Mapping /firerest/sync to: " + sync_dir);
  console.log("Mapping /firerest/cnc to: " + cnc_dir);
  post_properties = true;
} else {
  app.use('/firerest/cv', express.static('www/cv'));
  app.use('/firerest/cnc', express.static('www/cnc'));
  app.use('/firerest/sync/cv', express.static('www/cv'));
  app.use('/firerest/sync/cnc', express.static('www/cnc'));
  console.log("FireFUSE is not available. FireREST is demo mode only" );
}
app.use('/firerest/html', express.static('www/html'));
app.use('/firerest/partials', express.static('www/partials'));

app.get('/firerest/config.json', function(req,res) { res.sendfile(config_file); });

firerest.post_firefuse = function(req,res,next) { 
  var filepath = req.path.replace(/^\/firerest/, firefuse_dir);
  var data = '';
  req.on('data', function(datum){ data += datum; });
  req.on('end', function (){
    if (post_properties) {
      console.log("POST file:"+filepath+" json:" + data);
      fs.writeFile(filepath, data, function() { res.end(); });
    } else {
      console.log("POST HTTP405 file:"+filepath+" json:" + data);
      res.send(405, {error:"This FireREST web service does not support properties.json updates"});
    }
  });
};

app.post(/.*\/properties.json$/, firerest.post_firefuse);
app.post(/.*\/gcode.fire$/, function(req,res,next) { 
  res.send(405, {error:"This FireREST web service does not support POST to gcode.fire"});
});

///////////////////////// CHOOSE HTTP PORT ////////////////////////
// Choose port 80 if you are comfortable having your web server operate with root-level access
//var firerest_port=80; // sudo node server/firerest.js
var firerest_port=8080; // node server/firerest.js

app.listen(firerest_port);
console.log('FireREST listening on port ' + firerest_port);
