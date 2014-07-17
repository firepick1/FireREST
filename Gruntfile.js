module.exports = function(grunt) {
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: {
	banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      build: {
	src: 'www/js/services.js',
	dest: 'target/services.min.js'
      }
    }
  });
  
  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-uglify');
 
  // Default task(s).
  grunt.registerTask('default', ['uglify']);

  var customizeJSON = function(original, custom) {
    for(var key in custom) { if (custom.hasOwnProperty(key)) {
      if (original.hasOwnProperty(key)) {
        var customValue = custom[key];
	var originalValue = original[key];
	if (typeof customValue === "object" && typeof originalValue == "object") {
	  customizeJSON(originalValue, customValue);
	} else {
	  original[key] = custom[key];
	}
      } else {
        original[key] = custom[key];
      }
    }}
  }

  grunt.registerTask('config-custom', 'Customize FireREST JSON config file', function(config, custom) {
    if (typeof config === "undefined") {
      throw grunt.util.error(this.name + " expected path of FireREST configuration file");
    }
    if (typeof custom === "undefined") {
      throw grunt.util.error(this.name + " expected path of FireREST custom configuration file");
    }
    var json = grunt.file.readJSON(config);
    var custom = grunt.file.readJSON(custom);
    customizeJSON(json, custom);
    grunt.file.write(config, JSON.stringify(json, null, "  "));
  });

  grunt.registerTask('config-version', 'Add version to given FireREST JSON config file', function(src, dst, major, minor, patch) {
    if (typeof src === "undefined") {
      throw grunt.util.error(this.name + " expected path of source FireREST configuration file");
    }
    if (typeof dst === "undefined") {
      throw grunt.util.error(this.name + " expected path of destination FireREST configuration file");
    }
    if (typeof patch === "undefined") {
      throw grunt.util.error(this.name + " expected major, minor and patch version numbers");
    } 
    
    var json = grunt.file.readJSON(src);
    json.FireREST.version.major = major;
    json.FireREST.version.minor = minor;
    json.FireREST.version.patch = patch;
    grunt.file.write(dst, JSON.stringify(json, null, "  "));
    grunt.log.writeln("VERSION\t: " + dst + " v" + major + "." + minor + "." + patch);
  });
}
