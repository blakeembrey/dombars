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
        options: {
          debug:      true,
          transform:  [],
          standalone: 'DOMBars'
        }
      },
      minify: {
        src:  'lib/dombars.js',
        dest: 'dist/dombars.min.js',
        options: {
          transform:  ['uglifyify'],
          standalone: 'DOMBars'
        }
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
