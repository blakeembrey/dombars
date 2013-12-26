var currentTime = window.Date.now || (function () {
  var Constuctor = window.Date;

  return function () {
    return new Constuctor().getTime();
  };
})();


var setTimer    = window.setTimeout;
var clearTimer  = window.clearTimeout;

/**
 * Fallback animation frame implementation.
 *
 * @return {Function}
 */
var fallback = function () {
  var prev = currentTime();

  return function (fn) {
    var curr = currentTime();
    var ms   = Math.max(0, 16 - (curr - prev));
    var req  = setTimer(fn, ms);

    prev = curr;

    return req;
  };
};

/**
 * Expose `requestAnimationFrame`.
 *
 * @type {Function}
 */
exports = module.exports = window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.msRequestAnimationFrame ||
  window.oRequestAnimationFrame ||
  fallback();

/**
 * Cancel the animation frame.
 *
 * @type {Function}
 */
var cancel = window.cancelAnimationFrame ||
  window.webkitCancelAnimationFrame ||
  window.mozCancelAnimationFrame ||
  window.msCancelAnimationFrame ||
  window.oCancelAnimationFrame ||
  clearTimer;

/**
 * Cancel an animation frame.
 *
 * @param {Number} id
 */
exports.cancel = function (id) {
  cancel.call(window, id);
};
