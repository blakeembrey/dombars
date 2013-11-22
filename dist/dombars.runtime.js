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


},{"handlebars/lib/handlebars/base":6}],2:[function(require,module,exports){
var process=require("__browserify_process");var runtime = require('handlebars/lib/handlebars/runtime');
var raf     = process.browser && require('raf-component');

/**
 * Attribute runtime features to the DOMBars instance.
 *
 * @param  {Object} DOMBars
 * @return {Object}
 */
exports.attach = function(DOMBars) {
  runtime.attach(DOMBars);

  /**
   * Bind a function to the animation frame.
   *
   * @param  {Function} fn
   * @return {Number}
   */
  DOMBars.VM.exec = function (fn) {
    return process.browser ? raf(fn) : process.nextTick(fn);
  };

  /**
   * Accepts a function that has subscriptions called inside and returns a new
   * function that will listen to all subscriptions and can update with any
   * changes.
   *
   * @param  {Function} fn
   * @return {Function}
   */
  DOMBars.VM.subscribe = function (fn) {
    /**
     * The returned subscription function takes care of aliasing the
     * subscriptions array correctly, subscribing for updates and triggering
     * updates when any of the subscriptions change.
     *
     * @return {*}
     */
    var subscriber = function () {
      // If we have a parent subscriber, link the subscribers together.
      if (DOMBars.VM.subscriber) {
        subscriber.parent = DOMBars.VM.subscriber;
        DOMBars.VM.subscriber.children[subscriber.cid] = subscriber;
      }

      // Alias subscriber functionality to the VM object.
      DOMBars.VM.subscriber  = subscriber;
      DOMBars.VM.unsubscribe = function (fn) {
        subscriber.unsubscriptions.push(fn);
      };

      var result = fn.apply(this, arguments);

      // Reset the VM functionality to what it was beforehand.
      DOMBars.VM.subscriber  = subscriber.parent;
      DOMBars.VM.unsubscribe = null;

      // Iterate over all the automatically added subscriptions and subscribe
      // using the built in subscription method.
      for (var i = 0; i < subscriber.subscriptions.length; i++) {
        var subscription = subscriber.subscriptions[i];
        DOMBars.subscribe(subscription[0], subscription[1], change);
      }

      return result;
    };

    // Keep an array of current subscriptions and an object with references
    // to child subscription functions.
    subscriber.cid             = 'subscriber' + DOMBars.Utils.uniqueId();
    subscriber.children        = {};
    subscriber.subscriptions   = [];
    subscriber.unsubscriptions = [];

    /**
     * Trigger this function with every change with the listeners.
     */
    var change = function () {
      subscriber.unsubscribe();

      DOMBars.VM.exec(function () {
        subscriber.update && subscriber.update(subscriber());
      });
    };

    /**
     * Remove the current subscriber from all listeners.
     */
    subscriber.unsubscribe = function () {
      // Remove all the automatic subscriptions from the view.
      while (subscriber.subscriptions.length) {
        var subscription = subscriber.subscriptions.pop();
        DOMBars.unsubscribe(subscription[0], subscription[1], change);
      }

      // Remove all manual unsubscribe functions.
      while (subscriber.unsubscriptions.length) {
        subscriber.unsubscriptions.pop()();
      }

      // Iterate through the registered children and remove their listeners.
      for (var child in subscriber.children) {
        subscriber.children[child].unsubscribe();
      }

      // Remove any references from the parent subscriber.
      if (subscriber.parent) {
        delete subscriber.parent.children[subscriber.cid];
        delete subscriber.parent;
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
    var subscription = DOMBars.VM.subscribe(fn);
    var node         = create(subscription());

    subscription.update = function (value) {
      node = DOMBars.Utils.replaceNode(create(value), node);
    };

    return node;
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
  DOMBars.VM.createElement = function (fn, cb) {
    var subscription = DOMBars.VM.subscribe(fn);
    var el           = DOMBars.Utils.createElement(subscription());

    subscription.update = function (value) {
      cb(el = DOMBars.Utils.copyAndReplaceNode(
          DOMBars.Utils.createElement(value), el
      ));
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
  DOMBars.VM.setAttribute = function (elementFn, nameFn, valueFn) {
    var nameSubscription  = DOMBars.VM.subscribe(nameFn);
    var valueSubscription = DOMBars.VM.subscribe(valueFn);

    // Keep track of the current name and value without having to re-run the
    // function every time something changes.
    var attrName  = nameSubscription();
    var attrValue = valueSubscription();

    nameSubscription.update = function (value) {
      DOMBars.Utils.removeAttribute(elementFn(), attrName);
      DOMBars.Utils.setAttribute(elementFn(), attrName = value, attrValue);
    };

    valueSubscription.update = function (value) {
      DOMBars.Utils.setAttribute(elementFn(), attrName, attrValue = value);
    };

    return DOMBars.Utils.setAttribute(elementFn(), attrName, attrValue);
  };

  /**
   * Create a DOM element and subscribe to any changes.
   *
   * @param  {Function} fn
   * @return {Node}
   */
  DOMBars.VM.createDOM = function (fn) {
    return subscribeNode(fn, DOMBars.Utils.domifyExpression);
  };

  /**
   * Create a text node and subscribe to any changes.
   *
   * @param  {Function} fn
   * @return {Text}
   */
  DOMBars.VM.createText = function (fn) {
    return subscribeNode(fn, DOMBars.Utils.textifyExpression);
  };

  /**
   * Create a comment node and subscribe to any changes.
   *
   * @param  {Function} fn
   * @return {Comment}
   */
  DOMBars.VM.createComment = function (fn) {
    return subscribeNode(fn, DOMBars.Utils.createComment);
  };

  /**
   * Generate an executable template from a template spec.
   *
   * @param  {Object}   templateSpec
   * @return {Function}
   */
  DOMBars.VM.template = DOMBars.template = function (templateSpec) {
    var DOMBars    = this;
    var subscriber = DOMBars.VM.subscribe(templateSpec);

    /**
     * The container object holds all the functions used by the template spec.
     *
     * @type {Object}
     */
    var container = {
      invokePartial:    DOMBars.VM.invokePartial,
      programs:         [],
      noop:             DOMBars.VM.noop,
      subscriber:       subscriber,
      compilerInfo:     null,
      appendChild:      DOMBars.Utils.appendChild,
      createDOM:        DOMBars.VM.createDOM,
      createText:       DOMBars.VM.createText,
      setAttribute:     DOMBars.VM.setAttribute,
      createComment:    DOMBars.VM.createComment,
      createElement:    DOMBars.VM.createElement,
      escapeExpression: DOMBars.Utils.escapeExpression,
      programWithDepth: DOMBars.VM.programWithDepth
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
        return DOMBars.VM.program(i, fn, data);
      }

      if (!programWrapper) {
        return this.programs[i] = DOMBars.VM.program(i, fn);
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
        DOMBars.Utils.extend(ret, common);
        DOMBars.Utils.extend(ret, param);
      }

      return ret;
    };

    /**
     * Get a property from an object.
     *
     * @param  {Object} object
     * @param  {String} property
     * @return {*}
     */
    container.get = function (object, property) {
      DOMBars.VM.subscriber.subscriptions.push([object, property]);

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

      var result = subscriber.call(
        container,
        DOMBars,
        context,
        options.helpers,
        options.partials,
        options.data
      );

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

      return result;
    };
  };

  return DOMBars;
};

},{"__browserify_process":4,"handlebars/lib/handlebars/runtime":7,"raf-component":9}],3:[function(require,module,exports){
var utils    = require('handlebars/lib/handlebars/utils');
var domify   = require('domify');
var uniqueId = 0;

/**
 * Attach reusable utility functions to the DOMBars instance.
 *
 * @param  {Object} DOMBars
 * @return {Object}
 */
exports.attach = function (DOMBars) {
  utils.attach(DOMBars);

  /**
   * Return a unique id.
   *
   * @return {Number}
   */
  DOMBars.Utils.uniqueId = function () {
    return uniqueId++;
  };

  /**
   * Check whether an object is actually a DOM node.
   *
   * @param  {*}       element
   * @return {Boolean}
   */
  DOMBars.Utils.isElement = function (element) {
    return element instanceof Node;
  };

  /**
   * Create an element from a tag name.
   *
   * @param  {String} tagName
   * @return {Node}
   */
  DOMBars.Utils.createElement = function (tagName) {
    return document.createElement(tagName);
  };

  /**
   * Create a comment node based on text contents.
   *
   * @param  {String} contents
   * @return {Node}
   */
  DOMBars.Utils.createComment = function (contents) {
    return document.createComment(contents);
  };

  /**
   * Replace a node in the DOM with a new node and return it.
   *
   * @param  {Node} newNode
   * @param  {Node} oldNode
   * @return {Node}
   */
  DOMBars.Utils.replaceNode = function (newNode, oldNode) {
    if (oldNode.parentNode) {
      oldNode.parentNode.replaceChild(newNode, oldNode);
    }

    return newNode;
  };

  /**
   * Copy all significant data from one element node to another.
   *
   * @param  {Node} newNode
   * @param  {Node} oldNode
   * @return {Node}
   */
  DOMBars.Utils.copyNode = function (newNode, oldNode) {
    // Move all child elements to the new node.
    while (oldNode.firstChild) {
      newNode.appendChild(oldNode.firstChild);
    }

    // Copy all the attributes to the new node.
    for (var i = 0; i < oldNode.attributes.length; i++) {
      var attribute = oldNode.attributes[i];
      newNode.setAttribute(attribute.name, attribute.value);
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
  DOMBars.Utils.copyAndReplaceNode = function (newNode, oldNode) {
    return DOMBars.Utils.replaceNode(
      DOMBars.Utils.copyNode(newNode, oldNode), oldNode
    );
  };

  /**
   * Set an attribute value on an element.
   *
   * @param {Node}   element
   * @param {String} name
   * @param {*}      value
   */
  DOMBars.Utils.setAttribute = function (element, name, value) {
    if (value === false) {
      return DOMBars.Utils.removeAttribute(element, name);
    }

    return element.setAttribute(name, value);
  };

  /**
   * Remove an attribute from an element.
   *
   * @param {Node}   element
   * @param {String} name
   */
  DOMBars.Utils.removeAttribute = function (element, name) {
    return element.removeAttribute(name);
  };

  /**
   * Append a child element to a DOM node.
   *
   * @param {Node} element
   * @param {Node} child
   */
  DOMBars.Utils.appendChild = function (element, child) {
    if (child == null) { return; }

    return element.appendChild(child);
  };

  /**
   * Transform a string into arbitrary DOM nodes.
   *
   * @param  {String} string
   * @return {Node}
   */
  DOMBars.Utils.domifyExpression = function (string) {
    if (string == null) {
      return document.createTextNode('');
    }

    if (DOMBars.Utils.isElement(string)) {
      return string;
    }

    try {
      return domify(string.toString());
    } catch (e) {
      return document.createTextNode(string);
    }
  };

  /**
   * Transform a string into a DOM text node for appending to the template.
   *
   * @param  {String} string
   * @return {Text}
   */
  DOMBars.Utils.textifyExpression = function (string) {
    if (string instanceof DOMBars.SafeString) {
      return DOMBars.Utils.domifyExpression(string.toString());
    }

    // Catch when the string is actually a DOM node and turn it into a string.
    if (DOMBars.Utils.isElement(string)) {
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

  return DOMBars;
};

},{"domify":5,"handlebars/lib/handlebars/utils":8}],4:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],5:[function(require,module,exports){

/**
 * Expose `parse`.
 */

module.exports = parse;

/**
 * Wrap map from jquery.
 */

var map = {
  option: [1, '<select multiple="multiple">', '</select>'],
  optgroup: [1, '<select multiple="multiple">', '</select>'],
  legend: [1, '<fieldset>', '</fieldset>'],
  thead: [1, '<table>', '</table>'],
  tbody: [1, '<table>', '</table>'],
  tfoot: [1, '<table>', '</table>'],
  colgroup: [1, '<table>', '</table>'],
  caption: [1, '<table>', '</table>'],
  tr: [2, '<table><tbody>', '</tbody></table>'],
  td: [3, '<table><tbody><tr>', '</tr></tbody></table>'],
  th: [3, '<table><tbody><tr>', '</tr></tbody></table>'],
  col: [2, '<table><tbody></tbody><colgroup>', '</colgroup></table>'],
  _default: [0, '', '']
};

/**
 * Parse `html` and return the children.
 *
 * @param {String} html
 * @return {Array}
 * @api private
 */

function parse(html) {
  if ('string' != typeof html) throw new TypeError('String expected');

  // tag name
  var m = /<([\w:]+)/.exec(html);
  if (!m) throw new Error('No elements were generated.');
  var tag = m[1];

  // body support
  if (tag == 'body') {
    var el = document.createElement('html');
    el.innerHTML = html;
    return el.removeChild(el.lastChild);
  }

  // wrap map
  var wrap = map[tag] || map._default;
  var depth = wrap[0];
  var prefix = wrap[1];
  var suffix = wrap[2];
  var el = document.createElement('div');
  el.innerHTML = prefix + html + suffix;
  while (depth--) el = el.lastChild;

  var els = el.children;
  if (1 == els.length) {
    return el.removeChild(els[0]);
  }

  var fragment = document.createDocumentFragment();
  while (els.length) {
    fragment.appendChild(el.removeChild(els[0]));
  }

  return fragment;
}

},{}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){
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

},{}],9:[function(require,module,exports){

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
  setTimeout(fn, ms);
  prev = curr;
}

/**
 * Cancel.
 */

var cancel = window.cancelAnimationFrame
  || window.webkitCancelAnimationFrame
  || window.mozCancelAnimationFrame
  || window.oCancelAnimationFrame
  || window.msCancelAnimationFrame;

exports.cancel = function(id){
  cancel.call(window, id);
};

},{}],10:[function(require,module,exports){
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

},{"./lib/base":1,"./lib/runtime":2,"./lib/utils":3}]},{},[10])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvYmFzZS5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi9ydW50aW1lLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbGliL3V0aWxzLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2luc2VydC1tb2R1bGUtZ2xvYmFscy9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2RvbWlmeS9pbmRleC5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2Jhc2UuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9ydW50aW1lLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvdXRpbHMuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvcmFmLWNvbXBvbmVudC9pbmRleC5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL3J1bnRpbWUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgYmFzZSA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvYmFzZScpO1xuXG5leHBvcnRzLmNyZWF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIERPTUJhcnMgPSBiYXNlLmNyZWF0ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gIC8qKlxuICAgKiBOb29wIGZ1bmN0aW9ucyBmb3Igc3Vic2NyaWJlIGFuZCB1bnN1YnNjcmliZS4gSW1wbGVtZW50IHlvdXIgb3duIGZ1bmN0aW9uLlxuICAgKi9cbiAgRE9NQmFycy5zdWJzY3JpYmUgPSBET01CYXJzLnVuc3Vic2NyaWJlID0gZnVuY3Rpb24gKCkge307XG5cbiAgLyoqXG4gICAqIEJhc2ljIGdldHRlciBmdW5jdGlvbi4gQXR0YWNoIHRoaXMgaG93ZXZlciB5b3Ugd2FudCBpdCB0byB3b3JrLlxuICAgKlxuICAgKiBAcGFyYW0gIHtPYmplY3R9IG9iamVjdFxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IHByb3BlcnR5XG4gICAqIEByZXR1cm4geyp9XG4gICAqL1xuICBET01CYXJzLmdldCA9IGZ1bmN0aW9uIChvYmplY3QsIHByb3BlcnR5KSB7XG4gICAgcmV0dXJuIG9iamVjdFtwcm9wZXJ0eV07XG4gIH07XG5cbiAgLyoqXG4gICAqIEhhbmRsZWJhcnMgYGVhY2hgIGhlbHBlciBpcyBpbmNvbXBhdGliYWJsZSB3aXRoIERPTUJhcnMsIHNpbmNlIGl0IGFzc3VtZXNcbiAgICogc3RyaW5ncyAoYXMgb3Bwb3NlZCB0byBkb2N1bWVudCBmcmFnbWVudHMpLlxuICAgKlxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGNvbnRleHRcbiAgICogQHBhcmFtICB7T2JqZWN0fSBvcHRpb25zXG4gICAqIEByZXR1cm4ge05vZGV9XG4gICAqL1xuICBET01CYXJzLnJlZ2lzdGVySGVscGVyKCdlYWNoJywgZnVuY3Rpb24gKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICB2YXIgZm4gICAgICA9IG9wdGlvbnMuZm47XG4gICAgdmFyIGludmVyc2UgPSBvcHRpb25zLmludmVyc2U7XG4gICAgdmFyIGJ1ZmZlciAgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgdmFyIGkgICAgICAgPSAwO1xuICAgIHZhciBkYXRhO1xuXG4gICAgaWYgKHR5cGVvZiBjb250ZXh0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmRhdGEpIHtcbiAgICAgIGRhdGEgPSBET01CYXJzLmNyZWF0ZUZyYW1lKG9wdGlvbnMuZGF0YSk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBjb250ZXh0ID09PSAnb2JqZWN0Jykge1xuICAgICAgdmFyIGxlbiA9IGNvbnRleHQubGVuZ3RoO1xuXG4gICAgICBpZiAobGVuID09PSArbGVuKSB7XG4gICAgICAgIGZvciAoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICBpZiAoZGF0YSkgeyBkYXRhLmluZGV4ID0gaTsgfVxuICAgICAgICAgIGJ1ZmZlci5hcHBlbmRDaGlsZChmbihjb250ZXh0W2ldLCB7IGRhdGE6IGRhdGEgfSkpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gY29udGV4dCkge1xuICAgICAgICAgIGlmIChjb250ZXh0Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgIGlmIChkYXRhKSB7IGRhdGEua2V5ID0ga2V5OyB9XG4gICAgICAgICAgICBidWZmZXIuYXBwZW5kQ2hpbGQoZm4oY29udGV4dFtrZXldLCB7IGRhdGE6IGRhdGEgfSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChpID09PSAwKSB7XG4gICAgICByZXR1cm4gaW52ZXJzZSh0aGlzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYnVmZmVyO1xuICB9KTtcblxuICByZXR1cm4gRE9NQmFycztcbn07XG5cbiIsInZhciBwcm9jZXNzPXJlcXVpcmUoXCJfX2Jyb3dzZXJpZnlfcHJvY2Vzc1wiKTt2YXIgcnVudGltZSA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvcnVudGltZScpO1xudmFyIHJhZiAgICAgPSBwcm9jZXNzLmJyb3dzZXIgJiYgcmVxdWlyZSgncmFmLWNvbXBvbmVudCcpO1xuXG4vKipcbiAqIEF0dHJpYnV0ZSBydW50aW1lIGZlYXR1cmVzIHRvIHRoZSBET01CYXJzIGluc3RhbmNlLlxuICpcbiAqIEBwYXJhbSAge09iamVjdH0gRE9NQmFyc1xuICogQHJldHVybiB7T2JqZWN0fVxuICovXG5leHBvcnRzLmF0dGFjaCA9IGZ1bmN0aW9uKERPTUJhcnMpIHtcbiAgcnVudGltZS5hdHRhY2goRE9NQmFycyk7XG5cbiAgLyoqXG4gICAqIEJpbmQgYSBmdW5jdGlvbiB0byB0aGUgYW5pbWF0aW9uIGZyYW1lLlxuICAgKlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAgICogQHJldHVybiB7TnVtYmVyfVxuICAgKi9cbiAgRE9NQmFycy5WTS5leGVjID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgcmV0dXJuIHByb2Nlc3MuYnJvd3NlciA/IHJhZihmbikgOiBwcm9jZXNzLm5leHRUaWNrKGZuKTtcbiAgfTtcblxuICAvKipcbiAgICogQWNjZXB0cyBhIGZ1bmN0aW9uIHRoYXQgaGFzIHN1YnNjcmlwdGlvbnMgY2FsbGVkIGluc2lkZSBhbmQgcmV0dXJucyBhIG5ld1xuICAgKiBmdW5jdGlvbiB0aGF0IHdpbGwgbGlzdGVuIHRvIGFsbCBzdWJzY3JpcHRpb25zIGFuZCBjYW4gdXBkYXRlIHdpdGggYW55XG4gICAqIGNoYW5nZXMuXG4gICAqXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICAgKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAgICovXG4gIERPTUJhcnMuVk0uc3Vic2NyaWJlID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgLyoqXG4gICAgICogVGhlIHJldHVybmVkIHN1YnNjcmlwdGlvbiBmdW5jdGlvbiB0YWtlcyBjYXJlIG9mIGFsaWFzaW5nIHRoZVxuICAgICAqIHN1YnNjcmlwdGlvbnMgYXJyYXkgY29ycmVjdGx5LCBzdWJzY3JpYmluZyBmb3IgdXBkYXRlcyBhbmQgdHJpZ2dlcmluZ1xuICAgICAqIHVwZGF0ZXMgd2hlbiBhbnkgb2YgdGhlIHN1YnNjcmlwdGlvbnMgY2hhbmdlLlxuICAgICAqXG4gICAgICogQHJldHVybiB7Kn1cbiAgICAgKi9cbiAgICB2YXIgc3Vic2NyaWJlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIC8vIElmIHdlIGhhdmUgYSBwYXJlbnQgc3Vic2NyaWJlciwgbGluayB0aGUgc3Vic2NyaWJlcnMgdG9nZXRoZXIuXG4gICAgICBpZiAoRE9NQmFycy5WTS5zdWJzY3JpYmVyKSB7XG4gICAgICAgIHN1YnNjcmliZXIucGFyZW50ID0gRE9NQmFycy5WTS5zdWJzY3JpYmVyO1xuICAgICAgICBET01CYXJzLlZNLnN1YnNjcmliZXIuY2hpbGRyZW5bc3Vic2NyaWJlci5jaWRdID0gc3Vic2NyaWJlcjtcbiAgICAgIH1cblxuICAgICAgLy8gQWxpYXMgc3Vic2NyaWJlciBmdW5jdGlvbmFsaXR5IHRvIHRoZSBWTSBvYmplY3QuXG4gICAgICBET01CYXJzLlZNLnN1YnNjcmliZXIgID0gc3Vic2NyaWJlcjtcbiAgICAgIERPTUJhcnMuVk0udW5zdWJzY3JpYmUgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgc3Vic2NyaWJlci51bnN1YnNjcmlwdGlvbnMucHVzaChmbik7XG4gICAgICB9O1xuXG4gICAgICB2YXIgcmVzdWx0ID0gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgICAgLy8gUmVzZXQgdGhlIFZNIGZ1bmN0aW9uYWxpdHkgdG8gd2hhdCBpdCB3YXMgYmVmb3JlaGFuZC5cbiAgICAgIERPTUJhcnMuVk0uc3Vic2NyaWJlciAgPSBzdWJzY3JpYmVyLnBhcmVudDtcbiAgICAgIERPTUJhcnMuVk0udW5zdWJzY3JpYmUgPSBudWxsO1xuXG4gICAgICAvLyBJdGVyYXRlIG92ZXIgYWxsIHRoZSBhdXRvbWF0aWNhbGx5IGFkZGVkIHN1YnNjcmlwdGlvbnMgYW5kIHN1YnNjcmliZVxuICAgICAgLy8gdXNpbmcgdGhlIGJ1aWx0IGluIHN1YnNjcmlwdGlvbiBtZXRob2QuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN1YnNjcmliZXIuc3Vic2NyaXB0aW9ucy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgc3Vic2NyaXB0aW9uID0gc3Vic2NyaWJlci5zdWJzY3JpcHRpb25zW2ldO1xuICAgICAgICBET01CYXJzLnN1YnNjcmliZShzdWJzY3JpcHRpb25bMF0sIHN1YnNjcmlwdGlvblsxXSwgY2hhbmdlKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuXG4gICAgLy8gS2VlcCBhbiBhcnJheSBvZiBjdXJyZW50IHN1YnNjcmlwdGlvbnMgYW5kIGFuIG9iamVjdCB3aXRoIHJlZmVyZW5jZXNcbiAgICAvLyB0byBjaGlsZCBzdWJzY3JpcHRpb24gZnVuY3Rpb25zLlxuICAgIHN1YnNjcmliZXIuY2lkICAgICAgICAgICAgID0gJ3N1YnNjcmliZXInICsgRE9NQmFycy5VdGlscy51bmlxdWVJZCgpO1xuICAgIHN1YnNjcmliZXIuY2hpbGRyZW4gICAgICAgID0ge307XG4gICAgc3Vic2NyaWJlci5zdWJzY3JpcHRpb25zICAgPSBbXTtcbiAgICBzdWJzY3JpYmVyLnVuc3Vic2NyaXB0aW9ucyA9IFtdO1xuXG4gICAgLyoqXG4gICAgICogVHJpZ2dlciB0aGlzIGZ1bmN0aW9uIHdpdGggZXZlcnkgY2hhbmdlIHdpdGggdGhlIGxpc3RlbmVycy5cbiAgICAgKi9cbiAgICB2YXIgY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgc3Vic2NyaWJlci51bnN1YnNjcmliZSgpO1xuXG4gICAgICBET01CYXJzLlZNLmV4ZWMoZnVuY3Rpb24gKCkge1xuICAgICAgICBzdWJzY3JpYmVyLnVwZGF0ZSAmJiBzdWJzY3JpYmVyLnVwZGF0ZShzdWJzY3JpYmVyKCkpO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlbW92ZSB0aGUgY3VycmVudCBzdWJzY3JpYmVyIGZyb20gYWxsIGxpc3RlbmVycy5cbiAgICAgKi9cbiAgICBzdWJzY3JpYmVyLnVuc3Vic2NyaWJlID0gZnVuY3Rpb24gKCkge1xuICAgICAgLy8gUmVtb3ZlIGFsbCB0aGUgYXV0b21hdGljIHN1YnNjcmlwdGlvbnMgZnJvbSB0aGUgdmlldy5cbiAgICAgIHdoaWxlIChzdWJzY3JpYmVyLnN1YnNjcmlwdGlvbnMubGVuZ3RoKSB7XG4gICAgICAgIHZhciBzdWJzY3JpcHRpb24gPSBzdWJzY3JpYmVyLnN1YnNjcmlwdGlvbnMucG9wKCk7XG4gICAgICAgIERPTUJhcnMudW5zdWJzY3JpYmUoc3Vic2NyaXB0aW9uWzBdLCBzdWJzY3JpcHRpb25bMV0sIGNoYW5nZSk7XG4gICAgICB9XG5cbiAgICAgIC8vIFJlbW92ZSBhbGwgbWFudWFsIHVuc3Vic2NyaWJlIGZ1bmN0aW9ucy5cbiAgICAgIHdoaWxlIChzdWJzY3JpYmVyLnVuc3Vic2NyaXB0aW9ucy5sZW5ndGgpIHtcbiAgICAgICAgc3Vic2NyaWJlci51bnN1YnNjcmlwdGlvbnMucG9wKCkoKTtcbiAgICAgIH1cblxuICAgICAgLy8gSXRlcmF0ZSB0aHJvdWdoIHRoZSByZWdpc3RlcmVkIGNoaWxkcmVuIGFuZCByZW1vdmUgdGhlaXIgbGlzdGVuZXJzLlxuICAgICAgZm9yICh2YXIgY2hpbGQgaW4gc3Vic2NyaWJlci5jaGlsZHJlbikge1xuICAgICAgICBzdWJzY3JpYmVyLmNoaWxkcmVuW2NoaWxkXS51bnN1YnNjcmliZSgpO1xuICAgICAgfVxuXG4gICAgICAvLyBSZW1vdmUgYW55IHJlZmVyZW5jZXMgZnJvbSB0aGUgcGFyZW50IHN1YnNjcmliZXIuXG4gICAgICBpZiAoc3Vic2NyaWJlci5wYXJlbnQpIHtcbiAgICAgICAgZGVsZXRlIHN1YnNjcmliZXIucGFyZW50LmNoaWxkcmVuW3N1YnNjcmliZXIuY2lkXTtcbiAgICAgICAgZGVsZXRlIHN1YnNjcmliZXIucGFyZW50O1xuICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gc3Vic2NyaWJlcjtcbn07XG5cbiAgLyoqXG4gICAqIFJlbmRlciBhbmQgc3Vic2NyaWJlIGEgc2luZ2xlIERPTSBub2RlIHVzaW5nIGEgY3VzdG9tIGNyZWF0aW9uIGZ1bmN0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGNyZWF0ZVxuICAgKiBAcmV0dXJuIHtOb2RlfVxuICAgKi9cbiAgdmFyIHN1YnNjcmliZU5vZGUgPSBmdW5jdGlvbiAoZm4sIGNyZWF0ZSkge1xuICAgIHZhciBzdWJzY3JpcHRpb24gPSBET01CYXJzLlZNLnN1YnNjcmliZShmbik7XG4gICAgdmFyIG5vZGUgICAgICAgICA9IGNyZWF0ZShzdWJzY3JpcHRpb24oKSk7XG5cbiAgICBzdWJzY3JpcHRpb24udXBkYXRlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICBub2RlID0gRE9NQmFycy5VdGlscy5yZXBsYWNlTm9kZShjcmVhdGUodmFsdWUpLCBub2RlKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIG5vZGU7XG4gIH07XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBlbGVtZW50IGFuZCBzdWJzY3JpYmUgdG8gYW55IGNoYW5nZXMuIFRoaXMgbWV0aG9kIHJlcXVpcmVzIGFcbiAgICogY2FsbGJhY2sgZnVuY3Rpb24gZm9yIGFueSBlbGVtZW50IGNoYW5nZXMgc2luY2UgeW91IGNhbid0IGNoYW5nZSBhIHRhZ1xuICAgKiBuYW1lIGluIHBsYWNlLlxuICAgKlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGNiXG4gICAqIEByZXR1cm4ge0VsZW1lbnR9XG4gICAqL1xuICBET01CYXJzLlZNLmNyZWF0ZUVsZW1lbnQgPSBmdW5jdGlvbiAoZm4sIGNiKSB7XG4gICAgdmFyIHN1YnNjcmlwdGlvbiA9IERPTUJhcnMuVk0uc3Vic2NyaWJlKGZuKTtcbiAgICB2YXIgZWwgICAgICAgICAgID0gRE9NQmFycy5VdGlscy5jcmVhdGVFbGVtZW50KHN1YnNjcmlwdGlvbigpKTtcblxuICAgIHN1YnNjcmlwdGlvbi51cGRhdGUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIGNiKGVsID0gRE9NQmFycy5VdGlscy5jb3B5QW5kUmVwbGFjZU5vZGUoXG4gICAgICAgICAgRE9NQmFycy5VdGlscy5jcmVhdGVFbGVtZW50KHZhbHVlKSwgZWxcbiAgICAgICkpO1xuICAgIH07XG5cbiAgICByZXR1cm4gZWw7XG4gIH07XG5cbiAgLyoqXG4gICAqIFNldCBhbiBlbGVtZW50cyBhdHRyaWJ1dGUuIFdlIGFjY2VwdCB0aGUgY3VycmVudCBlbGVtZW50IGEgZnVuY3Rpb25cbiAgICogYmVjYXVzZSB3aGVuIGEgdGFnIG5hbWUgY2hhbmdlcyB3ZSB3aWxsIGxvc2UgcmVmZXJlbmNlIHRvIHRoZSBhY3RpdmVseVxuICAgKiByZW5kZXJlZCBlbGVtZW50LlxuICAgKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBlbGVtZW50Rm5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gbmFtZUZuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IHZhbHVlRm5cbiAgICovXG4gIERPTUJhcnMuVk0uc2V0QXR0cmlidXRlID0gZnVuY3Rpb24gKGVsZW1lbnRGbiwgbmFtZUZuLCB2YWx1ZUZuKSB7XG4gICAgdmFyIG5hbWVTdWJzY3JpcHRpb24gID0gRE9NQmFycy5WTS5zdWJzY3JpYmUobmFtZUZuKTtcbiAgICB2YXIgdmFsdWVTdWJzY3JpcHRpb24gPSBET01CYXJzLlZNLnN1YnNjcmliZSh2YWx1ZUZuKTtcblxuICAgIC8vIEtlZXAgdHJhY2sgb2YgdGhlIGN1cnJlbnQgbmFtZSBhbmQgdmFsdWUgd2l0aG91dCBoYXZpbmcgdG8gcmUtcnVuIHRoZVxuICAgIC8vIGZ1bmN0aW9uIGV2ZXJ5IHRpbWUgc29tZXRoaW5nIGNoYW5nZXMuXG4gICAgdmFyIGF0dHJOYW1lICA9IG5hbWVTdWJzY3JpcHRpb24oKTtcbiAgICB2YXIgYXR0clZhbHVlID0gdmFsdWVTdWJzY3JpcHRpb24oKTtcblxuICAgIG5hbWVTdWJzY3JpcHRpb24udXBkYXRlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICBET01CYXJzLlV0aWxzLnJlbW92ZUF0dHJpYnV0ZShlbGVtZW50Rm4oKSwgYXR0ck5hbWUpO1xuICAgICAgRE9NQmFycy5VdGlscy5zZXRBdHRyaWJ1dGUoZWxlbWVudEZuKCksIGF0dHJOYW1lID0gdmFsdWUsIGF0dHJWYWx1ZSk7XG4gICAgfTtcblxuICAgIHZhbHVlU3Vic2NyaXB0aW9uLnVwZGF0ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgRE9NQmFycy5VdGlscy5zZXRBdHRyaWJ1dGUoZWxlbWVudEZuKCksIGF0dHJOYW1lLCBhdHRyVmFsdWUgPSB2YWx1ZSk7XG4gICAgfTtcblxuICAgIHJldHVybiBET01CYXJzLlV0aWxzLnNldEF0dHJpYnV0ZShlbGVtZW50Rm4oKSwgYXR0ck5hbWUsIGF0dHJWYWx1ZSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIERPTSBlbGVtZW50IGFuZCBzdWJzY3JpYmUgdG8gYW55IGNoYW5nZXMuXG4gICAqXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICAgKiBAcmV0dXJuIHtOb2RlfVxuICAgKi9cbiAgRE9NQmFycy5WTS5jcmVhdGVET00gPSBmdW5jdGlvbiAoZm4pIHtcbiAgICByZXR1cm4gc3Vic2NyaWJlTm9kZShmbiwgRE9NQmFycy5VdGlscy5kb21pZnlFeHByZXNzaW9uKTtcbiAgfTtcblxuICAvKipcbiAgICogQ3JlYXRlIGEgdGV4dCBub2RlIGFuZCBzdWJzY3JpYmUgdG8gYW55IGNoYW5nZXMuXG4gICAqXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICAgKiBAcmV0dXJuIHtUZXh0fVxuICAgKi9cbiAgRE9NQmFycy5WTS5jcmVhdGVUZXh0ID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgcmV0dXJuIHN1YnNjcmliZU5vZGUoZm4sIERPTUJhcnMuVXRpbHMudGV4dGlmeUV4cHJlc3Npb24pO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBjb21tZW50IG5vZGUgYW5kIHN1YnNjcmliZSB0byBhbnkgY2hhbmdlcy5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gICAqIEByZXR1cm4ge0NvbW1lbnR9XG4gICAqL1xuICBET01CYXJzLlZNLmNyZWF0ZUNvbW1lbnQgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICByZXR1cm4gc3Vic2NyaWJlTm9kZShmbiwgRE9NQmFycy5VdGlscy5jcmVhdGVDb21tZW50KTtcbiAgfTtcblxuICAvKipcbiAgICogR2VuZXJhdGUgYW4gZXhlY3V0YWJsZSB0ZW1wbGF0ZSBmcm9tIGEgdGVtcGxhdGUgc3BlYy5cbiAgICpcbiAgICogQHBhcmFtICB7T2JqZWN0fSAgIHRlbXBsYXRlU3BlY1xuICAgKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAgICovXG4gIERPTUJhcnMuVk0udGVtcGxhdGUgPSBET01CYXJzLnRlbXBsYXRlID0gZnVuY3Rpb24gKHRlbXBsYXRlU3BlYykge1xuICAgIHZhciBET01CYXJzICAgID0gdGhpcztcbiAgICB2YXIgc3Vic2NyaWJlciA9IERPTUJhcnMuVk0uc3Vic2NyaWJlKHRlbXBsYXRlU3BlYyk7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgY29udGFpbmVyIG9iamVjdCBob2xkcyBhbGwgdGhlIGZ1bmN0aW9ucyB1c2VkIGJ5IHRoZSB0ZW1wbGF0ZSBzcGVjLlxuICAgICAqXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICB2YXIgY29udGFpbmVyID0ge1xuICAgICAgaW52b2tlUGFydGlhbDogICAgRE9NQmFycy5WTS5pbnZva2VQYXJ0aWFsLFxuICAgICAgcHJvZ3JhbXM6ICAgICAgICAgW10sXG4gICAgICBub29wOiAgICAgICAgICAgICBET01CYXJzLlZNLm5vb3AsXG4gICAgICBzdWJzY3JpYmVyOiAgICAgICBzdWJzY3JpYmVyLFxuICAgICAgY29tcGlsZXJJbmZvOiAgICAgbnVsbCxcbiAgICAgIGFwcGVuZENoaWxkOiAgICAgIERPTUJhcnMuVXRpbHMuYXBwZW5kQ2hpbGQsXG4gICAgICBjcmVhdGVET006ICAgICAgICBET01CYXJzLlZNLmNyZWF0ZURPTSxcbiAgICAgIGNyZWF0ZVRleHQ6ICAgICAgIERPTUJhcnMuVk0uY3JlYXRlVGV4dCxcbiAgICAgIHNldEF0dHJpYnV0ZTogICAgIERPTUJhcnMuVk0uc2V0QXR0cmlidXRlLFxuICAgICAgY3JlYXRlQ29tbWVudDogICAgRE9NQmFycy5WTS5jcmVhdGVDb21tZW50LFxuICAgICAgY3JlYXRlRWxlbWVudDogICAgRE9NQmFycy5WTS5jcmVhdGVFbGVtZW50LFxuICAgICAgZXNjYXBlRXhwcmVzc2lvbjogRE9NQmFycy5VdGlscy5lc2NhcGVFeHByZXNzaW9uLFxuICAgICAgcHJvZ3JhbVdpdGhEZXB0aDogRE9NQmFycy5WTS5wcm9ncmFtV2l0aERlcHRoXG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhbmQgcmV0dXJuIGEgcHJvZ3JhbSBzaW5nbGV0b24gYmFzZWQgb24gaW5kZXguXG4gICAgICpcbiAgICAgKiBAcGFyYW0gIHtOdW1iZXJ9ICAgaVxuICAgICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICAgICAqIEBwYXJhbSAge09iamVjdH0gICBkYXRhXG4gICAgICogQHJldHVybiB7RnVuY3Rpb259XG4gICAgICovXG4gICAgY29udGFpbmVyLnByb2dyYW0gPSBmdW5jdGlvbiAoaSwgZm4sIGRhdGEpIHtcbiAgICAgIHZhciBwcm9ncmFtV3JhcHBlciA9IHRoaXMucHJvZ3JhbXNbaV07XG5cbiAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgIHJldHVybiBET01CYXJzLlZNLnByb2dyYW0oaSwgZm4sIGRhdGEpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXByb2dyYW1XcmFwcGVyKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnByb2dyYW1zW2ldID0gRE9NQmFycy5WTS5wcm9ncmFtKGksIGZuKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHByb2dyYW1XcmFwcGVyO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBNZXJnZSB0d28gb2JqZWN0cyBpbnRvIGEgc2luZ2xlIG9iamVjdC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSAge09iamVjdH0gcGFyYW1cbiAgICAgKiBAcGFyYW0gIHtPYmplY3R9IGNvbW1vblxuICAgICAqIEByZXR1cm4ge09iamVjdH1cbiAgICAgKi9cbiAgICBjb250YWluZXIubWVyZ2UgPSBmdW5jdGlvbiAocGFyYW0sIGNvbW1vbikge1xuICAgICAgdmFyIHJldCA9IHBhcmFtIHx8IGNvbW1vbjtcblxuICAgICAgaWYgKHBhcmFtICYmIGNvbW1vbikge1xuICAgICAgICByZXQgPSB7fTtcbiAgICAgICAgRE9NQmFycy5VdGlscy5leHRlbmQocmV0LCBjb21tb24pO1xuICAgICAgICBET01CYXJzLlV0aWxzLmV4dGVuZChyZXQsIHBhcmFtKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJldDtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogR2V0IGEgcHJvcGVydHkgZnJvbSBhbiBvYmplY3QuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gIHtPYmplY3R9IG9iamVjdFxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gcHJvcGVydHlcbiAgICAgKiBAcmV0dXJuIHsqfVxuICAgICAqL1xuICAgIGNvbnRhaW5lci5nZXQgPSBmdW5jdGlvbiAob2JqZWN0LCBwcm9wZXJ0eSkge1xuICAgICAgRE9NQmFycy5WTS5zdWJzY3JpYmVyLnN1YnNjcmlwdGlvbnMucHVzaChbb2JqZWN0LCBwcm9wZXJ0eV0pO1xuXG4gICAgICByZXR1cm4gRE9NQmFycy5nZXQob2JqZWN0LCBwcm9wZXJ0eSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybiB0aGUgY29tcGlsZWQgSmF2YVNjcmlwdCBmdW5jdGlvbiBmb3IgZXhlY3V0aW9uLlxuICAgICAqXG4gICAgICogQHBhcmFtICB7T2JqZWN0fSBjb250ZXh0XG4gICAgICogQHBhcmFtICB7T2JqZWN0fSBvcHRpb25zXG4gICAgICogQHJldHVybiB7Tm9kZX1cbiAgICAgKi9cbiAgICByZXR1cm4gZnVuY3Rpb24gKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgICB2YXIgcmVzdWx0ID0gc3Vic2NyaWJlci5jYWxsKFxuICAgICAgICBjb250YWluZXIsXG4gICAgICAgIERPTUJhcnMsXG4gICAgICAgIGNvbnRleHQsXG4gICAgICAgIG9wdGlvbnMuaGVscGVycyxcbiAgICAgICAgb3B0aW9ucy5wYXJ0aWFscyxcbiAgICAgICAgb3B0aW9ucy5kYXRhXG4gICAgICApO1xuXG4gICAgICAvLyBBdHRhY2ggYW4gYHVuc3Vic2NyaWJlYCBmdW5jdGlvbiB0byB0aGUgcmVzdWx0aW5nIERPTS5cbiAgICAgIC8vIFRPRE86IENvbWUgdXAgd2l0aCBhbiBpbXByb3ZlZCBzb2x1dGlvbi5cbiAgICAgIHJlc3VsdC51bnN1YnNjcmliZSA9IHN1YnNjcmliZXIudW5zdWJzY3JpYmU7XG5cbiAgICAgIHZhciBjb21waWxlckluZm8gICAgID0gY29udGFpbmVyLmNvbXBpbGVySW5mbyB8fCBbXTtcbiAgICAgIHZhciBjb21waWxlclJldmlzaW9uID0gY29tcGlsZXJJbmZvWzBdIHx8IDE7XG4gICAgICB2YXIgY3VycmVudFJldmlzaW9uICA9IERPTUJhcnMuQ09NUElMRVJfUkVWSVNJT047XG5cbiAgICAgIGlmIChjb21waWxlclJldmlzaW9uICE9PSBjdXJyZW50UmV2aXNpb24pIHtcbiAgICAgICAgaWYgKGNvbXBpbGVyUmV2aXNpb24gPCBjdXJyZW50UmV2aXNpb24pIHtcbiAgICAgICAgICB2YXIgcnVudGltZVZlcnNpb25zICA9IERPTUJhcnMuUkVWSVNJT05fQ0hBTkdFU1tjdXJyZW50UmV2aXNpb25dO1xuICAgICAgICAgIHZhciBjb21waWxlclZlcnNpb25zID0gRE9NQmFycy5SRVZJU0lPTl9DSEFOR0VTW2NvbXBpbGVyUmV2aXNpb25dO1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVGVtcGxhdGUgd2FzIHByZWNvbXBpbGVkIHdpdGggYW4gb2xkZXIgdmVyc2lvbiBvZiAnICtcbiAgICAgICAgICAgICdET01CYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gUGxlYXNlIHVwZGF0ZSB5b3VyIHByZWNvbXBpbGVyJyArXG4gICAgICAgICAgICAnIHRvIGEgbmV3ZXIgdmVyc2lvbiAoJyArIHJ1bnRpbWVWZXJzaW9ucyArICcpIG9yIGRvd25ncmFkZSB5b3VyICcgK1xuICAgICAgICAgICAgJ3J1bnRpbWUgdG8gYW4gb2xkZXIgdmVyc2lvbiAoJyArIGNvbXBpbGVyVmVyc2lvbnMgKyAnKScpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhIG5ld2VyIHZlcnNpb24gb2YnICtcbiAgICAgICAgICAnRE9NQmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuIFBsZWFzZSB1cGRhdGUgeW91ciBydW50aW1lIHRvICcgK1xuICAgICAgICAgICdhIG5ld2VyIHZlcnNpb24gKCcgKyBjb21waWxlckluZm9bMV0gKyAnKScpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH07XG5cbiAgcmV0dXJuIERPTUJhcnM7XG59O1xuIiwidmFyIHV0aWxzICAgID0gcmVxdWlyZSgnaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy91dGlscycpO1xudmFyIGRvbWlmeSAgID0gcmVxdWlyZSgnZG9taWZ5Jyk7XG52YXIgdW5pcXVlSWQgPSAwO1xuXG4vKipcbiAqIEF0dGFjaCByZXVzYWJsZSB1dGlsaXR5IGZ1bmN0aW9ucyB0byB0aGUgRE9NQmFycyBpbnN0YW5jZS5cbiAqXG4gKiBAcGFyYW0gIHtPYmplY3R9IERPTUJhcnNcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xuZXhwb3J0cy5hdHRhY2ggPSBmdW5jdGlvbiAoRE9NQmFycykge1xuICB1dGlscy5hdHRhY2goRE9NQmFycyk7XG5cbiAgLyoqXG4gICAqIFJldHVybiBhIHVuaXF1ZSBpZC5cbiAgICpcbiAgICogQHJldHVybiB7TnVtYmVyfVxuICAgKi9cbiAgRE9NQmFycy5VdGlscy51bmlxdWVJZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdW5pcXVlSWQrKztcbiAgfTtcblxuICAvKipcbiAgICogQ2hlY2sgd2hldGhlciBhbiBvYmplY3QgaXMgYWN0dWFsbHkgYSBET00gbm9kZS5cbiAgICpcbiAgICogQHBhcmFtICB7Kn0gICAgICAgZWxlbWVudFxuICAgKiBAcmV0dXJuIHtCb29sZWFufVxuICAgKi9cbiAgRE9NQmFycy5VdGlscy5pc0VsZW1lbnQgPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgIHJldHVybiBlbGVtZW50IGluc3RhbmNlb2YgTm9kZTtcbiAgfTtcblxuICAvKipcbiAgICogQ3JlYXRlIGFuIGVsZW1lbnQgZnJvbSBhIHRhZyBuYW1lLlxuICAgKlxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IHRhZ05hbWVcbiAgICogQHJldHVybiB7Tm9kZX1cbiAgICovXG4gIERPTUJhcnMuVXRpbHMuY3JlYXRlRWxlbWVudCA9IGZ1bmN0aW9uICh0YWdOYW1lKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnTmFtZSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIGNvbW1lbnQgbm9kZSBiYXNlZCBvbiB0ZXh0IGNvbnRlbnRzLlxuICAgKlxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IGNvbnRlbnRzXG4gICAqIEByZXR1cm4ge05vZGV9XG4gICAqL1xuICBET01CYXJzLlV0aWxzLmNyZWF0ZUNvbW1lbnQgPSBmdW5jdGlvbiAoY29udGVudHMpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlQ29tbWVudChjb250ZW50cyk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJlcGxhY2UgYSBub2RlIGluIHRoZSBET00gd2l0aCBhIG5ldyBub2RlIGFuZCByZXR1cm4gaXQuXG4gICAqXG4gICAqIEBwYXJhbSAge05vZGV9IG5ld05vZGVcbiAgICogQHBhcmFtICB7Tm9kZX0gb2xkTm9kZVxuICAgKiBAcmV0dXJuIHtOb2RlfVxuICAgKi9cbiAgRE9NQmFycy5VdGlscy5yZXBsYWNlTm9kZSA9IGZ1bmN0aW9uIChuZXdOb2RlLCBvbGROb2RlKSB7XG4gICAgaWYgKG9sZE5vZGUucGFyZW50Tm9kZSkge1xuICAgICAgb2xkTm9kZS5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChuZXdOb2RlLCBvbGROb2RlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3Tm9kZTtcbiAgfTtcblxuICAvKipcbiAgICogQ29weSBhbGwgc2lnbmlmaWNhbnQgZGF0YSBmcm9tIG9uZSBlbGVtZW50IG5vZGUgdG8gYW5vdGhlci5cbiAgICpcbiAgICogQHBhcmFtICB7Tm9kZX0gbmV3Tm9kZVxuICAgKiBAcGFyYW0gIHtOb2RlfSBvbGROb2RlXG4gICAqIEByZXR1cm4ge05vZGV9XG4gICAqL1xuICBET01CYXJzLlV0aWxzLmNvcHlOb2RlID0gZnVuY3Rpb24gKG5ld05vZGUsIG9sZE5vZGUpIHtcbiAgICAvLyBNb3ZlIGFsbCBjaGlsZCBlbGVtZW50cyB0byB0aGUgbmV3IG5vZGUuXG4gICAgd2hpbGUgKG9sZE5vZGUuZmlyc3RDaGlsZCkge1xuICAgICAgbmV3Tm9kZS5hcHBlbmRDaGlsZChvbGROb2RlLmZpcnN0Q2hpbGQpO1xuICAgIH1cblxuICAgIC8vIENvcHkgYWxsIHRoZSBhdHRyaWJ1dGVzIHRvIHRoZSBuZXcgbm9kZS5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9sZE5vZGUuYXR0cmlidXRlcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGF0dHJpYnV0ZSA9IG9sZE5vZGUuYXR0cmlidXRlc1tpXTtcbiAgICAgIG5ld05vZGUuc2V0QXR0cmlidXRlKGF0dHJpYnV0ZS5uYW1lLCBhdHRyaWJ1dGUudmFsdWUpO1xuICAgIH1cblxuICAgIHJldHVybiBuZXdOb2RlO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDb3B5IGFsbCB0aGUgZGF0YSBmcm9tIG9uZSBlbGVtZW50IHRvIGFub3RoZXIgYW5kIHJlcGxhY2UgaW4gcGxhY2UuXG4gICAqXG4gICAqIEBwYXJhbSAge05vZGV9IG5ld05vZGVcbiAgICogQHBhcmFtICB7Tm9kZX0gb2xkTm9kZVxuICAgKiBAcmV0dXJuIHtOb2RlfVxuICAgKi9cbiAgRE9NQmFycy5VdGlscy5jb3B5QW5kUmVwbGFjZU5vZGUgPSBmdW5jdGlvbiAobmV3Tm9kZSwgb2xkTm9kZSkge1xuICAgIHJldHVybiBET01CYXJzLlV0aWxzLnJlcGxhY2VOb2RlKFxuICAgICAgRE9NQmFycy5VdGlscy5jb3B5Tm9kZShuZXdOb2RlLCBvbGROb2RlKSwgb2xkTm9kZVxuICAgICk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFNldCBhbiBhdHRyaWJ1dGUgdmFsdWUgb24gYW4gZWxlbWVudC5cbiAgICpcbiAgICogQHBhcmFtIHtOb2RlfSAgIGVsZW1lbnRcbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAgICogQHBhcmFtIHsqfSAgICAgIHZhbHVlXG4gICAqL1xuICBET01CYXJzLlV0aWxzLnNldEF0dHJpYnV0ZSA9IGZ1bmN0aW9uIChlbGVtZW50LCBuYW1lLCB2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSA9PT0gZmFsc2UpIHtcbiAgICAgIHJldHVybiBET01CYXJzLlV0aWxzLnJlbW92ZUF0dHJpYnV0ZShlbGVtZW50LCBuYW1lKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZWxlbWVudC5zZXRBdHRyaWJ1dGUobmFtZSwgdmFsdWUpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZW1vdmUgYW4gYXR0cmlidXRlIGZyb20gYW4gZWxlbWVudC5cbiAgICpcbiAgICogQHBhcmFtIHtOb2RlfSAgIGVsZW1lbnRcbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAgICovXG4gIERPTUJhcnMuVXRpbHMucmVtb3ZlQXR0cmlidXRlID0gZnVuY3Rpb24gKGVsZW1lbnQsIG5hbWUpIHtcbiAgICByZXR1cm4gZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUobmFtZSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEFwcGVuZCBhIGNoaWxkIGVsZW1lbnQgdG8gYSBET00gbm9kZS5cbiAgICpcbiAgICogQHBhcmFtIHtOb2RlfSBlbGVtZW50XG4gICAqIEBwYXJhbSB7Tm9kZX0gY2hpbGRcbiAgICovXG4gIERPTUJhcnMuVXRpbHMuYXBwZW5kQ2hpbGQgPSBmdW5jdGlvbiAoZWxlbWVudCwgY2hpbGQpIHtcbiAgICBpZiAoY2hpbGQgPT0gbnVsbCkgeyByZXR1cm47IH1cblxuICAgIHJldHVybiBlbGVtZW50LmFwcGVuZENoaWxkKGNoaWxkKTtcbiAgfTtcblxuICAvKipcbiAgICogVHJhbnNmb3JtIGEgc3RyaW5nIGludG8gYXJiaXRyYXJ5IERPTSBub2Rlcy5cbiAgICpcbiAgICogQHBhcmFtICB7U3RyaW5nfSBzdHJpbmdcbiAgICogQHJldHVybiB7Tm9kZX1cbiAgICovXG4gIERPTUJhcnMuVXRpbHMuZG9taWZ5RXhwcmVzc2lvbiA9IGZ1bmN0aW9uIChzdHJpbmcpIHtcbiAgICBpZiAoc3RyaW5nID09IG51bGwpIHtcbiAgICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgfVxuXG4gICAgaWYgKERPTUJhcnMuVXRpbHMuaXNFbGVtZW50KHN0cmluZykpIHtcbiAgICAgIHJldHVybiBzdHJpbmc7XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBkb21pZnkoc3RyaW5nLnRvU3RyaW5nKCkpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzdHJpbmcpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogVHJhbnNmb3JtIGEgc3RyaW5nIGludG8gYSBET00gdGV4dCBub2RlIGZvciBhcHBlbmRpbmcgdG8gdGhlIHRlbXBsYXRlLlxuICAgKlxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IHN0cmluZ1xuICAgKiBAcmV0dXJuIHtUZXh0fVxuICAgKi9cbiAgRE9NQmFycy5VdGlscy50ZXh0aWZ5RXhwcmVzc2lvbiA9IGZ1bmN0aW9uIChzdHJpbmcpIHtcbiAgICBpZiAoc3RyaW5nIGluc3RhbmNlb2YgRE9NQmFycy5TYWZlU3RyaW5nKSB7XG4gICAgICByZXR1cm4gRE9NQmFycy5VdGlscy5kb21pZnlFeHByZXNzaW9uKHN0cmluZy50b1N0cmluZygpKTtcbiAgICB9XG5cbiAgICAvLyBDYXRjaCB3aGVuIHRoZSBzdHJpbmcgaXMgYWN0dWFsbHkgYSBET00gbm9kZSBhbmQgdHVybiBpdCBpbnRvIGEgc3RyaW5nLlxuICAgIGlmIChET01CYXJzLlV0aWxzLmlzRWxlbWVudChzdHJpbmcpKSB7XG4gICAgICBpZiAoc3RyaW5nLm5vZGVUeXBlID09PSAzKSB7XG4gICAgICAgIHJldHVybiBzdHJpbmc7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2Ygc3RyaW5nLm91dGVySFRNTCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHN0cmluZy5vdXRlckhUTUwpO1xuICAgICAgfVxuXG4gICAgICB2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICBkaXYuYXBwZW5kQ2hpbGQoc3RyaW5nLmNsb25lTm9kZSh0cnVlKSk7XG4gICAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoZGl2LmlubmVySFRNTCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHN0cmluZyA9PSBudWxsID8gJycgOiBzdHJpbmcpO1xuICB9O1xuXG4gIHJldHVybiBET01CYXJzO1xufTtcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICBpZiAoZXYuc291cmNlID09PSB3aW5kb3cgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwiXG4vKipcbiAqIEV4cG9zZSBgcGFyc2VgLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gcGFyc2U7XG5cbi8qKlxuICogV3JhcCBtYXAgZnJvbSBqcXVlcnkuXG4gKi9cblxudmFyIG1hcCA9IHtcbiAgb3B0aW9uOiBbMSwgJzxzZWxlY3QgbXVsdGlwbGU9XCJtdWx0aXBsZVwiPicsICc8L3NlbGVjdD4nXSxcbiAgb3B0Z3JvdXA6IFsxLCAnPHNlbGVjdCBtdWx0aXBsZT1cIm11bHRpcGxlXCI+JywgJzwvc2VsZWN0PiddLFxuICBsZWdlbmQ6IFsxLCAnPGZpZWxkc2V0PicsICc8L2ZpZWxkc2V0PiddLFxuICB0aGVhZDogWzEsICc8dGFibGU+JywgJzwvdGFibGU+J10sXG4gIHRib2R5OiBbMSwgJzx0YWJsZT4nLCAnPC90YWJsZT4nXSxcbiAgdGZvb3Q6IFsxLCAnPHRhYmxlPicsICc8L3RhYmxlPiddLFxuICBjb2xncm91cDogWzEsICc8dGFibGU+JywgJzwvdGFibGU+J10sXG4gIGNhcHRpb246IFsxLCAnPHRhYmxlPicsICc8L3RhYmxlPiddLFxuICB0cjogWzIsICc8dGFibGU+PHRib2R5PicsICc8L3Rib2R5PjwvdGFibGU+J10sXG4gIHRkOiBbMywgJzx0YWJsZT48dGJvZHk+PHRyPicsICc8L3RyPjwvdGJvZHk+PC90YWJsZT4nXSxcbiAgdGg6IFszLCAnPHRhYmxlPjx0Ym9keT48dHI+JywgJzwvdHI+PC90Ym9keT48L3RhYmxlPiddLFxuICBjb2w6IFsyLCAnPHRhYmxlPjx0Ym9keT48L3Rib2R5Pjxjb2xncm91cD4nLCAnPC9jb2xncm91cD48L3RhYmxlPiddLFxuICBfZGVmYXVsdDogWzAsICcnLCAnJ11cbn07XG5cbi8qKlxuICogUGFyc2UgYGh0bWxgIGFuZCByZXR1cm4gdGhlIGNoaWxkcmVuLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBodG1sXG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIHBhcnNlKGh0bWwpIHtcbiAgaWYgKCdzdHJpbmcnICE9IHR5cGVvZiBodG1sKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdTdHJpbmcgZXhwZWN0ZWQnKTtcblxuICAvLyB0YWcgbmFtZVxuICB2YXIgbSA9IC88KFtcXHc6XSspLy5leGVjKGh0bWwpO1xuICBpZiAoIW0pIHRocm93IG5ldyBFcnJvcignTm8gZWxlbWVudHMgd2VyZSBnZW5lcmF0ZWQuJyk7XG4gIHZhciB0YWcgPSBtWzFdO1xuXG4gIC8vIGJvZHkgc3VwcG9ydFxuICBpZiAodGFnID09ICdib2R5Jykge1xuICAgIHZhciBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2h0bWwnKTtcbiAgICBlbC5pbm5lckhUTUwgPSBodG1sO1xuICAgIHJldHVybiBlbC5yZW1vdmVDaGlsZChlbC5sYXN0Q2hpbGQpO1xuICB9XG5cbiAgLy8gd3JhcCBtYXBcbiAgdmFyIHdyYXAgPSBtYXBbdGFnXSB8fCBtYXAuX2RlZmF1bHQ7XG4gIHZhciBkZXB0aCA9IHdyYXBbMF07XG4gIHZhciBwcmVmaXggPSB3cmFwWzFdO1xuICB2YXIgc3VmZml4ID0gd3JhcFsyXTtcbiAgdmFyIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIGVsLmlubmVySFRNTCA9IHByZWZpeCArIGh0bWwgKyBzdWZmaXg7XG4gIHdoaWxlIChkZXB0aC0tKSBlbCA9IGVsLmxhc3RDaGlsZDtcblxuICB2YXIgZWxzID0gZWwuY2hpbGRyZW47XG4gIGlmICgxID09IGVscy5sZW5ndGgpIHtcbiAgICByZXR1cm4gZWwucmVtb3ZlQ2hpbGQoZWxzWzBdKTtcbiAgfVxuXG4gIHZhciBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgd2hpbGUgKGVscy5sZW5ndGgpIHtcbiAgICBmcmFnbWVudC5hcHBlbmRDaGlsZChlbC5yZW1vdmVDaGlsZChlbHNbMF0pKTtcbiAgfVxuXG4gIHJldHVybiBmcmFnbWVudDtcbn1cbiIsIi8qanNoaW50IGVxbnVsbDogdHJ1ZSAqL1xuXG5tb2R1bGUuZXhwb3J0cy5jcmVhdGUgPSBmdW5jdGlvbigpIHtcblxudmFyIEhhbmRsZWJhcnMgPSB7fTtcblxuLy8gQkVHSU4oQlJPV1NFUilcblxuSGFuZGxlYmFycy5WRVJTSU9OID0gXCIxLjAuMFwiO1xuSGFuZGxlYmFycy5DT01QSUxFUl9SRVZJU0lPTiA9IDQ7XG5cbkhhbmRsZWJhcnMuUkVWSVNJT05fQ0hBTkdFUyA9IHtcbiAgMTogJzw9IDEuMC5yYy4yJywgLy8gMS4wLnJjLjIgaXMgYWN0dWFsbHkgcmV2MiBidXQgZG9lc24ndCByZXBvcnQgaXRcbiAgMjogJz09IDEuMC4wLXJjLjMnLFxuICAzOiAnPT0gMS4wLjAtcmMuNCcsXG4gIDQ6ICc+PSAxLjAuMCdcbn07XG5cbkhhbmRsZWJhcnMuaGVscGVycyAgPSB7fTtcbkhhbmRsZWJhcnMucGFydGlhbHMgPSB7fTtcblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZyxcbiAgICBmdW5jdGlvblR5cGUgPSAnW29iamVjdCBGdW5jdGlvbl0nLFxuICAgIG9iamVjdFR5cGUgPSAnW29iamVjdCBPYmplY3RdJztcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlciA9IGZ1bmN0aW9uKG5hbWUsIGZuLCBpbnZlcnNlKSB7XG4gIGlmICh0b1N0cmluZy5jYWxsKG5hbWUpID09PSBvYmplY3RUeXBlKSB7XG4gICAgaWYgKGludmVyc2UgfHwgZm4pIHsgdGhyb3cgbmV3IEhhbmRsZWJhcnMuRXhjZXB0aW9uKCdBcmcgbm90IHN1cHBvcnRlZCB3aXRoIG11bHRpcGxlIGhlbHBlcnMnKTsgfVxuICAgIEhhbmRsZWJhcnMuVXRpbHMuZXh0ZW5kKHRoaXMuaGVscGVycywgbmFtZSk7XG4gIH0gZWxzZSB7XG4gICAgaWYgKGludmVyc2UpIHsgZm4ubm90ID0gaW52ZXJzZTsgfVxuICAgIHRoaXMuaGVscGVyc1tuYW1lXSA9IGZuO1xuICB9XG59O1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVyUGFydGlhbCA9IGZ1bmN0aW9uKG5hbWUsIHN0cikge1xuICBpZiAodG9TdHJpbmcuY2FsbChuYW1lKSA9PT0gb2JqZWN0VHlwZSkge1xuICAgIEhhbmRsZWJhcnMuVXRpbHMuZXh0ZW5kKHRoaXMucGFydGlhbHMsICBuYW1lKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLnBhcnRpYWxzW25hbWVdID0gc3RyO1xuICB9XG59O1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdoZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24oYXJnKSB7XG4gIGlmKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgaGVscGVyOiAnXCIgKyBhcmcgKyBcIidcIik7XG4gIH1cbn0pO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdibG9ja0hlbHBlck1pc3NpbmcnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gIHZhciBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlIHx8IGZ1bmN0aW9uKCkge30sIGZuID0gb3B0aW9ucy5mbjtcblxuICB2YXIgdHlwZSA9IHRvU3RyaW5nLmNhbGwoY29udGV4dCk7XG5cbiAgaWYodHlwZSA9PT0gZnVuY3Rpb25UeXBlKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cblxuICBpZihjb250ZXh0ID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIGZuKHRoaXMpO1xuICB9IGVsc2UgaWYoY29udGV4dCA9PT0gZmFsc2UgfHwgY29udGV4dCA9PSBudWxsKSB7XG4gICAgcmV0dXJuIGludmVyc2UodGhpcyk7XG4gIH0gZWxzZSBpZih0eXBlID09PSBcIltvYmplY3QgQXJyYXldXCIpIHtcbiAgICBpZihjb250ZXh0Lmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiBIYW5kbGViYXJzLmhlbHBlcnMuZWFjaChjb250ZXh0LCBvcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGludmVyc2UodGhpcyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBmbihjb250ZXh0KTtcbiAgfVxufSk7XG5cbkhhbmRsZWJhcnMuSyA9IGZ1bmN0aW9uKCkge307XG5cbkhhbmRsZWJhcnMuY3JlYXRlRnJhbWUgPSBPYmplY3QuY3JlYXRlIHx8IGZ1bmN0aW9uKG9iamVjdCkge1xuICBIYW5kbGViYXJzLksucHJvdG90eXBlID0gb2JqZWN0O1xuICB2YXIgb2JqID0gbmV3IEhhbmRsZWJhcnMuSygpO1xuICBIYW5kbGViYXJzLksucHJvdG90eXBlID0gbnVsbDtcbiAgcmV0dXJuIG9iajtcbn07XG5cbkhhbmRsZWJhcnMubG9nZ2VyID0ge1xuICBERUJVRzogMCwgSU5GTzogMSwgV0FSTjogMiwgRVJST1I6IDMsIGxldmVsOiAzLFxuXG4gIG1ldGhvZE1hcDogezA6ICdkZWJ1ZycsIDE6ICdpbmZvJywgMjogJ3dhcm4nLCAzOiAnZXJyb3InfSxcblxuICAvLyBjYW4gYmUgb3ZlcnJpZGRlbiBpbiB0aGUgaG9zdCBlbnZpcm9ubWVudFxuICBsb2c6IGZ1bmN0aW9uKGxldmVsLCBvYmopIHtcbiAgICBpZiAoSGFuZGxlYmFycy5sb2dnZXIubGV2ZWwgPD0gbGV2ZWwpIHtcbiAgICAgIHZhciBtZXRob2QgPSBIYW5kbGViYXJzLmxvZ2dlci5tZXRob2RNYXBbbGV2ZWxdO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJyAmJiBjb25zb2xlW21ldGhvZF0pIHtcbiAgICAgICAgY29uc29sZVttZXRob2RdLmNhbGwoY29uc29sZSwgb2JqKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5cbkhhbmRsZWJhcnMubG9nID0gZnVuY3Rpb24obGV2ZWwsIG9iaikgeyBIYW5kbGViYXJzLmxvZ2dlci5sb2cobGV2ZWwsIG9iaik7IH07XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2VhY2gnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gIHZhciBmbiA9IG9wdGlvbnMuZm4sIGludmVyc2UgPSBvcHRpb25zLmludmVyc2U7XG4gIHZhciBpID0gMCwgcmV0ID0gXCJcIiwgZGF0YTtcblxuICB2YXIgdHlwZSA9IHRvU3RyaW5nLmNhbGwoY29udGV4dCk7XG4gIGlmKHR5cGUgPT09IGZ1bmN0aW9uVHlwZSkgeyBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpOyB9XG5cbiAgaWYgKG9wdGlvbnMuZGF0YSkge1xuICAgIGRhdGEgPSBIYW5kbGViYXJzLmNyZWF0ZUZyYW1lKG9wdGlvbnMuZGF0YSk7XG4gIH1cblxuICBpZihjb250ZXh0ICYmIHR5cGVvZiBjb250ZXh0ID09PSAnb2JqZWN0Jykge1xuICAgIGlmKGNvbnRleHQgaW5zdGFuY2VvZiBBcnJheSl7XG4gICAgICBmb3IodmFyIGogPSBjb250ZXh0Lmxlbmd0aDsgaTxqOyBpKyspIHtcbiAgICAgICAgaWYgKGRhdGEpIHsgZGF0YS5pbmRleCA9IGk7IH1cbiAgICAgICAgcmV0ID0gcmV0ICsgZm4oY29udGV4dFtpXSwgeyBkYXRhOiBkYXRhIH0pO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IodmFyIGtleSBpbiBjb250ZXh0KSB7XG4gICAgICAgIGlmKGNvbnRleHQuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIGlmKGRhdGEpIHsgZGF0YS5rZXkgPSBrZXk7IH1cbiAgICAgICAgICByZXQgPSByZXQgKyBmbihjb250ZXh0W2tleV0sIHtkYXRhOiBkYXRhfSk7XG4gICAgICAgICAgaSsrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYoaSA9PT0gMCl7XG4gICAgcmV0ID0gaW52ZXJzZSh0aGlzKTtcbiAgfVxuXG4gIHJldHVybiByZXQ7XG59KTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignaWYnLCBmdW5jdGlvbihjb25kaXRpb25hbCwgb3B0aW9ucykge1xuICB2YXIgdHlwZSA9IHRvU3RyaW5nLmNhbGwoY29uZGl0aW9uYWwpO1xuICBpZih0eXBlID09PSBmdW5jdGlvblR5cGUpIHsgY29uZGl0aW9uYWwgPSBjb25kaXRpb25hbC5jYWxsKHRoaXMpOyB9XG5cbiAgaWYoIWNvbmRpdGlvbmFsIHx8IEhhbmRsZWJhcnMuVXRpbHMuaXNFbXB0eShjb25kaXRpb25hbCkpIHtcbiAgICByZXR1cm4gb3B0aW9ucy5pbnZlcnNlKHRoaXMpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBvcHRpb25zLmZuKHRoaXMpO1xuICB9XG59KTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcigndW5sZXNzJywgZnVuY3Rpb24oY29uZGl0aW9uYWwsIG9wdGlvbnMpIHtcbiAgcmV0dXJuIEhhbmRsZWJhcnMuaGVscGVyc1snaWYnXS5jYWxsKHRoaXMsIGNvbmRpdGlvbmFsLCB7Zm46IG9wdGlvbnMuaW52ZXJzZSwgaW52ZXJzZTogb3B0aW9ucy5mbn0pO1xufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ3dpdGgnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gIHZhciB0eXBlID0gdG9TdHJpbmcuY2FsbChjb250ZXh0KTtcbiAgaWYodHlwZSA9PT0gZnVuY3Rpb25UeXBlKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cblxuICBpZiAoIUhhbmRsZWJhcnMuVXRpbHMuaXNFbXB0eShjb250ZXh0KSkgcmV0dXJuIG9wdGlvbnMuZm4oY29udGV4dCk7XG59KTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignbG9nJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICB2YXIgbGV2ZWwgPSBvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5kYXRhLmxldmVsICE9IG51bGwgPyBwYXJzZUludChvcHRpb25zLmRhdGEubGV2ZWwsIDEwKSA6IDE7XG4gIEhhbmRsZWJhcnMubG9nKGxldmVsLCBjb250ZXh0KTtcbn0pO1xuXG4vLyBFTkQoQlJPV1NFUilcblxucmV0dXJuIEhhbmRsZWJhcnM7XG59O1xuIiwiZXhwb3J0cy5hdHRhY2ggPSBmdW5jdGlvbihIYW5kbGViYXJzKSB7XG5cbi8vIEJFR0lOKEJST1dTRVIpXG5cbkhhbmRsZWJhcnMuVk0gPSB7XG4gIHRlbXBsYXRlOiBmdW5jdGlvbih0ZW1wbGF0ZVNwZWMpIHtcbiAgICAvLyBKdXN0IGFkZCB3YXRlclxuICAgIHZhciBjb250YWluZXIgPSB7XG4gICAgICBlc2NhcGVFeHByZXNzaW9uOiBIYW5kbGViYXJzLlV0aWxzLmVzY2FwZUV4cHJlc3Npb24sXG4gICAgICBpbnZva2VQYXJ0aWFsOiBIYW5kbGViYXJzLlZNLmludm9rZVBhcnRpYWwsXG4gICAgICBwcm9ncmFtczogW10sXG4gICAgICBwcm9ncmFtOiBmdW5jdGlvbihpLCBmbiwgZGF0YSkge1xuICAgICAgICB2YXIgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldO1xuICAgICAgICBpZihkYXRhKSB7XG4gICAgICAgICAgcHJvZ3JhbVdyYXBwZXIgPSBIYW5kbGViYXJzLlZNLnByb2dyYW0oaSwgZm4sIGRhdGEpO1xuICAgICAgICB9IGVsc2UgaWYgKCFwcm9ncmFtV3JhcHBlcikge1xuICAgICAgICAgIHByb2dyYW1XcmFwcGVyID0gdGhpcy5wcm9ncmFtc1tpXSA9IEhhbmRsZWJhcnMuVk0ucHJvZ3JhbShpLCBmbik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByb2dyYW1XcmFwcGVyO1xuICAgICAgfSxcbiAgICAgIG1lcmdlOiBmdW5jdGlvbihwYXJhbSwgY29tbW9uKSB7XG4gICAgICAgIHZhciByZXQgPSBwYXJhbSB8fCBjb21tb247XG5cbiAgICAgICAgaWYgKHBhcmFtICYmIGNvbW1vbikge1xuICAgICAgICAgIHJldCA9IHt9O1xuICAgICAgICAgIEhhbmRsZWJhcnMuVXRpbHMuZXh0ZW5kKHJldCwgY29tbW9uKTtcbiAgICAgICAgICBIYW5kbGViYXJzLlV0aWxzLmV4dGVuZChyZXQsIHBhcmFtKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgfSxcbiAgICAgIHByb2dyYW1XaXRoRGVwdGg6IEhhbmRsZWJhcnMuVk0ucHJvZ3JhbVdpdGhEZXB0aCxcbiAgICAgIG5vb3A6IEhhbmRsZWJhcnMuVk0ubm9vcCxcbiAgICAgIGNvbXBpbGVySW5mbzogbnVsbFxuICAgIH07XG5cbiAgICByZXR1cm4gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICB2YXIgcmVzdWx0ID0gdGVtcGxhdGVTcGVjLmNhbGwoY29udGFpbmVyLCBIYW5kbGViYXJzLCBjb250ZXh0LCBvcHRpb25zLmhlbHBlcnMsIG9wdGlvbnMucGFydGlhbHMsIG9wdGlvbnMuZGF0YSk7XG5cbiAgICAgIHZhciBjb21waWxlckluZm8gPSBjb250YWluZXIuY29tcGlsZXJJbmZvIHx8IFtdLFxuICAgICAgICAgIGNvbXBpbGVyUmV2aXNpb24gPSBjb21waWxlckluZm9bMF0gfHwgMSxcbiAgICAgICAgICBjdXJyZW50UmV2aXNpb24gPSBIYW5kbGViYXJzLkNPTVBJTEVSX1JFVklTSU9OO1xuXG4gICAgICBpZiAoY29tcGlsZXJSZXZpc2lvbiAhPT0gY3VycmVudFJldmlzaW9uKSB7XG4gICAgICAgIGlmIChjb21waWxlclJldmlzaW9uIDwgY3VycmVudFJldmlzaW9uKSB7XG4gICAgICAgICAgdmFyIHJ1bnRpbWVWZXJzaW9ucyA9IEhhbmRsZWJhcnMuUkVWSVNJT05fQ0hBTkdFU1tjdXJyZW50UmV2aXNpb25dLFxuICAgICAgICAgICAgICBjb21waWxlclZlcnNpb25zID0gSGFuZGxlYmFycy5SRVZJU0lPTl9DSEFOR0VTW2NvbXBpbGVyUmV2aXNpb25dO1xuICAgICAgICAgIHRocm93IFwiVGVtcGxhdGUgd2FzIHByZWNvbXBpbGVkIHdpdGggYW4gb2xkZXIgdmVyc2lvbiBvZiBIYW5kbGViYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gXCIrXG4gICAgICAgICAgICAgICAgXCJQbGVhc2UgdXBkYXRlIHlvdXIgcHJlY29tcGlsZXIgdG8gYSBuZXdlciB2ZXJzaW9uIChcIitydW50aW1lVmVyc2lvbnMrXCIpIG9yIGRvd25ncmFkZSB5b3VyIHJ1bnRpbWUgdG8gYW4gb2xkZXIgdmVyc2lvbiAoXCIrY29tcGlsZXJWZXJzaW9ucytcIikuXCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gVXNlIHRoZSBlbWJlZGRlZCB2ZXJzaW9uIGluZm8gc2luY2UgdGhlIHJ1bnRpbWUgZG9lc24ndCBrbm93IGFib3V0IHRoaXMgcmV2aXNpb24geWV0XG4gICAgICAgICAgdGhyb3cgXCJUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhIG5ld2VyIHZlcnNpb24gb2YgSGFuZGxlYmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuIFwiK1xuICAgICAgICAgICAgICAgIFwiUGxlYXNlIHVwZGF0ZSB5b3VyIHJ1bnRpbWUgdG8gYSBuZXdlciB2ZXJzaW9uIChcIitjb21waWxlckluZm9bMV0rXCIpLlwiO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfSxcblxuICBwcm9ncmFtV2l0aERlcHRoOiBmdW5jdGlvbihpLCBmbiwgZGF0YSAvKiwgJGRlcHRoICovKSB7XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDMpO1xuXG4gICAgdmFyIHByb2dyYW0gPSBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIFtjb250ZXh0LCBvcHRpb25zLmRhdGEgfHwgZGF0YV0uY29uY2F0KGFyZ3MpKTtcbiAgICB9O1xuICAgIHByb2dyYW0ucHJvZ3JhbSA9IGk7XG4gICAgcHJvZ3JhbS5kZXB0aCA9IGFyZ3MubGVuZ3RoO1xuICAgIHJldHVybiBwcm9ncmFtO1xuICB9LFxuICBwcm9ncmFtOiBmdW5jdGlvbihpLCBmbiwgZGF0YSkge1xuICAgIHZhciBwcm9ncmFtID0gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICAgIHJldHVybiBmbihjb250ZXh0LCBvcHRpb25zLmRhdGEgfHwgZGF0YSk7XG4gICAgfTtcbiAgICBwcm9ncmFtLnByb2dyYW0gPSBpO1xuICAgIHByb2dyYW0uZGVwdGggPSAwO1xuICAgIHJldHVybiBwcm9ncmFtO1xuICB9LFxuICBub29wOiBmdW5jdGlvbigpIHsgcmV0dXJuIFwiXCI7IH0sXG4gIGludm9rZVBhcnRpYWw6IGZ1bmN0aW9uKHBhcnRpYWwsIG5hbWUsIGNvbnRleHQsIGhlbHBlcnMsIHBhcnRpYWxzLCBkYXRhKSB7XG4gICAgdmFyIG9wdGlvbnMgPSB7IGhlbHBlcnM6IGhlbHBlcnMsIHBhcnRpYWxzOiBwYXJ0aWFscywgZGF0YTogZGF0YSB9O1xuXG4gICAgaWYocGFydGlhbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgSGFuZGxlYmFycy5FeGNlcHRpb24oXCJUaGUgcGFydGlhbCBcIiArIG5hbWUgKyBcIiBjb3VsZCBub3QgYmUgZm91bmRcIik7XG4gICAgfSBlbHNlIGlmKHBhcnRpYWwgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgcmV0dXJuIHBhcnRpYWwoY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIGlmICghSGFuZGxlYmFycy5jb21waWxlKSB7XG4gICAgICB0aHJvdyBuZXcgSGFuZGxlYmFycy5FeGNlcHRpb24oXCJUaGUgcGFydGlhbCBcIiArIG5hbWUgKyBcIiBjb3VsZCBub3QgYmUgY29tcGlsZWQgd2hlbiBydW5uaW5nIGluIHJ1bnRpbWUtb25seSBtb2RlXCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYXJ0aWFsc1tuYW1lXSA9IEhhbmRsZWJhcnMuY29tcGlsZShwYXJ0aWFsLCB7ZGF0YTogZGF0YSAhPT0gdW5kZWZpbmVkfSk7XG4gICAgICByZXR1cm4gcGFydGlhbHNbbmFtZV0oY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfVxuICB9XG59O1xuXG5IYW5kbGViYXJzLnRlbXBsYXRlID0gSGFuZGxlYmFycy5WTS50ZW1wbGF0ZTtcblxuLy8gRU5EKEJST1dTRVIpXG5cbnJldHVybiBIYW5kbGViYXJzO1xuXG59O1xuIiwiZXhwb3J0cy5hdHRhY2ggPSBmdW5jdGlvbihIYW5kbGViYXJzKSB7XG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbi8vIEJFR0lOKEJST1dTRVIpXG5cbnZhciBlcnJvclByb3BzID0gWydkZXNjcmlwdGlvbicsICdmaWxlTmFtZScsICdsaW5lTnVtYmVyJywgJ21lc3NhZ2UnLCAnbmFtZScsICdudW1iZXInLCAnc3RhY2snXTtcblxuSGFuZGxlYmFycy5FeGNlcHRpb24gPSBmdW5jdGlvbihtZXNzYWdlKSB7XG4gIHZhciB0bXAgPSBFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAvLyBVbmZvcnR1bmF0ZWx5IGVycm9ycyBhcmUgbm90IGVudW1lcmFibGUgaW4gQ2hyb21lIChhdCBsZWFzdCksIHNvIGBmb3IgcHJvcCBpbiB0bXBgIGRvZXNuJ3Qgd29yay5cbiAgZm9yICh2YXIgaWR4ID0gMDsgaWR4IDwgZXJyb3JQcm9wcy5sZW5ndGg7IGlkeCsrKSB7XG4gICAgdGhpc1tlcnJvclByb3BzW2lkeF1dID0gdG1wW2Vycm9yUHJvcHNbaWR4XV07XG4gIH1cbn07XG5IYW5kbGViYXJzLkV4Y2VwdGlvbi5wcm90b3R5cGUgPSBuZXcgRXJyb3IoKTtcblxuLy8gQnVpbGQgb3V0IG91ciBiYXNpYyBTYWZlU3RyaW5nIHR5cGVcbkhhbmRsZWJhcnMuU2FmZVN0cmluZyA9IGZ1bmN0aW9uKHN0cmluZykge1xuICB0aGlzLnN0cmluZyA9IHN0cmluZztcbn07XG5IYW5kbGViYXJzLlNhZmVTdHJpbmcucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLnN0cmluZy50b1N0cmluZygpO1xufTtcblxudmFyIGVzY2FwZSA9IHtcbiAgXCImXCI6IFwiJmFtcDtcIixcbiAgXCI8XCI6IFwiJmx0O1wiLFxuICBcIj5cIjogXCImZ3Q7XCIsXG4gICdcIic6IFwiJnF1b3Q7XCIsXG4gIFwiJ1wiOiBcIiYjeDI3O1wiLFxuICBcImBcIjogXCImI3g2MDtcIlxufTtcblxudmFyIGJhZENoYXJzID0gL1smPD5cIidgXS9nO1xudmFyIHBvc3NpYmxlID0gL1smPD5cIidgXS87XG5cbnZhciBlc2NhcGVDaGFyID0gZnVuY3Rpb24oY2hyKSB7XG4gIHJldHVybiBlc2NhcGVbY2hyXSB8fCBcIiZhbXA7XCI7XG59O1xuXG5IYW5kbGViYXJzLlV0aWxzID0ge1xuICBleHRlbmQ6IGZ1bmN0aW9uKG9iaiwgdmFsdWUpIHtcbiAgICBmb3IodmFyIGtleSBpbiB2YWx1ZSkge1xuICAgICAgaWYodmFsdWUuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICBvYmpba2V5XSA9IHZhbHVlW2tleV07XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIGVzY2FwZUV4cHJlc3Npb246IGZ1bmN0aW9uKHN0cmluZykge1xuICAgIC8vIGRvbid0IGVzY2FwZSBTYWZlU3RyaW5ncywgc2luY2UgdGhleSdyZSBhbHJlYWR5IHNhZmVcbiAgICBpZiAoc3RyaW5nIGluc3RhbmNlb2YgSGFuZGxlYmFycy5TYWZlU3RyaW5nKSB7XG4gICAgICByZXR1cm4gc3RyaW5nLnRvU3RyaW5nKCk7XG4gICAgfSBlbHNlIGlmIChzdHJpbmcgPT0gbnVsbCB8fCBzdHJpbmcgPT09IGZhbHNlKSB7XG4gICAgICByZXR1cm4gXCJcIjtcbiAgICB9XG5cbiAgICAvLyBGb3JjZSBhIHN0cmluZyBjb252ZXJzaW9uIGFzIHRoaXMgd2lsbCBiZSBkb25lIGJ5IHRoZSBhcHBlbmQgcmVnYXJkbGVzcyBhbmRcbiAgICAvLyB0aGUgcmVnZXggdGVzdCB3aWxsIGRvIHRoaXMgdHJhbnNwYXJlbnRseSBiZWhpbmQgdGhlIHNjZW5lcywgY2F1c2luZyBpc3N1ZXMgaWZcbiAgICAvLyBhbiBvYmplY3QncyB0byBzdHJpbmcgaGFzIGVzY2FwZWQgY2hhcmFjdGVycyBpbiBpdC5cbiAgICBzdHJpbmcgPSBzdHJpbmcudG9TdHJpbmcoKTtcblxuICAgIGlmKCFwb3NzaWJsZS50ZXN0KHN0cmluZykpIHsgcmV0dXJuIHN0cmluZzsgfVxuICAgIHJldHVybiBzdHJpbmcucmVwbGFjZShiYWRDaGFycywgZXNjYXBlQ2hhcik7XG4gIH0sXG5cbiAgaXNFbXB0eTogZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAoIXZhbHVlICYmIHZhbHVlICE9PSAwKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgaWYodG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09IFwiW29iamVjdCBBcnJheV1cIiAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG59O1xuXG4vLyBFTkQoQlJPV1NFUilcblxucmV0dXJuIEhhbmRsZWJhcnM7XG59O1xuIiwiXG4vKipcbiAqIEV4cG9zZSBgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKClgLlxuICovXG5cbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbiAgfHwgd2luZG93LndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZVxuICB8fCB3aW5kb3cubW96UmVxdWVzdEFuaW1hdGlvbkZyYW1lXG4gIHx8IHdpbmRvdy5vUmVxdWVzdEFuaW1hdGlvbkZyYW1lXG4gIHx8IHdpbmRvdy5tc1JlcXVlc3RBbmltYXRpb25GcmFtZVxuICB8fCBmYWxsYmFjaztcblxuLyoqXG4gKiBGYWxsYmFjayBpbXBsZW1lbnRhdGlvbi5cbiAqL1xuXG52YXIgcHJldiA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuZnVuY3Rpb24gZmFsbGJhY2soZm4pIHtcbiAgdmFyIGN1cnIgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgdmFyIG1zID0gTWF0aC5tYXgoMCwgMTYgLSAoY3VyciAtIHByZXYpKTtcbiAgc2V0VGltZW91dChmbiwgbXMpO1xuICBwcmV2ID0gY3Vycjtcbn1cblxuLyoqXG4gKiBDYW5jZWwuXG4gKi9cblxudmFyIGNhbmNlbCA9IHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZVxuICB8fCB3aW5kb3cud2Via2l0Q2FuY2VsQW5pbWF0aW9uRnJhbWVcbiAgfHwgd2luZG93Lm1vekNhbmNlbEFuaW1hdGlvbkZyYW1lXG4gIHx8IHdpbmRvdy5vQ2FuY2VsQW5pbWF0aW9uRnJhbWVcbiAgfHwgd2luZG93Lm1zQ2FuY2VsQW5pbWF0aW9uRnJhbWU7XG5cbmV4cG9ydHMuY2FuY2VsID0gZnVuY3Rpb24oaWQpe1xuICBjYW5jZWwuY2FsbCh3aW5kb3csIGlkKTtcbn07XG4iLCJ2YXIgYmFzZSAgICAgPSByZXF1aXJlKCcuL2xpYi9iYXNlJyk7XG52YXIgdXRpbHMgICAgPSByZXF1aXJlKCcuL2xpYi91dGlscycpO1xudmFyIHJ1bnRpbWUgID0gcmVxdWlyZSgnLi9saWIvcnVudGltZScpO1xuXG4vKipcbiAqIEdlbmVyYXRlIHRoZSBiYXNlIERPTUJhcnMgb2JqZWN0LlxuICpcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24gY3JlYXRlICgpIHtcbiAgdmFyIERPTUJhcnMgPSBiYXNlLmNyZWF0ZSgpO1xuXG4gIHV0aWxzLmF0dGFjaChET01CYXJzKTtcbiAgcnVudGltZS5hdHRhY2goRE9NQmFycyk7XG5cbiAgRE9NQmFycy5jcmVhdGUgPSBjcmVhdGU7XG5cbiAgcmV0dXJuIERPTUJhcnM7XG59KSgpO1xuIl19
(10)
});
;