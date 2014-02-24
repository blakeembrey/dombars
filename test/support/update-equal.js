/* global DOMBars */

var equal = require('./equal');

/**
 * Check whether the equal instances are up to date after updates.
 *
 * @return {Function}
 */
module.exports = function (template, context, options) {
  var subscriptions = [];

  /**
   * Custom get function to handle updates.
   *
   * @param  {Object} obj
   * @param  {String} prop
   * @return {*}
   */
  var get = function (obj, prop) {
    if (obj === context && 'update' in get) {
      return get.update[prop];
    }

    return obj[prop];
  };

  /**
   * Custom subscriber to just update everything.
   *
   * @param {Object}   obj
   * @param {String}   prop
   * @param {Function} fn
   */
  var subscribe = function (obj, prop, fn) {
    subscriptions.push(fn);
  };

  // Extend the passed in options with custom subscription data.
  DOMBars.Utils.extend(options || (options = {}), {
    get:       get,
    subscribe: subscribe
  });

  /**
   * Check the values match expectations.
   *
   * @type {Function}
   */
  var check = equal.call(this, template, context, options);

  /**
   * Trigger an asynchonous DOM update with a new object.
   *
   * @param {String}   match
   * @param {Object}   update
   * @param {Function} done
   */
  var update = function (match, update, done) {
    get.update = update;

    // Iterate over every subscription and update.
    for (var i = 0; i < subscriptions.length; i++) {
      subscriptions[i]();
    }

    // Hook into the animation frame update loop.
    return DOMBars.VM.exec(function () {
      try {
        check(match);
      } catch (e) {
        return done(e);
      }

      return done();
    });
  };

  /**
   * Returns a function for the regular synchonous check. It also returns the
   * async test function.
   *
   * @return {Function}
   */
  return function () {
    check.apply(this, arguments);

    return update;
  };
};
