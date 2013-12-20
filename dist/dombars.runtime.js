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
    var fn      = options.fn;
    var inverse = options.inverse;
    var buffer  = document.createDocumentFragment();
    var i       = 0;
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
          if (data) { data.index = i; }
          buffer.appendChild(fn(context[i], { data: data }).value);
        }
      } else {
        for (var key in context) {
          if (context.hasOwnProperty(key)) {
            i += 1;
            if (data) { data.key = key; }
            buffer.appendChild(fn(context[key], { data: data }).value);
          }
        }
      }
    }

    if (i === 0) {
      return inverse(this).value;
    }

    return buffer;
  });

  var blockHelperMissing = wrapOldHelper(instance.helpers.blockHelperMissing);
  instance.registerHelper('blockHelperMissing', blockHelperMissing);

  var ifHelper = wrapOldHelper(instance.helpers.if);
  instance.registerHelper('if', ifHelper);

  var withHelper = wrapOldHelper(instance.helpers.with);
  instance.registerHelper('with', withHelper);
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
        unsubscribe: subscriber.unsubscribe
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

    var result = templateSpec.call(
      container,
      env,
      context,
      options.helpers,
      options.partials,
      options.data
    );

    var compilerInfo     = container.compilerInfo || [];
    var compilerRevision = compilerInfo[0] || 1;
    var currentRevision  = env.COMPILER_REVISION;

    if (compilerRevision !== currentRevision) {
      if (compilerRevision < currentRevision) {
        var runtimeVersions  = env.REVISION_CHANGES[currentRevision];
        var compilerVersions = env.REVISION_CHANGES[compilerRevision];
        throw new Error('Template was precompiled with an older version of ' +
          'DOMBars than the current runtime. Please update your precompiler' +
          ' to a newer version (' + runtimeVersions + ') or downgrade your ' +
          'runtime to an older version (' + compilerVersions + ')');
      }

      throw new Error('Template was precompiled with a newer version of ' +
        'DOMBars than the current runtime. Please update your runtime to ' +
        'a newer version (' + compilerInfo[1] + ')');
    }

    // Return an object back to the user with useful functionality.
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
/*globals Exception, Utils */
var Utils = require("./utils");
var Exception = require("./exception")["default"];

