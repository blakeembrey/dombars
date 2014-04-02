var gulp       = require('gulp');
var karma      = require('gulp-karma');
var watch      = require('gulp-watch');
var jshint     = require('gulp-jshint');
var uglify     = require('gulp-uglify');
var rename     = require('gulp-rename');
var browserify = require('gulp-browserify');

/**
 * Default Browserify compilation options.
 *
 * @type {Object}
 */
var browserifyOpts = {
  debug:      true,
  standalone: 'DOMBars'
};

/**
 * An array of test files for Karma to use.
 *
 * @type {Array}
 */
var testFiles = [
  'dist/dombars.js',
  'test/browser/**/*.js',
  'test/support/**/*.js',
  'test/fixtures/**/*'
];

/**
 * An array of source files to lint.
 *
 * @type {Array}
 */
var lintFiles = [
  '*.js',
  'lib/**/*.js',
  'test/**/*.js'
];

/**
 * Compile the full DOMBars build into debug and minified builds.
 */
gulp.task('compile:build', function () {
  return gulp.src('dombars.js')
    .pipe(browserify(browserifyOpts))
    .pipe(gulp.dest('dist'))
    .pipe(uglify())
    .pipe(rename('dombars.min.js'))
    .pipe(gulp.dest('dist'));
});

/**
 * Compile the DOMBars runtime into debug and minified builds.
 */
gulp.task('compile:runtime', function () {
  return gulp.src('runtime.js')
    .pipe(browserify(browserifyOpts))
    .pipe(rename('dombars.runtime.js'))
    .pipe(gulp.dest('dist'))
    .pipe(uglify())
    .pipe(rename('dombars.runtime.min.js'))
    .pipe(gulp.dest('dist'));
});

/**
 * Run DOMBars compilation tasks.
 */
gulp.task('compile', ['compile:build', 'compile:runtime']);

/**
 * Test DOMBars using Karma testing suite.
 */
gulp.task('test:karma', function () {
  return gulp.src(testFiles)
    .pipe(karma({
      configFile: 'karma.conf.js',
      action: 'run'
    }))
    .on('error', function (err) {
      throw err;
    });
});

/**
 * Lint the source files once.
 */
gulp.task('test:lint', function () {
  return gulp.src(lintFiles)
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

/**
 * Test the build.
 */
gulp.task('test', ['test:lint', 'test:karma']);

/**
 * Lint files using JSHint.
 */
gulp.task('lint', function () {
  return gulp.src(lintFiles)
    .pipe(watch())
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

/**
 * Make changes whenever files change.
 */
gulp.task('watch', function () {
  gulp.watch('lib/**/*.js', ['compile']);

  return gulp.src(testFiles)
    .pipe(karma({
      configFile: 'karma.conf.js',
      action: 'watch'
    }));
});

/**
 * The default task run by Gulp.
 */
gulp.task('default', ['lint', 'watch']);
