console.log("loading express...");
var express = require('express');
var fs = require('fs');
var app = express();

express.static.mime.define({'application/json': ['fire']});

app.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});

// By default, use reference implementation
var __appdir = "www/firerest/";
var config_file = 'www/firerest/config.json';
var dirs = ['bootstrap', 'img', 'css', 'js', 'lib'];
for (var i = 0; i < dirs.length; i++) {
  var urlpath = '/firerest/' + dirs[i];
  var filepath = __appdir + dirs[i];
  app.use(urlpath, express.static(filepath));
  console.log("Mapping urlpath:" + urlpath + " to:" + filepath);
}
app.post(/.*\/properties.json$/, function(req,res) { 
  res.send('what-me-post'); 
});
app.get('/', function(req,res) { res.sendfile('www/index.html'); });
app.get('/index.html', function(req,res) { res.sendfile('www/index.html'); });
app.get('/firerest/cvtest.html', function(req,res) { res.sendfile('www/firerest/cvtest.html'); });

app.use(express.bodyParser());

// If possible, use FireFUSE
console.log("Looking for FireFUSE...");
var cv_dir = "/dev/firefuse/cv";
if (fs.existsSync(cv_dir)) {
  config_file = '/dev/firefuse/config.json';
  app.use('/firerest/cv', express.static(cv_dir));
  console.log("Found FireFUSE!");
  console.log("Mapping /firerest/cv to: " + cv_dir);
} else {
  app.use('/firerest/cv', express.static('www/firerest/cv'));
  console.log("FireFUSE is not available. FireREST is demo mode only" );
}

app.get('/firerest/config.json', function(req,res) { res.sendfile(config_file); });

///////////////////////// CHOOSE HTTP PORT ////////////////////////
// Choose port 80 if you are comfortable having your web server operate with root-level access
//var firerest_port=80; // sudo node server/firerest.js
var firerest_port=8080; // node server/firerest.js

app.listen(firerest_port);
console.log('FireREST listening on port ' + firerest_port);
