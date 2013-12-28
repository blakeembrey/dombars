!function(e){"object"==typeof exports?module.exports=e():"function"==typeof define&&define.amd?define(e):"undefined"!=typeof window?window.DOMBars=e():"undefined"!=typeof global?global.DOMBars=e():"undefined"!=typeof self&&(self.DOMBars=e())}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var hbsBase               = require('handlebars/dist/cjs/handlebars/base');
var Utils                 = require('./utils');
var HandlebarsEnvironment = hbsBase.HandlebarsEnvironment;

/**
 * Extend Handlebars base object with custom functionality.
 *
 * @type {Object}
 */
var base = module.exports = Utils.create(hbsBase);

/**
 * Wrap old-style Handlebars helpers with the updated object syntax return.
 *
 * @param  {Function} helper
 * @return {Function}
 */
var wrapOldHelper = function (helper) {
  return function () {
    var result = helper.apply(this, arguments);

    // Need a special handler for the `with` helper which won't always execute.
    return result == null ? result : result.value;
  };
};

/**
 * Register DOMBars helpers on the passed in DOMBars instance.
 *
 * @param {Object} instance
 */
var registerDefaultHelpers = function (instance) {
  /**
   * The handlebars `each` helper is incompatibable with DOMBars, since it
   * assumes string concatination (as opposed to document fragments).
   *
   * @param  {Object} context
   * @param  {Object} options
   * @return {Node}
   */
  instance.registerHelper('each', function (context, options) {
    var fn       = options.fn;
    var inverse  = options.inverse;
    var fragment = document.createDocumentFragment();
    var i        = 0;
    var data;

    if (typeof context === 'function') {
      context = context.call(this);
    }

    if (options.data) {
      data = Utils.create(options.data);
    }

    if (typeof context === 'object') {
      var len = context.length;

      if (len === +len) {
        for (; i < len; i++) {
          data.index = i;
          data.first = (i === 0);
          data.last  = (i === len - 1);

          fragment.appendChild(fn(context[i], { data: data }).value);
        }
      } else {
        for (var key in context) {
          if (Object.prototype.hasOwnProperty.call(context, key)) {
            i += 1;

            data.key   = key;
            data.index = i;
            data.first = (i === 0);

            fragment.appendChild(fn(context[key], { data: data }).value);
          }
        }
      }
    }

    if (i === 0) {
      return inverse(this).value;
    }

    return fragment;
  });

  // Register updated Handlebars helpers.
  instance.registerHelper({
    'if':                 wrapOldHelper(instance.helpers.if),
    'with':               wrapOldHelper(instance.helpers.with),
    'blockHelperMissing': wrapOldHelper(instance.helpers.blockHelperMissing)
  });
};

/**
 * Create a custom DOMBars environment to match HandlebarsEnvironment.
 */
var DOMBarsEnvironment = base.DOMBarsEnvironment = function () {
  HandlebarsEnvironment.apply(this, arguments);
  registerDefaultHelpers(this);
};

/**
 * Extend the HandlebarsEnvironment prototype.
 *
 * @type {Object}
 */
var envPrototype = DOMBarsEnvironment.prototype = Utils.create(
  HandlebarsEnvironment.prototype
);

/**
 * Alias some useful functionality that is expected to be exposed on the root
 * object.
 */
envPrototype.createFrame       = hbsBase.createFrame;
envPrototype.REVISION_CHANGES  = hbsBase.REVISION_CHANGES;
envPrototype.COMPILER_REVISION = hbsBase.COMPILER_REVISION;

/**
 * The basic getter function. Override this with something else based on your
 * project. For example, Backbone.js models.
 *
 * @param  {Object} object
 * @param  {String} property
 * @return {*}
 */
envPrototype.get = function (object, property) {
  return object[property];
};

/**
 * Noop functions for subscribe and unsubscribe. Override with custom
 * functionality.
 */
