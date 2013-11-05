/**
 * Standard options for working with a Browserify compiled script.
 *
 * @type {Object}
 */
var debugOptions = {
  debug:      true,
  transform:  [],
  standalone: 'DOMBars'
};

/**
 * Standard options for a miinified Browserify script.
 *
 * @type {Object}
 */
var minifyOptions = {
  transform:  ['uglifyify'],
  standalone: 'DOMBars'
};

/**
 * Initialize the grunt configuration script.
 *
 * @param {Object} grunt
 */
module.exports = function (grunt) {
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    /**
     * Lint all JavaScript according the current JSHint config.
     *
     * @type {Object}
     */
    jshint: {
      all: {
        src: ['lib/**/*.js', 'Gruntfile.js', 'test/**/*.js']
      },
      options: {
        jshintrc: '.jshintrc'
      }
    },

    /**
     * Compile browser-side modules for simplified consumption.
     *
     * @type {Object}
     */
    browserify: {
      debug: {
        src:  'lib/dombars.js',
        dest: 'dist/dombars.js',
        options: debugOptions
      },
      minify: {
        src:  'lib/dombars.js',
        dest: 'dist/dombars.min.js',
        options: minifyOptions
      },
      'debug-runtime': {
        src: 'lib/dombars.runtime.js',
        dest: 'dist/dombars.runtime.js',
        options: debugOptions
      },
      'minify-runtime': {
        src:  'lib/dombars.runtime.js',
        dest: 'dist/dombars.runtime.min.js',
        options: minifyOptions
      }
    },

    /**
     * Watch for any file changes and run the supporting processes.
     *
     * @type {Object}
     */
    watch: {
      build: {
        files: ['lib/**/*.js'],
        tasks: ['browserify']
      },
      lint: {
        files: ['<%= jshint.all.src %>'],
        tasks: ['newer:jshint:all']
      }
    }
  });

  grunt.registerTask('test', ['jshint']);

  grunt.registerTask('build', ['test', 'browserify']);

  grunt.registerTask('default', ['build', 'watch']);
};