var VERSION = "1.1.2";
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
            data.first = (i === 0)
            data.last  = (i === (context.length-1));
          }
          ret = ret + fn(context[i], { data: data });
        }
      } else {
        for(var key in context) {
          if(context.hasOwnProperty(key)) {
            if(data) { data.key = key; }
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
/*global Utils */
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

// TODO: Remove this line and break up compilePartial

function template(templateSpec, env) {
  if (!env) {
    throw new Error("No environment passed to template");
  }

  var invokePartialWrapper;
  if (env.compile) {
    invokePartialWrapper = function(partial, name, context, helpers, partials, data) {
      // TODO : Check this for all inputs and the options handling (partial flag, etc). This feels
      // like there should be a common exec path
      var result = invokePartial.apply(this, arguments);
      if (result) { return result; }

      var options = { helpers: helpers, partials: partials, data: data };
      partials[name] = env.compile(partial, { data: data !== undefined }, env);
      return partials[name](context, options);
    };
  } else {
    invokePartialWrapper = function(partial, name /* , context, helpers, partials, data */) {
      var result = invokePartial.apply(this, arguments);
      if (result) { return result; }
      throw new Exception("The partial " + name + " could not be compiled when running in runtime-only mode");
    };
  }

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
    programWithDepth: programWithDepth,
    noop: noop,
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
      checkRevision(container.compilerInfo);
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
    if(value.hasOwnProperty(key)) {
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
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvYmFzZS5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi9ldmVudHMuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvZXhjZXB0aW9uLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbGliL3J1bnRpbWUuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvc2FmZS1zdHJpbmcuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvdHJhY2stbm9kZS5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi91dGlscy5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvYmFzZS5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvZXhjZXB0aW9uLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9ydW50aW1lLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9zYWZlLXN0cmluZy5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvdXRpbHMuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvcmFmLWNvbXBvbmVudC9pbmRleC5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL3J1bnRpbWUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdGQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN2tCQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbInZhciBoYnNCYXNlICAgICAgICAgICAgICAgPSByZXF1aXJlKCdoYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvYmFzZScpO1xudmFyIFV0aWxzICAgICAgICAgICAgICAgICA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciBIYW5kbGViYXJzRW52aXJvbm1lbnQgPSBoYnNCYXNlLkhhbmRsZWJhcnNFbnZpcm9ubWVudDtcblxuLyoqXG4gKiBFeHRlbmQgSGFuZGxlYmFycyBiYXNlIG9iamVjdCB3aXRoIGN1c3RvbSBmdW5jdGlvbmFsaXR5LlxuICpcbiAqIEB0eXBlIHtPYmplY3R9XG4gKi9cbnZhciBiYXNlID0gbW9kdWxlLmV4cG9ydHMgPSBVdGlscy5jcmVhdGUoaGJzQmFzZSk7XG5cbi8qKlxuICogV3JhcCBvbGQtc3R5bGUgSGFuZGxlYmFycyBoZWxwZXJzIHdpdGggdGhlIHVwZGF0ZWQgb2JqZWN0IHN5bnRheCByZXR1cm4uXG4gKlxuICogQHBhcmFtICB7RnVuY3Rpb259IGhlbHBlclxuICogQHJldHVybiB7RnVuY3Rpb259XG4gKi9cbnZhciB3cmFwT2xkSGVscGVyID0gZnVuY3Rpb24gKGhlbHBlcikge1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHZhciByZXN1bHQgPSBoZWxwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgIC8vIE5lZWQgYSBzcGVjaWFsIGhhbmRsZXIgZm9yIHRoZSBgd2l0aGAgaGVscGVyIHdoaWNoIHdvbid0IGFsd2F5cyBleGVjdXRlLlxuICAgIHJldHVybiByZXN1bHQgPT0gbnVsbCA/IHJlc3VsdCA6IHJlc3VsdC52YWx1ZTtcbiAgfTtcbn07XG5cbi8qKlxuICogUmVnaXN0ZXIgRE9NQmFycyBoZWxwZXJzIG9uIHRoZSBwYXNzZWQgaW4gRE9NQmFycyBpbnN0YW5jZS5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gaW5zdGFuY2VcbiAqL1xudmFyIHJlZ2lzdGVyRGVmYXVsdEhlbHBlcnMgPSBmdW5jdGlvbiAoaW5zdGFuY2UpIHtcbiAgLyoqXG4gICAqIFRoZSBoYW5kbGViYXJzIGBlYWNoYCBoZWxwZXIgaXMgaW5jb21wYXRpYmFibGUgd2l0aCBET01CYXJzLCBzaW5jZSBpdFxuICAgKiBhc3N1bWVzIHN0cmluZyBjb25jYXRpbmF0aW9uIChhcyBvcHBvc2VkIHRvIGRvY3VtZW50IGZyYWdtZW50cykuXG4gICAqXG4gICAqIEBwYXJhbSAge09iamVjdH0gY29udGV4dFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IG9wdGlvbnNcbiAgICogQHJldHVybiB7Tm9kZX1cbiAgICovXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdlYWNoJywgZnVuY3Rpb24gKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICB2YXIgZm4gICAgICA9IG9wdGlvbnMuZm47XG4gICAgdmFyIGludmVyc2UgPSBvcHRpb25zLmludmVyc2U7XG4gICAgdmFyIGJ1ZmZlciAgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgdmFyIGkgICAgICAgPSAwO1xuICAgIHZhciBkYXRhO1xuXG4gICAgaWYgKHR5cGVvZiBjb250ZXh0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmRhdGEpIHtcbiAgICAgIGRhdGEgPSBVdGlscy5jcmVhdGUob3B0aW9ucy5kYXRhKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGNvbnRleHQgPT09ICdvYmplY3QnKSB7XG4gICAgICB2YXIgbGVuID0gY29udGV4dC5sZW5ndGg7XG5cbiAgICAgIGlmIChsZW4gPT09ICtsZW4pIHtcbiAgICAgICAgZm9yICg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgIGlmIChkYXRhKSB7IGRhdGEuaW5kZXggPSBpOyB9XG4gICAgICAgICAgYnVmZmVyLmFwcGVuZENoaWxkKGZuKGNvbnRleHRbaV0sIHsgZGF0YTogZGF0YSB9KS52YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBjb250ZXh0KSB7XG4gICAgICAgICAgaWYgKGNvbnRleHQuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgaWYgKGRhdGEpIHsgZGF0YS5rZXkgPSBrZXk7IH1cbiAgICAgICAgICAgIGJ1ZmZlci5hcHBlbmRDaGlsZChmbihjb250ZXh0W2tleV0sIHsgZGF0YTogZGF0YSB9KS52YWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGkgPT09IDApIHtcbiAgICAgIHJldHVybiBpbnZlcnNlKHRoaXMpLnZhbHVlO1xuICAgIH1cblxuICAgIHJldHVybiBidWZmZXI7XG4gIH0pO1xuXG4gIHZhciBibG9ja0hlbHBlck1pc3NpbmcgPSB3cmFwT2xkSGVscGVyKGluc3RhbmNlLmhlbHBlcnMuYmxvY2tIZWxwZXJNaXNzaW5nKTtcbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2Jsb2NrSGVscGVyTWlzc2luZycsIGJsb2NrSGVscGVyTWlzc2luZyk7XG5cbiAgdmFyIGlmSGVscGVyID0gd3JhcE9sZEhlbHBlcihpbnN0YW5jZS5oZWxwZXJzLmlmKTtcbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2lmJywgaWZIZWxwZXIpO1xuXG4gIHZhciB3aXRoSGVscGVyID0gd3JhcE9sZEhlbHBlcihpbnN0YW5jZS5oZWxwZXJzLndpdGgpO1xuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignd2l0aCcsIHdpdGhIZWxwZXIpO1xufTtcblxuLyoqXG4gKiBDcmVhdGUgYSBjdXN0b20gRE9NQmFycyBlbnZpcm9ubWVudCB0byBtYXRjaCBIYW5kbGViYXJzRW52aXJvbm1lbnQuXG4gKi9cbnZhciBET01CYXJzRW52aXJvbm1lbnQgPSBiYXNlLkRPTUJhcnNFbnZpcm9ubWVudCA9IGZ1bmN0aW9uICgpIHtcbiAgSGFuZGxlYmFyc0Vudmlyb25tZW50LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIHJlZ2lzdGVyRGVmYXVsdEhlbHBlcnModGhpcyk7XG59O1xuXG4vKipcbiAqIEV4dGVuZCB0aGUgSGFuZGxlYmFyc0Vudmlyb25tZW50IHByb3RvdHlwZS5cbiAqXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG52YXIgZW52UHJvdG90eXBlID0gRE9NQmFyc0Vudmlyb25tZW50LnByb3RvdHlwZSA9IFV0aWxzLmNyZWF0ZShcbiAgSGFuZGxlYmFyc0Vudmlyb25tZW50LnByb3RvdHlwZVxuKTtcblxuLyoqXG4gKiBBbGlhcyBzb21lIHVzZWZ1bCBmdW5jdGlvbmFsaXR5IHRoYXQgaXMgZXhwZWN0ZWQgdG8gYmUgZXhwb3NlZCBvbiB0aGUgcm9vdFxuICogb2JqZWN0LlxuICovXG5lbnZQcm90b3R5cGUuY3JlYXRlRnJhbWUgICAgICAgPSBoYnNCYXNlLmNyZWF0ZUZyYW1lO1xuZW52UHJvdG90eXBlLlJFVklTSU9OX0NIQU5HRVMgID0gaGJzQmFzZS5SRVZJU0lPTl9DSEFOR0VTO1xuZW52UHJvdG90eXBlLkNPTVBJTEVSX1JFVklTSU9OID0gaGJzQmFzZS5DT01QSUxFUl9SRVZJU0lPTjtcblxuLyoqXG4gKiBUaGUgYmFzaWMgZ2V0dGVyIGZ1bmN0aW9uLiBPdmVycmlkZSB0aGlzIHdpdGggc29tZXRoaW5nIGVsc2UgYmFzZWQgb24geW91clxuICogcHJvamVjdC4gRm9yIGV4YW1wbGUsIEJhY2tib25lLmpzIG1vZGVscy5cbiAqXG4gKiBAcGFyYW0gIHtPYmplY3R9IG9iamVjdFxuICogQHBhcmFtICB7U3RyaW5nfSBwcm9wZXJ0eVxuICogQHJldHVybiB7Kn1cbiAqL1xuZW52UHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChvYmplY3QsIHByb3BlcnR5KSB7XG4gIHJldHVybiBvYmplY3RbcHJvcGVydHldO1xufTtcblxuLyoqXG4gKiBOb29wIGZ1bmN0aW9ucyBmb3Igc3Vic2NyaWJlIGFuZCB1bnN1YnNjcmliZS4gT3ZlcnJpZGUgd2l0aCBjdXN0b21cbiAqIGZ1bmN0aW9uYWxpdHkuXG4gKi9cbmVudlByb3RvdHlwZS5zdWJzY3JpYmUgPSBlbnZQcm90b3R5cGUudW5zdWJzY3JpYmUgPSBmdW5jdGlvbiAoKSB7fTtcbiIsInZhciBFdmVudHMgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vKipcbiAqIExpc3RlbiB0byBhbnkgZXZlbnRzIHRyaWdnZXJlZC5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9ICAgbmFtZVxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gKiBAcGFyYW0gIHtPYmplY3R9ICAgY29udGV4dFxuICogQHJldHVybiB7RXZlbnRzfVxuICovXG5FdmVudHMub24gPSBmdW5jdGlvbiAobmFtZSwgZm4sIGNvbnRleHQpIHtcbiAgdGhpcy5fZXZlbnRzIHx8ICh0aGlzLl9ldmVudHMgPSB7fSk7XG4gIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHNbbmFtZV0gfHwgKHRoaXMuX2V2ZW50c1tuYW1lXSA9IFtdKTtcbiAgZXZlbnRzLnB1c2goeyBmbjogZm4sIGNvbnRleHQ6IGNvbnRleHQgfSk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBMaXN0ZW4gdG8gYW55IGV2ZW50cyB0cmlnZ2VyZWQgb25jZS5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9ICAgbmFtZVxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gKiBAcGFyYW0gIHtPYmplY3R9ICAgY29udGV4dFxuICogQHJldHVybiB7RXZlbnRzfVxuICovXG5FdmVudHMub25jZSA9IGZ1bmN0aW9uIChuYW1lLCBmbiwgY29udGV4dCkge1xuICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgcmV0dXJuIHRoaXMub24obmFtZSwgZnVuY3Rpb24gc2VsZiAoKSB7XG4gICAgdGhhdC5vZmYobmFtZSwgc2VsZik7XG4gICAgZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfSwgY29udGV4dCk7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBhbiBldmVudCBsaXN0ZW5lci5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9ICAgbmFtZVxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gKiBAcGFyYW0gIHtPYmplY3R9ICAgY29udGV4dFxuICogQHJldHVybiB7RXZlbnRzfVxuICovXG5FdmVudHMub2ZmID0gZnVuY3Rpb24gKG5hbWUsIGZuLCBjb250ZXh0KSB7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbbmFtZV0pIHtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgIGlmICghbmFtZSkge1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50cztcbiAgICB9IGVsc2Uge1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1tuYW1lXTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHNbbmFtZV07XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZXZlbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGV2ZW50c1tpXS5mbiA9PT0gZm4pIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyIHx8IGV2ZW50c1tpXS5jb250ZXh0ID09PSBjb250ZXh0KSB7XG4gICAgICAgIGV2ZW50cy5zcGxpY2UoaSwgMSk7XG4gICAgICAgIGktLTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAoIWV2ZW50cy5sZW5ndGgpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW25hbWVdO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEVtaXQgYW4gZXZlbnQuXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBuYW1lXG4gKiBAcGFyYW0gIHsqfSAgICAgIC4uLlxuICogQHJldHVybiB7RXZlbnRzfVxuICovXG5FdmVudHMuZW1pdCA9IGZ1bmN0aW9uIChuYW1lIC8qLCAuLi5hcmdzICovKSB7XG4gIHZhciBhcmdzICAgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzICYmIHRoaXMuX2V2ZW50c1tuYW1lXSAmJiB0aGlzLl9ldmVudHNbbmFtZV0uc2xpY2UoKTtcblxuICBpZiAoZXZlbnRzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBldmVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGV2ZW50c1tpXS5mbi5hcHBseShldmVudHNbaV0uY29udGV4dCwgYXJncyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCdoYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvZXhjZXB0aW9uJykuZGVmYXVsdDtcbiIsInZhciBoYnNWTSAgICAgPSByZXF1aXJlKCdoYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvcnVudGltZScpO1xudmFyIFV0aWxzICAgICA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciBpc0Jyb3dzZXIgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJztcbnZhciByYWYgICAgICAgPSBpc0Jyb3dzZXIgJiYgcmVxdWlyZSgncmFmLWNvbXBvbmVudCcpO1xudmFyIF9fc2xpY2UgICA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcblxuLyoqXG4gKiBFeHRlbmQgdGhlIEhhbmRsZWJhcnMgcnVudGltZSBlbnZpcm9ubWVudCB3aXRoIERPTSBzcGVjaWZpYyBoZWxwZXJzLlxuICpcbiAqIEB0eXBlIHtPYmplY3R9XG4gKi9cbnZhciBWTSA9IG1vZHVsZS5leHBvcnRzID0gVXRpbHMuY3JlYXRlKGhic1ZNKTtcblxuLyoqXG4gKiBTaW1wbGUgcGFydGlhbCBhcHBsaWNhdGlvbiBmdW5jdGlvbi5cbiAqXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICovXG5WTS5wYXJ0aWFsID0gZnVuY3Rpb24gKGZuIC8qICwgLi5hcmdzICovKSB7XG4gIHZhciBhcmdzID0gX19zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJncy5jb25jYXQoX19zbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgfTtcbn07XG5cbi8qKlxuICogQmluZCBhIGZ1bmN0aW9uIHRvIHRoZSBhbmltYXRpb24gZnJhbWUuXG4gKlxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtOdW1iZXJ9XG4gKi9cblZNLmV4ZWMgPSBmdW5jdGlvbiAoZm4pIHtcbiAgcmV0dXJuIGlzQnJvd3NlciA/IHJhZihmbikgOiBzZXRJbW1lZGlhdGUoZm4pO1xufTtcblxuLyoqXG4gKiBDYW5jZWwgYW4gZXhlY3V0aW9uLlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBpZFxuICovXG5WTS5leGVjLmNhbmNlbCA9IGZ1bmN0aW9uIChpZCkge1xuICByZXR1cm4gaXNCcm93c2VyID8gcmFmLmNhbmNlbChpZCkgOiBjbGVhckltbWVkaWF0ZShpZCk7XG59O1xuXG4vKipcbiAqIEFjY2VwdHMgYSBmdW5jdGlvbiB0aGF0IGhhcyBzdWJzY3JpcHRpb25zIGNhbGxlZCBpbnNpZGUgYW5kIHJldHVybnMgYSBuZXdcbiAqIGZ1bmN0aW9uIHRoYXQgd2lsbCBsaXN0ZW4gdG8gYWxsIHN1YnNjcmlwdGlvbnMgYW5kIGNhbiB1cGRhdGUgd2l0aCBhbnlcbiAqIGNoYW5nZXMuXG4gKlxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqL1xuVk0uc3Vic2NyaWJlID0gZnVuY3Rpb24gKGZuLCBlbnYpIHtcbiAgdmFyIHRyaWdnZXJlZCAgICA9IGZhbHNlO1xuICB2YXIgdW5zdWJzY3JpYmVkID0gZmFsc2U7XG4gIHZhciBleGVjdXRpb247XG5cbiAgLyoqXG4gICAqIFRyaWdnZXIgdGhpcyBmdW5jdGlvbiB3aXRoIGV2ZXJ5IGNoYW5nZSB3aXRoIHRoZSBsaXN0ZW5lcnMuXG4gICAqL1xuICB2YXIgY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIElmIHRoZSB0cmlnZ2VyZWQgZmxhZyBoYXMgYmVlbiBzZXQsIGRvbid0IGNhdXNlIGFub3RoZXIgdXBkYXRlLlxuICAgIGlmICh0cmlnZ2VyZWQgfHwgdW5zdWJzY3JpYmVkKSB7IHJldHVybjsgfVxuXG4gICAgLy8gU2V0IGEgdHJpZ2dlcmVkIGZsYWcgdG8gYXZvaWQgbXVsdGlwbGUgdHJpZ2dlcnMuIEFsc28gdW5zdWJzY3JpYmUgYW55XG4gICAgLy8gY2hpbGRyZW4gaW1tZWRpYXRlbHkgdG8gc3RvcCB1cGRhdGUgY2xhc2hlcy5cbiAgICB0cmlnZ2VyZWQgPSB0cnVlO1xuICAgIHVuc3Vic2NyaWJlQ2hpbGRyZW4oKTtcblxuICAgIGV4ZWN1dGlvbiA9IFZNLmV4ZWMoZnVuY3Rpb24gKCkge1xuICAgICAgdHJpZ2dlcmVkID0gZmFsc2U7XG5cbiAgICAgIGJlZm9yZVVwZGF0ZSgpO1xuICAgICAgc3Vic2NyaWJlci51cGRhdGUoc3Vic2NyaWJlci5leGVjKCkpO1xuICAgICAgYWZ0ZXJVcGRhdGUoKTtcbiAgICB9KTtcbiAgfTtcblxuICAvKipcbiAgICogSXRlcmF0ZSBvdmVyIGEgc3Vic2NyaXB0aW9ucyBvYmplY3QgYW5kIHVuc3Vic2NyaWJlIGV2ZXJ5dGhpbmcuXG4gICAqXG4gICAqIEBwYXJhbSB7QXJyYXl9IHN1YnNjcmlwdGlvbnNcbiAgICovXG4gIHZhciBlYWNoU3Vic2NyaXB0aW9uID0gZnVuY3Rpb24gKHN1YnNjcmlwdGlvbnMsIGZuKSB7XG4gICAgZm9yICh2YXIgcHJvcGVydHkgaW4gc3Vic2NyaXB0aW9ucykge1xuICAgICAgZm9yICh2YXIga2V5IGluIHN1YnNjcmlwdGlvbnNbcHJvcGVydHldKSB7XG4gICAgICAgIGZuKHN1YnNjcmlwdGlvbnNbcHJvcGVydHldW2tleV0sIHByb3BlcnR5LCBjaGFuZ2UpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogSXRlcmF0ZSBvdmVyIGFuIGFycmF5IG9mIGZ1bmN0aW9ucyBhbmQgZXhlY3V0ZS5cbiAgICpcbiAgICogQHBhcmFtIHtBcnJheX0gc3Vic2NyaXB0aW9uc1xuICAgKi9cbiAgdmFyIGl0ZXJhdGlvbiA9IGZ1bmN0aW9uIChzdWJzY3JpcHRpb25zKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdWJzY3JpcHRpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICBzdWJzY3JpcHRpb25zW2ldKCk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBSdW4gdGhpcyBmdW5jdGlvbiBiZWZvcmUgd2UgcnVuIGFuIHVwZGF0ZSBmdW5jdGlvbi4gSXQgbW92ZXMgY3VycmVudFxuICAgKiBzdWJzY3JpcHRpb25zIHNvIHRoYXQgd2UgY2FuIGRpZmYgdGhlIHN1YnNjcmlwdGlvbnMgYWZ0ZXIgd2UgdXBkYXRlXG4gICAqIHRoZSBET00uXG4gICAqL1xuICB2YXIgYmVmb3JlVXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICAgIGl0ZXJhdGlvbihzdWJzY3JpYmVyLnVuc3Vic2NyaXB0aW9ucyk7XG4gICAgc3Vic2NyaWJlci5wcmV2U3Vic2NyaXB0aW9ucyA9IHN1YnNjcmliZXIuc3Vic2NyaXB0aW9ucztcbiAgfTtcblxuICAvKipcbiAgICogUnVuIHRoaXMgZnVuY3Rpb24gYWZ0ZXIgYW4gdXBkYXRlLiBJdCB3aWxsIGNoZWNrIGZvciBkaWZmZXJlbmNlIGluIHRoZVxuICAgKiBiZWZvcmUgYW5kIGFmdGVyIHVwZGF0ZXMuXG4gICAqL1xuICB2YXIgYWZ0ZXJVcGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHN1YnNjcmlwdGlvbnMgPSBzdWJzY3JpYmVyLnN1YnNjcmlwdGlvbnM7XG5cbiAgICAvLyBEaWZmIHRoZSBwcmV2aW91cyBzdWJzY3JpcHRpb25zIGFuZCBuZXcgc3Vic2NyaXB0aW9ucyB0byBhZGQvcmVtb3ZlXG4gICAgLy8gbGlzdGVuZXJzIGFzIG5lZWRlZC4gVGhpcyBzaG91bGQgYmUgbW9yZSBtZW1vcnkgZWZmaWNpZW50IHRoYW4gYmxpbmRseVxuICAgIC8vIGFkZGluZyBhbmQgcmVtb3ZpbmcgbGlzdGVuZXJzIGV2ZXJ5IHRpbWUuXG4gICAgZm9yICh2YXIgcHJvcGVydHkgaW4gc3Vic2NyaXB0aW9ucykge1xuICAgICAgZm9yICh2YXIga2V5IGluIHN1YnNjcmlwdGlvbnNbcHJvcGVydHldKSB7XG4gICAgICAgIGlmICghc3Vic2NyaWJlci5wcmV2U3Vic2NyaXB0aW9uc1twcm9wZXJ0eV1ba2V5XSkge1xuICAgICAgICAgIGVudi5zdWJzY3JpYmUoc3Vic2NyaXB0aW9uc1twcm9wZXJ0eV1ba2V5XSwgcHJvcGVydHksIGNoYW5nZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVsZXRlIHN1YnNjcmliZXIucHJldlN1YnNjcmlwdGlvbnNbcHJvcGVydHldW2tleV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBMb29wIG92ZXIgcHJldmlvdXMgc3Vic2NyaXB0aW9ucyB0aGF0IG5vIGxvbmdlciBleGlzdCBhbmQgdW5zdWJzY3JpYmUuXG4gICAgZWFjaFN1YnNjcmlwdGlvbihzdWJzY3JpYmVyLnByZXZTdWJzY3JpcHRpb25zLCBlbnYudW5zdWJzY3JpYmUpO1xuXG4gICAgZGVsZXRlIHN1YnNjcmliZXIucHJldlN1YnNjcmlwdGlvbnM7XG4gIH07XG5cbiAgLyoqXG4gICAqIFVuc3Vic2NyaWJlIGV2ZXJ5IGNoaWxkIG9mIHRoZSBjdXJyZW50IHN1YnNjcmlwdGlvbi5cbiAgICovXG4gIHZhciB1bnN1YnNjcmliZUNoaWxkcmVuID0gZnVuY3Rpb24gKCkge1xuICAgIGZvciAodmFyIGNoaWxkIGluIHN1YnNjcmliZXIuY2hpbGRyZW4pIHtcbiAgICAgIHN1YnNjcmliZXIuY2hpbGRyZW5bY2hpbGRdLnJlbW92ZSgpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogVGhlIHJldHVybmVkIHN1YnNjcmlwdGlvbiBmdW5jdGlvbiB0YWtlcyBjYXJlIG9mIGFsaWFzaW5nIHRoZVxuICAgKiBzdWJzY3JpcHRpb25zIGFycmF5IGNvcnJlY3RseSwgc3Vic2NyaWJpbmcgZm9yIHVwZGF0ZXMgYW5kIHRyaWdnZXJpbmdcbiAgICogdXBkYXRlcyB3aGVuIGFueSBvZiB0aGUgc3Vic2NyaXB0aW9ucyBjaGFuZ2UuXG4gICAqXG4gICAqIEByZXR1cm4geyp9XG4gICAqL1xuICB2YXIgc3Vic2NyaWJlciA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcmVzdWx0ID0gc3Vic2NyaWJlci5leGVjLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgZWFjaFN1YnNjcmlwdGlvbihzdWJzY3JpYmVyLnN1YnNjcmlwdGlvbnMsIGVudi5zdWJzY3JpYmUpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gS2VlcCBhbiBhcnJheSBvZiBjdXJyZW50IHN1YnNjcmlwdGlvbnMgYW5kIGFuIG9iamVjdCB3aXRoIHJlZmVyZW5jZXNcbiAgLy8gdG8gY2hpbGQgc3Vic2NyaXB0aW9uIGZ1bmN0aW9ucy5cbiAgc3Vic2NyaWJlci5jaWQgICAgICA9ICdzdWJzY3JpYmVyJyArIFV0aWxzLnVuaXF1ZUlkKCk7XG4gIHN1YnNjcmliZXIuY2hpbGRyZW4gPSB7fTtcblxuICAvKipcbiAgICogRXhlY3V0ZSB0aGUgZnVuY3Rpb24gYW5kIHJldHVybiB0aGUgcmVzdWx0LlxuICAgKlxuICAgKiBAcmV0dXJuIHsqfVxuICAgKi9cbiAgc3Vic2NyaWJlci5leGVjID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIElmIHdlIGhhdmUgYSBwYXJlbnQgc3Vic2NyaWJlciwgbGluayB0aGUgc3Vic2NyaWJlcnMgdG9nZXRoZXIuXG4gICAgaWYgKFZNLnN1YnNjcmliZXIpIHtcbiAgICAgIHN1YnNjcmliZXIucGFyZW50ID0gVk0uc3Vic2NyaWJlcjtcbiAgICAgIHN1YnNjcmliZXIucGFyZW50LmNoaWxkcmVuW3N1YnNjcmliZXIuY2lkXSA9IHN1YnNjcmliZXI7XG4gICAgfVxuXG4gICAgLy8gQWxpYXMgc3Vic2NyaWJlciBmdW5jdGlvbmFsaXR5IHRvIHRoZSBWTSBvYmplY3QuXG4gICAgVk0uc3Vic2NyaWJlciAgPSBzdWJzY3JpYmVyO1xuICAgIFZNLnVuc3Vic2NyaWJlID0gc3Vic2NyaWJlci51bnN1YnNjcmliZTtcblxuICAgIC8vIFJlc2V0IHN1YnNjcmlwdGlvbnMgYmVmb3JlIGV4ZWN1dGlvbi5cbiAgICBzdWJzY3JpYmVyLnN1YnNjcmlwdGlvbnMgICA9IHt9O1xuICAgIHN1YnNjcmliZXIudW5zdWJzY3JpcHRpb25zID0gW107XG5cbiAgICB2YXIgdmFsdWUgPSBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgLy8gUmVzZXQgdGhlIFZNIGZ1bmN0aW9uYWxpdHkgdG8gd2hhdCBpdCB3YXMgYmVmb3JlaGFuZC5cbiAgICBWTS5zdWJzY3JpYmVyICA9IHN1YnNjcmliZXIucGFyZW50O1xuICAgIFZNLnVuc3Vic2NyaWJlID0gc3Vic2NyaWJlci5wYXJlbnQgJiYgc3Vic2NyaWJlci5wYXJlbnQudW5zdWJzY3JpYmU7XG5cbiAgICAvLyBSZXR1cm4gYW4gb2JqZWN0IHdpdGggYSB2YWx1ZSBwcm9wZXJ0eSBhbmQgdW5zdWJzY3JpYmUgZnVuY3Rpb25hbGl0eS5cbiAgICByZXR1cm4gdmFsdWU7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJlbW92ZSB0aGUgY3VycmVudCBzdWJzY3JpYmVyIGZyb20gYWxsIGxpc3RlbmVycy4gV2UgYWxzbyBuZWVkIHRvIGNhbmNlbFxuICAgKiBhbnkgY3VycmVudCBleGVjdXRpb24gZXZlbnQgYW5kIHJlbW92ZSBhIHJlZmVyZW5jZSBmcm9tIHRoZSBwYXJlbnRcbiAgICogc3Vic2NyaXB0aW9uLlxuICAgKi9cbiAgc3Vic2NyaWJlci5yZW1vdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaXRlcmF0aW9uKHN1YnNjcmliZXIudW5zdWJzY3JpcHRpb25zKTtcbiAgICBlYWNoU3Vic2NyaXB0aW9uKHN1YnNjcmliZXIuc3Vic2NyaXB0aW9ucywgZW52LnVuc3Vic2NyaWJlKTtcblxuICAgIGlmIChzdWJzY3JpYmVyLnBhcmVudCkge1xuICAgICAgZGVsZXRlIHN1YnNjcmliZXIucGFyZW50LmNoaWxkcmVuW3N1YnNjcmliZXIuY2lkXTtcbiAgICAgIGRlbGV0ZSBzdWJzY3JpYmVyLnBhcmVudDtcbiAgICB9XG5cbiAgICAvLyBUcmFjayB3aGV0aGVyIHdlIGhhdmUgYmVlbiB1bnN1YnNjcmliZWQuIFRoaXMgaXMgcmVxdWlyZWQgc2luY2UgdGhlXG4gICAgLy8gbGlzdGVuZXIgY291bGQgc3RpbGwgYmUgdHJpZ2dlcmVkIGF0IGFueSB0aW1lIGV2ZW4gdGhvdWdoIHdlIGV4cGVjdFxuICAgIC8vIHRoZSBleHRlcm5hbCByZWZlcmVuY2VzIHRvIGJlIGRyb3BwZWQuIFRoaXMgY291bGQgYWxzbyBpbmRpY2F0ZSBhXG4gICAgLy8gcG90ZW50aWFsIG1lbW9yeSBsZWFrIHdpdGggdGhlIGxpc3RlbmVyIHVuc3VzYmNyaXB0aW9uIGNvZGUuXG4gICAgdW5zdWJzY3JpYmVkID0gdHJ1ZTtcbiAgICB1bnN1YnNjcmliZUNoaWxkcmVuKCk7XG4gICAgVk0uZXhlYy5jYW5jZWwoZXhlY3V0aW9uKTtcbiAgfTtcblxuICAvKipcbiAgICogUHVzaCB1bnN1YnNjcmlwdGlvbiBmdW5jdGlvbnMgaW50byB0aGUgdW5zdWJzY3JpYmUgYXJyYXkuXG4gICAqIEByZXR1cm4ge1t0eXBlXX0gW2Rlc2NyaXB0aW9uXVxuICAgKi9cbiAgc3Vic2NyaWJlci51bnN1YnNjcmliZSA9IGZ1bmN0aW9uIChmbikge1xuICAgIFV0aWxzLmlzRnVuY3Rpb24oZm4pICYmIHN1YnNjcmliZXIudW5zdWJzY3JpcHRpb25zLnB1c2goZm4pO1xuICB9O1xuXG4gIHJldHVybiBzdWJzY3JpYmVyO1xufTtcblxuLyoqXG4gKiBHZW5lcmF0ZSBhbiBleGVjdXRhYmxlIHRlbXBsYXRlIGZyb20gYSB0ZW1wbGF0ZSBzcGVjLlxuICpcbiAqIEBwYXJhbSAge09iamVjdH0gICB0ZW1wbGF0ZVNwZWNcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICovXG5WTS50ZW1wbGF0ZSA9IGZ1bmN0aW9uICh0ZW1wbGF0ZVNwZWMsIGVudikge1xuICAvKipcbiAgICogV3JhcCBhIGZ1bmN0aW9uIGluIGEgc3Vic2NyaWJlciAqZXZlcnkqIHRpbWUgdGhhdCBmdW5jdGlvbiBpcyBjYWxsZWQuXG4gICAqXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICAgKiBAcmV0dXJuIHtPYmplY3R9XG4gICAqL1xuICB2YXIgd3JhcFN1YnNjcmliZXIgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHN1YnNjcmliZXIgPSBWTS5zdWJzY3JpYmUoZm4sIGVudik7XG4gICAgICB2YXIgdmFsdWUgICAgICA9IHN1YnNjcmliZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgICAgLy8gUmV0dXJuIGFuIG9iamVjdCB3cmFwcGVkIGluIHVzZWZ1bCBmdW5jdGlvbmFsaXR5LlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdmFsdWU6ICAgICAgIHZhbHVlLFxuICAgICAgICB1bnN1YnNjcmliZTogc3Vic2NyaWJlci51bnN1YnNjcmliZVxuICAgICAgfTtcbiAgICB9O1xuICB9O1xuXG4gIC8qKlxuICAgKiBUaGUgY29udGFpbmVyIG9iamVjdCBob2xkcyBhbGwgdGhlIGZ1bmN0aW9ucyB1c2VkIGJ5IHRoZSB0ZW1wbGF0ZSBzcGVjLlxuICAgKlxuICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgKi9cbiAgdmFyIGNvbnRhaW5lciA9IHtcbiAgICBpbnZva2VQYXJ0aWFsOiAgICBWTS5pbnZva2VQYXJ0aWFsLFxuICAgIHByb2dyYW1zOiAgICAgICAgIFtdLFxuICAgIG5vb3A6ICAgICAgICAgICAgIFZNLm5vb3AsXG4gICAgcGFydGlhbDogICAgICAgICAgVk0ucGFydGlhbCxcbiAgICBlc2NhcGVFeHByZXNzaW9uOiBVdGlscy5lc2NhcGVFeHByZXNzaW9uLFxuICAgIHByb2dyYW1XaXRoRGVwdGg6IFZNLnByb2dyYW1XaXRoRGVwdGhcbiAgfTtcblxuICAvKipcbiAgICogUmVuZGVyIGFuZCBzdWJzY3JpYmUgYSBzaW5nbGUgRE9NIG5vZGUgdXNpbmcgYSBjdXN0b20gY3JlYXRpb24gZnVuY3Rpb24uXG4gICAqXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gY3JlYXRlXG4gICAqIEByZXR1cm4ge05vZGV9XG4gICAqL1xuICB2YXIgc3Vic2NyaWJlTm9kZSA9IGZ1bmN0aW9uIChmbiwgY3JlYXRlKSB7XG4gICAgdmFyIHN1YnNjcmlwdGlvbiA9IFZNLnN1YnNjcmliZShmbiwgZW52KTtcbiAgICB2YXIgdHJhY2tlciAgICAgID0gVXRpbHMudHJhY2tOb2RlKGNyZWF0ZShzdWJzY3JpcHRpb24oKSkpO1xuXG4gICAgLy8gUmVwbGFjZSB0aGUgdHJhY2tlZCBub2RlIGluIHBsYWNlLlxuICAgIHN1YnNjcmlwdGlvbi51cGRhdGUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHRyYWNrZXIucmVwbGFjZShjcmVhdGUodmFsdWUpKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHRyYWNrZXIuZnJhZ21lbnQ7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJlbW92ZSBhbiBhdHRyaWJ1dGUgZnJvbSBhbiBlbGVtZW50LlxuICAgKlxuICAgKiBAcGFyYW0ge05vZGV9ICAgZWxlbWVudFxuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICAgKi9cbiAgdmFyIHJlbW92ZUF0dHJpYnV0ZSA9IGZ1bmN0aW9uIChlbGVtZW50LCBuYW1lKSB7XG4gICAgaWYgKGVsZW1lbnQuaGFzQXR0cmlidXRlKG5hbWUpKSB7XG4gICAgICBlbnYuZW1pdCgncmVtb3ZlQXR0cmlidXRlJywgZWxlbWVudCwgbmFtZSk7XG4gICAgICBlbGVtZW50LnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIFNldCBhbiBhdHRyaWJ1dGUgdmFsdWUgb24gYW4gZWxlbWVudC5cbiAgICpcbiAgICogQHBhcmFtIHtOb2RlfSAgIGVsZW1lbnRcbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAgICogQHBhcmFtIHsqfSAgICAgIHZhbHVlXG4gICAqL1xuICB2YXIgc2V0QXR0cmlidXRlID0gZnVuY3Rpb24gKGVsZW1lbnQsIG5hbWUsIHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlID09PSBmYWxzZSkge1xuICAgICAgcmV0dXJuIHJlbW92ZUF0dHJpYnV0ZShlbGVtZW50LCBuYW1lKTtcbiAgICB9XG5cbiAgICBlbnYuZW1pdCgnc2V0QXR0cmlidXRlJywgZWxlbWVudCwgbmFtZSwgdmFsdWUpO1xuICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKG5hbWUsIHZhbHVlKTtcbiAgfTtcblxuICAvKipcbiAgICogQ3JlYXRlIGFuIGVsZW1lbnQgZnJvbSBhIHRhZyBuYW1lLlxuICAgKlxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IHRhZ05hbWVcbiAgICogQHJldHVybiB7Tm9kZX1cbiAgICovXG4gIHZhciBjcmVhdGVFbGVtZW50ID0gZnVuY3Rpb24gKHRhZ05hbWUpIHtcbiAgICB2YXIgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnTmFtZSk7XG4gICAgZW52LmVtaXQoJ2NyZWF0ZUVsZW1lbnQnLCBub2RlKTtcbiAgICByZXR1cm4gbm9kZTtcbiAgfTtcblxuICAvKipcbiAgICogQ3JlYXRlIGEgY29tbWVudCBub2RlIGJhc2VkIG9uIHRleHQgY29udGVudHMuXG4gICAqXG4gICAqIEBwYXJhbSAge1N0cmluZ30gY29udGVudHNcbiAgICogQHJldHVybiB7Tm9kZX1cbiAgICovXG4gIHZhciBjcmVhdGVDb21tZW50ID0gZnVuY3Rpb24gKHRhZ05hbWUpIHtcbiAgICB2YXIgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZUNvbW1lbnQodGFnTmFtZSk7XG4gICAgZW52LmVtaXQoJ2NyZWF0ZUNvbW1lbnQnLCBub2RlKTtcbiAgICByZXR1cm4gbm9kZTtcbiAgfTtcblxuICAvKipcbiAgICogQ29weSBhbGwgc2lnbmlmaWNhbnQgZGF0YSBmcm9tIG9uZSBlbGVtZW50IG5vZGUgdG8gYW5vdGhlci5cbiAgICpcbiAgICogQHBhcmFtICB7Tm9kZX0gbmV3Tm9kZVxuICAgKiBAcGFyYW0gIHtOb2RlfSBvbGROb2RlXG4gICAqIEByZXR1cm4ge05vZGV9XG4gICAqL1xuICB2YXIgY29weU5vZGUgPSBmdW5jdGlvbiAobmV3Tm9kZSwgb2xkTm9kZSkge1xuICAgIC8vIE1vdmUgYWxsIGNoaWxkIGVsZW1lbnRzIHRvIHRoZSBuZXcgbm9kZS5cbiAgICB3aGlsZSAob2xkTm9kZS5maXJzdENoaWxkKSB7XG4gICAgICBuZXdOb2RlLmFwcGVuZENoaWxkKG9sZE5vZGUuZmlyc3RDaGlsZCk7XG4gICAgfVxuXG4gICAgLy8gQ29weSBhbGwgdGhlIGF0dHJpYnV0ZXMgdG8gdGhlIG5ldyBub2RlLlxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2xkTm9kZS5hdHRyaWJ1dGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgYXR0cmlidXRlID0gb2xkTm9kZS5hdHRyaWJ1dGVzW2ldO1xuICAgICAgc2V0QXR0cmlidXRlKG5ld05vZGUsIGF0dHJpYnV0ZS5uYW1lLCBhdHRyaWJ1dGUudmFsdWUpO1xuICAgIH1cblxuICAgIHJldHVybiBuZXdOb2RlO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDb3B5IGFsbCB0aGUgZGF0YSBmcm9tIG9uZSBlbGVtZW50IHRvIGFub3RoZXIgYW5kIHJlcGxhY2UgaW4gcGxhY2UuXG4gICAqXG4gICAqIEBwYXJhbSAge05vZGV9IG5ld05vZGVcbiAgICogQHBhcmFtICB7Tm9kZX0gb2xkTm9kZVxuICAgKiBAcmV0dXJuIHtOb2RlfVxuICAgKi9cbiAgdmFyIGNvcHlBbmRSZXBsYWNlTm9kZSA9IGZ1bmN0aW9uIChuZXdOb2RlLCBvbGROb2RlKSB7XG4gICAgb2xkTm9kZS5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChjb3B5Tm9kZShuZXdOb2RlLCBvbGROb2RlKSwgb2xkTm9kZSk7XG4gICAgcmV0dXJuIG5ld05vZGU7XG4gIH07XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBlbGVtZW50IGFuZCBzdWJzY3JpYmUgdG8gYW55IGNoYW5nZXMuIFRoaXMgbWV0aG9kIHJlcXVpcmVzIGFcbiAgICogY2FsbGJhY2sgZnVuY3Rpb24gZm9yIGFueSBlbGVtZW50IGNoYW5nZXMgc2luY2UgeW91IGNhbid0IGNoYW5nZSBhIHRhZ1xuICAgKiBuYW1lIGluIHBsYWNlLlxuICAgKlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGNiXG4gICAqIEByZXR1cm4ge0VsZW1lbnR9XG4gICAqL1xuICBjb250YWluZXIuY3JlYXRlRWxlbWVudCA9IGZ1bmN0aW9uIChmbiwgY2IpIHtcbiAgICB2YXIgc3Vic2NyaXB0aW9uID0gVk0uc3Vic2NyaWJlKGZuLCBlbnYpO1xuICAgIHZhciBlbCAgICAgICAgICAgPSBjcmVhdGVFbGVtZW50KHN1YnNjcmlwdGlvbigpLCBlbnYpO1xuXG4gICAgc3Vic2NyaXB0aW9uLnVwZGF0ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgY2IoZWwgPSBjb3B5QW5kUmVwbGFjZU5vZGUoY3JlYXRlRWxlbWVudCh2YWx1ZSwgZW52KSwgZWwpKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGVsO1xuICB9O1xuXG4gIC8qKlxuICAgKiBBcHBlbmQgYW4gZWxlbWVudCB0byB0aGUgZW5kIG9mIGFub3RoZXIgZWxlbWVudC5cbiAgICpcbiAgICogQHBhcmFtIHtOb2RlfSBwYXJlbnRcbiAgICogQHBhcmFtIHtOb2RlfSBjaGlsZFxuICAgKi9cbiAgY29udGFpbmVyLmFwcGVuZENoaWxkID0gZnVuY3Rpb24gKHBhcmVudCwgY2hpbGQpIHtcbiAgICBpZiAoIWNoaWxkKSB7IHJldHVybjsgfVxuXG4gICAgcGFyZW50LmFwcGVuZENoaWxkKGNoaWxkKTtcbiAgICBlbnYuZW1pdCgnYXBwZW5kQ2hpbGQnLCBwYXJlbnQsIGNoaWxkKTtcbiAgfTtcblxuICAvKipcbiAgICogU2V0IGFuIGVsZW1lbnRzIGF0dHJpYnV0ZS4gV2UgYWNjZXB0IHRoZSBjdXJyZW50IGVsZW1lbnQgYSBmdW5jdGlvblxuICAgKiBiZWNhdXNlIHdoZW4gYSB0YWcgbmFtZSBjaGFuZ2VzIHdlIHdpbGwgbG9zZSByZWZlcmVuY2UgdG8gdGhlIGFjdGl2ZWx5XG4gICAqIHJlbmRlcmVkIGVsZW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGVsZW1lbnRGblxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBuYW1lRm5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gdmFsdWVGblxuICAgKi9cbiAgY29udGFpbmVyLnNldEF0dHJpYnV0ZSA9IGZ1bmN0aW9uIChlbGVtZW50Rm4sIG5hbWVGbiwgdmFsdWVGbikge1xuICAgIHZhciBuYW1lU3Vic2NyaXB0aW9uICA9IFZNLnN1YnNjcmliZShuYW1lRm4sIGVudik7XG4gICAgdmFyIHZhbHVlU3Vic2NyaXB0aW9uID0gVk0uc3Vic2NyaWJlKHZhbHVlRm4sIGVudik7XG5cbiAgICAvLyBLZWVwIHRyYWNrIG9mIHRoZSBjdXJyZW50IG5hbWUgYW5kIHZhbHVlIHdpdGhvdXQgaGF2aW5nIHRvIHJlLXJ1biB0aGVcbiAgICAvLyBmdW5jdGlvbiBldmVyeSB0aW1lIHNvbWV0aGluZyBjaGFuZ2VzLlxuICAgIHZhciBhdHRyTmFtZSAgPSBuYW1lU3Vic2NyaXB0aW9uKCk7XG4gICAgdmFyIGF0dHJWYWx1ZSA9IHZhbHVlU3Vic2NyaXB0aW9uKCk7XG5cbiAgICBuYW1lU3Vic2NyaXB0aW9uLnVwZGF0ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgcmVtb3ZlQXR0cmlidXRlKGVsZW1lbnRGbigpLCBhdHRyTmFtZSk7XG4gICAgICBzZXRBdHRyaWJ1dGUoZWxlbWVudEZuKCksIGF0dHJOYW1lID0gdmFsdWUsIGF0dHJWYWx1ZSk7XG4gICAgfTtcblxuICAgIHZhbHVlU3Vic2NyaXB0aW9uLnVwZGF0ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgc2V0QXR0cmlidXRlKGVsZW1lbnRGbigpLCBhdHRyTmFtZSwgYXR0clZhbHVlID0gdmFsdWUpO1xuICAgIH07XG5cbiAgICByZXR1cm4gc2V0QXR0cmlidXRlKGVsZW1lbnRGbigpLCBhdHRyTmFtZSwgYXR0clZhbHVlKTtcbiAgfTtcblxuICAvKipcbiAgICogQ3JlYXRlIGEgRE9NIGVsZW1lbnQgYW5kIHN1YnNjcmliZSB0byBhbnkgY2hhbmdlcy5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gICAqIEByZXR1cm4ge05vZGV9XG4gICAqL1xuICBjb250YWluZXIuY3JlYXRlRE9NID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgcmV0dXJuIHN1YnNjcmliZU5vZGUoZm4sIFV0aWxzLmRvbWlmeUV4cHJlc3Npb24pO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSB0ZXh0IG5vZGUgYW5kIHN1YnNjcmliZSB0byBhbnkgY2hhbmdlcy5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gICAqIEByZXR1cm4ge1RleHR9XG4gICAqL1xuICBjb250YWluZXIuY3JlYXRlVGV4dCA9IGZ1bmN0aW9uIChmbikge1xuICAgIHJldHVybiBzdWJzY3JpYmVOb2RlKGZuLCBVdGlscy50ZXh0aWZ5RXhwcmVzc2lvbik7XG4gIH07XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIGNvbW1lbnQgbm9kZSBhbmQgc3Vic2NyaWJlIHRvIGFueSBjaGFuZ2VzLlxuICAgKlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAgICogQHJldHVybiB7Q29tbWVudH1cbiAgICovXG4gIGNvbnRhaW5lci5jcmVhdGVDb21tZW50ID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgdmFyIHN1YnNjcmlwdGlvbiA9IFZNLnN1YnNjcmliZShmbiwgZW52KTtcbiAgICB2YXIgbm9kZSAgICAgICAgID0gY3JlYXRlQ29tbWVudChzdWJzY3JpcHRpb24oKSk7XG5cbiAgICBzdWJzY3JpcHRpb24udXBkYXRlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICBub2RlLnRleHRDb250ZW50ID0gdmFsdWU7XG4gICAgfTtcblxuICAgIHJldHVybiBub2RlO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYW5kIHJldHVybiBhIHByb2dyYW0gc2luZ2xldG9uIGJhc2VkIG9uIGluZGV4LlxuICAgKlxuICAgKiBAcGFyYW0gIHtOdW1iZXJ9ICAgaVxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAgICogQHBhcmFtICB7T2JqZWN0fSAgIGRhdGFcbiAgICogQHJldHVybiB7RnVuY3Rpb259XG4gICAqL1xuICBjb250YWluZXIucHJvZ3JhbSA9IGZ1bmN0aW9uIChpLCBmbiwgZGF0YSkge1xuICAgIHZhciBwcm9ncmFtV3JhcHBlciA9IGNvbnRhaW5lci5wcm9ncmFtc1tpXTtcblxuICAgIGlmIChkYXRhKSB7XG4gICAgICByZXR1cm4gVk0ucHJvZ3JhbShpLCBmbiwgZGF0YSk7XG4gICAgfVxuXG4gICAgaWYgKCFwcm9ncmFtV3JhcHBlcikge1xuICAgICAgcmV0dXJuIGNvbnRhaW5lci5wcm9ncmFtc1tpXSA9IFZNLnByb2dyYW0oaSwgZm4pO1xuICAgIH1cblxuICAgIHJldHVybiBwcm9ncmFtV3JhcHBlcjtcbiAgfTtcblxuICAvKipcbiAgICogV3JhcCBwcm9ncmFtIGZ1bmN0aW9ucyB3aXRoIHN1YnNjcmliZXIgZnVuY3Rpb25hbGl0eS5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IHByb2dyYW1cbiAgICogQHJldHVybiB7RnVuY3Rpb259XG4gICAqL1xuICBjb250YWluZXIud3JhcFByb2dyYW0gPSBmdW5jdGlvbiAoZm4pIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIHdyYXBTdWJzY3JpYmVyKGZuKS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH07XG5cbiAgLyoqXG4gICAqIE1lcmdlIHR3byBvYmplY3RzIGludG8gYSBzaW5nbGUgb2JqZWN0LlxuICAgKlxuICAgKiBAcGFyYW0gIHtPYmplY3R9IHBhcmFtXG4gICAqIEBwYXJhbSAge09iamVjdH0gY29tbW9uXG4gICAqIEByZXR1cm4ge09iamVjdH1cbiAgICovXG4gIGNvbnRhaW5lci5tZXJnZSA9IGZ1bmN0aW9uIChwYXJhbSwgY29tbW9uKSB7XG4gICAgdmFyIHJldCA9IHBhcmFtIHx8IGNvbW1vbjtcblxuICAgIGlmIChwYXJhbSAmJiBjb21tb24gJiYgKHBhcmFtICE9PSBjb21tb24pKSB7XG4gICAgICByZXQgPSB7fTtcbiAgICAgIFV0aWxzLmV4dGVuZChyZXQsIGNvbW1vbik7XG4gICAgICBVdGlscy5leHRlbmQocmV0LCBwYXJhbSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldDtcbiAgfTtcblxuICAvKipcbiAgICogR2V0IGEgcHJvcGVydHkgZnJvbSBhbiBvYmplY3QuIFBhc3NlcyBpbiB0aGUgb2JqZWN0IGlkIChkZXB0aCkgdG8gbWFrZSBpdFxuICAgKiBtdWNoIGZhc3RlciB0byBkbyBjb21wYXJpc29ucyBiZXR3ZWVuIG5ldyBhbmQgb2xkIHN1YnNjcmlwdGlvbnMuXG4gICAqXG4gICAqIEBwYXJhbSAge09iamVjdH0gb2JqZWN0XG4gICAqIEBwYXJhbSAge1N0cmluZ30gcHJvcGVydHlcbiAgICogQHBhcmFtICB7U3RyaW5nfSBpZFxuICAgKiBAcmV0dXJuIHsqfVxuICAgKi9cbiAgY29udGFpbmVyLmdldCA9IGZ1bmN0aW9uIChvYmplY3QsIHByb3BlcnR5LCBpZCkge1xuICAgIHZhciBzdWJzY3JpcHRpb25zID0gVk0uc3Vic2NyaWJlci5zdWJzY3JpcHRpb25zO1xuXG4gICAgKHN1YnNjcmlwdGlvbnNbcHJvcGVydHldIHx8IChzdWJzY3JpcHRpb25zW3Byb3BlcnR5XSA9IHt9KSlbaWRdID0gb2JqZWN0O1xuXG4gICAgcmV0dXJuIGVudi5nZXQob2JqZWN0LCBwcm9wZXJ0eSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgY29tcGlsZWQgSmF2YVNjcmlwdCBmdW5jdGlvbiBmb3IgZXhlY3V0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGNvbnRleHRcbiAgICogQHBhcmFtICB7T2JqZWN0fSBvcHRpb25zXG4gICAqIEByZXR1cm4ge05vZGV9XG4gICAqL1xuICByZXR1cm4gd3JhcFN1YnNjcmliZXIoZnVuY3Rpb24gKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIHZhciByZXN1bHQgPSB0ZW1wbGF0ZVNwZWMuY2FsbChcbiAgICAgIGNvbnRhaW5lcixcbiAgICAgIGVudixcbiAgICAgIGNvbnRleHQsXG4gICAgICBvcHRpb25zLmhlbHBlcnMsXG4gICAgICBvcHRpb25zLnBhcnRpYWxzLFxuICAgICAgb3B0aW9ucy5kYXRhXG4gICAgKTtcblxuICAgIHZhciBjb21waWxlckluZm8gICAgID0gY29udGFpbmVyLmNvbXBpbGVySW5mbyB8fCBbXTtcbiAgICB2YXIgY29tcGlsZXJSZXZpc2lvbiA9IGNvbXBpbGVySW5mb1swXSB8fCAxO1xuICAgIHZhciBjdXJyZW50UmV2aXNpb24gID0gZW52LkNPTVBJTEVSX1JFVklTSU9OO1xuXG4gICAgaWYgKGNvbXBpbGVyUmV2aXNpb24gIT09IGN1cnJlbnRSZXZpc2lvbikge1xuICAgICAgaWYgKGNvbXBpbGVyUmV2aXNpb24gPCBjdXJyZW50UmV2aXNpb24pIHtcbiAgICAgICAgdmFyIHJ1bnRpbWVWZXJzaW9ucyAgPSBlbnYuUkVWSVNJT05fQ0hBTkdFU1tjdXJyZW50UmV2aXNpb25dO1xuICAgICAgICB2YXIgY29tcGlsZXJWZXJzaW9ucyA9IGVudi5SRVZJU0lPTl9DSEFOR0VTW2NvbXBpbGVyUmV2aXNpb25dO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGFuIG9sZGVyIHZlcnNpb24gb2YgJyArXG4gICAgICAgICAgJ0RPTUJhcnMgdGhhbiB0aGUgY3VycmVudCBydW50aW1lLiBQbGVhc2UgdXBkYXRlIHlvdXIgcHJlY29tcGlsZXInICtcbiAgICAgICAgICAnIHRvIGEgbmV3ZXIgdmVyc2lvbiAoJyArIHJ1bnRpbWVWZXJzaW9ucyArICcpIG9yIGRvd25ncmFkZSB5b3VyICcgK1xuICAgICAgICAgICdydW50aW1lIHRvIGFuIG9sZGVyIHZlcnNpb24gKCcgKyBjb21waWxlclZlcnNpb25zICsgJyknKTtcbiAgICAgIH1cblxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhIG5ld2VyIHZlcnNpb24gb2YgJyArXG4gICAgICAgICdET01CYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gUGxlYXNlIHVwZGF0ZSB5b3VyIHJ1bnRpbWUgdG8gJyArXG4gICAgICAgICdhIG5ld2VyIHZlcnNpb24gKCcgKyBjb21waWxlckluZm9bMV0gKyAnKScpO1xuICAgIH1cblxuICAgIC8vIFJldHVybiBhbiBvYmplY3QgYmFjayB0byB0aGUgdXNlciB3aXRoIHVzZWZ1bCBmdW5jdGlvbmFsaXR5LlxuICAgIHJldHVybiByZXN1bHQ7XG4gIH0pO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3NhZmUtc3RyaW5nJykuZGVmYXVsdDtcbiIsInZhciBUcmFja05vZGUgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChub2RlKSB7XG4gIHRoaXMuZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG5cbiAgLy8gSW5zdGFudGx5IGFwcGVuZCBhIGJlZm9yZSBhbmQgYWZ0ZXIgdHJhY2tpbmcgbm9kZS5cbiAgdGhpcy5iZWZvcmUgPSB0aGlzLmZyYWdtZW50LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKSk7XG4gIHRoaXMuYWZ0ZXIgID0gdGhpcy5mcmFnbWVudC5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJykpO1xuXG4gIC8vIEFwcGVuZCB0aGUgcGFzc2VkIGluIG5vZGUgdG8gdGhlIGN1cnJlbnQgZnJhZ21lbnQuXG4gIG5vZGUgJiYgdGhpcy5hcHBlbmRDaGlsZChub2RlKTtcbn07XG5cbi8qKlxuICogQXBwZW5kIGEgbm9kZSB0byB0aGUgY3VycmVudCB0cmFja2luZyBmcmFnbWVudC5cbiAqXG4gKiBAcGFyYW0gIHtOb2RlfSBub2RlXG4gKiBAcmV0dXJuIHt0aGlzfVxuICovXG5UcmFja05vZGUucHJvdG90eXBlLmFwcGVuZENoaWxkID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgdGhpcy5hZnRlci5wYXJlbnROb2RlLmluc2VydEJlZm9yZShub2RlLCB0aGlzLmFmdGVyKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUHJlcGVuZCBhIG5vZGUgdG8gdGhlIGN1cnJlbnQgdHJhY2tpbmcgZnJhZ21lbnQuXG4gKlxuICogQHBhcmFtICB7Tm9kZX0gbm9kZVxuICogQHJldHVybiB7dGhpc31cbiAqL1xuVHJhY2tOb2RlLnByb3RvdHlwZS5wcmVwZW5kQ2hpbGQgPSBmdW5jdGlvbiAobm9kZSkge1xuICB0aGlzLmJlZm9yZS5wYXJlbnROb2RlLmluc2VydEJlZm9yZShub2RlLCB0aGlzLmJlZm9yZS5uZXh0U2libGluZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBhbGwgZWxlbWVudHMgYmV0d2VlbiB0aGUgdHdvIHRyYWNraW5nIG5vZGVzLlxuICpcbiAqIEBwYXJhbSAge05vZGV9IG5vZGVcbiAqIEByZXR1cm4ge3RoaXN9XG4gKi9cblRyYWNrTm9kZS5wcm90b3R5cGUuZW1wdHkgPSBmdW5jdGlvbiAoKSB7XG4gIHdoaWxlICh0aGlzLmJlZm9yZS5uZXh0U2libGluZyAhPT0gdGhpcy5hZnRlcikge1xuICAgIHRoaXMuYmVmb3JlLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5iZWZvcmUubmV4dFNpYmxpbmcpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSB0aGUgdGhlIGVsZW1lbnRzIGZyb20gdGhlIERPTS5cbiAqXG4gKiBAcGFyYW0gIHtOb2RlfSBub2RlXG4gKiBAcmV0dXJuIHt0aGlzfVxuICovXG5UcmFja05vZGUucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uICgpIHtcbiAgd2hpbGUgKHRoaXMuYmVmb3JlLm5leHRTaWJsaW5nICE9PSB0aGlzLmFmdGVyKSB7XG4gICAgdGhpcy5mcmFnbWVudC5hcHBlbmRDaGlsZCh0aGlzLmJlZm9yZS5uZXh0U2libGluZyk7XG4gIH1cblxuICAvLyBQdWxsIHRoZSB0d28gcmVmZXJlbmNlIG5vZGVzIG91dCBvZiB0aGUgRE9NIGFuZCBpbnRvIHRoZSBmcmFnbWVudC5cbiAgdGhpcy5mcmFnbWVudC5hcHBlbmRDaGlsZCh0aGlzLmFmdGVyKTtcbiAgdGhpcy5mcmFnbWVudC5pbnNlcnRCZWZvcmUodGhpcy5iZWZvcmUsIHRoaXMuZnJhZ21lbnQuZmlyc3RDaGlsZCk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlcGxhY2UgdGhlIGNvbnRlbnRzIG9mIHRoZSB0cmFja2luZyBub2RlIHdpdGggbmV3IGNvbnRlbnRzLlxuICpcbiAqIEBwYXJhbSAge05vZGV9IG5vZGVcbiAqIEByZXR1cm4ge3RoaXN9XG4gKi9cblRyYWNrTm9kZS5wcm90b3R5cGUucmVwbGFjZSA9IGZ1bmN0aW9uIChub2RlKSB7XG4gIHJldHVybiB0aGlzLmVtcHR5KCkuYXBwZW5kQ2hpbGQobm9kZSk7XG59O1xuIiwidmFyIGhic1V0aWxzICAgPSByZXF1aXJlKCdoYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvdXRpbHMnKTtcbnZhciB1bmlxdWVJZCAgID0gMDtcbnZhciBUcmFja05vZGUgID0gcmVxdWlyZSgnLi90cmFjay1ub2RlJyk7XG52YXIgU2FmZVN0cmluZyA9IHJlcXVpcmUoJy4vc2FmZS1zdHJpbmcnKTtcblxuLyoqXG4gKiBTaW1wbGUgd2F5IHRvIHN1YmNsYXNzIGFuIG9iamVjdCwgd2l0aCBzdXBwb3J0IGZvciBvbGRlciBicm93c2Vycy5cbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cbnZhciBjcmVhdGUgPSBPYmplY3QuY3JlYXRlIHx8IChmdW5jdGlvbiAoKSB7XG4gIHZhciBGID0gZnVuY3Rpb24gKCkge307XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIChvKSB7XG4gICAgRi5wcm90b3R5cGUgPSBvO1xuICAgIHZhciBvYmogPSBuZXcgRigpO1xuICAgIEYucHJvdG90eXBlID0gbnVsbDtcbiAgICByZXR1cm4gb2JqO1xuICB9O1xufSkoKTtcblxuLyoqXG4gKiBFeHRlbmQgSGFuZGxlYmFycyB1dGlsaXRpZXMgd2l0aCBET00gZnVuY3Rpb25hbGl0eS5cbiAqXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG52YXIgVXRpbHMgPSBtb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZShoYnNVdGlscyk7XG5cbi8qKlxuICogUmV0dXJuIGEgdW5pcXVlIGlkLlxuICpcbiAqIEByZXR1cm4ge051bWJlcn1cbiAqL1xuVXRpbHMudW5pcXVlSWQgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB1bmlxdWVJZCsrO1xufTtcblxuLyoqXG4gKiBFeHBvc2UgdGhlIGNyZWF0ZSBmdW5jdGlvbi5cbiAqXG4gKiBAdHlwZSB7RnVuY3Rpb259XG4gKi9cblV0aWxzLmNyZWF0ZSA9IGNyZWF0ZTtcblxuLyoqXG4gKiBDaGVjayB3aGV0aGVyIGFuIG9iamVjdCBpcyBhY3R1YWxseSBhIERPTSBub2RlLlxuICpcbiAqIEBwYXJhbSAgeyp9ICAgICAgIGVsZW1lbnRcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKi9cblV0aWxzLmlzTm9kZSA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gIHJldHVybiBlbGVtZW50IGluc3RhbmNlb2YgTm9kZTtcbn07XG5cbi8qKlxuICogVHJhY2sgYSBub2RlIGluc3RhbmNlIGFueXdoZXJlIGl0IGdvZXMgaW4gdGhlIERPTS5cbiAqXG4gKiBAcGFyYW0gIHtOb2RlfSAgICAgIG5vZGVcbiAqIEByZXR1cm4ge1RyYWNrTm9kZX1cbiAqL1xuVXRpbHMudHJhY2tOb2RlID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgcmV0dXJuIG5ldyBUcmFja05vZGUobm9kZSk7XG59O1xuXG4vKipcbiAqIFRyYW5zZm9ybSBhIHN0cmluZyBpbnRvIGFyYml0cmFyeSBET00gbm9kZXMuXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBzdHJpbmdcbiAqIEByZXR1cm4ge05vZGV9XG4gKi9cblV0aWxzLmRvbWlmeUV4cHJlc3Npb24gPSBmdW5jdGlvbiAoc3RyaW5nKSB7XG4gIC8vIElmIHdlIHBhc3NlZCBpbiBhIHNhZmUgc3RyaW5nLCBnZXQgdGhlIGFjdHVhbCB2YWx1ZS5cbiAgaWYgKHN0cmluZyBpbnN0YW5jZW9mIFNhZmVTdHJpbmcpIHtcbiAgICBzdHJpbmcgPSBzdHJpbmcuc3RyaW5nO1xuICB9XG5cbiAgLy8gTm8gbmVlZCB0byBjb2VyY2UgYSBub2RlLlxuICBpZiAoVXRpbHMuaXNOb2RlKHN0cmluZykpIHtcbiAgICByZXR1cm4gc3RyaW5nO1xuICB9XG5cbiAgdmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBkaXYuaW5uZXJIVE1MID0gc3RyaW5nO1xuXG4gIGlmIChkaXYuY2hpbGROb2Rlcy5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gZGl2LnJlbW92ZUNoaWxkKGRpdi5jaGlsZE5vZGVzWzBdKTtcbiAgfVxuXG4gIHZhciBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcblxuICB3aGlsZSAoZGl2LmZpcnN0Q2hpbGQpIHtcbiAgICBmcmFnbWVudC5hcHBlbmRDaGlsZChkaXYuZmlyc3RDaGlsZCk7XG4gIH1cblxuICByZXR1cm4gZnJhZ21lbnQ7XG59O1xuXG4vKipcbiAqIFRyYW5zZm9ybSBhIHN0cmluZyBpbnRvIGEgRE9NIHRleHQgbm9kZSBmb3IgYXBwZW5kaW5nIHRvIHRoZSB0ZW1wbGF0ZS5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHN0cmluZ1xuICogQHJldHVybiB7VGV4dH1cbiAqL1xuVXRpbHMudGV4dGlmeUV4cHJlc3Npb24gPSBmdW5jdGlvbiAoc3RyaW5nKSB7XG4gIGlmIChzdHJpbmcgaW5zdGFuY2VvZiBTYWZlU3RyaW5nKSB7XG4gICAgcmV0dXJuIFV0aWxzLmRvbWlmeUV4cHJlc3Npb24oc3RyaW5nLnN0cmluZyk7XG4gIH1cblxuICAvLyBDYXRjaCB3aGVuIHRoZSBzdHJpbmcgaXMgYWN0dWFsbHkgYSBET00gbm9kZSBhbmQgdHVybiBpdCBpbnRvIGEgc3RyaW5nLlxuICBpZiAoVXRpbHMuaXNOb2RlKHN0cmluZykpIHtcbiAgICAvLyBBbHJlYWR5IGEgdGV4dCBub2RlLCBqdXN0IHJldHVybiBpdCBpbW1lZGlhdGVseS5cbiAgICBpZiAoc3RyaW5nLm5vZGVUeXBlID09PSAzKSB7XG4gICAgICByZXR1cm4gc3RyaW5nO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2Ygc3RyaW5nLm91dGVySFRNTCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzdHJpbmcub3V0ZXJIVE1MKTtcbiAgICB9XG5cbiAgICB2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgZGl2LmFwcGVuZENoaWxkKHN0cmluZy5jbG9uZU5vZGUodHJ1ZSkpO1xuICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShkaXYuaW5uZXJIVE1MKTtcbiAgfVxuXG4gIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzdHJpbmcgPT0gbnVsbCA/ICcnIDogc3RyaW5nKTtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcbi8qZ2xvYmFscyBFeGNlcHRpb24sIFV0aWxzICovXG52YXIgVXRpbHMgPSByZXF1aXJlKFwiLi91dGlsc1wiKTtcbnZhciBFeGNlcHRpb24gPSByZXF1aXJlKFwiLi9leGNlcHRpb25cIilbXCJkZWZhdWx0XCJdO1xuXG52YXIgVkVSU0lPTiA9IFwiMS4xLjJcIjtcbmV4cG9ydHMuVkVSU0lPTiA9IFZFUlNJT047dmFyIENPTVBJTEVSX1JFVklTSU9OID0gNDtcbmV4cG9ydHMuQ09NUElMRVJfUkVWSVNJT04gPSBDT01QSUxFUl9SRVZJU0lPTjtcbnZhciBSRVZJU0lPTl9DSEFOR0VTID0ge1xuICAxOiAnPD0gMS4wLnJjLjInLCAvLyAxLjAucmMuMiBpcyBhY3R1YWxseSByZXYyIGJ1dCBkb2Vzbid0IHJlcG9ydCBpdFxuICAyOiAnPT0gMS4wLjAtcmMuMycsXG4gIDM6ICc9PSAxLjAuMC1yYy40JyxcbiAgNDogJz49IDEuMC4wJ1xufTtcbmV4cG9ydHMuUkVWSVNJT05fQ0hBTkdFUyA9IFJFVklTSU9OX0NIQU5HRVM7XG52YXIgaXNBcnJheSA9IFV0aWxzLmlzQXJyYXksXG4gICAgaXNGdW5jdGlvbiA9IFV0aWxzLmlzRnVuY3Rpb24sXG4gICAgdG9TdHJpbmcgPSBVdGlscy50b1N0cmluZyxcbiAgICBvYmplY3RUeXBlID0gJ1tvYmplY3QgT2JqZWN0XSc7XG5cbmZ1bmN0aW9uIEhhbmRsZWJhcnNFbnZpcm9ubWVudChoZWxwZXJzLCBwYXJ0aWFscykge1xuICB0aGlzLmhlbHBlcnMgPSBoZWxwZXJzIHx8IHt9O1xuICB0aGlzLnBhcnRpYWxzID0gcGFydGlhbHMgfHwge307XG5cbiAgcmVnaXN0ZXJEZWZhdWx0SGVscGVycyh0aGlzKTtcbn1cblxuZXhwb3J0cy5IYW5kbGViYXJzRW52aXJvbm1lbnQgPSBIYW5kbGViYXJzRW52aXJvbm1lbnQ7SGFuZGxlYmFyc0Vudmlyb25tZW50LnByb3RvdHlwZSA9IHtcbiAgY29uc3RydWN0b3I6IEhhbmRsZWJhcnNFbnZpcm9ubWVudCxcblxuICBsb2dnZXI6IGxvZ2dlcixcbiAgbG9nOiBsb2csXG5cbiAgcmVnaXN0ZXJIZWxwZXI6IGZ1bmN0aW9uKG5hbWUsIGZuLCBpbnZlcnNlKSB7XG4gICAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICAgIGlmIChpbnZlcnNlIHx8IGZuKSB7IHRocm93IG5ldyBFeGNlcHRpb24oJ0FyZyBub3Qgc3VwcG9ydGVkIHdpdGggbXVsdGlwbGUgaGVscGVycycpOyB9XG4gICAgICBVdGlscy5leHRlbmQodGhpcy5oZWxwZXJzLCBuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGludmVyc2UpIHsgZm4ubm90ID0gaW52ZXJzZTsgfVxuICAgICAgdGhpcy5oZWxwZXJzW25hbWVdID0gZm47XG4gICAgfVxuICB9LFxuXG4gIHJlZ2lzdGVyUGFydGlhbDogZnVuY3Rpb24obmFtZSwgc3RyKSB7XG4gICAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICAgIFV0aWxzLmV4dGVuZCh0aGlzLnBhcnRpYWxzLCAgbmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucGFydGlhbHNbbmFtZV0gPSBzdHI7XG4gICAgfVxuICB9XG59O1xuXG5mdW5jdGlvbiByZWdpc3RlckRlZmF1bHRIZWxwZXJzKGluc3RhbmNlKSB7XG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdoZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24oYXJnKSB7XG4gICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PT0gMikge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyBoZWxwZXI6ICdcIiArIGFyZyArIFwiJ1wiKTtcbiAgICB9XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdibG9ja0hlbHBlck1pc3NpbmcnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgdmFyIGludmVyc2UgPSBvcHRpb25zLmludmVyc2UgfHwgZnVuY3Rpb24oKSB7fSwgZm4gPSBvcHRpb25zLmZuO1xuXG4gICAgaWYgKGlzRnVuY3Rpb24oY29udGV4dCkpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gICAgaWYoY29udGV4dCA9PT0gdHJ1ZSkge1xuICAgICAgcmV0dXJuIGZuKHRoaXMpO1xuICAgIH0gZWxzZSBpZihjb250ZXh0ID09PSBmYWxzZSB8fCBjb250ZXh0ID09IG51bGwpIHtcbiAgICAgIHJldHVybiBpbnZlcnNlKHRoaXMpO1xuICAgIH0gZWxzZSBpZiAoaXNBcnJheShjb250ZXh0KSkge1xuICAgICAgaWYoY29udGV4dC5sZW5ndGggPiAwKSB7XG4gICAgICAgIHJldHVybiBpbnN0YW5jZS5oZWxwZXJzLmVhY2goY29udGV4dCwgb3B0aW9ucyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gaW52ZXJzZSh0aGlzKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZuKGNvbnRleHQpO1xuICAgIH1cbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2VhY2gnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgdmFyIGZuID0gb3B0aW9ucy5mbiwgaW52ZXJzZSA9IG9wdGlvbnMuaW52ZXJzZTtcbiAgICB2YXIgaSA9IDAsIHJldCA9IFwiXCIsIGRhdGE7XG5cbiAgICBpZiAoaXNGdW5jdGlvbihjb250ZXh0KSkgeyBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpOyB9XG5cbiAgICBpZiAob3B0aW9ucy5kYXRhKSB7XG4gICAgICBkYXRhID0gY3JlYXRlRnJhbWUob3B0aW9ucy5kYXRhKTtcbiAgICB9XG5cbiAgICBpZihjb250ZXh0ICYmIHR5cGVvZiBjb250ZXh0ID09PSAnb2JqZWN0Jykge1xuICAgICAgaWYgKGlzQXJyYXkoY29udGV4dCkpIHtcbiAgICAgICAgZm9yKHZhciBqID0gY29udGV4dC5sZW5ndGg7IGk8ajsgaSsrKSB7XG4gICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgIGRhdGEuaW5kZXggPSBpO1xuICAgICAgICAgICAgZGF0YS5maXJzdCA9IChpID09PSAwKVxuICAgICAgICAgICAgZGF0YS5sYXN0ICA9IChpID09PSAoY29udGV4dC5sZW5ndGgtMSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXQgPSByZXQgKyBmbihjb250ZXh0W2ldLCB7IGRhdGE6IGRhdGEgfSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvcih2YXIga2V5IGluIGNvbnRleHQpIHtcbiAgICAgICAgICBpZihjb250ZXh0Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIGlmKGRhdGEpIHsgZGF0YS5rZXkgPSBrZXk7IH1cbiAgICAgICAgICAgIHJldCA9IHJldCArIGZuKGNvbnRleHRba2V5XSwge2RhdGE6IGRhdGF9KTtcbiAgICAgICAgICAgIGkrKztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZihpID09PSAwKXtcbiAgICAgIHJldCA9IGludmVyc2UodGhpcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldDtcbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2lmJywgZnVuY3Rpb24oY29uZGl0aW9uYWwsIG9wdGlvbnMpIHtcbiAgICBpZiAoaXNGdW5jdGlvbihjb25kaXRpb25hbCkpIHsgY29uZGl0aW9uYWwgPSBjb25kaXRpb25hbC5jYWxsKHRoaXMpOyB9XG5cbiAgICAvLyBEZWZhdWx0IGJlaGF2aW9yIGlzIHRvIHJlbmRlciB0aGUgcG9zaXRpdmUgcGF0aCBpZiB0aGUgdmFsdWUgaXMgdHJ1dGh5IGFuZCBub3QgZW1wdHkuXG4gICAgLy8gVGhlIGBpbmNsdWRlWmVyb2Agb3B0aW9uIG1heSBiZSBzZXQgdG8gdHJlYXQgdGhlIGNvbmR0aW9uYWwgYXMgcHVyZWx5IG5vdCBlbXB0eSBiYXNlZCBvbiB0aGVcbiAgICAvLyBiZWhhdmlvciBvZiBpc0VtcHR5LiBFZmZlY3RpdmVseSB0aGlzIGRldGVybWluZXMgaWYgMCBpcyBoYW5kbGVkIGJ5IHRoZSBwb3NpdGl2ZSBwYXRoIG9yIG5lZ2F0aXZlLlxuICAgIGlmICgoIW9wdGlvbnMuaGFzaC5pbmNsdWRlWmVybyAmJiAhY29uZGl0aW9uYWwpIHx8IFV0aWxzLmlzRW1wdHkoY29uZGl0aW9uYWwpKSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5pbnZlcnNlKHRoaXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5mbih0aGlzKTtcbiAgICB9XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCd1bmxlc3MnLCBmdW5jdGlvbihjb25kaXRpb25hbCwgb3B0aW9ucykge1xuICAgIHJldHVybiBpbnN0YW5jZS5oZWxwZXJzWydpZiddLmNhbGwodGhpcywgY29uZGl0aW9uYWwsIHtmbjogb3B0aW9ucy5pbnZlcnNlLCBpbnZlcnNlOiBvcHRpb25zLmZuLCBoYXNoOiBvcHRpb25zLmhhc2h9KTtcbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ3dpdGgnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24oY29udGV4dCkpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gICAgaWYgKCFVdGlscy5pc0VtcHR5KGNvbnRleHQpKSByZXR1cm4gb3B0aW9ucy5mbihjb250ZXh0KTtcbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2xvZycsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICB2YXIgbGV2ZWwgPSBvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5kYXRhLmxldmVsICE9IG51bGwgPyBwYXJzZUludChvcHRpb25zLmRhdGEubGV2ZWwsIDEwKSA6IDE7XG4gICAgaW5zdGFuY2UubG9nKGxldmVsLCBjb250ZXh0KTtcbiAgfSk7XG59XG5cbnZhciBsb2dnZXIgPSB7XG4gIG1ldGhvZE1hcDogeyAwOiAnZGVidWcnLCAxOiAnaW5mbycsIDI6ICd3YXJuJywgMzogJ2Vycm9yJyB9LFxuXG4gIC8vIFN0YXRlIGVudW1cbiAgREVCVUc6IDAsXG4gIElORk86IDEsXG4gIFdBUk46IDIsXG4gIEVSUk9SOiAzLFxuICBsZXZlbDogMyxcblxuICAvLyBjYW4gYmUgb3ZlcnJpZGRlbiBpbiB0aGUgaG9zdCBlbnZpcm9ubWVudFxuICBsb2c6IGZ1bmN0aW9uKGxldmVsLCBvYmopIHtcbiAgICBpZiAobG9nZ2VyLmxldmVsIDw9IGxldmVsKSB7XG4gICAgICB2YXIgbWV0aG9kID0gbG9nZ2VyLm1ldGhvZE1hcFtsZXZlbF07XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnICYmIGNvbnNvbGVbbWV0aG9kXSkge1xuICAgICAgICBjb25zb2xlW21ldGhvZF0uY2FsbChjb25zb2xlLCBvYmopO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcbmV4cG9ydHMubG9nZ2VyID0gbG9nZ2VyO1xuZnVuY3Rpb24gbG9nKGxldmVsLCBvYmopIHsgbG9nZ2VyLmxvZyhsZXZlbCwgb2JqKTsgfVxuXG5leHBvcnRzLmxvZyA9IGxvZzt2YXIgY3JlYXRlRnJhbWUgPSBmdW5jdGlvbihvYmplY3QpIHtcbiAgdmFyIG9iaiA9IHt9O1xuICBVdGlscy5leHRlbmQob2JqLCBvYmplY3QpO1xuICByZXR1cm4gb2JqO1xufTtcbmV4cG9ydHMuY3JlYXRlRnJhbWUgPSBjcmVhdGVGcmFtZTsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIGVycm9yUHJvcHMgPSBbJ2Rlc2NyaXB0aW9uJywgJ2ZpbGVOYW1lJywgJ2xpbmVOdW1iZXInLCAnbWVzc2FnZScsICduYW1lJywgJ251bWJlcicsICdzdGFjayddO1xuXG5mdW5jdGlvbiBFeGNlcHRpb24oLyogbWVzc2FnZSAqLykge1xuICB2YXIgdG1wID0gRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgLy8gVW5mb3J0dW5hdGVseSBlcnJvcnMgYXJlIG5vdCBlbnVtZXJhYmxlIGluIENocm9tZSAoYXQgbGVhc3QpLCBzbyBgZm9yIHByb3AgaW4gdG1wYCBkb2Vzbid0IHdvcmsuXG4gIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IGVycm9yUHJvcHMubGVuZ3RoOyBpZHgrKykge1xuICAgIHRoaXNbZXJyb3JQcm9wc1tpZHhdXSA9IHRtcFtlcnJvclByb3BzW2lkeF1dO1xuICB9XG59XG5cbkV4Y2VwdGlvbi5wcm90b3R5cGUgPSBuZXcgRXJyb3IoKTtcblxuZXhwb3J0c1tcImRlZmF1bHRcIl0gPSBFeGNlcHRpb247IiwiXCJ1c2Ugc3RyaWN0XCI7XG4vKmdsb2JhbCBVdGlscyAqL1xudmFyIFV0aWxzID0gcmVxdWlyZShcIi4vdXRpbHNcIik7XG52YXIgRXhjZXB0aW9uID0gcmVxdWlyZShcIi4vZXhjZXB0aW9uXCIpW1wiZGVmYXVsdFwiXTtcbnZhciBDT01QSUxFUl9SRVZJU0lPTiA9IHJlcXVpcmUoXCIuL2Jhc2VcIikuQ09NUElMRVJfUkVWSVNJT047XG52YXIgUkVWSVNJT05fQ0hBTkdFUyA9IHJlcXVpcmUoXCIuL2Jhc2VcIikuUkVWSVNJT05fQ0hBTkdFUztcblxuZnVuY3Rpb24gY2hlY2tSZXZpc2lvbihjb21waWxlckluZm8pIHtcbiAgdmFyIGNvbXBpbGVyUmV2aXNpb24gPSBjb21waWxlckluZm8gJiYgY29tcGlsZXJJbmZvWzBdIHx8IDEsXG4gICAgICBjdXJyZW50UmV2aXNpb24gPSBDT01QSUxFUl9SRVZJU0lPTjtcblxuICBpZiAoY29tcGlsZXJSZXZpc2lvbiAhPT0gY3VycmVudFJldmlzaW9uKSB7XG4gICAgaWYgKGNvbXBpbGVyUmV2aXNpb24gPCBjdXJyZW50UmV2aXNpb24pIHtcbiAgICAgIHZhciBydW50aW1lVmVyc2lvbnMgPSBSRVZJU0lPTl9DSEFOR0VTW2N1cnJlbnRSZXZpc2lvbl0sXG4gICAgICAgICAgY29tcGlsZXJWZXJzaW9ucyA9IFJFVklTSU9OX0NIQU5HRVNbY29tcGlsZXJSZXZpc2lvbl07XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhbiBvbGRlciB2ZXJzaW9uIG9mIEhhbmRsZWJhcnMgdGhhbiB0aGUgY3VycmVudCBydW50aW1lLiBcIitcbiAgICAgICAgICAgIFwiUGxlYXNlIHVwZGF0ZSB5b3VyIHByZWNvbXBpbGVyIHRvIGEgbmV3ZXIgdmVyc2lvbiAoXCIrcnVudGltZVZlcnNpb25zK1wiKSBvciBkb3duZ3JhZGUgeW91ciBydW50aW1lIHRvIGFuIG9sZGVyIHZlcnNpb24gKFwiK2NvbXBpbGVyVmVyc2lvbnMrXCIpLlwiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVXNlIHRoZSBlbWJlZGRlZCB2ZXJzaW9uIGluZm8gc2luY2UgdGhlIHJ1bnRpbWUgZG9lc24ndCBrbm93IGFib3V0IHRoaXMgcmV2aXNpb24geWV0XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhIG5ld2VyIHZlcnNpb24gb2YgSGFuZGxlYmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuIFwiK1xuICAgICAgICAgICAgXCJQbGVhc2UgdXBkYXRlIHlvdXIgcnVudGltZSB0byBhIG5ld2VyIHZlcnNpb24gKFwiK2NvbXBpbGVySW5mb1sxXStcIikuXCIpO1xuICAgIH1cbiAgfVxufVxuXG4vLyBUT0RPOiBSZW1vdmUgdGhpcyBsaW5lIGFuZCBicmVhayB1cCBjb21waWxlUGFydGlhbFxuXG5mdW5jdGlvbiB0ZW1wbGF0ZSh0ZW1wbGF0ZVNwZWMsIGVudikge1xuICBpZiAoIWVudikge1xuICAgIHRocm93IG5ldyBFcnJvcihcIk5vIGVudmlyb25tZW50IHBhc3NlZCB0byB0ZW1wbGF0ZVwiKTtcbiAgfVxuXG4gIHZhciBpbnZva2VQYXJ0aWFsV3JhcHBlcjtcbiAgaWYgKGVudi5jb21waWxlKSB7XG4gICAgaW52b2tlUGFydGlhbFdyYXBwZXIgPSBmdW5jdGlvbihwYXJ0aWFsLCBuYW1lLCBjb250ZXh0LCBoZWxwZXJzLCBwYXJ0aWFscywgZGF0YSkge1xuICAgICAgLy8gVE9ETyA6IENoZWNrIHRoaXMgZm9yIGFsbCBpbnB1dHMgYW5kIHRoZSBvcHRpb25zIGhhbmRsaW5nIChwYXJ0aWFsIGZsYWcsIGV0YykuIFRoaXMgZmVlbHNcbiAgICAgIC8vIGxpa2UgdGhlcmUgc2hvdWxkIGJlIGEgY29tbW9uIGV4ZWMgcGF0aFxuICAgICAgdmFyIHJlc3VsdCA9IGludm9rZVBhcnRpYWwuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIGlmIChyZXN1bHQpIHsgcmV0dXJuIHJlc3VsdDsgfVxuXG4gICAgICB2YXIgb3B0aW9ucyA9IHsgaGVscGVyczogaGVscGVycywgcGFydGlhbHM6IHBhcnRpYWxzLCBkYXRhOiBkYXRhIH07XG4gICAgICBwYXJ0aWFsc1tuYW1lXSA9IGVudi5jb21waWxlKHBhcnRpYWwsIHsgZGF0YTogZGF0YSAhPT0gdW5kZWZpbmVkIH0sIGVudik7XG4gICAgICByZXR1cm4gcGFydGlhbHNbbmFtZV0oY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICBpbnZva2VQYXJ0aWFsV3JhcHBlciA9IGZ1bmN0aW9uKHBhcnRpYWwsIG5hbWUgLyogLCBjb250ZXh0LCBoZWxwZXJzLCBwYXJ0aWFscywgZGF0YSAqLykge1xuICAgICAgdmFyIHJlc3VsdCA9IGludm9rZVBhcnRpYWwuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIGlmIChyZXN1bHQpIHsgcmV0dXJuIHJlc3VsdDsgfVxuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIlRoZSBwYXJ0aWFsIFwiICsgbmFtZSArIFwiIGNvdWxkIG5vdCBiZSBjb21waWxlZCB3aGVuIHJ1bm5pbmcgaW4gcnVudGltZS1vbmx5IG1vZGVcIik7XG4gICAgfTtcbiAgfVxuXG4gIC8vIEp1c3QgYWRkIHdhdGVyXG4gIHZhciBjb250YWluZXIgPSB7XG4gICAgZXNjYXBlRXhwcmVzc2lvbjogVXRpbHMuZXNjYXBlRXhwcmVzc2lvbixcbiAgICBpbnZva2VQYXJ0aWFsOiBpbnZva2VQYXJ0aWFsV3JhcHBlcixcbiAgICBwcm9ncmFtczogW10sXG4gICAgcHJvZ3JhbTogZnVuY3Rpb24oaSwgZm4sIGRhdGEpIHtcbiAgICAgIHZhciBwcm9ncmFtV3JhcHBlciA9IHRoaXMucHJvZ3JhbXNbaV07XG4gICAgICBpZihkYXRhKSB7XG4gICAgICAgIHByb2dyYW1XcmFwcGVyID0gcHJvZ3JhbShpLCBmbiwgZGF0YSk7XG4gICAgICB9IGVsc2UgaWYgKCFwcm9ncmFtV3JhcHBlcikge1xuICAgICAgICBwcm9ncmFtV3JhcHBlciA9IHRoaXMucHJvZ3JhbXNbaV0gPSBwcm9ncmFtKGksIGZuKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwcm9ncmFtV3JhcHBlcjtcbiAgICB9LFxuICAgIG1lcmdlOiBmdW5jdGlvbihwYXJhbSwgY29tbW9uKSB7XG4gICAgICB2YXIgcmV0ID0gcGFyYW0gfHwgY29tbW9uO1xuXG4gICAgICBpZiAocGFyYW0gJiYgY29tbW9uICYmIChwYXJhbSAhPT0gY29tbW9uKSkge1xuICAgICAgICByZXQgPSB7fTtcbiAgICAgICAgVXRpbHMuZXh0ZW5kKHJldCwgY29tbW9uKTtcbiAgICAgICAgVXRpbHMuZXh0ZW5kKHJldCwgcGFyYW0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJldDtcbiAgICB9LFxuICAgIHByb2dyYW1XaXRoRGVwdGg6IHByb2dyYW1XaXRoRGVwdGgsXG4gICAgbm9vcDogbm9vcCxcbiAgICBjb21waWxlckluZm86IG51bGxcbiAgfTtcblxuICByZXR1cm4gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHZhciBuYW1lc3BhY2UgPSBvcHRpb25zLnBhcnRpYWwgPyBvcHRpb25zIDogZW52LFxuICAgICAgICBoZWxwZXJzLFxuICAgICAgICBwYXJ0aWFscztcblxuICAgIGlmICghb3B0aW9ucy5wYXJ0aWFsKSB7XG4gICAgICBoZWxwZXJzID0gb3B0aW9ucy5oZWxwZXJzO1xuICAgICAgcGFydGlhbHMgPSBvcHRpb25zLnBhcnRpYWxzO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0ID0gdGVtcGxhdGVTcGVjLmNhbGwoXG4gICAgICAgICAgY29udGFpbmVyLFxuICAgICAgICAgIG5hbWVzcGFjZSwgY29udGV4dCxcbiAgICAgICAgICBoZWxwZXJzLFxuICAgICAgICAgIHBhcnRpYWxzLFxuICAgICAgICAgIG9wdGlvbnMuZGF0YSk7XG5cbiAgICBpZiAoIW9wdGlvbnMucGFydGlhbCkge1xuICAgICAgY2hlY2tSZXZpc2lvbihjb250YWluZXIuY29tcGlsZXJJbmZvKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xufVxuXG5leHBvcnRzLnRlbXBsYXRlID0gdGVtcGxhdGU7ZnVuY3Rpb24gcHJvZ3JhbVdpdGhEZXB0aChpLCBmbiwgZGF0YSAvKiwgJGRlcHRoICovKSB7XG4gIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAzKTtcblxuICB2YXIgcHJvZyA9IGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBbY29udGV4dCwgb3B0aW9ucy5kYXRhIHx8IGRhdGFdLmNvbmNhdChhcmdzKSk7XG4gIH07XG4gIHByb2cucHJvZ3JhbSA9IGk7XG4gIHByb2cuZGVwdGggPSBhcmdzLmxlbmd0aDtcbiAgcmV0dXJuIHByb2c7XG59XG5cbmV4cG9ydHMucHJvZ3JhbVdpdGhEZXB0aCA9IHByb2dyYW1XaXRoRGVwdGg7ZnVuY3Rpb24gcHJvZ3JhbShpLCBmbiwgZGF0YSkge1xuICB2YXIgcHJvZyA9IGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIHJldHVybiBmbihjb250ZXh0LCBvcHRpb25zLmRhdGEgfHwgZGF0YSk7XG4gIH07XG4gIHByb2cucHJvZ3JhbSA9IGk7XG4gIHByb2cuZGVwdGggPSAwO1xuICByZXR1cm4gcHJvZztcbn1cblxuZXhwb3J0cy5wcm9ncmFtID0gcHJvZ3JhbTtmdW5jdGlvbiBpbnZva2VQYXJ0aWFsKHBhcnRpYWwsIG5hbWUsIGNvbnRleHQsIGhlbHBlcnMsIHBhcnRpYWxzLCBkYXRhKSB7XG4gIHZhciBvcHRpb25zID0geyBwYXJ0aWFsOiB0cnVlLCBoZWxwZXJzOiBoZWxwZXJzLCBwYXJ0aWFsczogcGFydGlhbHMsIGRhdGE6IGRhdGEgfTtcblxuICBpZihwYXJ0aWFsID09PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKFwiVGhlIHBhcnRpYWwgXCIgKyBuYW1lICsgXCIgY291bGQgbm90IGJlIGZvdW5kXCIpO1xuICB9IGVsc2UgaWYocGFydGlhbCBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgcmV0dXJuIHBhcnRpYWwoY29udGV4dCwgb3B0aW9ucyk7XG4gIH1cbn1cblxuZXhwb3J0cy5pbnZva2VQYXJ0aWFsID0gaW52b2tlUGFydGlhbDtmdW5jdGlvbiBub29wKCkgeyByZXR1cm4gXCJcIjsgfVxuXG5leHBvcnRzLm5vb3AgPSBub29wOyIsIlwidXNlIHN0cmljdFwiO1xuLy8gQnVpbGQgb3V0IG91ciBiYXNpYyBTYWZlU3RyaW5nIHR5cGVcbmZ1bmN0aW9uIFNhZmVTdHJpbmcoc3RyaW5nKSB7XG4gIHRoaXMuc3RyaW5nID0gc3RyaW5nO1xufVxuXG5TYWZlU3RyaW5nLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gXCJcIiArIHRoaXMuc3RyaW5nO1xufTtcblxuZXhwb3J0c1tcImRlZmF1bHRcIl0gPSBTYWZlU3RyaW5nOyIsIlwidXNlIHN0cmljdFwiO1xudmFyIFNhZmVTdHJpbmcgPSByZXF1aXJlKFwiLi9zYWZlLXN0cmluZ1wiKVtcImRlZmF1bHRcIl07XG5cbnZhciBlc2NhcGUgPSB7XG4gIFwiJlwiOiBcIiZhbXA7XCIsXG4gIFwiPFwiOiBcIiZsdDtcIixcbiAgXCI+XCI6IFwiJmd0O1wiLFxuICAnXCInOiBcIiZxdW90O1wiLFxuICBcIidcIjogXCImI3gyNztcIixcbiAgXCJgXCI6IFwiJiN4NjA7XCJcbn07XG5cbnZhciBiYWRDaGFycyA9IC9bJjw+XCInYF0vZztcbnZhciBwb3NzaWJsZSA9IC9bJjw+XCInYF0vO1xuXG5mdW5jdGlvbiBlc2NhcGVDaGFyKGNocikge1xuICByZXR1cm4gZXNjYXBlW2Nocl0gfHwgXCImYW1wO1wiO1xufVxuXG5mdW5jdGlvbiBleHRlbmQob2JqLCB2YWx1ZSkge1xuICBmb3IodmFyIGtleSBpbiB2YWx1ZSkge1xuICAgIGlmKHZhbHVlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgIG9ialtrZXldID0gdmFsdWVba2V5XTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0cy5leHRlbmQgPSBleHRlbmQ7dmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbmV4cG9ydHMudG9TdHJpbmcgPSB0b1N0cmluZztcbi8vIFNvdXJjZWQgZnJvbSBsb2Rhc2hcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9iZXN0aWVqcy9sb2Rhc2gvYmxvYi9tYXN0ZXIvTElDRU5TRS50eHRcbnZhciBpc0Z1bmN0aW9uID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJztcbn07XG4vLyBmYWxsYmFjayBmb3Igb2xkZXIgdmVyc2lvbnMgb2YgQ2hyb21lIGFuZCBTYWZhcmlcbmlmIChpc0Z1bmN0aW9uKC94LykpIHtcbiAgaXNGdW5jdGlvbiA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJyAmJiB0b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcbiAgfTtcbn1cbnZhciBpc0Z1bmN0aW9uO1xuZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcbnZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpID8gdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IEFycmF5XScgOiBmYWxzZTtcbn07XG5leHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5O1xuXG5mdW5jdGlvbiBlc2NhcGVFeHByZXNzaW9uKHN0cmluZykge1xuICAvLyBkb24ndCBlc2NhcGUgU2FmZVN0cmluZ3MsIHNpbmNlIHRoZXkncmUgYWxyZWFkeSBzYWZlXG4gIGlmIChzdHJpbmcgaW5zdGFuY2VvZiBTYWZlU3RyaW5nKSB7XG4gICAgcmV0dXJuIHN0cmluZy50b1N0cmluZygpO1xuICB9IGVsc2UgaWYgKCFzdHJpbmcgJiYgc3RyaW5nICE9PSAwKSB7XG4gICAgcmV0dXJuIFwiXCI7XG4gIH1cblxuICAvLyBGb3JjZSBhIHN0cmluZyBjb252ZXJzaW9uIGFzIHRoaXMgd2lsbCBiZSBkb25lIGJ5IHRoZSBhcHBlbmQgcmVnYXJkbGVzcyBhbmRcbiAgLy8gdGhlIHJlZ2V4IHRlc3Qgd2lsbCBkbyB0aGlzIHRyYW5zcGFyZW50bHkgYmVoaW5kIHRoZSBzY2VuZXMsIGNhdXNpbmcgaXNzdWVzIGlmXG4gIC8vIGFuIG9iamVjdCdzIHRvIHN0cmluZyBoYXMgZXNjYXBlZCBjaGFyYWN0ZXJzIGluIGl0LlxuICBzdHJpbmcgPSBcIlwiICsgc3RyaW5nO1xuXG4gIGlmKCFwb3NzaWJsZS50ZXN0KHN0cmluZykpIHsgcmV0dXJuIHN0cmluZzsgfVxuICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoYmFkQ2hhcnMsIGVzY2FwZUNoYXIpO1xufVxuXG5leHBvcnRzLmVzY2FwZUV4cHJlc3Npb24gPSBlc2NhcGVFeHByZXNzaW9uO2Z1bmN0aW9uIGlzRW1wdHkodmFsdWUpIHtcbiAgaWYgKCF2YWx1ZSAmJiB2YWx1ZSAhPT0gMCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2UgaWYgKGlzQXJyYXkodmFsdWUpICYmIHZhbHVlLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5leHBvcnRzLmlzRW1wdHkgPSBpc0VtcHR5OyIsIi8qKlxuICogRXhwb3NlIGByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKWAuXG4gKi9cblxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZVxuICB8fCB3aW5kb3cud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lXG4gIHx8IHdpbmRvdy5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbiAgfHwgd2luZG93Lm9SZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbiAgfHwgd2luZG93Lm1zUmVxdWVzdEFuaW1hdGlvbkZyYW1lXG4gIHx8IGZhbGxiYWNrO1xuXG4vKipcbiAqIEZhbGxiYWNrIGltcGxlbWVudGF0aW9uLlxuICovXG5cbnZhciBwcmV2ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5mdW5jdGlvbiBmYWxsYmFjayhmbikge1xuICB2YXIgY3VyciA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICB2YXIgbXMgPSBNYXRoLm1heCgwLCAxNiAtIChjdXJyIC0gcHJldikpO1xuICB2YXIgcmVxID0gc2V0VGltZW91dChmbiwgbXMpO1xuICBwcmV2ID0gY3VycjtcbiAgcmV0dXJuIHJlcTtcbn1cblxuLyoqXG4gKiBDYW5jZWwuXG4gKi9cblxudmFyIGNhbmNlbCA9IHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZVxuICB8fCB3aW5kb3cud2Via2l0Q2FuY2VsQW5pbWF0aW9uRnJhbWVcbiAgfHwgd2luZG93Lm1vekNhbmNlbEFuaW1hdGlvbkZyYW1lXG4gIHx8IHdpbmRvdy5vQ2FuY2VsQW5pbWF0aW9uRnJhbWVcbiAgfHwgd2luZG93Lm1zQ2FuY2VsQW5pbWF0aW9uRnJhbWVcbiAgfHwgd2luZG93LmNsZWFyVGltZW91dDtcblxuZXhwb3J0cy5jYW5jZWwgPSBmdW5jdGlvbihpZCl7XG4gIGNhbmNlbC5jYWxsKHdpbmRvdywgaWQpO1xufTtcbiIsInZhciBiYXNlICAgICAgID0gcmVxdWlyZSgnLi9saWIvYmFzZScpO1xudmFyIFNhZmVTdHJpbmcgPSByZXF1aXJlKCcuL2xpYi9zYWZlLXN0cmluZycpO1xudmFyIEV4Y2VwdGlvbiAgPSByZXF1aXJlKCcuL2xpYi9leGNlcHRpb24nKTtcbnZhciBVdGlscyAgICAgID0gcmVxdWlyZSgnLi9saWIvdXRpbHMnKTtcbnZhciBFdmVudHMgICAgID0gcmVxdWlyZSgnLi9saWIvZXZlbnRzJyk7XG52YXIgcnVudGltZSAgICA9IHJlcXVpcmUoJy4vbGliL3J1bnRpbWUnKTtcblxuLy8gRXh0ZW5kIHRoZSBET01CYXJzIHByb3RvdHlwZSB3aXRoIGV2ZW50IGVtaXR0ZXIgZnVuY3Rpb25hbGl0eS5cblV0aWxzLmV4dGVuZChiYXNlLkRPTUJhcnNFbnZpcm9ubWVudC5wcm90b3R5cGUsIEV2ZW50cyk7XG5cbm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uIGNyZWF0ZSAoKSB7XG4gIHZhciBkYiA9IG5ldyBiYXNlLkRPTUJhcnNFbnZpcm9ubWVudCgpO1xuXG4gIFV0aWxzLmV4dGVuZChkYiwgYmFzZSk7XG4gIGRiLlZNICAgICAgICAgPSBydW50aW1lO1xuICBkYi5VdGlscyAgICAgID0gVXRpbHM7XG4gIGRiLmNyZWF0ZSAgICAgPSBjcmVhdGU7XG4gIGRiLkV4Y2VwdGlvbiAgPSBFeGNlcHRpb247XG4gIGRiLlNhZmVTdHJpbmcgPSBTYWZlU3RyaW5nO1xuXG4gIGRiLnRlbXBsYXRlID0gZnVuY3Rpb24gKHNwZWMpIHtcbiAgICByZXR1cm4gcnVudGltZS50ZW1wbGF0ZShzcGVjLCBkYik7XG4gIH07XG5cbiAgcmV0dXJuIGRiO1xufSkoKTtcbiJdfQ==
(14)
});
;