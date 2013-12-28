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
        src: ['lib/**/*.js', 'test/**/*.js', '*.js']
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
        src:  'dombars.js',
        dest: 'dist/dombars.js',
        options: debugOptions
      },
      minify: {
        src:  'dombars.js',
        dest: 'dist/dombars.min.js',
        options: minifyOptions
      },
      'debug-runtime': {
        src: 'runtime.js',
        dest: 'dist/dombars.runtime.js',
        options: debugOptions
      },
      'minify-runtime': {
        src:  'runtime.js',
        dest: 'dist/dombars.runtime.min.js',
        options: minifyOptions
      }
    },

    /**
     * Uglify the output of the minified Browserified files.
     *
     * @type {Object}
     */
    uglify: {
      minify: {
        files: {
          'dist/dombars.min.js': ['dist/dombars.min.js']
        }
      },
      'minify-runtime': {
        files: {
          'dist/dombars.runtime.min.js': ['dist/dombars.runtime.min.js']
        }
      }
    },

    /**
     * Execute the test suite using Karma.
     *
     * @type {Object}
     */
    karma: {
      options: {
        configFile: 'karma.conf.js'
      },
      unit: {
        singleRun: false,
        background: true
      },
      ci: {
        singleRun: true
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
        tasks: ['compile']
      },
      lint: {
        files: ['<%= jshint.all.src %>'],
        tasks: ['newer:jshint:all']
      },
      karma: {
        files: ['lib/**/*.js', 'test/browser/**/*.js'],
        tasks: ['karma:unit:run']
      }
    }
  });

  grunt.registerTask('test',    ['jshint', 'karma:ci']);
  grunt.registerTask('build',   ['browserify', 'uglify']);
  grunt.registerTask('default', ['build', 'karma:unit', 'watch']);
};
