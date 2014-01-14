/* global DOMBars */

var equal = require('./equal');

/**
 * Check whether the equal instances are up to date after updates.
 *
 * @return {Function}
 */
module.exports = function (template, context) {
  var subscribe     = DOMBars.subscribe;
  var subscriptions = [];

  // Just update every subscription.
  DOMBars.subscribe = function (obj, prop, fn) {
    subscriptions.push(fn);
  };

  var check = equal.apply(this, arguments);

  // Reset the subscribe function back to its original functionality.
  DOMBars.subscribe = subscribe;

  /**
   * Trigger an asynchonous DOM update with a new object.
   *
   * @param {String}   match
   * @param {Object}   update
   * @param {Function} done
   */
  var update = function (match, update, done) {
    var get = DOMBars.get;

    // Get the property from the update over the old object.
    DOMBars.get = function (obj, prop) {
      if (obj === context) {
        return update[prop];
      }

      return obj[prop];
    };

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
      } finally {
        DOMBars.get = get;
      }

      return done();
    });
  };

  /**
   * Returns a function for the regular synchonous check. It in turn return the
   * async test function.
   *
   * @return {Function}
   */
  return function () {
    check.apply(this, arguments);

    return update;
  };
};
