!function(e){"object"==typeof exports?module.exports=e():"function"==typeof define&&define.amd?define(e):"undefined"!=typeof window?window.DOMBars=e():"undefined"!=typeof global?global.DOMBars=e():"undefined"!=typeof self&&(self.DOMBars=e())}(function(){var define,module,exports;
return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var base = require('handlebars/lib/handlebars/base');

exports.create = function () {
  var DOMBars = base.create.apply(this, arguments);

  /**
   * Noop functions for subscribe and unsubscribe. Implement your own function.
   */
  DOMBars.subscribe = DOMBars.unsubscribe = function () {};

  /**
   * Basic getter function. Attach this however you want it to work.
   *
   * @param  {Object} object
   * @param  {String} property
   * @return {*}
   */
  DOMBars.get = function (object, property) {
    return object[property];
  };

  /**
   * Handlebars `each` helper is incompatibable with DOMBars, since it assumes
   * strings (as opposed to document fragments).
   *
   * @param  {Object} context
   * @param  {Object} options
   * @return {Node}
   */
  DOMBars.registerHelper('each', function (context, options) {
    var fn      = options.fn;
    var inverse = options.inverse;
    var buffer  = document.createDocumentFragment();
    var i       = 0;
    var data;

    if (typeof context === 'function') {
      context = context.call(this);
    }

    if (options.data) {
      data = DOMBars.createFrame(options.data);
    }

    if (typeof context === 'object') {
      var len = context.length;

      if (len === +len) {
        for (; i < len; i++) {
          if (data) { data.index = i; }
          buffer.appendChild(fn(context[i], { data: data }));
        }
      } else {
        for (var key in context) {
          if (context.hasOwnProperty(key)) {
            i += 1;
            if (data) { data.key = key; }
            buffer.appendChild(fn(context[key], { data: data }));
          }
        }
      }
    }

    if (i === 0) {
      return inverse(this);
    }

    return buffer;
  });

  return DOMBars;
};


},{"handlebars/lib/handlebars/base":5}],2:[function(require,module,exports){
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
var runtime = require('handlebars/lib/handlebars/runtime');
var browser = typeof window !== 'undefined';
var raf     = browser && require('raf-component');

/**
 * Attribute runtime features to the DOMBars instance.
 *
 * @param  {Object} DOMBars
 * @return {Object}
 */
exports.attach = function (DOMBars) {
  var VM    = runtime.attach(DOMBars).VM;
  var Utils = DOMBars.Utils;

  /**
   * Bind a function to the animation frame.
   *
   * @param  {Function} fn
   * @return {Number}
   */
  VM.exec = function (fn) {
    return browser ? raf(fn) : setImmediate(fn);
  };

  /**
   * Cancel an execution.
   *
   * @param {Number} id
   */
  VM.exec.cancel = function (id) {
    return browser ? raf.cancel(id) : clearImmediate(id);
  };

  /**
   * Accepts a function that has subscriptions called inside and returns a new
   * function that will listen to all subscriptions and can update with any
   * changes.
   *
   * @param  {Function} fn
   * @return {Function}
   */
  VM.subscribe = function (fn) {
    /**
     * The returned subscription function takes care of aliasing the
     * subscriptions array correctly, subscribing for updates and triggering
     * updates when any of the subscriptions change.
     *
     * @return {*}
     */
    var subscriber = function () {
      var result = subscriber.exec.apply(this, arguments);
      eachSubscription(subscriber.subscriptions, DOMBars.subscribe);
      return result;
    };

    // Keep an array of current subscriptions and an object with references
    // to child subscription functions.
    subscriber.cid      = 'subscriber' + Utils.uniqueId();
    subscriber.children = {};

    /**
     * Trigger this function with every change with the listeners.
     */
    var change = function () {
      // If the triggered flag has been set, don't cause another update.
      if (subscriber.triggered || subscriber.unsubscribed) { return; }

      // Set a triggered flag to avoid multiple triggers. Also unsubscribe any
      // children immediately to stop update clashes.
      subscriber.triggered = true;
      subscriber.unsubscribeChildren();

      subscriber._exec = VM.exec(function () {
        subscriber.beforeUpdate();
        subscriber.update(subscriber.exec());
        subscriber.afterUpdate();
        delete subscriber.triggered;
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
     * Execute the function and return the result.
     *
     * @return {*}
     */
    subscriber.exec = function () {
      // If we have a parent subscriber, link the subscribers together.
      if (VM.subscriber) {
        subscriber.parent = VM.subscriber;
        VM.subscriber.children[subscriber.cid] = subscriber;
      }

      // Alias subscriber functionality to the VM object.
      VM.subscriber  = subscriber;
      VM.unsubscribe = function (fn) {
        subscriber.unsubscriptions.push(fn);
      };

      // Reset subscriptions before execution.
      subscriber.subscriptions   = {};
      subscriber.unsubscriptions = [];

      var result = fn.apply(this, arguments);

      // Reset the VM functionality to what it was beforehand.
      VM.subscriber  = subscriber.parent;
      VM.unsubscribe = null;

      return result;
    };

    /**
     * Run this function before we run an update function. It moves current
     * subscriptions so that we can diff the subscriptions after we update
     * the DOM.
     */
    subscriber.beforeUpdate = function () {
      iteration(subscriber.unsubscriptions);
      subscriber.prevSubscriptions = subscriber.subscriptions;
    };

    /**
     * Run this function after an update. It will check for difference in the
     * before and after updates.
     */
    subscriber.afterUpdate = function () {
      var subscriptions = subscriber.subscriptions;

      // Diff the previous subscriptions and new subscriptions to add/remove
      // listeners as needed. This should be more memory efficient than blindly
      // adding and removing listeners every time.
      for (var property in subscriptions) {
        for (var key in subscriptions[property]) {
          if (!subscriber.prevSubscriptions[property][key]) {
            DOMBars.subscribe(subscriptions[property][key], property, change);
          } else {
            delete subscriber.prevSubscriptions[property][key];
          }
        }
      }

      // Loop over previous subscriptions that no longer exist and unsubscribe.
      eachSubscription(subscriber.prevSubscriptions, DOMBars.unsubscribe);

      delete subscriber.prevSubscriptions;
    };

    /**
     * Remove the current subscriber from all listeners. We also need to cancel
     * any current execution event and remove a reference from the parent
     * subscription.
     */
    subscriber.unsubscribe = function () {
      iteration(subscriber.unsubscriptions);
      eachSubscription(subscriber.subscriptions, DOMBars.unsubscribe);

      if (subscriber.parent) {
        delete subscriber.parent.children[subscriber.cid];
        delete subscriber.parent;
      }

      // Track whether we have been unsubscribed. This is required since the
      // listener could still be triggered at any time even though we expect
      // the external references to be dropped. This could also indicate a
      // potential memory leak with the listener unsusbcription code.
      subscriber.unsubscribed = true;
      VM.exec.cancel(subscriber._exec);
      subscriber.unsubscribeChildren();
    };

    /**
     * Unsubscribe every child of the current subscription.
     */
    subscriber.unsubscribeChildren = function () {
      for (var child in subscriber.children) {
        subscriber.children[child].unsubscribe();
      }
    };

    return subscriber;
  };

  /**
   * Render and subscribe a single DOM node using a custom creation function.
   *
   * @param  {Function} fn
   * @param  {Function} create
   * @return {Node}
   */
  var subscribeNode = function (fn, create) {
    var subscription = VM.subscribe(fn);

    // We need to add a before and after element placeholder since the pieces
    // in between can be enabled and disabled randomly.
    var placeholders = {
      after:  document.createTextNode(''),
      before: document.createTextNode('')
    };

    // Create a function to keep track of document fragment children.
    var generate = function (text) {
      var fragment = document.createDocumentFragment();

      // To keep track of the insertions and deletions accurately we need to
      // add placeholder DOM elements.
      fragment.appendChild(placeholders.before);
      fragment.appendChild(create(text));
      fragment.appendChild(placeholders.after);

      return fragment;
    };

    subscription.update = function (value) {
      var parentNode = placeholders.before.parentNode;
      var childNodes = parentNode.childNodes;

      // Iterate over the child nodes to remove the attached children.
      for (var i = 0; i < parentNode.childNodes.length; i++) {
        // When we find the `before` placeholder node, start removing all
        // the child nodes until we hit the `after` placeholder node.
        if (childNodes[i] === placeholders.before) {
          do {
            parentNode.removeChild(childNodes[i]);
          } while (childNodes[i] !== placeholders.after);

          var nextSibling = placeholders.after.nextSibling;
          parentNode.insertBefore(generate(value), nextSibling);
          break;
        }
      }
    };

    return generate(subscription());
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
  VM.createElement = function (fn, cb) {
    var subscription = VM.subscribe(fn);
    var el           = Utils.createElement(subscription());

    subscription.update = function (value) {
      cb(el = Utils.copyAndReplaceNode(Utils.createElement(value), el));
    };

    return el;
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
  VM.setAttribute = function (elementFn, nameFn, valueFn) {
    var nameSubscription  = VM.subscribe(nameFn);
    var valueSubscription = VM.subscribe(valueFn);

    // Keep track of the current name and value without having to re-run the
    // function every time something changes.
    var attrName  = nameSubscription();
    var attrValue = valueSubscription();

    nameSubscription.update = function (value) {
      Utils.removeAttribute(elementFn(), attrName);
      Utils.setAttribute(elementFn(), attrName = value, attrValue);
    };

    valueSubscription.update = function (value) {
      Utils.setAttribute(elementFn(), attrName, attrValue = value);
    };

    return Utils.setAttribute(elementFn(), attrName, attrValue);
  };

  /**
   * Create a DOM element and subscribe to any changes.
   *
   * @param  {Function} fn
   * @return {Node}
   */
  VM.createDOM = function (fn) {
    return subscribeNode(fn, Utils.domifyExpression);
  };

  /**
   * Create a text node and subscribe to any changes.
   *
   * @param  {Function} fn
   * @return {Text}
   */
  VM.createText = function (fn) {
    return subscribeNode(fn, Utils.textifyExpression);
  };

  /**
   * Create a comment node and subscribe to any changes.
   *
   * @param  {Function} fn
   * @return {Comment}
   */
  VM.createComment = function (fn) {
    var subscription = VM.subscribe(fn);
    var node         = Utils.createComment(subscription());

    subscription.update = function (value) {
      node.textContent = value;
    };

    return node;
  };

  /**
   * Generate an executable template from a template spec.
   *
   * @param  {Object}   templateSpec
   * @return {Function}
   */
  VM.template = DOMBars.template = function (templateSpec) {
    var DOMBars = this;

    /**
     * The container object holds all the functions used by the template spec.
     *
     * @type {Object}
     */
    var container = {
      invokePartial:    VM.invokePartial,
      programs:         [],
      noop:             VM.noop,
      compilerInfo:     null,
      appendChild:      Utils.appendChild,
      createDOM:        VM.createDOM,
      createText:       VM.createText,
      setAttribute:     VM.setAttribute,
      createComment:    VM.createComment,
      createElement:    VM.createElement,
      escapeExpression: Utils.escapeExpression,
      programWithDepth: VM.programWithDepth
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
      var programWrapper = this.programs[i];

      if (data) {
        return VM.program(i, fn, data);
      }

      if (!programWrapper) {
        return this.programs[i] = VM.program(i, fn);
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

      if (param && common) {
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

      return DOMBars.get(object, property);
    };

    /**
     * Return the compiled JavaScript function for execution.
     *
     * @param  {Object} context
     * @param  {Object} options
     * @return {Node}
     */
    return function (context, options) {
      options = options || {};

      // Subscribe to the template spec inside the returned function. This is so
      // that *every* generated DOM template will have a different unsubscribe
      // method.
      var subscriber = VM.subscribe(templateSpec);

      var result = subscriber.call(
        container,
        DOMBars,
        context,
        options.helpers,
        options.partials,
        options.data
      );

      // Attach the current operating context to the VM object for reference
      // within the utility functions.
      VM.context = context;

      // Attach an `unsubscribe` function to the resulting DOM.
      // TODO: Come up with an improved solution.
      result.unsubscribe = subscriber.unsubscribe;

      var compilerInfo     = container.compilerInfo || [];
      var compilerRevision = compilerInfo[0] || 1;
      var currentRevision  = DOMBars.COMPILER_REVISION;

      if (compilerRevision !== currentRevision) {
        if (compilerRevision < currentRevision) {
          var runtimeVersions  = DOMBars.REVISION_CHANGES[currentRevision];
          var compilerVersions = DOMBars.REVISION_CHANGES[compilerRevision];
          throw new Error('Template was precompiled with an older version of ' +
            'DOMBars than the current runtime. Please update your precompiler' +
            ' to a newer version (' + runtimeVersions + ') or downgrade your ' +
            'runtime to an older version (' + compilerVersions + ')');
        }

        throw new Error('Template was precompiled with a newer version of' +
          'DOMBars than the current runtime. Please update your runtime to ' +
          'a newer version (' + compilerInfo[1] + ')');
      }

      VM.context = null;

      return result;
    };
  };

  return DOMBars;
};

},{"handlebars/lib/handlebars/runtime":6,"raf-component":8}],4:[function(require,module,exports){
var utils    = require('handlebars/lib/handlebars/utils');
var events   = require('./compiler/events');
var uniqueId = 0;

/**
 * Attach reusable utility functions to the DOMBars instance.
 *
 * @param  {Object} DOMBars
 * @return {Object}
 */
exports.attach = function (DOMBars) {
  var Utils = utils.attach(DOMBars).Utils;

  // Extend the DOMBars root object with an event emitter.
  DOMBars.Utils.extend(DOMBars, events);

  /**
   * Simple function wrapper that will emit the event with the result of the
   * function execution every time the function is run.
   *
   * @param  {Function} fn
   * @param  {String}   event
   * @return {Function}
   */
  var emitter = function (fn, event) {
    return function () {
      var result = fn.apply(this, arguments);
      DOMBars.emit(event, result);
      return result;
    };
  };

  /**
   * Return a unique id.
   *
   * @return {Number}
   */
  Utils.uniqueId = function () {
    return uniqueId++;
  };

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
   * Create an element from a tag name.
   *
   * @param  {String} tagName
   * @return {Node}
   */
  Utils.createElement = emitter(function (tagName) {
    return document.createElement(tagName);
  }, 'createElement');

  /**
   * Create a comment node based on text contents.
   *
   * @param  {String} contents
   * @return {Node}
   */
  Utils.createComment = emitter(function (contents) {
    return document.createComment(contents);
  }, 'createComment');

  /**
   * Copy all significant data from one element node to another.
   *
   * @param  {Node} newNode
   * @param  {Node} oldNode
   * @return {Node}
   */
  Utils.copyNode = function (newNode, oldNode) {
    // Move all child elements to the new node.
    while (oldNode.firstChild) {
      newNode.appendChild(oldNode.firstChild);
    }

    // Copy all the attributes to the new node.
    for (var i = 0; i < oldNode.attributes.length; i++) {
      var attribute = oldNode.attributes[i];
      Utils.setAttribute(newNode, attribute.name, attribute.value);
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
  Utils.copyAndReplaceNode = function (newNode, oldNode) {
    oldNode.parentNode.replaceChild(Utils.copyNode(newNode, oldNode), oldNode);
    return newNode;
  };

  /**
   * Set an attribute value on an element.
   *
   * @param {Node}   element
   * @param {String} name
   * @param {*}      value
   */
  Utils.setAttribute = function (element, name, value) {
    if (value === false) {
      return Utils.removeAttribute(element, name);
    }

    DOMBars.emit('setAttribute', element, name, value);
    element.setAttribute(name, value);
  };

  /**
   * Remove an attribute from an element.
   *
   * @param {Node}   element
   * @param {String} name
   */
  Utils.removeAttribute = function (element, name) {
    if (element.hasAttribute(name)) {
      DOMBars.emit('removeAttribute', element, name);
      element.removeAttribute(name);
    }
  };

  /**
   * Append a child element to a DOM node.
   *
   * @param {Node} parent
   * @param {Node} child
   */
  Utils.appendChild = function (parent, child) {
    if (child == null) { return; }

    parent.appendChild(child);
    DOMBars.emit('appendChild', parent, child);
  };

  /**
   * Transform a string into arbitrary DOM nodes.
   *
   * @param  {String} string
   * @return {Node}
   */
  Utils.domifyExpression = emitter(function (string) {
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
  }, 'domify');

  /**
   * Transform a string into a DOM text node for appending to the template.
   *
   * @param  {String} string
   * @return {Text}
   */
  Utils.textifyExpression = emitter(function (string) {
    if (string instanceof DOMBars.SafeString) {
      return Utils.domifyExpression(string.toString());
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
  }, 'textify');

  return DOMBars;
};

},{"./compiler/events":2,"handlebars/lib/handlebars/utils":7}],5:[function(require,module,exports){
/*jshint eqnull: true */

module.exports.create = function() {

var Handlebars = {};

// BEGIN(BROWSER)

Handlebars.VERSION = "1.0.0";
Handlebars.COMPILER_REVISION = 4;

Handlebars.REVISION_CHANGES = {
  1: '<= 1.0.rc.2', // 1.0.rc.2 is actually rev2 but doesn't report it
  2: '== 1.0.0-rc.3',
  3: '== 1.0.0-rc.4',
  4: '>= 1.0.0'
};

Handlebars.helpers  = {};
Handlebars.partials = {};

var toString = Object.prototype.toString,
    functionType = '[object Function]',
    objectType = '[object Object]';

Handlebars.registerHelper = function(name, fn, inverse) {
  if (toString.call(name) === objectType) {
    if (inverse || fn) { throw new Handlebars.Exception('Arg not supported with multiple helpers'); }
    Handlebars.Utils.extend(this.helpers, name);
  } else {
    if (inverse) { fn.not = inverse; }
    this.helpers[name] = fn;
  }
};

Handlebars.registerPartial = function(name, str) {
  if (toString.call(name) === objectType) {
    Handlebars.Utils.extend(this.partials,  name);
  } else {
    this.partials[name] = str;
  }
};

Handlebars.registerHelper('helperMissing', function(arg) {
  if(arguments.length === 2) {
    return undefined;
  } else {
    throw new Error("Missing helper: '" + arg + "'");
  }
});

Handlebars.registerHelper('blockHelperMissing', function(context, options) {
  var inverse = options.inverse || function() {}, fn = options.fn;

  var type = toString.call(context);

  if(type === functionType) { context = context.call(this); }

  if(context === true) {
    return fn(this);
  } else if(context === false || context == null) {
    return inverse(this);
  } else if(type === "[object Array]") {
    if(context.length > 0) {
      return Handlebars.helpers.each(context, options);
    } else {
      return inverse(this);
    }
  } else {
    return fn(context);
  }
});

Handlebars.K = function() {};

Handlebars.createFrame = Object.create || function(object) {
  Handlebars.K.prototype = object;
  var obj = new Handlebars.K();
  Handlebars.K.prototype = null;
  return obj;
};

Handlebars.logger = {
  DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, level: 3,

  methodMap: {0: 'debug', 1: 'info', 2: 'warn', 3: 'error'},

  // can be overridden in the host environment
  log: function(level, obj) {
    if (Handlebars.logger.level <= level) {
      var method = Handlebars.logger.methodMap[level];
      if (typeof console !== 'undefined' && console[method]) {
        console[method].call(console, obj);
      }
    }
  }
};

Handlebars.log = function(level, obj) { Handlebars.logger.log(level, obj); };

Handlebars.registerHelper('each', function(context, options) {
  var fn = options.fn, inverse = options.inverse;
  var i = 0, ret = "", data;

  var type = toString.call(context);
  if(type === functionType) { context = context.call(this); }

  if (options.data) {
    data = Handlebars.createFrame(options.data);
  }

  if(context && typeof context === 'object') {
    if(context instanceof Array){
      for(var j = context.length; i<j; i++) {
        if (data) { data.index = i; }
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

Handlebars.registerHelper('if', function(conditional, options) {
  var type = toString.call(conditional);
  if(type === functionType) { conditional = conditional.call(this); }

  if(!conditional || Handlebars.Utils.isEmpty(conditional)) {
    return options.inverse(this);
  } else {
    return options.fn(this);
  }
});

Handlebars.registerHelper('unless', function(conditional, options) {
  return Handlebars.helpers['if'].call(this, conditional, {fn: options.inverse, inverse: options.fn});
});

Handlebars.registerHelper('with', function(context, options) {
  var type = toString.call(context);
  if(type === functionType) { context = context.call(this); }

  if (!Handlebars.Utils.isEmpty(context)) return options.fn(context);
});

Handlebars.registerHelper('log', function(context, options) {
  var level = options.data && options.data.level != null ? parseInt(options.data.level, 10) : 1;
  Handlebars.log(level, context);
});

// END(BROWSER)

return Handlebars;
};

},{}],6:[function(require,module,exports){
exports.attach = function(Handlebars) {

// BEGIN(BROWSER)

Handlebars.VM = {
  template: function(templateSpec) {
    // Just add water
    var container = {
      escapeExpression: Handlebars.Utils.escapeExpression,
      invokePartial: Handlebars.VM.invokePartial,
      programs: [],
      program: function(i, fn, data) {
        var programWrapper = this.programs[i];
        if(data) {
          programWrapper = Handlebars.VM.program(i, fn, data);
        } else if (!programWrapper) {
          programWrapper = this.programs[i] = Handlebars.VM.program(i, fn);
        }
        return programWrapper;
      },
      merge: function(param, common) {
        var ret = param || common;

        if (param && common) {
          ret = {};
          Handlebars.Utils.extend(ret, common);
          Handlebars.Utils.extend(ret, param);
        }
        return ret;
      },
      programWithDepth: Handlebars.VM.programWithDepth,
      noop: Handlebars.VM.noop,
      compilerInfo: null
    };

    return function(context, options) {
      options = options || {};
      var result = templateSpec.call(container, Handlebars, context, options.helpers, options.partials, options.data);

      var compilerInfo = container.compilerInfo || [],
          compilerRevision = compilerInfo[0] || 1,
          currentRevision = Handlebars.COMPILER_REVISION;

      if (compilerRevision !== currentRevision) {
        if (compilerRevision < currentRevision) {
          var runtimeVersions = Handlebars.REVISION_CHANGES[currentRevision],
              compilerVersions = Handlebars.REVISION_CHANGES[compilerRevision];
          throw "Template was precompiled with an older version of Handlebars than the current runtime. "+
                "Please update your precompiler to a newer version ("+runtimeVersions+") or downgrade your runtime to an older version ("+compilerVersions+").";
        } else {
          // Use the embedded version info since the runtime doesn't know about this revision yet
          throw "Template was precompiled with a newer version of Handlebars than the current runtime. "+
                "Please update your runtime to a newer version ("+compilerInfo[1]+").";
        }
      }

      return result;
    };
  },

  programWithDepth: function(i, fn, data /*, $depth */) {
    var args = Array.prototype.slice.call(arguments, 3);

    var program = function(context, options) {
      options = options || {};

      return fn.apply(this, [context, options.data || data].concat(args));
    };
    program.program = i;
    program.depth = args.length;
    return program;
  },
  program: function(i, fn, data) {
    var program = function(context, options) {
      options = options || {};

      return fn(context, options.data || data);
    };
    program.program = i;
    program.depth = 0;
    return program;
  },
  noop: function() { return ""; },
  invokePartial: function(partial, name, context, helpers, partials, data) {
    var options = { helpers: helpers, partials: partials, data: data };

    if(partial === undefined) {
      throw new Handlebars.Exception("The partial " + name + " could not be found");
    } else if(partial instanceof Function) {
      return partial(context, options);
    } else if (!Handlebars.compile) {
      throw new Handlebars.Exception("The partial " + name + " could not be compiled when running in runtime-only mode");
    } else {
      partials[name] = Handlebars.compile(partial, {data: data !== undefined});
      return partials[name](context, options);
    }
  }
};

Handlebars.template = Handlebars.VM.template;

// END(BROWSER)

return Handlebars;

};

},{}],7:[function(require,module,exports){
exports.attach = function(Handlebars) {

var toString = Object.prototype.toString;

// BEGIN(BROWSER)

var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

Handlebars.Exception = function(message) {
  var tmp = Error.prototype.constructor.apply(this, arguments);

  // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
  for (var idx = 0; idx < errorProps.length; idx++) {
    this[errorProps[idx]] = tmp[errorProps[idx]];
  }
};
Handlebars.Exception.prototype = new Error();

// Build out our basic SafeString type
Handlebars.SafeString = function(string) {
  this.string = string;
};
Handlebars.SafeString.prototype.toString = function() {
  return this.string.toString();
};

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

var escapeChar = function(chr) {
  return escape[chr] || "&amp;";
};

Handlebars.Utils = {
  extend: function(obj, value) {
    for(var key in value) {
      if(value.hasOwnProperty(key)) {
        obj[key] = value[key];
      }
    }
  },

  escapeExpression: function(string) {
    // don't escape SafeStrings, since they're already safe
    if (string instanceof Handlebars.SafeString) {
      return string.toString();
    } else if (string == null || string === false) {
      return "";
    }

    // Force a string conversion as this will be done by the append regardless and
    // the regex test will do this transparently behind the scenes, causing issues if
    // an object's to string has escaped characters in it.
    string = string.toString();

    if(!possible.test(string)) { return string; }
    return string.replace(badChars, escapeChar);
  },

  isEmpty: function(value) {
    if (!value && value !== 0) {
      return true;
    } else if(toString.call(value) === "[object Array]" && value.length === 0) {
      return true;
    } else {
      return false;
    }
  }
};

// END(BROWSER)

return Handlebars;
};

},{}],8:[function(require,module,exports){
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

},{}],9:[function(require,module,exports){
var base     = require('./lib/base');
var utils    = require('./lib/utils');
var runtime  = require('./lib/runtime');

/**
 * Generate the base DOMBars object.
 *
 * @return {Object}
 */
module.exports = (function create () {
  var DOMBars = base.create();

  utils.attach(DOMBars);
  runtime.attach(DOMBars);

  DOMBars.create = create;

  return DOMBars;
})();

},{"./lib/base":1,"./lib/runtime":3,"./lib/utils":4}]},{},[9])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvYmFzZS5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi9jb21waWxlci9ldmVudHMuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvcnVudGltZS5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi91dGlscy5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2Jhc2UuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9ydW50aW1lLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvdXRpbHMuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvcmFmLWNvbXBvbmVudC9pbmRleC5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL3J1bnRpbWUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1ZUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbInZhciBiYXNlID0gcmVxdWlyZSgnaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9iYXNlJyk7XG5cbmV4cG9ydHMuY3JlYXRlID0gZnVuY3Rpb24gKCkge1xuICB2YXIgRE9NQmFycyA9IGJhc2UuY3JlYXRlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgLyoqXG4gICAqIE5vb3AgZnVuY3Rpb25zIGZvciBzdWJzY3JpYmUgYW5kIHVuc3Vic2NyaWJlLiBJbXBsZW1lbnQgeW91ciBvd24gZnVuY3Rpb24uXG4gICAqL1xuICBET01CYXJzLnN1YnNjcmliZSA9IERPTUJhcnMudW5zdWJzY3JpYmUgPSBmdW5jdGlvbiAoKSB7fTtcblxuICAvKipcbiAgICogQmFzaWMgZ2V0dGVyIGZ1bmN0aW9uLiBBdHRhY2ggdGhpcyBob3dldmVyIHlvdSB3YW50IGl0IHRvIHdvcmsuXG4gICAqXG4gICAqIEBwYXJhbSAge09iamVjdH0gb2JqZWN0XG4gICAqIEBwYXJhbSAge1N0cmluZ30gcHJvcGVydHlcbiAgICogQHJldHVybiB7Kn1cbiAgICovXG4gIERPTUJhcnMuZ2V0ID0gZnVuY3Rpb24gKG9iamVjdCwgcHJvcGVydHkpIHtcbiAgICByZXR1cm4gb2JqZWN0W3Byb3BlcnR5XTtcbiAgfTtcblxuICAvKipcbiAgICogSGFuZGxlYmFycyBgZWFjaGAgaGVscGVyIGlzIGluY29tcGF0aWJhYmxlIHdpdGggRE9NQmFycywgc2luY2UgaXQgYXNzdW1lc1xuICAgKiBzdHJpbmdzIChhcyBvcHBvc2VkIHRvIGRvY3VtZW50IGZyYWdtZW50cykuXG4gICAqXG4gICAqIEBwYXJhbSAge09iamVjdH0gY29udGV4dFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IG9wdGlvbnNcbiAgICogQHJldHVybiB7Tm9kZX1cbiAgICovXG4gIERPTUJhcnMucmVnaXN0ZXJIZWxwZXIoJ2VhY2gnLCBmdW5jdGlvbiAoY29udGV4dCwgb3B0aW9ucykge1xuICAgIHZhciBmbiAgICAgID0gb3B0aW9ucy5mbjtcbiAgICB2YXIgaW52ZXJzZSA9IG9wdGlvbnMuaW52ZXJzZTtcbiAgICB2YXIgYnVmZmVyICA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICB2YXIgaSAgICAgICA9IDA7XG4gICAgdmFyIGRhdGE7XG5cbiAgICBpZiAodHlwZW9mIGNvbnRleHQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMuZGF0YSkge1xuICAgICAgZGF0YSA9IERPTUJhcnMuY3JlYXRlRnJhbWUob3B0aW9ucy5kYXRhKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGNvbnRleHQgPT09ICdvYmplY3QnKSB7XG4gICAgICB2YXIgbGVuID0gY29udGV4dC5sZW5ndGg7XG5cbiAgICAgIGlmIChsZW4gPT09ICtsZW4pIHtcbiAgICAgICAgZm9yICg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgIGlmIChkYXRhKSB7IGRhdGEuaW5kZXggPSBpOyB9XG4gICAgICAgICAgYnVmZmVyLmFwcGVuZENoaWxkKGZuKGNvbnRleHRbaV0sIHsgZGF0YTogZGF0YSB9KSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBjb250ZXh0KSB7XG4gICAgICAgICAgaWYgKGNvbnRleHQuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgaWYgKGRhdGEpIHsgZGF0YS5rZXkgPSBrZXk7IH1cbiAgICAgICAgICAgIGJ1ZmZlci5hcHBlbmRDaGlsZChmbihjb250ZXh0W2tleV0sIHsgZGF0YTogZGF0YSB9KSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGkgPT09IDApIHtcbiAgICAgIHJldHVybiBpbnZlcnNlKHRoaXMpO1xuICAgIH1cblxuICAgIHJldHVybiBidWZmZXI7XG4gIH0pO1xuXG4gIHJldHVybiBET01CYXJzO1xufTtcblxuIiwidmFyIEV2ZW50cyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8qKlxuICogTGlzdGVuIHRvIGFueSBldmVudHMgdHJpZ2dlcmVkLlxuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gICBuYW1lXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAqIEBwYXJhbSAge09iamVjdH0gICBjb250ZXh0XG4gKiBAcmV0dXJuIHtFdmVudHN9XG4gKi9cbkV2ZW50cy5vbiA9IGZ1bmN0aW9uIChuYW1lLCBmbiwgY29udGV4dCkge1xuICB0aGlzLl9ldmVudHMgfHwgKHRoaXMuX2V2ZW50cyA9IHt9KTtcbiAgdmFyIGV2ZW50cyA9IHRoaXMuX2V2ZW50c1tuYW1lXSB8fCAodGhpcy5fZXZlbnRzW25hbWVdID0gW10pO1xuICBldmVudHMucHVzaCh7IGZuOiBmbiwgY29udGV4dDogY29udGV4dCB9KTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIExpc3RlbiB0byBhbnkgZXZlbnRzIHRyaWdnZXJlZCBvbmNlLlxuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gICBuYW1lXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAqIEBwYXJhbSAge09iamVjdH0gICBjb250ZXh0XG4gKiBAcmV0dXJuIHtFdmVudHN9XG4gKi9cbkV2ZW50cy5vbmNlID0gZnVuY3Rpb24gKG5hbWUsIGZuLCBjb250ZXh0KSB7XG4gIHZhciB0aGF0ID0gdGhpcztcblxuICByZXR1cm4gdGhpcy5vbihuYW1lLCBmdW5jdGlvbiBzZWxmICgpIHtcbiAgICB0aGF0Lm9mZihuYW1lLCBzZWxmKTtcbiAgICBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9LCBjb250ZXh0KTtcbn07XG5cbi8qKlxuICogUmVtb3ZlIGFuIGV2ZW50IGxpc3RlbmVyLlxuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gICBuYW1lXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAqIEBwYXJhbSAge09iamVjdH0gICBjb250ZXh0XG4gKiBAcmV0dXJuIHtFdmVudHN9XG4gKi9cbkV2ZW50cy5vZmYgPSBmdW5jdGlvbiAobmFtZSwgZm4sIGNvbnRleHQpIHtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1tuYW1lXSkge1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgaWYgKCFuYW1lKSB7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzO1xuICAgIH0gZWxzZSB7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW25hbWVdO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgdmFyIGV2ZW50cyA9IHRoaXMuX2V2ZW50c1tuYW1lXTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBldmVudHMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoZXZlbnRzW2ldLmZuID09PSBmbikge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIgfHwgZXZlbnRzW2ldLmNvbnRleHQgPT09IGNvbnRleHQpIHtcbiAgICAgICAgZXZlbnRzLnNwbGljZShpLCAxKTtcbiAgICAgICAgaS0tO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmICghZXZlbnRzLmxlbmd0aCkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbbmFtZV07XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogRW1pdCBhbiBldmVudC5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSAgeyp9ICAgICAgLi4uXG4gKiBAcmV0dXJuIHtFdmVudHN9XG4gKi9cbkV2ZW50cy5lbWl0ID0gZnVuY3Rpb24gKG5hbWUgLyosIC4uLmFyZ3MgKi8pIHtcbiAgdmFyIGFyZ3MgICA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHMgJiYgdGhpcy5fZXZlbnRzW25hbWVdICYmIHRoaXMuX2V2ZW50c1tuYW1lXS5zbGljZSgpO1xuXG4gIGlmIChldmVudHMpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGV2ZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgZXZlbnRzW2ldLmZuLmFwcGx5KGV2ZW50c1tpXS5jb250ZXh0LCBhcmdzKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG4iLCJ2YXIgcnVudGltZSA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvcnVudGltZScpO1xudmFyIGJyb3dzZXIgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJztcbnZhciByYWYgICAgID0gYnJvd3NlciAmJiByZXF1aXJlKCdyYWYtY29tcG9uZW50Jyk7XG5cbi8qKlxuICogQXR0cmlidXRlIHJ1bnRpbWUgZmVhdHVyZXMgdG8gdGhlIERPTUJhcnMgaW5zdGFuY2UuXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSBET01CYXJzXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cbmV4cG9ydHMuYXR0YWNoID0gZnVuY3Rpb24gKERPTUJhcnMpIHtcbiAgdmFyIFZNICAgID0gcnVudGltZS5hdHRhY2goRE9NQmFycykuVk07XG4gIHZhciBVdGlscyA9IERPTUJhcnMuVXRpbHM7XG5cbiAgLyoqXG4gICAqIEJpbmQgYSBmdW5jdGlvbiB0byB0aGUgYW5pbWF0aW9uIGZyYW1lLlxuICAgKlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAgICogQHJldHVybiB7TnVtYmVyfVxuICAgKi9cbiAgVk0uZXhlYyA9IGZ1bmN0aW9uIChmbikge1xuICAgIHJldHVybiBicm93c2VyID8gcmFmKGZuKSA6IHNldEltbWVkaWF0ZShmbik7XG4gIH07XG5cbiAgLyoqXG4gICAqIENhbmNlbCBhbiBleGVjdXRpb24uXG4gICAqXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBpZFxuICAgKi9cbiAgVk0uZXhlYy5jYW5jZWwgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICByZXR1cm4gYnJvd3NlciA/IHJhZi5jYW5jZWwoaWQpIDogY2xlYXJJbW1lZGlhdGUoaWQpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBBY2NlcHRzIGEgZnVuY3Rpb24gdGhhdCBoYXMgc3Vic2NyaXB0aW9ucyBjYWxsZWQgaW5zaWRlIGFuZCByZXR1cm5zIGEgbmV3XG4gICAqIGZ1bmN0aW9uIHRoYXQgd2lsbCBsaXN0ZW4gdG8gYWxsIHN1YnNjcmlwdGlvbnMgYW5kIGNhbiB1cGRhdGUgd2l0aCBhbnlcbiAgICogY2hhbmdlcy5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gICAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICAgKi9cbiAgVk0uc3Vic2NyaWJlID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgLyoqXG4gICAgICogVGhlIHJldHVybmVkIHN1YnNjcmlwdGlvbiBmdW5jdGlvbiB0YWtlcyBjYXJlIG9mIGFsaWFzaW5nIHRoZVxuICAgICAqIHN1YnNjcmlwdGlvbnMgYXJyYXkgY29ycmVjdGx5LCBzdWJzY3JpYmluZyBmb3IgdXBkYXRlcyBhbmQgdHJpZ2dlcmluZ1xuICAgICAqIHVwZGF0ZXMgd2hlbiBhbnkgb2YgdGhlIHN1YnNjcmlwdGlvbnMgY2hhbmdlLlxuICAgICAqXG4gICAgICogQHJldHVybiB7Kn1cbiAgICAgKi9cbiAgICB2YXIgc3Vic2NyaWJlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciByZXN1bHQgPSBzdWJzY3JpYmVyLmV4ZWMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIGVhY2hTdWJzY3JpcHRpb24oc3Vic2NyaWJlci5zdWJzY3JpcHRpb25zLCBET01CYXJzLnN1YnNjcmliZSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG5cbiAgICAvLyBLZWVwIGFuIGFycmF5IG9mIGN1cnJlbnQgc3Vic2NyaXB0aW9ucyBhbmQgYW4gb2JqZWN0IHdpdGggcmVmZXJlbmNlc1xuICAgIC8vIHRvIGNoaWxkIHN1YnNjcmlwdGlvbiBmdW5jdGlvbnMuXG4gICAgc3Vic2NyaWJlci5jaWQgICAgICA9ICdzdWJzY3JpYmVyJyArIFV0aWxzLnVuaXF1ZUlkKCk7XG4gICAgc3Vic2NyaWJlci5jaGlsZHJlbiA9IHt9O1xuXG4gICAgLyoqXG4gICAgICogVHJpZ2dlciB0aGlzIGZ1bmN0aW9uIHdpdGggZXZlcnkgY2hhbmdlIHdpdGggdGhlIGxpc3RlbmVycy5cbiAgICAgKi9cbiAgICB2YXIgY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgLy8gSWYgdGhlIHRyaWdnZXJlZCBmbGFnIGhhcyBiZWVuIHNldCwgZG9uJ3QgY2F1c2UgYW5vdGhlciB1cGRhdGUuXG4gICAgICBpZiAoc3Vic2NyaWJlci50cmlnZ2VyZWQgfHwgc3Vic2NyaWJlci51bnN1YnNjcmliZWQpIHsgcmV0dXJuOyB9XG5cbiAgICAgIC8vIFNldCBhIHRyaWdnZXJlZCBmbGFnIHRvIGF2b2lkIG11bHRpcGxlIHRyaWdnZXJzLiBBbHNvIHVuc3Vic2NyaWJlIGFueVxuICAgICAgLy8gY2hpbGRyZW4gaW1tZWRpYXRlbHkgdG8gc3RvcCB1cGRhdGUgY2xhc2hlcy5cbiAgICAgIHN1YnNjcmliZXIudHJpZ2dlcmVkID0gdHJ1ZTtcbiAgICAgIHN1YnNjcmliZXIudW5zdWJzY3JpYmVDaGlsZHJlbigpO1xuXG4gICAgICBzdWJzY3JpYmVyLl9leGVjID0gVk0uZXhlYyhmdW5jdGlvbiAoKSB7XG4gICAgICAgIHN1YnNjcmliZXIuYmVmb3JlVXBkYXRlKCk7XG4gICAgICAgIHN1YnNjcmliZXIudXBkYXRlKHN1YnNjcmliZXIuZXhlYygpKTtcbiAgICAgICAgc3Vic2NyaWJlci5hZnRlclVwZGF0ZSgpO1xuICAgICAgICBkZWxldGUgc3Vic2NyaWJlci50cmlnZ2VyZWQ7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogSXRlcmF0ZSBvdmVyIGEgc3Vic2NyaXB0aW9ucyBvYmplY3QgYW5kIHVuc3Vic2NyaWJlIGV2ZXJ5dGhpbmcuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBzdWJzY3JpcHRpb25zXG4gICAgICovXG4gICAgdmFyIGVhY2hTdWJzY3JpcHRpb24gPSBmdW5jdGlvbiAoc3Vic2NyaXB0aW9ucywgZm4pIHtcbiAgICAgIGZvciAodmFyIHByb3BlcnR5IGluIHN1YnNjcmlwdGlvbnMpIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHN1YnNjcmlwdGlvbnNbcHJvcGVydHldKSB7XG4gICAgICAgICAgZm4oc3Vic2NyaXB0aW9uc1twcm9wZXJ0eV1ba2V5XSwgcHJvcGVydHksIGNoYW5nZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogSXRlcmF0ZSBvdmVyIGFuIGFycmF5IG9mIGZ1bmN0aW9ucyBhbmQgZXhlY3V0ZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHN1YnNjcmlwdGlvbnNcbiAgICAgKi9cbiAgICB2YXIgaXRlcmF0aW9uID0gZnVuY3Rpb24gKHN1YnNjcmlwdGlvbnMpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3Vic2NyaXB0aW9ucy5sZW5ndGg7IGkrKykge1xuICAgICAgICBzdWJzY3JpcHRpb25zW2ldKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEV4ZWN1dGUgdGhlIGZ1bmN0aW9uIGFuZCByZXR1cm4gdGhlIHJlc3VsdC5cbiAgICAgKlxuICAgICAqIEByZXR1cm4geyp9XG4gICAgICovXG4gICAgc3Vic2NyaWJlci5leGVjID0gZnVuY3Rpb24gKCkge1xuICAgICAgLy8gSWYgd2UgaGF2ZSBhIHBhcmVudCBzdWJzY3JpYmVyLCBsaW5rIHRoZSBzdWJzY3JpYmVycyB0b2dldGhlci5cbiAgICAgIGlmIChWTS5zdWJzY3JpYmVyKSB7XG4gICAgICAgIHN1YnNjcmliZXIucGFyZW50ID0gVk0uc3Vic2NyaWJlcjtcbiAgICAgICAgVk0uc3Vic2NyaWJlci5jaGlsZHJlbltzdWJzY3JpYmVyLmNpZF0gPSBzdWJzY3JpYmVyO1xuICAgICAgfVxuXG4gICAgICAvLyBBbGlhcyBzdWJzY3JpYmVyIGZ1bmN0aW9uYWxpdHkgdG8gdGhlIFZNIG9iamVjdC5cbiAgICAgIFZNLnN1YnNjcmliZXIgID0gc3Vic2NyaWJlcjtcbiAgICAgIFZNLnVuc3Vic2NyaWJlID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgIHN1YnNjcmliZXIudW5zdWJzY3JpcHRpb25zLnB1c2goZm4pO1xuICAgICAgfTtcblxuICAgICAgLy8gUmVzZXQgc3Vic2NyaXB0aW9ucyBiZWZvcmUgZXhlY3V0aW9uLlxuICAgICAgc3Vic2NyaWJlci5zdWJzY3JpcHRpb25zICAgPSB7fTtcbiAgICAgIHN1YnNjcmliZXIudW5zdWJzY3JpcHRpb25zID0gW107XG5cbiAgICAgIHZhciByZXN1bHQgPSBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgICAvLyBSZXNldCB0aGUgVk0gZnVuY3Rpb25hbGl0eSB0byB3aGF0IGl0IHdhcyBiZWZvcmVoYW5kLlxuICAgICAgVk0uc3Vic2NyaWJlciAgPSBzdWJzY3JpYmVyLnBhcmVudDtcbiAgICAgIFZNLnVuc3Vic2NyaWJlID0gbnVsbDtcblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUnVuIHRoaXMgZnVuY3Rpb24gYmVmb3JlIHdlIHJ1biBhbiB1cGRhdGUgZnVuY3Rpb24uIEl0IG1vdmVzIGN1cnJlbnRcbiAgICAgKiBzdWJzY3JpcHRpb25zIHNvIHRoYXQgd2UgY2FuIGRpZmYgdGhlIHN1YnNjcmlwdGlvbnMgYWZ0ZXIgd2UgdXBkYXRlXG4gICAgICogdGhlIERPTS5cbiAgICAgKi9cbiAgICBzdWJzY3JpYmVyLmJlZm9yZVVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGl0ZXJhdGlvbihzdWJzY3JpYmVyLnVuc3Vic2NyaXB0aW9ucyk7XG4gICAgICBzdWJzY3JpYmVyLnByZXZTdWJzY3JpcHRpb25zID0gc3Vic2NyaWJlci5zdWJzY3JpcHRpb25zO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSdW4gdGhpcyBmdW5jdGlvbiBhZnRlciBhbiB1cGRhdGUuIEl0IHdpbGwgY2hlY2sgZm9yIGRpZmZlcmVuY2UgaW4gdGhlXG4gICAgICogYmVmb3JlIGFuZCBhZnRlciB1cGRhdGVzLlxuICAgICAqL1xuICAgIHN1YnNjcmliZXIuYWZ0ZXJVcGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgc3Vic2NyaXB0aW9ucyA9IHN1YnNjcmliZXIuc3Vic2NyaXB0aW9ucztcblxuICAgICAgLy8gRGlmZiB0aGUgcHJldmlvdXMgc3Vic2NyaXB0aW9ucyBhbmQgbmV3IHN1YnNjcmlwdGlvbnMgdG8gYWRkL3JlbW92ZVxuICAgICAgLy8gbGlzdGVuZXJzIGFzIG5lZWRlZC4gVGhpcyBzaG91bGQgYmUgbW9yZSBtZW1vcnkgZWZmaWNpZW50IHRoYW4gYmxpbmRseVxuICAgICAgLy8gYWRkaW5nIGFuZCByZW1vdmluZyBsaXN0ZW5lcnMgZXZlcnkgdGltZS5cbiAgICAgIGZvciAodmFyIHByb3BlcnR5IGluIHN1YnNjcmlwdGlvbnMpIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHN1YnNjcmlwdGlvbnNbcHJvcGVydHldKSB7XG4gICAgICAgICAgaWYgKCFzdWJzY3JpYmVyLnByZXZTdWJzY3JpcHRpb25zW3Byb3BlcnR5XVtrZXldKSB7XG4gICAgICAgICAgICBET01CYXJzLnN1YnNjcmliZShzdWJzY3JpcHRpb25zW3Byb3BlcnR5XVtrZXldLCBwcm9wZXJ0eSwgY2hhbmdlKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZGVsZXRlIHN1YnNjcmliZXIucHJldlN1YnNjcmlwdGlvbnNbcHJvcGVydHldW2tleV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIExvb3Agb3ZlciBwcmV2aW91cyBzdWJzY3JpcHRpb25zIHRoYXQgbm8gbG9uZ2VyIGV4aXN0IGFuZCB1bnN1YnNjcmliZS5cbiAgICAgIGVhY2hTdWJzY3JpcHRpb24oc3Vic2NyaWJlci5wcmV2U3Vic2NyaXB0aW9ucywgRE9NQmFycy51bnN1YnNjcmliZSk7XG5cbiAgICAgIGRlbGV0ZSBzdWJzY3JpYmVyLnByZXZTdWJzY3JpcHRpb25zO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmUgdGhlIGN1cnJlbnQgc3Vic2NyaWJlciBmcm9tIGFsbCBsaXN0ZW5lcnMuIFdlIGFsc28gbmVlZCB0byBjYW5jZWxcbiAgICAgKiBhbnkgY3VycmVudCBleGVjdXRpb24gZXZlbnQgYW5kIHJlbW92ZSBhIHJlZmVyZW5jZSBmcm9tIHRoZSBwYXJlbnRcbiAgICAgKiBzdWJzY3JpcHRpb24uXG4gICAgICovXG4gICAgc3Vic2NyaWJlci51bnN1YnNjcmliZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGl0ZXJhdGlvbihzdWJzY3JpYmVyLnVuc3Vic2NyaXB0aW9ucyk7XG4gICAgICBlYWNoU3Vic2NyaXB0aW9uKHN1YnNjcmliZXIuc3Vic2NyaXB0aW9ucywgRE9NQmFycy51bnN1YnNjcmliZSk7XG5cbiAgICAgIGlmIChzdWJzY3JpYmVyLnBhcmVudCkge1xuICAgICAgICBkZWxldGUgc3Vic2NyaWJlci5wYXJlbnQuY2hpbGRyZW5bc3Vic2NyaWJlci5jaWRdO1xuICAgICAgICBkZWxldGUgc3Vic2NyaWJlci5wYXJlbnQ7XG4gICAgICB9XG5cbiAgICAgIC8vIFRyYWNrIHdoZXRoZXIgd2UgaGF2ZSBiZWVuIHVuc3Vic2NyaWJlZC4gVGhpcyBpcyByZXF1aXJlZCBzaW5jZSB0aGVcbiAgICAgIC8vIGxpc3RlbmVyIGNvdWxkIHN0aWxsIGJlIHRyaWdnZXJlZCBhdCBhbnkgdGltZSBldmVuIHRob3VnaCB3ZSBleHBlY3RcbiAgICAgIC8vIHRoZSBleHRlcm5hbCByZWZlcmVuY2VzIHRvIGJlIGRyb3BwZWQuIFRoaXMgY291bGQgYWxzbyBpbmRpY2F0ZSBhXG4gICAgICAvLyBwb3RlbnRpYWwgbWVtb3J5IGxlYWsgd2l0aCB0aGUgbGlzdGVuZXIgdW5zdXNiY3JpcHRpb24gY29kZS5cbiAgICAgIHN1YnNjcmliZXIudW5zdWJzY3JpYmVkID0gdHJ1ZTtcbiAgICAgIFZNLmV4ZWMuY2FuY2VsKHN1YnNjcmliZXIuX2V4ZWMpO1xuICAgICAgc3Vic2NyaWJlci51bnN1YnNjcmliZUNoaWxkcmVuKCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFVuc3Vic2NyaWJlIGV2ZXJ5IGNoaWxkIG9mIHRoZSBjdXJyZW50IHN1YnNjcmlwdGlvbi5cbiAgICAgKi9cbiAgICBzdWJzY3JpYmVyLnVuc3Vic2NyaWJlQ2hpbGRyZW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICBmb3IgKHZhciBjaGlsZCBpbiBzdWJzY3JpYmVyLmNoaWxkcmVuKSB7XG4gICAgICAgIHN1YnNjcmliZXIuY2hpbGRyZW5bY2hpbGRdLnVuc3Vic2NyaWJlKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBzdWJzY3JpYmVyO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZW5kZXIgYW5kIHN1YnNjcmliZSBhIHNpbmdsZSBET00gbm9kZSB1c2luZyBhIGN1c3RvbSBjcmVhdGlvbiBmdW5jdGlvbi5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBjcmVhdGVcbiAgICogQHJldHVybiB7Tm9kZX1cbiAgICovXG4gIHZhciBzdWJzY3JpYmVOb2RlID0gZnVuY3Rpb24gKGZuLCBjcmVhdGUpIHtcbiAgICB2YXIgc3Vic2NyaXB0aW9uID0gVk0uc3Vic2NyaWJlKGZuKTtcblxuICAgIC8vIFdlIG5lZWQgdG8gYWRkIGEgYmVmb3JlIGFuZCBhZnRlciBlbGVtZW50IHBsYWNlaG9sZGVyIHNpbmNlIHRoZSBwaWVjZXNcbiAgICAvLyBpbiBiZXR3ZWVuIGNhbiBiZSBlbmFibGVkIGFuZCBkaXNhYmxlZCByYW5kb21seS5cbiAgICB2YXIgcGxhY2Vob2xkZXJzID0ge1xuICAgICAgYWZ0ZXI6ICBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyksXG4gICAgICBiZWZvcmU6IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKVxuICAgIH07XG5cbiAgICAvLyBDcmVhdGUgYSBmdW5jdGlvbiB0byBrZWVwIHRyYWNrIG9mIGRvY3VtZW50IGZyYWdtZW50IGNoaWxkcmVuLlxuICAgIHZhciBnZW5lcmF0ZSA9IGZ1bmN0aW9uICh0ZXh0KSB7XG4gICAgICB2YXIgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG5cbiAgICAgIC8vIFRvIGtlZXAgdHJhY2sgb2YgdGhlIGluc2VydGlvbnMgYW5kIGRlbGV0aW9ucyBhY2N1cmF0ZWx5IHdlIG5lZWQgdG9cbiAgICAgIC8vIGFkZCBwbGFjZWhvbGRlciBET00gZWxlbWVudHMuXG4gICAgICBmcmFnbWVudC5hcHBlbmRDaGlsZChwbGFjZWhvbGRlcnMuYmVmb3JlKTtcbiAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKGNyZWF0ZSh0ZXh0KSk7XG4gICAgICBmcmFnbWVudC5hcHBlbmRDaGlsZChwbGFjZWhvbGRlcnMuYWZ0ZXIpO1xuXG4gICAgICByZXR1cm4gZnJhZ21lbnQ7XG4gICAgfTtcblxuICAgIHN1YnNjcmlwdGlvbi51cGRhdGUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHZhciBwYXJlbnROb2RlID0gcGxhY2Vob2xkZXJzLmJlZm9yZS5wYXJlbnROb2RlO1xuICAgICAgdmFyIGNoaWxkTm9kZXMgPSBwYXJlbnROb2RlLmNoaWxkTm9kZXM7XG5cbiAgICAgIC8vIEl0ZXJhdGUgb3ZlciB0aGUgY2hpbGQgbm9kZXMgdG8gcmVtb3ZlIHRoZSBhdHRhY2hlZCBjaGlsZHJlbi5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFyZW50Tm9kZS5jaGlsZE5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIC8vIFdoZW4gd2UgZmluZCB0aGUgYGJlZm9yZWAgcGxhY2Vob2xkZXIgbm9kZSwgc3RhcnQgcmVtb3ZpbmcgYWxsXG4gICAgICAgIC8vIHRoZSBjaGlsZCBub2RlcyB1bnRpbCB3ZSBoaXQgdGhlIGBhZnRlcmAgcGxhY2Vob2xkZXIgbm9kZS5cbiAgICAgICAgaWYgKGNoaWxkTm9kZXNbaV0gPT09IHBsYWNlaG9sZGVycy5iZWZvcmUpIHtcbiAgICAgICAgICBkbyB7XG4gICAgICAgICAgICBwYXJlbnROb2RlLnJlbW92ZUNoaWxkKGNoaWxkTm9kZXNbaV0pO1xuICAgICAgICAgIH0gd2hpbGUgKGNoaWxkTm9kZXNbaV0gIT09IHBsYWNlaG9sZGVycy5hZnRlcik7XG5cbiAgICAgICAgICB2YXIgbmV4dFNpYmxpbmcgPSBwbGFjZWhvbGRlcnMuYWZ0ZXIubmV4dFNpYmxpbmc7XG4gICAgICAgICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoZ2VuZXJhdGUodmFsdWUpLCBuZXh0U2libGluZyk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIGdlbmVyYXRlKHN1YnNjcmlwdGlvbigpKTtcbiAgfTtcblxuICAvKipcbiAgICogQ3JlYXRlIGFuIGVsZW1lbnQgYW5kIHN1YnNjcmliZSB0byBhbnkgY2hhbmdlcy4gVGhpcyBtZXRob2QgcmVxdWlyZXMgYVxuICAgKiBjYWxsYmFjayBmdW5jdGlvbiBmb3IgYW55IGVsZW1lbnQgY2hhbmdlcyBzaW5jZSB5b3UgY2FuJ3QgY2hhbmdlIGEgdGFnXG4gICAqIG5hbWUgaW4gcGxhY2UuXG4gICAqXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gY2JcbiAgICogQHJldHVybiB7RWxlbWVudH1cbiAgICovXG4gIFZNLmNyZWF0ZUVsZW1lbnQgPSBmdW5jdGlvbiAoZm4sIGNiKSB7XG4gICAgdmFyIHN1YnNjcmlwdGlvbiA9IFZNLnN1YnNjcmliZShmbik7XG4gICAgdmFyIGVsICAgICAgICAgICA9IFV0aWxzLmNyZWF0ZUVsZW1lbnQoc3Vic2NyaXB0aW9uKCkpO1xuXG4gICAgc3Vic2NyaXB0aW9uLnVwZGF0ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgY2IoZWwgPSBVdGlscy5jb3B5QW5kUmVwbGFjZU5vZGUoVXRpbHMuY3JlYXRlRWxlbWVudCh2YWx1ZSksIGVsKSk7XG4gICAgfTtcblxuICAgIHJldHVybiBlbDtcbiAgfTtcblxuICAvKipcbiAgICogU2V0IGFuIGVsZW1lbnRzIGF0dHJpYnV0ZS4gV2UgYWNjZXB0IHRoZSBjdXJyZW50IGVsZW1lbnQgYSBmdW5jdGlvblxuICAgKiBiZWNhdXNlIHdoZW4gYSB0YWcgbmFtZSBjaGFuZ2VzIHdlIHdpbGwgbG9zZSByZWZlcmVuY2UgdG8gdGhlIGFjdGl2ZWx5XG4gICAqIHJlbmRlcmVkIGVsZW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGVsZW1lbnRGblxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBuYW1lRm5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gdmFsdWVGblxuICAgKi9cbiAgVk0uc2V0QXR0cmlidXRlID0gZnVuY3Rpb24gKGVsZW1lbnRGbiwgbmFtZUZuLCB2YWx1ZUZuKSB7XG4gICAgdmFyIG5hbWVTdWJzY3JpcHRpb24gID0gVk0uc3Vic2NyaWJlKG5hbWVGbik7XG4gICAgdmFyIHZhbHVlU3Vic2NyaXB0aW9uID0gVk0uc3Vic2NyaWJlKHZhbHVlRm4pO1xuXG4gICAgLy8gS2VlcCB0cmFjayBvZiB0aGUgY3VycmVudCBuYW1lIGFuZCB2YWx1ZSB3aXRob3V0IGhhdmluZyB0byByZS1ydW4gdGhlXG4gICAgLy8gZnVuY3Rpb24gZXZlcnkgdGltZSBzb21ldGhpbmcgY2hhbmdlcy5cbiAgICB2YXIgYXR0ck5hbWUgID0gbmFtZVN1YnNjcmlwdGlvbigpO1xuICAgIHZhciBhdHRyVmFsdWUgPSB2YWx1ZVN1YnNjcmlwdGlvbigpO1xuXG4gICAgbmFtZVN1YnNjcmlwdGlvbi51cGRhdGUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIFV0aWxzLnJlbW92ZUF0dHJpYnV0ZShlbGVtZW50Rm4oKSwgYXR0ck5hbWUpO1xuICAgICAgVXRpbHMuc2V0QXR0cmlidXRlKGVsZW1lbnRGbigpLCBhdHRyTmFtZSA9IHZhbHVlLCBhdHRyVmFsdWUpO1xuICAgIH07XG5cbiAgICB2YWx1ZVN1YnNjcmlwdGlvbi51cGRhdGUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIFV0aWxzLnNldEF0dHJpYnV0ZShlbGVtZW50Rm4oKSwgYXR0ck5hbWUsIGF0dHJWYWx1ZSA9IHZhbHVlKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIFV0aWxzLnNldEF0dHJpYnV0ZShlbGVtZW50Rm4oKSwgYXR0ck5hbWUsIGF0dHJWYWx1ZSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIERPTSBlbGVtZW50IGFuZCBzdWJzY3JpYmUgdG8gYW55IGNoYW5nZXMuXG4gICAqXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICAgKiBAcmV0dXJuIHtOb2RlfVxuICAgKi9cbiAgVk0uY3JlYXRlRE9NID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgcmV0dXJuIHN1YnNjcmliZU5vZGUoZm4sIFV0aWxzLmRvbWlmeUV4cHJlc3Npb24pO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSB0ZXh0IG5vZGUgYW5kIHN1YnNjcmliZSB0byBhbnkgY2hhbmdlcy5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gICAqIEByZXR1cm4ge1RleHR9XG4gICAqL1xuICBWTS5jcmVhdGVUZXh0ID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgcmV0dXJuIHN1YnNjcmliZU5vZGUoZm4sIFV0aWxzLnRleHRpZnlFeHByZXNzaW9uKTtcbiAgfTtcblxuICAvKipcbiAgICogQ3JlYXRlIGEgY29tbWVudCBub2RlIGFuZCBzdWJzY3JpYmUgdG8gYW55IGNoYW5nZXMuXG4gICAqXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICAgKiBAcmV0dXJuIHtDb21tZW50fVxuICAgKi9cbiAgVk0uY3JlYXRlQ29tbWVudCA9IGZ1bmN0aW9uIChmbikge1xuICAgIHZhciBzdWJzY3JpcHRpb24gPSBWTS5zdWJzY3JpYmUoZm4pO1xuICAgIHZhciBub2RlICAgICAgICAgPSBVdGlscy5jcmVhdGVDb21tZW50KHN1YnNjcmlwdGlvbigpKTtcblxuICAgIHN1YnNjcmlwdGlvbi51cGRhdGUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIG5vZGUudGV4dENvbnRlbnQgPSB2YWx1ZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIG5vZGU7XG4gIH07XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIGFuIGV4ZWN1dGFibGUgdGVtcGxhdGUgZnJvbSBhIHRlbXBsYXRlIHNwZWMuXG4gICAqXG4gICAqIEBwYXJhbSAge09iamVjdH0gICB0ZW1wbGF0ZVNwZWNcbiAgICogQHJldHVybiB7RnVuY3Rpb259XG4gICAqL1xuICBWTS50ZW1wbGF0ZSA9IERPTUJhcnMudGVtcGxhdGUgPSBmdW5jdGlvbiAodGVtcGxhdGVTcGVjKSB7XG4gICAgdmFyIERPTUJhcnMgPSB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogVGhlIGNvbnRhaW5lciBvYmplY3QgaG9sZHMgYWxsIHRoZSBmdW5jdGlvbnMgdXNlZCBieSB0aGUgdGVtcGxhdGUgc3BlYy5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgdmFyIGNvbnRhaW5lciA9IHtcbiAgICAgIGludm9rZVBhcnRpYWw6ICAgIFZNLmludm9rZVBhcnRpYWwsXG4gICAgICBwcm9ncmFtczogICAgICAgICBbXSxcbiAgICAgIG5vb3A6ICAgICAgICAgICAgIFZNLm5vb3AsXG4gICAgICBjb21waWxlckluZm86ICAgICBudWxsLFxuICAgICAgYXBwZW5kQ2hpbGQ6ICAgICAgVXRpbHMuYXBwZW5kQ2hpbGQsXG4gICAgICBjcmVhdGVET006ICAgICAgICBWTS5jcmVhdGVET00sXG4gICAgICBjcmVhdGVUZXh0OiAgICAgICBWTS5jcmVhdGVUZXh0LFxuICAgICAgc2V0QXR0cmlidXRlOiAgICAgVk0uc2V0QXR0cmlidXRlLFxuICAgICAgY3JlYXRlQ29tbWVudDogICAgVk0uY3JlYXRlQ29tbWVudCxcbiAgICAgIGNyZWF0ZUVsZW1lbnQ6ICAgIFZNLmNyZWF0ZUVsZW1lbnQsXG4gICAgICBlc2NhcGVFeHByZXNzaW9uOiBVdGlscy5lc2NhcGVFeHByZXNzaW9uLFxuICAgICAgcHJvZ3JhbVdpdGhEZXB0aDogVk0ucHJvZ3JhbVdpdGhEZXB0aFxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYW5kIHJldHVybiBhIHByb2dyYW0gc2luZ2xldG9uIGJhc2VkIG9uIGluZGV4LlxuICAgICAqXG4gICAgICogQHBhcmFtICB7TnVtYmVyfSAgIGlcbiAgICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAgICAgKiBAcGFyYW0gIHtPYmplY3R9ICAgZGF0YVxuICAgICAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICAgICAqL1xuICAgIGNvbnRhaW5lci5wcm9ncmFtID0gZnVuY3Rpb24gKGksIGZuLCBkYXRhKSB7XG4gICAgICB2YXIgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldO1xuXG4gICAgICBpZiAoZGF0YSkge1xuICAgICAgICByZXR1cm4gVk0ucHJvZ3JhbShpLCBmbiwgZGF0YSk7XG4gICAgICB9XG5cbiAgICAgIGlmICghcHJvZ3JhbVdyYXBwZXIpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucHJvZ3JhbXNbaV0gPSBWTS5wcm9ncmFtKGksIGZuKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHByb2dyYW1XcmFwcGVyO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBNZXJnZSB0d28gb2JqZWN0cyBpbnRvIGEgc2luZ2xlIG9iamVjdC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSAge09iamVjdH0gcGFyYW1cbiAgICAgKiBAcGFyYW0gIHtPYmplY3R9IGNvbW1vblxuICAgICAqIEByZXR1cm4ge09iamVjdH1cbiAgICAgKi9cbiAgICBjb250YWluZXIubWVyZ2UgPSBmdW5jdGlvbiAocGFyYW0sIGNvbW1vbikge1xuICAgICAgdmFyIHJldCA9IHBhcmFtIHx8IGNvbW1vbjtcblxuICAgICAgaWYgKHBhcmFtICYmIGNvbW1vbikge1xuICAgICAgICByZXQgPSB7fTtcbiAgICAgICAgVXRpbHMuZXh0ZW5kKHJldCwgY29tbW9uKTtcbiAgICAgICAgVXRpbHMuZXh0ZW5kKHJldCwgcGFyYW0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmV0O1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBHZXQgYSBwcm9wZXJ0eSBmcm9tIGFuIG9iamVjdC4gUGFzc2VzIGluIHRoZSBvYmplY3QgaWQgKGRlcHRoKSB0byBtYWtlIGl0XG4gICAgICogbXVjaCBmYXN0ZXIgdG8gZG8gY29tcGFyaXNvbnMgYmV0d2VlbiBuZXcgYW5kIG9sZCBzdWJzY3JpcHRpb25zLlxuICAgICAqXG4gICAgICogQHBhcmFtICB7T2JqZWN0fSBvYmplY3RcbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IHByb3BlcnR5XG4gICAgICogQHBhcmFtICB7U3RyaW5nfSBpZFxuICAgICAqIEByZXR1cm4geyp9XG4gICAgICovXG4gICAgY29udGFpbmVyLmdldCA9IGZ1bmN0aW9uIChvYmplY3QsIHByb3BlcnR5LCBpZCkge1xuICAgICAgdmFyIHN1YnNjcmlwdGlvbnMgPSBWTS5zdWJzY3JpYmVyLnN1YnNjcmlwdGlvbnM7XG5cbiAgICAgIChzdWJzY3JpcHRpb25zW3Byb3BlcnR5XSB8fCAoc3Vic2NyaXB0aW9uc1twcm9wZXJ0eV0gPSB7fSkpW2lkXSA9IG9iamVjdDtcblxuICAgICAgcmV0dXJuIERPTUJhcnMuZ2V0KG9iamVjdCwgcHJvcGVydHkpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm4gdGhlIGNvbXBpbGVkIEphdmFTY3JpcHQgZnVuY3Rpb24gZm9yIGV4ZWN1dGlvbi5cbiAgICAgKlxuICAgICAqIEBwYXJhbSAge09iamVjdH0gY29udGV4dFxuICAgICAqIEBwYXJhbSAge09iamVjdH0gb3B0aW9uc1xuICAgICAqIEByZXR1cm4ge05vZGV9XG4gICAgICovXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgLy8gU3Vic2NyaWJlIHRvIHRoZSB0ZW1wbGF0ZSBzcGVjIGluc2lkZSB0aGUgcmV0dXJuZWQgZnVuY3Rpb24uIFRoaXMgaXMgc29cbiAgICAgIC8vIHRoYXQgKmV2ZXJ5KiBnZW5lcmF0ZWQgRE9NIHRlbXBsYXRlIHdpbGwgaGF2ZSBhIGRpZmZlcmVudCB1bnN1YnNjcmliZVxuICAgICAgLy8gbWV0aG9kLlxuICAgICAgdmFyIHN1YnNjcmliZXIgPSBWTS5zdWJzY3JpYmUodGVtcGxhdGVTcGVjKTtcblxuICAgICAgdmFyIHJlc3VsdCA9IHN1YnNjcmliZXIuY2FsbChcbiAgICAgICAgY29udGFpbmVyLFxuICAgICAgICBET01CYXJzLFxuICAgICAgICBjb250ZXh0LFxuICAgICAgICBvcHRpb25zLmhlbHBlcnMsXG4gICAgICAgIG9wdGlvbnMucGFydGlhbHMsXG4gICAgICAgIG9wdGlvbnMuZGF0YVxuICAgICAgKTtcblxuICAgICAgLy8gQXR0YWNoIHRoZSBjdXJyZW50IG9wZXJhdGluZyBjb250ZXh0IHRvIHRoZSBWTSBvYmplY3QgZm9yIHJlZmVyZW5jZVxuICAgICAgLy8gd2l0aGluIHRoZSB1dGlsaXR5IGZ1bmN0aW9ucy5cbiAgICAgIFZNLmNvbnRleHQgPSBjb250ZXh0O1xuXG4gICAgICAvLyBBdHRhY2ggYW4gYHVuc3Vic2NyaWJlYCBmdW5jdGlvbiB0byB0aGUgcmVzdWx0aW5nIERPTS5cbiAgICAgIC8vIFRPRE86IENvbWUgdXAgd2l0aCBhbiBpbXByb3ZlZCBzb2x1dGlvbi5cbiAgICAgIHJlc3VsdC51bnN1YnNjcmliZSA9IHN1YnNjcmliZXIudW5zdWJzY3JpYmU7XG5cbiAgICAgIHZhciBjb21waWxlckluZm8gICAgID0gY29udGFpbmVyLmNvbXBpbGVySW5mbyB8fCBbXTtcbiAgICAgIHZhciBjb21waWxlclJldmlzaW9uID0gY29tcGlsZXJJbmZvWzBdIHx8IDE7XG4gICAgICB2YXIgY3VycmVudFJldmlzaW9uICA9IERPTUJhcnMuQ09NUElMRVJfUkVWSVNJT047XG5cbiAgICAgIGlmIChjb21waWxlclJldmlzaW9uICE9PSBjdXJyZW50UmV2aXNpb24pIHtcbiAgICAgICAgaWYgKGNvbXBpbGVyUmV2aXNpb24gPCBjdXJyZW50UmV2aXNpb24pIHtcbiAgICAgICAgICB2YXIgcnVudGltZVZlcnNpb25zICA9IERPTUJhcnMuUkVWSVNJT05fQ0hBTkdFU1tjdXJyZW50UmV2aXNpb25dO1xuICAgICAgICAgIHZhciBjb21waWxlclZlcnNpb25zID0gRE9NQmFycy5SRVZJU0lPTl9DSEFOR0VTW2NvbXBpbGVyUmV2aXNpb25dO1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVGVtcGxhdGUgd2FzIHByZWNvbXBpbGVkIHdpdGggYW4gb2xkZXIgdmVyc2lvbiBvZiAnICtcbiAgICAgICAgICAgICdET01CYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gUGxlYXNlIHVwZGF0ZSB5b3VyIHByZWNvbXBpbGVyJyArXG4gICAgICAgICAgICAnIHRvIGEgbmV3ZXIgdmVyc2lvbiAoJyArIHJ1bnRpbWVWZXJzaW9ucyArICcpIG9yIGRvd25ncmFkZSB5b3VyICcgK1xuICAgICAgICAgICAgJ3J1bnRpbWUgdG8gYW4gb2xkZXIgdmVyc2lvbiAoJyArIGNvbXBpbGVyVmVyc2lvbnMgKyAnKScpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhIG5ld2VyIHZlcnNpb24gb2YnICtcbiAgICAgICAgICAnRE9NQmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuIFBsZWFzZSB1cGRhdGUgeW91ciBydW50aW1lIHRvICcgK1xuICAgICAgICAgICdhIG5ld2VyIHZlcnNpb24gKCcgKyBjb21waWxlckluZm9bMV0gKyAnKScpO1xuICAgICAgfVxuXG4gICAgICBWTS5jb250ZXh0ID0gbnVsbDtcblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9O1xuXG4gIHJldHVybiBET01CYXJzO1xufTtcbiIsInZhciB1dGlscyAgICA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvdXRpbHMnKTtcbnZhciBldmVudHMgICA9IHJlcXVpcmUoJy4vY29tcGlsZXIvZXZlbnRzJyk7XG52YXIgdW5pcXVlSWQgPSAwO1xuXG4vKipcbiAqIEF0dGFjaCByZXVzYWJsZSB1dGlsaXR5IGZ1bmN0aW9ucyB0byB0aGUgRE9NQmFycyBpbnN0YW5jZS5cbiAqXG4gKiBAcGFyYW0gIHtPYmplY3R9IERPTUJhcnNcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xuZXhwb3J0cy5hdHRhY2ggPSBmdW5jdGlvbiAoRE9NQmFycykge1xuICB2YXIgVXRpbHMgPSB1dGlscy5hdHRhY2goRE9NQmFycykuVXRpbHM7XG5cbiAgLy8gRXh0ZW5kIHRoZSBET01CYXJzIHJvb3Qgb2JqZWN0IHdpdGggYW4gZXZlbnQgZW1pdHRlci5cbiAgRE9NQmFycy5VdGlscy5leHRlbmQoRE9NQmFycywgZXZlbnRzKTtcblxuICAvKipcbiAgICogU2ltcGxlIGZ1bmN0aW9uIHdyYXBwZXIgdGhhdCB3aWxsIGVtaXQgdGhlIGV2ZW50IHdpdGggdGhlIHJlc3VsdCBvZiB0aGVcbiAgICogZnVuY3Rpb24gZXhlY3V0aW9uIGV2ZXJ5IHRpbWUgdGhlIGZ1bmN0aW9uIGlzIHJ1bi5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gICAqIEBwYXJhbSAge1N0cmluZ30gICBldmVudFxuICAgKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAgICovXG4gIHZhciBlbWl0dGVyID0gZnVuY3Rpb24gKGZuLCBldmVudCkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIERPTUJhcnMuZW1pdChldmVudCwgcmVzdWx0KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfTtcblxuICAvKipcbiAgICogUmV0dXJuIGEgdW5pcXVlIGlkLlxuICAgKlxuICAgKiBAcmV0dXJuIHtOdW1iZXJ9XG4gICAqL1xuICBVdGlscy51bmlxdWVJZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdW5pcXVlSWQrKztcbiAgfTtcblxuICAvKipcbiAgICogQ2hlY2sgd2hldGhlciBhbiBvYmplY3QgaXMgYWN0dWFsbHkgYSBET00gbm9kZS5cbiAgICpcbiAgICogQHBhcmFtICB7Kn0gICAgICAgZWxlbWVudFxuICAgKiBAcmV0dXJuIHtCb29sZWFufVxuICAgKi9cbiAgVXRpbHMuaXNOb2RlID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICByZXR1cm4gZWxlbWVudCBpbnN0YW5jZW9mIE5vZGU7XG4gIH07XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBlbGVtZW50IGZyb20gYSB0YWcgbmFtZS5cbiAgICpcbiAgICogQHBhcmFtICB7U3RyaW5nfSB0YWdOYW1lXG4gICAqIEByZXR1cm4ge05vZGV9XG4gICAqL1xuICBVdGlscy5jcmVhdGVFbGVtZW50ID0gZW1pdHRlcihmdW5jdGlvbiAodGFnTmFtZSkge1xuICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRhZ05hbWUpO1xuICB9LCAnY3JlYXRlRWxlbWVudCcpO1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBjb21tZW50IG5vZGUgYmFzZWQgb24gdGV4dCBjb250ZW50cy5cbiAgICpcbiAgICogQHBhcmFtICB7U3RyaW5nfSBjb250ZW50c1xuICAgKiBAcmV0dXJuIHtOb2RlfVxuICAgKi9cbiAgVXRpbHMuY3JlYXRlQ29tbWVudCA9IGVtaXR0ZXIoZnVuY3Rpb24gKGNvbnRlbnRzKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZUNvbW1lbnQoY29udGVudHMpO1xuICB9LCAnY3JlYXRlQ29tbWVudCcpO1xuXG4gIC8qKlxuICAgKiBDb3B5IGFsbCBzaWduaWZpY2FudCBkYXRhIGZyb20gb25lIGVsZW1lbnQgbm9kZSB0byBhbm90aGVyLlxuICAgKlxuICAgKiBAcGFyYW0gIHtOb2RlfSBuZXdOb2RlXG4gICAqIEBwYXJhbSAge05vZGV9IG9sZE5vZGVcbiAgICogQHJldHVybiB7Tm9kZX1cbiAgICovXG4gIFV0aWxzLmNvcHlOb2RlID0gZnVuY3Rpb24gKG5ld05vZGUsIG9sZE5vZGUpIHtcbiAgICAvLyBNb3ZlIGFsbCBjaGlsZCBlbGVtZW50cyB0byB0aGUgbmV3IG5vZGUuXG4gICAgd2hpbGUgKG9sZE5vZGUuZmlyc3RDaGlsZCkge1xuICAgICAgbmV3Tm9kZS5hcHBlbmRDaGlsZChvbGROb2RlLmZpcnN0Q2hpbGQpO1xuICAgIH1cblxuICAgIC8vIENvcHkgYWxsIHRoZSBhdHRyaWJ1dGVzIHRvIHRoZSBuZXcgbm9kZS5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9sZE5vZGUuYXR0cmlidXRlcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGF0dHJpYnV0ZSA9IG9sZE5vZGUuYXR0cmlidXRlc1tpXTtcbiAgICAgIFV0aWxzLnNldEF0dHJpYnV0ZShuZXdOb2RlLCBhdHRyaWJ1dGUubmFtZSwgYXR0cmlidXRlLnZhbHVlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3Tm9kZTtcbiAgfTtcblxuICAvKipcbiAgICogQ29weSBhbGwgdGhlIGRhdGEgZnJvbSBvbmUgZWxlbWVudCB0byBhbm90aGVyIGFuZCByZXBsYWNlIGluIHBsYWNlLlxuICAgKlxuICAgKiBAcGFyYW0gIHtOb2RlfSBuZXdOb2RlXG4gICAqIEBwYXJhbSAge05vZGV9IG9sZE5vZGVcbiAgICogQHJldHVybiB7Tm9kZX1cbiAgICovXG4gIFV0aWxzLmNvcHlBbmRSZXBsYWNlTm9kZSA9IGZ1bmN0aW9uIChuZXdOb2RlLCBvbGROb2RlKSB7XG4gICAgb2xkTm9kZS5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChVdGlscy5jb3B5Tm9kZShuZXdOb2RlLCBvbGROb2RlKSwgb2xkTm9kZSk7XG4gICAgcmV0dXJuIG5ld05vZGU7XG4gIH07XG5cbiAgLyoqXG4gICAqIFNldCBhbiBhdHRyaWJ1dGUgdmFsdWUgb24gYW4gZWxlbWVudC5cbiAgICpcbiAgICogQHBhcmFtIHtOb2RlfSAgIGVsZW1lbnRcbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAgICogQHBhcmFtIHsqfSAgICAgIHZhbHVlXG4gICAqL1xuICBVdGlscy5zZXRBdHRyaWJ1dGUgPSBmdW5jdGlvbiAoZWxlbWVudCwgbmFtZSwgdmFsdWUpIHtcbiAgICBpZiAodmFsdWUgPT09IGZhbHNlKSB7XG4gICAgICByZXR1cm4gVXRpbHMucmVtb3ZlQXR0cmlidXRlKGVsZW1lbnQsIG5hbWUpO1xuICAgIH1cblxuICAgIERPTUJhcnMuZW1pdCgnc2V0QXR0cmlidXRlJywgZWxlbWVudCwgbmFtZSwgdmFsdWUpO1xuICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKG5hbWUsIHZhbHVlKTtcbiAgfTtcblxuICAvKipcbiAgICogUmVtb3ZlIGFuIGF0dHJpYnV0ZSBmcm9tIGFuIGVsZW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSB7Tm9kZX0gICBlbGVtZW50XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gICAqL1xuICBVdGlscy5yZW1vdmVBdHRyaWJ1dGUgPSBmdW5jdGlvbiAoZWxlbWVudCwgbmFtZSkge1xuICAgIGlmIChlbGVtZW50Lmhhc0F0dHJpYnV0ZShuYW1lKSkge1xuICAgICAgRE9NQmFycy5lbWl0KCdyZW1vdmVBdHRyaWJ1dGUnLCBlbGVtZW50LCBuYW1lKTtcbiAgICAgIGVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogQXBwZW5kIGEgY2hpbGQgZWxlbWVudCB0byBhIERPTSBub2RlLlxuICAgKlxuICAgKiBAcGFyYW0ge05vZGV9IHBhcmVudFxuICAgKiBAcGFyYW0ge05vZGV9IGNoaWxkXG4gICAqL1xuICBVdGlscy5hcHBlbmRDaGlsZCA9IGZ1bmN0aW9uIChwYXJlbnQsIGNoaWxkKSB7XG4gICAgaWYgKGNoaWxkID09IG51bGwpIHsgcmV0dXJuOyB9XG5cbiAgICBwYXJlbnQuYXBwZW5kQ2hpbGQoY2hpbGQpO1xuICAgIERPTUJhcnMuZW1pdCgnYXBwZW5kQ2hpbGQnLCBwYXJlbnQsIGNoaWxkKTtcbiAgfTtcblxuICAvKipcbiAgICogVHJhbnNmb3JtIGEgc3RyaW5nIGludG8gYXJiaXRyYXJ5IERPTSBub2Rlcy5cbiAgICpcbiAgICogQHBhcmFtICB7U3RyaW5nfSBzdHJpbmdcbiAgICogQHJldHVybiB7Tm9kZX1cbiAgICovXG4gIFV0aWxzLmRvbWlmeUV4cHJlc3Npb24gPSBlbWl0dGVyKGZ1bmN0aW9uIChzdHJpbmcpIHtcbiAgICBpZiAoVXRpbHMuaXNOb2RlKHN0cmluZykpIHtcbiAgICAgIHJldHVybiBzdHJpbmc7XG4gICAgfVxuXG4gICAgdmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGRpdi5pbm5lckhUTUwgPSBzdHJpbmc7XG5cbiAgICBpZiAoZGl2LmNoaWxkTm9kZXMubGVuZ3RoID09PSAxKSB7XG4gICAgICByZXR1cm4gZGl2LnJlbW92ZUNoaWxkKGRpdi5jaGlsZE5vZGVzWzBdKTtcbiAgICB9XG5cbiAgICB2YXIgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG5cbiAgICB3aGlsZSAoZGl2LmZpcnN0Q2hpbGQpIHtcbiAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKGRpdi5maXJzdENoaWxkKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnJhZ21lbnQ7XG4gIH0sICdkb21pZnknKTtcblxuICAvKipcbiAgICogVHJhbnNmb3JtIGEgc3RyaW5nIGludG8gYSBET00gdGV4dCBub2RlIGZvciBhcHBlbmRpbmcgdG8gdGhlIHRlbXBsYXRlLlxuICAgKlxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IHN0cmluZ1xuICAgKiBAcmV0dXJuIHtUZXh0fVxuICAgKi9cbiAgVXRpbHMudGV4dGlmeUV4cHJlc3Npb24gPSBlbWl0dGVyKGZ1bmN0aW9uIChzdHJpbmcpIHtcbiAgICBpZiAoc3RyaW5nIGluc3RhbmNlb2YgRE9NQmFycy5TYWZlU3RyaW5nKSB7XG4gICAgICByZXR1cm4gVXRpbHMuZG9taWZ5RXhwcmVzc2lvbihzdHJpbmcudG9TdHJpbmcoKSk7XG4gICAgfVxuXG4gICAgLy8gQ2F0Y2ggd2hlbiB0aGUgc3RyaW5nIGlzIGFjdHVhbGx5IGEgRE9NIG5vZGUgYW5kIHR1cm4gaXQgaW50byBhIHN0cmluZy5cbiAgICBpZiAoVXRpbHMuaXNOb2RlKHN0cmluZykpIHtcbiAgICAgIC8vIEFscmVhZHkgYSB0ZXh0IG5vZGUsIGp1c3QgcmV0dXJuIGl0IGltbWVkaWF0ZWx5LlxuICAgICAgaWYgKHN0cmluZy5ub2RlVHlwZSA9PT0gMykge1xuICAgICAgICByZXR1cm4gc3RyaW5nO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIHN0cmluZy5vdXRlckhUTUwgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzdHJpbmcub3V0ZXJIVE1MKTtcbiAgICAgIH1cblxuICAgICAgdmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgZGl2LmFwcGVuZENoaWxkKHN0cmluZy5jbG9uZU5vZGUodHJ1ZSkpO1xuICAgICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGRpdi5pbm5lckhUTUwpO1xuICAgIH1cblxuICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzdHJpbmcgPT0gbnVsbCA/ICcnIDogc3RyaW5nKTtcbiAgfSwgJ3RleHRpZnknKTtcblxuICByZXR1cm4gRE9NQmFycztcbn07XG4iLCIvKmpzaGludCBlcW51bGw6IHRydWUgKi9cblxubW9kdWxlLmV4cG9ydHMuY3JlYXRlID0gZnVuY3Rpb24oKSB7XG5cbnZhciBIYW5kbGViYXJzID0ge307XG5cbi8vIEJFR0lOKEJST1dTRVIpXG5cbkhhbmRsZWJhcnMuVkVSU0lPTiA9IFwiMS4wLjBcIjtcbkhhbmRsZWJhcnMuQ09NUElMRVJfUkVWSVNJT04gPSA0O1xuXG5IYW5kbGViYXJzLlJFVklTSU9OX0NIQU5HRVMgPSB7XG4gIDE6ICc8PSAxLjAucmMuMicsIC8vIDEuMC5yYy4yIGlzIGFjdHVhbGx5IHJldjIgYnV0IGRvZXNuJ3QgcmVwb3J0IGl0XG4gIDI6ICc9PSAxLjAuMC1yYy4zJyxcbiAgMzogJz09IDEuMC4wLXJjLjQnLFxuICA0OiAnPj0gMS4wLjAnXG59O1xuXG5IYW5kbGViYXJzLmhlbHBlcnMgID0ge307XG5IYW5kbGViYXJzLnBhcnRpYWxzID0ge307XG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcsXG4gICAgZnVuY3Rpb25UeXBlID0gJ1tvYmplY3QgRnVuY3Rpb25dJyxcbiAgICBvYmplY3RUeXBlID0gJ1tvYmplY3QgT2JqZWN0XSc7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIgPSBmdW5jdGlvbihuYW1lLCBmbiwgaW52ZXJzZSkge1xuICBpZiAodG9TdHJpbmcuY2FsbChuYW1lKSA9PT0gb2JqZWN0VHlwZSkge1xuICAgIGlmIChpbnZlcnNlIHx8IGZuKSB7IHRocm93IG5ldyBIYW5kbGViYXJzLkV4Y2VwdGlvbignQXJnIG5vdCBzdXBwb3J0ZWQgd2l0aCBtdWx0aXBsZSBoZWxwZXJzJyk7IH1cbiAgICBIYW5kbGViYXJzLlV0aWxzLmV4dGVuZCh0aGlzLmhlbHBlcnMsIG5hbWUpO1xuICB9IGVsc2Uge1xuICAgIGlmIChpbnZlcnNlKSB7IGZuLm5vdCA9IGludmVyc2U7IH1cbiAgICB0aGlzLmhlbHBlcnNbbmFtZV0gPSBmbjtcbiAgfVxufTtcblxuSGFuZGxlYmFycy5yZWdpc3RlclBhcnRpYWwgPSBmdW5jdGlvbihuYW1lLCBzdHIpIHtcbiAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICBIYW5kbGViYXJzLlV0aWxzLmV4dGVuZCh0aGlzLnBhcnRpYWxzLCAgbmFtZSk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5wYXJ0aWFsc1tuYW1lXSA9IHN0cjtcbiAgfVxufTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignaGVscGVyTWlzc2luZycsIGZ1bmN0aW9uKGFyZykge1xuICBpZihhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIGhlbHBlcjogJ1wiICsgYXJnICsgXCInXCIpO1xuICB9XG59KTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignYmxvY2tIZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICB2YXIgaW52ZXJzZSA9IG9wdGlvbnMuaW52ZXJzZSB8fCBmdW5jdGlvbigpIHt9LCBmbiA9IG9wdGlvbnMuZm47XG5cbiAgdmFyIHR5cGUgPSB0b1N0cmluZy5jYWxsKGNvbnRleHQpO1xuXG4gIGlmKHR5cGUgPT09IGZ1bmN0aW9uVHlwZSkgeyBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpOyB9XG5cbiAgaWYoY29udGV4dCA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiBmbih0aGlzKTtcbiAgfSBlbHNlIGlmKGNvbnRleHQgPT09IGZhbHNlIHx8IGNvbnRleHQgPT0gbnVsbCkge1xuICAgIHJldHVybiBpbnZlcnNlKHRoaXMpO1xuICB9IGVsc2UgaWYodHlwZSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiKSB7XG4gICAgaWYoY29udGV4dC5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gSGFuZGxlYmFycy5oZWxwZXJzLmVhY2goY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBpbnZlcnNlKHRoaXMpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZm4oY29udGV4dCk7XG4gIH1cbn0pO1xuXG5IYW5kbGViYXJzLksgPSBmdW5jdGlvbigpIHt9O1xuXG5IYW5kbGViYXJzLmNyZWF0ZUZyYW1lID0gT2JqZWN0LmNyZWF0ZSB8fCBmdW5jdGlvbihvYmplY3QpIHtcbiAgSGFuZGxlYmFycy5LLnByb3RvdHlwZSA9IG9iamVjdDtcbiAgdmFyIG9iaiA9IG5ldyBIYW5kbGViYXJzLksoKTtcbiAgSGFuZGxlYmFycy5LLnByb3RvdHlwZSA9IG51bGw7XG4gIHJldHVybiBvYmo7XG59O1xuXG5IYW5kbGViYXJzLmxvZ2dlciA9IHtcbiAgREVCVUc6IDAsIElORk86IDEsIFdBUk46IDIsIEVSUk9SOiAzLCBsZXZlbDogMyxcblxuICBtZXRob2RNYXA6IHswOiAnZGVidWcnLCAxOiAnaW5mbycsIDI6ICd3YXJuJywgMzogJ2Vycm9yJ30sXG5cbiAgLy8gY2FuIGJlIG92ZXJyaWRkZW4gaW4gdGhlIGhvc3QgZW52aXJvbm1lbnRcbiAgbG9nOiBmdW5jdGlvbihsZXZlbCwgb2JqKSB7XG4gICAgaWYgKEhhbmRsZWJhcnMubG9nZ2VyLmxldmVsIDw9IGxldmVsKSB7XG4gICAgICB2YXIgbWV0aG9kID0gSGFuZGxlYmFycy5sb2dnZXIubWV0aG9kTWFwW2xldmVsXTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcgJiYgY29uc29sZVttZXRob2RdKSB7XG4gICAgICAgIGNvbnNvbGVbbWV0aG9kXS5jYWxsKGNvbnNvbGUsIG9iaik7XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG5IYW5kbGViYXJzLmxvZyA9IGZ1bmN0aW9uKGxldmVsLCBvYmopIHsgSGFuZGxlYmFycy5sb2dnZXIubG9nKGxldmVsLCBvYmopOyB9O1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdlYWNoJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICB2YXIgZm4gPSBvcHRpb25zLmZuLCBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlO1xuICB2YXIgaSA9IDAsIHJldCA9IFwiXCIsIGRhdGE7XG5cbiAgdmFyIHR5cGUgPSB0b1N0cmluZy5jYWxsKGNvbnRleHQpO1xuICBpZih0eXBlID09PSBmdW5jdGlvblR5cGUpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gIGlmIChvcHRpb25zLmRhdGEpIHtcbiAgICBkYXRhID0gSGFuZGxlYmFycy5jcmVhdGVGcmFtZShvcHRpb25zLmRhdGEpO1xuICB9XG5cbiAgaWYoY29udGV4dCAmJiB0eXBlb2YgY29udGV4dCA9PT0gJ29iamVjdCcpIHtcbiAgICBpZihjb250ZXh0IGluc3RhbmNlb2YgQXJyYXkpe1xuICAgICAgZm9yKHZhciBqID0gY29udGV4dC5sZW5ndGg7IGk8ajsgaSsrKSB7XG4gICAgICAgIGlmIChkYXRhKSB7IGRhdGEuaW5kZXggPSBpOyB9XG4gICAgICAgIHJldCA9IHJldCArIGZuKGNvbnRleHRbaV0sIHsgZGF0YTogZGF0YSB9KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yKHZhciBrZXkgaW4gY29udGV4dCkge1xuICAgICAgICBpZihjb250ZXh0Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICBpZihkYXRhKSB7IGRhdGEua2V5ID0ga2V5OyB9XG4gICAgICAgICAgcmV0ID0gcmV0ICsgZm4oY29udGV4dFtrZXldLCB7ZGF0YTogZGF0YX0pO1xuICAgICAgICAgIGkrKztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmKGkgPT09IDApe1xuICAgIHJldCA9IGludmVyc2UodGhpcyk7XG4gIH1cblxuICByZXR1cm4gcmV0O1xufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2lmJywgZnVuY3Rpb24oY29uZGl0aW9uYWwsIG9wdGlvbnMpIHtcbiAgdmFyIHR5cGUgPSB0b1N0cmluZy5jYWxsKGNvbmRpdGlvbmFsKTtcbiAgaWYodHlwZSA9PT0gZnVuY3Rpb25UeXBlKSB7IGNvbmRpdGlvbmFsID0gY29uZGl0aW9uYWwuY2FsbCh0aGlzKTsgfVxuXG4gIGlmKCFjb25kaXRpb25hbCB8fCBIYW5kbGViYXJzLlV0aWxzLmlzRW1wdHkoY29uZGl0aW9uYWwpKSB7XG4gICAgcmV0dXJuIG9wdGlvbnMuaW52ZXJzZSh0aGlzKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gb3B0aW9ucy5mbih0aGlzKTtcbiAgfVxufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ3VubGVzcycsIGZ1bmN0aW9uKGNvbmRpdGlvbmFsLCBvcHRpb25zKSB7XG4gIHJldHVybiBIYW5kbGViYXJzLmhlbHBlcnNbJ2lmJ10uY2FsbCh0aGlzLCBjb25kaXRpb25hbCwge2ZuOiBvcHRpb25zLmludmVyc2UsIGludmVyc2U6IG9wdGlvbnMuZm59KTtcbn0pO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCd3aXRoJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICB2YXIgdHlwZSA9IHRvU3RyaW5nLmNhbGwoY29udGV4dCk7XG4gIGlmKHR5cGUgPT09IGZ1bmN0aW9uVHlwZSkgeyBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpOyB9XG5cbiAgaWYgKCFIYW5kbGViYXJzLlV0aWxzLmlzRW1wdHkoY29udGV4dCkpIHJldHVybiBvcHRpb25zLmZuKGNvbnRleHQpO1xufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2xvZycsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgdmFyIGxldmVsID0gb3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuZGF0YS5sZXZlbCAhPSBudWxsID8gcGFyc2VJbnQob3B0aW9ucy5kYXRhLmxldmVsLCAxMCkgOiAxO1xuICBIYW5kbGViYXJzLmxvZyhsZXZlbCwgY29udGV4dCk7XG59KTtcblxuLy8gRU5EKEJST1dTRVIpXG5cbnJldHVybiBIYW5kbGViYXJzO1xufTtcbiIsImV4cG9ydHMuYXR0YWNoID0gZnVuY3Rpb24oSGFuZGxlYmFycykge1xuXG4vLyBCRUdJTihCUk9XU0VSKVxuXG5IYW5kbGViYXJzLlZNID0ge1xuICB0ZW1wbGF0ZTogZnVuY3Rpb24odGVtcGxhdGVTcGVjKSB7XG4gICAgLy8gSnVzdCBhZGQgd2F0ZXJcbiAgICB2YXIgY29udGFpbmVyID0ge1xuICAgICAgZXNjYXBlRXhwcmVzc2lvbjogSGFuZGxlYmFycy5VdGlscy5lc2NhcGVFeHByZXNzaW9uLFxuICAgICAgaW52b2tlUGFydGlhbDogSGFuZGxlYmFycy5WTS5pbnZva2VQYXJ0aWFsLFxuICAgICAgcHJvZ3JhbXM6IFtdLFxuICAgICAgcHJvZ3JhbTogZnVuY3Rpb24oaSwgZm4sIGRhdGEpIHtcbiAgICAgICAgdmFyIHByb2dyYW1XcmFwcGVyID0gdGhpcy5wcm9ncmFtc1tpXTtcbiAgICAgICAgaWYoZGF0YSkge1xuICAgICAgICAgIHByb2dyYW1XcmFwcGVyID0gSGFuZGxlYmFycy5WTS5wcm9ncmFtKGksIGZuLCBkYXRhKTtcbiAgICAgICAgfSBlbHNlIGlmICghcHJvZ3JhbVdyYXBwZXIpIHtcbiAgICAgICAgICBwcm9ncmFtV3JhcHBlciA9IHRoaXMucHJvZ3JhbXNbaV0gPSBIYW5kbGViYXJzLlZNLnByb2dyYW0oaSwgZm4pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcm9ncmFtV3JhcHBlcjtcbiAgICAgIH0sXG4gICAgICBtZXJnZTogZnVuY3Rpb24ocGFyYW0sIGNvbW1vbikge1xuICAgICAgICB2YXIgcmV0ID0gcGFyYW0gfHwgY29tbW9uO1xuXG4gICAgICAgIGlmIChwYXJhbSAmJiBjb21tb24pIHtcbiAgICAgICAgICByZXQgPSB7fTtcbiAgICAgICAgICBIYW5kbGViYXJzLlV0aWxzLmV4dGVuZChyZXQsIGNvbW1vbik7XG4gICAgICAgICAgSGFuZGxlYmFycy5VdGlscy5leHRlbmQocmV0LCBwYXJhbSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgIH0sXG4gICAgICBwcm9ncmFtV2l0aERlcHRoOiBIYW5kbGViYXJzLlZNLnByb2dyYW1XaXRoRGVwdGgsXG4gICAgICBub29wOiBIYW5kbGViYXJzLlZNLm5vb3AsXG4gICAgICBjb21waWxlckluZm86IG51bGxcbiAgICB9O1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgdmFyIHJlc3VsdCA9IHRlbXBsYXRlU3BlYy5jYWxsKGNvbnRhaW5lciwgSGFuZGxlYmFycywgY29udGV4dCwgb3B0aW9ucy5oZWxwZXJzLCBvcHRpb25zLnBhcnRpYWxzLCBvcHRpb25zLmRhdGEpO1xuXG4gICAgICB2YXIgY29tcGlsZXJJbmZvID0gY29udGFpbmVyLmNvbXBpbGVySW5mbyB8fCBbXSxcbiAgICAgICAgICBjb21waWxlclJldmlzaW9uID0gY29tcGlsZXJJbmZvWzBdIHx8IDEsXG4gICAgICAgICAgY3VycmVudFJldmlzaW9uID0gSGFuZGxlYmFycy5DT01QSUxFUl9SRVZJU0lPTjtcblxuICAgICAgaWYgKGNvbXBpbGVyUmV2aXNpb24gIT09IGN1cnJlbnRSZXZpc2lvbikge1xuICAgICAgICBpZiAoY29tcGlsZXJSZXZpc2lvbiA8IGN1cnJlbnRSZXZpc2lvbikge1xuICAgICAgICAgIHZhciBydW50aW1lVmVyc2lvbnMgPSBIYW5kbGViYXJzLlJFVklTSU9OX0NIQU5HRVNbY3VycmVudFJldmlzaW9uXSxcbiAgICAgICAgICAgICAgY29tcGlsZXJWZXJzaW9ucyA9IEhhbmRsZWJhcnMuUkVWSVNJT05fQ0hBTkdFU1tjb21waWxlclJldmlzaW9uXTtcbiAgICAgICAgICB0aHJvdyBcIlRlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGFuIG9sZGVyIHZlcnNpb24gb2YgSGFuZGxlYmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuIFwiK1xuICAgICAgICAgICAgICAgIFwiUGxlYXNlIHVwZGF0ZSB5b3VyIHByZWNvbXBpbGVyIHRvIGEgbmV3ZXIgdmVyc2lvbiAoXCIrcnVudGltZVZlcnNpb25zK1wiKSBvciBkb3duZ3JhZGUgeW91ciBydW50aW1lIHRvIGFuIG9sZGVyIHZlcnNpb24gKFwiK2NvbXBpbGVyVmVyc2lvbnMrXCIpLlwiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIFVzZSB0aGUgZW1iZWRkZWQgdmVyc2lvbiBpbmZvIHNpbmNlIHRoZSBydW50aW1lIGRvZXNuJ3Qga25vdyBhYm91dCB0aGlzIHJldmlzaW9uIHlldFxuICAgICAgICAgIHRocm93IFwiVGVtcGxhdGUgd2FzIHByZWNvbXBpbGVkIHdpdGggYSBuZXdlciB2ZXJzaW9uIG9mIEhhbmRsZWJhcnMgdGhhbiB0aGUgY3VycmVudCBydW50aW1lLiBcIitcbiAgICAgICAgICAgICAgICBcIlBsZWFzZSB1cGRhdGUgeW91ciBydW50aW1lIHRvIGEgbmV3ZXIgdmVyc2lvbiAoXCIrY29tcGlsZXJJbmZvWzFdK1wiKS5cIjtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH0sXG5cbiAgcHJvZ3JhbVdpdGhEZXB0aDogZnVuY3Rpb24oaSwgZm4sIGRhdGEgLyosICRkZXB0aCAqLykge1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAzKTtcblxuICAgIHZhciBwcm9ncmFtID0gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBbY29udGV4dCwgb3B0aW9ucy5kYXRhIHx8IGRhdGFdLmNvbmNhdChhcmdzKSk7XG4gICAgfTtcbiAgICBwcm9ncmFtLnByb2dyYW0gPSBpO1xuICAgIHByb2dyYW0uZGVwdGggPSBhcmdzLmxlbmd0aDtcbiAgICByZXR1cm4gcHJvZ3JhbTtcbiAgfSxcbiAgcHJvZ3JhbTogZnVuY3Rpb24oaSwgZm4sIGRhdGEpIHtcbiAgICB2YXIgcHJvZ3JhbSA9IGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgICByZXR1cm4gZm4oY29udGV4dCwgb3B0aW9ucy5kYXRhIHx8IGRhdGEpO1xuICAgIH07XG4gICAgcHJvZ3JhbS5wcm9ncmFtID0gaTtcbiAgICBwcm9ncmFtLmRlcHRoID0gMDtcbiAgICByZXR1cm4gcHJvZ3JhbTtcbiAgfSxcbiAgbm9vcDogZnVuY3Rpb24oKSB7IHJldHVybiBcIlwiOyB9LFxuICBpbnZva2VQYXJ0aWFsOiBmdW5jdGlvbihwYXJ0aWFsLCBuYW1lLCBjb250ZXh0LCBoZWxwZXJzLCBwYXJ0aWFscywgZGF0YSkge1xuICAgIHZhciBvcHRpb25zID0geyBoZWxwZXJzOiBoZWxwZXJzLCBwYXJ0aWFsczogcGFydGlhbHMsIGRhdGE6IGRhdGEgfTtcblxuICAgIGlmKHBhcnRpYWwgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEhhbmRsZWJhcnMuRXhjZXB0aW9uKFwiVGhlIHBhcnRpYWwgXCIgKyBuYW1lICsgXCIgY291bGQgbm90IGJlIGZvdW5kXCIpO1xuICAgIH0gZWxzZSBpZihwYXJ0aWFsIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgIHJldHVybiBwYXJ0aWFsKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSBpZiAoIUhhbmRsZWJhcnMuY29tcGlsZSkge1xuICAgICAgdGhyb3cgbmV3IEhhbmRsZWJhcnMuRXhjZXB0aW9uKFwiVGhlIHBhcnRpYWwgXCIgKyBuYW1lICsgXCIgY291bGQgbm90IGJlIGNvbXBpbGVkIHdoZW4gcnVubmluZyBpbiBydW50aW1lLW9ubHkgbW9kZVwiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGFydGlhbHNbbmFtZV0gPSBIYW5kbGViYXJzLmNvbXBpbGUocGFydGlhbCwge2RhdGE6IGRhdGEgIT09IHVuZGVmaW5lZH0pO1xuICAgICAgcmV0dXJuIHBhcnRpYWxzW25hbWVdKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH1cbiAgfVxufTtcblxuSGFuZGxlYmFycy50ZW1wbGF0ZSA9IEhhbmRsZWJhcnMuVk0udGVtcGxhdGU7XG5cbi8vIEVORChCUk9XU0VSKVxuXG5yZXR1cm4gSGFuZGxlYmFycztcblxufTtcbiIsImV4cG9ydHMuYXR0YWNoID0gZnVuY3Rpb24oSGFuZGxlYmFycykge1xuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG4vLyBCRUdJTihCUk9XU0VSKVxuXG52YXIgZXJyb3JQcm9wcyA9IFsnZGVzY3JpcHRpb24nLCAnZmlsZU5hbWUnLCAnbGluZU51bWJlcicsICdtZXNzYWdlJywgJ25hbWUnLCAnbnVtYmVyJywgJ3N0YWNrJ107XG5cbkhhbmRsZWJhcnMuRXhjZXB0aW9uID0gZnVuY3Rpb24obWVzc2FnZSkge1xuICB2YXIgdG1wID0gRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgLy8gVW5mb3J0dW5hdGVseSBlcnJvcnMgYXJlIG5vdCBlbnVtZXJhYmxlIGluIENocm9tZSAoYXQgbGVhc3QpLCBzbyBgZm9yIHByb3AgaW4gdG1wYCBkb2Vzbid0IHdvcmsuXG4gIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IGVycm9yUHJvcHMubGVuZ3RoOyBpZHgrKykge1xuICAgIHRoaXNbZXJyb3JQcm9wc1tpZHhdXSA9IHRtcFtlcnJvclByb3BzW2lkeF1dO1xuICB9XG59O1xuSGFuZGxlYmFycy5FeGNlcHRpb24ucHJvdG90eXBlID0gbmV3IEVycm9yKCk7XG5cbi8vIEJ1aWxkIG91dCBvdXIgYmFzaWMgU2FmZVN0cmluZyB0eXBlXG5IYW5kbGViYXJzLlNhZmVTdHJpbmcgPSBmdW5jdGlvbihzdHJpbmcpIHtcbiAgdGhpcy5zdHJpbmcgPSBzdHJpbmc7XG59O1xuSGFuZGxlYmFycy5TYWZlU3RyaW5nLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5zdHJpbmcudG9TdHJpbmcoKTtcbn07XG5cbnZhciBlc2NhcGUgPSB7XG4gIFwiJlwiOiBcIiZhbXA7XCIsXG4gIFwiPFwiOiBcIiZsdDtcIixcbiAgXCI+XCI6IFwiJmd0O1wiLFxuICAnXCInOiBcIiZxdW90O1wiLFxuICBcIidcIjogXCImI3gyNztcIixcbiAgXCJgXCI6IFwiJiN4NjA7XCJcbn07XG5cbnZhciBiYWRDaGFycyA9IC9bJjw+XCInYF0vZztcbnZhciBwb3NzaWJsZSA9IC9bJjw+XCInYF0vO1xuXG52YXIgZXNjYXBlQ2hhciA9IGZ1bmN0aW9uKGNocikge1xuICByZXR1cm4gZXNjYXBlW2Nocl0gfHwgXCImYW1wO1wiO1xufTtcblxuSGFuZGxlYmFycy5VdGlscyA9IHtcbiAgZXh0ZW5kOiBmdW5jdGlvbihvYmosIHZhbHVlKSB7XG4gICAgZm9yKHZhciBrZXkgaW4gdmFsdWUpIHtcbiAgICAgIGlmKHZhbHVlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgb2JqW2tleV0gPSB2YWx1ZVtrZXldO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBlc2NhcGVFeHByZXNzaW9uOiBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICAvLyBkb24ndCBlc2NhcGUgU2FmZVN0cmluZ3MsIHNpbmNlIHRoZXkncmUgYWxyZWFkeSBzYWZlXG4gICAgaWYgKHN0cmluZyBpbnN0YW5jZW9mIEhhbmRsZWJhcnMuU2FmZVN0cmluZykge1xuICAgICAgcmV0dXJuIHN0cmluZy50b1N0cmluZygpO1xuICAgIH0gZWxzZSBpZiAoc3RyaW5nID09IG51bGwgfHwgc3RyaW5nID09PSBmYWxzZSkge1xuICAgICAgcmV0dXJuIFwiXCI7XG4gICAgfVxuXG4gICAgLy8gRm9yY2UgYSBzdHJpbmcgY29udmVyc2lvbiBhcyB0aGlzIHdpbGwgYmUgZG9uZSBieSB0aGUgYXBwZW5kIHJlZ2FyZGxlc3MgYW5kXG4gICAgLy8gdGhlIHJlZ2V4IHRlc3Qgd2lsbCBkbyB0aGlzIHRyYW5zcGFyZW50bHkgYmVoaW5kIHRoZSBzY2VuZXMsIGNhdXNpbmcgaXNzdWVzIGlmXG4gICAgLy8gYW4gb2JqZWN0J3MgdG8gc3RyaW5nIGhhcyBlc2NhcGVkIGNoYXJhY3RlcnMgaW4gaXQuXG4gICAgc3RyaW5nID0gc3RyaW5nLnRvU3RyaW5nKCk7XG5cbiAgICBpZighcG9zc2libGUudGVzdChzdHJpbmcpKSB7IHJldHVybiBzdHJpbmc7IH1cbiAgICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoYmFkQ2hhcnMsIGVzY2FwZUNoYXIpO1xuICB9LFxuXG4gIGlzRW1wdHk6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgaWYgKCF2YWx1ZSAmJiB2YWx1ZSAhPT0gMCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmKHRvU3RyaW5nLmNhbGwodmFsdWUpID09PSBcIltvYmplY3QgQXJyYXldXCIgJiYgdmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxufTtcblxuLy8gRU5EKEJST1dTRVIpXG5cbnJldHVybiBIYW5kbGViYXJzO1xufTtcbiIsIi8qKlxuICogRXhwb3NlIGByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKWAuXG4gKi9cblxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZVxuICB8fCB3aW5kb3cud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lXG4gIHx8IHdpbmRvdy5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbiAgfHwgd2luZG93Lm9SZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbiAgfHwgd2luZG93Lm1zUmVxdWVzdEFuaW1hdGlvbkZyYW1lXG4gIHx8IGZhbGxiYWNrO1xuXG4vKipcbiAqIEZhbGxiYWNrIGltcGxlbWVudGF0aW9uLlxuICovXG5cbnZhciBwcmV2ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5mdW5jdGlvbiBmYWxsYmFjayhmbikge1xuICB2YXIgY3VyciA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICB2YXIgbXMgPSBNYXRoLm1heCgwLCAxNiAtIChjdXJyIC0gcHJldikpO1xuICB2YXIgcmVxID0gc2V0VGltZW91dChmbiwgbXMpO1xuICBwcmV2ID0gY3VycjtcbiAgcmV0dXJuIHJlcTtcbn1cblxuLyoqXG4gKiBDYW5jZWwuXG4gKi9cblxudmFyIGNhbmNlbCA9IHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZVxuICB8fCB3aW5kb3cud2Via2l0Q2FuY2VsQW5pbWF0aW9uRnJhbWVcbiAgfHwgd2luZG93Lm1vekNhbmNlbEFuaW1hdGlvbkZyYW1lXG4gIHx8IHdpbmRvdy5vQ2FuY2VsQW5pbWF0aW9uRnJhbWVcbiAgfHwgd2luZG93Lm1zQ2FuY2VsQW5pbWF0aW9uRnJhbWVcbiAgfHwgd2luZG93LmNsZWFyVGltZW91dDtcblxuZXhwb3J0cy5jYW5jZWwgPSBmdW5jdGlvbihpZCl7XG4gIGNhbmNlbC5jYWxsKHdpbmRvdywgaWQpO1xufTtcbiIsInZhciBiYXNlICAgICA9IHJlcXVpcmUoJy4vbGliL2Jhc2UnKTtcbnZhciB1dGlscyAgICA9IHJlcXVpcmUoJy4vbGliL3V0aWxzJyk7XG52YXIgcnVudGltZSAgPSByZXF1aXJlKCcuL2xpYi9ydW50aW1lJyk7XG5cbi8qKlxuICogR2VuZXJhdGUgdGhlIGJhc2UgRE9NQmFycyBvYmplY3QuXG4gKlxuICogQHJldHVybiB7T2JqZWN0fVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbiBjcmVhdGUgKCkge1xuICB2YXIgRE9NQmFycyA9IGJhc2UuY3JlYXRlKCk7XG5cbiAgdXRpbHMuYXR0YWNoKERPTUJhcnMpO1xuICBydW50aW1lLmF0dGFjaChET01CYXJzKTtcblxuICBET01CYXJzLmNyZWF0ZSA9IGNyZWF0ZTtcblxuICByZXR1cm4gRE9NQmFycztcbn0pKCk7XG4iXX0=
(9)
});
;