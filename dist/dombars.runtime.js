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

},{"./utils":7,"handlebars/dist/cjs/handlebars/base":8}],2:[function(require,module,exports){
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
  return this;
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

  return this.on(name, function self () {
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
  if (!this._events || !this._events[name]) {
    return this;
  }

  if (arguments.length < 2) {
    if (!name) {
      delete this._events;
    } else {
      delete this._events[name];
    }

    return this;
  }

  var events = this._events[name];
  for (var i = 0; i < events.length; i++) {
    if (events[i].fn === fn) {
      if (arguments.length === 2 || events[i].context === context) {
        events.splice(i, 1);
        i--;
      }
    }
  }

  if (!events.length) {
    delete this._events[name];
  }

  return this;
};

/**
 * Emit an event.
 *
 * @param  {String} name
 * @param  {*}      ...
 * @return {Events}
 */
Events.emit = function (name /*, ...args */) {
  var args   = Array.prototype.slice.call(arguments, 1);
  var events = this._events && this._events[name] && this._events[name].slice();

  if (events) {
    for (var i = 0; i < events.length; i++) {
      events[i].fn.apply(events[i].context, args);
    }
  }

  return this;
};

},{}],3:[function(require,module,exports){
module.exports = require('handlebars/dist/cjs/handlebars/exception').default;

},{"handlebars/dist/cjs/handlebars/exception":9}],4:[function(require,module,exports){
var hbsVM     = require('handlebars/dist/cjs/handlebars/runtime');
var Utils     = require('./utils');
var isBrowser = typeof window !== 'undefined';
var raf       = isBrowser && require('raf-component');
var __slice   = Array.prototype.slice;

/**
 * Extend the Handlebars runtime environment with DOM specific helpers.
 *
 * @type {Object}
 */
var VM = module.exports = Utils.create(hbsVM);

/**
 * Simple partial application function.
 *
 * @param  {Function} fn
 * @return {Function}
 */
VM.partial = function (fn /* , ..args */) {
  var args = __slice.call(arguments, 1);

  return function () {
    return fn.apply(this, args.concat(__slice.call(arguments)));
  };
};

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
 * Accepts a function that has subscriptions called inside and returns a new
 * function that will listen to all subscriptions and can update with any
 * changes.
 *
 * @param  {Function} fn
 * @return {Function}
 */
VM.subscribe = function (fn, env) {
  var triggered    = false;
  var unsubscribed = false;
  var execution;

  /**
   * Trigger this function with every change with the listeners.
   */
  var change = function () {
    // If the triggered flag has been set, don't cause another update.
    if (triggered || unsubscribed) { return; }

    // Set a triggered flag to avoid multiple triggers. Also unsubscribe any
    // children immediately to stop update clashes.
    triggered = true;
    unsubscribeChildren();

    execution = VM.exec(function () {
      triggered = false;

      beforeUpdate();
      subscriber.update(subscriber.exec());
      afterUpdate();
    });
  };

  /**
   * Iterate over a subscriptions object and unsubscribe everything.
   *
   * @param {Array} subscriptions
   */
  var eachSubscription = function (subscriptions, fn) {
    for (var property in subscriptions) {
      for (var key in subscriptions[property]) {
        fn(subscriptions[property][key], property, change);
      }
    }
  };

  /**
   * Iterate over an array of functions and execute.
   *
   * @param {Array} subscriptions
   */
  var iteration = function (subscriptions) {
    for (var i = 0; i < subscriptions.length; i++) {
      subscriptions[i]();
    }
  };

  /**
   * Run this function before we run an update function. It moves current
   * subscriptions so that we can diff the subscriptions after we update
   * the DOM.
   */
  var beforeUpdate = function () {
    iteration(subscriber.unsubscriptions);
    subscriber.prevSubscriptions = subscriber.subscriptions;
  };

  /**
   * Run this function after an update. It will check for difference in the
   * before and after updates.
   */
  var afterUpdate = function () {
    var subscriptions = subscriber.subscriptions;

    // Diff the previous subscriptions and new subscriptions to add/remove
    // listeners as needed. This should be more memory efficient than blindly
    // adding and removing listeners every time.
    for (var property in subscriptions) {
      for (var key in subscriptions[property]) {
        if (!subscriber.prevSubscriptions[property][key]) {
          env.subscribe(subscriptions[property][key], property, change);
        } else {
          delete subscriber.prevSubscriptions[property][key];
        }
      }
    }

    // Loop over previous subscriptions that no longer exist and unsubscribe.
    eachSubscription(subscriber.prevSubscriptions, env.unsubscribe);

    delete subscriber.prevSubscriptions;
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
   * The returned subscription function takes care of aliasing the
   * subscriptions array correctly, subscribing for updates and triggering
   * updates when any of the subscriptions change.
   *
   * @return {*}
   */
  var subscriber = function () {
    var result = subscriber.exec.apply(this, arguments);
    eachSubscription(subscriber.subscriptions, env.subscribe);
    return result;
  };

  // Keep an array of current subscriptions and an object with references
  // to child subscription functions.
  subscriber.cid      = 'subscriber' + Utils.uniqueId();
  subscriber.children = {};

  /**
   * Execute the function and return the result.
   *
   * @return {*}
   */
  subscriber.exec = function () {
    // If we have a parent subscriber, link the subscribers together.
    if (VM.subscriber) {
      subscriber.parent = VM.subscriber;
      subscriber.parent.children[subscriber.cid] = subscriber;
    }

    // Alias subscriber functionality to the VM object.
    VM.subscriber  = subscriber;
    VM.unsubscribe = subscriber.unsubscribe;

    // Reset subscriptions before execution.
    subscriber.subscriptions   = {};
    subscriber.unsubscriptions = [];

    var value = fn.apply(this, arguments);

    // Reset the VM functionality to what it was beforehand.
    VM.subscriber  = subscriber.parent;
    VM.unsubscribe = subscriber.parent && subscriber.parent.unsubscribe;

    // Return an object with a value property and unsubscribe functionality.
    return value;
  };

  /**
   * Remove the current subscriber from all listeners. We also need to cancel
   * any current execution event and remove a reference from the parent
   * subscription.
   */
  subscriber.remove = function () {
    iteration(subscriber.unsubscriptions);
    eachSubscription(subscriber.subscriptions, env.unsubscribe);

    if (subscriber.parent) {
      delete subscriber.parent.children[subscriber.cid];
      delete subscriber.parent;
    }

    // Track whether we have been unsubscribed. This is required since the
    // listener could still be triggered at any time even though we expect
    // the external references to be dropped. This could also indicate a
    // potential memory leak with the listener unsusbcription code.
    unsubscribed = true;
    unsubscribeChildren();
    VM.exec.cancel(execution);
  };

  /**
   * Push unsubscription functions into the unsubscribe array.
   * @return {[type]} [description]
   */
  subscriber.unsubscribe = function (fn) {
    Utils.isFunction(fn) && subscriber.unsubscriptions.push(fn);
  };

  return subscriber;
};

/**
 * Generate an executable template from a template spec.
 *
 * @param  {Object}   templateSpec
 * @return {Function}
 */
VM.template = function (templateSpec, env) {
  /**
   * Wrap a function in a subscriber *every* time that function is called.
   *
   * @param  {Function} fn
   * @return {Object}
   */
  var wrapSubscriber = function (fn) {
    return function () {
      var subscriber = VM.subscribe(fn, env);
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
    partial:          VM.partial,
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
    var subscription = VM.subscribe(fn, env);
    var tracker      = Utils.trackNode(create(subscription()));

    // Replace the tracked node in place.
    subscription.update = function (value) {
      tracker.replace(create(value));
    };

    return tracker.fragment;
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
    var subscription = VM.subscribe(fn, env);
    var el           = createElement(subscription(), env);

    subscription.update = function (value) {
      cb(el = copyAndReplaceNode(createElement(value, env), el));
    };

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
    var nameSubscription  = VM.subscribe(nameFn, env);
    var valueSubscription = VM.subscribe(valueFn, env);

    // Keep track of the current name and value without having to re-run the
    // function every time something changes.
    var attrName  = nameSubscription();
    var attrValue = valueSubscription();

    nameSubscription.update = function (value) {
      removeAttribute(elementFn(), attrName);
      setAttribute(elementFn(), attrName = value, attrValue);
    };

    valueSubscription.update = function (value) {
      setAttribute(elementFn(), attrName, attrValue = value);
    };

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
    var subscription = VM.subscribe(fn, env);
    var node         = createComment(subscription());

    subscription.update = function (value) {
      node.textContent = value;
    };

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
    var subscriptions = VM.subscriber.subscriptions;

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

},{"./utils":7,"handlebars/dist/cjs/handlebars/runtime":10,"raf-component":13}],5:[function(require,module,exports){
module.exports = require('handlebars/dist/cjs/handlebars/safe-string').default;

},{"handlebars/dist/cjs/handlebars/safe-string":11}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
var hbsUtils   = require('handlebars/dist/cjs/handlebars/utils');
var uniqueId   = 0;
var TrackNode  = require('./track-node');
var SafeString = require('./safe-string');

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

},{"./safe-string":5,"./track-node":6,"handlebars/dist/cjs/handlebars/utils":12}],8:[function(require,module,exports){
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
},{"./exception":9,"./utils":12}],9:[function(require,module,exports){
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
},{}],10:[function(require,module,exports){
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
},{"./base":8,"./exception":9,"./utils":12}],11:[function(require,module,exports){
"use strict";
// Build out our basic SafeString type
function SafeString(string) {
  this.string = string;
}

SafeString.prototype.toString = function() {
  return "" + this.string;
};

exports["default"] = SafeString;
},{}],12:[function(require,module,exports){
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
},{"./safe-string":11}],13:[function(require,module,exports){
/**
 * Expose `requestAnimationFrame()`.
 */

exports = module.exports = window.requestAnimationFrame
  || window.webkitRequestAnimationFrame
  || window.mozRequestAnimationFrame
  || window.oRequestAnimationFrame
  || window.msRequestAnimationFrame
  || fallback;

/**
 * Fallback implementation.
 */

var prev = new Date().getTime();
function fallback(fn) {
  var curr = new Date().getTime();
  var ms = Math.max(0, 16 - (curr - prev));
  var req = setTimeout(fn, ms);
  prev = curr;
  return req;
}

/**
 * Cancel.
 */

var cancel = window.cancelAnimationFrame
  || window.webkitCancelAnimationFrame
  || window.mozCancelAnimationFrame
  || window.oCancelAnimationFrame
  || window.msCancelAnimationFrame
  || window.clearTimeout;

exports.cancel = function(id){
  cancel.call(window, id);
};

},{}],14:[function(require,module,exports){
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

},{"./lib/base":1,"./lib/events":2,"./lib/exception":3,"./lib/runtime":4,"./lib/safe-string":5,"./lib/utils":7}]},{},[14])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvYmFzZS5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi9ldmVudHMuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvZXhjZXB0aW9uLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbGliL3J1bnRpbWUuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvc2FmZS1zdHJpbmcuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvdHJhY2stbm9kZS5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi91dGlscy5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvYmFzZS5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvZXhjZXB0aW9uLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9ydW50aW1lLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9zYWZlLXN0cmluZy5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvdXRpbHMuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvcmFmLWNvbXBvbmVudC9pbmRleC5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL3J1bnRpbWUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3RkE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0a0JBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgaGJzQmFzZSAgICAgICAgICAgICAgID0gcmVxdWlyZSgnaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL2Jhc2UnKTtcbnZhciBVdGlscyAgICAgICAgICAgICAgICAgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG52YXIgSGFuZGxlYmFyc0Vudmlyb25tZW50ID0gaGJzQmFzZS5IYW5kbGViYXJzRW52aXJvbm1lbnQ7XG5cbi8qKlxuICogRXh0ZW5kIEhhbmRsZWJhcnMgYmFzZSBvYmplY3Qgd2l0aCBjdXN0b20gZnVuY3Rpb25hbGl0eS5cbiAqXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG52YXIgYmFzZSA9IG1vZHVsZS5leHBvcnRzID0gVXRpbHMuY3JlYXRlKGhic0Jhc2UpO1xuXG4vKipcbiAqIFdyYXAgb2xkLXN0eWxlIEhhbmRsZWJhcnMgaGVscGVycyB3aXRoIHRoZSB1cGRhdGVkIG9iamVjdCBzeW50YXggcmV0dXJuLlxuICpcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBoZWxwZXJcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICovXG52YXIgd3JhcE9sZEhlbHBlciA9IGZ1bmN0aW9uIChoZWxwZXIpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcmVzdWx0ID0gaGVscGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICAvLyBOZWVkIGEgc3BlY2lhbCBoYW5kbGVyIGZvciB0aGUgYHdpdGhgIGhlbHBlciB3aGljaCB3b24ndCBhbHdheXMgZXhlY3V0ZS5cbiAgICByZXR1cm4gcmVzdWx0ID09IG51bGwgPyByZXN1bHQgOiByZXN1bHQudmFsdWU7XG4gIH07XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVyIERPTUJhcnMgaGVscGVycyBvbiB0aGUgcGFzc2VkIGluIERPTUJhcnMgaW5zdGFuY2UuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGluc3RhbmNlXG4gKi9cbnZhciByZWdpc3RlckRlZmF1bHRIZWxwZXJzID0gZnVuY3Rpb24gKGluc3RhbmNlKSB7XG4gIC8qKlxuICAgKiBUaGUgaGFuZGxlYmFycyBgZWFjaGAgaGVscGVyIGlzIGluY29tcGF0aWJhYmxlIHdpdGggRE9NQmFycywgc2luY2UgaXRcbiAgICogYXNzdW1lcyBzdHJpbmcgY29uY2F0aW5hdGlvbiAoYXMgb3Bwb3NlZCB0byBkb2N1bWVudCBmcmFnbWVudHMpLlxuICAgKlxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGNvbnRleHRcbiAgICogQHBhcmFtICB7T2JqZWN0fSBvcHRpb25zXG4gICAqIEByZXR1cm4ge05vZGV9XG4gICAqL1xuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignZWFjaCcsIGZ1bmN0aW9uIChjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgdmFyIGZuICAgICAgID0gb3B0aW9ucy5mbjtcbiAgICB2YXIgaW52ZXJzZSAgPSBvcHRpb25zLmludmVyc2U7XG4gICAgdmFyIGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgIHZhciBpICAgICAgICA9IDA7XG4gICAgdmFyIGRhdGE7XG5cbiAgICBpZiAodHlwZW9mIGNvbnRleHQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMuZGF0YSkge1xuICAgICAgZGF0YSA9IFV0aWxzLmNyZWF0ZShvcHRpb25zLmRhdGEpO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgY29udGV4dCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHZhciBsZW4gPSBjb250ZXh0Lmxlbmd0aDtcblxuICAgICAgaWYgKGxlbiA9PT0gK2xlbikge1xuICAgICAgICBmb3IgKDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgZGF0YS5pbmRleCA9IGk7XG4gICAgICAgICAgZGF0YS5maXJzdCA9IChpID09PSAwKTtcbiAgICAgICAgICBkYXRhLmxhc3QgID0gKGkgPT09IGxlbiAtIDEpO1xuXG4gICAgICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQoZm4oY29udGV4dFtpXSwgeyBkYXRhOiBkYXRhIH0pLnZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIGNvbnRleHQpIHtcbiAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGNvbnRleHQsIGtleSkpIHtcbiAgICAgICAgICAgIGkgKz0gMTtcblxuICAgICAgICAgICAgZGF0YS5rZXkgICA9IGtleTtcbiAgICAgICAgICAgIGRhdGEuaW5kZXggPSBpO1xuICAgICAgICAgICAgZGF0YS5maXJzdCA9IChpID09PSAwKTtcblxuICAgICAgICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQoZm4oY29udGV4dFtrZXldLCB7IGRhdGE6IGRhdGEgfSkudmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChpID09PSAwKSB7XG4gICAgICByZXR1cm4gaW52ZXJzZSh0aGlzKS52YWx1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnJhZ21lbnQ7XG4gIH0pO1xuXG4gIC8vIFJlZ2lzdGVyIHVwZGF0ZWQgSGFuZGxlYmFycyBoZWxwZXJzLlxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcih7XG4gICAgJ2lmJzogICAgICAgICAgICAgICAgIHdyYXBPbGRIZWxwZXIoaW5zdGFuY2UuaGVscGVycy5pZiksXG4gICAgJ3dpdGgnOiAgICAgICAgICAgICAgIHdyYXBPbGRIZWxwZXIoaW5zdGFuY2UuaGVscGVycy53aXRoKSxcbiAgICAnYmxvY2tIZWxwZXJNaXNzaW5nJzogd3JhcE9sZEhlbHBlcihpbnN0YW5jZS5oZWxwZXJzLmJsb2NrSGVscGVyTWlzc2luZylcbiAgfSk7XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhIGN1c3RvbSBET01CYXJzIGVudmlyb25tZW50IHRvIG1hdGNoIEhhbmRsZWJhcnNFbnZpcm9ubWVudC5cbiAqL1xudmFyIERPTUJhcnNFbnZpcm9ubWVudCA9IGJhc2UuRE9NQmFyc0Vudmlyb25tZW50ID0gZnVuY3Rpb24gKCkge1xuICBIYW5kbGViYXJzRW52aXJvbm1lbnQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgcmVnaXN0ZXJEZWZhdWx0SGVscGVycyh0aGlzKTtcbn07XG5cbi8qKlxuICogRXh0ZW5kIHRoZSBIYW5kbGViYXJzRW52aXJvbm1lbnQgcHJvdG90eXBlLlxuICpcbiAqIEB0eXBlIHtPYmplY3R9XG4gKi9cbnZhciBlbnZQcm90b3R5cGUgPSBET01CYXJzRW52aXJvbm1lbnQucHJvdG90eXBlID0gVXRpbHMuY3JlYXRlKFxuICBIYW5kbGViYXJzRW52aXJvbm1lbnQucHJvdG90eXBlXG4pO1xuXG4vKipcbiAqIEFsaWFzIHNvbWUgdXNlZnVsIGZ1bmN0aW9uYWxpdHkgdGhhdCBpcyBleHBlY3RlZCB0byBiZSBleHBvc2VkIG9uIHRoZSByb290XG4gKiBvYmplY3QuXG4gKi9cbmVudlByb3RvdHlwZS5jcmVhdGVGcmFtZSAgICAgICA9IGhic0Jhc2UuY3JlYXRlRnJhbWU7XG5lbnZQcm90b3R5cGUuUkVWSVNJT05fQ0hBTkdFUyAgPSBoYnNCYXNlLlJFVklTSU9OX0NIQU5HRVM7XG5lbnZQcm90b3R5cGUuQ09NUElMRVJfUkVWSVNJT04gPSBoYnNCYXNlLkNPTVBJTEVSX1JFVklTSU9OO1xuXG4vKipcbiAqIFRoZSBiYXNpYyBnZXR0ZXIgZnVuY3Rpb24uIE92ZXJyaWRlIHRoaXMgd2l0aCBzb21ldGhpbmcgZWxzZSBiYXNlZCBvbiB5b3VyXG4gKiBwcm9qZWN0LiBGb3IgZXhhbXBsZSwgQmFja2JvbmUuanMgbW9kZWxzLlxuICpcbiAqIEBwYXJhbSAge09iamVjdH0gb2JqZWN0XG4gKiBAcGFyYW0gIHtTdHJpbmd9IHByb3BlcnR5XG4gKiBAcmV0dXJuIHsqfVxuICovXG5lbnZQcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKG9iamVjdCwgcHJvcGVydHkpIHtcbiAgcmV0dXJuIG9iamVjdFtwcm9wZXJ0eV07XG59O1xuXG4vKipcbiAqIE5vb3AgZnVuY3Rpb25zIGZvciBzdWJzY3JpYmUgYW5kIHVuc3Vic2NyaWJlLiBPdmVycmlkZSB3aXRoIGN1c3RvbVxuICogZnVuY3Rpb25hbGl0eS5cbiAqL1xuZW52UHJvdG90eXBlLnN1YnNjcmliZSA9IGVudlByb3RvdHlwZS51bnN1YnNjcmliZSA9IGZ1bmN0aW9uICgpIHt9O1xuIiwidmFyIEV2ZW50cyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8qKlxuICogTGlzdGVuIHRvIGFueSBldmVudHMgdHJpZ2dlcmVkLlxuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gICBuYW1lXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAqIEBwYXJhbSAge09iamVjdH0gICBjb250ZXh0XG4gKiBAcmV0dXJuIHtFdmVudHN9XG4gKi9cbkV2ZW50cy5vbiA9IGZ1bmN0aW9uIChuYW1lLCBmbiwgY29udGV4dCkge1xuICB0aGlzLl9ldmVudHMgfHwgKHRoaXMuX2V2ZW50cyA9IHt9KTtcbiAgdmFyIGV2ZW50cyA9IHRoaXMuX2V2ZW50c1tuYW1lXSB8fCAodGhpcy5fZXZlbnRzW25hbWVdID0gW10pO1xuICBldmVudHMucHVzaCh7IGZuOiBmbiwgY29udGV4dDogY29udGV4dCB9KTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIExpc3RlbiB0byBhbnkgZXZlbnRzIHRyaWdnZXJlZCBvbmNlLlxuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gICBuYW1lXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAqIEBwYXJhbSAge09iamVjdH0gICBjb250ZXh0XG4gKiBAcmV0dXJuIHtFdmVudHN9XG4gKi9cbkV2ZW50cy5vbmNlID0gZnVuY3Rpb24gKG5hbWUsIGZuLCBjb250ZXh0KSB7XG4gIHZhciB0aGF0ID0gdGhpcztcblxuICByZXR1cm4gdGhpcy5vbihuYW1lLCBmdW5jdGlvbiBzZWxmICgpIHtcbiAgICB0aGF0Lm9mZihuYW1lLCBzZWxmKTtcbiAgICBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9LCBjb250ZXh0KTtcbn07XG5cbi8qKlxuICogUmVtb3ZlIGFuIGV2ZW50IGxpc3RlbmVyLlxuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gICBuYW1lXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAqIEBwYXJhbSAge09iamVjdH0gICBjb250ZXh0XG4gKiBAcmV0dXJuIHtFdmVudHN9XG4gKi9cbkV2ZW50cy5vZmYgPSBmdW5jdGlvbiAobmFtZSwgZm4sIGNvbnRleHQpIHtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1tuYW1lXSkge1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgaWYgKCFuYW1lKSB7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzO1xuICAgIH0gZWxzZSB7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW25hbWVdO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgdmFyIGV2ZW50cyA9IHRoaXMuX2V2ZW50c1tuYW1lXTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBldmVudHMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoZXZlbnRzW2ldLmZuID09PSBmbikge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIgfHwgZXZlbnRzW2ldLmNvbnRleHQgPT09IGNvbnRleHQpIHtcbiAgICAgICAgZXZlbnRzLnNwbGljZShpLCAxKTtcbiAgICAgICAgaS0tO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmICghZXZlbnRzLmxlbmd0aCkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbbmFtZV07XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogRW1pdCBhbiBldmVudC5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSAgeyp9ICAgICAgLi4uXG4gKiBAcmV0dXJuIHtFdmVudHN9XG4gKi9cbkV2ZW50cy5lbWl0ID0gZnVuY3Rpb24gKG5hbWUgLyosIC4uLmFyZ3MgKi8pIHtcbiAgdmFyIGFyZ3MgICA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHMgJiYgdGhpcy5fZXZlbnRzW25hbWVdICYmIHRoaXMuX2V2ZW50c1tuYW1lXS5zbGljZSgpO1xuXG4gIGlmIChldmVudHMpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGV2ZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgZXZlbnRzW2ldLmZuLmFwcGx5KGV2ZW50c1tpXS5jb250ZXh0LCBhcmdzKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9leGNlcHRpb24nKS5kZWZhdWx0O1xuIiwidmFyIGhic1ZNICAgICA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9ydW50aW1lJyk7XG52YXIgVXRpbHMgICAgID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIGlzQnJvd3NlciA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnO1xudmFyIHJhZiAgICAgICA9IGlzQnJvd3NlciAmJiByZXF1aXJlKCdyYWYtY29tcG9uZW50Jyk7XG52YXIgX19zbGljZSAgID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xuXG4vKipcbiAqIEV4dGVuZCB0aGUgSGFuZGxlYmFycyBydW50aW1lIGVudmlyb25tZW50IHdpdGggRE9NIHNwZWNpZmljIGhlbHBlcnMuXG4gKlxuICogQHR5cGUge09iamVjdH1cbiAqL1xudmFyIFZNID0gbW9kdWxlLmV4cG9ydHMgPSBVdGlscy5jcmVhdGUoaGJzVk0pO1xuXG4vKipcbiAqIFNpbXBsZSBwYXJ0aWFsIGFwcGxpY2F0aW9uIGZ1bmN0aW9uLlxuICpcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7RnVuY3Rpb259XG4gKi9cblZNLnBhcnRpYWwgPSBmdW5jdGlvbiAoZm4gLyogLCAuLmFyZ3MgKi8pIHtcbiAgdmFyIGFyZ3MgPSBfX3NsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcblxuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmdzLmNvbmNhdChfX3NsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuICB9O1xufTtcblxuLyoqXG4gKiBCaW5kIGEgZnVuY3Rpb24gdG8gdGhlIGFuaW1hdGlvbiBmcmFtZS5cbiAqXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge051bWJlcn1cbiAqL1xuVk0uZXhlYyA9IGZ1bmN0aW9uIChmbikge1xuICByZXR1cm4gaXNCcm93c2VyID8gcmFmKGZuKSA6IHNldEltbWVkaWF0ZShmbik7XG59O1xuXG4vKipcbiAqIENhbmNlbCBhbiBleGVjdXRpb24uXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IGlkXG4gKi9cblZNLmV4ZWMuY2FuY2VsID0gZnVuY3Rpb24gKGlkKSB7XG4gIHJldHVybiBpc0Jyb3dzZXIgPyByYWYuY2FuY2VsKGlkKSA6IGNsZWFySW1tZWRpYXRlKGlkKTtcbn07XG5cbi8qKlxuICogQWNjZXB0cyBhIGZ1bmN0aW9uIHRoYXQgaGFzIHN1YnNjcmlwdGlvbnMgY2FsbGVkIGluc2lkZSBhbmQgcmV0dXJucyBhIG5ld1xuICogZnVuY3Rpb24gdGhhdCB3aWxsIGxpc3RlbiB0byBhbGwgc3Vic2NyaXB0aW9ucyBhbmQgY2FuIHVwZGF0ZSB3aXRoIGFueVxuICogY2hhbmdlcy5cbiAqXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICovXG5WTS5zdWJzY3JpYmUgPSBmdW5jdGlvbiAoZm4sIGVudikge1xuICB2YXIgdHJpZ2dlcmVkICAgID0gZmFsc2U7XG4gIHZhciB1bnN1YnNjcmliZWQgPSBmYWxzZTtcbiAgdmFyIGV4ZWN1dGlvbjtcblxuICAvKipcbiAgICogVHJpZ2dlciB0aGlzIGZ1bmN0aW9uIHdpdGggZXZlcnkgY2hhbmdlIHdpdGggdGhlIGxpc3RlbmVycy5cbiAgICovXG4gIHZhciBjaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gSWYgdGhlIHRyaWdnZXJlZCBmbGFnIGhhcyBiZWVuIHNldCwgZG9uJ3QgY2F1c2UgYW5vdGhlciB1cGRhdGUuXG4gICAgaWYgKHRyaWdnZXJlZCB8fCB1bnN1YnNjcmliZWQpIHsgcmV0dXJuOyB9XG5cbiAgICAvLyBTZXQgYSB0cmlnZ2VyZWQgZmxhZyB0byBhdm9pZCBtdWx0aXBsZSB0cmlnZ2Vycy4gQWxzbyB1bnN1YnNjcmliZSBhbnlcbiAgICAvLyBjaGlsZHJlbiBpbW1lZGlhdGVseSB0byBzdG9wIHVwZGF0ZSBjbGFzaGVzLlxuICAgIHRyaWdnZXJlZCA9IHRydWU7XG4gICAgdW5zdWJzY3JpYmVDaGlsZHJlbigpO1xuXG4gICAgZXhlY3V0aW9uID0gVk0uZXhlYyhmdW5jdGlvbiAoKSB7XG4gICAgICB0cmlnZ2VyZWQgPSBmYWxzZTtcblxuICAgICAgYmVmb3JlVXBkYXRlKCk7XG4gICAgICBzdWJzY3JpYmVyLnVwZGF0ZShzdWJzY3JpYmVyLmV4ZWMoKSk7XG4gICAgICBhZnRlclVwZGF0ZSgpO1xuICAgIH0pO1xuICB9O1xuXG4gIC8qKlxuICAgKiBJdGVyYXRlIG92ZXIgYSBzdWJzY3JpcHRpb25zIG9iamVjdCBhbmQgdW5zdWJzY3JpYmUgZXZlcnl0aGluZy5cbiAgICpcbiAgICogQHBhcmFtIHtBcnJheX0gc3Vic2NyaXB0aW9uc1xuICAgKi9cbiAgdmFyIGVhY2hTdWJzY3JpcHRpb24gPSBmdW5jdGlvbiAoc3Vic2NyaXB0aW9ucywgZm4pIHtcbiAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiBzdWJzY3JpcHRpb25zKSB7XG4gICAgICBmb3IgKHZhciBrZXkgaW4gc3Vic2NyaXB0aW9uc1twcm9wZXJ0eV0pIHtcbiAgICAgICAgZm4oc3Vic2NyaXB0aW9uc1twcm9wZXJ0eV1ba2V5XSwgcHJvcGVydHksIGNoYW5nZSk7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBJdGVyYXRlIG92ZXIgYW4gYXJyYXkgb2YgZnVuY3Rpb25zIGFuZCBleGVjdXRlLlxuICAgKlxuICAgKiBAcGFyYW0ge0FycmF5fSBzdWJzY3JpcHRpb25zXG4gICAqL1xuICB2YXIgaXRlcmF0aW9uID0gZnVuY3Rpb24gKHN1YnNjcmlwdGlvbnMpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN1YnNjcmlwdGlvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHN1YnNjcmlwdGlvbnNbaV0oKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIFJ1biB0aGlzIGZ1bmN0aW9uIGJlZm9yZSB3ZSBydW4gYW4gdXBkYXRlIGZ1bmN0aW9uLiBJdCBtb3ZlcyBjdXJyZW50XG4gICAqIHN1YnNjcmlwdGlvbnMgc28gdGhhdCB3ZSBjYW4gZGlmZiB0aGUgc3Vic2NyaXB0aW9ucyBhZnRlciB3ZSB1cGRhdGVcbiAgICogdGhlIERPTS5cbiAgICovXG4gIHZhciBiZWZvcmVVcGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaXRlcmF0aW9uKHN1YnNjcmliZXIudW5zdWJzY3JpcHRpb25zKTtcbiAgICBzdWJzY3JpYmVyLnByZXZTdWJzY3JpcHRpb25zID0gc3Vic2NyaWJlci5zdWJzY3JpcHRpb25zO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSdW4gdGhpcyBmdW5jdGlvbiBhZnRlciBhbiB1cGRhdGUuIEl0IHdpbGwgY2hlY2sgZm9yIGRpZmZlcmVuY2UgaW4gdGhlXG4gICAqIGJlZm9yZSBhbmQgYWZ0ZXIgdXBkYXRlcy5cbiAgICovXG4gIHZhciBhZnRlclVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc3Vic2NyaXB0aW9ucyA9IHN1YnNjcmliZXIuc3Vic2NyaXB0aW9ucztcblxuICAgIC8vIERpZmYgdGhlIHByZXZpb3VzIHN1YnNjcmlwdGlvbnMgYW5kIG5ldyBzdWJzY3JpcHRpb25zIHRvIGFkZC9yZW1vdmVcbiAgICAvLyBsaXN0ZW5lcnMgYXMgbmVlZGVkLiBUaGlzIHNob3VsZCBiZSBtb3JlIG1lbW9yeSBlZmZpY2llbnQgdGhhbiBibGluZGx5XG4gICAgLy8gYWRkaW5nIGFuZCByZW1vdmluZyBsaXN0ZW5lcnMgZXZlcnkgdGltZS5cbiAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiBzdWJzY3JpcHRpb25zKSB7XG4gICAgICBmb3IgKHZhciBrZXkgaW4gc3Vic2NyaXB0aW9uc1twcm9wZXJ0eV0pIHtcbiAgICAgICAgaWYgKCFzdWJzY3JpYmVyLnByZXZTdWJzY3JpcHRpb25zW3Byb3BlcnR5XVtrZXldKSB7XG4gICAgICAgICAgZW52LnN1YnNjcmliZShzdWJzY3JpcHRpb25zW3Byb3BlcnR5XVtrZXldLCBwcm9wZXJ0eSwgY2hhbmdlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkZWxldGUgc3Vic2NyaWJlci5wcmV2U3Vic2NyaXB0aW9uc1twcm9wZXJ0eV1ba2V5XTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIExvb3Agb3ZlciBwcmV2aW91cyBzdWJzY3JpcHRpb25zIHRoYXQgbm8gbG9uZ2VyIGV4aXN0IGFuZCB1bnN1YnNjcmliZS5cbiAgICBlYWNoU3Vic2NyaXB0aW9uKHN1YnNjcmliZXIucHJldlN1YnNjcmlwdGlvbnMsIGVudi51bnN1YnNjcmliZSk7XG5cbiAgICBkZWxldGUgc3Vic2NyaWJlci5wcmV2U3Vic2NyaXB0aW9ucztcbiAgfTtcblxuICAvKipcbiAgICogVW5zdWJzY3JpYmUgZXZlcnkgY2hpbGQgb2YgdGhlIGN1cnJlbnQgc3Vic2NyaXB0aW9uLlxuICAgKi9cbiAgdmFyIHVuc3Vic2NyaWJlQ2hpbGRyZW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgZm9yICh2YXIgY2hpbGQgaW4gc3Vic2NyaWJlci5jaGlsZHJlbikge1xuICAgICAgc3Vic2NyaWJlci5jaGlsZHJlbltjaGlsZF0ucmVtb3ZlKCk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBUaGUgcmV0dXJuZWQgc3Vic2NyaXB0aW9uIGZ1bmN0aW9uIHRha2VzIGNhcmUgb2YgYWxpYXNpbmcgdGhlXG4gICAqIHN1YnNjcmlwdGlvbnMgYXJyYXkgY29ycmVjdGx5LCBzdWJzY3JpYmluZyBmb3IgdXBkYXRlcyBhbmQgdHJpZ2dlcmluZ1xuICAgKiB1cGRhdGVzIHdoZW4gYW55IG9mIHRoZSBzdWJzY3JpcHRpb25zIGNoYW5nZS5cbiAgICpcbiAgICogQHJldHVybiB7Kn1cbiAgICovXG4gIHZhciBzdWJzY3JpYmVyID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciByZXN1bHQgPSBzdWJzY3JpYmVyLmV4ZWMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBlYWNoU3Vic2NyaXB0aW9uKHN1YnNjcmliZXIuc3Vic2NyaXB0aW9ucywgZW52LnN1YnNjcmliZSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBLZWVwIGFuIGFycmF5IG9mIGN1cnJlbnQgc3Vic2NyaXB0aW9ucyBhbmQgYW4gb2JqZWN0IHdpdGggcmVmZXJlbmNlc1xuICAvLyB0byBjaGlsZCBzdWJzY3JpcHRpb24gZnVuY3Rpb25zLlxuICBzdWJzY3JpYmVyLmNpZCAgICAgID0gJ3N1YnNjcmliZXInICsgVXRpbHMudW5pcXVlSWQoKTtcbiAgc3Vic2NyaWJlci5jaGlsZHJlbiA9IHt9O1xuXG4gIC8qKlxuICAgKiBFeGVjdXRlIHRoZSBmdW5jdGlvbiBhbmQgcmV0dXJuIHRoZSByZXN1bHQuXG4gICAqXG4gICAqIEByZXR1cm4geyp9XG4gICAqL1xuICBzdWJzY3JpYmVyLmV4ZWMgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gSWYgd2UgaGF2ZSBhIHBhcmVudCBzdWJzY3JpYmVyLCBsaW5rIHRoZSBzdWJzY3JpYmVycyB0b2dldGhlci5cbiAgICBpZiAoVk0uc3Vic2NyaWJlcikge1xuICAgICAgc3Vic2NyaWJlci5wYXJlbnQgPSBWTS5zdWJzY3JpYmVyO1xuICAgICAgc3Vic2NyaWJlci5wYXJlbnQuY2hpbGRyZW5bc3Vic2NyaWJlci5jaWRdID0gc3Vic2NyaWJlcjtcbiAgICB9XG5cbiAgICAvLyBBbGlhcyBzdWJzY3JpYmVyIGZ1bmN0aW9uYWxpdHkgdG8gdGhlIFZNIG9iamVjdC5cbiAgICBWTS5zdWJzY3JpYmVyICA9IHN1YnNjcmliZXI7XG4gICAgVk0udW5zdWJzY3JpYmUgPSBzdWJzY3JpYmVyLnVuc3Vic2NyaWJlO1xuXG4gICAgLy8gUmVzZXQgc3Vic2NyaXB0aW9ucyBiZWZvcmUgZXhlY3V0aW9uLlxuICAgIHN1YnNjcmliZXIuc3Vic2NyaXB0aW9ucyAgID0ge307XG4gICAgc3Vic2NyaWJlci51bnN1YnNjcmlwdGlvbnMgPSBbXTtcblxuICAgIHZhciB2YWx1ZSA9IGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICAvLyBSZXNldCB0aGUgVk0gZnVuY3Rpb25hbGl0eSB0byB3aGF0IGl0IHdhcyBiZWZvcmVoYW5kLlxuICAgIFZNLnN1YnNjcmliZXIgID0gc3Vic2NyaWJlci5wYXJlbnQ7XG4gICAgVk0udW5zdWJzY3JpYmUgPSBzdWJzY3JpYmVyLnBhcmVudCAmJiBzdWJzY3JpYmVyLnBhcmVudC51bnN1YnNjcmliZTtcblxuICAgIC8vIFJldHVybiBhbiBvYmplY3Qgd2l0aCBhIHZhbHVlIHByb3BlcnR5IGFuZCB1bnN1YnNjcmliZSBmdW5jdGlvbmFsaXR5LlxuICAgIHJldHVybiB2YWx1ZTtcbiAgfTtcblxuICAvKipcbiAgICogUmVtb3ZlIHRoZSBjdXJyZW50IHN1YnNjcmliZXIgZnJvbSBhbGwgbGlzdGVuZXJzLiBXZSBhbHNvIG5lZWQgdG8gY2FuY2VsXG4gICAqIGFueSBjdXJyZW50IGV4ZWN1dGlvbiBldmVudCBhbmQgcmVtb3ZlIGEgcmVmZXJlbmNlIGZyb20gdGhlIHBhcmVudFxuICAgKiBzdWJzY3JpcHRpb24uXG4gICAqL1xuICBzdWJzY3JpYmVyLnJlbW92ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpdGVyYXRpb24oc3Vic2NyaWJlci51bnN1YnNjcmlwdGlvbnMpO1xuICAgIGVhY2hTdWJzY3JpcHRpb24oc3Vic2NyaWJlci5zdWJzY3JpcHRpb25zLCBlbnYudW5zdWJzY3JpYmUpO1xuXG4gICAgaWYgKHN1YnNjcmliZXIucGFyZW50KSB7XG4gICAgICBkZWxldGUgc3Vic2NyaWJlci5wYXJlbnQuY2hpbGRyZW5bc3Vic2NyaWJlci5jaWRdO1xuICAgICAgZGVsZXRlIHN1YnNjcmliZXIucGFyZW50O1xuICAgIH1cblxuICAgIC8vIFRyYWNrIHdoZXRoZXIgd2UgaGF2ZSBiZWVuIHVuc3Vic2NyaWJlZC4gVGhpcyBpcyByZXF1aXJlZCBzaW5jZSB0aGVcbiAgICAvLyBsaXN0ZW5lciBjb3VsZCBzdGlsbCBiZSB0cmlnZ2VyZWQgYXQgYW55IHRpbWUgZXZlbiB0aG91Z2ggd2UgZXhwZWN0XG4gICAgLy8gdGhlIGV4dGVybmFsIHJlZmVyZW5jZXMgdG8gYmUgZHJvcHBlZC4gVGhpcyBjb3VsZCBhbHNvIGluZGljYXRlIGFcbiAgICAvLyBwb3RlbnRpYWwgbWVtb3J5IGxlYWsgd2l0aCB0aGUgbGlzdGVuZXIgdW5zdXNiY3JpcHRpb24gY29kZS5cbiAgICB1bnN1YnNjcmliZWQgPSB0cnVlO1xuICAgIHVuc3Vic2NyaWJlQ2hpbGRyZW4oKTtcbiAgICBWTS5leGVjLmNhbmNlbChleGVjdXRpb24pO1xuICB9O1xuXG4gIC8qKlxuICAgKiBQdXNoIHVuc3Vic2NyaXB0aW9uIGZ1bmN0aW9ucyBpbnRvIHRoZSB1bnN1YnNjcmliZSBhcnJheS5cbiAgICogQHJldHVybiB7W3R5cGVdfSBbZGVzY3JpcHRpb25dXG4gICAqL1xuICBzdWJzY3JpYmVyLnVuc3Vic2NyaWJlID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgVXRpbHMuaXNGdW5jdGlvbihmbikgJiYgc3Vic2NyaWJlci51bnN1YnNjcmlwdGlvbnMucHVzaChmbik7XG4gIH07XG5cbiAgcmV0dXJuIHN1YnNjcmliZXI7XG59O1xuXG4vKipcbiAqIEdlbmVyYXRlIGFuIGV4ZWN1dGFibGUgdGVtcGxhdGUgZnJvbSBhIHRlbXBsYXRlIHNwZWMuXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSAgIHRlbXBsYXRlU3BlY1xuICogQHJldHVybiB7RnVuY3Rpb259XG4gKi9cblZNLnRlbXBsYXRlID0gZnVuY3Rpb24gKHRlbXBsYXRlU3BlYywgZW52KSB7XG4gIC8qKlxuICAgKiBXcmFwIGEgZnVuY3Rpb24gaW4gYSBzdWJzY3JpYmVyICpldmVyeSogdGltZSB0aGF0IGZ1bmN0aW9uIGlzIGNhbGxlZC5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gICAqIEByZXR1cm4ge09iamVjdH1cbiAgICovXG4gIHZhciB3cmFwU3Vic2NyaWJlciA9IGZ1bmN0aW9uIChmbikge1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgc3Vic2NyaWJlciA9IFZNLnN1YnNjcmliZShmbiwgZW52KTtcbiAgICAgIHZhciB2YWx1ZSAgICAgID0gc3Vic2NyaWJlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgICAvLyBSZXR1cm4gYW4gb2JqZWN0IHdyYXBwZWQgaW4gdXNlZnVsIGZ1bmN0aW9uYWxpdHkuXG4gICAgICByZXR1cm4ge1xuICAgICAgICB2YWx1ZTogICAgICAgdmFsdWUsXG4gICAgICAgIHVuc3Vic2NyaWJlOiBzdWJzY3JpYmVyLnJlbW92ZVxuICAgICAgfTtcbiAgICB9O1xuICB9O1xuXG4gIC8qKlxuICAgKiBUaGUgY29udGFpbmVyIG9iamVjdCBob2xkcyBhbGwgdGhlIGZ1bmN0aW9ucyB1c2VkIGJ5IHRoZSB0ZW1wbGF0ZSBzcGVjLlxuICAgKlxuICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgKi9cbiAgdmFyIGNvbnRhaW5lciA9IHtcbiAgICBpbnZva2VQYXJ0aWFsOiAgICBWTS5pbnZva2VQYXJ0aWFsLFxuICAgIHByb2dyYW1zOiAgICAgICAgIFtdLFxuICAgIG5vb3A6ICAgICAgICAgICAgIFZNLm5vb3AsXG4gICAgcGFydGlhbDogICAgICAgICAgVk0ucGFydGlhbCxcbiAgICBlc2NhcGVFeHByZXNzaW9uOiBVdGlscy5lc2NhcGVFeHByZXNzaW9uLFxuICAgIHByb2dyYW1XaXRoRGVwdGg6IFZNLnByb2dyYW1XaXRoRGVwdGhcbiAgfTtcblxuICAvKipcbiAgICogUmVuZGVyIGFuZCBzdWJzY3JpYmUgYSBzaW5nbGUgRE9NIG5vZGUgdXNpbmcgYSBjdXN0b20gY3JlYXRpb24gZnVuY3Rpb24uXG4gICAqXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gY3JlYXRlXG4gICAqIEByZXR1cm4ge05vZGV9XG4gICAqL1xuICB2YXIgc3Vic2NyaWJlTm9kZSA9IGZ1bmN0aW9uIChmbiwgY3JlYXRlKSB7XG4gICAgdmFyIHN1YnNjcmlwdGlvbiA9IFZNLnN1YnNjcmliZShmbiwgZW52KTtcbiAgICB2YXIgdHJhY2tlciAgICAgID0gVXRpbHMudHJhY2tOb2RlKGNyZWF0ZShzdWJzY3JpcHRpb24oKSkpO1xuXG4gICAgLy8gUmVwbGFjZSB0aGUgdHJhY2tlZCBub2RlIGluIHBsYWNlLlxuICAgIHN1YnNjcmlwdGlvbi51cGRhdGUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHRyYWNrZXIucmVwbGFjZShjcmVhdGUodmFsdWUpKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHRyYWNrZXIuZnJhZ21lbnQ7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJlbW92ZSBhbiBhdHRyaWJ1dGUgZnJvbSBhbiBlbGVtZW50LlxuICAgKlxuICAgKiBAcGFyYW0ge05vZGV9ICAgZWxlbWVudFxuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICAgKi9cbiAgdmFyIHJlbW92ZUF0dHJpYnV0ZSA9IGZ1bmN0aW9uIChlbGVtZW50LCBuYW1lKSB7XG4gICAgaWYgKGVsZW1lbnQuaGFzQXR0cmlidXRlKG5hbWUpKSB7XG4gICAgICBlbnYuZW1pdCgncmVtb3ZlQXR0cmlidXRlJywgZWxlbWVudCwgbmFtZSk7XG4gICAgICBlbGVtZW50LnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIFNldCBhbiBhdHRyaWJ1dGUgdmFsdWUgb24gYW4gZWxlbWVudC5cbiAgICpcbiAgICogQHBhcmFtIHtOb2RlfSAgIGVsZW1lbnRcbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAgICogQHBhcmFtIHsqfSAgICAgIHZhbHVlXG4gICAqL1xuICB2YXIgc2V0QXR0cmlidXRlID0gZnVuY3Rpb24gKGVsZW1lbnQsIG5hbWUsIHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlID09PSBmYWxzZSkge1xuICAgICAgcmV0dXJuIHJlbW92ZUF0dHJpYnV0ZShlbGVtZW50LCBuYW1lKTtcbiAgICB9XG5cbiAgICBlbnYuZW1pdCgnc2V0QXR0cmlidXRlJywgZWxlbWVudCwgbmFtZSwgdmFsdWUpO1xuICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKG5hbWUsIHZhbHVlKTtcbiAgfTtcblxuICAvKipcbiAgICogQ3JlYXRlIGFuIGVsZW1lbnQgZnJvbSBhIHRhZyBuYW1lLlxuICAgKlxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IHRhZ05hbWVcbiAgICogQHJldHVybiB7Tm9kZX1cbiAgICovXG4gIHZhciBjcmVhdGVFbGVtZW50ID0gZnVuY3Rpb24gKHRhZ05hbWUpIHtcbiAgICB2YXIgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnTmFtZSk7XG4gICAgZW52LmVtaXQoJ2NyZWF0ZUVsZW1lbnQnLCBub2RlKTtcbiAgICByZXR1cm4gbm9kZTtcbiAgfTtcblxuICAvKipcbiAgICogQ3JlYXRlIGEgY29tbWVudCBub2RlIGJhc2VkIG9uIHRleHQgY29udGVudHMuXG4gICAqXG4gICAqIEBwYXJhbSAge1N0cmluZ30gY29udGVudHNcbiAgICogQHJldHVybiB7Tm9kZX1cbiAgICovXG4gIHZhciBjcmVhdGVDb21tZW50ID0gZnVuY3Rpb24gKHRhZ05hbWUpIHtcbiAgICB2YXIgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZUNvbW1lbnQodGFnTmFtZSk7XG4gICAgZW52LmVtaXQoJ2NyZWF0ZUNvbW1lbnQnLCBub2RlKTtcbiAgICByZXR1cm4gbm9kZTtcbiAgfTtcblxuICAvKipcbiAgICogQ29weSBhbGwgc2lnbmlmaWNhbnQgZGF0YSBmcm9tIG9uZSBlbGVtZW50IG5vZGUgdG8gYW5vdGhlci5cbiAgICpcbiAgICogQHBhcmFtICB7Tm9kZX0gbmV3Tm9kZVxuICAgKiBAcGFyYW0gIHtOb2RlfSBvbGROb2RlXG4gICAqIEByZXR1cm4ge05vZGV9XG4gICAqL1xuICB2YXIgY29weU5vZGUgPSBmdW5jdGlvbiAobmV3Tm9kZSwgb2xkTm9kZSkge1xuICAgIC8vIE1vdmUgYWxsIGNoaWxkIGVsZW1lbnRzIHRvIHRoZSBuZXcgbm9kZS5cbiAgICB3aGlsZSAob2xkTm9kZS5maXJzdENoaWxkKSB7XG4gICAgICBuZXdOb2RlLmFwcGVuZENoaWxkKG9sZE5vZGUuZmlyc3RDaGlsZCk7XG4gICAgfVxuXG4gICAgLy8gQ29weSBhbGwgdGhlIGF0dHJpYnV0ZXMgdG8gdGhlIG5ldyBub2RlLlxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2xkTm9kZS5hdHRyaWJ1dGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgYXR0cmlidXRlID0gb2xkTm9kZS5hdHRyaWJ1dGVzW2ldO1xuICAgICAgc2V0QXR0cmlidXRlKG5ld05vZGUsIGF0dHJpYnV0ZS5uYW1lLCBhdHRyaWJ1dGUudmFsdWUpO1xuICAgIH1cblxuICAgIHJldHVybiBuZXdOb2RlO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDb3B5IGFsbCB0aGUgZGF0YSBmcm9tIG9uZSBlbGVtZW50IHRvIGFub3RoZXIgYW5kIHJlcGxhY2UgaW4gcGxhY2UuXG4gICAqXG4gICAqIEBwYXJhbSAge05vZGV9IG5ld05vZGVcbiAgICogQHBhcmFtICB7Tm9kZX0gb2xkTm9kZVxuICAgKiBAcmV0dXJuIHtOb2RlfVxuICAgKi9cbiAgdmFyIGNvcHlBbmRSZXBsYWNlTm9kZSA9IGZ1bmN0aW9uIChuZXdOb2RlLCBvbGROb2RlKSB7XG4gICAgb2xkTm9kZS5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChjb3B5Tm9kZShuZXdOb2RlLCBvbGROb2RlKSwgb2xkTm9kZSk7XG4gICAgcmV0dXJuIG5ld05vZGU7XG4gIH07XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBlbGVtZW50IGFuZCBzdWJzY3JpYmUgdG8gYW55IGNoYW5nZXMuIFRoaXMgbWV0aG9kIHJlcXVpcmVzIGFcbiAgICogY2FsbGJhY2sgZnVuY3Rpb24gZm9yIGFueSBlbGVtZW50IGNoYW5nZXMgc2luY2UgeW91IGNhbid0IGNoYW5nZSBhIHRhZ1xuICAgKiBuYW1lIGluIHBsYWNlLlxuICAgKlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGNiXG4gICAqIEByZXR1cm4ge0VsZW1lbnR9XG4gICAqL1xuICBjb250YWluZXIuY3JlYXRlRWxlbWVudCA9IGZ1bmN0aW9uIChmbiwgY2IpIHtcbiAgICB2YXIgc3Vic2NyaXB0aW9uID0gVk0uc3Vic2NyaWJlKGZuLCBlbnYpO1xuICAgIHZhciBlbCAgICAgICAgICAgPSBjcmVhdGVFbGVtZW50KHN1YnNjcmlwdGlvbigpLCBlbnYpO1xuXG4gICAgc3Vic2NyaXB0aW9uLnVwZGF0ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgY2IoZWwgPSBjb3B5QW5kUmVwbGFjZU5vZGUoY3JlYXRlRWxlbWVudCh2YWx1ZSwgZW52KSwgZWwpKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGVsO1xuICB9O1xuXG4gIC8qKlxuICAgKiBBcHBlbmQgYW4gZWxlbWVudCB0byB0aGUgZW5kIG9mIGFub3RoZXIgZWxlbWVudC5cbiAgICpcbiAgICogQHBhcmFtIHtOb2RlfSBwYXJlbnRcbiAgICogQHBhcmFtIHtOb2RlfSBjaGlsZFxuICAgKi9cbiAgY29udGFpbmVyLmFwcGVuZENoaWxkID0gZnVuY3Rpb24gKHBhcmVudCwgY2hpbGQpIHtcbiAgICBpZiAoIWNoaWxkKSB7IHJldHVybjsgfVxuXG4gICAgcGFyZW50LmFwcGVuZENoaWxkKGNoaWxkKTtcbiAgICBlbnYuZW1pdCgnYXBwZW5kQ2hpbGQnLCBwYXJlbnQsIGNoaWxkKTtcbiAgfTtcblxuICAvKipcbiAgICogU2V0IGFuIGVsZW1lbnRzIGF0dHJpYnV0ZS4gV2UgYWNjZXB0IHRoZSBjdXJyZW50IGVsZW1lbnQgYSBmdW5jdGlvblxuICAgKiBiZWNhdXNlIHdoZW4gYSB0YWcgbmFtZSBjaGFuZ2VzIHdlIHdpbGwgbG9zZSByZWZlcmVuY2UgdG8gdGhlIGFjdGl2ZWx5XG4gICAqIHJlbmRlcmVkIGVsZW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGVsZW1lbnRGblxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBuYW1lRm5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gdmFsdWVGblxuICAgKi9cbiAgY29udGFpbmVyLnNldEF0dHJpYnV0ZSA9IGZ1bmN0aW9uIChlbGVtZW50Rm4sIG5hbWVGbiwgdmFsdWVGbikge1xuICAgIHZhciBuYW1lU3Vic2NyaXB0aW9uICA9IFZNLnN1YnNjcmliZShuYW1lRm4sIGVudik7XG4gICAgdmFyIHZhbHVlU3Vic2NyaXB0aW9uID0gVk0uc3Vic2NyaWJlKHZhbHVlRm4sIGVudik7XG5cbiAgICAvLyBLZWVwIHRyYWNrIG9mIHRoZSBjdXJyZW50IG5hbWUgYW5kIHZhbHVlIHdpdGhvdXQgaGF2aW5nIHRvIHJlLXJ1biB0aGVcbiAgICAvLyBmdW5jdGlvbiBldmVyeSB0aW1lIHNvbWV0aGluZyBjaGFuZ2VzLlxuICAgIHZhciBhdHRyTmFtZSAgPSBuYW1lU3Vic2NyaXB0aW9uKCk7XG4gICAgdmFyIGF0dHJWYWx1ZSA9IHZhbHVlU3Vic2NyaXB0aW9uKCk7XG5cbiAgICBuYW1lU3Vic2NyaXB0aW9uLnVwZGF0ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgcmVtb3ZlQXR0cmlidXRlKGVsZW1lbnRGbigpLCBhdHRyTmFtZSk7XG4gICAgICBzZXRBdHRyaWJ1dGUoZWxlbWVudEZuKCksIGF0dHJOYW1lID0gdmFsdWUsIGF0dHJWYWx1ZSk7XG4gICAgfTtcblxuICAgIHZhbHVlU3Vic2NyaXB0aW9uLnVwZGF0ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgc2V0QXR0cmlidXRlKGVsZW1lbnRGbigpLCBhdHRyTmFtZSwgYXR0clZhbHVlID0gdmFsdWUpO1xuICAgIH07XG5cbiAgICByZXR1cm4gc2V0QXR0cmlidXRlKGVsZW1lbnRGbigpLCBhdHRyTmFtZSwgYXR0clZhbHVlKTtcbiAgfTtcblxuICAvKipcbiAgICogQ3JlYXRlIGEgRE9NIGVsZW1lbnQgYW5kIHN1YnNjcmliZSB0byBhbnkgY2hhbmdlcy5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gICAqIEByZXR1cm4ge05vZGV9XG4gICAqL1xuICBjb250YWluZXIuY3JlYXRlRE9NID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgcmV0dXJuIHN1YnNjcmliZU5vZGUoZm4sIFV0aWxzLmRvbWlmeUV4cHJlc3Npb24pO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSB0ZXh0IG5vZGUgYW5kIHN1YnNjcmliZSB0byBhbnkgY2hhbmdlcy5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gICAqIEByZXR1cm4ge1RleHR9XG4gICAqL1xuICBjb250YWluZXIuY3JlYXRlVGV4dCA9IGZ1bmN0aW9uIChmbikge1xuICAgIHJldHVybiBzdWJzY3JpYmVOb2RlKGZuLCBVdGlscy50ZXh0aWZ5RXhwcmVzc2lvbik7XG4gIH07XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIGNvbW1lbnQgbm9kZSBhbmQgc3Vic2NyaWJlIHRvIGFueSBjaGFuZ2VzLlxuICAgKlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAgICogQHJldHVybiB7Q29tbWVudH1cbiAgICovXG4gIGNvbnRhaW5lci5jcmVhdGVDb21tZW50ID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgdmFyIHN1YnNjcmlwdGlvbiA9IFZNLnN1YnNjcmliZShmbiwgZW52KTtcbiAgICB2YXIgbm9kZSAgICAgICAgID0gY3JlYXRlQ29tbWVudChzdWJzY3JpcHRpb24oKSk7XG5cbiAgICBzdWJzY3JpcHRpb24udXBkYXRlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICBub2RlLnRleHRDb250ZW50ID0gdmFsdWU7XG4gICAgfTtcblxuICAgIHJldHVybiBub2RlO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYW5kIHJldHVybiBhIHByb2dyYW0gc2luZ2xldG9uIGJhc2VkIG9uIGluZGV4LlxuICAgKlxuICAgKiBAcGFyYW0gIHtOdW1iZXJ9ICAgaVxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAgICogQHBhcmFtICB7T2JqZWN0fSAgIGRhdGFcbiAgICogQHJldHVybiB7RnVuY3Rpb259XG4gICAqL1xuICBjb250YWluZXIucHJvZ3JhbSA9IGZ1bmN0aW9uIChpLCBmbiwgZGF0YSkge1xuICAgIHZhciBwcm9ncmFtV3JhcHBlciA9IGNvbnRhaW5lci5wcm9ncmFtc1tpXTtcblxuICAgIGlmIChkYXRhKSB7XG4gICAgICByZXR1cm4gVk0ucHJvZ3JhbShpLCBmbiwgZGF0YSk7XG4gICAgfVxuXG4gICAgaWYgKCFwcm9ncmFtV3JhcHBlcikge1xuICAgICAgcmV0dXJuIGNvbnRhaW5lci5wcm9ncmFtc1tpXSA9IFZNLnByb2dyYW0oaSwgZm4pO1xuICAgIH1cblxuICAgIHJldHVybiBwcm9ncmFtV3JhcHBlcjtcbiAgfTtcblxuICAvKipcbiAgICogV3JhcCBwcm9ncmFtIGZ1bmN0aW9ucyB3aXRoIHN1YnNjcmliZXIgZnVuY3Rpb25hbGl0eS5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IHByb2dyYW1cbiAgICogQHJldHVybiB7RnVuY3Rpb259XG4gICAqL1xuICBjb250YWluZXIud3JhcFByb2dyYW0gPSBmdW5jdGlvbiAoZm4pIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIHdyYXBTdWJzY3JpYmVyKGZuKS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH07XG5cbiAgLyoqXG4gICAqIE1lcmdlIHR3byBvYmplY3RzIGludG8gYSBzaW5nbGUgb2JqZWN0LlxuICAgKlxuICAgKiBAcGFyYW0gIHtPYmplY3R9IHBhcmFtXG4gICAqIEBwYXJhbSAge09iamVjdH0gY29tbW9uXG4gICAqIEByZXR1cm4ge09iamVjdH1cbiAgICovXG4gIGNvbnRhaW5lci5tZXJnZSA9IGZ1bmN0aW9uIChwYXJhbSwgY29tbW9uKSB7XG4gICAgdmFyIHJldCA9IHBhcmFtIHx8IGNvbW1vbjtcblxuICAgIGlmIChwYXJhbSAmJiBjb21tb24gJiYgKHBhcmFtICE9PSBjb21tb24pKSB7XG4gICAgICByZXQgPSB7fTtcbiAgICAgIFV0aWxzLmV4dGVuZChyZXQsIGNvbW1vbik7XG4gICAgICBVdGlscy5leHRlbmQocmV0LCBwYXJhbSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldDtcbiAgfTtcblxuICAvKipcbiAgICogR2V0IGEgcHJvcGVydHkgZnJvbSBhbiBvYmplY3QuIFBhc3NlcyBpbiB0aGUgb2JqZWN0IGlkIChkZXB0aCkgdG8gbWFrZSBpdFxuICAgKiBtdWNoIGZhc3RlciB0byBkbyBjb21wYXJpc29ucyBiZXR3ZWVuIG5ldyBhbmQgb2xkIHN1YnNjcmlwdGlvbnMuXG4gICAqXG4gICAqIEBwYXJhbSAge09iamVjdH0gb2JqZWN0XG4gICAqIEBwYXJhbSAge1N0cmluZ30gcHJvcGVydHlcbiAgICogQHBhcmFtICB7U3RyaW5nfSBpZFxuICAgKiBAcmV0dXJuIHsqfVxuICAgKi9cbiAgY29udGFpbmVyLmdldCA9IGZ1bmN0aW9uIChvYmplY3QsIHByb3BlcnR5LCBpZCkge1xuICAgIHZhciBzdWJzY3JpcHRpb25zID0gVk0uc3Vic2NyaWJlci5zdWJzY3JpcHRpb25zO1xuXG4gICAgKHN1YnNjcmlwdGlvbnNbcHJvcGVydHldIHx8IChzdWJzY3JpcHRpb25zW3Byb3BlcnR5XSA9IHt9KSlbaWRdID0gb2JqZWN0O1xuXG4gICAgcmV0dXJuIGVudi5nZXQob2JqZWN0LCBwcm9wZXJ0eSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgY29tcGlsZWQgSmF2YVNjcmlwdCBmdW5jdGlvbiBmb3IgZXhlY3V0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGNvbnRleHRcbiAgICogQHBhcmFtICB7T2JqZWN0fSBvcHRpb25zXG4gICAqIEByZXR1cm4ge05vZGV9XG4gICAqL1xuICByZXR1cm4gd3JhcFN1YnNjcmliZXIoZnVuY3Rpb24gKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIHZhciBuYW1lc3BhY2UgPSBvcHRpb25zLnBhcnRpYWwgPyBvcHRpb25zIDogZW52O1xuICAgIHZhciBoZWxwZXJzO1xuICAgIHZhciBwYXJ0aWFscztcblxuICAgIGlmICghb3B0aW9ucy5wYXJ0aWFsKSB7XG4gICAgICBoZWxwZXJzICA9IG9wdGlvbnMuaGVscGVycztcbiAgICAgIHBhcnRpYWxzID0gb3B0aW9ucy5wYXJ0aWFscztcbiAgICB9XG5cbiAgICB2YXIgcmVzdWx0ID0gdGVtcGxhdGVTcGVjLmNhbGwoXG4gICAgICBjb250YWluZXIsXG4gICAgICBuYW1lc3BhY2UsXG4gICAgICBjb250ZXh0LFxuICAgICAgaGVscGVycyxcbiAgICAgIHBhcnRpYWxzLFxuICAgICAgb3B0aW9ucy5kYXRhXG4gICAgKTtcblxuICAgIGlmICghb3B0aW9ucy5wYXJ0aWFsKSB7XG4gICAgICBlbnYuVk0uY2hlY2tSZXZpc2lvbihjb250YWluZXIuY29tcGlsZXJJbmZvKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9KTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9zYWZlLXN0cmluZycpLmRlZmF1bHQ7XG4iLCJ2YXIgVHJhY2tOb2RlID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAobm9kZSkge1xuICB0aGlzLmZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuXG4gIC8vIEluc3RhbnRseSBhcHBlbmQgYSBiZWZvcmUgYW5kIGFmdGVyIHRyYWNraW5nIG5vZGUuXG4gIHRoaXMuYmVmb3JlID0gdGhpcy5mcmFnbWVudC5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJykpO1xuICB0aGlzLmFmdGVyICA9IHRoaXMuZnJhZ21lbnQuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpKTtcblxuICAvLyBBcHBlbmQgdGhlIHBhc3NlZCBpbiBub2RlIHRvIHRoZSBjdXJyZW50IGZyYWdtZW50LlxuICBub2RlICYmIHRoaXMuYXBwZW5kQ2hpbGQobm9kZSk7XG59O1xuXG4vKipcbiAqIEFwcGVuZCBhIG5vZGUgdG8gdGhlIGN1cnJlbnQgdHJhY2tpbmcgZnJhZ21lbnQuXG4gKlxuICogQHBhcmFtICB7Tm9kZX0gbm9kZVxuICogQHJldHVybiB7dGhpc31cbiAqL1xuVHJhY2tOb2RlLnByb3RvdHlwZS5hcHBlbmRDaGlsZCA9IGZ1bmN0aW9uIChub2RlKSB7XG4gIHRoaXMuYWZ0ZXIucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUobm9kZSwgdGhpcy5hZnRlcik7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFByZXBlbmQgYSBub2RlIHRvIHRoZSBjdXJyZW50IHRyYWNraW5nIGZyYWdtZW50LlxuICpcbiAqIEBwYXJhbSAge05vZGV9IG5vZGVcbiAqIEByZXR1cm4ge3RoaXN9XG4gKi9cblRyYWNrTm9kZS5wcm90b3R5cGUucHJlcGVuZENoaWxkID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgdGhpcy5iZWZvcmUucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUobm9kZSwgdGhpcy5iZWZvcmUubmV4dFNpYmxpbmcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgYWxsIGVsZW1lbnRzIGJldHdlZW4gdGhlIHR3byB0cmFja2luZyBub2Rlcy5cbiAqXG4gKiBAcGFyYW0gIHtOb2RlfSBub2RlXG4gKiBAcmV0dXJuIHt0aGlzfVxuICovXG5UcmFja05vZGUucHJvdG90eXBlLmVtcHR5ID0gZnVuY3Rpb24gKCkge1xuICB3aGlsZSAodGhpcy5iZWZvcmUubmV4dFNpYmxpbmcgIT09IHRoaXMuYWZ0ZXIpIHtcbiAgICB0aGlzLmJlZm9yZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMuYmVmb3JlLm5leHRTaWJsaW5nKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgdGhlIHRoZSBlbGVtZW50cyBmcm9tIHRoZSBET00uXG4gKlxuICogQHBhcmFtICB7Tm9kZX0gbm9kZVxuICogQHJldHVybiB7dGhpc31cbiAqL1xuVHJhY2tOb2RlLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAoKSB7XG4gIHdoaWxlICh0aGlzLmJlZm9yZS5uZXh0U2libGluZyAhPT0gdGhpcy5hZnRlcikge1xuICAgIHRoaXMuZnJhZ21lbnQuYXBwZW5kQ2hpbGQodGhpcy5iZWZvcmUubmV4dFNpYmxpbmcpO1xuICB9XG5cbiAgLy8gUHVsbCB0aGUgdHdvIHJlZmVyZW5jZSBub2RlcyBvdXQgb2YgdGhlIERPTSBhbmQgaW50byB0aGUgZnJhZ21lbnQuXG4gIHRoaXMuZnJhZ21lbnQuYXBwZW5kQ2hpbGQodGhpcy5hZnRlcik7XG4gIHRoaXMuZnJhZ21lbnQuaW5zZXJ0QmVmb3JlKHRoaXMuYmVmb3JlLCB0aGlzLmZyYWdtZW50LmZpcnN0Q2hpbGQpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZXBsYWNlIHRoZSBjb250ZW50cyBvZiB0aGUgdHJhY2tpbmcgbm9kZSB3aXRoIG5ldyBjb250ZW50cy5cbiAqXG4gKiBAcGFyYW0gIHtOb2RlfSBub2RlXG4gKiBAcmV0dXJuIHt0aGlzfVxuICovXG5UcmFja05vZGUucHJvdG90eXBlLnJlcGxhY2UgPSBmdW5jdGlvbiAobm9kZSkge1xuICByZXR1cm4gdGhpcy5lbXB0eSgpLmFwcGVuZENoaWxkKG5vZGUpO1xufTtcbiIsInZhciBoYnNVdGlscyAgID0gcmVxdWlyZSgnaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3V0aWxzJyk7XG52YXIgdW5pcXVlSWQgICA9IDA7XG52YXIgVHJhY2tOb2RlICA9IHJlcXVpcmUoJy4vdHJhY2stbm9kZScpO1xudmFyIFNhZmVTdHJpbmcgPSByZXF1aXJlKCcuL3NhZmUtc3RyaW5nJyk7XG5cbi8qKlxuICogU2ltcGxlIHdheSB0byBzdWJjbGFzcyBhbiBvYmplY3QsIHdpdGggc3VwcG9ydCBmb3Igb2xkZXIgYnJvd3NlcnMuXG4gKlxuICogQHJldHVybiB7T2JqZWN0fVxuICovXG52YXIgY3JlYXRlID0gT2JqZWN0LmNyZWF0ZSB8fCAoZnVuY3Rpb24gKCkge1xuICB2YXIgRiA9IGZ1bmN0aW9uICgpIHt9O1xuXG4gIHJldHVybiBmdW5jdGlvbiAobykge1xuICAgIEYucHJvdG90eXBlID0gbztcbiAgICB2YXIgb2JqID0gbmV3IEYoKTtcbiAgICBGLnByb3RvdHlwZSA9IG51bGw7XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcbn0pKCk7XG5cbi8qKlxuICogRXh0ZW5kIEhhbmRsZWJhcnMgdXRpbGl0aWVzIHdpdGggRE9NIGZ1bmN0aW9uYWxpdHkuXG4gKlxuICogQHR5cGUge09iamVjdH1cbiAqL1xudmFyIFV0aWxzID0gbW9kdWxlLmV4cG9ydHMgPSBjcmVhdGUoaGJzVXRpbHMpO1xuXG4vKipcbiAqIFJldHVybiBhIHVuaXF1ZSBpZC5cbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9XG4gKi9cblV0aWxzLnVuaXF1ZUlkID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdW5pcXVlSWQrKztcbn07XG5cbi8qKlxuICogRXhwb3NlIHRoZSBjcmVhdGUgZnVuY3Rpb24uXG4gKlxuICogQHR5cGUge0Z1bmN0aW9ufVxuICovXG5VdGlscy5jcmVhdGUgPSBjcmVhdGU7XG5cbi8qKlxuICogQ2hlY2sgd2hldGhlciBhbiBvYmplY3QgaXMgYWN0dWFsbHkgYSBET00gbm9kZS5cbiAqXG4gKiBAcGFyYW0gIHsqfSAgICAgICBlbGVtZW50XG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICovXG5VdGlscy5pc05vZGUgPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICByZXR1cm4gZWxlbWVudCBpbnN0YW5jZW9mIE5vZGU7XG59O1xuXG4vKipcbiAqIFRyYWNrIGEgbm9kZSBpbnN0YW5jZSBhbnl3aGVyZSBpdCBnb2VzIGluIHRoZSBET00uXG4gKlxuICogQHBhcmFtICB7Tm9kZX0gICAgICBub2RlXG4gKiBAcmV0dXJuIHtUcmFja05vZGV9XG4gKi9cblV0aWxzLnRyYWNrTm9kZSA9IGZ1bmN0aW9uIChub2RlKSB7XG4gIHJldHVybiBuZXcgVHJhY2tOb2RlKG5vZGUpO1xufTtcblxuLyoqXG4gKiBUcmFuc2Zvcm0gYSBzdHJpbmcgaW50byBhcmJpdHJhcnkgRE9NIG5vZGVzLlxuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gc3RyaW5nXG4gKiBAcmV0dXJuIHtOb2RlfVxuICovXG5VdGlscy5kb21pZnlFeHByZXNzaW9uID0gZnVuY3Rpb24gKHN0cmluZykge1xuICAvLyBJZiB3ZSBwYXNzZWQgaW4gYSBzYWZlIHN0cmluZywgZ2V0IHRoZSBhY3R1YWwgdmFsdWUuXG4gIGlmIChzdHJpbmcgaW5zdGFuY2VvZiBTYWZlU3RyaW5nKSB7XG4gICAgc3RyaW5nID0gc3RyaW5nLnN0cmluZztcbiAgfVxuXG4gIC8vIE5vIG5lZWQgdG8gY29lcmNlIGEgbm9kZS5cbiAgaWYgKFV0aWxzLmlzTm9kZShzdHJpbmcpKSB7XG4gICAgcmV0dXJuIHN0cmluZztcbiAgfVxuXG4gIHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgZGl2LmlubmVySFRNTCA9IHN0cmluZztcblxuICBpZiAoZGl2LmNoaWxkTm9kZXMubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIGRpdi5yZW1vdmVDaGlsZChkaXYuY2hpbGROb2Rlc1swXSk7XG4gIH1cblxuICB2YXIgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG5cbiAgd2hpbGUgKGRpdi5maXJzdENoaWxkKSB7XG4gICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQoZGl2LmZpcnN0Q2hpbGQpO1xuICB9XG5cbiAgcmV0dXJuIGZyYWdtZW50O1xufTtcblxuLyoqXG4gKiBUcmFuc2Zvcm0gYSBzdHJpbmcgaW50byBhIERPTSB0ZXh0IG5vZGUgZm9yIGFwcGVuZGluZyB0byB0aGUgdGVtcGxhdGUuXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBzdHJpbmdcbiAqIEByZXR1cm4ge1RleHR9XG4gKi9cblV0aWxzLnRleHRpZnlFeHByZXNzaW9uID0gZnVuY3Rpb24gKHN0cmluZykge1xuICBpZiAoc3RyaW5nIGluc3RhbmNlb2YgU2FmZVN0cmluZykge1xuICAgIHJldHVybiBVdGlscy5kb21pZnlFeHByZXNzaW9uKHN0cmluZy5zdHJpbmcpO1xuICB9XG5cbiAgLy8gQ2F0Y2ggd2hlbiB0aGUgc3RyaW5nIGlzIGFjdHVhbGx5IGEgRE9NIG5vZGUgYW5kIHR1cm4gaXQgaW50byBhIHN0cmluZy5cbiAgaWYgKFV0aWxzLmlzTm9kZShzdHJpbmcpKSB7XG4gICAgLy8gQWxyZWFkeSBhIHRleHQgbm9kZSwganVzdCByZXR1cm4gaXQgaW1tZWRpYXRlbHkuXG4gICAgaWYgKHN0cmluZy5ub2RlVHlwZSA9PT0gMykge1xuICAgICAgcmV0dXJuIHN0cmluZztcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHN0cmluZy5vdXRlckhUTUwgPT09ICdzdHJpbmcnKSB7XG4gICAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoc3RyaW5nLm91dGVySFRNTCk7XG4gICAgfVxuXG4gICAgdmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGRpdi5hcHBlbmRDaGlsZChzdHJpbmcuY2xvbmVOb2RlKHRydWUpKTtcbiAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoZGl2LmlubmVySFRNTCk7XG4gIH1cblxuICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoc3RyaW5nID09IG51bGwgPyAnJyA6IHN0cmluZyk7XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgVXRpbHMgPSByZXF1aXJlKFwiLi91dGlsc1wiKTtcbnZhciBFeGNlcHRpb24gPSByZXF1aXJlKFwiLi9leGNlcHRpb25cIilbXCJkZWZhdWx0XCJdO1xuXG52YXIgVkVSU0lPTiA9IFwiMS4yLjBcIjtcbmV4cG9ydHMuVkVSU0lPTiA9IFZFUlNJT047dmFyIENPTVBJTEVSX1JFVklTSU9OID0gNDtcbmV4cG9ydHMuQ09NUElMRVJfUkVWSVNJT04gPSBDT01QSUxFUl9SRVZJU0lPTjtcbnZhciBSRVZJU0lPTl9DSEFOR0VTID0ge1xuICAxOiAnPD0gMS4wLnJjLjInLCAvLyAxLjAucmMuMiBpcyBhY3R1YWxseSByZXYyIGJ1dCBkb2Vzbid0IHJlcG9ydCBpdFxuICAyOiAnPT0gMS4wLjAtcmMuMycsXG4gIDM6ICc9PSAxLjAuMC1yYy40JyxcbiAgNDogJz49IDEuMC4wJ1xufTtcbmV4cG9ydHMuUkVWSVNJT05fQ0hBTkdFUyA9IFJFVklTSU9OX0NIQU5HRVM7XG52YXIgaXNBcnJheSA9IFV0aWxzLmlzQXJyYXksXG4gICAgaXNGdW5jdGlvbiA9IFV0aWxzLmlzRnVuY3Rpb24sXG4gICAgdG9TdHJpbmcgPSBVdGlscy50b1N0cmluZyxcbiAgICBvYmplY3RUeXBlID0gJ1tvYmplY3QgT2JqZWN0XSc7XG5cbmZ1bmN0aW9uIEhhbmRsZWJhcnNFbnZpcm9ubWVudChoZWxwZXJzLCBwYXJ0aWFscykge1xuICB0aGlzLmhlbHBlcnMgPSBoZWxwZXJzIHx8IHt9O1xuICB0aGlzLnBhcnRpYWxzID0gcGFydGlhbHMgfHwge307XG5cbiAgcmVnaXN0ZXJEZWZhdWx0SGVscGVycyh0aGlzKTtcbn1cblxuZXhwb3J0cy5IYW5kbGViYXJzRW52aXJvbm1lbnQgPSBIYW5kbGViYXJzRW52aXJvbm1lbnQ7SGFuZGxlYmFyc0Vudmlyb25tZW50LnByb3RvdHlwZSA9IHtcbiAgY29uc3RydWN0b3I6IEhhbmRsZWJhcnNFbnZpcm9ubWVudCxcblxuICBsb2dnZXI6IGxvZ2dlcixcbiAgbG9nOiBsb2csXG5cbiAgcmVnaXN0ZXJIZWxwZXI6IGZ1bmN0aW9uKG5hbWUsIGZuLCBpbnZlcnNlKSB7XG4gICAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICAgIGlmIChpbnZlcnNlIHx8IGZuKSB7IHRocm93IG5ldyBFeGNlcHRpb24oJ0FyZyBub3Qgc3VwcG9ydGVkIHdpdGggbXVsdGlwbGUgaGVscGVycycpOyB9XG4gICAgICBVdGlscy5leHRlbmQodGhpcy5oZWxwZXJzLCBuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGludmVyc2UpIHsgZm4ubm90ID0gaW52ZXJzZTsgfVxuICAgICAgdGhpcy5oZWxwZXJzW25hbWVdID0gZm47XG4gICAgfVxuICB9LFxuXG4gIHJlZ2lzdGVyUGFydGlhbDogZnVuY3Rpb24obmFtZSwgc3RyKSB7XG4gICAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICAgIFV0aWxzLmV4dGVuZCh0aGlzLnBhcnRpYWxzLCAgbmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucGFydGlhbHNbbmFtZV0gPSBzdHI7XG4gICAgfVxuICB9XG59O1xuXG5mdW5jdGlvbiByZWdpc3RlckRlZmF1bHRIZWxwZXJzKGluc3RhbmNlKSB7XG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdoZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24oYXJnKSB7XG4gICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PT0gMikge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyBoZWxwZXI6ICdcIiArIGFyZyArIFwiJ1wiKTtcbiAgICB9XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdibG9ja0hlbHBlck1pc3NpbmcnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgdmFyIGludmVyc2UgPSBvcHRpb25zLmludmVyc2UgfHwgZnVuY3Rpb24oKSB7fSwgZm4gPSBvcHRpb25zLmZuO1xuXG4gICAgaWYgKGlzRnVuY3Rpb24oY29udGV4dCkpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gICAgaWYoY29udGV4dCA9PT0gdHJ1ZSkge1xuICAgICAgcmV0dXJuIGZuKHRoaXMpO1xuICAgIH0gZWxzZSBpZihjb250ZXh0ID09PSBmYWxzZSB8fCBjb250ZXh0ID09IG51bGwpIHtcbiAgICAgIHJldHVybiBpbnZlcnNlKHRoaXMpO1xuICAgIH0gZWxzZSBpZiAoaXNBcnJheShjb250ZXh0KSkge1xuICAgICAgaWYoY29udGV4dC5sZW5ndGggPiAwKSB7XG4gICAgICAgIHJldHVybiBpbnN0YW5jZS5oZWxwZXJzLmVhY2goY29udGV4dCwgb3B0aW9ucyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gaW52ZXJzZSh0aGlzKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZuKGNvbnRleHQpO1xuICAgIH1cbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2VhY2gnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgdmFyIGZuID0gb3B0aW9ucy5mbiwgaW52ZXJzZSA9IG9wdGlvbnMuaW52ZXJzZTtcbiAgICB2YXIgaSA9IDAsIHJldCA9IFwiXCIsIGRhdGE7XG5cbiAgICBpZiAoaXNGdW5jdGlvbihjb250ZXh0KSkgeyBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpOyB9XG5cbiAgICBpZiAob3B0aW9ucy5kYXRhKSB7XG4gICAgICBkYXRhID0gY3JlYXRlRnJhbWUob3B0aW9ucy5kYXRhKTtcbiAgICB9XG5cbiAgICBpZihjb250ZXh0ICYmIHR5cGVvZiBjb250ZXh0ID09PSAnb2JqZWN0Jykge1xuICAgICAgaWYgKGlzQXJyYXkoY29udGV4dCkpIHtcbiAgICAgICAgZm9yKHZhciBqID0gY29udGV4dC5sZW5ndGg7IGk8ajsgaSsrKSB7XG4gICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgIGRhdGEuaW5kZXggPSBpO1xuICAgICAgICAgICAgZGF0YS5maXJzdCA9IChpID09PSAwKTtcbiAgICAgICAgICAgIGRhdGEubGFzdCAgPSAoaSA9PT0gKGNvbnRleHQubGVuZ3RoLTEpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0ID0gcmV0ICsgZm4oY29udGV4dFtpXSwgeyBkYXRhOiBkYXRhIH0pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3IodmFyIGtleSBpbiBjb250ZXh0KSB7XG4gICAgICAgICAgaWYoY29udGV4dC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICBpZihkYXRhKSB7IFxuICAgICAgICAgICAgICBkYXRhLmtleSA9IGtleTsgXG4gICAgICAgICAgICAgIGRhdGEuaW5kZXggPSBpO1xuICAgICAgICAgICAgICBkYXRhLmZpcnN0ID0gKGkgPT09IDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0ID0gcmV0ICsgZm4oY29udGV4dFtrZXldLCB7ZGF0YTogZGF0YX0pO1xuICAgICAgICAgICAgaSsrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmKGkgPT09IDApe1xuICAgICAgcmV0ID0gaW52ZXJzZSh0aGlzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmV0O1xuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignaWYnLCBmdW5jdGlvbihjb25kaXRpb25hbCwgb3B0aW9ucykge1xuICAgIGlmIChpc0Z1bmN0aW9uKGNvbmRpdGlvbmFsKSkgeyBjb25kaXRpb25hbCA9IGNvbmRpdGlvbmFsLmNhbGwodGhpcyk7IH1cblxuICAgIC8vIERlZmF1bHQgYmVoYXZpb3IgaXMgdG8gcmVuZGVyIHRoZSBwb3NpdGl2ZSBwYXRoIGlmIHRoZSB2YWx1ZSBpcyB0cnV0aHkgYW5kIG5vdCBlbXB0eS5cbiAgICAvLyBUaGUgYGluY2x1ZGVaZXJvYCBvcHRpb24gbWF5IGJlIHNldCB0byB0cmVhdCB0aGUgY29uZHRpb25hbCBhcyBwdXJlbHkgbm90IGVtcHR5IGJhc2VkIG9uIHRoZVxuICAgIC8vIGJlaGF2aW9yIG9mIGlzRW1wdHkuIEVmZmVjdGl2ZWx5IHRoaXMgZGV0ZXJtaW5lcyBpZiAwIGlzIGhhbmRsZWQgYnkgdGhlIHBvc2l0aXZlIHBhdGggb3IgbmVnYXRpdmUuXG4gICAgaWYgKCghb3B0aW9ucy5oYXNoLmluY2x1ZGVaZXJvICYmICFjb25kaXRpb25hbCkgfHwgVXRpbHMuaXNFbXB0eShjb25kaXRpb25hbCkpIHtcbiAgICAgIHJldHVybiBvcHRpb25zLmludmVyc2UodGhpcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBvcHRpb25zLmZuKHRoaXMpO1xuICAgIH1cbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ3VubGVzcycsIGZ1bmN0aW9uKGNvbmRpdGlvbmFsLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIGluc3RhbmNlLmhlbHBlcnNbJ2lmJ10uY2FsbCh0aGlzLCBjb25kaXRpb25hbCwge2ZuOiBvcHRpb25zLmludmVyc2UsIGludmVyc2U6IG9wdGlvbnMuZm4sIGhhc2g6IG9wdGlvbnMuaGFzaH0pO1xuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignd2l0aCcsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBpZiAoaXNGdW5jdGlvbihjb250ZXh0KSkgeyBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpOyB9XG5cbiAgICBpZiAoIVV0aWxzLmlzRW1wdHkoY29udGV4dCkpIHJldHVybiBvcHRpb25zLmZuKGNvbnRleHQpO1xuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignbG9nJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIHZhciBsZXZlbCA9IG9wdGlvbnMuZGF0YSAmJiBvcHRpb25zLmRhdGEubGV2ZWwgIT0gbnVsbCA/IHBhcnNlSW50KG9wdGlvbnMuZGF0YS5sZXZlbCwgMTApIDogMTtcbiAgICBpbnN0YW5jZS5sb2cobGV2ZWwsIGNvbnRleHQpO1xuICB9KTtcbn1cblxudmFyIGxvZ2dlciA9IHtcbiAgbWV0aG9kTWFwOiB7IDA6ICdkZWJ1ZycsIDE6ICdpbmZvJywgMjogJ3dhcm4nLCAzOiAnZXJyb3InIH0sXG5cbiAgLy8gU3RhdGUgZW51bVxuICBERUJVRzogMCxcbiAgSU5GTzogMSxcbiAgV0FSTjogMixcbiAgRVJST1I6IDMsXG4gIGxldmVsOiAzLFxuXG4gIC8vIGNhbiBiZSBvdmVycmlkZGVuIGluIHRoZSBob3N0IGVudmlyb25tZW50XG4gIGxvZzogZnVuY3Rpb24obGV2ZWwsIG9iaikge1xuICAgIGlmIChsb2dnZXIubGV2ZWwgPD0gbGV2ZWwpIHtcbiAgICAgIHZhciBtZXRob2QgPSBsb2dnZXIubWV0aG9kTWFwW2xldmVsXTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcgJiYgY29uc29sZVttZXRob2RdKSB7XG4gICAgICAgIGNvbnNvbGVbbWV0aG9kXS5jYWxsKGNvbnNvbGUsIG9iaik7XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuZXhwb3J0cy5sb2dnZXIgPSBsb2dnZXI7XG5mdW5jdGlvbiBsb2cobGV2ZWwsIG9iaikgeyBsb2dnZXIubG9nKGxldmVsLCBvYmopOyB9XG5cbmV4cG9ydHMubG9nID0gbG9nO3ZhciBjcmVhdGVGcmFtZSA9IGZ1bmN0aW9uKG9iamVjdCkge1xuICB2YXIgb2JqID0ge307XG4gIFV0aWxzLmV4dGVuZChvYmosIG9iamVjdCk7XG4gIHJldHVybiBvYmo7XG59O1xuZXhwb3J0cy5jcmVhdGVGcmFtZSA9IGNyZWF0ZUZyYW1lOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgZXJyb3JQcm9wcyA9IFsnZGVzY3JpcHRpb24nLCAnZmlsZU5hbWUnLCAnbGluZU51bWJlcicsICdtZXNzYWdlJywgJ25hbWUnLCAnbnVtYmVyJywgJ3N0YWNrJ107XG5cbmZ1bmN0aW9uIEV4Y2VwdGlvbigvKiBtZXNzYWdlICovKSB7XG4gIHZhciB0bXAgPSBFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAvLyBVbmZvcnR1bmF0ZWx5IGVycm9ycyBhcmUgbm90IGVudW1lcmFibGUgaW4gQ2hyb21lIChhdCBsZWFzdCksIHNvIGBmb3IgcHJvcCBpbiB0bXBgIGRvZXNuJ3Qgd29yay5cbiAgZm9yICh2YXIgaWR4ID0gMDsgaWR4IDwgZXJyb3JQcm9wcy5sZW5ndGg7IGlkeCsrKSB7XG4gICAgdGhpc1tlcnJvclByb3BzW2lkeF1dID0gdG1wW2Vycm9yUHJvcHNbaWR4XV07XG4gIH1cbn1cblxuRXhjZXB0aW9uLnByb3RvdHlwZSA9IG5ldyBFcnJvcigpO1xuXG5leHBvcnRzW1wiZGVmYXVsdFwiXSA9IEV4Y2VwdGlvbjsiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBVdGlscyA9IHJlcXVpcmUoXCIuL3V0aWxzXCIpO1xudmFyIEV4Y2VwdGlvbiA9IHJlcXVpcmUoXCIuL2V4Y2VwdGlvblwiKVtcImRlZmF1bHRcIl07XG52YXIgQ09NUElMRVJfUkVWSVNJT04gPSByZXF1aXJlKFwiLi9iYXNlXCIpLkNPTVBJTEVSX1JFVklTSU9OO1xudmFyIFJFVklTSU9OX0NIQU5HRVMgPSByZXF1aXJlKFwiLi9iYXNlXCIpLlJFVklTSU9OX0NIQU5HRVM7XG5cbmZ1bmN0aW9uIGNoZWNrUmV2aXNpb24oY29tcGlsZXJJbmZvKSB7XG4gIHZhciBjb21waWxlclJldmlzaW9uID0gY29tcGlsZXJJbmZvICYmIGNvbXBpbGVySW5mb1swXSB8fCAxLFxuICAgICAgY3VycmVudFJldmlzaW9uID0gQ09NUElMRVJfUkVWSVNJT047XG5cbiAgaWYgKGNvbXBpbGVyUmV2aXNpb24gIT09IGN1cnJlbnRSZXZpc2lvbikge1xuICAgIGlmIChjb21waWxlclJldmlzaW9uIDwgY3VycmVudFJldmlzaW9uKSB7XG4gICAgICB2YXIgcnVudGltZVZlcnNpb25zID0gUkVWSVNJT05fQ0hBTkdFU1tjdXJyZW50UmV2aXNpb25dLFxuICAgICAgICAgIGNvbXBpbGVyVmVyc2lvbnMgPSBSRVZJU0lPTl9DSEFOR0VTW2NvbXBpbGVyUmV2aXNpb25dO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVGVtcGxhdGUgd2FzIHByZWNvbXBpbGVkIHdpdGggYW4gb2xkZXIgdmVyc2lvbiBvZiBIYW5kbGViYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gXCIrXG4gICAgICAgICAgICBcIlBsZWFzZSB1cGRhdGUgeW91ciBwcmVjb21waWxlciB0byBhIG5ld2VyIHZlcnNpb24gKFwiK3J1bnRpbWVWZXJzaW9ucytcIikgb3IgZG93bmdyYWRlIHlvdXIgcnVudGltZSB0byBhbiBvbGRlciB2ZXJzaW9uIChcIitjb21waWxlclZlcnNpb25zK1wiKS5cIik7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFVzZSB0aGUgZW1iZWRkZWQgdmVyc2lvbiBpbmZvIHNpbmNlIHRoZSBydW50aW1lIGRvZXNuJ3Qga25vdyBhYm91dCB0aGlzIHJldmlzaW9uIHlldFxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVGVtcGxhdGUgd2FzIHByZWNvbXBpbGVkIHdpdGggYSBuZXdlciB2ZXJzaW9uIG9mIEhhbmRsZWJhcnMgdGhhbiB0aGUgY3VycmVudCBydW50aW1lLiBcIitcbiAgICAgICAgICAgIFwiUGxlYXNlIHVwZGF0ZSB5b3VyIHJ1bnRpbWUgdG8gYSBuZXdlciB2ZXJzaW9uIChcIitjb21waWxlckluZm9bMV0rXCIpLlwiKTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0cy5jaGVja1JldmlzaW9uID0gY2hlY2tSZXZpc2lvbjsvLyBUT0RPOiBSZW1vdmUgdGhpcyBsaW5lIGFuZCBicmVhayB1cCBjb21waWxlUGFydGlhbFxuXG5mdW5jdGlvbiB0ZW1wbGF0ZSh0ZW1wbGF0ZVNwZWMsIGVudikge1xuICBpZiAoIWVudikge1xuICAgIHRocm93IG5ldyBFcnJvcihcIk5vIGVudmlyb25tZW50IHBhc3NlZCB0byB0ZW1wbGF0ZVwiKTtcbiAgfVxuXG4gIC8vIE5vdGU6IFVzaW5nIGVudi5WTSByZWZlcmVuY2VzIHJhdGhlciB0aGFuIGxvY2FsIHZhciByZWZlcmVuY2VzIHRocm91Z2hvdXQgdGhpcyBzZWN0aW9uIHRvIGFsbG93XG4gIC8vIGZvciBleHRlcm5hbCB1c2VycyB0byBvdmVycmlkZSB0aGVzZSBhcyBwc3VlZG8tc3VwcG9ydGVkIEFQSXMuXG4gIHZhciBpbnZva2VQYXJ0aWFsV3JhcHBlciA9IGZ1bmN0aW9uKHBhcnRpYWwsIG5hbWUsIGNvbnRleHQsIGhlbHBlcnMsIHBhcnRpYWxzLCBkYXRhKSB7XG4gICAgdmFyIHJlc3VsdCA9IGVudi5WTS5pbnZva2VQYXJ0aWFsLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgaWYgKHJlc3VsdCAhPSBudWxsKSB7IHJldHVybiByZXN1bHQ7IH1cblxuICAgIGlmIChlbnYuY29tcGlsZSkge1xuICAgICAgdmFyIG9wdGlvbnMgPSB7IGhlbHBlcnM6IGhlbHBlcnMsIHBhcnRpYWxzOiBwYXJ0aWFscywgZGF0YTogZGF0YSB9O1xuICAgICAgcGFydGlhbHNbbmFtZV0gPSBlbnYuY29tcGlsZShwYXJ0aWFsLCB7IGRhdGE6IGRhdGEgIT09IHVuZGVmaW5lZCB9LCBlbnYpO1xuICAgICAgcmV0dXJuIHBhcnRpYWxzW25hbWVdKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKFwiVGhlIHBhcnRpYWwgXCIgKyBuYW1lICsgXCIgY291bGQgbm90IGJlIGNvbXBpbGVkIHdoZW4gcnVubmluZyBpbiBydW50aW1lLW9ubHkgbW9kZVwiKTtcbiAgICB9XG4gIH07XG5cbiAgLy8gSnVzdCBhZGQgd2F0ZXJcbiAgdmFyIGNvbnRhaW5lciA9IHtcbiAgICBlc2NhcGVFeHByZXNzaW9uOiBVdGlscy5lc2NhcGVFeHByZXNzaW9uLFxuICAgIGludm9rZVBhcnRpYWw6IGludm9rZVBhcnRpYWxXcmFwcGVyLFxuICAgIHByb2dyYW1zOiBbXSxcbiAgICBwcm9ncmFtOiBmdW5jdGlvbihpLCBmbiwgZGF0YSkge1xuICAgICAgdmFyIHByb2dyYW1XcmFwcGVyID0gdGhpcy5wcm9ncmFtc1tpXTtcbiAgICAgIGlmKGRhdGEpIHtcbiAgICAgICAgcHJvZ3JhbVdyYXBwZXIgPSBwcm9ncmFtKGksIGZuLCBkYXRhKTtcbiAgICAgIH0gZWxzZSBpZiAoIXByb2dyYW1XcmFwcGVyKSB7XG4gICAgICAgIHByb2dyYW1XcmFwcGVyID0gdGhpcy5wcm9ncmFtc1tpXSA9IHByb2dyYW0oaSwgZm4pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHByb2dyYW1XcmFwcGVyO1xuICAgIH0sXG4gICAgbWVyZ2U6IGZ1bmN0aW9uKHBhcmFtLCBjb21tb24pIHtcbiAgICAgIHZhciByZXQgPSBwYXJhbSB8fCBjb21tb247XG5cbiAgICAgIGlmIChwYXJhbSAmJiBjb21tb24gJiYgKHBhcmFtICE9PSBjb21tb24pKSB7XG4gICAgICAgIHJldCA9IHt9O1xuICAgICAgICBVdGlscy5leHRlbmQocmV0LCBjb21tb24pO1xuICAgICAgICBVdGlscy5leHRlbmQocmV0LCBwYXJhbSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmV0O1xuICAgIH0sXG4gICAgcHJvZ3JhbVdpdGhEZXB0aDogZW52LlZNLnByb2dyYW1XaXRoRGVwdGgsXG4gICAgbm9vcDogZW52LlZNLm5vb3AsXG4gICAgY29tcGlsZXJJbmZvOiBudWxsXG4gIH07XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB2YXIgbmFtZXNwYWNlID0gb3B0aW9ucy5wYXJ0aWFsID8gb3B0aW9ucyA6IGVudixcbiAgICAgICAgaGVscGVycyxcbiAgICAgICAgcGFydGlhbHM7XG5cbiAgICBpZiAoIW9wdGlvbnMucGFydGlhbCkge1xuICAgICAgaGVscGVycyA9IG9wdGlvbnMuaGVscGVycztcbiAgICAgIHBhcnRpYWxzID0gb3B0aW9ucy5wYXJ0aWFscztcbiAgICB9XG4gICAgdmFyIHJlc3VsdCA9IHRlbXBsYXRlU3BlYy5jYWxsKFxuICAgICAgICAgIGNvbnRhaW5lcixcbiAgICAgICAgICBuYW1lc3BhY2UsIGNvbnRleHQsXG4gICAgICAgICAgaGVscGVycyxcbiAgICAgICAgICBwYXJ0aWFscyxcbiAgICAgICAgICBvcHRpb25zLmRhdGEpO1xuXG4gICAgaWYgKCFvcHRpb25zLnBhcnRpYWwpIHtcbiAgICAgIGVudi5WTS5jaGVja1JldmlzaW9uKGNvbnRhaW5lci5jb21waWxlckluZm8pO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG59XG5cbmV4cG9ydHMudGVtcGxhdGUgPSB0ZW1wbGF0ZTtmdW5jdGlvbiBwcm9ncmFtV2l0aERlcHRoKGksIGZuLCBkYXRhIC8qLCAkZGVwdGggKi8pIHtcbiAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDMpO1xuXG4gIHZhciBwcm9nID0gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIFtjb250ZXh0LCBvcHRpb25zLmRhdGEgfHwgZGF0YV0uY29uY2F0KGFyZ3MpKTtcbiAgfTtcbiAgcHJvZy5wcm9ncmFtID0gaTtcbiAgcHJvZy5kZXB0aCA9IGFyZ3MubGVuZ3RoO1xuICByZXR1cm4gcHJvZztcbn1cblxuZXhwb3J0cy5wcm9ncmFtV2l0aERlcHRoID0gcHJvZ3JhbVdpdGhEZXB0aDtmdW5jdGlvbiBwcm9ncmFtKGksIGZuLCBkYXRhKSB7XG4gIHZhciBwcm9nID0gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgcmV0dXJuIGZuKGNvbnRleHQsIG9wdGlvbnMuZGF0YSB8fCBkYXRhKTtcbiAgfTtcbiAgcHJvZy5wcm9ncmFtID0gaTtcbiAgcHJvZy5kZXB0aCA9IDA7XG4gIHJldHVybiBwcm9nO1xufVxuXG5leHBvcnRzLnByb2dyYW0gPSBwcm9ncmFtO2Z1bmN0aW9uIGludm9rZVBhcnRpYWwocGFydGlhbCwgbmFtZSwgY29udGV4dCwgaGVscGVycywgcGFydGlhbHMsIGRhdGEpIHtcbiAgdmFyIG9wdGlvbnMgPSB7IHBhcnRpYWw6IHRydWUsIGhlbHBlcnM6IGhlbHBlcnMsIHBhcnRpYWxzOiBwYXJ0aWFscywgZGF0YTogZGF0YSB9O1xuXG4gIGlmKHBhcnRpYWwgPT09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IG5ldyBFeGNlcHRpb24oXCJUaGUgcGFydGlhbCBcIiArIG5hbWUgKyBcIiBjb3VsZCBub3QgYmUgZm91bmRcIik7XG4gIH0gZWxzZSBpZihwYXJ0aWFsIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICByZXR1cm4gcGFydGlhbChjb250ZXh0LCBvcHRpb25zKTtcbiAgfVxufVxuXG5leHBvcnRzLmludm9rZVBhcnRpYWwgPSBpbnZva2VQYXJ0aWFsO2Z1bmN0aW9uIG5vb3AoKSB7IHJldHVybiBcIlwiOyB9XG5cbmV4cG9ydHMubm9vcCA9IG5vb3A7IiwiXCJ1c2Ugc3RyaWN0XCI7XG4vLyBCdWlsZCBvdXQgb3VyIGJhc2ljIFNhZmVTdHJpbmcgdHlwZVxuZnVuY3Rpb24gU2FmZVN0cmluZyhzdHJpbmcpIHtcbiAgdGhpcy5zdHJpbmcgPSBzdHJpbmc7XG59XG5cblNhZmVTdHJpbmcucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBcIlwiICsgdGhpcy5zdHJpbmc7XG59O1xuXG5leHBvcnRzW1wiZGVmYXVsdFwiXSA9IFNhZmVTdHJpbmc7IiwiXCJ1c2Ugc3RyaWN0XCI7XG4vKmpzaGludCAtVzAwNCAqL1xudmFyIFNhZmVTdHJpbmcgPSByZXF1aXJlKFwiLi9zYWZlLXN0cmluZ1wiKVtcImRlZmF1bHRcIl07XG5cbnZhciBlc2NhcGUgPSB7XG4gIFwiJlwiOiBcIiZhbXA7XCIsXG4gIFwiPFwiOiBcIiZsdDtcIixcbiAgXCI+XCI6IFwiJmd0O1wiLFxuICAnXCInOiBcIiZxdW90O1wiLFxuICBcIidcIjogXCImI3gyNztcIixcbiAgXCJgXCI6IFwiJiN4NjA7XCJcbn07XG5cbnZhciBiYWRDaGFycyA9IC9bJjw+XCInYF0vZztcbnZhciBwb3NzaWJsZSA9IC9bJjw+XCInYF0vO1xuXG5mdW5jdGlvbiBlc2NhcGVDaGFyKGNocikge1xuICByZXR1cm4gZXNjYXBlW2Nocl0gfHwgXCImYW1wO1wiO1xufVxuXG5mdW5jdGlvbiBleHRlbmQob2JqLCB2YWx1ZSkge1xuICBmb3IodmFyIGtleSBpbiB2YWx1ZSkge1xuICAgIGlmKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh2YWx1ZSwga2V5KSkge1xuICAgICAgb2JqW2tleV0gPSB2YWx1ZVtrZXldO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnRzLmV4dGVuZCA9IGV4dGVuZDt2YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuZXhwb3J0cy50b1N0cmluZyA9IHRvU3RyaW5nO1xuLy8gU291cmNlZCBmcm9tIGxvZGFzaFxuLy8gaHR0cHM6Ly9naXRodWIuY29tL2Jlc3RpZWpzL2xvZGFzaC9ibG9iL21hc3Rlci9MSUNFTlNFLnR4dFxudmFyIGlzRnVuY3Rpb24gPSBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nO1xufTtcbi8vIGZhbGxiYWNrIGZvciBvbGRlciB2ZXJzaW9ucyBvZiBDaHJvbWUgYW5kIFNhZmFyaVxuaWYgKGlzRnVuY3Rpb24oL3gvKSkge1xuICBpc0Z1bmN0aW9uID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nICYmIHRvU3RyaW5nLmNhbGwodmFsdWUpID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xuICB9O1xufVxudmFyIGlzRnVuY3Rpb247XG5leHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xudmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JykgPyB0b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gJ1tvYmplY3QgQXJyYXldJyA6IGZhbHNlO1xufTtcbmV4cG9ydHMuaXNBcnJheSA9IGlzQXJyYXk7XG5cbmZ1bmN0aW9uIGVzY2FwZUV4cHJlc3Npb24oc3RyaW5nKSB7XG4gIC8vIGRvbid0IGVzY2FwZSBTYWZlU3RyaW5ncywgc2luY2UgdGhleSdyZSBhbHJlYWR5IHNhZmVcbiAgaWYgKHN0cmluZyBpbnN0YW5jZW9mIFNhZmVTdHJpbmcpIHtcbiAgICByZXR1cm4gc3RyaW5nLnRvU3RyaW5nKCk7XG4gIH0gZWxzZSBpZiAoIXN0cmluZyAmJiBzdHJpbmcgIT09IDApIHtcbiAgICByZXR1cm4gXCJcIjtcbiAgfVxuXG4gIC8vIEZvcmNlIGEgc3RyaW5nIGNvbnZlcnNpb24gYXMgdGhpcyB3aWxsIGJlIGRvbmUgYnkgdGhlIGFwcGVuZCByZWdhcmRsZXNzIGFuZFxuICAvLyB0aGUgcmVnZXggdGVzdCB3aWxsIGRvIHRoaXMgdHJhbnNwYXJlbnRseSBiZWhpbmQgdGhlIHNjZW5lcywgY2F1c2luZyBpc3N1ZXMgaWZcbiAgLy8gYW4gb2JqZWN0J3MgdG8gc3RyaW5nIGhhcyBlc2NhcGVkIGNoYXJhY3RlcnMgaW4gaXQuXG4gIHN0cmluZyA9IFwiXCIgKyBzdHJpbmc7XG5cbiAgaWYoIXBvc3NpYmxlLnRlc3Qoc3RyaW5nKSkgeyByZXR1cm4gc3RyaW5nOyB9XG4gIHJldHVybiBzdHJpbmcucmVwbGFjZShiYWRDaGFycywgZXNjYXBlQ2hhcik7XG59XG5cbmV4cG9ydHMuZXNjYXBlRXhwcmVzc2lvbiA9IGVzY2FwZUV4cHJlc3Npb247ZnVuY3Rpb24gaXNFbXB0eSh2YWx1ZSkge1xuICBpZiAoIXZhbHVlICYmIHZhbHVlICE9PSAwKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSBpZiAoaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmV4cG9ydHMuaXNFbXB0eSA9IGlzRW1wdHk7IiwiLyoqXG4gKiBFeHBvc2UgYHJlcXVlc3RBbmltYXRpb25GcmFtZSgpYC5cbiAqL1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lXG4gIHx8IHdpbmRvdy53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbiAgfHwgd2luZG93Lm1velJlcXVlc3RBbmltYXRpb25GcmFtZVxuICB8fCB3aW5kb3cub1JlcXVlc3RBbmltYXRpb25GcmFtZVxuICB8fCB3aW5kb3cubXNSZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbiAgfHwgZmFsbGJhY2s7XG5cbi8qKlxuICogRmFsbGJhY2sgaW1wbGVtZW50YXRpb24uXG4gKi9cblxudmFyIHByZXYgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbmZ1bmN0aW9uIGZhbGxiYWNrKGZuKSB7XG4gIHZhciBjdXJyID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gIHZhciBtcyA9IE1hdGgubWF4KDAsIDE2IC0gKGN1cnIgLSBwcmV2KSk7XG4gIHZhciByZXEgPSBzZXRUaW1lb3V0KGZuLCBtcyk7XG4gIHByZXYgPSBjdXJyO1xuICByZXR1cm4gcmVxO1xufVxuXG4vKipcbiAqIENhbmNlbC5cbiAqL1xuXG52YXIgY2FuY2VsID0gd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lXG4gIHx8IHdpbmRvdy53ZWJraXRDYW5jZWxBbmltYXRpb25GcmFtZVxuICB8fCB3aW5kb3cubW96Q2FuY2VsQW5pbWF0aW9uRnJhbWVcbiAgfHwgd2luZG93Lm9DYW5jZWxBbmltYXRpb25GcmFtZVxuICB8fCB3aW5kb3cubXNDYW5jZWxBbmltYXRpb25GcmFtZVxuICB8fCB3aW5kb3cuY2xlYXJUaW1lb3V0O1xuXG5leHBvcnRzLmNhbmNlbCA9IGZ1bmN0aW9uKGlkKXtcbiAgY2FuY2VsLmNhbGwod2luZG93LCBpZCk7XG59O1xuIiwidmFyIGJhc2UgICAgICAgPSByZXF1aXJlKCcuL2xpYi9iYXNlJyk7XG52YXIgU2FmZVN0cmluZyA9IHJlcXVpcmUoJy4vbGliL3NhZmUtc3RyaW5nJyk7XG52YXIgRXhjZXB0aW9uICA9IHJlcXVpcmUoJy4vbGliL2V4Y2VwdGlvbicpO1xudmFyIFV0aWxzICAgICAgPSByZXF1aXJlKCcuL2xpYi91dGlscycpO1xudmFyIEV2ZW50cyAgICAgPSByZXF1aXJlKCcuL2xpYi9ldmVudHMnKTtcbnZhciBydW50aW1lICAgID0gcmVxdWlyZSgnLi9saWIvcnVudGltZScpO1xuXG4vLyBFeHRlbmQgdGhlIERPTUJhcnMgcHJvdG90eXBlIHdpdGggZXZlbnQgZW1pdHRlciBmdW5jdGlvbmFsaXR5LlxuVXRpbHMuZXh0ZW5kKGJhc2UuRE9NQmFyc0Vudmlyb25tZW50LnByb3RvdHlwZSwgRXZlbnRzKTtcblxubW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24gY3JlYXRlICgpIHtcbiAgdmFyIGRiID0gbmV3IGJhc2UuRE9NQmFyc0Vudmlyb25tZW50KCk7XG5cbiAgVXRpbHMuZXh0ZW5kKGRiLCBiYXNlKTtcbiAgZGIuVk0gICAgICAgICA9IHJ1bnRpbWU7XG4gIGRiLlV0aWxzICAgICAgPSBVdGlscztcbiAgZGIuY3JlYXRlICAgICA9IGNyZWF0ZTtcbiAgZGIuRXhjZXB0aW9uICA9IEV4Y2VwdGlvbjtcbiAgZGIuU2FmZVN0cmluZyA9IFNhZmVTdHJpbmc7XG5cbiAgZGIudGVtcGxhdGUgPSBmdW5jdGlvbiAoc3BlYykge1xuICAgIHJldHVybiBydW50aW1lLnRlbXBsYXRlKHNwZWMsIGRiKTtcbiAgfTtcblxuICByZXR1cm4gZGI7XG59KSgpO1xuIl19
(14)
});
