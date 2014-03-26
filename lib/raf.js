/**
 * Wrap in an anonymous function to alias timer utilities.
 */
(function (setTimeout, clearTimeout, Date) {
  /**
   * Fallback animation frame implementation.
   *
   * @return {Function}
   */
  var fallback = function () {
    /**
     * Return the current timestamp integer.
     */
    var now = Date.now || function () {
      return new Date().getTime();
    };

    // Keep track of the previous "animation frame" manually.
    var prev = now();

    return function (fn) {
      var curr = now();
      var ms   = Math.max(0, 16 - (curr - prev));
      var req  = setTimeout(fn, ms);

      prev = curr;

      return req;
    };
  };

  /**
   * Expose `requestAnimationFrame`.
   *
   * @type {Function}
   */
  exports = module.exports = global.requestAnimationFrame ||
    global.webkitRequestAnimationFrame ||
    global.mozRequestAnimationFrame ||
    global.msRequestAnimationFrame ||
    global.oRequestAnimationFrame ||
    fallback();

  /**
   * Cancel the animation frame.
   *
   * @type {Function}
   */
  var cancel = global.cancelAnimationFrame ||
    global.webkitCancelAnimationFrame ||
    global.mozCancelAnimationFrame ||
    global.msCancelAnimationFrame ||
    global.oCancelAnimationFrame ||
    clearTimeout;

  /**
   * Cancel an animation frame.
   *
   * @param {Number} id
   */
  exports.cancel = function (id) {
    cancel(id);
  };
})(setTimeout, clearTimeout, Date);
