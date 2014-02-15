!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.DOMBars=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
module.exports = require('handlebars/dist/cjs/handlebars/exception').default;

},{"handlebars/dist/cjs/handlebars/exception":9}],3:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};/**
 * Return the current timestamp integer.
 *
 * @return {Number}
 */
var currentTime = global.Date.now || (function () {
  var Constuctor = global.Date;

  return function () {
    return new Constuctor().getTime();
  };
})();

/**
 * Keep local references to the timeout functions. This stops utilities like
 * Sinon.js from breaking the implementation.
 *
 * @type {Function}
 */
var setTimer   = global.setTimeout;
var clearTimer = global.clearTimeout;

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
  clearTimer;

/**
 * Cancel an animation frame.
 *
 * @param {Number} id
 */
exports.cancel = function (id) {
  cancel.call(global, id);
};

},{}],4:[function(require,module,exports){
var hbsVM = require('handlebars/dist/cjs/handlebars/runtime');
var Utils = require('./utils');
var raf   = require('./raf');

/**
 * Keep a map of attributes that need to update the corresponding properties.
 *
 * @type {Object}
 */
var attrProps = {
  INPUT: {
    value:   'value',
    checked: 'checked'
  },
  OPTION: {
    selected: 'selected'
  }
};

/**
 * Iterate over a subscriptions object, calling a function with the object
 * property details and a unique callback function.
 *
 * @param {Array}    subscriptions
 * @param {Function} fn
 * @param {Function} callback
 */
var iterateSubscriptions = function (subscriptions, fn, context) {
  for (var id in subscriptions) {
    for (var property in subscriptions[id]) {
      fn.call(context, subscriptions[id][property], property, id);
    }
  }
};

/**
 * Create a new subsciption instance. This functionality is tightly coupled to
 * DOMBars program execution.
 *
 * @param {Function} fn
 * @param {Function} update
 * @param {Object}   container
 * @param {Object}   env
 */
var Subscription = function (fn, update, container, env) {
  // Alias passed in variables for later access.
  this._fn        = fn;
  this._update    = update;
  this._container = container;
  this._env       = env;

  // Assign every subscription instance a unique id. This helps with linking
  // between parent and child subscription instances.
  this.cid             = 'c' + Utils.uniqueId();
  this.children        = {};
  this.subscriptions   = {};
  this.unsubscriptions = [];

  // Create statically bound function instances for public consumption.
  this.boundUpdate         = Utils.bind(this.update, this);
  this.boundUnsubscription = Utils.bind(this.unsubscription, this);
};

/**
 * Expose the internal susbcribe functionality for the container.
 *
 * @param {Object} object
 * @param {String} property
 * @param {String} id
 */
Subscription.prototype.subscribe = function (object, property, id) {
  (this.subscriptions[id] || (this.subscriptions[id] = {}))[property] = object;
};

/**
 * Pass a custom unsubscription function that will execute when we unsubscribe.
 *
 * @param {Function} fn
 */
Subscription.prototype.unsubscription = function (fn) {
  Utils.isFunction(fn) && this.unsubscriptions.push(fn);
};

/**
 * Unsubscribe from a subcriptions object.
 *
 * @param {Object} subscriptions
 */
Subscription.prototype._unsubscribe = function (subscriptions) {
  iterateSubscriptions(subscriptions, function (object, property, id) {
    delete subscriptions[id][property];
    this._env.unsubscribe(object, property, this.boundUpdate);
  }, this);
};

/**
 * Iterate over an array of unsubscriptions.
 *
 * @param {Array} unsubscriptions
 */
Subscription.prototype._unsubscription = function (unsubscriptions) {
  for (var i = 0; i < unsubscriptions.length; i++) {
    unsubscriptions[i]();
  }
};

/**
 * Unsubscribe everything from the current instance.
 */
Subscription.prototype.unsubscribe = function () {
  if (this._unsubscribed) { return; }

  this._unsubscribe(this.subscriptions);
  this._unsubscription(this.unsubscriptions);

  // Delete any reference to this subscription from the parent.
  if (this.parent) {
    delete this.parent.children[this.cid];
    delete this.parent;
  }

  // Cancel any currently executing functions. We also need to set an
  // unsubscribed flag in case the function is still available somewhere and
  // called after unsubscription has occured.
  VM.exec.cancel(this._execId);
  this._unsubscribed = true;
  this._unsubscribeChildren();

  // Remove unwanted lingering references.
  delete this.children;
  delete this.subscriptions;
  delete this.unsubscriptions;
  delete this._fn;
  delete this._env;
  delete this._update;
  delete this._container;
  delete this.boundUpdate;
  delete this.boundUnsubscription;
};

/**
 * Unsubscribe the current instance children.
 */
Subscription.prototype._unsubscribeChildren = function () {
  for (var child in this.children) {
    this.children[child].unsubscribe();
  }
};

/**
 * Execute the subscription function.
 *
 * @return {*}
 */
Subscription.prototype.execute = function () {
  var parent = this._container.subscription;

  // If we have an existing subscription, link the subscriptions together.
  if (parent && !parent._unsubscribed) {
    this.parent = this._container.subscription;
    this.parent.children[this.cid] = this;
  }

  // Alias the current subscriptions object for diffing after execution.
  this._subscriptions = this.subscriptions;
  this._unsubscription(this.unsubscriptions);

  // Reset the subscriptions and unsubscriptions objects before execution.
  this.subscriptions   = {};
  this.unsubscriptions = [];

  this._container.subscription = this;
  var result = this._fn.apply(this, arguments);
  this._container.subscription = this.parent;

  // The current subscriptions object needs to be compared against the previous
  // subscriptions and any diffences fixed.
  var current  = this.subscriptions;
  var previous = this._subscriptions;

  // Iterate over the new subscriptions object. Check every key in the object
  // against the previous subscriptions. If it exists in the previous object,
  // it means we are already subscribed. Otherwise we need to subscribe to
  // the new property.
  iterateSubscriptions(current, function (object, property, id) {
    if (previous[id] && previous[id][property]) {
      return delete previous[id][property];
    }

    this._env.subscribe(object, property, this.boundUpdate);
  }, this);

  // Iterate over all remaining previous subscriptions and unsubscribe them.
  delete this._subscriptions;
  this._unsubscribe(previous);

  return result;
};

/**
 * Update the susbcription instance with changes.
 *
 * @return {Boolean}
 */
Subscription.prototype.update = function () {
  if (this._triggered || this._unsubscribed) {
    return false;
  }

  this._unsubscribeChildren();

  this._execId = VM.exec(Utils.bind(function () {
    delete this._triggered;
    this._update(this.execute());
  }, this));

  return this._triggered = true;
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
  return raf(fn);
};

/**
 * Cancel an execution.
 *
 * @param {Number} id
 */
VM.exec.cancel = function (id) {
  return raf.cancel(id);
};

/**
 * Create an element from a tag name.
 *
 * @param  {String} tagName
 * @param  {Object} env
 * @return {Node}
 */
VM.createElement = function (tagName) {
  return document.createElement(tagName);
};

/**
 * Copy all the data from one element to another and replace in place.
 *
 * @param  {Node}   node
 * @param  {String} tagName
 * @param  {Object} env
 * @return {Node}
 */
VM.setTagName = function (node, tagName) {
  var newNode = VM.createElement(tagName);

  // Move all child elements to the new node.
  while (node.firstChild) {
    newNode.appendChild(node.firstChild);
  }

  // Copy all the attributes to the new node.
  for (var i = 0; i < node.attributes.length; i++) {
    var attribute = node.attributes[i];
    VM.setAttribute(newNode, attribute.name, attribute.value);
  }

  // Replace the node position in the place.
  node.parentNode.replaceChild(newNode, node);

  return newNode;
};

/**
 * Remove an attribute from an element.
 *
 * @param {Node}   el
 * @param {String} name
 * @param {Object} env
 */
VM.removeAttribute = function (el, name) {
  if (!el.hasAttribute(name)) { return; }

  el.removeAttribute(name);

  // Unset the DOM property when the attribute is removed.
  if (attrProps[el.tagName] && attrProps[el.tagName][name]) {
    el[attrProps[el.tagName][name]] = null;
  }
};

/**
 * Set an attribute value on an element.
 *
 * @param {Node}   el
 * @param {String} name
 * @param {*}      value
 * @param {Object} env
 */
VM.setAttribute = function (el, name, value) {
  if (value === false) {
    return VM.removeAttribute(el, name);
  }

  // Set the attribute value to the name when the value is `true`.
  el.setAttribute(name, value === true ? name : value);

  // Update the DOM property when the attribute changes.
  if (attrProps[el.tagName] && attrProps[el.tagName][name]) {
    el[attrProps[el.tagName][name]] = value;
  }
};

/**
 * Create a comment node based on text contents.
 *
 * @param  {String} contents
 * @param  {Object} env
 * @return {Node}
 */
VM.createComment = function (comment) {
  return document.createComment(comment);
};

/**
 * Generate an executable template from a template spec.
 *
 * @param  {Object}   templateSpec
 * @return {Function}
 */
VM.template = function (templateSpec, env) {
  /**
   * Subscriber to function in the DOMBars execution instance.
   *
   * @param  {Function} fn
   * @param  {Function} create
   * @param  {Function} update
   * @return {Object}
   */
  var subscribe = function (fn, create, update) {
    var subscriber = new Subscription(fn, update, container, env);

    // Immediately alias the starting value.
    subscriber.value = subscriber.execute();
    Utils.isFunction(create) && (subscriber.value = create(subscriber.value));

    return subscriber;
  };

  /**
   * Wrap a function with a sanitized public subscriber object.
   *
   * @param  {Function} fn
   * @return {Function}
   */
  var wrapProgram = function (fn) {
    var wrapper = function () {
      var subscriber = new Subscription(fn, null, container, env);

      return {
        value:       subscriber.execute.apply(subscriber, arguments),
        unsubscribe: Utils.bind(subscriber.unsubscribe, subscriber)
      };
    };

    // Extend the wrapper function with properties of the passed in function.
    Utils.extend(wrapper, fn);

    return wrapper;
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
    wrapProgram:      wrapProgram,
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
    return subscribe(fn, function (value) {
      return Utils.trackNode(create(value));
    }, function (value) {
      this.value.replace(create(value));
    }).value.fragment;
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
    return subscribe(fn, function (value) {
      return VM.createElement(value, env);
    }, function (value) {
      cb(this.value = VM.setTagName(this.value, value, env));
    }).value;
  };

  /**
   * Append an element to the end of another element.
   *
   * @param {Node} parent
   * @param {Node} child
   */
  container.appendChild = function (parent, child) {
    child && parent.appendChild(child);
  };

  /**
   * Set an elements attribute. We accept the current element a function
   * because when a tag name changes we will lose reference to the actively
   * rendered element.
   *
   * @param {Function} currentEl
   * @param {Function} nameFn
   * @param {Function} valueFn
   */
  container.setAttribute = function (currentEl, nameFn, valueFn) {
    var attrName = subscribe(nameFn, null, function (value) {
      VM.removeAttribute(currentEl(), this.value);
      VM.setAttribute(currentEl(), this.value = value, attrValue.value);
    });

    var attrValue = subscribe(valueFn, null, function (value) {
      VM.setAttribute(currentEl(), attrName.value, this.value = value);
    });

    return VM.setAttribute(currentEl(), attrName.value, attrValue.value);
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
    return subscribe(fn, function (value) {
      return VM.createComment(value);
    }, function (value) {
      this.value.textContent = value;
    }).value;
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
    container.subscription.subscribe(object, property, id);
    return env.get(object, property);
  };

  /**
   * Return the compiled JavaScript function for execution.
   *
   * @param  {Object} context
   * @param  {Object} options
   * @return {Node}
   */
  return wrapProgram(function (context, options) {
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

},{"./raf":3,"./utils":7,"handlebars/dist/cjs/handlebars/runtime":10}],5:[function(require,module,exports){
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
  this.after.parentNode && this.after.parentNode.insertBefore(node, this.after);

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
  while (this.before.nextSibling && this.before.nextSibling !== this.after) {
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
  while (this.before.nextSibling && this.before.nextSibling !== this.after) {
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
 * @param  {*}        ...
 * @return {Function}
 */
Utils.partial = Utils.variadic(function (fn, args) {
  return Utils.variadic(function (called) {
    return fn.apply(this, args.concat(called));
  });
});

/**
 * Bind a function to a certain context.
 *
 * @param  {Function} fn
 * @param  {Object}   context
 * @param  {*}        ...
 * @return {Function}
 */
Utils.bind = Utils.variadic(function (fn, context, args) {
  return Utils.variadic(function (called) {
    return fn.apply(context, args.concat(called));
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

},{"./safe-string":5,"./track-node":6,"handlebars/dist/cjs/handlebars/utils":12}],8:[function(require,module,exports){
"use strict";
var Utils = require("./utils");
var Exception = require("./exception")["default"];

var VERSION = "1.3.0";
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
      throw new Exception("Missing helper: '" + arg + "'");
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

function Exception(message, node) {
  var line;
  if (node && node.firstLine) {
    line = node.firstLine;

    message += ' - ' + line + ':' + node.firstColumn;
  }

  var tmp = Error.prototype.constructor.call(this, message);

  // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
  for (var idx = 0; idx < errorProps.length; idx++) {
    this[errorProps[idx]] = tmp[errorProps[idx]];
  }

  if (line) {
    this.lineNumber = line;
    this.column = node.firstColumn;
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
      throw new Exception("Template was precompiled with an older version of Handlebars than the current runtime. "+
            "Please update your precompiler to a newer version ("+runtimeVersions+") or downgrade your runtime to an older version ("+compilerVersions+").");
    } else {
      // Use the embedded version info since the runtime doesn't know about this revision yet
      throw new Exception("Template was precompiled with a newer version of Handlebars than the current runtime. "+
            "Please update your runtime to a newer version ("+compilerInfo[1]+").");
    }
  }
}

exports.checkRevision = checkRevision;// TODO: Remove this line and break up compilePartial

function template(templateSpec, env) {
  if (!env) {
    throw new Exception("No environment passed to template");
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
var base       = require('./lib/base');
var SafeString = require('./lib/safe-string');
var Exception  = require('./lib/exception');
var Utils      = require('./lib/utils');
var runtime    = require('./lib/runtime');

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

},{"./lib/base":1,"./lib/exception":2,"./lib/runtime":4,"./lib/safe-string":5,"./lib/utils":7}]},{},[13])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbGliL2Jhc2UuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvZXhjZXB0aW9uLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbGliL3JhZi5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi9ydW50aW1lLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbGliL3NhZmUtc3RyaW5nLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbGliL3RyYWNrLW5vZGUuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvdXRpbHMuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL2Jhc2UuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL2V4Y2VwdGlvbi5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvc2FmZS1zdHJpbmcuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3V0aWxzLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvcnVudGltZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFJQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3prQkE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9LQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgaGJzQmFzZSAgICAgICAgICAgICAgID0gcmVxdWlyZSgnaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL2Jhc2UnKTtcbnZhciBVdGlscyAgICAgICAgICAgICAgICAgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG52YXIgSGFuZGxlYmFyc0Vudmlyb25tZW50ID0gaGJzQmFzZS5IYW5kbGViYXJzRW52aXJvbm1lbnQ7XG5cbi8qKlxuICogRXh0ZW5kIEhhbmRsZWJhcnMgYmFzZSBvYmplY3Qgd2l0aCBjdXN0b20gZnVuY3Rpb25hbGl0eS5cbiAqXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG52YXIgYmFzZSA9IG1vZHVsZS5leHBvcnRzID0gVXRpbHMuY3JlYXRlKGhic0Jhc2UpO1xuXG4vKipcbiAqIFdyYXAgb2xkLXN0eWxlIEhhbmRsZWJhcnMgaGVscGVycyB3aXRoIHRoZSB1cGRhdGVkIG9iamVjdCBzeW50YXggcmV0dXJuLlxuICpcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBoZWxwZXJcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICovXG52YXIgd3JhcE9sZEhlbHBlciA9IGZ1bmN0aW9uIChoZWxwZXIpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcmVzdWx0ID0gaGVscGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICAvLyBOZWVkIGEgc3BlY2lhbCBoYW5kbGVyIGZvciB0aGUgYHdpdGhgIGhlbHBlciB3aGljaCB3b24ndCBhbHdheXMgZXhlY3V0ZS5cbiAgICByZXR1cm4gcmVzdWx0ID09IG51bGwgPyByZXN1bHQgOiByZXN1bHQudmFsdWU7XG4gIH07XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVyIERPTUJhcnMgaGVscGVycyBvbiB0aGUgcGFzc2VkIGluIERPTUJhcnMgaW5zdGFuY2UuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGluc3RhbmNlXG4gKi9cbnZhciByZWdpc3RlckRlZmF1bHRIZWxwZXJzID0gZnVuY3Rpb24gKGluc3RhbmNlKSB7XG4gIC8qKlxuICAgKiBUaGUgaGFuZGxlYmFycyBgZWFjaGAgaGVscGVyIGlzIGluY29tcGF0aWJhYmxlIHdpdGggRE9NQmFycywgc2luY2UgaXRcbiAgICogYXNzdW1lcyBzdHJpbmcgY29uY2F0aW5hdGlvbiAoYXMgb3Bwb3NlZCB0byBkb2N1bWVudCBmcmFnbWVudHMpLlxuICAgKlxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGNvbnRleHRcbiAgICogQHBhcmFtICB7T2JqZWN0fSBvcHRpb25zXG4gICAqIEByZXR1cm4ge05vZGV9XG4gICAqL1xuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignZWFjaCcsIGZ1bmN0aW9uIChjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgdmFyIGZuICAgICAgID0gb3B0aW9ucy5mbjtcbiAgICB2YXIgaW52ZXJzZSAgPSBvcHRpb25zLmludmVyc2U7XG4gICAgdmFyIGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgIHZhciBpICAgICAgICA9IDA7XG4gICAgdmFyIGRhdGE7XG5cbiAgICBpZiAodHlwZW9mIGNvbnRleHQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMuZGF0YSkge1xuICAgICAgZGF0YSA9IFV0aWxzLmNyZWF0ZShvcHRpb25zLmRhdGEpO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgY29udGV4dCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHZhciBsZW4gPSBjb250ZXh0Lmxlbmd0aDtcblxuICAgICAgaWYgKGxlbiA9PT0gK2xlbikge1xuICAgICAgICBmb3IgKDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgZGF0YS5pbmRleCA9IGk7XG4gICAgICAgICAgZGF0YS5maXJzdCA9IChpID09PSAwKTtcbiAgICAgICAgICBkYXRhLmxhc3QgID0gKGkgPT09IGxlbiAtIDEpO1xuXG4gICAgICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQoZm4oY29udGV4dFtpXSwgeyBkYXRhOiBkYXRhIH0pLnZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIGNvbnRleHQpIHtcbiAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGNvbnRleHQsIGtleSkpIHtcbiAgICAgICAgICAgIGkgKz0gMTtcblxuICAgICAgICAgICAgZGF0YS5rZXkgICA9IGtleTtcbiAgICAgICAgICAgIGRhdGEuaW5kZXggPSBpO1xuICAgICAgICAgICAgZGF0YS5maXJzdCA9IChpID09PSAwKTtcblxuICAgICAgICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQoZm4oY29udGV4dFtrZXldLCB7IGRhdGE6IGRhdGEgfSkudmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChpID09PSAwKSB7XG4gICAgICByZXR1cm4gaW52ZXJzZSh0aGlzKS52YWx1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnJhZ21lbnQ7XG4gIH0pO1xuXG4gIC8vIFJlZ2lzdGVyIHVwZGF0ZWQgSGFuZGxlYmFycyBoZWxwZXJzLlxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcih7XG4gICAgJ2lmJzogICAgICAgICAgICAgICAgIHdyYXBPbGRIZWxwZXIoaW5zdGFuY2UuaGVscGVycy5pZiksXG4gICAgJ3dpdGgnOiAgICAgICAgICAgICAgIHdyYXBPbGRIZWxwZXIoaW5zdGFuY2UuaGVscGVycy53aXRoKSxcbiAgICAnYmxvY2tIZWxwZXJNaXNzaW5nJzogd3JhcE9sZEhlbHBlcihpbnN0YW5jZS5oZWxwZXJzLmJsb2NrSGVscGVyTWlzc2luZylcbiAgfSk7XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhIGN1c3RvbSBET01CYXJzIGVudmlyb25tZW50IHRvIG1hdGNoIEhhbmRsZWJhcnNFbnZpcm9ubWVudC5cbiAqL1xudmFyIERPTUJhcnNFbnZpcm9ubWVudCA9IGJhc2UuRE9NQmFyc0Vudmlyb25tZW50ID0gZnVuY3Rpb24gKCkge1xuICBIYW5kbGViYXJzRW52aXJvbm1lbnQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgcmVnaXN0ZXJEZWZhdWx0SGVscGVycyh0aGlzKTtcbn07XG5cbi8qKlxuICogRXh0ZW5kIHRoZSBIYW5kbGViYXJzRW52aXJvbm1lbnQgcHJvdG90eXBlLlxuICpcbiAqIEB0eXBlIHtPYmplY3R9XG4gKi9cbnZhciBlbnZQcm90b3R5cGUgPSBET01CYXJzRW52aXJvbm1lbnQucHJvdG90eXBlID0gVXRpbHMuY3JlYXRlKFxuICBIYW5kbGViYXJzRW52aXJvbm1lbnQucHJvdG90eXBlXG4pO1xuXG4vKipcbiAqIEFsaWFzIHNvbWUgdXNlZnVsIGZ1bmN0aW9uYWxpdHkgdGhhdCBpcyBleHBlY3RlZCB0byBiZSBleHBvc2VkIG9uIHRoZSByb290XG4gKiBvYmplY3QuXG4gKi9cbmVudlByb3RvdHlwZS5jcmVhdGVGcmFtZSAgICAgICA9IGhic0Jhc2UuY3JlYXRlRnJhbWU7XG5lbnZQcm90b3R5cGUuUkVWSVNJT05fQ0hBTkdFUyAgPSBoYnNCYXNlLlJFVklTSU9OX0NIQU5HRVM7XG5lbnZQcm90b3R5cGUuQ09NUElMRVJfUkVWSVNJT04gPSBoYnNCYXNlLkNPTVBJTEVSX1JFVklTSU9OO1xuXG4vKipcbiAqIFRoZSBiYXNpYyBnZXR0ZXIgZnVuY3Rpb24uIE92ZXJyaWRlIHRoaXMgd2l0aCBzb21ldGhpbmcgZWxzZSBiYXNlZCBvbiB5b3VyXG4gKiBwcm9qZWN0LiBGb3IgZXhhbXBsZSwgQmFja2JvbmUuanMgbW9kZWxzLlxuICpcbiAqIEBwYXJhbSAge09iamVjdH0gb2JqZWN0XG4gKiBAcGFyYW0gIHtTdHJpbmd9IHByb3BlcnR5XG4gKiBAcmV0dXJuIHsqfVxuICovXG5lbnZQcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKG9iamVjdCwgcHJvcGVydHkpIHtcbiAgcmV0dXJuIG9iamVjdFtwcm9wZXJ0eV07XG59O1xuXG4vKipcbiAqIE5vb3AgZnVuY3Rpb25zIGZvciBzdWJzY3JpYmUgYW5kIHVuc3Vic2NyaWJlLiBPdmVycmlkZSB3aXRoIGN1c3RvbVxuICogZnVuY3Rpb25hbGl0eS5cbiAqL1xuZW52UHJvdG90eXBlLnN1YnNjcmliZSA9IGVudlByb3RvdHlwZS51bnN1YnNjcmliZSA9IGZ1bmN0aW9uICgpIHt9O1xuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCdoYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvZXhjZXB0aW9uJykuZGVmYXVsdDtcbiIsInZhciBnbG9iYWw9dHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9Oy8qKlxuICogUmV0dXJuIHRoZSBjdXJyZW50IHRpbWVzdGFtcCBpbnRlZ2VyLlxuICpcbiAqIEByZXR1cm4ge051bWJlcn1cbiAqL1xudmFyIGN1cnJlbnRUaW1lID0gZ2xvYmFsLkRhdGUubm93IHx8IChmdW5jdGlvbiAoKSB7XG4gIHZhciBDb25zdHVjdG9yID0gZ2xvYmFsLkRhdGU7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbmV3IENvbnN0dWN0b3IoKS5nZXRUaW1lKCk7XG4gIH07XG59KSgpO1xuXG4vKipcbiAqIEtlZXAgbG9jYWwgcmVmZXJlbmNlcyB0byB0aGUgdGltZW91dCBmdW5jdGlvbnMuIFRoaXMgc3RvcHMgdXRpbGl0aWVzIGxpa2VcbiAqIFNpbm9uLmpzIGZyb20gYnJlYWtpbmcgdGhlIGltcGxlbWVudGF0aW9uLlxuICpcbiAqIEB0eXBlIHtGdW5jdGlvbn1cbiAqL1xudmFyIHNldFRpbWVyICAgPSBnbG9iYWwuc2V0VGltZW91dDtcbnZhciBjbGVhclRpbWVyID0gZ2xvYmFsLmNsZWFyVGltZW91dDtcblxuLyoqXG4gKiBGYWxsYmFjayBhbmltYXRpb24gZnJhbWUgaW1wbGVtZW50YXRpb24uXG4gKlxuICogQHJldHVybiB7RnVuY3Rpb259XG4gKi9cbnZhciBmYWxsYmFjayA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHByZXYgPSBjdXJyZW50VGltZSgpO1xuXG4gIHJldHVybiBmdW5jdGlvbiAoZm4pIHtcbiAgICB2YXIgY3VyciA9IGN1cnJlbnRUaW1lKCk7XG4gICAgdmFyIG1zICAgPSBNYXRoLm1heCgwLCAxNiAtIChjdXJyIC0gcHJldikpO1xuICAgIHZhciByZXEgID0gc2V0VGltZXIoZm4sIG1zKTtcblxuICAgIHByZXYgPSBjdXJyO1xuXG4gICAgcmV0dXJuIHJlcTtcbiAgfTtcbn07XG5cbi8qKlxuICogRXhwb3NlIGByZXF1ZXN0QW5pbWF0aW9uRnJhbWVgLlxuICpcbiAqIEB0eXBlIHtGdW5jdGlvbn1cbiAqL1xuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gZ2xvYmFsLnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICBnbG9iYWwud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gIGdsb2JhbC5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgZ2xvYmFsLm1zUmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gIGdsb2JhbC5vUmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gIGZhbGxiYWNrKCk7XG5cbi8qKlxuICogQ2FuY2VsIHRoZSBhbmltYXRpb24gZnJhbWUuXG4gKlxuICogQHR5cGUge0Z1bmN0aW9ufVxuICovXG52YXIgY2FuY2VsID0gZ2xvYmFsLmNhbmNlbEFuaW1hdGlvbkZyYW1lIHx8XG4gIGdsb2JhbC53ZWJraXRDYW5jZWxBbmltYXRpb25GcmFtZSB8fFxuICBnbG9iYWwubW96Q2FuY2VsQW5pbWF0aW9uRnJhbWUgfHxcbiAgZ2xvYmFsLm1zQ2FuY2VsQW5pbWF0aW9uRnJhbWUgfHxcbiAgZ2xvYmFsLm9DYW5jZWxBbmltYXRpb25GcmFtZSB8fFxuICBjbGVhclRpbWVyO1xuXG4vKipcbiAqIENhbmNlbCBhbiBhbmltYXRpb24gZnJhbWUuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IGlkXG4gKi9cbmV4cG9ydHMuY2FuY2VsID0gZnVuY3Rpb24gKGlkKSB7XG4gIGNhbmNlbC5jYWxsKGdsb2JhbCwgaWQpO1xufTtcbiIsInZhciBoYnNWTSA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9ydW50aW1lJyk7XG52YXIgVXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG52YXIgcmFmICAgPSByZXF1aXJlKCcuL3JhZicpO1xuXG4vKipcbiAqIEtlZXAgYSBtYXAgb2YgYXR0cmlidXRlcyB0aGF0IG5lZWQgdG8gdXBkYXRlIHRoZSBjb3JyZXNwb25kaW5nIHByb3BlcnRpZXMuXG4gKlxuICogQHR5cGUge09iamVjdH1cbiAqL1xudmFyIGF0dHJQcm9wcyA9IHtcbiAgSU5QVVQ6IHtcbiAgICB2YWx1ZTogICAndmFsdWUnLFxuICAgIGNoZWNrZWQ6ICdjaGVja2VkJ1xuICB9LFxuICBPUFRJT046IHtcbiAgICBzZWxlY3RlZDogJ3NlbGVjdGVkJ1xuICB9XG59O1xuXG4vKipcbiAqIEl0ZXJhdGUgb3ZlciBhIHN1YnNjcmlwdGlvbnMgb2JqZWN0LCBjYWxsaW5nIGEgZnVuY3Rpb24gd2l0aCB0aGUgb2JqZWN0XG4gKiBwcm9wZXJ0eSBkZXRhaWxzIGFuZCBhIHVuaXF1ZSBjYWxsYmFjayBmdW5jdGlvbi5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSAgICBzdWJzY3JpcHRpb25zXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAqL1xudmFyIGl0ZXJhdGVTdWJzY3JpcHRpb25zID0gZnVuY3Rpb24gKHN1YnNjcmlwdGlvbnMsIGZuLCBjb250ZXh0KSB7XG4gIGZvciAodmFyIGlkIGluIHN1YnNjcmlwdGlvbnMpIHtcbiAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiBzdWJzY3JpcHRpb25zW2lkXSkge1xuICAgICAgZm4uY2FsbChjb250ZXh0LCBzdWJzY3JpcHRpb25zW2lkXVtwcm9wZXJ0eV0sIHByb3BlcnR5LCBpZCk7XG4gICAgfVxuICB9XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhIG5ldyBzdWJzY2lwdGlvbiBpbnN0YW5jZS4gVGhpcyBmdW5jdGlvbmFsaXR5IGlzIHRpZ2h0bHkgY291cGxlZCB0b1xuICogRE9NQmFycyBwcm9ncmFtIGV4ZWN1dGlvbi5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHBhcmFtIHtGdW5jdGlvbn0gdXBkYXRlXG4gKiBAcGFyYW0ge09iamVjdH0gICBjb250YWluZXJcbiAqIEBwYXJhbSB7T2JqZWN0fSAgIGVudlxuICovXG52YXIgU3Vic2NyaXB0aW9uID0gZnVuY3Rpb24gKGZuLCB1cGRhdGUsIGNvbnRhaW5lciwgZW52KSB7XG4gIC8vIEFsaWFzIHBhc3NlZCBpbiB2YXJpYWJsZXMgZm9yIGxhdGVyIGFjY2Vzcy5cbiAgdGhpcy5fZm4gICAgICAgID0gZm47XG4gIHRoaXMuX3VwZGF0ZSAgICA9IHVwZGF0ZTtcbiAgdGhpcy5fY29udGFpbmVyID0gY29udGFpbmVyO1xuICB0aGlzLl9lbnYgICAgICAgPSBlbnY7XG5cbiAgLy8gQXNzaWduIGV2ZXJ5IHN1YnNjcmlwdGlvbiBpbnN0YW5jZSBhIHVuaXF1ZSBpZC4gVGhpcyBoZWxwcyB3aXRoIGxpbmtpbmdcbiAgLy8gYmV0d2VlbiBwYXJlbnQgYW5kIGNoaWxkIHN1YnNjcmlwdGlvbiBpbnN0YW5jZXMuXG4gIHRoaXMuY2lkICAgICAgICAgICAgID0gJ2MnICsgVXRpbHMudW5pcXVlSWQoKTtcbiAgdGhpcy5jaGlsZHJlbiAgICAgICAgPSB7fTtcbiAgdGhpcy5zdWJzY3JpcHRpb25zICAgPSB7fTtcbiAgdGhpcy51bnN1YnNjcmlwdGlvbnMgPSBbXTtcblxuICAvLyBDcmVhdGUgc3RhdGljYWxseSBib3VuZCBmdW5jdGlvbiBpbnN0YW5jZXMgZm9yIHB1YmxpYyBjb25zdW1wdGlvbi5cbiAgdGhpcy5ib3VuZFVwZGF0ZSAgICAgICAgID0gVXRpbHMuYmluZCh0aGlzLnVwZGF0ZSwgdGhpcyk7XG4gIHRoaXMuYm91bmRVbnN1YnNjcmlwdGlvbiA9IFV0aWxzLmJpbmQodGhpcy51bnN1YnNjcmlwdGlvbiwgdGhpcyk7XG59O1xuXG4vKipcbiAqIEV4cG9zZSB0aGUgaW50ZXJuYWwgc3VzYmNyaWJlIGZ1bmN0aW9uYWxpdHkgZm9yIHRoZSBjb250YWluZXIuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdFxuICogQHBhcmFtIHtTdHJpbmd9IHByb3BlcnR5XG4gKiBAcGFyYW0ge1N0cmluZ30gaWRcbiAqL1xuU3Vic2NyaXB0aW9uLnByb3RvdHlwZS5zdWJzY3JpYmUgPSBmdW5jdGlvbiAob2JqZWN0LCBwcm9wZXJ0eSwgaWQpIHtcbiAgKHRoaXMuc3Vic2NyaXB0aW9uc1tpZF0gfHwgKHRoaXMuc3Vic2NyaXB0aW9uc1tpZF0gPSB7fSkpW3Byb3BlcnR5XSA9IG9iamVjdDtcbn07XG5cbi8qKlxuICogUGFzcyBhIGN1c3RvbSB1bnN1YnNjcmlwdGlvbiBmdW5jdGlvbiB0aGF0IHdpbGwgZXhlY3V0ZSB3aGVuIHdlIHVuc3Vic2NyaWJlLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKi9cblN1YnNjcmlwdGlvbi5wcm90b3R5cGUudW5zdWJzY3JpcHRpb24gPSBmdW5jdGlvbiAoZm4pIHtcbiAgVXRpbHMuaXNGdW5jdGlvbihmbikgJiYgdGhpcy51bnN1YnNjcmlwdGlvbnMucHVzaChmbik7XG59O1xuXG4vKipcbiAqIFVuc3Vic2NyaWJlIGZyb20gYSBzdWJjcmlwdGlvbnMgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBzdWJzY3JpcHRpb25zXG4gKi9cblN1YnNjcmlwdGlvbi5wcm90b3R5cGUuX3Vuc3Vic2NyaWJlID0gZnVuY3Rpb24gKHN1YnNjcmlwdGlvbnMpIHtcbiAgaXRlcmF0ZVN1YnNjcmlwdGlvbnMoc3Vic2NyaXB0aW9ucywgZnVuY3Rpb24gKG9iamVjdCwgcHJvcGVydHksIGlkKSB7XG4gICAgZGVsZXRlIHN1YnNjcmlwdGlvbnNbaWRdW3Byb3BlcnR5XTtcbiAgICB0aGlzLl9lbnYudW5zdWJzY3JpYmUob2JqZWN0LCBwcm9wZXJ0eSwgdGhpcy5ib3VuZFVwZGF0ZSk7XG4gIH0sIHRoaXMpO1xufTtcblxuLyoqXG4gKiBJdGVyYXRlIG92ZXIgYW4gYXJyYXkgb2YgdW5zdWJzY3JpcHRpb25zLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHVuc3Vic2NyaXB0aW9uc1xuICovXG5TdWJzY3JpcHRpb24ucHJvdG90eXBlLl91bnN1YnNjcmlwdGlvbiA9IGZ1bmN0aW9uICh1bnN1YnNjcmlwdGlvbnMpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB1bnN1YnNjcmlwdGlvbnMubGVuZ3RoOyBpKyspIHtcbiAgICB1bnN1YnNjcmlwdGlvbnNbaV0oKTtcbiAgfVxufTtcblxuLyoqXG4gKiBVbnN1YnNjcmliZSBldmVyeXRoaW5nIGZyb20gdGhlIGN1cnJlbnQgaW5zdGFuY2UuXG4gKi9cblN1YnNjcmlwdGlvbi5wcm90b3R5cGUudW5zdWJzY3JpYmUgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLl91bnN1YnNjcmliZWQpIHsgcmV0dXJuOyB9XG5cbiAgdGhpcy5fdW5zdWJzY3JpYmUodGhpcy5zdWJzY3JpcHRpb25zKTtcbiAgdGhpcy5fdW5zdWJzY3JpcHRpb24odGhpcy51bnN1YnNjcmlwdGlvbnMpO1xuXG4gIC8vIERlbGV0ZSBhbnkgcmVmZXJlbmNlIHRvIHRoaXMgc3Vic2NyaXB0aW9uIGZyb20gdGhlIHBhcmVudC5cbiAgaWYgKHRoaXMucGFyZW50KSB7XG4gICAgZGVsZXRlIHRoaXMucGFyZW50LmNoaWxkcmVuW3RoaXMuY2lkXTtcbiAgICBkZWxldGUgdGhpcy5wYXJlbnQ7XG4gIH1cblxuICAvLyBDYW5jZWwgYW55IGN1cnJlbnRseSBleGVjdXRpbmcgZnVuY3Rpb25zLiBXZSBhbHNvIG5lZWQgdG8gc2V0IGFuXG4gIC8vIHVuc3Vic2NyaWJlZCBmbGFnIGluIGNhc2UgdGhlIGZ1bmN0aW9uIGlzIHN0aWxsIGF2YWlsYWJsZSBzb21ld2hlcmUgYW5kXG4gIC8vIGNhbGxlZCBhZnRlciB1bnN1YnNjcmlwdGlvbiBoYXMgb2NjdXJlZC5cbiAgVk0uZXhlYy5jYW5jZWwodGhpcy5fZXhlY0lkKTtcbiAgdGhpcy5fdW5zdWJzY3JpYmVkID0gdHJ1ZTtcbiAgdGhpcy5fdW5zdWJzY3JpYmVDaGlsZHJlbigpO1xuXG4gIC8vIFJlbW92ZSB1bndhbnRlZCBsaW5nZXJpbmcgcmVmZXJlbmNlcy5cbiAgZGVsZXRlIHRoaXMuY2hpbGRyZW47XG4gIGRlbGV0ZSB0aGlzLnN1YnNjcmlwdGlvbnM7XG4gIGRlbGV0ZSB0aGlzLnVuc3Vic2NyaXB0aW9ucztcbiAgZGVsZXRlIHRoaXMuX2ZuO1xuICBkZWxldGUgdGhpcy5fZW52O1xuICBkZWxldGUgdGhpcy5fdXBkYXRlO1xuICBkZWxldGUgdGhpcy5fY29udGFpbmVyO1xuICBkZWxldGUgdGhpcy5ib3VuZFVwZGF0ZTtcbiAgZGVsZXRlIHRoaXMuYm91bmRVbnN1YnNjcmlwdGlvbjtcbn07XG5cbi8qKlxuICogVW5zdWJzY3JpYmUgdGhlIGN1cnJlbnQgaW5zdGFuY2UgY2hpbGRyZW4uXG4gKi9cblN1YnNjcmlwdGlvbi5wcm90b3R5cGUuX3Vuc3Vic2NyaWJlQ2hpbGRyZW4gPSBmdW5jdGlvbiAoKSB7XG4gIGZvciAodmFyIGNoaWxkIGluIHRoaXMuY2hpbGRyZW4pIHtcbiAgICB0aGlzLmNoaWxkcmVuW2NoaWxkXS51bnN1YnNjcmliZSgpO1xuICB9XG59O1xuXG4vKipcbiAqIEV4ZWN1dGUgdGhlIHN1YnNjcmlwdGlvbiBmdW5jdGlvbi5cbiAqXG4gKiBAcmV0dXJuIHsqfVxuICovXG5TdWJzY3JpcHRpb24ucHJvdG90eXBlLmV4ZWN1dGUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBwYXJlbnQgPSB0aGlzLl9jb250YWluZXIuc3Vic2NyaXB0aW9uO1xuXG4gIC8vIElmIHdlIGhhdmUgYW4gZXhpc3Rpbmcgc3Vic2NyaXB0aW9uLCBsaW5rIHRoZSBzdWJzY3JpcHRpb25zIHRvZ2V0aGVyLlxuICBpZiAocGFyZW50ICYmICFwYXJlbnQuX3Vuc3Vic2NyaWJlZCkge1xuICAgIHRoaXMucGFyZW50ID0gdGhpcy5fY29udGFpbmVyLnN1YnNjcmlwdGlvbjtcbiAgICB0aGlzLnBhcmVudC5jaGlsZHJlblt0aGlzLmNpZF0gPSB0aGlzO1xuICB9XG5cbiAgLy8gQWxpYXMgdGhlIGN1cnJlbnQgc3Vic2NyaXB0aW9ucyBvYmplY3QgZm9yIGRpZmZpbmcgYWZ0ZXIgZXhlY3V0aW9uLlxuICB0aGlzLl9zdWJzY3JpcHRpb25zID0gdGhpcy5zdWJzY3JpcHRpb25zO1xuICB0aGlzLl91bnN1YnNjcmlwdGlvbih0aGlzLnVuc3Vic2NyaXB0aW9ucyk7XG5cbiAgLy8gUmVzZXQgdGhlIHN1YnNjcmlwdGlvbnMgYW5kIHVuc3Vic2NyaXB0aW9ucyBvYmplY3RzIGJlZm9yZSBleGVjdXRpb24uXG4gIHRoaXMuc3Vic2NyaXB0aW9ucyAgID0ge307XG4gIHRoaXMudW5zdWJzY3JpcHRpb25zID0gW107XG5cbiAgdGhpcy5fY29udGFpbmVyLnN1YnNjcmlwdGlvbiA9IHRoaXM7XG4gIHZhciByZXN1bHQgPSB0aGlzLl9mbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB0aGlzLl9jb250YWluZXIuc3Vic2NyaXB0aW9uID0gdGhpcy5wYXJlbnQ7XG5cbiAgLy8gVGhlIGN1cnJlbnQgc3Vic2NyaXB0aW9ucyBvYmplY3QgbmVlZHMgdG8gYmUgY29tcGFyZWQgYWdhaW5zdCB0aGUgcHJldmlvdXNcbiAgLy8gc3Vic2NyaXB0aW9ucyBhbmQgYW55IGRpZmZlbmNlcyBmaXhlZC5cbiAgdmFyIGN1cnJlbnQgID0gdGhpcy5zdWJzY3JpcHRpb25zO1xuICB2YXIgcHJldmlvdXMgPSB0aGlzLl9zdWJzY3JpcHRpb25zO1xuXG4gIC8vIEl0ZXJhdGUgb3ZlciB0aGUgbmV3IHN1YnNjcmlwdGlvbnMgb2JqZWN0LiBDaGVjayBldmVyeSBrZXkgaW4gdGhlIG9iamVjdFxuICAvLyBhZ2FpbnN0IHRoZSBwcmV2aW91cyBzdWJzY3JpcHRpb25zLiBJZiBpdCBleGlzdHMgaW4gdGhlIHByZXZpb3VzIG9iamVjdCxcbiAgLy8gaXQgbWVhbnMgd2UgYXJlIGFscmVhZHkgc3Vic2NyaWJlZC4gT3RoZXJ3aXNlIHdlIG5lZWQgdG8gc3Vic2NyaWJlIHRvXG4gIC8vIHRoZSBuZXcgcHJvcGVydHkuXG4gIGl0ZXJhdGVTdWJzY3JpcHRpb25zKGN1cnJlbnQsIGZ1bmN0aW9uIChvYmplY3QsIHByb3BlcnR5LCBpZCkge1xuICAgIGlmIChwcmV2aW91c1tpZF0gJiYgcHJldmlvdXNbaWRdW3Byb3BlcnR5XSkge1xuICAgICAgcmV0dXJuIGRlbGV0ZSBwcmV2aW91c1tpZF1bcHJvcGVydHldO1xuICAgIH1cblxuICAgIHRoaXMuX2Vudi5zdWJzY3JpYmUob2JqZWN0LCBwcm9wZXJ0eSwgdGhpcy5ib3VuZFVwZGF0ZSk7XG4gIH0sIHRoaXMpO1xuXG4gIC8vIEl0ZXJhdGUgb3ZlciBhbGwgcmVtYWluaW5nIHByZXZpb3VzIHN1YnNjcmlwdGlvbnMgYW5kIHVuc3Vic2NyaWJlIHRoZW0uXG4gIGRlbGV0ZSB0aGlzLl9zdWJzY3JpcHRpb25zO1xuICB0aGlzLl91bnN1YnNjcmliZShwcmV2aW91cyk7XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8qKlxuICogVXBkYXRlIHRoZSBzdXNiY3JpcHRpb24gaW5zdGFuY2Ugd2l0aCBjaGFuZ2VzLlxuICpcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKi9cblN1YnNjcmlwdGlvbi5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5fdHJpZ2dlcmVkIHx8IHRoaXMuX3Vuc3Vic2NyaWJlZCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHRoaXMuX3Vuc3Vic2NyaWJlQ2hpbGRyZW4oKTtcblxuICB0aGlzLl9leGVjSWQgPSBWTS5leGVjKFV0aWxzLmJpbmQoZnVuY3Rpb24gKCkge1xuICAgIGRlbGV0ZSB0aGlzLl90cmlnZ2VyZWQ7XG4gICAgdGhpcy5fdXBkYXRlKHRoaXMuZXhlY3V0ZSgpKTtcbiAgfSwgdGhpcykpO1xuXG4gIHJldHVybiB0aGlzLl90cmlnZ2VyZWQgPSB0cnVlO1xufTtcblxuLyoqXG4gKiBFeHRlbmQgdGhlIEhhbmRsZWJhcnMgcnVudGltZSBlbnZpcm9ubWVudCB3aXRoIERPTSBzcGVjaWZpYyBoZWxwZXJzLlxuICpcbiAqIEB0eXBlIHtPYmplY3R9XG4gKi9cbnZhciBWTSA9IG1vZHVsZS5leHBvcnRzID0gVXRpbHMuY3JlYXRlKGhic1ZNKTtcblxuLyoqXG4gKiBCaW5kIGEgZnVuY3Rpb24gdG8gdGhlIGFuaW1hdGlvbiBmcmFtZS5cbiAqXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge051bWJlcn1cbiAqL1xuVk0uZXhlYyA9IGZ1bmN0aW9uIChmbikge1xuICByZXR1cm4gcmFmKGZuKTtcbn07XG5cbi8qKlxuICogQ2FuY2VsIGFuIGV4ZWN1dGlvbi5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gaWRcbiAqL1xuVk0uZXhlYy5jYW5jZWwgPSBmdW5jdGlvbiAoaWQpIHtcbiAgcmV0dXJuIHJhZi5jYW5jZWwoaWQpO1xufTtcblxuLyoqXG4gKiBDcmVhdGUgYW4gZWxlbWVudCBmcm9tIGEgdGFnIG5hbWUuXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSB0YWdOYW1lXG4gKiBAcGFyYW0gIHtPYmplY3R9IGVudlxuICogQHJldHVybiB7Tm9kZX1cbiAqL1xuVk0uY3JlYXRlRWxlbWVudCA9IGZ1bmN0aW9uICh0YWdOYW1lKSB7XG4gIHJldHVybiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRhZ05hbWUpO1xufTtcblxuLyoqXG4gKiBDb3B5IGFsbCB0aGUgZGF0YSBmcm9tIG9uZSBlbGVtZW50IHRvIGFub3RoZXIgYW5kIHJlcGxhY2UgaW4gcGxhY2UuXG4gKlxuICogQHBhcmFtICB7Tm9kZX0gICBub2RlXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHRhZ05hbWVcbiAqIEBwYXJhbSAge09iamVjdH0gZW52XG4gKiBAcmV0dXJuIHtOb2RlfVxuICovXG5WTS5zZXRUYWdOYW1lID0gZnVuY3Rpb24gKG5vZGUsIHRhZ05hbWUpIHtcbiAgdmFyIG5ld05vZGUgPSBWTS5jcmVhdGVFbGVtZW50KHRhZ05hbWUpO1xuXG4gIC8vIE1vdmUgYWxsIGNoaWxkIGVsZW1lbnRzIHRvIHRoZSBuZXcgbm9kZS5cbiAgd2hpbGUgKG5vZGUuZmlyc3RDaGlsZCkge1xuICAgIG5ld05vZGUuYXBwZW5kQ2hpbGQobm9kZS5maXJzdENoaWxkKTtcbiAgfVxuXG4gIC8vIENvcHkgYWxsIHRoZSBhdHRyaWJ1dGVzIHRvIHRoZSBuZXcgbm9kZS5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2RlLmF0dHJpYnV0ZXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgYXR0cmlidXRlID0gbm9kZS5hdHRyaWJ1dGVzW2ldO1xuICAgIFZNLnNldEF0dHJpYnV0ZShuZXdOb2RlLCBhdHRyaWJ1dGUubmFtZSwgYXR0cmlidXRlLnZhbHVlKTtcbiAgfVxuXG4gIC8vIFJlcGxhY2UgdGhlIG5vZGUgcG9zaXRpb24gaW4gdGhlIHBsYWNlLlxuICBub2RlLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKG5ld05vZGUsIG5vZGUpO1xuXG4gIHJldHVybiBuZXdOb2RlO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgYW4gYXR0cmlidXRlIGZyb20gYW4gZWxlbWVudC5cbiAqXG4gKiBAcGFyYW0ge05vZGV9ICAgZWxcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gKiBAcGFyYW0ge09iamVjdH0gZW52XG4gKi9cblZNLnJlbW92ZUF0dHJpYnV0ZSA9IGZ1bmN0aW9uIChlbCwgbmFtZSkge1xuICBpZiAoIWVsLmhhc0F0dHJpYnV0ZShuYW1lKSkgeyByZXR1cm47IH1cblxuICBlbC5yZW1vdmVBdHRyaWJ1dGUobmFtZSk7XG5cbiAgLy8gVW5zZXQgdGhlIERPTSBwcm9wZXJ0eSB3aGVuIHRoZSBhdHRyaWJ1dGUgaXMgcmVtb3ZlZC5cbiAgaWYgKGF0dHJQcm9wc1tlbC50YWdOYW1lXSAmJiBhdHRyUHJvcHNbZWwudGFnTmFtZV1bbmFtZV0pIHtcbiAgICBlbFthdHRyUHJvcHNbZWwudGFnTmFtZV1bbmFtZV1dID0gbnVsbDtcbiAgfVxufTtcblxuLyoqXG4gKiBTZXQgYW4gYXR0cmlidXRlIHZhbHVlIG9uIGFuIGVsZW1lbnQuXG4gKlxuICogQHBhcmFtIHtOb2RlfSAgIGVsXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICogQHBhcmFtIHsqfSAgICAgIHZhbHVlXG4gKiBAcGFyYW0ge09iamVjdH0gZW52XG4gKi9cblZNLnNldEF0dHJpYnV0ZSA9IGZ1bmN0aW9uIChlbCwgbmFtZSwgdmFsdWUpIHtcbiAgaWYgKHZhbHVlID09PSBmYWxzZSkge1xuICAgIHJldHVybiBWTS5yZW1vdmVBdHRyaWJ1dGUoZWwsIG5hbWUpO1xuICB9XG5cbiAgLy8gU2V0IHRoZSBhdHRyaWJ1dGUgdmFsdWUgdG8gdGhlIG5hbWUgd2hlbiB0aGUgdmFsdWUgaXMgYHRydWVgLlxuICBlbC5zZXRBdHRyaWJ1dGUobmFtZSwgdmFsdWUgPT09IHRydWUgPyBuYW1lIDogdmFsdWUpO1xuXG4gIC8vIFVwZGF0ZSB0aGUgRE9NIHByb3BlcnR5IHdoZW4gdGhlIGF0dHJpYnV0ZSBjaGFuZ2VzLlxuICBpZiAoYXR0clByb3BzW2VsLnRhZ05hbWVdICYmIGF0dHJQcm9wc1tlbC50YWdOYW1lXVtuYW1lXSkge1xuICAgIGVsW2F0dHJQcm9wc1tlbC50YWdOYW1lXVtuYW1lXV0gPSB2YWx1ZTtcbiAgfVxufTtcblxuLyoqXG4gKiBDcmVhdGUgYSBjb21tZW50IG5vZGUgYmFzZWQgb24gdGV4dCBjb250ZW50cy5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IGNvbnRlbnRzXG4gKiBAcGFyYW0gIHtPYmplY3R9IGVudlxuICogQHJldHVybiB7Tm9kZX1cbiAqL1xuVk0uY3JlYXRlQ29tbWVudCA9IGZ1bmN0aW9uIChjb21tZW50KSB7XG4gIHJldHVybiBkb2N1bWVudC5jcmVhdGVDb21tZW50KGNvbW1lbnQpO1xufTtcblxuLyoqXG4gKiBHZW5lcmF0ZSBhbiBleGVjdXRhYmxlIHRlbXBsYXRlIGZyb20gYSB0ZW1wbGF0ZSBzcGVjLlxuICpcbiAqIEBwYXJhbSAge09iamVjdH0gICB0ZW1wbGF0ZVNwZWNcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICovXG5WTS50ZW1wbGF0ZSA9IGZ1bmN0aW9uICh0ZW1wbGF0ZVNwZWMsIGVudikge1xuICAvKipcbiAgICogU3Vic2NyaWJlciB0byBmdW5jdGlvbiBpbiB0aGUgRE9NQmFycyBleGVjdXRpb24gaW5zdGFuY2UuXG4gICAqXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gY3JlYXRlXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSB1cGRhdGVcbiAgICogQHJldHVybiB7T2JqZWN0fVxuICAgKi9cbiAgdmFyIHN1YnNjcmliZSA9IGZ1bmN0aW9uIChmbiwgY3JlYXRlLCB1cGRhdGUpIHtcbiAgICB2YXIgc3Vic2NyaWJlciA9IG5ldyBTdWJzY3JpcHRpb24oZm4sIHVwZGF0ZSwgY29udGFpbmVyLCBlbnYpO1xuXG4gICAgLy8gSW1tZWRpYXRlbHkgYWxpYXMgdGhlIHN0YXJ0aW5nIHZhbHVlLlxuICAgIHN1YnNjcmliZXIudmFsdWUgPSBzdWJzY3JpYmVyLmV4ZWN1dGUoKTtcbiAgICBVdGlscy5pc0Z1bmN0aW9uKGNyZWF0ZSkgJiYgKHN1YnNjcmliZXIudmFsdWUgPSBjcmVhdGUoc3Vic2NyaWJlci52YWx1ZSkpO1xuXG4gICAgcmV0dXJuIHN1YnNjcmliZXI7XG4gIH07XG5cbiAgLyoqXG4gICAqIFdyYXAgYSBmdW5jdGlvbiB3aXRoIGEgc2FuaXRpemVkIHB1YmxpYyBzdWJzY3JpYmVyIG9iamVjdC5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gICAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICAgKi9cbiAgdmFyIHdyYXBQcm9ncmFtID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgdmFyIHdyYXBwZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgc3Vic2NyaWJlciA9IG5ldyBTdWJzY3JpcHRpb24oZm4sIG51bGwsIGNvbnRhaW5lciwgZW52KTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdmFsdWU6ICAgICAgIHN1YnNjcmliZXIuZXhlY3V0ZS5hcHBseShzdWJzY3JpYmVyLCBhcmd1bWVudHMpLFxuICAgICAgICB1bnN1YnNjcmliZTogVXRpbHMuYmluZChzdWJzY3JpYmVyLnVuc3Vic2NyaWJlLCBzdWJzY3JpYmVyKVxuICAgICAgfTtcbiAgICB9O1xuXG4gICAgLy8gRXh0ZW5kIHRoZSB3cmFwcGVyIGZ1bmN0aW9uIHdpdGggcHJvcGVydGllcyBvZiB0aGUgcGFzc2VkIGluIGZ1bmN0aW9uLlxuICAgIFV0aWxzLmV4dGVuZCh3cmFwcGVyLCBmbik7XG5cbiAgICByZXR1cm4gd3JhcHBlcjtcbiAgfTtcblxuICAvKipcbiAgICogVGhlIGNvbnRhaW5lciBvYmplY3QgaG9sZHMgYWxsIHRoZSBmdW5jdGlvbnMgdXNlZCBieSB0aGUgdGVtcGxhdGUgc3BlYy5cbiAgICpcbiAgICogQHR5cGUge09iamVjdH1cbiAgICovXG4gIHZhciBjb250YWluZXIgPSB7XG4gICAgaW52b2tlUGFydGlhbDogICAgVk0uaW52b2tlUGFydGlhbCxcbiAgICBwcm9ncmFtczogICAgICAgICBbXSxcbiAgICBub29wOiAgICAgICAgICAgICBWTS5ub29wLFxuICAgIHBhcnRpYWw6ICAgICAgICAgIFV0aWxzLnBhcnRpYWwsXG4gICAgd3JhcFByb2dyYW06ICAgICAgd3JhcFByb2dyYW0sXG4gICAgZXNjYXBlRXhwcmVzc2lvbjogVXRpbHMuZXNjYXBlRXhwcmVzc2lvbixcbiAgICBwcm9ncmFtV2l0aERlcHRoOiBWTS5wcm9ncmFtV2l0aERlcHRoXG4gIH07XG5cbiAgLyoqXG4gICAqIFJlbmRlciBhbmQgc3Vic2NyaWJlIGEgc2luZ2xlIERPTSBub2RlIHVzaW5nIGEgY3VzdG9tIGNyZWF0aW9uIGZ1bmN0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGNyZWF0ZVxuICAgKiBAcmV0dXJuIHtOb2RlfVxuICAgKi9cbiAgdmFyIHN1YnNjcmliZU5vZGUgPSBmdW5jdGlvbiAoZm4sIGNyZWF0ZSkge1xuICAgIHJldHVybiBzdWJzY3JpYmUoZm4sIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgcmV0dXJuIFV0aWxzLnRyYWNrTm9kZShjcmVhdGUodmFsdWUpKTtcbiAgICB9LCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHRoaXMudmFsdWUucmVwbGFjZShjcmVhdGUodmFsdWUpKTtcbiAgICB9KS52YWx1ZS5mcmFnbWVudDtcbiAgfTtcblxuICAvKipcbiAgICogQ3JlYXRlIGFuIGVsZW1lbnQgYW5kIHN1YnNjcmliZSB0byBhbnkgY2hhbmdlcy4gVGhpcyBtZXRob2QgcmVxdWlyZXMgYVxuICAgKiBjYWxsYmFjayBmdW5jdGlvbiBmb3IgYW55IGVsZW1lbnQgY2hhbmdlcyBzaW5jZSB5b3UgY2FuJ3QgY2hhbmdlIGEgdGFnXG4gICAqIG5hbWUgaW4gcGxhY2UuXG4gICAqXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gY2JcbiAgICogQHJldHVybiB7RWxlbWVudH1cbiAgICovXG4gIGNvbnRhaW5lci5jcmVhdGVFbGVtZW50ID0gZnVuY3Rpb24gKGZuLCBjYikge1xuICAgIHJldHVybiBzdWJzY3JpYmUoZm4sIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgcmV0dXJuIFZNLmNyZWF0ZUVsZW1lbnQodmFsdWUsIGVudik7XG4gICAgfSwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICBjYih0aGlzLnZhbHVlID0gVk0uc2V0VGFnTmFtZSh0aGlzLnZhbHVlLCB2YWx1ZSwgZW52KSk7XG4gICAgfSkudmFsdWU7XG4gIH07XG5cbiAgLyoqXG4gICAqIEFwcGVuZCBhbiBlbGVtZW50IHRvIHRoZSBlbmQgb2YgYW5vdGhlciBlbGVtZW50LlxuICAgKlxuICAgKiBAcGFyYW0ge05vZGV9IHBhcmVudFxuICAgKiBAcGFyYW0ge05vZGV9IGNoaWxkXG4gICAqL1xuICBjb250YWluZXIuYXBwZW5kQ2hpbGQgPSBmdW5jdGlvbiAocGFyZW50LCBjaGlsZCkge1xuICAgIGNoaWxkICYmIHBhcmVudC5hcHBlbmRDaGlsZChjaGlsZCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFNldCBhbiBlbGVtZW50cyBhdHRyaWJ1dGUuIFdlIGFjY2VwdCB0aGUgY3VycmVudCBlbGVtZW50IGEgZnVuY3Rpb25cbiAgICogYmVjYXVzZSB3aGVuIGEgdGFnIG5hbWUgY2hhbmdlcyB3ZSB3aWxsIGxvc2UgcmVmZXJlbmNlIHRvIHRoZSBhY3RpdmVseVxuICAgKiByZW5kZXJlZCBlbGVtZW50LlxuICAgKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjdXJyZW50RWxcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gbmFtZUZuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IHZhbHVlRm5cbiAgICovXG4gIGNvbnRhaW5lci5zZXRBdHRyaWJ1dGUgPSBmdW5jdGlvbiAoY3VycmVudEVsLCBuYW1lRm4sIHZhbHVlRm4pIHtcbiAgICB2YXIgYXR0ck5hbWUgPSBzdWJzY3JpYmUobmFtZUZuLCBudWxsLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIFZNLnJlbW92ZUF0dHJpYnV0ZShjdXJyZW50RWwoKSwgdGhpcy52YWx1ZSk7XG4gICAgICBWTS5zZXRBdHRyaWJ1dGUoY3VycmVudEVsKCksIHRoaXMudmFsdWUgPSB2YWx1ZSwgYXR0clZhbHVlLnZhbHVlKTtcbiAgICB9KTtcblxuICAgIHZhciBhdHRyVmFsdWUgPSBzdWJzY3JpYmUodmFsdWVGbiwgbnVsbCwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICBWTS5zZXRBdHRyaWJ1dGUoY3VycmVudEVsKCksIGF0dHJOYW1lLnZhbHVlLCB0aGlzLnZhbHVlID0gdmFsdWUpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIFZNLnNldEF0dHJpYnV0ZShjdXJyZW50RWwoKSwgYXR0ck5hbWUudmFsdWUsIGF0dHJWYWx1ZS52YWx1ZSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIERPTSBlbGVtZW50IGFuZCBzdWJzY3JpYmUgdG8gYW55IGNoYW5nZXMuXG4gICAqXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICAgKiBAcmV0dXJuIHtOb2RlfVxuICAgKi9cbiAgY29udGFpbmVyLmNyZWF0ZURPTSA9IGZ1bmN0aW9uIChmbikge1xuICAgIHJldHVybiBzdWJzY3JpYmVOb2RlKGZuLCBVdGlscy5kb21pZnlFeHByZXNzaW9uKTtcbiAgfTtcblxuICAvKipcbiAgICogQ3JlYXRlIGEgdGV4dCBub2RlIGFuZCBzdWJzY3JpYmUgdG8gYW55IGNoYW5nZXMuXG4gICAqXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICAgKiBAcmV0dXJuIHtUZXh0fVxuICAgKi9cbiAgY29udGFpbmVyLmNyZWF0ZVRleHQgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICByZXR1cm4gc3Vic2NyaWJlTm9kZShmbiwgVXRpbHMudGV4dGlmeUV4cHJlc3Npb24pO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBjb21tZW50IG5vZGUgYW5kIHN1YnNjcmliZSB0byBhbnkgY2hhbmdlcy5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gICAqIEByZXR1cm4ge0NvbW1lbnR9XG4gICAqL1xuICBjb250YWluZXIuY3JlYXRlQ29tbWVudCA9IGZ1bmN0aW9uIChmbikge1xuICAgIHJldHVybiBzdWJzY3JpYmUoZm4sIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgcmV0dXJuIFZNLmNyZWF0ZUNvbW1lbnQodmFsdWUpO1xuICAgIH0sIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgdGhpcy52YWx1ZS50ZXh0Q29udGVudCA9IHZhbHVlO1xuICAgIH0pLnZhbHVlO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYW5kIHJldHVybiBhIHByb2dyYW0gc2luZ2xldG9uIGJhc2VkIG9uIGluZGV4LlxuICAgKlxuICAgKiBAcGFyYW0gIHtOdW1iZXJ9ICAgaVxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAgICogQHBhcmFtICB7T2JqZWN0fSAgIGRhdGFcbiAgICogQHJldHVybiB7RnVuY3Rpb259XG4gICAqL1xuICBjb250YWluZXIucHJvZ3JhbSA9IGZ1bmN0aW9uIChpLCBmbiwgZGF0YSkge1xuICAgIHZhciBwcm9ncmFtV3JhcHBlciA9IGNvbnRhaW5lci5wcm9ncmFtc1tpXTtcblxuICAgIGlmIChkYXRhKSB7XG4gICAgICByZXR1cm4gVk0ucHJvZ3JhbShpLCBmbiwgZGF0YSk7XG4gICAgfVxuXG4gICAgaWYgKCFwcm9ncmFtV3JhcHBlcikge1xuICAgICAgcmV0dXJuIGNvbnRhaW5lci5wcm9ncmFtc1tpXSA9IFZNLnByb2dyYW0oaSwgZm4pO1xuICAgIH1cblxuICAgIHJldHVybiBwcm9ncmFtV3JhcHBlcjtcbiAgfTtcblxuICAvKipcbiAgICogTWVyZ2UgdHdvIG9iamVjdHMgaW50byBhIHNpbmdsZSBvYmplY3QuXG4gICAqXG4gICAqIEBwYXJhbSAge09iamVjdH0gcGFyYW1cbiAgICogQHBhcmFtICB7T2JqZWN0fSBjb21tb25cbiAgICogQHJldHVybiB7T2JqZWN0fVxuICAgKi9cbiAgY29udGFpbmVyLm1lcmdlID0gZnVuY3Rpb24gKHBhcmFtLCBjb21tb24pIHtcbiAgICB2YXIgcmV0ID0gcGFyYW0gfHwgY29tbW9uO1xuXG4gICAgaWYgKHBhcmFtICYmIGNvbW1vbiAmJiAocGFyYW0gIT09IGNvbW1vbikpIHtcbiAgICAgIHJldCA9IHt9O1xuICAgICAgVXRpbHMuZXh0ZW5kKHJldCwgY29tbW9uKTtcbiAgICAgIFV0aWxzLmV4dGVuZChyZXQsIHBhcmFtKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmV0O1xuICB9O1xuXG4gIC8qKlxuICAgKiBHZXQgYSBwcm9wZXJ0eSBmcm9tIGFuIG9iamVjdC4gUGFzc2VzIGluIHRoZSBvYmplY3QgaWQgKGRlcHRoKSB0byBtYWtlIGl0XG4gICAqIG11Y2ggZmFzdGVyIHRvIGRvIGNvbXBhcmlzb25zIGJldHdlZW4gbmV3IGFuZCBvbGQgc3Vic2NyaXB0aW9ucy5cbiAgICpcbiAgICogQHBhcmFtICB7T2JqZWN0fSBvYmplY3RcbiAgICogQHBhcmFtICB7U3RyaW5nfSBwcm9wZXJ0eVxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IGlkXG4gICAqIEByZXR1cm4geyp9XG4gICAqL1xuICBjb250YWluZXIuZ2V0ID0gZnVuY3Rpb24gKG9iamVjdCwgcHJvcGVydHksIGlkKSB7XG4gICAgY29udGFpbmVyLnN1YnNjcmlwdGlvbi5zdWJzY3JpYmUob2JqZWN0LCBwcm9wZXJ0eSwgaWQpO1xuICAgIHJldHVybiBlbnYuZ2V0KG9iamVjdCwgcHJvcGVydHkpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZXR1cm4gdGhlIGNvbXBpbGVkIEphdmFTY3JpcHQgZnVuY3Rpb24gZm9yIGV4ZWN1dGlvbi5cbiAgICpcbiAgICogQHBhcmFtICB7T2JqZWN0fSBjb250ZXh0XG4gICAqIEBwYXJhbSAge09iamVjdH0gb3B0aW9uc1xuICAgKiBAcmV0dXJuIHtOb2RlfVxuICAgKi9cbiAgcmV0dXJuIHdyYXBQcm9ncmFtKGZ1bmN0aW9uIChjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICB2YXIgbmFtZXNwYWNlID0gb3B0aW9ucy5wYXJ0aWFsID8gb3B0aW9ucyA6IGVudjtcbiAgICB2YXIgaGVscGVycztcbiAgICB2YXIgcGFydGlhbHM7XG5cbiAgICBpZiAoIW9wdGlvbnMucGFydGlhbCkge1xuICAgICAgaGVscGVycyAgPSBvcHRpb25zLmhlbHBlcnM7XG4gICAgICBwYXJ0aWFscyA9IG9wdGlvbnMucGFydGlhbHM7XG4gICAgfVxuXG4gICAgdmFyIHJlc3VsdCA9IHRlbXBsYXRlU3BlYy5jYWxsKFxuICAgICAgY29udGFpbmVyLFxuICAgICAgbmFtZXNwYWNlLFxuICAgICAgY29udGV4dCxcbiAgICAgIGhlbHBlcnMsXG4gICAgICBwYXJ0aWFscyxcbiAgICAgIG9wdGlvbnMuZGF0YVxuICAgICk7XG5cbiAgICBpZiAoIW9wdGlvbnMucGFydGlhbCkge1xuICAgICAgZW52LlZNLmNoZWNrUmV2aXNpb24oY29udGFpbmVyLmNvbXBpbGVySW5mbyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCdoYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvc2FmZS1zdHJpbmcnKS5kZWZhdWx0O1xuIiwidmFyIFRyYWNrTm9kZSA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgdGhpcy5mcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcblxuICAvLyBJbnN0YW50bHkgYXBwZW5kIGEgYmVmb3JlIGFuZCBhZnRlciB0cmFja2luZyBub2RlLlxuICB0aGlzLmJlZm9yZSA9IHRoaXMuZnJhZ21lbnQuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpKTtcbiAgdGhpcy5hZnRlciAgPSB0aGlzLmZyYWdtZW50LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKSk7XG5cbiAgLy8gQXBwZW5kIHRoZSBwYXNzZWQgaW4gbm9kZSB0byB0aGUgY3VycmVudCBmcmFnbWVudC5cbiAgbm9kZSAmJiB0aGlzLmFwcGVuZENoaWxkKG5vZGUpO1xufTtcblxuLyoqXG4gKiBBcHBlbmQgYSBub2RlIHRvIHRoZSBjdXJyZW50IHRyYWNraW5nIGZyYWdtZW50LlxuICpcbiAqIEBwYXJhbSAge05vZGV9IG5vZGVcbiAqIEByZXR1cm4ge3RoaXN9XG4gKi9cblRyYWNrTm9kZS5wcm90b3R5cGUuYXBwZW5kQ2hpbGQgPSBmdW5jdGlvbiAobm9kZSkge1xuICB0aGlzLmFmdGVyLnBhcmVudE5vZGUgJiYgdGhpcy5hZnRlci5wYXJlbnROb2RlLmluc2VydEJlZm9yZShub2RlLCB0aGlzLmFmdGVyKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUHJlcGVuZCBhIG5vZGUgdG8gdGhlIGN1cnJlbnQgdHJhY2tpbmcgZnJhZ21lbnQuXG4gKlxuICogQHBhcmFtICB7Tm9kZX0gbm9kZVxuICogQHJldHVybiB7dGhpc31cbiAqL1xuVHJhY2tOb2RlLnByb3RvdHlwZS5wcmVwZW5kQ2hpbGQgPSBmdW5jdGlvbiAobm9kZSkge1xuICB0aGlzLmJlZm9yZS5wYXJlbnROb2RlLmluc2VydEJlZm9yZShub2RlLCB0aGlzLmJlZm9yZS5uZXh0U2libGluZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBhbGwgZWxlbWVudHMgYmV0d2VlbiB0aGUgdHdvIHRyYWNraW5nIG5vZGVzLlxuICpcbiAqIEBwYXJhbSAge05vZGV9IG5vZGVcbiAqIEByZXR1cm4ge3RoaXN9XG4gKi9cblRyYWNrTm9kZS5wcm90b3R5cGUuZW1wdHkgPSBmdW5jdGlvbiAoKSB7XG4gIHdoaWxlICh0aGlzLmJlZm9yZS5uZXh0U2libGluZyAmJiB0aGlzLmJlZm9yZS5uZXh0U2libGluZyAhPT0gdGhpcy5hZnRlcikge1xuICAgIHRoaXMuYmVmb3JlLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5iZWZvcmUubmV4dFNpYmxpbmcpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSB0aGUgdGhlIGVsZW1lbnRzIGZyb20gdGhlIERPTS5cbiAqXG4gKiBAcGFyYW0gIHtOb2RlfSBub2RlXG4gKiBAcmV0dXJuIHt0aGlzfVxuICovXG5UcmFja05vZGUucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uICgpIHtcbiAgd2hpbGUgKHRoaXMuYmVmb3JlLm5leHRTaWJsaW5nICYmIHRoaXMuYmVmb3JlLm5leHRTaWJsaW5nICE9PSB0aGlzLmFmdGVyKSB7XG4gICAgdGhpcy5mcmFnbWVudC5hcHBlbmRDaGlsZCh0aGlzLmJlZm9yZS5uZXh0U2libGluZyk7XG4gIH1cblxuICAvLyBQdWxsIHRoZSB0d28gcmVmZXJlbmNlIG5vZGVzIG91dCBvZiB0aGUgRE9NIGFuZCBpbnRvIHRoZSBmcmFnbWVudC5cbiAgdGhpcy5mcmFnbWVudC5hcHBlbmRDaGlsZCh0aGlzLmFmdGVyKTtcbiAgdGhpcy5mcmFnbWVudC5pbnNlcnRCZWZvcmUodGhpcy5iZWZvcmUsIHRoaXMuZnJhZ21lbnQuZmlyc3RDaGlsZCk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlcGxhY2UgdGhlIGNvbnRlbnRzIG9mIHRoZSB0cmFja2luZyBub2RlIHdpdGggbmV3IGNvbnRlbnRzLlxuICpcbiAqIEBwYXJhbSAge05vZGV9IG5vZGVcbiAqIEByZXR1cm4ge3RoaXN9XG4gKi9cblRyYWNrTm9kZS5wcm90b3R5cGUucmVwbGFjZSA9IGZ1bmN0aW9uIChub2RlKSB7XG4gIHJldHVybiB0aGlzLmVtcHR5KCkuYXBwZW5kQ2hpbGQobm9kZSk7XG59O1xuIiwidmFyIGhic1V0aWxzICAgPSByZXF1aXJlKCdoYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvdXRpbHMnKTtcbnZhciB1bmlxdWVJZCAgID0gMDtcbnZhciBUcmFja05vZGUgID0gcmVxdWlyZSgnLi90cmFjay1ub2RlJyk7XG52YXIgU2FmZVN0cmluZyA9IHJlcXVpcmUoJy4vc2FmZS1zdHJpbmcnKTtcbnZhciBfX3NsaWNlICAgID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xuXG4vKipcbiAqIFNpbXBsZSB3YXkgdG8gc3ViY2xhc3MgYW4gb2JqZWN0LCB3aXRoIHN1cHBvcnQgZm9yIG9sZGVyIGJyb3dzZXJzLlxuICpcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xudmFyIGNyZWF0ZSA9IE9iamVjdC5jcmVhdGUgfHwgKGZ1bmN0aW9uICgpIHtcbiAgdmFyIEYgPSBmdW5jdGlvbiAoKSB7fTtcblxuICByZXR1cm4gZnVuY3Rpb24gKG8pIHtcbiAgICBGLnByb3RvdHlwZSA9IG87XG4gICAgdmFyIG9iaiA9IG5ldyBGKCk7XG4gICAgRi5wcm90b3R5cGUgPSBudWxsO1xuICAgIHJldHVybiBvYmo7XG4gIH07XG59KSgpO1xuXG4vKipcbiAqIEV4dGVuZCBIYW5kbGViYXJzIHV0aWxpdGllcyB3aXRoIERPTSBmdW5jdGlvbmFsaXR5LlxuICpcbiAqIEB0eXBlIHtPYmplY3R9XG4gKi9cbnZhciBVdGlscyA9IG1vZHVsZS5leHBvcnRzID0gY3JlYXRlKGhic1V0aWxzKTtcblxuLyoqXG4gKiBSZXR1cm4gYSB1bmlxdWUgaWQuXG4gKlxuICogQHJldHVybiB7TnVtYmVyfVxuICovXG5VdGlscy51bmlxdWVJZCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHVuaXF1ZUlkKys7XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhIGZ1bmN0aW9uIHRoYXQgYWNjZXB0cyBhbiB1bmxpbWl0ZWQgbnVtYmVyIG9mIGFyZ3VtZW50cyBhcyB0aGUgbGFzdFxuICogYXJndW1lbnQuXG4gKlxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqL1xuVXRpbHMudmFyaWFkaWMgPSBmdW5jdGlvbiAoZm4pIHtcbiAgdmFyIGNvdW50ID0gTWF0aC5tYXgoZm4ubGVuZ3RoIC0gMSwgMCk7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYXJncyA9IF9fc2xpY2UuY2FsbChhcmd1bWVudHMsIDAsIGNvdW50KTtcblxuICAgIC8vIEVuZm9yY2UgdGhlIGFycmF5IGxlbmd0aCwgaW4gY2FzZSB3ZSBkaWRuJ3QgaGF2ZSBlbm91Z2ggYXJndW1lbnRzLlxuICAgIGFyZ3MubGVuZ3RoID0gY291bnQ7XG4gICAgYXJncy5wdXNoKF9fc2xpY2UuY2FsbChhcmd1bWVudHMsIGNvdW50KSk7XG5cbiAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJncyk7XG4gIH07XG59O1xuXG4vKipcbiAqIFNpbXBsZSBwYXJ0aWFsIGFwcGxpY2F0aW9uIGZ1bmN0aW9uLlxuICpcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICogQHBhcmFtICB7Kn0gICAgICAgIC4uLlxuICogQHJldHVybiB7RnVuY3Rpb259XG4gKi9cblV0aWxzLnBhcnRpYWwgPSBVdGlscy52YXJpYWRpYyhmdW5jdGlvbiAoZm4sIGFyZ3MpIHtcbiAgcmV0dXJuIFV0aWxzLnZhcmlhZGljKGZ1bmN0aW9uIChjYWxsZWQpIHtcbiAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJncy5jb25jYXQoY2FsbGVkKSk7XG4gIH0pO1xufSk7XG5cbi8qKlxuICogQmluZCBhIGZ1bmN0aW9uIHRvIGEgY2VydGFpbiBjb250ZXh0LlxuICpcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICogQHBhcmFtICB7T2JqZWN0fSAgIGNvbnRleHRcbiAqIEBwYXJhbSAgeyp9ICAgICAgICAuLi5cbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICovXG5VdGlscy5iaW5kID0gVXRpbHMudmFyaWFkaWMoZnVuY3Rpb24gKGZuLCBjb250ZXh0LCBhcmdzKSB7XG4gIHJldHVybiBVdGlscy52YXJpYWRpYyhmdW5jdGlvbiAoY2FsbGVkKSB7XG4gICAgcmV0dXJuIGZuLmFwcGx5KGNvbnRleHQsIGFyZ3MuY29uY2F0KGNhbGxlZCkpO1xuICB9KTtcbn0pO1xuXG4vKipcbiAqIEV4cG9zZSB0aGUgY3JlYXRlIGZ1bmN0aW9uLlxuICpcbiAqIEB0eXBlIHtGdW5jdGlvbn1cbiAqL1xuVXRpbHMuY3JlYXRlID0gY3JlYXRlO1xuXG4vKipcbiAqIENoZWNrIHdoZXRoZXIgYW4gb2JqZWN0IGlzIGFjdHVhbGx5IGEgRE9NIG5vZGUuXG4gKlxuICogQHBhcmFtICB7Kn0gICAgICAgZWxlbWVudFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqL1xuVXRpbHMuaXNOb2RlID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgcmV0dXJuIGVsZW1lbnQgaW5zdGFuY2VvZiBOb2RlO1xufTtcblxuLyoqXG4gKiBUcmFjayBhIG5vZGUgaW5zdGFuY2UgYW55d2hlcmUgaXQgZ29lcyBpbiB0aGUgRE9NLlxuICpcbiAqIEBwYXJhbSAge05vZGV9ICAgICAgbm9kZVxuICogQHJldHVybiB7VHJhY2tOb2RlfVxuICovXG5VdGlscy50cmFja05vZGUgPSBmdW5jdGlvbiAobm9kZSkge1xuICByZXR1cm4gbmV3IFRyYWNrTm9kZShub2RlKTtcbn07XG5cbi8qKlxuICogVHJhbnNmb3JtIGEgc3RyaW5nIGludG8gYXJiaXRyYXJ5IERPTSBub2Rlcy5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHN0cmluZ1xuICogQHJldHVybiB7Tm9kZX1cbiAqL1xuVXRpbHMuZG9taWZ5RXhwcmVzc2lvbiA9IGZ1bmN0aW9uIChzdHJpbmcpIHtcbiAgLy8gSWYgd2UgcGFzc2VkIGluIGEgc2FmZSBzdHJpbmcsIGdldCB0aGUgYWN0dWFsIHZhbHVlLlxuICBpZiAoc3RyaW5nIGluc3RhbmNlb2YgU2FmZVN0cmluZykge1xuICAgIHN0cmluZyA9IHN0cmluZy5zdHJpbmc7XG4gIH1cblxuICAvLyBObyBuZWVkIHRvIGNvZXJjZSBhIG5vZGUuXG4gIGlmIChVdGlscy5pc05vZGUoc3RyaW5nKSkge1xuICAgIHJldHVybiBzdHJpbmc7XG4gIH1cblxuICB2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIGRpdi5pbm5lckhUTUwgPSBzdHJpbmc7XG5cbiAgaWYgKGRpdi5jaGlsZE5vZGVzLmxlbmd0aCA9PT0gMSkge1xuICAgIHJldHVybiBkaXYucmVtb3ZlQ2hpbGQoZGl2LmNoaWxkTm9kZXNbMF0pO1xuICB9XG5cbiAgdmFyIGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuXG4gIHdoaWxlIChkaXYuZmlyc3RDaGlsZCkge1xuICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKGRpdi5maXJzdENoaWxkKTtcbiAgfVxuXG4gIHJldHVybiBmcmFnbWVudDtcbn07XG5cbi8qKlxuICogVHJhbnNmb3JtIGEgc3RyaW5nIGludG8gYSBET00gdGV4dCBub2RlIGZvciBhcHBlbmRpbmcgdG8gdGhlIHRlbXBsYXRlLlxuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gc3RyaW5nXG4gKiBAcmV0dXJuIHtUZXh0fVxuICovXG5VdGlscy50ZXh0aWZ5RXhwcmVzc2lvbiA9IGZ1bmN0aW9uIChzdHJpbmcpIHtcbiAgaWYgKHN0cmluZyBpbnN0YW5jZW9mIFNhZmVTdHJpbmcpIHtcbiAgICByZXR1cm4gVXRpbHMuZG9taWZ5RXhwcmVzc2lvbihzdHJpbmcuc3RyaW5nKTtcbiAgfVxuXG4gIC8vIENhdGNoIHdoZW4gdGhlIHN0cmluZyBpcyBhY3R1YWxseSBhIERPTSBub2RlIGFuZCB0dXJuIGl0IGludG8gYSBzdHJpbmcuXG4gIGlmIChVdGlscy5pc05vZGUoc3RyaW5nKSkge1xuICAgIC8vIEFscmVhZHkgYSB0ZXh0IG5vZGUsIGp1c3QgcmV0dXJuIGl0IGltbWVkaWF0ZWx5LlxuICAgIGlmIChzdHJpbmcubm9kZVR5cGUgPT09IDMpIHtcbiAgICAgIHJldHVybiBzdHJpbmc7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBzdHJpbmcub3V0ZXJIVE1MID09PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHN0cmluZy5vdXRlckhUTUwpO1xuICAgIH1cblxuICAgIHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBkaXYuYXBwZW5kQ2hpbGQoc3RyaW5nLmNsb25lTm9kZSh0cnVlKSk7XG4gICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGRpdi5pbm5lckhUTUwpO1xuICB9XG5cbiAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHN0cmluZyA9PSBudWxsID8gJycgOiBzdHJpbmcpO1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xudmFyIFV0aWxzID0gcmVxdWlyZShcIi4vdXRpbHNcIik7XG52YXIgRXhjZXB0aW9uID0gcmVxdWlyZShcIi4vZXhjZXB0aW9uXCIpW1wiZGVmYXVsdFwiXTtcblxudmFyIFZFUlNJT04gPSBcIjEuMy4wXCI7XG5leHBvcnRzLlZFUlNJT04gPSBWRVJTSU9OO3ZhciBDT01QSUxFUl9SRVZJU0lPTiA9IDQ7XG5leHBvcnRzLkNPTVBJTEVSX1JFVklTSU9OID0gQ09NUElMRVJfUkVWSVNJT047XG52YXIgUkVWSVNJT05fQ0hBTkdFUyA9IHtcbiAgMTogJzw9IDEuMC5yYy4yJywgLy8gMS4wLnJjLjIgaXMgYWN0dWFsbHkgcmV2MiBidXQgZG9lc24ndCByZXBvcnQgaXRcbiAgMjogJz09IDEuMC4wLXJjLjMnLFxuICAzOiAnPT0gMS4wLjAtcmMuNCcsXG4gIDQ6ICc+PSAxLjAuMCdcbn07XG5leHBvcnRzLlJFVklTSU9OX0NIQU5HRVMgPSBSRVZJU0lPTl9DSEFOR0VTO1xudmFyIGlzQXJyYXkgPSBVdGlscy5pc0FycmF5LFxuICAgIGlzRnVuY3Rpb24gPSBVdGlscy5pc0Z1bmN0aW9uLFxuICAgIHRvU3RyaW5nID0gVXRpbHMudG9TdHJpbmcsXG4gICAgb2JqZWN0VHlwZSA9ICdbb2JqZWN0IE9iamVjdF0nO1xuXG5mdW5jdGlvbiBIYW5kbGViYXJzRW52aXJvbm1lbnQoaGVscGVycywgcGFydGlhbHMpIHtcbiAgdGhpcy5oZWxwZXJzID0gaGVscGVycyB8fCB7fTtcbiAgdGhpcy5wYXJ0aWFscyA9IHBhcnRpYWxzIHx8IHt9O1xuXG4gIHJlZ2lzdGVyRGVmYXVsdEhlbHBlcnModGhpcyk7XG59XG5cbmV4cG9ydHMuSGFuZGxlYmFyc0Vudmlyb25tZW50ID0gSGFuZGxlYmFyc0Vudmlyb25tZW50O0hhbmRsZWJhcnNFbnZpcm9ubWVudC5wcm90b3R5cGUgPSB7XG4gIGNvbnN0cnVjdG9yOiBIYW5kbGViYXJzRW52aXJvbm1lbnQsXG5cbiAgbG9nZ2VyOiBsb2dnZXIsXG4gIGxvZzogbG9nLFxuXG4gIHJlZ2lzdGVySGVscGVyOiBmdW5jdGlvbihuYW1lLCBmbiwgaW52ZXJzZSkge1xuICAgIGlmICh0b1N0cmluZy5jYWxsKG5hbWUpID09PSBvYmplY3RUeXBlKSB7XG4gICAgICBpZiAoaW52ZXJzZSB8fCBmbikgeyB0aHJvdyBuZXcgRXhjZXB0aW9uKCdBcmcgbm90IHN1cHBvcnRlZCB3aXRoIG11bHRpcGxlIGhlbHBlcnMnKTsgfVxuICAgICAgVXRpbHMuZXh0ZW5kKHRoaXMuaGVscGVycywgbmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChpbnZlcnNlKSB7IGZuLm5vdCA9IGludmVyc2U7IH1cbiAgICAgIHRoaXMuaGVscGVyc1tuYW1lXSA9IGZuO1xuICAgIH1cbiAgfSxcblxuICByZWdpc3RlclBhcnRpYWw6IGZ1bmN0aW9uKG5hbWUsIHN0cikge1xuICAgIGlmICh0b1N0cmluZy5jYWxsKG5hbWUpID09PSBvYmplY3RUeXBlKSB7XG4gICAgICBVdGlscy5leHRlbmQodGhpcy5wYXJ0aWFscywgIG5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnBhcnRpYWxzW25hbWVdID0gc3RyO1xuICAgIH1cbiAgfVxufTtcblxuZnVuY3Rpb24gcmVnaXN0ZXJEZWZhdWx0SGVscGVycyhpbnN0YW5jZSkge1xuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignaGVscGVyTWlzc2luZycsIGZ1bmN0aW9uKGFyZykge1xuICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oXCJNaXNzaW5nIGhlbHBlcjogJ1wiICsgYXJnICsgXCInXCIpO1xuICAgIH1cbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2Jsb2NrSGVscGVyTWlzc2luZycsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICB2YXIgaW52ZXJzZSA9IG9wdGlvbnMuaW52ZXJzZSB8fCBmdW5jdGlvbigpIHt9LCBmbiA9IG9wdGlvbnMuZm47XG5cbiAgICBpZiAoaXNGdW5jdGlvbihjb250ZXh0KSkgeyBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpOyB9XG5cbiAgICBpZihjb250ZXh0ID09PSB0cnVlKSB7XG4gICAgICByZXR1cm4gZm4odGhpcyk7XG4gICAgfSBlbHNlIGlmKGNvbnRleHQgPT09IGZhbHNlIHx8IGNvbnRleHQgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGludmVyc2UodGhpcyk7XG4gICAgfSBlbHNlIGlmIChpc0FycmF5KGNvbnRleHQpKSB7XG4gICAgICBpZihjb250ZXh0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgcmV0dXJuIGluc3RhbmNlLmhlbHBlcnMuZWFjaChjb250ZXh0LCBvcHRpb25zKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBpbnZlcnNlKHRoaXMpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZm4oY29udGV4dCk7XG4gICAgfVxuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignZWFjaCcsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICB2YXIgZm4gPSBvcHRpb25zLmZuLCBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlO1xuICAgIHZhciBpID0gMCwgcmV0ID0gXCJcIiwgZGF0YTtcblxuICAgIGlmIChpc0Z1bmN0aW9uKGNvbnRleHQpKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cblxuICAgIGlmIChvcHRpb25zLmRhdGEpIHtcbiAgICAgIGRhdGEgPSBjcmVhdGVGcmFtZShvcHRpb25zLmRhdGEpO1xuICAgIH1cblxuICAgIGlmKGNvbnRleHQgJiYgdHlwZW9mIGNvbnRleHQgPT09ICdvYmplY3QnKSB7XG4gICAgICBpZiAoaXNBcnJheShjb250ZXh0KSkge1xuICAgICAgICBmb3IodmFyIGogPSBjb250ZXh0Lmxlbmd0aDsgaTxqOyBpKyspIHtcbiAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgZGF0YS5pbmRleCA9IGk7XG4gICAgICAgICAgICBkYXRhLmZpcnN0ID0gKGkgPT09IDApO1xuICAgICAgICAgICAgZGF0YS5sYXN0ICA9IChpID09PSAoY29udGV4dC5sZW5ndGgtMSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXQgPSByZXQgKyBmbihjb250ZXh0W2ldLCB7IGRhdGE6IGRhdGEgfSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvcih2YXIga2V5IGluIGNvbnRleHQpIHtcbiAgICAgICAgICBpZihjb250ZXh0Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIGlmKGRhdGEpIHsgXG4gICAgICAgICAgICAgIGRhdGEua2V5ID0ga2V5OyBcbiAgICAgICAgICAgICAgZGF0YS5pbmRleCA9IGk7XG4gICAgICAgICAgICAgIGRhdGEuZmlyc3QgPSAoaSA9PT0gMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXQgPSByZXQgKyBmbihjb250ZXh0W2tleV0sIHtkYXRhOiBkYXRhfSk7XG4gICAgICAgICAgICBpKys7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYoaSA9PT0gMCl7XG4gICAgICByZXQgPSBpbnZlcnNlKHRoaXMpO1xuICAgIH1cblxuICAgIHJldHVybiByZXQ7XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdpZicsIGZ1bmN0aW9uKGNvbmRpdGlvbmFsLCBvcHRpb25zKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24oY29uZGl0aW9uYWwpKSB7IGNvbmRpdGlvbmFsID0gY29uZGl0aW9uYWwuY2FsbCh0aGlzKTsgfVxuXG4gICAgLy8gRGVmYXVsdCBiZWhhdmlvciBpcyB0byByZW5kZXIgdGhlIHBvc2l0aXZlIHBhdGggaWYgdGhlIHZhbHVlIGlzIHRydXRoeSBhbmQgbm90IGVtcHR5LlxuICAgIC8vIFRoZSBgaW5jbHVkZVplcm9gIG9wdGlvbiBtYXkgYmUgc2V0IHRvIHRyZWF0IHRoZSBjb25kdGlvbmFsIGFzIHB1cmVseSBub3QgZW1wdHkgYmFzZWQgb24gdGhlXG4gICAgLy8gYmVoYXZpb3Igb2YgaXNFbXB0eS4gRWZmZWN0aXZlbHkgdGhpcyBkZXRlcm1pbmVzIGlmIDAgaXMgaGFuZGxlZCBieSB0aGUgcG9zaXRpdmUgcGF0aCBvciBuZWdhdGl2ZS5cbiAgICBpZiAoKCFvcHRpb25zLmhhc2guaW5jbHVkZVplcm8gJiYgIWNvbmRpdGlvbmFsKSB8fCBVdGlscy5pc0VtcHR5KGNvbmRpdGlvbmFsKSkge1xuICAgICAgcmV0dXJuIG9wdGlvbnMuaW52ZXJzZSh0aGlzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG9wdGlvbnMuZm4odGhpcyk7XG4gICAgfVxuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcigndW5sZXNzJywgZnVuY3Rpb24oY29uZGl0aW9uYWwsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gaW5zdGFuY2UuaGVscGVyc1snaWYnXS5jYWxsKHRoaXMsIGNvbmRpdGlvbmFsLCB7Zm46IG9wdGlvbnMuaW52ZXJzZSwgaW52ZXJzZTogb3B0aW9ucy5mbiwgaGFzaDogb3B0aW9ucy5oYXNofSk7XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCd3aXRoJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmIChpc0Z1bmN0aW9uKGNvbnRleHQpKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cblxuICAgIGlmICghVXRpbHMuaXNFbXB0eShjb250ZXh0KSkgcmV0dXJuIG9wdGlvbnMuZm4oY29udGV4dCk7XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdsb2cnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgdmFyIGxldmVsID0gb3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuZGF0YS5sZXZlbCAhPSBudWxsID8gcGFyc2VJbnQob3B0aW9ucy5kYXRhLmxldmVsLCAxMCkgOiAxO1xuICAgIGluc3RhbmNlLmxvZyhsZXZlbCwgY29udGV4dCk7XG4gIH0pO1xufVxuXG52YXIgbG9nZ2VyID0ge1xuICBtZXRob2RNYXA6IHsgMDogJ2RlYnVnJywgMTogJ2luZm8nLCAyOiAnd2FybicsIDM6ICdlcnJvcicgfSxcblxuICAvLyBTdGF0ZSBlbnVtXG4gIERFQlVHOiAwLFxuICBJTkZPOiAxLFxuICBXQVJOOiAyLFxuICBFUlJPUjogMyxcbiAgbGV2ZWw6IDMsXG5cbiAgLy8gY2FuIGJlIG92ZXJyaWRkZW4gaW4gdGhlIGhvc3QgZW52aXJvbm1lbnRcbiAgbG9nOiBmdW5jdGlvbihsZXZlbCwgb2JqKSB7XG4gICAgaWYgKGxvZ2dlci5sZXZlbCA8PSBsZXZlbCkge1xuICAgICAgdmFyIG1ldGhvZCA9IGxvZ2dlci5tZXRob2RNYXBbbGV2ZWxdO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJyAmJiBjb25zb2xlW21ldGhvZF0pIHtcbiAgICAgICAgY29uc29sZVttZXRob2RdLmNhbGwoY29uc29sZSwgb2JqKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5leHBvcnRzLmxvZ2dlciA9IGxvZ2dlcjtcbmZ1bmN0aW9uIGxvZyhsZXZlbCwgb2JqKSB7IGxvZ2dlci5sb2cobGV2ZWwsIG9iaik7IH1cblxuZXhwb3J0cy5sb2cgPSBsb2c7dmFyIGNyZWF0ZUZyYW1lID0gZnVuY3Rpb24ob2JqZWN0KSB7XG4gIHZhciBvYmogPSB7fTtcbiAgVXRpbHMuZXh0ZW5kKG9iaiwgb2JqZWN0KTtcbiAgcmV0dXJuIG9iajtcbn07XG5leHBvcnRzLmNyZWF0ZUZyYW1lID0gY3JlYXRlRnJhbWU7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBlcnJvclByb3BzID0gWydkZXNjcmlwdGlvbicsICdmaWxlTmFtZScsICdsaW5lTnVtYmVyJywgJ21lc3NhZ2UnLCAnbmFtZScsICdudW1iZXInLCAnc3RhY2snXTtcblxuZnVuY3Rpb24gRXhjZXB0aW9uKG1lc3NhZ2UsIG5vZGUpIHtcbiAgdmFyIGxpbmU7XG4gIGlmIChub2RlICYmIG5vZGUuZmlyc3RMaW5lKSB7XG4gICAgbGluZSA9IG5vZGUuZmlyc3RMaW5lO1xuXG4gICAgbWVzc2FnZSArPSAnIC0gJyArIGxpbmUgKyAnOicgKyBub2RlLmZpcnN0Q29sdW1uO1xuICB9XG5cbiAgdmFyIHRtcCA9IEVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3Rvci5jYWxsKHRoaXMsIG1lc3NhZ2UpO1xuXG4gIC8vIFVuZm9ydHVuYXRlbHkgZXJyb3JzIGFyZSBub3QgZW51bWVyYWJsZSBpbiBDaHJvbWUgKGF0IGxlYXN0KSwgc28gYGZvciBwcm9wIGluIHRtcGAgZG9lc24ndCB3b3JrLlxuICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCBlcnJvclByb3BzLmxlbmd0aDsgaWR4KyspIHtcbiAgICB0aGlzW2Vycm9yUHJvcHNbaWR4XV0gPSB0bXBbZXJyb3JQcm9wc1tpZHhdXTtcbiAgfVxuXG4gIGlmIChsaW5lKSB7XG4gICAgdGhpcy5saW5lTnVtYmVyID0gbGluZTtcbiAgICB0aGlzLmNvbHVtbiA9IG5vZGUuZmlyc3RDb2x1bW47XG4gIH1cbn1cblxuRXhjZXB0aW9uLnByb3RvdHlwZSA9IG5ldyBFcnJvcigpO1xuXG5leHBvcnRzW1wiZGVmYXVsdFwiXSA9IEV4Y2VwdGlvbjsiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBVdGlscyA9IHJlcXVpcmUoXCIuL3V0aWxzXCIpO1xudmFyIEV4Y2VwdGlvbiA9IHJlcXVpcmUoXCIuL2V4Y2VwdGlvblwiKVtcImRlZmF1bHRcIl07XG52YXIgQ09NUElMRVJfUkVWSVNJT04gPSByZXF1aXJlKFwiLi9iYXNlXCIpLkNPTVBJTEVSX1JFVklTSU9OO1xudmFyIFJFVklTSU9OX0NIQU5HRVMgPSByZXF1aXJlKFwiLi9iYXNlXCIpLlJFVklTSU9OX0NIQU5HRVM7XG5cbmZ1bmN0aW9uIGNoZWNrUmV2aXNpb24oY29tcGlsZXJJbmZvKSB7XG4gIHZhciBjb21waWxlclJldmlzaW9uID0gY29tcGlsZXJJbmZvICYmIGNvbXBpbGVySW5mb1swXSB8fCAxLFxuICAgICAgY3VycmVudFJldmlzaW9uID0gQ09NUElMRVJfUkVWSVNJT047XG5cbiAgaWYgKGNvbXBpbGVyUmV2aXNpb24gIT09IGN1cnJlbnRSZXZpc2lvbikge1xuICAgIGlmIChjb21waWxlclJldmlzaW9uIDwgY3VycmVudFJldmlzaW9uKSB7XG4gICAgICB2YXIgcnVudGltZVZlcnNpb25zID0gUkVWSVNJT05fQ0hBTkdFU1tjdXJyZW50UmV2aXNpb25dLFxuICAgICAgICAgIGNvbXBpbGVyVmVyc2lvbnMgPSBSRVZJU0lPTl9DSEFOR0VTW2NvbXBpbGVyUmV2aXNpb25dO1xuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIlRlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGFuIG9sZGVyIHZlcnNpb24gb2YgSGFuZGxlYmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuIFwiK1xuICAgICAgICAgICAgXCJQbGVhc2UgdXBkYXRlIHlvdXIgcHJlY29tcGlsZXIgdG8gYSBuZXdlciB2ZXJzaW9uIChcIitydW50aW1lVmVyc2lvbnMrXCIpIG9yIGRvd25ncmFkZSB5b3VyIHJ1bnRpbWUgdG8gYW4gb2xkZXIgdmVyc2lvbiAoXCIrY29tcGlsZXJWZXJzaW9ucytcIikuXCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBVc2UgdGhlIGVtYmVkZGVkIHZlcnNpb24gaW5mbyBzaW5jZSB0aGUgcnVudGltZSBkb2Vzbid0IGtub3cgYWJvdXQgdGhpcyByZXZpc2lvbiB5ZXRcbiAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oXCJUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhIG5ld2VyIHZlcnNpb24gb2YgSGFuZGxlYmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuIFwiK1xuICAgICAgICAgICAgXCJQbGVhc2UgdXBkYXRlIHlvdXIgcnVudGltZSB0byBhIG5ld2VyIHZlcnNpb24gKFwiK2NvbXBpbGVySW5mb1sxXStcIikuXCIpO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnRzLmNoZWNrUmV2aXNpb24gPSBjaGVja1JldmlzaW9uOy8vIFRPRE86IFJlbW92ZSB0aGlzIGxpbmUgYW5kIGJyZWFrIHVwIGNvbXBpbGVQYXJ0aWFsXG5cbmZ1bmN0aW9uIHRlbXBsYXRlKHRlbXBsYXRlU3BlYywgZW52KSB7XG4gIGlmICghZW52KSB7XG4gICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIk5vIGVudmlyb25tZW50IHBhc3NlZCB0byB0ZW1wbGF0ZVwiKTtcbiAgfVxuXG4gIC8vIE5vdGU6IFVzaW5nIGVudi5WTSByZWZlcmVuY2VzIHJhdGhlciB0aGFuIGxvY2FsIHZhciByZWZlcmVuY2VzIHRocm91Z2hvdXQgdGhpcyBzZWN0aW9uIHRvIGFsbG93XG4gIC8vIGZvciBleHRlcm5hbCB1c2VycyB0byBvdmVycmlkZSB0aGVzZSBhcyBwc3VlZG8tc3VwcG9ydGVkIEFQSXMuXG4gIHZhciBpbnZva2VQYXJ0aWFsV3JhcHBlciA9IGZ1bmN0aW9uKHBhcnRpYWwsIG5hbWUsIGNvbnRleHQsIGhlbHBlcnMsIHBhcnRpYWxzLCBkYXRhKSB7XG4gICAgdmFyIHJlc3VsdCA9IGVudi5WTS5pbnZva2VQYXJ0aWFsLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgaWYgKHJlc3VsdCAhPSBudWxsKSB7IHJldHVybiByZXN1bHQ7IH1cblxuICAgIGlmIChlbnYuY29tcGlsZSkge1xuICAgICAgdmFyIG9wdGlvbnMgPSB7IGhlbHBlcnM6IGhlbHBlcnMsIHBhcnRpYWxzOiBwYXJ0aWFscywgZGF0YTogZGF0YSB9O1xuICAgICAgcGFydGlhbHNbbmFtZV0gPSBlbnYuY29tcGlsZShwYXJ0aWFsLCB7IGRhdGE6IGRhdGEgIT09IHVuZGVmaW5lZCB9LCBlbnYpO1xuICAgICAgcmV0dXJuIHBhcnRpYWxzW25hbWVdKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKFwiVGhlIHBhcnRpYWwgXCIgKyBuYW1lICsgXCIgY291bGQgbm90IGJlIGNvbXBpbGVkIHdoZW4gcnVubmluZyBpbiBydW50aW1lLW9ubHkgbW9kZVwiKTtcbiAgICB9XG4gIH07XG5cbiAgLy8gSnVzdCBhZGQgd2F0ZXJcbiAgdmFyIGNvbnRhaW5lciA9IHtcbiAgICBlc2NhcGVFeHByZXNzaW9uOiBVdGlscy5lc2NhcGVFeHByZXNzaW9uLFxuICAgIGludm9rZVBhcnRpYWw6IGludm9rZVBhcnRpYWxXcmFwcGVyLFxuICAgIHByb2dyYW1zOiBbXSxcbiAgICBwcm9ncmFtOiBmdW5jdGlvbihpLCBmbiwgZGF0YSkge1xuICAgICAgdmFyIHByb2dyYW1XcmFwcGVyID0gdGhpcy5wcm9ncmFtc1tpXTtcbiAgICAgIGlmKGRhdGEpIHtcbiAgICAgICAgcHJvZ3JhbVdyYXBwZXIgPSBwcm9ncmFtKGksIGZuLCBkYXRhKTtcbiAgICAgIH0gZWxzZSBpZiAoIXByb2dyYW1XcmFwcGVyKSB7XG4gICAgICAgIHByb2dyYW1XcmFwcGVyID0gdGhpcy5wcm9ncmFtc1tpXSA9IHByb2dyYW0oaSwgZm4pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHByb2dyYW1XcmFwcGVyO1xuICAgIH0sXG4gICAgbWVyZ2U6IGZ1bmN0aW9uKHBhcmFtLCBjb21tb24pIHtcbiAgICAgIHZhciByZXQgPSBwYXJhbSB8fCBjb21tb247XG5cbiAgICAgIGlmIChwYXJhbSAmJiBjb21tb24gJiYgKHBhcmFtICE9PSBjb21tb24pKSB7XG4gICAgICAgIHJldCA9IHt9O1xuICAgICAgICBVdGlscy5leHRlbmQocmV0LCBjb21tb24pO1xuICAgICAgICBVdGlscy5leHRlbmQocmV0LCBwYXJhbSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmV0O1xuICAgIH0sXG4gICAgcHJvZ3JhbVdpdGhEZXB0aDogZW52LlZNLnByb2dyYW1XaXRoRGVwdGgsXG4gICAgbm9vcDogZW52LlZNLm5vb3AsXG4gICAgY29tcGlsZXJJbmZvOiBudWxsXG4gIH07XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB2YXIgbmFtZXNwYWNlID0gb3B0aW9ucy5wYXJ0aWFsID8gb3B0aW9ucyA6IGVudixcbiAgICAgICAgaGVscGVycyxcbiAgICAgICAgcGFydGlhbHM7XG5cbiAgICBpZiAoIW9wdGlvbnMucGFydGlhbCkge1xuICAgICAgaGVscGVycyA9IG9wdGlvbnMuaGVscGVycztcbiAgICAgIHBhcnRpYWxzID0gb3B0aW9ucy5wYXJ0aWFscztcbiAgICB9XG4gICAgdmFyIHJlc3VsdCA9IHRlbXBsYXRlU3BlYy5jYWxsKFxuICAgICAgICAgIGNvbnRhaW5lcixcbiAgICAgICAgICBuYW1lc3BhY2UsIGNvbnRleHQsXG4gICAgICAgICAgaGVscGVycyxcbiAgICAgICAgICBwYXJ0aWFscyxcbiAgICAgICAgICBvcHRpb25zLmRhdGEpO1xuXG4gICAgaWYgKCFvcHRpb25zLnBhcnRpYWwpIHtcbiAgICAgIGVudi5WTS5jaGVja1JldmlzaW9uKGNvbnRhaW5lci5jb21waWxlckluZm8pO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG59XG5cbmV4cG9ydHMudGVtcGxhdGUgPSB0ZW1wbGF0ZTtmdW5jdGlvbiBwcm9ncmFtV2l0aERlcHRoKGksIGZuLCBkYXRhIC8qLCAkZGVwdGggKi8pIHtcbiAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDMpO1xuXG4gIHZhciBwcm9nID0gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIFtjb250ZXh0LCBvcHRpb25zLmRhdGEgfHwgZGF0YV0uY29uY2F0KGFyZ3MpKTtcbiAgfTtcbiAgcHJvZy5wcm9ncmFtID0gaTtcbiAgcHJvZy5kZXB0aCA9IGFyZ3MubGVuZ3RoO1xuICByZXR1cm4gcHJvZztcbn1cblxuZXhwb3J0cy5wcm9ncmFtV2l0aERlcHRoID0gcHJvZ3JhbVdpdGhEZXB0aDtmdW5jdGlvbiBwcm9ncmFtKGksIGZuLCBkYXRhKSB7XG4gIHZhciBwcm9nID0gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgcmV0dXJuIGZuKGNvbnRleHQsIG9wdGlvbnMuZGF0YSB8fCBkYXRhKTtcbiAgfTtcbiAgcHJvZy5wcm9ncmFtID0gaTtcbiAgcHJvZy5kZXB0aCA9IDA7XG4gIHJldHVybiBwcm9nO1xufVxuXG5leHBvcnRzLnByb2dyYW0gPSBwcm9ncmFtO2Z1bmN0aW9uIGludm9rZVBhcnRpYWwocGFydGlhbCwgbmFtZSwgY29udGV4dCwgaGVscGVycywgcGFydGlhbHMsIGRhdGEpIHtcbiAgdmFyIG9wdGlvbnMgPSB7IHBhcnRpYWw6IHRydWUsIGhlbHBlcnM6IGhlbHBlcnMsIHBhcnRpYWxzOiBwYXJ0aWFscywgZGF0YTogZGF0YSB9O1xuXG4gIGlmKHBhcnRpYWwgPT09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IG5ldyBFeGNlcHRpb24oXCJUaGUgcGFydGlhbCBcIiArIG5hbWUgKyBcIiBjb3VsZCBub3QgYmUgZm91bmRcIik7XG4gIH0gZWxzZSBpZihwYXJ0aWFsIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICByZXR1cm4gcGFydGlhbChjb250ZXh0LCBvcHRpb25zKTtcbiAgfVxufVxuXG5leHBvcnRzLmludm9rZVBhcnRpYWwgPSBpbnZva2VQYXJ0aWFsO2Z1bmN0aW9uIG5vb3AoKSB7IHJldHVybiBcIlwiOyB9XG5cbmV4cG9ydHMubm9vcCA9IG5vb3A7IiwiXCJ1c2Ugc3RyaWN0XCI7XG4vLyBCdWlsZCBvdXQgb3VyIGJhc2ljIFNhZmVTdHJpbmcgdHlwZVxuZnVuY3Rpb24gU2FmZVN0cmluZyhzdHJpbmcpIHtcbiAgdGhpcy5zdHJpbmcgPSBzdHJpbmc7XG59XG5cblNhZmVTdHJpbmcucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBcIlwiICsgdGhpcy5zdHJpbmc7XG59O1xuXG5leHBvcnRzW1wiZGVmYXVsdFwiXSA9IFNhZmVTdHJpbmc7IiwiXCJ1c2Ugc3RyaWN0XCI7XG4vKmpzaGludCAtVzAwNCAqL1xudmFyIFNhZmVTdHJpbmcgPSByZXF1aXJlKFwiLi9zYWZlLXN0cmluZ1wiKVtcImRlZmF1bHRcIl07XG5cbnZhciBlc2NhcGUgPSB7XG4gIFwiJlwiOiBcIiZhbXA7XCIsXG4gIFwiPFwiOiBcIiZsdDtcIixcbiAgXCI+XCI6IFwiJmd0O1wiLFxuICAnXCInOiBcIiZxdW90O1wiLFxuICBcIidcIjogXCImI3gyNztcIixcbiAgXCJgXCI6IFwiJiN4NjA7XCJcbn07XG5cbnZhciBiYWRDaGFycyA9IC9bJjw+XCInYF0vZztcbnZhciBwb3NzaWJsZSA9IC9bJjw+XCInYF0vO1xuXG5mdW5jdGlvbiBlc2NhcGVDaGFyKGNocikge1xuICByZXR1cm4gZXNjYXBlW2Nocl0gfHwgXCImYW1wO1wiO1xufVxuXG5mdW5jdGlvbiBleHRlbmQob2JqLCB2YWx1ZSkge1xuICBmb3IodmFyIGtleSBpbiB2YWx1ZSkge1xuICAgIGlmKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh2YWx1ZSwga2V5KSkge1xuICAgICAgb2JqW2tleV0gPSB2YWx1ZVtrZXldO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnRzLmV4dGVuZCA9IGV4dGVuZDt2YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuZXhwb3J0cy50b1N0cmluZyA9IHRvU3RyaW5nO1xuLy8gU291cmNlZCBmcm9tIGxvZGFzaFxuLy8gaHR0cHM6Ly9naXRodWIuY29tL2Jlc3RpZWpzL2xvZGFzaC9ibG9iL21hc3Rlci9MSUNFTlNFLnR4dFxudmFyIGlzRnVuY3Rpb24gPSBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nO1xufTtcbi8vIGZhbGxiYWNrIGZvciBvbGRlciB2ZXJzaW9ucyBvZiBDaHJvbWUgYW5kIFNhZmFyaVxuaWYgKGlzRnVuY3Rpb24oL3gvKSkge1xuICBpc0Z1bmN0aW9uID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nICYmIHRvU3RyaW5nLmNhbGwodmFsdWUpID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xuICB9O1xufVxudmFyIGlzRnVuY3Rpb247XG5leHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xudmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JykgPyB0b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gJ1tvYmplY3QgQXJyYXldJyA6IGZhbHNlO1xufTtcbmV4cG9ydHMuaXNBcnJheSA9IGlzQXJyYXk7XG5cbmZ1bmN0aW9uIGVzY2FwZUV4cHJlc3Npb24oc3RyaW5nKSB7XG4gIC8vIGRvbid0IGVzY2FwZSBTYWZlU3RyaW5ncywgc2luY2UgdGhleSdyZSBhbHJlYWR5IHNhZmVcbiAgaWYgKHN0cmluZyBpbnN0YW5jZW9mIFNhZmVTdHJpbmcpIHtcbiAgICByZXR1cm4gc3RyaW5nLnRvU3RyaW5nKCk7XG4gIH0gZWxzZSBpZiAoIXN0cmluZyAmJiBzdHJpbmcgIT09IDApIHtcbiAgICByZXR1cm4gXCJcIjtcbiAgfVxuXG4gIC8vIEZvcmNlIGEgc3RyaW5nIGNvbnZlcnNpb24gYXMgdGhpcyB3aWxsIGJlIGRvbmUgYnkgdGhlIGFwcGVuZCByZWdhcmRsZXNzIGFuZFxuICAvLyB0aGUgcmVnZXggdGVzdCB3aWxsIGRvIHRoaXMgdHJhbnNwYXJlbnRseSBiZWhpbmQgdGhlIHNjZW5lcywgY2F1c2luZyBpc3N1ZXMgaWZcbiAgLy8gYW4gb2JqZWN0J3MgdG8gc3RyaW5nIGhhcyBlc2NhcGVkIGNoYXJhY3RlcnMgaW4gaXQuXG4gIHN0cmluZyA9IFwiXCIgKyBzdHJpbmc7XG5cbiAgaWYoIXBvc3NpYmxlLnRlc3Qoc3RyaW5nKSkgeyByZXR1cm4gc3RyaW5nOyB9XG4gIHJldHVybiBzdHJpbmcucmVwbGFjZShiYWRDaGFycywgZXNjYXBlQ2hhcik7XG59XG5cbmV4cG9ydHMuZXNjYXBlRXhwcmVzc2lvbiA9IGVzY2FwZUV4cHJlc3Npb247ZnVuY3Rpb24gaXNFbXB0eSh2YWx1ZSkge1xuICBpZiAoIXZhbHVlICYmIHZhbHVlICE9PSAwKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSBpZiAoaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmV4cG9ydHMuaXNFbXB0eSA9IGlzRW1wdHk7IiwidmFyIGJhc2UgICAgICAgPSByZXF1aXJlKCcuL2xpYi9iYXNlJyk7XG52YXIgU2FmZVN0cmluZyA9IHJlcXVpcmUoJy4vbGliL3NhZmUtc3RyaW5nJyk7XG52YXIgRXhjZXB0aW9uICA9IHJlcXVpcmUoJy4vbGliL2V4Y2VwdGlvbicpO1xudmFyIFV0aWxzICAgICAgPSByZXF1aXJlKCcuL2xpYi91dGlscycpO1xudmFyIHJ1bnRpbWUgICAgPSByZXF1aXJlKCcuL2xpYi9ydW50aW1lJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uIGNyZWF0ZSAoKSB7XG4gIHZhciBkYiA9IG5ldyBiYXNlLkRPTUJhcnNFbnZpcm9ubWVudCgpO1xuXG4gIFV0aWxzLmV4dGVuZChkYiwgYmFzZSk7XG4gIGRiLlZNICAgICAgICAgPSBydW50aW1lO1xuICBkYi5VdGlscyAgICAgID0gVXRpbHM7XG4gIGRiLmNyZWF0ZSAgICAgPSBjcmVhdGU7XG4gIGRiLkV4Y2VwdGlvbiAgPSBFeGNlcHRpb247XG4gIGRiLlNhZmVTdHJpbmcgPSBTYWZlU3RyaW5nO1xuXG4gIGRiLnRlbXBsYXRlID0gZnVuY3Rpb24gKHNwZWMpIHtcbiAgICByZXR1cm4gcnVudGltZS50ZW1wbGF0ZShzcGVjLCBkYik7XG4gIH07XG5cbiAgcmV0dXJuIGRiO1xufSkoKTtcbiJdfQ==
(13)
});