envPrototype.subscribe = envPrototype.unsubscribe = function () {};

},{"./utils":8,"handlebars/dist/cjs/handlebars/base":9}],2:[function(require,module,exports){
var Utils = require('./utils');

/**
 * Events object mixin. Created to keep the runtime size down since including
 * the node event emitter is a huge dependency.
 *
 * @type {Object}
 */
var Events = module.exports = {};

/**
 * Listen to any events triggered.
 *
 * @param  {String}   name
 * @param  {Function} fn
 * @param  {Object}   context
 * @return {Events}
 */
Events.on = function (name, fn, context) {
  this._events || (this._events = {});
  var events = this._events[name] || (this._events[name] = []);
  events.push({ fn: fn, context: context });
};

/**
 * Listen to any events triggered once.
 *
 * @param  {String}   name
 * @param  {Function} fn
 * @param  {Object}   context
 * @return {Events}
 */
Events.once = function (name, fn, context) {
  var that = this;

  // Using the `on` functionality we can create a `once` function.
  this.on(name, function self () {
    that.off(name, self);
    fn.apply(this, arguments);
  }, context);
};

/**
 * Remove an event listener.
 *
 * @param  {String}   name
 * @param  {Function} fn
 * @param  {Object}   context
 * @return {Events}
 */
Events.off = function (name, fn, context) {
  // Delete all event listeners when no arguments are passed in.
  if (arguments.length === 0) {
    return delete this._events;
  }

  // Delete an entire event namespace when only the name is passed in.
  if (arguments.length === 1) {
    return delete this._events[name];
  }

  // If the namespace does not exist, return early.
  if (!this._events || !this._events[name]) {
    return;
  }

  // Iterate over the event namespace and delete listeners where the function
  // identities and optional context matches.
  var events = this._events[name];
  for (var i = 0; i < events.length; i++) {
    if (events[i].fn === fn) {
      if (arguments.length === 2 || events[i].context === context) {
        events.splice(i, 1);
        i--;
      }
    }
  }

  // Remove empty namespaces.
  if (!events.length) {
    delete this._events[name];
  }
};

/**
 * Emit an event.
 *
 * @param  {String} name
 * @param  {*}      ...
 * @return {Events}
 */
Events.emit = Utils.variadic(function (name, args) {
  if (!this._events || !this._events[name]) { return; }

  // Create a replicated array of the event namespace so unsubscribing within
  // calls (E.g. `off`) doesn't break the iteration.
  var events = this._events[name].slice();

  for (var i = 0; i < events.length; i++) {
    events[i].fn.apply(events[i].context, args);
  }
});

},{"./utils":8}],3:[function(require,module,exports){
module.exports = require('handlebars/dist/cjs/handlebars/exception').default;

},{"handlebars/dist/cjs/handlebars/exception":10}],4:[function(require,module,exports){
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

},{}],5:[function(require,module,exports){
var hbsVM     = require('handlebars/dist/cjs/handlebars/runtime');
var Utils     = require('./utils');
var isBrowser = typeof window !== 'undefined';
var raf       = isBrowser && require('./raf');

/**
 * Iterate over an array of functions and execute each of them.
 *
 * @param {Array} array
 */
var iteration = function (array) {
  for (var i = 0; i < array.length; i++) {
    array[i]();
  }
};

/**
 * Extend the Handlebars runtime environment with DOM specific helpers.
 *
 * @type {Object}
 */
var VM = module.exports = Utils.create(hbsVM);

/**
 * Bind a function to the animation frame.
 *
 * @param  {Function} fn
 * @return {Number}
 */
VM.exec = function (fn) {
  return isBrowser ? raf(fn) : setImmediate(fn);
};

/**
 * Cancel an execution.
 *
 * @param {Number} id
 */
VM.exec.cancel = function (id) {
  return isBrowser ? raf.cancel(id) : clearImmediate(id);
};

/**
 * Generate an executable template from a template spec.
 *
 * @param  {Object}   templateSpec
 * @return {Function}
 */
VM.template = function (templateSpec, env) {
  /**
   * Accepts a function that has subscriptions called inside and returns a new
   * function that will listen to all subscriptions and can update with any
   * changes.
   *
   * @param  {Function} fn
   * @return {Function}
   */
  var subscribe = function (fn) {
    var triggered    = false;
    var unsubscribed = false;
    var execId;
    var updater;
    var prevSubscriptions;

    /**
     * Iterate over a subscriptions object and unsubscribe everything.
     *
     * @param {Array} subscriptions
     */
    var eachSubscription = function (subscriptions, fn) {
      for (var property in subscriptions) {
        for (var key in subscriptions[property]) {
          var subscription = subscriptions[property][key];
          fn(subscription, property, subscriber.update);
        }
      }
    };

    /**
     * Run this function before we run an update function. It moves current
     * subscriptions so that we can diff the subscriptions after we update
     * the DOM.
     */
    var beforeUpdate = function () {
      iteration(subscriber.unsubscriptions);
      prevSubscriptions = subscriber.subscriptions;
    };

    /**
     * Run this function after an update. It will check for difference in the
     * before and after updates.
     */
    var afterUpdate = function () {
      var subscriptions = subscriber.subscriptions;

      // Diff the new subscriptions against the previous subscriptions object
      // to add/remove listeners as needed. This is more memory efficient than
      // blindly adding and removing every listener each execution.
      for (var property in subscriptions) {
        for (var key in subscriptions[property]) {
          if (!prevSubscriptions[property][key]) {
            var subscription = subscriptions[property][key];
            env.subscribe(subscription, property, subscriber.update);
          } else {
            delete prevSubscriptions[property][key];
          }
        }
      }

      // Loop over previous subscriptions that no longer exist and unsubscribe.
      eachSubscription(prevSubscriptions, env.unsubscribe);

      // Remove any lingering references to previous subscription objects.
      prevSubscriptions = null;
    };

    /**
     * Unsubscribe every child of the current subscription.
     */
    var unsubscribeChildren = function () {
      for (var child in subscriber.children) {
        subscriber.children[child].remove();
      }
    };

    /**
     * Execute the function and return the result.
     *
     * @return {*}
     */
    var execute = function () {
      // If we have a parent subscriber, link the subscribers together.
      if (container.subscriber) {
        subscriber.parent = container.subscriber;
        subscriber.parent.children[subscriber.cid] = subscriber;
      }

      // Reset subscriptions before execution.
      subscriber.subscriptions   = {};
      subscriber.unsubscriptions = [];

      // Alias subscriber functionality to the VM object.
      container.subscriber = subscriber;

      var value = fn.apply(this, arguments);

      // Reset the VM functionality to what it was beforehand.
      container.subscriber = subscriber.parent;

      // Return an object with a value property and unsubscribe functionality.
      return value;
    };

    /**
     * The returned subscription function takes care of aliasing the
     * subscriptions array correctly, subscribing for updates and triggering
     * updates when any of the subscriptions change.
     *
     * @param  {Function} fn
     * @return {*}
     */
    var subscriber = function (fn) {
      var result = execute.apply(this, arguments);

      updater = fn;
      eachSubscription(subscriber.subscriptions, env.subscribe);

      return result;
    };

    // Keep an array of current subscriptions and an object with references
    // to child subscription functions.
    subscriber.cid      = 'subscriber' + Utils.uniqueId();
    subscriber.children = {};

    /**
     * Trigger this function with every change with the listeners.
     */
    subscriber.update = function () {
      // If the triggered flag has been set, don't cause another update.
      if (triggered || unsubscribed) { return; }

      // Set a triggered flag to avoid multiple triggers. Also unsubscribe any
      // children immediately to stop update clashes.
      triggered = true;
      unsubscribeChildren();

      execId = VM.exec(function () {
        triggered = false;

        beforeUpdate();
        updater(execute());
        afterUpdate();
      });
    };

    /**
     * Push unsubscription functions into the unsubscribe array.
     */
    subscriber.unsubscribe = function (fn) {
      Utils.isFunction(fn) && subscriber.unsubscriptions.push(fn);
    };

    /**
     * Remove the current subscriber from all listeners. We also need to cancel
     * any current execution event and remove a reference from the parent
     * subscription.
     */
    subscriber.remove = function () {
      iteration(subscriber.unsubscriptions);
      eachSubscription(subscriber.subscriptions, env.unsubscribe);

      // Remove the current subscription from its parent.
      if (subscriber.parent) {
        delete subscriber.parent.children[subscriber.cid];
        delete subscriber.parent;
      }

      // Remove other refernences.
      updater = null;

      // Track whether we have been unsubscribed. This is required since the
      // listener could still be triggered at any time even though we expect
      // the external references to be dropped. This could also indicate a
      // potential memory leak with the listener unsusbcription code.
      unsubscribed = true;
      unsubscribeChildren();
      VM.exec.cancel(execId);
    };

    return subscriber;
  };

  /**
   * Wrap a function in a subscriber *every* time that function is called.
   *
   * @param  {Function} fn
   * @return {Object}
   */
  var wrapSubscriber = function (fn) {
    return function () {
      var subscriber = subscribe(fn);
      var value      = subscriber.apply(this, arguments);

      // Return an object wrapped in useful functionality.
      return {
        value:       value,
        unsubscribe: subscriber.remove
      };
    };
  };

  /**
   * The container object holds all the functions used by the template spec.
   *
   * @type {Object}
   */
  var container = {
    invokePartial:    VM.invokePartial,
    programs:         [],
    noop:             VM.noop,
    partial:          Utils.partial,
    escapeExpression: Utils.escapeExpression,
    programWithDepth: VM.programWithDepth
  };

  /**
   * Render and subscribe a single DOM node using a custom creation function.
   *
   * @param  {Function} fn
   * @param  {Function} create
   * @return {Node}
   */
  var subscribeNode = function (fn, create) {
    var subscription = subscribe(fn);

    var trackNode = Utils.trackNode(create(subscription(function (value) {
      trackNode.replace(create(value));
    })));

    return trackNode.fragment;
  };

  /**
   * Remove an attribute from an element.
   *
   * @param {Node}   element
   * @param {String} name
   */
  var removeAttribute = function (element, name) {
    if (element.hasAttribute(name)) {
      env.emit('removeAttribute', element, name);
      element.removeAttribute(name);
    }
  };

  /**
   * Set an attribute value on an element.
   *
   * @param {Node}   element
   * @param {String} name
   * @param {*}      value
   */
  var setAttribute = function (element, name, value) {
    if (value === false) {
      return removeAttribute(element, name);
    }

    env.emit('setAttribute', element, name, value);
    element.setAttribute(name, value);
  };

  /**
   * Create an element from a tag name.
   *
   * @param  {String} tagName
   * @return {Node}
   */
  var createElement = function (tagName) {
    var node = document.createElement(tagName);
    env.emit('createElement', node);
    return node;
  };

  /**
   * Create a comment node based on text contents.
   *
   * @param  {String} contents
   * @return {Node}
   */
  var createComment = function (tagName) {
    var node = document.createComment(tagName);
    env.emit('createComment', node);
    return node;
  };

  /**
   * Copy all significant data from one element node to another.
   *
   * @param  {Node} newNode
   * @param  {Node} oldNode
   * @return {Node}
   */
  var copyNode = function (newNode, oldNode) {
    // Move all child elements to the new node.
    while (oldNode.firstChild) {
      newNode.appendChild(oldNode.firstChild);
    }

    // Copy all the attributes to the new node.
    for (var i = 0; i < oldNode.attributes.length; i++) {
      var attribute = oldNode.attributes[i];
      setAttribute(newNode, attribute.name, attribute.value);
    }

    return newNode;
  };

  /**
   * Copy all the data from one element to another and replace in place.
   *
   * @param  {Node} newNode
   * @param  {Node} oldNode
   * @return {Node}
   */
  var copyAndReplaceNode = function (newNode, oldNode) {
    oldNode.parentNode.replaceChild(copyNode(newNode, oldNode), oldNode);
    return newNode;
  };

  /**
   * Create an element and subscribe to any changes. This method requires a
   * callback function for any element changes since you can't change a tag
   * name in place.
   *
   * @param  {Function} fn
   * @param  {Function} cb
   * @return {Element}
   */
  container.createElement = function (fn, cb) {
    var subscription = subscribe(fn);

    var el = createElement(subscription(function (value) {
      cb(el = copyAndReplaceNode(createElement(value), el));
    }));

    return el;
  };

  /**
   * Append an element to the end of another element.
   *
   * @param {Node} parent
   * @param {Node} child
   */
  container.appendChild = function (parent, child) {
    if (!child) { return; }

    parent.appendChild(child);
    env.emit('appendChild', parent, child);
  };

  /**
   * Set an elements attribute. We accept the current element a function
   * because when a tag name changes we will lose reference to the actively
   * rendered element.
   *
   * @param {Function} elementFn
   * @param {Function} nameFn
   * @param {Function} valueFn
   */
  container.setAttribute = function (elementFn, nameFn, valueFn) {
    var nameSubscription  = subscribe(nameFn);
    var valueSubscription = subscribe(valueFn);

    // Keep track of the current name and value without having to re-run the
    // function every time something changes.
    var attrName = nameSubscription(function (value) {
      removeAttribute(elementFn(), attrName);
      setAttribute(elementFn(), attrName = value, attrValue);
    });

    var attrValue = valueSubscription(function (value) {
      setAttribute(elementFn(), attrName, attrValue = value);
    });

    return setAttribute(elementFn(), attrName, attrValue);
  };

  /**
   * Create a DOM element and subscribe to any changes.
   *
   * @param  {Function} fn
   * @return {Node}
   */
  container.createDOM = function (fn) {
    return subscribeNode(fn, Utils.domifyExpression);
  };

  /**
   * Create a text node and subscribe to any changes.
   *
   * @param  {Function} fn
   * @return {Text}
   */
  container.createText = function (fn) {
    return subscribeNode(fn, Utils.textifyExpression);
  };

  /**
   * Create a comment node and subscribe to any changes.
   *
   * @param  {Function} fn
   * @return {Comment}
   */
  container.createComment = function (fn) {
    var subscription = subscribe(fn);
    var node         = createComment(subscription(function (value) {
      node.textContent = value;
    }));

    return node;
  };

  /**
   * Create and return a program singleton based on index.
   *
   * @param  {Number}   i
   * @param  {Function} fn
   * @param  {Object}   data
   * @return {Function}
   */
  container.program = function (i, fn, data) {
    var programWrapper = container.programs[i];

    if (data) {
      return VM.program(i, fn, data);
    }

    if (!programWrapper) {
      return container.programs[i] = VM.program(i, fn);
    }

    return programWrapper;
  };

  /**
   * Wrap program functions with subscriber functionality.
   *
   * @param  {Function} program
   * @return {Function}
   */
  container.wrapProgram = function (fn) {
    return function () {
      return wrapSubscriber(fn).apply(this, arguments);
    };
  };

  /**
   * Merge two objects into a single object.
   *
   * @param  {Object} param
   * @param  {Object} common
   * @return {Object}
   */
  container.merge = function (param, common) {
    var ret = param || common;

    if (param && common && (param !== common)) {
      ret = {};
      Utils.extend(ret, common);
      Utils.extend(ret, param);
    }

    return ret;
  };

  /**
   * Get a property from an object. Passes in the object id (depth) to make it
   * much faster to do comparisons between new and old subscriptions.
   *
   * @param  {Object} object
   * @param  {String} property
   * @param  {String} id
   * @return {*}
   */
  container.get = function (object, property, id) {
    var subscriptions = container.subscriber.subscriptions;

    (subscriptions[property] || (subscriptions[property] = {}))[id] = object;

    return env.get(object, property);
  };

  /**
   * Return the compiled JavaScript function for execution.
   *
   * @param  {Object} context
   * @param  {Object} options
   * @return {Node}
   */
  return wrapSubscriber(function (context, options) {
    options = options || {};

    var namespace = options.partial ? options : env;
    var helpers;
    var partials;

    if (!options.partial) {
      helpers  = options.helpers;
      partials = options.partials;
    }

    var result = templateSpec.call(
      container,
      namespace,
      context,
      helpers,
      partials,
      options.data
    );

    if (!options.partial) {
      env.VM.checkRevision(container.compilerInfo);
    }

    return result;
  });
};

},{"./raf":4,"./utils":8,"handlebars/dist/cjs/handlebars/runtime":11}],6:[function(require,module,exports){
module.exports = require('handlebars/dist/cjs/handlebars/safe-string').default;

},{"handlebars/dist/cjs/handlebars/safe-string":12}],7:[function(require,module,exports){
var TrackNode = module.exports = function (node) {
  this.fragment = document.createDocumentFragment();

  // Instantly append a before and after tracking node.
  this.before = this.fragment.appendChild(document.createTextNode(''));
  this.after  = this.fragment.appendChild(document.createTextNode(''));

  // Append the passed in node to the current fragment.
  node && this.appendChild(node);
};

/**
 * Append a node to the current tracking fragment.
 *
 * @param  {Node} node
 * @return {this}
 */
TrackNode.prototype.appendChild = function (node) {
  this.after.parentNode.insertBefore(node, this.after);

  return this;
};

/**
 * Prepend a node to the current tracking fragment.
 *
 * @param  {Node} node
 * @return {this}
 */
TrackNode.prototype.prependChild = function (node) {
  this.before.parentNode.insertBefore(node, this.before.nextSibling);

  return this;
};

/**
 * Remove all elements between the two tracking nodes.
 *
 * @param  {Node} node
 * @return {this}
 */
TrackNode.prototype.empty = function () {
  while (this.before.nextSibling !== this.after) {
    this.before.parentNode.removeChild(this.before.nextSibling);
  }

  return this;
};

/**
 * Remove the the elements from the DOM.
 *
 * @param  {Node} node
 * @return {this}
 */
TrackNode.prototype.remove = function () {
  while (this.before.nextSibling !== this.after) {
    this.fragment.appendChild(this.before.nextSibling);
  }

  // Pull the two reference nodes out of the DOM and into the fragment.
  this.fragment.appendChild(this.after);
  this.fragment.insertBefore(this.before, this.fragment.firstChild);

  return this;
};

/**
 * Replace the contents of the tracking node with new contents.
 *
 * @param  {Node} node
 * @return {this}
 */
TrackNode.prototype.replace = function (node) {
  return this.empty().appendChild(node);
};

},{}],8:[function(require,module,exports){
var hbsUtils   = require('handlebars/dist/cjs/handlebars/utils');
var uniqueId   = 0;
var TrackNode  = require('./track-node');
var SafeString = require('./safe-string');
var __slice    = Array.prototype.slice;

/**
 * Simple way to subclass an object, with support for older browsers.
 *
 * @return {Object}
 */
var create = Object.create || (function () {
  var F = function () {};

  return function (o) {
    F.prototype = o;
    var obj = new F();
    F.prototype = null;
    return obj;
  };
})();

/**
 * Extend Handlebars utilities with DOM functionality.
 *
 * @type {Object}
 */
var Utils = module.exports = create(hbsUtils);

/**
 * Return a unique id.
 *
 * @return {Number}
 */
Utils.uniqueId = function () {
  return uniqueId++;
};

/**
 * Create a function that accepts an unlimited number of arguments as the last
 * argument.
 *
 * @param  {Function} fn
 * @return {Function}
 */
Utils.variadic = function (fn) {
  var count = Math.max(fn.length - 1, 0);

  return function () {
    var args = __slice.call(arguments, 0, count);

    // Enforce the array length, in case we didn't have enough arguments.
    args.length = count;
    args.push(__slice.call(arguments, count));

    return fn.apply(this, args);
  };
};

/**
 * Simple partial application function.
 *
 * @param  {Function} fn
 * @return {Function}
 */
Utils.partial = Utils.variadic(function (fn, args) {
  return Utils.variadic(function (called) {
    return fn.apply(this, args.concat(called));
  });
});

/**
 * Expose the create function.
 *
 * @type {Function}
 */
Utils.create = create;

/**
 * Check whether an object is actually a DOM node.
 *
 * @param  {*}       element
 * @return {Boolean}
 */
Utils.isNode = function (element) {
  return element instanceof Node;
};

/**
 * Track a node instance anywhere it goes in the DOM.
 *
 * @param  {Node}      node
 * @return {TrackNode}
 */
Utils.trackNode = function (node) {
  return new TrackNode(node);
};

/**
 * Transform a string into arbitrary DOM nodes.
 *
 * @param  {String} string
 * @return {Node}
 */
Utils.domifyExpression = function (string) {
  // If we passed in a safe string, get the actual value.
  if (string instanceof SafeString) {
    string = string.string;
  }

  // No need to coerce a node.
  if (Utils.isNode(string)) {
    return string;
  }

  var div = document.createElement('div');
  div.innerHTML = string;

  if (div.childNodes.length === 1) {
    return div.removeChild(div.childNodes[0]);
  }

  var fragment = document.createDocumentFragment();

  while (div.firstChild) {
    fragment.appendChild(div.firstChild);
  }

  return fragment;
};

/**
 * Transform a string into a DOM text node for appending to the template.
 *
 * @param  {String} string
 * @return {Text}
 */
Utils.textifyExpression = function (string) {
  if (string instanceof SafeString) {
    return Utils.domifyExpression(string.string);
  }

  // Catch when the string is actually a DOM node and turn it into a string.
  if (Utils.isNode(string)) {
    // Already a text node, just return it immediately.
    if (string.nodeType === 3) {
      return string;
    }

    if (typeof string.outerHTML === 'string') {
      return document.createTextNode(string.outerHTML);
    }

    var div = document.createElement('div');
    div.appendChild(string.cloneNode(true));
    return document.createTextNode(div.innerHTML);
  }

  return document.createTextNode(string == null ? '' : string);
};

},{"./safe-string":6,"./track-node":7,"handlebars/dist/cjs/handlebars/utils":13}],9:[function(require,module,exports){
"use strict";
var Utils = require("./utils");
var Exception = require("./exception")["default"];

var VERSION = "1.2.0";
exports.VERSION = VERSION;var COMPILER_REVISION = 4;
exports.COMPILER_REVISION = COMPILER_REVISION;
var REVISION_CHANGES = {
  1: '<= 1.0.rc.2', // 1.0.rc.2 is actually rev2 but doesn't report it
  2: '== 1.0.0-rc.3',
  3: '== 1.0.0-rc.4',
  4: '>= 1.0.0'
};
exports.REVISION_CHANGES = REVISION_CHANGES;
var isArray = Utils.isArray,
    isFunction = Utils.isFunction,
    toString = Utils.toString,
    objectType = '[object Object]';

function HandlebarsEnvironment(helpers, partials) {
  this.helpers = helpers || {};
  this.partials = partials || {};

  registerDefaultHelpers(this);
}

exports.HandlebarsEnvironment = HandlebarsEnvironment;HandlebarsEnvironment.prototype = {
  constructor: HandlebarsEnvironment,

  logger: logger,
  log: log,

  registerHelper: function(name, fn, inverse) {
    if (toString.call(name) === objectType) {
      if (inverse || fn) { throw new Exception('Arg not supported with multiple helpers'); }
      Utils.extend(this.helpers, name);
    } else {
      if (inverse) { fn.not = inverse; }
      this.helpers[name] = fn;
    }
  },

  registerPartial: function(name, str) {
    if (toString.call(name) === objectType) {
      Utils.extend(this.partials,  name);
    } else {
      this.partials[name] = str;
    }
  }
};

function registerDefaultHelpers(instance) {
  instance.registerHelper('helperMissing', function(arg) {
    if(arguments.length === 2) {
      return undefined;
    } else {
      throw new Error("Missing helper: '" + arg + "'");
    }
  });

  instance.registerHelper('blockHelperMissing', function(context, options) {
    var inverse = options.inverse || function() {}, fn = options.fn;

    if (isFunction(context)) { context = context.call(this); }

    if(context === true) {
      return fn(this);
    } else if(context === false || context == null) {
      return inverse(this);
    } else if (isArray(context)) {
      if(context.length > 0) {
        return instance.helpers.each(context, options);
      } else {
        return inverse(this);
      }
    } else {
      return fn(context);
    }
  });

  instance.registerHelper('each', function(context, options) {
    var fn = options.fn, inverse = options.inverse;
    var i = 0, ret = "", data;

    if (isFunction(context)) { context = context.call(this); }

    if (options.data) {
      data = createFrame(options.data);
    }

    if(context && typeof context === 'object') {
      if (isArray(context)) {
        for(var j = context.length; i<j; i++) {
          if (data) {
            data.index = i;
            data.first = (i === 0);
            data.last  = (i === (context.length-1));
          }
          ret = ret + fn(context[i], { data: data });
        }
      } else {
        for(var key in context) {
          if(context.hasOwnProperty(key)) {
            if(data) { 
              data.key = key; 
              data.index = i;
              data.first = (i === 0);
            }
            ret = ret + fn(context[key], {data: data});
            i++;
          }
        }
      }
    }

    if(i === 0){
      ret = inverse(this);
    }

    return ret;
  });

  instance.registerHelper('if', function(conditional, options) {
    if (isFunction(conditional)) { conditional = conditional.call(this); }

    // Default behavior is to render the positive path if the value is truthy and not empty.
    // The `includeZero` option may be set to treat the condtional as purely not empty based on the
    // behavior of isEmpty. Effectively this determines if 0 is handled by the positive path or negative.
    if ((!options.hash.includeZero && !conditional) || Utils.isEmpty(conditional)) {
      return options.inverse(this);
    } else {
      return options.fn(this);
    }
  });

  instance.registerHelper('unless', function(conditional, options) {
    return instance.helpers['if'].call(this, conditional, {fn: options.inverse, inverse: options.fn, hash: options.hash});
  });

  instance.registerHelper('with', function(context, options) {
    if (isFunction(context)) { context = context.call(this); }

    if (!Utils.isEmpty(context)) return options.fn(context);
  });

  instance.registerHelper('log', function(context, options) {
    var level = options.data && options.data.level != null ? parseInt(options.data.level, 10) : 1;
    instance.log(level, context);
  });
}

var logger = {
  methodMap: { 0: 'debug', 1: 'info', 2: 'warn', 3: 'error' },

  // State enum
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  level: 3,

  // can be overridden in the host environment
  log: function(level, obj) {
    if (logger.level <= level) {
      var method = logger.methodMap[level];
      if (typeof console !== 'undefined' && console[method]) {
        console[method].call(console, obj);
      }
    }
  }
};
exports.logger = logger;
function log(level, obj) { logger.log(level, obj); }

exports.log = log;var createFrame = function(object) {
  var obj = {};
  Utils.extend(obj, object);
  return obj;
};
exports.createFrame = createFrame;
},{"./exception":10,"./utils":13}],10:[function(require,module,exports){
"use strict";

var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

function Exception(/* message */) {
  var tmp = Error.prototype.constructor.apply(this, arguments);

  // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
  for (var idx = 0; idx < errorProps.length; idx++) {
    this[errorProps[idx]] = tmp[errorProps[idx]];
  }
}

Exception.prototype = new Error();

exports["default"] = Exception;
},{}],11:[function(require,module,exports){
"use strict";
var Utils = require("./utils");
var Exception = require("./exception")["default"];
var COMPILER_REVISION = require("./base").COMPILER_REVISION;
var REVISION_CHANGES = require("./base").REVISION_CHANGES;

function checkRevision(compilerInfo) {
  var compilerRevision = compilerInfo && compilerInfo[0] || 1,
      currentRevision = COMPILER_REVISION;

  if (compilerRevision !== currentRevision) {
    if (compilerRevision < currentRevision) {
      var runtimeVersions = REVISION_CHANGES[currentRevision],
          compilerVersions = REVISION_CHANGES[compilerRevision];
      throw new Error("Template was precompiled with an older version of Handlebars than the current runtime. "+
            "Please update your precompiler to a newer version ("+runtimeVersions+") or downgrade your runtime to an older version ("+compilerVersions+").");
    } else {
      // Use the embedded version info since the runtime doesn't know about this revision yet
      throw new Error("Template was precompiled with a newer version of Handlebars than the current runtime. "+
            "Please update your runtime to a newer version ("+compilerInfo[1]+").");
    }
  }
}

exports.checkRevision = checkRevision;// TODO: Remove this line and break up compilePartial

function template(templateSpec, env) {
  if (!env) {
    throw new Error("No environment passed to template");
  }

  // Note: Using env.VM references rather than local var references throughout this section to allow
  // for external users to override these as psuedo-supported APIs.
  var invokePartialWrapper = function(partial, name, context, helpers, partials, data) {
    var result = env.VM.invokePartial.apply(this, arguments);
    if (result != null) { return result; }

    if (env.compile) {
      var options = { helpers: helpers, partials: partials, data: data };
      partials[name] = env.compile(partial, { data: data !== undefined }, env);
      return partials[name](context, options);
    } else {
      throw new Exception("The partial " + name + " could not be compiled when running in runtime-only mode");
    }
  };

  // Just add water
  var container = {
    escapeExpression: Utils.escapeExpression,
    invokePartial: invokePartialWrapper,
    programs: [],
    program: function(i, fn, data) {
      var programWrapper = this.programs[i];
      if(data) {
        programWrapper = program(i, fn, data);
      } else if (!programWrapper) {
        programWrapper = this.programs[i] = program(i, fn);
      }
      return programWrapper;
    },
    merge: function(param, common) {
      var ret = param || common;

      if (param && common && (param !== common)) {
        ret = {};
        Utils.extend(ret, common);
        Utils.extend(ret, param);
      }
      return ret;
    },
    programWithDepth: env.VM.programWithDepth,
    noop: env.VM.noop,
    compilerInfo: null
  };

  return function(context, options) {
    options = options || {};
    var namespace = options.partial ? options : env,
        helpers,
        partials;

    if (!options.partial) {
      helpers = options.helpers;
      partials = options.partials;
    }
    var result = templateSpec.call(
          container,
          namespace, context,
          helpers,
          partials,
          options.data);

    if (!options.partial) {
      env.VM.checkRevision(container.compilerInfo);
    }

    return result;
  };
}

exports.template = template;function programWithDepth(i, fn, data /*, $depth */) {
  var args = Array.prototype.slice.call(arguments, 3);

  var prog = function(context, options) {
    options = options || {};

    return fn.apply(this, [context, options.data || data].concat(args));
  };
  prog.program = i;
  prog.depth = args.length;
  return prog;
}

exports.programWithDepth = programWithDepth;function program(i, fn, data) {
  var prog = function(context, options) {
    options = options || {};

    return fn(context, options.data || data);
  };
  prog.program = i;
  prog.depth = 0;
  return prog;
}

exports.program = program;function invokePartial(partial, name, context, helpers, partials, data) {
  var options = { partial: true, helpers: helpers, partials: partials, data: data };

  if(partial === undefined) {
    throw new Exception("The partial " + name + " could not be found");
  } else if(partial instanceof Function) {
    return partial(context, options);
  }
}

exports.invokePartial = invokePartial;function noop() { return ""; }

exports.noop = noop;
},{"./base":9,"./exception":10,"./utils":13}],12:[function(require,module,exports){
"use strict";
// Build out our basic SafeString type
function SafeString(string) {
  this.string = string;
}

SafeString.prototype.toString = function() {
  return "" + this.string;
};

exports["default"] = SafeString;
},{}],13:[function(require,module,exports){
"use strict";
/*jshint -W004 */
var SafeString = require("./safe-string")["default"];

var escape = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "`": "&#x60;"
};

var badChars = /[&<>"'`]/g;
var possible = /[&<>"'`]/;

function escapeChar(chr) {
  return escape[chr] || "&amp;";
}

function extend(obj, value) {
  for(var key in value) {
    if(Object.prototype.hasOwnProperty.call(value, key)) {
      obj[key] = value[key];
    }
  }
}

exports.extend = extend;var toString = Object.prototype.toString;
exports.toString = toString;
// Sourced from lodash
// https://github.com/bestiejs/lodash/blob/master/LICENSE.txt
var isFunction = function(value) {
  return typeof value === 'function';
};
// fallback for older versions of Chrome and Safari
if (isFunction(/x/)) {
  isFunction = function(value) {
    return typeof value === 'function' && toString.call(value) === '[object Function]';
  };
}
var isFunction;
exports.isFunction = isFunction;
var isArray = Array.isArray || function(value) {
  return (value && typeof value === 'object') ? toString.call(value) === '[object Array]' : false;
};
exports.isArray = isArray;

function escapeExpression(string) {
  // don't escape SafeStrings, since they're already safe
  if (string instanceof SafeString) {
    return string.toString();
  } else if (!string && string !== 0) {
    return "";
  }

  // Force a string conversion as this will be done by the append regardless and
  // the regex test will do this transparently behind the scenes, causing issues if
  // an object's to string has escaped characters in it.
  string = "" + string;

  if(!possible.test(string)) { return string; }
  return string.replace(badChars, escapeChar);
}

exports.escapeExpression = escapeExpression;function isEmpty(value) {
  if (!value && value !== 0) {
    return true;
  } else if (isArray(value) && value.length === 0) {
    return true;
  } else {
    return false;
  }
}

exports.isEmpty = isEmpty;
},{"./safe-string":12}],14:[function(require,module,exports){
var base       = require('./lib/base');
var SafeString = require('./lib/safe-string');
var Exception  = require('./lib/exception');
var Utils      = require('./lib/utils');
var Events     = require('./lib/events');
var runtime    = require('./lib/runtime');

// Extend the DOMBars prototype with event emitter functionality.
Utils.extend(base.DOMBarsEnvironment.prototype, Events);

module.exports = (function create () {
  var db = new base.DOMBarsEnvironment();

  Utils.extend(db, base);
  db.VM         = runtime;
  db.Utils      = Utils;
  db.create     = create;
  db.Exception  = Exception;
  db.SafeString = SafeString;

  db.template = function (spec) {
    return runtime.template(spec, db);
  };

  return db;
})();

},{"./lib/base":1,"./lib/events":2,"./lib/exception":3,"./lib/runtime":5,"./lib/safe-string":6,"./lib/utils":8}]},{},[14])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvYmFzZS5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi9ldmVudHMuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvZXhjZXB0aW9uLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbGliL3JhZi5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi9ydW50aW1lLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbGliL3NhZmUtc3RyaW5nLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbGliL3RyYWNrLW5vZGUuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvdXRpbHMuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL2Jhc2UuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL2V4Y2VwdGlvbi5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvc2FmZS1zdHJpbmcuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3V0aWxzLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvcnVudGltZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RHQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDempCQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsidmFyIGhic0Jhc2UgICAgICAgICAgICAgICA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9iYXNlJyk7XG52YXIgVXRpbHMgICAgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIEhhbmRsZWJhcnNFbnZpcm9ubWVudCA9IGhic0Jhc2UuSGFuZGxlYmFyc0Vudmlyb25tZW50O1xuXG4vKipcbiAqIEV4dGVuZCBIYW5kbGViYXJzIGJhc2Ugb2JqZWN0IHdpdGggY3VzdG9tIGZ1bmN0aW9uYWxpdHkuXG4gKlxuICogQHR5cGUge09iamVjdH1cbiAqL1xudmFyIGJhc2UgPSBtb2R1bGUuZXhwb3J0cyA9IFV0aWxzLmNyZWF0ZShoYnNCYXNlKTtcblxuLyoqXG4gKiBXcmFwIG9sZC1zdHlsZSBIYW5kbGViYXJzIGhlbHBlcnMgd2l0aCB0aGUgdXBkYXRlZCBvYmplY3Qgc3ludGF4IHJldHVybi5cbiAqXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gaGVscGVyXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqL1xudmFyIHdyYXBPbGRIZWxwZXIgPSBmdW5jdGlvbiAoaGVscGVyKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHJlc3VsdCA9IGhlbHBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgLy8gTmVlZCBhIHNwZWNpYWwgaGFuZGxlciBmb3IgdGhlIGB3aXRoYCBoZWxwZXIgd2hpY2ggd29uJ3QgYWx3YXlzIGV4ZWN1dGUuXG4gICAgcmV0dXJuIHJlc3VsdCA9PSBudWxsID8gcmVzdWx0IDogcmVzdWx0LnZhbHVlO1xuICB9O1xufTtcblxuLyoqXG4gKiBSZWdpc3RlciBET01CYXJzIGhlbHBlcnMgb24gdGhlIHBhc3NlZCBpbiBET01CYXJzIGluc3RhbmNlLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBpbnN0YW5jZVxuICovXG52YXIgcmVnaXN0ZXJEZWZhdWx0SGVscGVycyA9IGZ1bmN0aW9uIChpbnN0YW5jZSkge1xuICAvKipcbiAgICogVGhlIGhhbmRsZWJhcnMgYGVhY2hgIGhlbHBlciBpcyBpbmNvbXBhdGliYWJsZSB3aXRoIERPTUJhcnMsIHNpbmNlIGl0XG4gICAqIGFzc3VtZXMgc3RyaW5nIGNvbmNhdGluYXRpb24gKGFzIG9wcG9zZWQgdG8gZG9jdW1lbnQgZnJhZ21lbnRzKS5cbiAgICpcbiAgICogQHBhcmFtICB7T2JqZWN0fSBjb250ZXh0XG4gICAqIEBwYXJhbSAge09iamVjdH0gb3B0aW9uc1xuICAgKiBAcmV0dXJuIHtOb2RlfVxuICAgKi9cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2VhY2gnLCBmdW5jdGlvbiAoY29udGV4dCwgb3B0aW9ucykge1xuICAgIHZhciBmbiAgICAgICA9IG9wdGlvbnMuZm47XG4gICAgdmFyIGludmVyc2UgID0gb3B0aW9ucy5pbnZlcnNlO1xuICAgIHZhciBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICB2YXIgaSAgICAgICAgPSAwO1xuICAgIHZhciBkYXRhO1xuXG4gICAgaWYgKHR5cGVvZiBjb250ZXh0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmRhdGEpIHtcbiAgICAgIGRhdGEgPSBVdGlscy5jcmVhdGUob3B0aW9ucy5kYXRhKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGNvbnRleHQgPT09ICdvYmplY3QnKSB7XG4gICAgICB2YXIgbGVuID0gY29udGV4dC5sZW5ndGg7XG5cbiAgICAgIGlmIChsZW4gPT09ICtsZW4pIHtcbiAgICAgICAgZm9yICg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgIGRhdGEuaW5kZXggPSBpO1xuICAgICAgICAgIGRhdGEuZmlyc3QgPSAoaSA9PT0gMCk7XG4gICAgICAgICAgZGF0YS5sYXN0ICA9IChpID09PSBsZW4gLSAxKTtcblxuICAgICAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKGZuKGNvbnRleHRbaV0sIHsgZGF0YTogZGF0YSB9KS52YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBjb250ZXh0KSB7XG4gICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChjb250ZXh0LCBrZXkpKSB7XG4gICAgICAgICAgICBpICs9IDE7XG5cbiAgICAgICAgICAgIGRhdGEua2V5ICAgPSBrZXk7XG4gICAgICAgICAgICBkYXRhLmluZGV4ID0gaTtcbiAgICAgICAgICAgIGRhdGEuZmlyc3QgPSAoaSA9PT0gMCk7XG5cbiAgICAgICAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKGZuKGNvbnRleHRba2V5XSwgeyBkYXRhOiBkYXRhIH0pLnZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaSA9PT0gMCkge1xuICAgICAgcmV0dXJuIGludmVyc2UodGhpcykudmFsdWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZyYWdtZW50O1xuICB9KTtcblxuICAvLyBSZWdpc3RlciB1cGRhdGVkIEhhbmRsZWJhcnMgaGVscGVycy5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoe1xuICAgICdpZic6ICAgICAgICAgICAgICAgICB3cmFwT2xkSGVscGVyKGluc3RhbmNlLmhlbHBlcnMuaWYpLFxuICAgICd3aXRoJzogICAgICAgICAgICAgICB3cmFwT2xkSGVscGVyKGluc3RhbmNlLmhlbHBlcnMud2l0aCksXG4gICAgJ2Jsb2NrSGVscGVyTWlzc2luZyc6IHdyYXBPbGRIZWxwZXIoaW5zdGFuY2UuaGVscGVycy5ibG9ja0hlbHBlck1pc3NpbmcpXG4gIH0pO1xufTtcblxuLyoqXG4gKiBDcmVhdGUgYSBjdXN0b20gRE9NQmFycyBlbnZpcm9ubWVudCB0byBtYXRjaCBIYW5kbGViYXJzRW52aXJvbm1lbnQuXG4gKi9cbnZhciBET01CYXJzRW52aXJvbm1lbnQgPSBiYXNlLkRPTUJhcnNFbnZpcm9ubWVudCA9IGZ1bmN0aW9uICgpIHtcbiAgSGFuZGxlYmFyc0Vudmlyb25tZW50LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIHJlZ2lzdGVyRGVmYXVsdEhlbHBlcnModGhpcyk7XG59O1xuXG4vKipcbiAqIEV4dGVuZCB0aGUgSGFuZGxlYmFyc0Vudmlyb25tZW50IHByb3RvdHlwZS5cbiAqXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG52YXIgZW52UHJvdG90eXBlID0gRE9NQmFyc0Vudmlyb25tZW50LnByb3RvdHlwZSA9IFV0aWxzLmNyZWF0ZShcbiAgSGFuZGxlYmFyc0Vudmlyb25tZW50LnByb3RvdHlwZVxuKTtcblxuLyoqXG4gKiBBbGlhcyBzb21lIHVzZWZ1bCBmdW5jdGlvbmFsaXR5IHRoYXQgaXMgZXhwZWN0ZWQgdG8gYmUgZXhwb3NlZCBvbiB0aGUgcm9vdFxuICogb2JqZWN0LlxuICovXG5lbnZQcm90b3R5cGUuY3JlYXRlRnJhbWUgICAgICAgPSBoYnNCYXNlLmNyZWF0ZUZyYW1lO1xuZW52UHJvdG90eXBlLlJFVklTSU9OX0NIQU5HRVMgID0gaGJzQmFzZS5SRVZJU0lPTl9DSEFOR0VTO1xuZW52UHJvdG90eXBlLkNPTVBJTEVSX1JFVklTSU9OID0gaGJzQmFzZS5DT01QSUxFUl9SRVZJU0lPTjtcblxuLyoqXG4gKiBUaGUgYmFzaWMgZ2V0dGVyIGZ1bmN0aW9uLiBPdmVycmlkZSB0aGlzIHdpdGggc29tZXRoaW5nIGVsc2UgYmFzZWQgb24geW91clxuICogcHJvamVjdC4gRm9yIGV4YW1wbGUsIEJhY2tib25lLmpzIG1vZGVscy5cbiAqXG4gKiBAcGFyYW0gIHtPYmplY3R9IG9iamVjdFxuICogQHBhcmFtICB7U3RyaW5nfSBwcm9wZXJ0eVxuICogQHJldHVybiB7Kn1cbiAqL1xuZW52UHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChvYmplY3QsIHByb3BlcnR5KSB7XG4gIHJldHVybiBvYmplY3RbcHJvcGVydHldO1xufTtcblxuLyoqXG4gKiBOb29wIGZ1bmN0aW9ucyBmb3Igc3Vic2NyaWJlIGFuZCB1bnN1YnNjcmliZS4gT3ZlcnJpZGUgd2l0aCBjdXN0b21cbiAqIGZ1bmN0aW9uYWxpdHkuXG4gKi9cbmVudlByb3RvdHlwZS5zdWJzY3JpYmUgPSBlbnZQcm90b3R5cGUudW5zdWJzY3JpYmUgPSBmdW5jdGlvbiAoKSB7fTtcbiIsInZhciBVdGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxuLyoqXG4gKiBFdmVudHMgb2JqZWN0IG1peGluLiBDcmVhdGVkIHRvIGtlZXAgdGhlIHJ1bnRpbWUgc2l6ZSBkb3duIHNpbmNlIGluY2x1ZGluZ1xuICogdGhlIG5vZGUgZXZlbnQgZW1pdHRlciBpcyBhIGh1Z2UgZGVwZW5kZW5jeS5cbiAqXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG52YXIgRXZlbnRzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuLyoqXG4gKiBMaXN0ZW4gdG8gYW55IGV2ZW50cyB0cmlnZ2VyZWQuXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSAgIG5hbWVcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICogQHBhcmFtICB7T2JqZWN0fSAgIGNvbnRleHRcbiAqIEByZXR1cm4ge0V2ZW50c31cbiAqL1xuRXZlbnRzLm9uID0gZnVuY3Rpb24gKG5hbWUsIGZuLCBjb250ZXh0KSB7XG4gIHRoaXMuX2V2ZW50cyB8fCAodGhpcy5fZXZlbnRzID0ge30pO1xuICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzW25hbWVdIHx8ICh0aGlzLl9ldmVudHNbbmFtZV0gPSBbXSk7XG4gIGV2ZW50cy5wdXNoKHsgZm46IGZuLCBjb250ZXh0OiBjb250ZXh0IH0pO1xufTtcblxuLyoqXG4gKiBMaXN0ZW4gdG8gYW55IGV2ZW50cyB0cmlnZ2VyZWQgb25jZS5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9ICAgbmFtZVxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gKiBAcGFyYW0gIHtPYmplY3R9ICAgY29udGV4dFxuICogQHJldHVybiB7RXZlbnRzfVxuICovXG5FdmVudHMub25jZSA9IGZ1bmN0aW9uIChuYW1lLCBmbiwgY29udGV4dCkge1xuICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgLy8gVXNpbmcgdGhlIGBvbmAgZnVuY3Rpb25hbGl0eSB3ZSBjYW4gY3JlYXRlIGEgYG9uY2VgIGZ1bmN0aW9uLlxuICB0aGlzLm9uKG5hbWUsIGZ1bmN0aW9uIHNlbGYgKCkge1xuICAgIHRoYXQub2ZmKG5hbWUsIHNlbGYpO1xuICAgIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH0sIGNvbnRleHQpO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgYW4gZXZlbnQgbGlzdGVuZXIuXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSAgIG5hbWVcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICogQHBhcmFtICB7T2JqZWN0fSAgIGNvbnRleHRcbiAqIEByZXR1cm4ge0V2ZW50c31cbiAqL1xuRXZlbnRzLm9mZiA9IGZ1bmN0aW9uIChuYW1lLCBmbiwgY29udGV4dCkge1xuICAvLyBEZWxldGUgYWxsIGV2ZW50IGxpc3RlbmVycyB3aGVuIG5vIGFyZ3VtZW50cyBhcmUgcGFzc2VkIGluLlxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBkZWxldGUgdGhpcy5fZXZlbnRzO1xuICB9XG5cbiAgLy8gRGVsZXRlIGFuIGVudGlyZSBldmVudCBuYW1lc3BhY2Ugd2hlbiBvbmx5IHRoZSBuYW1lIGlzIHBhc3NlZCBpbi5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gZGVsZXRlIHRoaXMuX2V2ZW50c1tuYW1lXTtcbiAgfVxuXG4gIC8vIElmIHRoZSBuYW1lc3BhY2UgZG9lcyBub3QgZXhpc3QsIHJldHVybiBlYXJseS5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1tuYW1lXSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIEl0ZXJhdGUgb3ZlciB0aGUgZXZlbnQgbmFtZXNwYWNlIGFuZCBkZWxldGUgbGlzdGVuZXJzIHdoZXJlIHRoZSBmdW5jdGlvblxuICAvLyBpZGVudGl0aWVzIGFuZCBvcHRpb25hbCBjb250ZXh0IG1hdGNoZXMuXG4gIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHNbbmFtZV07XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZXZlbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGV2ZW50c1tpXS5mbiA9PT0gZm4pIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyIHx8IGV2ZW50c1tpXS5jb250ZXh0ID09PSBjb250ZXh0KSB7XG4gICAgICAgIGV2ZW50cy5zcGxpY2UoaSwgMSk7XG4gICAgICAgIGktLTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBSZW1vdmUgZW1wdHkgbmFtZXNwYWNlcy5cbiAgaWYgKCFldmVudHMubGVuZ3RoKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1tuYW1lXTtcbiAgfVxufTtcblxuLyoqXG4gKiBFbWl0IGFuIGV2ZW50LlxuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gbmFtZVxuICogQHBhcmFtICB7Kn0gICAgICAuLi5cbiAqIEByZXR1cm4ge0V2ZW50c31cbiAqL1xuRXZlbnRzLmVtaXQgPSBVdGlscy52YXJpYWRpYyhmdW5jdGlvbiAobmFtZSwgYXJncykge1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW25hbWVdKSB7IHJldHVybjsgfVxuXG4gIC8vIENyZWF0ZSBhIHJlcGxpY2F0ZWQgYXJyYXkgb2YgdGhlIGV2ZW50IG5hbWVzcGFjZSBzbyB1bnN1YnNjcmliaW5nIHdpdGhpblxuICAvLyBjYWxscyAoRS5nLiBgb2ZmYCkgZG9lc24ndCBicmVhayB0aGUgaXRlcmF0aW9uLlxuICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzW25hbWVdLnNsaWNlKCk7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBldmVudHMubGVuZ3RoOyBpKyspIHtcbiAgICBldmVudHNbaV0uZm4uYXBwbHkoZXZlbnRzW2ldLmNvbnRleHQsIGFyZ3MpO1xuICB9XG59KTtcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL2V4Y2VwdGlvbicpLmRlZmF1bHQ7XG4iLCJ2YXIgY3VycmVudFRpbWUgPSB3aW5kb3cuRGF0ZS5ub3cgfHwgKGZ1bmN0aW9uICgpIHtcbiAgdmFyIENvbnN0dWN0b3IgPSB3aW5kb3cuRGF0ZTtcblxuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBuZXcgQ29uc3R1Y3RvcigpLmdldFRpbWUoKTtcbiAgfTtcbn0pKCk7XG5cblxudmFyIHNldFRpbWVyICAgID0gd2luZG93LnNldFRpbWVvdXQ7XG52YXIgY2xlYXJUaW1lciAgPSB3aW5kb3cuY2xlYXJUaW1lb3V0O1xuXG4vKipcbiAqIEZhbGxiYWNrIGFuaW1hdGlvbiBmcmFtZSBpbXBsZW1lbnRhdGlvbi5cbiAqXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqL1xudmFyIGZhbGxiYWNrID0gZnVuY3Rpb24gKCkge1xuICB2YXIgcHJldiA9IGN1cnJlbnRUaW1lKCk7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIChmbikge1xuICAgIHZhciBjdXJyID0gY3VycmVudFRpbWUoKTtcbiAgICB2YXIgbXMgICA9IE1hdGgubWF4KDAsIDE2IC0gKGN1cnIgLSBwcmV2KSk7XG4gICAgdmFyIHJlcSAgPSBzZXRUaW1lcihmbiwgbXMpO1xuXG4gICAgcHJldiA9IGN1cnI7XG5cbiAgICByZXR1cm4gcmVxO1xuICB9O1xufTtcblxuLyoqXG4gKiBFeHBvc2UgYHJlcXVlc3RBbmltYXRpb25GcmFtZWAuXG4gKlxuICogQHR5cGUge0Z1bmN0aW9ufVxuICovXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gIHdpbmRvdy53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgd2luZG93Lm1velJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICB3aW5kb3cubXNSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgd2luZG93Lm9SZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgZmFsbGJhY2soKTtcblxuLyoqXG4gKiBDYW5jZWwgdGhlIGFuaW1hdGlvbiBmcmFtZS5cbiAqXG4gKiBAdHlwZSB7RnVuY3Rpb259XG4gKi9cbnZhciBjYW5jZWwgPSB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgfHxcbiAgd2luZG93LndlYmtpdENhbmNlbEFuaW1hdGlvbkZyYW1lIHx8XG4gIHdpbmRvdy5tb3pDYW5jZWxBbmltYXRpb25GcmFtZSB8fFxuICB3aW5kb3cubXNDYW5jZWxBbmltYXRpb25GcmFtZSB8fFxuICB3aW5kb3cub0NhbmNlbEFuaW1hdGlvbkZyYW1lIHx8XG4gIGNsZWFyVGltZXI7XG5cbi8qKlxuICogQ2FuY2VsIGFuIGFuaW1hdGlvbiBmcmFtZS5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gaWRcbiAqL1xuZXhwb3J0cy5jYW5jZWwgPSBmdW5jdGlvbiAoaWQpIHtcbiAgY2FuY2VsLmNhbGwod2luZG93LCBpZCk7XG59O1xuIiwidmFyIGhic1ZNICAgICA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9ydW50aW1lJyk7XG52YXIgVXRpbHMgICAgID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIGlzQnJvd3NlciA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnO1xudmFyIHJhZiAgICAgICA9IGlzQnJvd3NlciAmJiByZXF1aXJlKCcuL3JhZicpO1xuXG4vKipcbiAqIEl0ZXJhdGUgb3ZlciBhbiBhcnJheSBvZiBmdW5jdGlvbnMgYW5kIGV4ZWN1dGUgZWFjaCBvZiB0aGVtLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IGFycmF5XG4gKi9cbnZhciBpdGVyYXRpb24gPSBmdW5jdGlvbiAoYXJyYXkpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgIGFycmF5W2ldKCk7XG4gIH1cbn07XG5cbi8qKlxuICogRXh0ZW5kIHRoZSBIYW5kbGViYXJzIHJ1bnRpbWUgZW52aXJvbm1lbnQgd2l0aCBET00gc3BlY2lmaWMgaGVscGVycy5cbiAqXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG52YXIgVk0gPSBtb2R1bGUuZXhwb3J0cyA9IFV0aWxzLmNyZWF0ZShoYnNWTSk7XG5cbi8qKlxuICogQmluZCBhIGZ1bmN0aW9uIHRvIHRoZSBhbmltYXRpb24gZnJhbWUuXG4gKlxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtOdW1iZXJ9XG4gKi9cblZNLmV4ZWMgPSBmdW5jdGlvbiAoZm4pIHtcbiAgcmV0dXJuIGlzQnJvd3NlciA/IHJhZihmbikgOiBzZXRJbW1lZGlhdGUoZm4pO1xufTtcblxuLyoqXG4gKiBDYW5jZWwgYW4gZXhlY3V0aW9uLlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBpZFxuICovXG5WTS5leGVjLmNhbmNlbCA9IGZ1bmN0aW9uIChpZCkge1xuICByZXR1cm4gaXNCcm93c2VyID8gcmFmLmNhbmNlbChpZCkgOiBjbGVhckltbWVkaWF0ZShpZCk7XG59O1xuXG4vKipcbiAqIEdlbmVyYXRlIGFuIGV4ZWN1dGFibGUgdGVtcGxhdGUgZnJvbSBhIHRlbXBsYXRlIHNwZWMuXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSAgIHRlbXBsYXRlU3BlY1xuICogQHJldHVybiB7RnVuY3Rpb259XG4gKi9cblZNLnRlbXBsYXRlID0gZnVuY3Rpb24gKHRlbXBsYXRlU3BlYywgZW52KSB7XG4gIC8qKlxuICAgKiBBY2NlcHRzIGEgZnVuY3Rpb24gdGhhdCBoYXMgc3Vic2NyaXB0aW9ucyBjYWxsZWQgaW5zaWRlIGFuZCByZXR1cm5zIGEgbmV3XG4gICAqIGZ1bmN0aW9uIHRoYXQgd2lsbCBsaXN0ZW4gdG8gYWxsIHN1YnNjcmlwdGlvbnMgYW5kIGNhbiB1cGRhdGUgd2l0aCBhbnlcbiAgICogY2hhbmdlcy5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gICAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICAgKi9cbiAgdmFyIHN1YnNjcmliZSA9IGZ1bmN0aW9uIChmbikge1xuICAgIHZhciB0cmlnZ2VyZWQgICAgPSBmYWxzZTtcbiAgICB2YXIgdW5zdWJzY3JpYmVkID0gZmFsc2U7XG4gICAgdmFyIGV4ZWNJZDtcbiAgICB2YXIgdXBkYXRlcjtcbiAgICB2YXIgcHJldlN1YnNjcmlwdGlvbnM7XG5cbiAgICAvKipcbiAgICAgKiBJdGVyYXRlIG92ZXIgYSBzdWJzY3JpcHRpb25zIG9iamVjdCBhbmQgdW5zdWJzY3JpYmUgZXZlcnl0aGluZy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHN1YnNjcmlwdGlvbnNcbiAgICAgKi9cbiAgICB2YXIgZWFjaFN1YnNjcmlwdGlvbiA9IGZ1bmN0aW9uIChzdWJzY3JpcHRpb25zLCBmbikge1xuICAgICAgZm9yICh2YXIgcHJvcGVydHkgaW4gc3Vic2NyaXB0aW9ucykge1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gc3Vic2NyaXB0aW9uc1twcm9wZXJ0eV0pIHtcbiAgICAgICAgICB2YXIgc3Vic2NyaXB0aW9uID0gc3Vic2NyaXB0aW9uc1twcm9wZXJ0eV1ba2V5XTtcbiAgICAgICAgICBmbihzdWJzY3JpcHRpb24sIHByb3BlcnR5LCBzdWJzY3JpYmVyLnVwZGF0ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUnVuIHRoaXMgZnVuY3Rpb24gYmVmb3JlIHdlIHJ1biBhbiB1cGRhdGUgZnVuY3Rpb24uIEl0IG1vdmVzIGN1cnJlbnRcbiAgICAgKiBzdWJzY3JpcHRpb25zIHNvIHRoYXQgd2UgY2FuIGRpZmYgdGhlIHN1YnNjcmlwdGlvbnMgYWZ0ZXIgd2UgdXBkYXRlXG4gICAgICogdGhlIERPTS5cbiAgICAgKi9cbiAgICB2YXIgYmVmb3JlVXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgaXRlcmF0aW9uKHN1YnNjcmliZXIudW5zdWJzY3JpcHRpb25zKTtcbiAgICAgIHByZXZTdWJzY3JpcHRpb25zID0gc3Vic2NyaWJlci5zdWJzY3JpcHRpb25zO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSdW4gdGhpcyBmdW5jdGlvbiBhZnRlciBhbiB1cGRhdGUuIEl0IHdpbGwgY2hlY2sgZm9yIGRpZmZlcmVuY2UgaW4gdGhlXG4gICAgICogYmVmb3JlIGFuZCBhZnRlciB1cGRhdGVzLlxuICAgICAqL1xuICAgIHZhciBhZnRlclVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBzdWJzY3JpcHRpb25zID0gc3Vic2NyaWJlci5zdWJzY3JpcHRpb25zO1xuXG4gICAgICAvLyBEaWZmIHRoZSBuZXcgc3Vic2NyaXB0aW9ucyBhZ2FpbnN0IHRoZSBwcmV2aW91cyBzdWJzY3JpcHRpb25zIG9iamVjdFxuICAgICAgLy8gdG8gYWRkL3JlbW92ZSBsaXN0ZW5lcnMgYXMgbmVlZGVkLiBUaGlzIGlzIG1vcmUgbWVtb3J5IGVmZmljaWVudCB0aGFuXG4gICAgICAvLyBibGluZGx5IGFkZGluZyBhbmQgcmVtb3ZpbmcgZXZlcnkgbGlzdGVuZXIgZWFjaCBleGVjdXRpb24uXG4gICAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiBzdWJzY3JpcHRpb25zKSB7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzdWJzY3JpcHRpb25zW3Byb3BlcnR5XSkge1xuICAgICAgICAgIGlmICghcHJldlN1YnNjcmlwdGlvbnNbcHJvcGVydHldW2tleV0pIHtcbiAgICAgICAgICAgIHZhciBzdWJzY3JpcHRpb24gPSBzdWJzY3JpcHRpb25zW3Byb3BlcnR5XVtrZXldO1xuICAgICAgICAgICAgZW52LnN1YnNjcmliZShzdWJzY3JpcHRpb24sIHByb3BlcnR5LCBzdWJzY3JpYmVyLnVwZGF0ZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRlbGV0ZSBwcmV2U3Vic2NyaXB0aW9uc1twcm9wZXJ0eV1ba2V5XTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gTG9vcCBvdmVyIHByZXZpb3VzIHN1YnNjcmlwdGlvbnMgdGhhdCBubyBsb25nZXIgZXhpc3QgYW5kIHVuc3Vic2NyaWJlLlxuICAgICAgZWFjaFN1YnNjcmlwdGlvbihwcmV2U3Vic2NyaXB0aW9ucywgZW52LnVuc3Vic2NyaWJlKTtcblxuICAgICAgLy8gUmVtb3ZlIGFueSBsaW5nZXJpbmcgcmVmZXJlbmNlcyB0byBwcmV2aW91cyBzdWJzY3JpcHRpb24gb2JqZWN0cy5cbiAgICAgIHByZXZTdWJzY3JpcHRpb25zID0gbnVsbDtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogVW5zdWJzY3JpYmUgZXZlcnkgY2hpbGQgb2YgdGhlIGN1cnJlbnQgc3Vic2NyaXB0aW9uLlxuICAgICAqL1xuICAgIHZhciB1bnN1YnNjcmliZUNoaWxkcmVuID0gZnVuY3Rpb24gKCkge1xuICAgICAgZm9yICh2YXIgY2hpbGQgaW4gc3Vic2NyaWJlci5jaGlsZHJlbikge1xuICAgICAgICBzdWJzY3JpYmVyLmNoaWxkcmVuW2NoaWxkXS5yZW1vdmUoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogRXhlY3V0ZSB0aGUgZnVuY3Rpb24gYW5kIHJldHVybiB0aGUgcmVzdWx0LlxuICAgICAqXG4gICAgICogQHJldHVybiB7Kn1cbiAgICAgKi9cbiAgICB2YXIgZXhlY3V0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIC8vIElmIHdlIGhhdmUgYSBwYXJlbnQgc3Vic2NyaWJlciwgbGluayB0aGUgc3Vic2NyaWJlcnMgdG9nZXRoZXIuXG4gICAgICBpZiAoY29udGFpbmVyLnN1YnNjcmliZXIpIHtcbiAgICAgICAgc3Vic2NyaWJlci5wYXJlbnQgPSBjb250YWluZXIuc3Vic2NyaWJlcjtcbiAgICAgICAgc3Vic2NyaWJlci5wYXJlbnQuY2hpbGRyZW5bc3Vic2NyaWJlci5jaWRdID0gc3Vic2NyaWJlcjtcbiAgICAgIH1cblxuICAgICAgLy8gUmVzZXQgc3Vic2NyaXB0aW9ucyBiZWZvcmUgZXhlY3V0aW9uLlxuICAgICAgc3Vic2NyaWJlci5zdWJzY3JpcHRpb25zICAgPSB7fTtcbiAgICAgIHN1YnNjcmliZXIudW5zdWJzY3JpcHRpb25zID0gW107XG5cbiAgICAgIC8vIEFsaWFzIHN1YnNjcmliZXIgZnVuY3Rpb25hbGl0eSB0byB0aGUgVk0gb2JqZWN0LlxuICAgICAgY29udGFpbmVyLnN1YnNjcmliZXIgPSBzdWJzY3JpYmVyO1xuXG4gICAgICB2YXIgdmFsdWUgPSBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgICAvLyBSZXNldCB0aGUgVk0gZnVuY3Rpb25hbGl0eSB0byB3aGF0IGl0IHdhcyBiZWZvcmVoYW5kLlxuICAgICAgY29udGFpbmVyLnN1YnNjcmliZXIgPSBzdWJzY3JpYmVyLnBhcmVudDtcblxuICAgICAgLy8gUmV0dXJuIGFuIG9iamVjdCB3aXRoIGEgdmFsdWUgcHJvcGVydHkgYW5kIHVuc3Vic2NyaWJlIGZ1bmN0aW9uYWxpdHkuXG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFRoZSByZXR1cm5lZCBzdWJzY3JpcHRpb24gZnVuY3Rpb24gdGFrZXMgY2FyZSBvZiBhbGlhc2luZyB0aGVcbiAgICAgKiBzdWJzY3JpcHRpb25zIGFycmF5IGNvcnJlY3RseSwgc3Vic2NyaWJpbmcgZm9yIHVwZGF0ZXMgYW5kIHRyaWdnZXJpbmdcbiAgICAgKiB1cGRhdGVzIHdoZW4gYW55IG9mIHRoZSBzdWJzY3JpcHRpb25zIGNoYW5nZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICAgICAqIEByZXR1cm4geyp9XG4gICAgICovXG4gICAgdmFyIHN1YnNjcmliZXIgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgIHZhciByZXN1bHQgPSBleGVjdXRlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICAgIHVwZGF0ZXIgPSBmbjtcbiAgICAgIGVhY2hTdWJzY3JpcHRpb24oc3Vic2NyaWJlci5zdWJzY3JpcHRpb25zLCBlbnYuc3Vic2NyaWJlKTtcblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuXG4gICAgLy8gS2VlcCBhbiBhcnJheSBvZiBjdXJyZW50IHN1YnNjcmlwdGlvbnMgYW5kIGFuIG9iamVjdCB3aXRoIHJlZmVyZW5jZXNcbiAgICAvLyB0byBjaGlsZCBzdWJzY3JpcHRpb24gZnVuY3Rpb25zLlxuICAgIHN1YnNjcmliZXIuY2lkICAgICAgPSAnc3Vic2NyaWJlcicgKyBVdGlscy51bmlxdWVJZCgpO1xuICAgIHN1YnNjcmliZXIuY2hpbGRyZW4gPSB7fTtcblxuICAgIC8qKlxuICAgICAqIFRyaWdnZXIgdGhpcyBmdW5jdGlvbiB3aXRoIGV2ZXJ5IGNoYW5nZSB3aXRoIHRoZSBsaXN0ZW5lcnMuXG4gICAgICovXG4gICAgc3Vic2NyaWJlci51cGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAvLyBJZiB0aGUgdHJpZ2dlcmVkIGZsYWcgaGFzIGJlZW4gc2V0LCBkb24ndCBjYXVzZSBhbm90aGVyIHVwZGF0ZS5cbiAgICAgIGlmICh0cmlnZ2VyZWQgfHwgdW5zdWJzY3JpYmVkKSB7IHJldHVybjsgfVxuXG4gICAgICAvLyBTZXQgYSB0cmlnZ2VyZWQgZmxhZyB0byBhdm9pZCBtdWx0aXBsZSB0cmlnZ2Vycy4gQWxzbyB1bnN1YnNjcmliZSBhbnlcbiAgICAgIC8vIGNoaWxkcmVuIGltbWVkaWF0ZWx5IHRvIHN0b3AgdXBkYXRlIGNsYXNoZXMuXG4gICAgICB0cmlnZ2VyZWQgPSB0cnVlO1xuICAgICAgdW5zdWJzY3JpYmVDaGlsZHJlbigpO1xuXG4gICAgICBleGVjSWQgPSBWTS5leGVjKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdHJpZ2dlcmVkID0gZmFsc2U7XG5cbiAgICAgICAgYmVmb3JlVXBkYXRlKCk7XG4gICAgICAgIHVwZGF0ZXIoZXhlY3V0ZSgpKTtcbiAgICAgICAgYWZ0ZXJVcGRhdGUoKTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBQdXNoIHVuc3Vic2NyaXB0aW9uIGZ1bmN0aW9ucyBpbnRvIHRoZSB1bnN1YnNjcmliZSBhcnJheS5cbiAgICAgKi9cbiAgICBzdWJzY3JpYmVyLnVuc3Vic2NyaWJlID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgICBVdGlscy5pc0Z1bmN0aW9uKGZuKSAmJiBzdWJzY3JpYmVyLnVuc3Vic2NyaXB0aW9ucy5wdXNoKGZuKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlIHRoZSBjdXJyZW50IHN1YnNjcmliZXIgZnJvbSBhbGwgbGlzdGVuZXJzLiBXZSBhbHNvIG5lZWQgdG8gY2FuY2VsXG4gICAgICogYW55IGN1cnJlbnQgZXhlY3V0aW9uIGV2ZW50IGFuZCByZW1vdmUgYSByZWZlcmVuY2UgZnJvbSB0aGUgcGFyZW50XG4gICAgICogc3Vic2NyaXB0aW9uLlxuICAgICAqL1xuICAgIHN1YnNjcmliZXIucmVtb3ZlID0gZnVuY3Rpb24gKCkge1xuICAgICAgaXRlcmF0aW9uKHN1YnNjcmliZXIudW5zdWJzY3JpcHRpb25zKTtcbiAgICAgIGVhY2hTdWJzY3JpcHRpb24oc3Vic2NyaWJlci5zdWJzY3JpcHRpb25zLCBlbnYudW5zdWJzY3JpYmUpO1xuXG4gICAgICAvLyBSZW1vdmUgdGhlIGN1cnJlbnQgc3Vic2NyaXB0aW9uIGZyb20gaXRzIHBhcmVudC5cbiAgICAgIGlmIChzdWJzY3JpYmVyLnBhcmVudCkge1xuICAgICAgICBkZWxldGUgc3Vic2NyaWJlci5wYXJlbnQuY2hpbGRyZW5bc3Vic2NyaWJlci5jaWRdO1xuICAgICAgICBkZWxldGUgc3Vic2NyaWJlci5wYXJlbnQ7XG4gICAgICB9XG5cbiAgICAgIC8vIFJlbW92ZSBvdGhlciByZWZlcm5lbmNlcy5cbiAgICAgIHVwZGF0ZXIgPSBudWxsO1xuXG4gICAgICAvLyBUcmFjayB3aGV0aGVyIHdlIGhhdmUgYmVlbiB1bnN1YnNjcmliZWQuIFRoaXMgaXMgcmVxdWlyZWQgc2luY2UgdGhlXG4gICAgICAvLyBsaXN0ZW5lciBjb3VsZCBzdGlsbCBiZSB0cmlnZ2VyZWQgYXQgYW55IHRpbWUgZXZlbiB0aG91Z2ggd2UgZXhwZWN0XG4gICAgICAvLyB0aGUgZXh0ZXJuYWwgcmVmZXJlbmNlcyB0byBiZSBkcm9wcGVkLiBUaGlzIGNvdWxkIGFsc28gaW5kaWNhdGUgYVxuICAgICAgLy8gcG90ZW50aWFsIG1lbW9yeSBsZWFrIHdpdGggdGhlIGxpc3RlbmVyIHVuc3VzYmNyaXB0aW9uIGNvZGUuXG4gICAgICB1bnN1YnNjcmliZWQgPSB0cnVlO1xuICAgICAgdW5zdWJzY3JpYmVDaGlsZHJlbigpO1xuICAgICAgVk0uZXhlYy5jYW5jZWwoZXhlY0lkKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHN1YnNjcmliZXI7XG4gIH07XG5cbiAgLyoqXG4gICAqIFdyYXAgYSBmdW5jdGlvbiBpbiBhIHN1YnNjcmliZXIgKmV2ZXJ5KiB0aW1lIHRoYXQgZnVuY3Rpb24gaXMgY2FsbGVkLlxuICAgKlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAgICogQHJldHVybiB7T2JqZWN0fVxuICAgKi9cbiAgdmFyIHdyYXBTdWJzY3JpYmVyID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBzdWJzY3JpYmVyID0gc3Vic2NyaWJlKGZuKTtcbiAgICAgIHZhciB2YWx1ZSAgICAgID0gc3Vic2NyaWJlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgICAvLyBSZXR1cm4gYW4gb2JqZWN0IHdyYXBwZWQgaW4gdXNlZnVsIGZ1bmN0aW9uYWxpdHkuXG4gICAgICByZXR1cm4ge1xuICAgICAgICB2YWx1ZTogICAgICAgdmFsdWUsXG4gICAgICAgIHVuc3Vic2NyaWJlOiBzdWJzY3JpYmVyLnJlbW92ZVxuICAgICAgfTtcbiAgICB9O1xuICB9O1xuXG4gIC8qKlxuICAgKiBUaGUgY29udGFpbmVyIG9iamVjdCBob2xkcyBhbGwgdGhlIGZ1bmN0aW9ucyB1c2VkIGJ5IHRoZSB0ZW1wbGF0ZSBzcGVjLlxuICAgKlxuICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgKi9cbiAgdmFyIGNvbnRhaW5lciA9IHtcbiAgICBpbnZva2VQYXJ0aWFsOiAgICBWTS5pbnZva2VQYXJ0aWFsLFxuICAgIHByb2dyYW1zOiAgICAgICAgIFtdLFxuICAgIG5vb3A6ICAgICAgICAgICAgIFZNLm5vb3AsXG4gICAgcGFydGlhbDogICAgICAgICAgVXRpbHMucGFydGlhbCxcbiAgICBlc2NhcGVFeHByZXNzaW9uOiBVdGlscy5lc2NhcGVFeHByZXNzaW9uLFxuICAgIHByb2dyYW1XaXRoRGVwdGg6IFZNLnByb2dyYW1XaXRoRGVwdGhcbiAgfTtcblxuICAvKipcbiAgICogUmVuZGVyIGFuZCBzdWJzY3JpYmUgYSBzaW5nbGUgRE9NIG5vZGUgdXNpbmcgYSBjdXN0b20gY3JlYXRpb24gZnVuY3Rpb24uXG4gICAqXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gY3JlYXRlXG4gICAqIEByZXR1cm4ge05vZGV9XG4gICAqL1xuICB2YXIgc3Vic2NyaWJlTm9kZSA9IGZ1bmN0aW9uIChmbiwgY3JlYXRlKSB7XG4gICAgdmFyIHN1YnNjcmlwdGlvbiA9IHN1YnNjcmliZShmbik7XG5cbiAgICB2YXIgdHJhY2tOb2RlID0gVXRpbHMudHJhY2tOb2RlKGNyZWF0ZShzdWJzY3JpcHRpb24oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICB0cmFja05vZGUucmVwbGFjZShjcmVhdGUodmFsdWUpKTtcbiAgICB9KSkpO1xuXG4gICAgcmV0dXJuIHRyYWNrTm9kZS5mcmFnbWVudDtcbiAgfTtcblxuICAvKipcbiAgICogUmVtb3ZlIGFuIGF0dHJpYnV0ZSBmcm9tIGFuIGVsZW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSB7Tm9kZX0gICBlbGVtZW50XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gICAqL1xuICB2YXIgcmVtb3ZlQXR0cmlidXRlID0gZnVuY3Rpb24gKGVsZW1lbnQsIG5hbWUpIHtcbiAgICBpZiAoZWxlbWVudC5oYXNBdHRyaWJ1dGUobmFtZSkpIHtcbiAgICAgIGVudi5lbWl0KCdyZW1vdmVBdHRyaWJ1dGUnLCBlbGVtZW50LCBuYW1lKTtcbiAgICAgIGVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogU2V0IGFuIGF0dHJpYnV0ZSB2YWx1ZSBvbiBhbiBlbGVtZW50LlxuICAgKlxuICAgKiBAcGFyYW0ge05vZGV9ICAgZWxlbWVudFxuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICAgKiBAcGFyYW0geyp9ICAgICAgdmFsdWVcbiAgICovXG4gIHZhciBzZXRBdHRyaWJ1dGUgPSBmdW5jdGlvbiAoZWxlbWVudCwgbmFtZSwgdmFsdWUpIHtcbiAgICBpZiAodmFsdWUgPT09IGZhbHNlKSB7XG4gICAgICByZXR1cm4gcmVtb3ZlQXR0cmlidXRlKGVsZW1lbnQsIG5hbWUpO1xuICAgIH1cblxuICAgIGVudi5lbWl0KCdzZXRBdHRyaWJ1dGUnLCBlbGVtZW50LCBuYW1lLCB2YWx1ZSk7XG4gICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUobmFtZSwgdmFsdWUpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYW4gZWxlbWVudCBmcm9tIGEgdGFnIG5hbWUuXG4gICAqXG4gICAqIEBwYXJhbSAge1N0cmluZ30gdGFnTmFtZVxuICAgKiBAcmV0dXJuIHtOb2RlfVxuICAgKi9cbiAgdmFyIGNyZWF0ZUVsZW1lbnQgPSBmdW5jdGlvbiAodGFnTmFtZSkge1xuICAgIHZhciBub2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWdOYW1lKTtcbiAgICBlbnYuZW1pdCgnY3JlYXRlRWxlbWVudCcsIG5vZGUpO1xuICAgIHJldHVybiBub2RlO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBjb21tZW50IG5vZGUgYmFzZWQgb24gdGV4dCBjb250ZW50cy5cbiAgICpcbiAgICogQHBhcmFtICB7U3RyaW5nfSBjb250ZW50c1xuICAgKiBAcmV0dXJuIHtOb2RlfVxuICAgKi9cbiAgdmFyIGNyZWF0ZUNvbW1lbnQgPSBmdW5jdGlvbiAodGFnTmFtZSkge1xuICAgIHZhciBub2RlID0gZG9jdW1lbnQuY3JlYXRlQ29tbWVudCh0YWdOYW1lKTtcbiAgICBlbnYuZW1pdCgnY3JlYXRlQ29tbWVudCcsIG5vZGUpO1xuICAgIHJldHVybiBub2RlO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDb3B5IGFsbCBzaWduaWZpY2FudCBkYXRhIGZyb20gb25lIGVsZW1lbnQgbm9kZSB0byBhbm90aGVyLlxuICAgKlxuICAgKiBAcGFyYW0gIHtOb2RlfSBuZXdOb2RlXG4gICAqIEBwYXJhbSAge05vZGV9IG9sZE5vZGVcbiAgICogQHJldHVybiB7Tm9kZX1cbiAgICovXG4gIHZhciBjb3B5Tm9kZSA9IGZ1bmN0aW9uIChuZXdOb2RlLCBvbGROb2RlKSB7XG4gICAgLy8gTW92ZSBhbGwgY2hpbGQgZWxlbWVudHMgdG8gdGhlIG5ldyBub2RlLlxuICAgIHdoaWxlIChvbGROb2RlLmZpcnN0Q2hpbGQpIHtcbiAgICAgIG5ld05vZGUuYXBwZW5kQ2hpbGQob2xkTm9kZS5maXJzdENoaWxkKTtcbiAgICB9XG5cbiAgICAvLyBDb3B5IGFsbCB0aGUgYXR0cmlidXRlcyB0byB0aGUgbmV3IG5vZGUuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvbGROb2RlLmF0dHJpYnV0ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBhdHRyaWJ1dGUgPSBvbGROb2RlLmF0dHJpYnV0ZXNbaV07XG4gICAgICBzZXRBdHRyaWJ1dGUobmV3Tm9kZSwgYXR0cmlidXRlLm5hbWUsIGF0dHJpYnV0ZS52YWx1ZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ld05vZGU7XG4gIH07XG5cbiAgLyoqXG4gICAqIENvcHkgYWxsIHRoZSBkYXRhIGZyb20gb25lIGVsZW1lbnQgdG8gYW5vdGhlciBhbmQgcmVwbGFjZSBpbiBwbGFjZS5cbiAgICpcbiAgICogQHBhcmFtICB7Tm9kZX0gbmV3Tm9kZVxuICAgKiBAcGFyYW0gIHtOb2RlfSBvbGROb2RlXG4gICAqIEByZXR1cm4ge05vZGV9XG4gICAqL1xuICB2YXIgY29weUFuZFJlcGxhY2VOb2RlID0gZnVuY3Rpb24gKG5ld05vZGUsIG9sZE5vZGUpIHtcbiAgICBvbGROb2RlLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKGNvcHlOb2RlKG5ld05vZGUsIG9sZE5vZGUpLCBvbGROb2RlKTtcbiAgICByZXR1cm4gbmV3Tm9kZTtcbiAgfTtcblxuICAvKipcbiAgICogQ3JlYXRlIGFuIGVsZW1lbnQgYW5kIHN1YnNjcmliZSB0byBhbnkgY2hhbmdlcy4gVGhpcyBtZXRob2QgcmVxdWlyZXMgYVxuICAgKiBjYWxsYmFjayBmdW5jdGlvbiBmb3IgYW55IGVsZW1lbnQgY2hhbmdlcyBzaW5jZSB5b3UgY2FuJ3QgY2hhbmdlIGEgdGFnXG4gICAqIG5hbWUgaW4gcGxhY2UuXG4gICAqXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gY2JcbiAgICogQHJldHVybiB7RWxlbWVudH1cbiAgICovXG4gIGNvbnRhaW5lci5jcmVhdGVFbGVtZW50ID0gZnVuY3Rpb24gKGZuLCBjYikge1xuICAgIHZhciBzdWJzY3JpcHRpb24gPSBzdWJzY3JpYmUoZm4pO1xuXG4gICAgdmFyIGVsID0gY3JlYXRlRWxlbWVudChzdWJzY3JpcHRpb24oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICBjYihlbCA9IGNvcHlBbmRSZXBsYWNlTm9kZShjcmVhdGVFbGVtZW50KHZhbHVlKSwgZWwpKTtcbiAgICB9KSk7XG5cbiAgICByZXR1cm4gZWw7XG4gIH07XG5cbiAgLyoqXG4gICAqIEFwcGVuZCBhbiBlbGVtZW50IHRvIHRoZSBlbmQgb2YgYW5vdGhlciBlbGVtZW50LlxuICAgKlxuICAgKiBAcGFyYW0ge05vZGV9IHBhcmVudFxuICAgKiBAcGFyYW0ge05vZGV9IGNoaWxkXG4gICAqL1xuICBjb250YWluZXIuYXBwZW5kQ2hpbGQgPSBmdW5jdGlvbiAocGFyZW50LCBjaGlsZCkge1xuICAgIGlmICghY2hpbGQpIHsgcmV0dXJuOyB9XG5cbiAgICBwYXJlbnQuYXBwZW5kQ2hpbGQoY2hpbGQpO1xuICAgIGVudi5lbWl0KCdhcHBlbmRDaGlsZCcsIHBhcmVudCwgY2hpbGQpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBTZXQgYW4gZWxlbWVudHMgYXR0cmlidXRlLiBXZSBhY2NlcHQgdGhlIGN1cnJlbnQgZWxlbWVudCBhIGZ1bmN0aW9uXG4gICAqIGJlY2F1c2Ugd2hlbiBhIHRhZyBuYW1lIGNoYW5nZXMgd2Ugd2lsbCBsb3NlIHJlZmVyZW5jZSB0byB0aGUgYWN0aXZlbHlcbiAgICogcmVuZGVyZWQgZWxlbWVudC5cbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZWxlbWVudEZuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IG5hbWVGblxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSB2YWx1ZUZuXG4gICAqL1xuICBjb250YWluZXIuc2V0QXR0cmlidXRlID0gZnVuY3Rpb24gKGVsZW1lbnRGbiwgbmFtZUZuLCB2YWx1ZUZuKSB7XG4gICAgdmFyIG5hbWVTdWJzY3JpcHRpb24gID0gc3Vic2NyaWJlKG5hbWVGbik7XG4gICAgdmFyIHZhbHVlU3Vic2NyaXB0aW9uID0gc3Vic2NyaWJlKHZhbHVlRm4pO1xuXG4gICAgLy8gS2VlcCB0cmFjayBvZiB0aGUgY3VycmVudCBuYW1lIGFuZCB2YWx1ZSB3aXRob3V0IGhhdmluZyB0byByZS1ydW4gdGhlXG4gICAgLy8gZnVuY3Rpb24gZXZlcnkgdGltZSBzb21ldGhpbmcgY2hhbmdlcy5cbiAgICB2YXIgYXR0ck5hbWUgPSBuYW1lU3Vic2NyaXB0aW9uKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgcmVtb3ZlQXR0cmlidXRlKGVsZW1lbnRGbigpLCBhdHRyTmFtZSk7XG4gICAgICBzZXRBdHRyaWJ1dGUoZWxlbWVudEZuKCksIGF0dHJOYW1lID0gdmFsdWUsIGF0dHJWYWx1ZSk7XG4gICAgfSk7XG5cbiAgICB2YXIgYXR0clZhbHVlID0gdmFsdWVTdWJzY3JpcHRpb24oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICBzZXRBdHRyaWJ1dGUoZWxlbWVudEZuKCksIGF0dHJOYW1lLCBhdHRyVmFsdWUgPSB2YWx1ZSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gc2V0QXR0cmlidXRlKGVsZW1lbnRGbigpLCBhdHRyTmFtZSwgYXR0clZhbHVlKTtcbiAgfTtcblxuICAvKipcbiAgICogQ3JlYXRlIGEgRE9NIGVsZW1lbnQgYW5kIHN1YnNjcmliZSB0byBhbnkgY2hhbmdlcy5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gICAqIEByZXR1cm4ge05vZGV9XG4gICAqL1xuICBjb250YWluZXIuY3JlYXRlRE9NID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgcmV0dXJuIHN1YnNjcmliZU5vZGUoZm4sIFV0aWxzLmRvbWlmeUV4cHJlc3Npb24pO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSB0ZXh0IG5vZGUgYW5kIHN1YnNjcmliZSB0byBhbnkgY2hhbmdlcy5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gICAqIEByZXR1cm4ge1RleHR9XG4gICAqL1xuICBjb250YWluZXIuY3JlYXRlVGV4dCA9IGZ1bmN0aW9uIChmbikge1xuICAgIHJldHVybiBzdWJzY3JpYmVOb2RlKGZuLCBVdGlscy50ZXh0aWZ5RXhwcmVzc2lvbik7XG4gIH07XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIGNvbW1lbnQgbm9kZSBhbmQgc3Vic2NyaWJlIHRvIGFueSBjaGFuZ2VzLlxuICAgKlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAgICogQHJldHVybiB7Q29tbWVudH1cbiAgICovXG4gIGNvbnRhaW5lci5jcmVhdGVDb21tZW50ID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgdmFyIHN1YnNjcmlwdGlvbiA9IHN1YnNjcmliZShmbik7XG4gICAgdmFyIG5vZGUgICAgICAgICA9IGNyZWF0ZUNvbW1lbnQoc3Vic2NyaXB0aW9uKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgbm9kZS50ZXh0Q29udGVudCA9IHZhbHVlO1xuICAgIH0pKTtcblxuICAgIHJldHVybiBub2RlO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYW5kIHJldHVybiBhIHByb2dyYW0gc2luZ2xldG9uIGJhc2VkIG9uIGluZGV4LlxuICAgKlxuICAgKiBAcGFyYW0gIHtOdW1iZXJ9ICAgaVxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAgICogQHBhcmFtICB7T2JqZWN0fSAgIGRhdGFcbiAgICogQHJldHVybiB7RnVuY3Rpb259XG4gICAqL1xuICBjb250YWluZXIucHJvZ3JhbSA9IGZ1bmN0aW9uIChpLCBmbiwgZGF0YSkge1xuICAgIHZhciBwcm9ncmFtV3JhcHBlciA9IGNvbnRhaW5lci5wcm9ncmFtc1tpXTtcblxuICAgIGlmIChkYXRhKSB7XG4gICAgICByZXR1cm4gVk0ucHJvZ3JhbShpLCBmbiwgZGF0YSk7XG4gICAgfVxuXG4gICAgaWYgKCFwcm9ncmFtV3JhcHBlcikge1xuICAgICAgcmV0dXJuIGNvbnRhaW5lci5wcm9ncmFtc1tpXSA9IFZNLnByb2dyYW0oaSwgZm4pO1xuICAgIH1cblxuICAgIHJldHVybiBwcm9ncmFtV3JhcHBlcjtcbiAgfTtcblxuICAvKipcbiAgICogV3JhcCBwcm9ncmFtIGZ1bmN0aW9ucyB3aXRoIHN1YnNjcmliZXIgZnVuY3Rpb25hbGl0eS5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IHByb2dyYW1cbiAgICogQHJldHVybiB7RnVuY3Rpb259XG4gICAqL1xuICBjb250YWluZXIud3JhcFByb2dyYW0gPSBmdW5jdGlvbiAoZm4pIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIHdyYXBTdWJzY3JpYmVyKGZuKS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH07XG5cbiAgLyoqXG4gICAqIE1lcmdlIHR3byBvYmplY3RzIGludG8gYSBzaW5nbGUgb2JqZWN0LlxuICAgKlxuICAgKiBAcGFyYW0gIHtPYmplY3R9IHBhcmFtXG4gICAqIEBwYXJhbSAge09iamVjdH0gY29tbW9uXG4gICAqIEByZXR1cm4ge09iamVjdH1cbiAgICovXG4gIGNvbnRhaW5lci5tZXJnZSA9IGZ1bmN0aW9uIChwYXJhbSwgY29tbW9uKSB7XG4gICAgdmFyIHJldCA9IHBhcmFtIHx8IGNvbW1vbjtcblxuICAgIGlmIChwYXJhbSAmJiBjb21tb24gJiYgKHBhcmFtICE9PSBjb21tb24pKSB7XG4gICAgICByZXQgPSB7fTtcbiAgICAgIFV0aWxzLmV4dGVuZChyZXQsIGNvbW1vbik7XG4gICAgICBVdGlscy5leHRlbmQocmV0LCBwYXJhbSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldDtcbiAgfTtcblxuICAvKipcbiAgICogR2V0IGEgcHJvcGVydHkgZnJvbSBhbiBvYmplY3QuIFBhc3NlcyBpbiB0aGUgb2JqZWN0IGlkIChkZXB0aCkgdG8gbWFrZSBpdFxuICAgKiBtdWNoIGZhc3RlciB0byBkbyBjb21wYXJpc29ucyBiZXR3ZWVuIG5ldyBhbmQgb2xkIHN1YnNjcmlwdGlvbnMuXG4gICAqXG4gICAqIEBwYXJhbSAge09iamVjdH0gb2JqZWN0XG4gICAqIEBwYXJhbSAge1N0cmluZ30gcHJvcGVydHlcbiAgICogQHBhcmFtICB7U3RyaW5nfSBpZFxuICAgKiBAcmV0dXJuIHsqfVxuICAgKi9cbiAgY29udGFpbmVyLmdldCA9IGZ1bmN0aW9uIChvYmplY3QsIHByb3BlcnR5LCBpZCkge1xuICAgIHZhciBzdWJzY3JpcHRpb25zID0gY29udGFpbmVyLnN1YnNjcmliZXIuc3Vic2NyaXB0aW9ucztcblxuICAgIChzdWJzY3JpcHRpb25zW3Byb3BlcnR5XSB8fCAoc3Vic2NyaXB0aW9uc1twcm9wZXJ0eV0gPSB7fSkpW2lkXSA9IG9iamVjdDtcblxuICAgIHJldHVybiBlbnYuZ2V0KG9iamVjdCwgcHJvcGVydHkpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZXR1cm4gdGhlIGNvbXBpbGVkIEphdmFTY3JpcHQgZnVuY3Rpb24gZm9yIGV4ZWN1dGlvbi5cbiAgICpcbiAgICogQHBhcmFtICB7T2JqZWN0fSBjb250ZXh0XG4gICAqIEBwYXJhbSAge09iamVjdH0gb3B0aW9uc1xuICAgKiBAcmV0dXJuIHtOb2RlfVxuICAgKi9cbiAgcmV0dXJuIHdyYXBTdWJzY3JpYmVyKGZ1bmN0aW9uIChjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICB2YXIgbmFtZXNwYWNlID0gb3B0aW9ucy5wYXJ0aWFsID8gb3B0aW9ucyA6IGVudjtcbiAgICB2YXIgaGVscGVycztcbiAgICB2YXIgcGFydGlhbHM7XG5cbiAgICBpZiAoIW9wdGlvbnMucGFydGlhbCkge1xuICAgICAgaGVscGVycyAgPSBvcHRpb25zLmhlbHBlcnM7XG4gICAgICBwYXJ0aWFscyA9IG9wdGlvbnMucGFydGlhbHM7XG4gICAgfVxuXG4gICAgdmFyIHJlc3VsdCA9IHRlbXBsYXRlU3BlYy5jYWxsKFxuICAgICAgY29udGFpbmVyLFxuICAgICAgbmFtZXNwYWNlLFxuICAgICAgY29udGV4dCxcbiAgICAgIGhlbHBlcnMsXG4gICAgICBwYXJ0aWFscyxcbiAgICAgIG9wdGlvbnMuZGF0YVxuICAgICk7XG5cbiAgICBpZiAoIW9wdGlvbnMucGFydGlhbCkge1xuICAgICAgZW52LlZNLmNoZWNrUmV2aXNpb24oY29udGFpbmVyLmNvbXBpbGVySW5mbyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCdoYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvc2FmZS1zdHJpbmcnKS5kZWZhdWx0O1xuIiwidmFyIFRyYWNrTm9kZSA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgdGhpcy5mcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcblxuICAvLyBJbnN0YW50bHkgYXBwZW5kIGEgYmVmb3JlIGFuZCBhZnRlciB0cmFja2luZyBub2RlLlxuICB0aGlzLmJlZm9yZSA9IHRoaXMuZnJhZ21lbnQuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpKTtcbiAgdGhpcy5hZnRlciAgPSB0aGlzLmZyYWdtZW50LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKSk7XG5cbiAgLy8gQXBwZW5kIHRoZSBwYXNzZWQgaW4gbm9kZSB0byB0aGUgY3VycmVudCBmcmFnbWVudC5cbiAgbm9kZSAmJiB0aGlzLmFwcGVuZENoaWxkKG5vZGUpO1xufTtcblxuLyoqXG4gKiBBcHBlbmQgYSBub2RlIHRvIHRoZSBjdXJyZW50IHRyYWNraW5nIGZyYWdtZW50LlxuICpcbiAqIEBwYXJhbSAge05vZGV9IG5vZGVcbiAqIEByZXR1cm4ge3RoaXN9XG4gKi9cblRyYWNrTm9kZS5wcm90b3R5cGUuYXBwZW5kQ2hpbGQgPSBmdW5jdGlvbiAobm9kZSkge1xuICB0aGlzLmFmdGVyLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKG5vZGUsIHRoaXMuYWZ0ZXIpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBQcmVwZW5kIGEgbm9kZSB0byB0aGUgY3VycmVudCB0cmFja2luZyBmcmFnbWVudC5cbiAqXG4gKiBAcGFyYW0gIHtOb2RlfSBub2RlXG4gKiBAcmV0dXJuIHt0aGlzfVxuICovXG5UcmFja05vZGUucHJvdG90eXBlLnByZXBlbmRDaGlsZCA9IGZ1bmN0aW9uIChub2RlKSB7XG4gIHRoaXMuYmVmb3JlLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKG5vZGUsIHRoaXMuYmVmb3JlLm5leHRTaWJsaW5nKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmVtb3ZlIGFsbCBlbGVtZW50cyBiZXR3ZWVuIHRoZSB0d28gdHJhY2tpbmcgbm9kZXMuXG4gKlxuICogQHBhcmFtICB7Tm9kZX0gbm9kZVxuICogQHJldHVybiB7dGhpc31cbiAqL1xuVHJhY2tOb2RlLnByb3RvdHlwZS5lbXB0eSA9IGZ1bmN0aW9uICgpIHtcbiAgd2hpbGUgKHRoaXMuYmVmb3JlLm5leHRTaWJsaW5nICE9PSB0aGlzLmFmdGVyKSB7XG4gICAgdGhpcy5iZWZvcmUucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLmJlZm9yZS5uZXh0U2libGluZyk7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmVtb3ZlIHRoZSB0aGUgZWxlbWVudHMgZnJvbSB0aGUgRE9NLlxuICpcbiAqIEBwYXJhbSAge05vZGV9IG5vZGVcbiAqIEByZXR1cm4ge3RoaXN9XG4gKi9cblRyYWNrTm9kZS5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gKCkge1xuICB3aGlsZSAodGhpcy5iZWZvcmUubmV4dFNpYmxpbmcgIT09IHRoaXMuYWZ0ZXIpIHtcbiAgICB0aGlzLmZyYWdtZW50LmFwcGVuZENoaWxkKHRoaXMuYmVmb3JlLm5leHRTaWJsaW5nKTtcbiAgfVxuXG4gIC8vIFB1bGwgdGhlIHR3byByZWZlcmVuY2Ugbm9kZXMgb3V0IG9mIHRoZSBET00gYW5kIGludG8gdGhlIGZyYWdtZW50LlxuICB0aGlzLmZyYWdtZW50LmFwcGVuZENoaWxkKHRoaXMuYWZ0ZXIpO1xuICB0aGlzLmZyYWdtZW50Lmluc2VydEJlZm9yZSh0aGlzLmJlZm9yZSwgdGhpcy5mcmFnbWVudC5maXJzdENoaWxkKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmVwbGFjZSB0aGUgY29udGVudHMgb2YgdGhlIHRyYWNraW5nIG5vZGUgd2l0aCBuZXcgY29udGVudHMuXG4gKlxuICogQHBhcmFtICB7Tm9kZX0gbm9kZVxuICogQHJldHVybiB7dGhpc31cbiAqL1xuVHJhY2tOb2RlLnByb3RvdHlwZS5yZXBsYWNlID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgcmV0dXJuIHRoaXMuZW1wdHkoKS5hcHBlbmRDaGlsZChub2RlKTtcbn07XG4iLCJ2YXIgaGJzVXRpbHMgICA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy91dGlscycpO1xudmFyIHVuaXF1ZUlkICAgPSAwO1xudmFyIFRyYWNrTm9kZSAgPSByZXF1aXJlKCcuL3RyYWNrLW5vZGUnKTtcbnZhciBTYWZlU3RyaW5nID0gcmVxdWlyZSgnLi9zYWZlLXN0cmluZycpO1xudmFyIF9fc2xpY2UgICAgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG5cbi8qKlxuICogU2ltcGxlIHdheSB0byBzdWJjbGFzcyBhbiBvYmplY3QsIHdpdGggc3VwcG9ydCBmb3Igb2xkZXIgYnJvd3NlcnMuXG4gKlxuICogQHJldHVybiB7T2JqZWN0fVxuICovXG52YXIgY3JlYXRlID0gT2JqZWN0LmNyZWF0ZSB8fCAoZnVuY3Rpb24gKCkge1xuICB2YXIgRiA9IGZ1bmN0aW9uICgpIHt9O1xuXG4gIHJldHVybiBmdW5jdGlvbiAobykge1xuICAgIEYucHJvdG90eXBlID0gbztcbiAgICB2YXIgb2JqID0gbmV3IEYoKTtcbiAgICBGLnByb3RvdHlwZSA9IG51bGw7XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcbn0pKCk7XG5cbi8qKlxuICogRXh0ZW5kIEhhbmRsZWJhcnMgdXRpbGl0aWVzIHdpdGggRE9NIGZ1bmN0aW9uYWxpdHkuXG4gKlxuICogQHR5cGUge09iamVjdH1cbiAqL1xudmFyIFV0aWxzID0gbW9kdWxlLmV4cG9ydHMgPSBjcmVhdGUoaGJzVXRpbHMpO1xuXG4vKipcbiAqIFJldHVybiBhIHVuaXF1ZSBpZC5cbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9XG4gKi9cblV0aWxzLnVuaXF1ZUlkID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdW5pcXVlSWQrKztcbn07XG5cbi8qKlxuICogQ3JlYXRlIGEgZnVuY3Rpb24gdGhhdCBhY2NlcHRzIGFuIHVubGltaXRlZCBudW1iZXIgb2YgYXJndW1lbnRzIGFzIHRoZSBsYXN0XG4gKiBhcmd1bWVudC5cbiAqXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICovXG5VdGlscy52YXJpYWRpYyA9IGZ1bmN0aW9uIChmbikge1xuICB2YXIgY291bnQgPSBNYXRoLm1heChmbi5sZW5ndGggLSAxLCAwKTtcblxuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHZhciBhcmdzID0gX19zbGljZS5jYWxsKGFyZ3VtZW50cywgMCwgY291bnQpO1xuXG4gICAgLy8gRW5mb3JjZSB0aGUgYXJyYXkgbGVuZ3RoLCBpbiBjYXNlIHdlIGRpZG4ndCBoYXZlIGVub3VnaCBhcmd1bWVudHMuXG4gICAgYXJncy5sZW5ndGggPSBjb3VudDtcbiAgICBhcmdzLnB1c2goX19zbGljZS5jYWxsKGFyZ3VtZW50cywgY291bnQpKTtcblxuICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfTtcbn07XG5cbi8qKlxuICogU2ltcGxlIHBhcnRpYWwgYXBwbGljYXRpb24gZnVuY3Rpb24uXG4gKlxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqL1xuVXRpbHMucGFydGlhbCA9IFV0aWxzLnZhcmlhZGljKGZ1bmN0aW9uIChmbiwgYXJncykge1xuICByZXR1cm4gVXRpbHMudmFyaWFkaWMoZnVuY3Rpb24gKGNhbGxlZCkge1xuICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmdzLmNvbmNhdChjYWxsZWQpKTtcbiAgfSk7XG59KTtcblxuLyoqXG4gKiBFeHBvc2UgdGhlIGNyZWF0ZSBmdW5jdGlvbi5cbiAqXG4gKiBAdHlwZSB7RnVuY3Rpb259XG4gKi9cblV0aWxzLmNyZWF0ZSA9IGNyZWF0ZTtcblxuLyoqXG4gKiBDaGVjayB3aGV0aGVyIGFuIG9iamVjdCBpcyBhY3R1YWxseSBhIERPTSBub2RlLlxuICpcbiAqIEBwYXJhbSAgeyp9ICAgICAgIGVsZW1lbnRcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKi9cblV0aWxzLmlzTm9kZSA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gIHJldHVybiBlbGVtZW50IGluc3RhbmNlb2YgTm9kZTtcbn07XG5cbi8qKlxuICogVHJhY2sgYSBub2RlIGluc3RhbmNlIGFueXdoZXJlIGl0IGdvZXMgaW4gdGhlIERPTS5cbiAqXG4gKiBAcGFyYW0gIHtOb2RlfSAgICAgIG5vZGVcbiAqIEByZXR1cm4ge1RyYWNrTm9kZX1cbiAqL1xuVXRpbHMudHJhY2tOb2RlID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgcmV0dXJuIG5ldyBUcmFja05vZGUobm9kZSk7XG59O1xuXG4vKipcbiAqIFRyYW5zZm9ybSBhIHN0cmluZyBpbnRvIGFyYml0cmFyeSBET00gbm9kZXMuXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBzdHJpbmdcbiAqIEByZXR1cm4ge05vZGV9XG4gKi9cblV0aWxzLmRvbWlmeUV4cHJlc3Npb24gPSBmdW5jdGlvbiAoc3RyaW5nKSB7XG4gIC8vIElmIHdlIHBhc3NlZCBpbiBhIHNhZmUgc3RyaW5nLCBnZXQgdGhlIGFjdHVhbCB2YWx1ZS5cbiAgaWYgKHN0cmluZyBpbnN0YW5jZW9mIFNhZmVTdHJpbmcpIHtcbiAgICBzdHJpbmcgPSBzdHJpbmcuc3RyaW5nO1xuICB9XG5cbiAgLy8gTm8gbmVlZCB0byBjb2VyY2UgYSBub2RlLlxuICBpZiAoVXRpbHMuaXNOb2RlKHN0cmluZykpIHtcbiAgICByZXR1cm4gc3RyaW5nO1xuICB9XG5cbiAgdmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBkaXYuaW5uZXJIVE1MID0gc3RyaW5nO1xuXG4gIGlmIChkaXYuY2hpbGROb2Rlcy5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gZGl2LnJlbW92ZUNoaWxkKGRpdi5jaGlsZE5vZGVzWzBdKTtcbiAgfVxuXG4gIHZhciBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcblxuICB3aGlsZSAoZGl2LmZpcnN0Q2hpbGQpIHtcbiAgICBmcmFnbWVudC5hcHBlbmRDaGlsZChkaXYuZmlyc3RDaGlsZCk7XG4gIH1cblxuICByZXR1cm4gZnJhZ21lbnQ7XG59O1xuXG4vKipcbiAqIFRyYW5zZm9ybSBhIHN0cmluZyBpbnRvIGEgRE9NIHRleHQgbm9kZSBmb3IgYXBwZW5kaW5nIHRvIHRoZSB0ZW1wbGF0ZS5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHN0cmluZ1xuICogQHJldHVybiB7VGV4dH1cbiAqL1xuVXRpbHMudGV4dGlmeUV4cHJlc3Npb24gPSBmdW5jdGlvbiAoc3RyaW5nKSB7XG4gIGlmIChzdHJpbmcgaW5zdGFuY2VvZiBTYWZlU3RyaW5nKSB7XG4gICAgcmV0dXJuIFV0aWxzLmRvbWlmeUV4cHJlc3Npb24oc3RyaW5nLnN0cmluZyk7XG4gIH1cblxuICAvLyBDYXRjaCB3aGVuIHRoZSBzdHJpbmcgaXMgYWN0dWFsbHkgYSBET00gbm9kZSBhbmQgdHVybiBpdCBpbnRvIGEgc3RyaW5nLlxuICBpZiAoVXRpbHMuaXNOb2RlKHN0cmluZykpIHtcbiAgICAvLyBBbHJlYWR5IGEgdGV4dCBub2RlLCBqdXN0IHJldHVybiBpdCBpbW1lZGlhdGVseS5cbiAgICBpZiAoc3RyaW5nLm5vZGVUeXBlID09PSAzKSB7XG4gICAgICByZXR1cm4gc3RyaW5nO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2Ygc3RyaW5nLm91dGVySFRNTCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzdHJpbmcub3V0ZXJIVE1MKTtcbiAgICB9XG5cbiAgICB2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgZGl2LmFwcGVuZENoaWxkKHN0cmluZy5jbG9uZU5vZGUodHJ1ZSkpO1xuICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShkaXYuaW5uZXJIVE1MKTtcbiAgfVxuXG4gIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzdHJpbmcgPT0gbnVsbCA/ICcnIDogc3RyaW5nKTtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcbnZhciBVdGlscyA9IHJlcXVpcmUoXCIuL3V0aWxzXCIpO1xudmFyIEV4Y2VwdGlvbiA9IHJlcXVpcmUoXCIuL2V4Y2VwdGlvblwiKVtcImRlZmF1bHRcIl07XG5cbnZhciBWRVJTSU9OID0gXCIxLjIuMFwiO1xuZXhwb3J0cy5WRVJTSU9OID0gVkVSU0lPTjt2YXIgQ09NUElMRVJfUkVWSVNJT04gPSA0O1xuZXhwb3J0cy5DT01QSUxFUl9SRVZJU0lPTiA9IENPTVBJTEVSX1JFVklTSU9OO1xudmFyIFJFVklTSU9OX0NIQU5HRVMgPSB7XG4gIDE6ICc8PSAxLjAucmMuMicsIC8vIDEuMC5yYy4yIGlzIGFjdHVhbGx5IHJldjIgYnV0IGRvZXNuJ3QgcmVwb3J0IGl0XG4gIDI6ICc9PSAxLjAuMC1yYy4zJyxcbiAgMzogJz09IDEuMC4wLXJjLjQnLFxuICA0OiAnPj0gMS4wLjAnXG59O1xuZXhwb3J0cy5SRVZJU0lPTl9DSEFOR0VTID0gUkVWSVNJT05fQ0hBTkdFUztcbnZhciBpc0FycmF5ID0gVXRpbHMuaXNBcnJheSxcbiAgICBpc0Z1bmN0aW9uID0gVXRpbHMuaXNGdW5jdGlvbixcbiAgICB0b1N0cmluZyA9IFV0aWxzLnRvU3RyaW5nLFxuICAgIG9iamVjdFR5cGUgPSAnW29iamVjdCBPYmplY3RdJztcblxuZnVuY3Rpb24gSGFuZGxlYmFyc0Vudmlyb25tZW50KGhlbHBlcnMsIHBhcnRpYWxzKSB7XG4gIHRoaXMuaGVscGVycyA9IGhlbHBlcnMgfHwge307XG4gIHRoaXMucGFydGlhbHMgPSBwYXJ0aWFscyB8fCB7fTtcblxuICByZWdpc3RlckRlZmF1bHRIZWxwZXJzKHRoaXMpO1xufVxuXG5leHBvcnRzLkhhbmRsZWJhcnNFbnZpcm9ubWVudCA9IEhhbmRsZWJhcnNFbnZpcm9ubWVudDtIYW5kbGViYXJzRW52aXJvbm1lbnQucHJvdG90eXBlID0ge1xuICBjb25zdHJ1Y3RvcjogSGFuZGxlYmFyc0Vudmlyb25tZW50LFxuXG4gIGxvZ2dlcjogbG9nZ2VyLFxuICBsb2c6IGxvZyxcblxuICByZWdpc3RlckhlbHBlcjogZnVuY3Rpb24obmFtZSwgZm4sIGludmVyc2UpIHtcbiAgICBpZiAodG9TdHJpbmcuY2FsbChuYW1lKSA9PT0gb2JqZWN0VHlwZSkge1xuICAgICAgaWYgKGludmVyc2UgfHwgZm4pIHsgdGhyb3cgbmV3IEV4Y2VwdGlvbignQXJnIG5vdCBzdXBwb3J0ZWQgd2l0aCBtdWx0aXBsZSBoZWxwZXJzJyk7IH1cbiAgICAgIFV0aWxzLmV4dGVuZCh0aGlzLmhlbHBlcnMsIG5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoaW52ZXJzZSkgeyBmbi5ub3QgPSBpbnZlcnNlOyB9XG4gICAgICB0aGlzLmhlbHBlcnNbbmFtZV0gPSBmbjtcbiAgICB9XG4gIH0sXG5cbiAgcmVnaXN0ZXJQYXJ0aWFsOiBmdW5jdGlvbihuYW1lLCBzdHIpIHtcbiAgICBpZiAodG9TdHJpbmcuY2FsbChuYW1lKSA9PT0gb2JqZWN0VHlwZSkge1xuICAgICAgVXRpbHMuZXh0ZW5kKHRoaXMucGFydGlhbHMsICBuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5wYXJ0aWFsc1tuYW1lXSA9IHN0cjtcbiAgICB9XG4gIH1cbn07XG5cbmZ1bmN0aW9uIHJlZ2lzdGVyRGVmYXVsdEhlbHBlcnMoaW5zdGFuY2UpIHtcbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2hlbHBlck1pc3NpbmcnLCBmdW5jdGlvbihhcmcpIHtcbiAgICBpZihhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIGhlbHBlcjogJ1wiICsgYXJnICsgXCInXCIpO1xuICAgIH1cbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2Jsb2NrSGVscGVyTWlzc2luZycsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICB2YXIgaW52ZXJzZSA9IG9wdGlvbnMuaW52ZXJzZSB8fCBmdW5jdGlvbigpIHt9LCBmbiA9IG9wdGlvbnMuZm47XG5cbiAgICBpZiAoaXNGdW5jdGlvbihjb250ZXh0KSkgeyBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpOyB9XG5cbiAgICBpZihjb250ZXh0ID09PSB0cnVlKSB7XG4gICAgICByZXR1cm4gZm4odGhpcyk7XG4gICAgfSBlbHNlIGlmKGNvbnRleHQgPT09IGZhbHNlIHx8IGNvbnRleHQgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGludmVyc2UodGhpcyk7XG4gICAgfSBlbHNlIGlmIChpc0FycmF5KGNvbnRleHQpKSB7XG4gICAgICBpZihjb250ZXh0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgcmV0dXJuIGluc3RhbmNlLmhlbHBlcnMuZWFjaChjb250ZXh0LCBvcHRpb25zKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBpbnZlcnNlKHRoaXMpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZm4oY29udGV4dCk7XG4gICAgfVxuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignZWFjaCcsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICB2YXIgZm4gPSBvcHRpb25zLmZuLCBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlO1xuICAgIHZhciBpID0gMCwgcmV0ID0gXCJcIiwgZGF0YTtcblxuICAgIGlmIChpc0Z1bmN0aW9uKGNvbnRleHQpKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cblxuICAgIGlmIChvcHRpb25zLmRhdGEpIHtcbiAgICAgIGRhdGEgPSBjcmVhdGVGcmFtZShvcHRpb25zLmRhdGEpO1xuICAgIH1cblxuICAgIGlmKGNvbnRleHQgJiYgdHlwZW9mIGNvbnRleHQgPT09ICdvYmplY3QnKSB7XG4gICAgICBpZiAoaXNBcnJheShjb250ZXh0KSkge1xuICAgICAgICBmb3IodmFyIGogPSBjb250ZXh0Lmxlbmd0aDsgaTxqOyBpKyspIHtcbiAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgZGF0YS5pbmRleCA9IGk7XG4gICAgICAgICAgICBkYXRhLmZpcnN0ID0gKGkgPT09IDApO1xuICAgICAgICAgICAgZGF0YS5sYXN0ICA9IChpID09PSAoY29udGV4dC5sZW5ndGgtMSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXQgPSByZXQgKyBmbihjb250ZXh0W2ldLCB7IGRhdGE6IGRhdGEgfSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvcih2YXIga2V5IGluIGNvbnRleHQpIHtcbiAgICAgICAgICBpZihjb250ZXh0Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIGlmKGRhdGEpIHsgXG4gICAgICAgICAgICAgIGRhdGEua2V5ID0ga2V5OyBcbiAgICAgICAgICAgICAgZGF0YS5pbmRleCA9IGk7XG4gICAgICAgICAgICAgIGRhdGEuZmlyc3QgPSAoaSA9PT0gMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXQgPSByZXQgKyBmbihjb250ZXh0W2tleV0sIHtkYXRhOiBkYXRhfSk7XG4gICAgICAgICAgICBpKys7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYoaSA9PT0gMCl7XG4gICAgICByZXQgPSBpbnZlcnNlKHRoaXMpO1xuICAgIH1cblxuICAgIHJldHVybiByZXQ7XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdpZicsIGZ1bmN0aW9uKGNvbmRpdGlvbmFsLCBvcHRpb25zKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24oY29uZGl0aW9uYWwpKSB7IGNvbmRpdGlvbmFsID0gY29uZGl0aW9uYWwuY2FsbCh0aGlzKTsgfVxuXG4gICAgLy8gRGVmYXVsdCBiZWhhdmlvciBpcyB0byByZW5kZXIgdGhlIHBvc2l0aXZlIHBhdGggaWYgdGhlIHZhbHVlIGlzIHRydXRoeSBhbmQgbm90IGVtcHR5LlxuICAgIC8vIFRoZSBgaW5jbHVkZVplcm9gIG9wdGlvbiBtYXkgYmUgc2V0IHRvIHRyZWF0IHRoZSBjb25kdGlvbmFsIGFzIHB1cmVseSBub3QgZW1wdHkgYmFzZWQgb24gdGhlXG4gICAgLy8gYmVoYXZpb3Igb2YgaXNFbXB0eS4gRWZmZWN0aXZlbHkgdGhpcyBkZXRlcm1pbmVzIGlmIDAgaXMgaGFuZGxlZCBieSB0aGUgcG9zaXRpdmUgcGF0aCBvciBuZWdhdGl2ZS5cbiAgICBpZiAoKCFvcHRpb25zLmhhc2guaW5jbHVkZVplcm8gJiYgIWNvbmRpdGlvbmFsKSB8fCBVdGlscy5pc0VtcHR5KGNvbmRpdGlvbmFsKSkge1xuICAgICAgcmV0dXJuIG9wdGlvbnMuaW52ZXJzZSh0aGlzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG9wdGlvbnMuZm4odGhpcyk7XG4gICAgfVxuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcigndW5sZXNzJywgZnVuY3Rpb24oY29uZGl0aW9uYWwsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gaW5zdGFuY2UuaGVscGVyc1snaWYnXS5jYWxsKHRoaXMsIGNvbmRpdGlvbmFsLCB7Zm46IG9wdGlvbnMuaW52ZXJzZSwgaW52ZXJzZTogb3B0aW9ucy5mbiwgaGFzaDogb3B0aW9ucy5oYXNofSk7XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCd3aXRoJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmIChpc0Z1bmN0aW9uKGNvbnRleHQpKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cblxuICAgIGlmICghVXRpbHMuaXNFbXB0eShjb250ZXh0KSkgcmV0dXJuIG9wdGlvbnMuZm4oY29udGV4dCk7XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdsb2cnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgdmFyIGxldmVsID0gb3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuZGF0YS5sZXZlbCAhPSBudWxsID8gcGFyc2VJbnQob3B0aW9ucy5kYXRhLmxldmVsLCAxMCkgOiAxO1xuICAgIGluc3RhbmNlLmxvZyhsZXZlbCwgY29udGV4dCk7XG4gIH0pO1xufVxuXG52YXIgbG9nZ2VyID0ge1xuICBtZXRob2RNYXA6IHsgMDogJ2RlYnVnJywgMTogJ2luZm8nLCAyOiAnd2FybicsIDM6ICdlcnJvcicgfSxcblxuICAvLyBTdGF0ZSBlbnVtXG4gIERFQlVHOiAwLFxuICBJTkZPOiAxLFxuICBXQVJOOiAyLFxuICBFUlJPUjogMyxcbiAgbGV2ZWw6IDMsXG5cbiAgLy8gY2FuIGJlIG92ZXJyaWRkZW4gaW4gdGhlIGhvc3QgZW52aXJvbm1lbnRcbiAgbG9nOiBmdW5jdGlvbihsZXZlbCwgb2JqKSB7XG4gICAgaWYgKGxvZ2dlci5sZXZlbCA8PSBsZXZlbCkge1xuICAgICAgdmFyIG1ldGhvZCA9IGxvZ2dlci5tZXRob2RNYXBbbGV2ZWxdO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJyAmJiBjb25zb2xlW21ldGhvZF0pIHtcbiAgICAgICAgY29uc29sZVttZXRob2RdLmNhbGwoY29uc29sZSwgb2JqKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5leHBvcnRzLmxvZ2dlciA9IGxvZ2dlcjtcbmZ1bmN0aW9uIGxvZyhsZXZlbCwgb2JqKSB7IGxvZ2dlci5sb2cobGV2ZWwsIG9iaik7IH1cblxuZXhwb3J0cy5sb2cgPSBsb2c7dmFyIGNyZWF0ZUZyYW1lID0gZnVuY3Rpb24ob2JqZWN0KSB7XG4gIHZhciBvYmogPSB7fTtcbiAgVXRpbHMuZXh0ZW5kKG9iaiwgb2JqZWN0KTtcbiAgcmV0dXJuIG9iajtcbn07XG5leHBvcnRzLmNyZWF0ZUZyYW1lID0gY3JlYXRlRnJhbWU7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBlcnJvclByb3BzID0gWydkZXNjcmlwdGlvbicsICdmaWxlTmFtZScsICdsaW5lTnVtYmVyJywgJ21lc3NhZ2UnLCAnbmFtZScsICdudW1iZXInLCAnc3RhY2snXTtcblxuZnVuY3Rpb24gRXhjZXB0aW9uKC8qIG1lc3NhZ2UgKi8pIHtcbiAgdmFyIHRtcCA9IEVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3Rvci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gIC8vIFVuZm9ydHVuYXRlbHkgZXJyb3JzIGFyZSBub3QgZW51bWVyYWJsZSBpbiBDaHJvbWUgKGF0IGxlYXN0KSwgc28gYGZvciBwcm9wIGluIHRtcGAgZG9lc24ndCB3b3JrLlxuICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCBlcnJvclByb3BzLmxlbmd0aDsgaWR4KyspIHtcbiAgICB0aGlzW2Vycm9yUHJvcHNbaWR4XV0gPSB0bXBbZXJyb3JQcm9wc1tpZHhdXTtcbiAgfVxufVxuXG5FeGNlcHRpb24ucHJvdG90eXBlID0gbmV3IEVycm9yKCk7XG5cbmV4cG9ydHNbXCJkZWZhdWx0XCJdID0gRXhjZXB0aW9uOyIsIlwidXNlIHN0cmljdFwiO1xudmFyIFV0aWxzID0gcmVxdWlyZShcIi4vdXRpbHNcIik7XG52YXIgRXhjZXB0aW9uID0gcmVxdWlyZShcIi4vZXhjZXB0aW9uXCIpW1wiZGVmYXVsdFwiXTtcbnZhciBDT01QSUxFUl9SRVZJU0lPTiA9IHJlcXVpcmUoXCIuL2Jhc2VcIikuQ09NUElMRVJfUkVWSVNJT047XG52YXIgUkVWSVNJT05fQ0hBTkdFUyA9IHJlcXVpcmUoXCIuL2Jhc2VcIikuUkVWSVNJT05fQ0hBTkdFUztcblxuZnVuY3Rpb24gY2hlY2tSZXZpc2lvbihjb21waWxlckluZm8pIHtcbiAgdmFyIGNvbXBpbGVyUmV2aXNpb24gPSBjb21waWxlckluZm8gJiYgY29tcGlsZXJJbmZvWzBdIHx8IDEsXG4gICAgICBjdXJyZW50UmV2aXNpb24gPSBDT01QSUxFUl9SRVZJU0lPTjtcblxuICBpZiAoY29tcGlsZXJSZXZpc2lvbiAhPT0gY3VycmVudFJldmlzaW9uKSB7XG4gICAgaWYgKGNvbXBpbGVyUmV2aXNpb24gPCBjdXJyZW50UmV2aXNpb24pIHtcbiAgICAgIHZhciBydW50aW1lVmVyc2lvbnMgPSBSRVZJU0lPTl9DSEFOR0VTW2N1cnJlbnRSZXZpc2lvbl0sXG4gICAgICAgICAgY29tcGlsZXJWZXJzaW9ucyA9IFJFVklTSU9OX0NIQU5HRVNbY29tcGlsZXJSZXZpc2lvbl07XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhbiBvbGRlciB2ZXJzaW9uIG9mIEhhbmRsZWJhcnMgdGhhbiB0aGUgY3VycmVudCBydW50aW1lLiBcIitcbiAgICAgICAgICAgIFwiUGxlYXNlIHVwZGF0ZSB5b3VyIHByZWNvbXBpbGVyIHRvIGEgbmV3ZXIgdmVyc2lvbiAoXCIrcnVudGltZVZlcnNpb25zK1wiKSBvciBkb3duZ3JhZGUgeW91ciBydW50aW1lIHRvIGFuIG9sZGVyIHZlcnNpb24gKFwiK2NvbXBpbGVyVmVyc2lvbnMrXCIpLlwiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVXNlIHRoZSBlbWJlZGRlZCB2ZXJzaW9uIGluZm8gc2luY2UgdGhlIHJ1bnRpbWUgZG9lc24ndCBrbm93IGFib3V0IHRoaXMgcmV2aXNpb24geWV0XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhIG5ld2VyIHZlcnNpb24gb2YgSGFuZGxlYmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuIFwiK1xuICAgICAgICAgICAgXCJQbGVhc2UgdXBkYXRlIHlvdXIgcnVudGltZSB0byBhIG5ld2VyIHZlcnNpb24gKFwiK2NvbXBpbGVySW5mb1sxXStcIikuXCIpO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnRzLmNoZWNrUmV2aXNpb24gPSBjaGVja1JldmlzaW9uOy8vIFRPRE86IFJlbW92ZSB0aGlzIGxpbmUgYW5kIGJyZWFrIHVwIGNvbXBpbGVQYXJ0aWFsXG5cbmZ1bmN0aW9uIHRlbXBsYXRlKHRlbXBsYXRlU3BlYywgZW52KSB7XG4gIGlmICghZW52KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm8gZW52aXJvbm1lbnQgcGFzc2VkIHRvIHRlbXBsYXRlXCIpO1xuICB9XG5cbiAgLy8gTm90ZTogVXNpbmcgZW52LlZNIHJlZmVyZW5jZXMgcmF0aGVyIHRoYW4gbG9jYWwgdmFyIHJlZmVyZW5jZXMgdGhyb3VnaG91dCB0aGlzIHNlY3Rpb24gdG8gYWxsb3dcbiAgLy8gZm9yIGV4dGVybmFsIHVzZXJzIHRvIG92ZXJyaWRlIHRoZXNlIGFzIHBzdWVkby1zdXBwb3J0ZWQgQVBJcy5cbiAgdmFyIGludm9rZVBhcnRpYWxXcmFwcGVyID0gZnVuY3Rpb24ocGFydGlhbCwgbmFtZSwgY29udGV4dCwgaGVscGVycywgcGFydGlhbHMsIGRhdGEpIHtcbiAgICB2YXIgcmVzdWx0ID0gZW52LlZNLmludm9rZVBhcnRpYWwuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBpZiAocmVzdWx0ICE9IG51bGwpIHsgcmV0dXJuIHJlc3VsdDsgfVxuXG4gICAgaWYgKGVudi5jb21waWxlKSB7XG4gICAgICB2YXIgb3B0aW9ucyA9IHsgaGVscGVyczogaGVscGVycywgcGFydGlhbHM6IHBhcnRpYWxzLCBkYXRhOiBkYXRhIH07XG4gICAgICBwYXJ0aWFsc1tuYW1lXSA9IGVudi5jb21waWxlKHBhcnRpYWwsIHsgZGF0YTogZGF0YSAhPT0gdW5kZWZpbmVkIH0sIGVudik7XG4gICAgICByZXR1cm4gcGFydGlhbHNbbmFtZV0oY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oXCJUaGUgcGFydGlhbCBcIiArIG5hbWUgKyBcIiBjb3VsZCBub3QgYmUgY29tcGlsZWQgd2hlbiBydW5uaW5nIGluIHJ1bnRpbWUtb25seSBtb2RlXCIpO1xuICAgIH1cbiAgfTtcblxuICAvLyBKdXN0IGFkZCB3YXRlclxuICB2YXIgY29udGFpbmVyID0ge1xuICAgIGVzY2FwZUV4cHJlc3Npb246IFV0aWxzLmVzY2FwZUV4cHJlc3Npb24sXG4gICAgaW52b2tlUGFydGlhbDogaW52b2tlUGFydGlhbFdyYXBwZXIsXG4gICAgcHJvZ3JhbXM6IFtdLFxuICAgIHByb2dyYW06IGZ1bmN0aW9uKGksIGZuLCBkYXRhKSB7XG4gICAgICB2YXIgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldO1xuICAgICAgaWYoZGF0YSkge1xuICAgICAgICBwcm9ncmFtV3JhcHBlciA9IHByb2dyYW0oaSwgZm4sIGRhdGEpO1xuICAgICAgfSBlbHNlIGlmICghcHJvZ3JhbVdyYXBwZXIpIHtcbiAgICAgICAgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldID0gcHJvZ3JhbShpLCBmbik7XG4gICAgICB9XG4gICAgICByZXR1cm4gcHJvZ3JhbVdyYXBwZXI7XG4gICAgfSxcbiAgICBtZXJnZTogZnVuY3Rpb24ocGFyYW0sIGNvbW1vbikge1xuICAgICAgdmFyIHJldCA9IHBhcmFtIHx8IGNvbW1vbjtcblxuICAgICAgaWYgKHBhcmFtICYmIGNvbW1vbiAmJiAocGFyYW0gIT09IGNvbW1vbikpIHtcbiAgICAgICAgcmV0ID0ge307XG4gICAgICAgIFV0aWxzLmV4dGVuZChyZXQsIGNvbW1vbik7XG4gICAgICAgIFV0aWxzLmV4dGVuZChyZXQsIHBhcmFtKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXQ7XG4gICAgfSxcbiAgICBwcm9ncmFtV2l0aERlcHRoOiBlbnYuVk0ucHJvZ3JhbVdpdGhEZXB0aCxcbiAgICBub29wOiBlbnYuVk0ubm9vcCxcbiAgICBjb21waWxlckluZm86IG51bGxcbiAgfTtcblxuICByZXR1cm4gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHZhciBuYW1lc3BhY2UgPSBvcHRpb25zLnBhcnRpYWwgPyBvcHRpb25zIDogZW52LFxuICAgICAgICBoZWxwZXJzLFxuICAgICAgICBwYXJ0aWFscztcblxuICAgIGlmICghb3B0aW9ucy5wYXJ0aWFsKSB7XG4gICAgICBoZWxwZXJzID0gb3B0aW9ucy5oZWxwZXJzO1xuICAgICAgcGFydGlhbHMgPSBvcHRpb25zLnBhcnRpYWxzO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0ID0gdGVtcGxhdGVTcGVjLmNhbGwoXG4gICAgICAgICAgY29udGFpbmVyLFxuICAgICAgICAgIG5hbWVzcGFjZSwgY29udGV4dCxcbiAgICAgICAgICBoZWxwZXJzLFxuICAgICAgICAgIHBhcnRpYWxzLFxuICAgICAgICAgIG9wdGlvbnMuZGF0YSk7XG5cbiAgICBpZiAoIW9wdGlvbnMucGFydGlhbCkge1xuICAgICAgZW52LlZNLmNoZWNrUmV2aXNpb24oY29udGFpbmVyLmNvbXBpbGVySW5mbyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcbn1cblxuZXhwb3J0cy50ZW1wbGF0ZSA9IHRlbXBsYXRlO2Z1bmN0aW9uIHByb2dyYW1XaXRoRGVwdGgoaSwgZm4sIGRhdGEgLyosICRkZXB0aCAqLykge1xuICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMyk7XG5cbiAgdmFyIHByb2cgPSBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgW2NvbnRleHQsIG9wdGlvbnMuZGF0YSB8fCBkYXRhXS5jb25jYXQoYXJncykpO1xuICB9O1xuICBwcm9nLnByb2dyYW0gPSBpO1xuICBwcm9nLmRlcHRoID0gYXJncy5sZW5ndGg7XG4gIHJldHVybiBwcm9nO1xufVxuXG5leHBvcnRzLnByb2dyYW1XaXRoRGVwdGggPSBwcm9ncmFtV2l0aERlcHRoO2Z1bmN0aW9uIHByb2dyYW0oaSwgZm4sIGRhdGEpIHtcbiAgdmFyIHByb2cgPSBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICByZXR1cm4gZm4oY29udGV4dCwgb3B0aW9ucy5kYXRhIHx8IGRhdGEpO1xuICB9O1xuICBwcm9nLnByb2dyYW0gPSBpO1xuICBwcm9nLmRlcHRoID0gMDtcbiAgcmV0dXJuIHByb2c7XG59XG5cbmV4cG9ydHMucHJvZ3JhbSA9IHByb2dyYW07ZnVuY3Rpb24gaW52b2tlUGFydGlhbChwYXJ0aWFsLCBuYW1lLCBjb250ZXh0LCBoZWxwZXJzLCBwYXJ0aWFscywgZGF0YSkge1xuICB2YXIgb3B0aW9ucyA9IHsgcGFydGlhbDogdHJ1ZSwgaGVscGVyczogaGVscGVycywgcGFydGlhbHM6IHBhcnRpYWxzLCBkYXRhOiBkYXRhIH07XG5cbiAgaWYocGFydGlhbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIlRoZSBwYXJ0aWFsIFwiICsgbmFtZSArIFwiIGNvdWxkIG5vdCBiZSBmb3VuZFwiKTtcbiAgfSBlbHNlIGlmKHBhcnRpYWwgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgIHJldHVybiBwYXJ0aWFsKGNvbnRleHQsIG9wdGlvbnMpO1xuICB9XG59XG5cbmV4cG9ydHMuaW52b2tlUGFydGlhbCA9IGludm9rZVBhcnRpYWw7ZnVuY3Rpb24gbm9vcCgpIHsgcmV0dXJuIFwiXCI7IH1cblxuZXhwb3J0cy5ub29wID0gbm9vcDsiLCJcInVzZSBzdHJpY3RcIjtcbi8vIEJ1aWxkIG91dCBvdXIgYmFzaWMgU2FmZVN0cmluZyB0eXBlXG5mdW5jdGlvbiBTYWZlU3RyaW5nKHN0cmluZykge1xuICB0aGlzLnN0cmluZyA9IHN0cmluZztcbn1cblxuU2FmZVN0cmluZy5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIFwiXCIgKyB0aGlzLnN0cmluZztcbn07XG5cbmV4cG9ydHNbXCJkZWZhdWx0XCJdID0gU2FmZVN0cmluZzsiLCJcInVzZSBzdHJpY3RcIjtcbi8qanNoaW50IC1XMDA0ICovXG52YXIgU2FmZVN0cmluZyA9IHJlcXVpcmUoXCIuL3NhZmUtc3RyaW5nXCIpW1wiZGVmYXVsdFwiXTtcblxudmFyIGVzY2FwZSA9IHtcbiAgXCImXCI6IFwiJmFtcDtcIixcbiAgXCI8XCI6IFwiJmx0O1wiLFxuICBcIj5cIjogXCImZ3Q7XCIsXG4gICdcIic6IFwiJnF1b3Q7XCIsXG4gIFwiJ1wiOiBcIiYjeDI3O1wiLFxuICBcImBcIjogXCImI3g2MDtcIlxufTtcblxudmFyIGJhZENoYXJzID0gL1smPD5cIidgXS9nO1xudmFyIHBvc3NpYmxlID0gL1smPD5cIidgXS87XG5cbmZ1bmN0aW9uIGVzY2FwZUNoYXIoY2hyKSB7XG4gIHJldHVybiBlc2NhcGVbY2hyXSB8fCBcIiZhbXA7XCI7XG59XG5cbmZ1bmN0aW9uIGV4dGVuZChvYmosIHZhbHVlKSB7XG4gIGZvcih2YXIga2V5IGluIHZhbHVlKSB7XG4gICAgaWYoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHZhbHVlLCBrZXkpKSB7XG4gICAgICBvYmpba2V5XSA9IHZhbHVlW2tleV07XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydHMuZXh0ZW5kID0gZXh0ZW5kO3ZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5leHBvcnRzLnRvU3RyaW5nID0gdG9TdHJpbmc7XG4vLyBTb3VyY2VkIGZyb20gbG9kYXNoXG4vLyBodHRwczovL2dpdGh1Yi5jb20vYmVzdGllanMvbG9kYXNoL2Jsb2IvbWFzdGVyL0xJQ0VOU0UudHh0XG52YXIgaXNGdW5jdGlvbiA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbic7XG59O1xuLy8gZmFsbGJhY2sgZm9yIG9sZGVyIHZlcnNpb25zIG9mIENocm9tZSBhbmQgU2FmYXJpXG5pZiAoaXNGdW5jdGlvbigveC8pKSB7XG4gIGlzRnVuY3Rpb24gPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbicgJiYgdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG4gIH07XG59XG52YXIgaXNGdW5jdGlvbjtcbmV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSA/IHRvU3RyaW5nLmNhbGwodmFsdWUpID09PSAnW29iamVjdCBBcnJheV0nIDogZmFsc2U7XG59O1xuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheTtcblxuZnVuY3Rpb24gZXNjYXBlRXhwcmVzc2lvbihzdHJpbmcpIHtcbiAgLy8gZG9uJ3QgZXNjYXBlIFNhZmVTdHJpbmdzLCBzaW5jZSB0aGV5J3JlIGFscmVhZHkgc2FmZVxuICBpZiAoc3RyaW5nIGluc3RhbmNlb2YgU2FmZVN0cmluZykge1xuICAgIHJldHVybiBzdHJpbmcudG9TdHJpbmcoKTtcbiAgfSBlbHNlIGlmICghc3RyaW5nICYmIHN0cmluZyAhPT0gMCkge1xuICAgIHJldHVybiBcIlwiO1xuICB9XG5cbiAgLy8gRm9yY2UgYSBzdHJpbmcgY29udmVyc2lvbiBhcyB0aGlzIHdpbGwgYmUgZG9uZSBieSB0aGUgYXBwZW5kIHJlZ2FyZGxlc3MgYW5kXG4gIC8vIHRoZSByZWdleCB0ZXN0IHdpbGwgZG8gdGhpcyB0cmFuc3BhcmVudGx5IGJlaGluZCB0aGUgc2NlbmVzLCBjYXVzaW5nIGlzc3VlcyBpZlxuICAvLyBhbiBvYmplY3QncyB0byBzdHJpbmcgaGFzIGVzY2FwZWQgY2hhcmFjdGVycyBpbiBpdC5cbiAgc3RyaW5nID0gXCJcIiArIHN0cmluZztcblxuICBpZighcG9zc2libGUudGVzdChzdHJpbmcpKSB7IHJldHVybiBzdHJpbmc7IH1cbiAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKGJhZENoYXJzLCBlc2NhcGVDaGFyKTtcbn1cblxuZXhwb3J0cy5lc2NhcGVFeHByZXNzaW9uID0gZXNjYXBlRXhwcmVzc2lvbjtmdW5jdGlvbiBpc0VtcHR5KHZhbHVlKSB7XG4gIGlmICghdmFsdWUgJiYgdmFsdWUgIT09IDApIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIGlmIChpc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZXhwb3J0cy5pc0VtcHR5ID0gaXNFbXB0eTsiLCJ2YXIgYmFzZSAgICAgICA9IHJlcXVpcmUoJy4vbGliL2Jhc2UnKTtcbnZhciBTYWZlU3RyaW5nID0gcmVxdWlyZSgnLi9saWIvc2FmZS1zdHJpbmcnKTtcbnZhciBFeGNlcHRpb24gID0gcmVxdWlyZSgnLi9saWIvZXhjZXB0aW9uJyk7XG52YXIgVXRpbHMgICAgICA9IHJlcXVpcmUoJy4vbGliL3V0aWxzJyk7XG52YXIgRXZlbnRzICAgICA9IHJlcXVpcmUoJy4vbGliL2V2ZW50cycpO1xudmFyIHJ1bnRpbWUgICAgPSByZXF1aXJlKCcuL2xpYi9ydW50aW1lJyk7XG5cbi8vIEV4dGVuZCB0aGUgRE9NQmFycyBwcm90b3R5cGUgd2l0aCBldmVudCBlbWl0dGVyIGZ1bmN0aW9uYWxpdHkuXG5VdGlscy5leHRlbmQoYmFzZS5ET01CYXJzRW52aXJvbm1lbnQucHJvdG90eXBlLCBFdmVudHMpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbiBjcmVhdGUgKCkge1xuICB2YXIgZGIgPSBuZXcgYmFzZS5ET01CYXJzRW52aXJvbm1lbnQoKTtcblxuICBVdGlscy5leHRlbmQoZGIsIGJhc2UpO1xuICBkYi5WTSAgICAgICAgID0gcnVudGltZTtcbiAgZGIuVXRpbHMgICAgICA9IFV0aWxzO1xuICBkYi5jcmVhdGUgICAgID0gY3JlYXRlO1xuICBkYi5FeGNlcHRpb24gID0gRXhjZXB0aW9uO1xuICBkYi5TYWZlU3RyaW5nID0gU2FmZVN0cmluZztcblxuICBkYi50ZW1wbGF0ZSA9IGZ1bmN0aW9uIChzcGVjKSB7XG4gICAgcmV0dXJuIHJ1bnRpbWUudGVtcGxhdGUoc3BlYywgZGIpO1xuICB9O1xuXG4gIHJldHVybiBkYjtcbn0pKCk7XG4iXX0=
(14)
});
