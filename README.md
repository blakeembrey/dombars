# DOMBars

DOMBars is an extension of [Handlebars.js](https://github.com/wycats/handlebars.js). It keeps almost all the same semantics of Handlebars, but generates DOM objects instead of string-based templates. This is an extremely powerful concept when you consider data binding and reactive programming. By creating DOM representations of a template, we can easily keep track of all the generated nodes and update only the specific content when data changes. All of this is possible without any special markup being added to your HTML and Handlebars templates.

## Installation

Installing DOMBars is simple. Multiple builds are provided in the `dist` directory, just add the required script to you site. Alternatively, DOMBars is also available on [npm](https://npmjs.org/package/dombars).

## Usage

The API is very similar to Handlebars, but extends it with all the DOM-based goodness. Things to keep in mind is that helper function generate DOM nodes (not strings). This means no more string concatination - use document fragments instead.

Another thing is that the template function and helpers don't directly return the template. Instead they return an object with some additional methods (such as `unsubscribe`) and the template output is stored under the `value` property.

### Getters

To provide a custom getter function, just set `DOMBars.get` to your desired function. The function should accept two arguments, the `object` and `property`. Using DOMBars with Backbone.js is as simple as:

```js
DOMBars.get = function (object, property) {
  if (object instanceof Backbone.Model) {
    return object.get(property);
  }

  return object[property];
};
```

### Subscribers

Subscriptions are used to achieve data binding. By default, the subscription is a no-op and does nothing. To set up your own custom subscription function, set `DOMBars.subscribe` to the desired subsciber function. The function should accept three arguments - `object`, `property` and `callback`. For example, to do data binding with Backbone.js:

```js
DOMBars.subscribe = function (object, property, callback) {
  object.on('change:' + property, callback);
};
```

You should also provide an unsubscribe function under `DOMBars.unsubscribe`. This function accepts the same three arguments - `object`, `property` and `callback`. The callback is the exact same function that was passed in with `DOMBars.subscribe`. To unsubscribe a subscription in Backbone.js:

```js
DOMBars.unsubscribe = function (object, property, callback) {
  object.off('change:' + property, callback);
};
```

### Unsubscribing

DOMBars templates automatically unsubscribe listeners when a change happens. However, to unsubscribe the root DOM element you need to call the `unsubscribe` method on the returned object. This is important since your listeners and helpers would otherwise not know to stop listening for changes and could result in a substantial memory leak over time.

For custom helpers that need to be unsubscribed, a function is made available to helper functions through the `options.unsubscribe` method in the options. Just pass in a function that needs to be called on unsubscription, and when the helper is destroyed the unsubscribe function will be called.

### Updating Helpers

Since helpers are just DOM nodes, you can update the returned helper by changing the DOM reference. This is great for performance reasons, since you just update the parts of the DOM that need changing. Another options is the `options.update` method. When called, the helper will re-render itself in place.

### Utilities

DOMBars extends the built-in Handlebars utilities with some additional functionality, available under `DOMBars.Utils`.

#### Utils.uniqueId

Used internally for keeping track of subscriptions, the `uniqueId` function returns a unique number each time its called.

#### Utils.create

A polyfilled function for subclassing a JavaScript object. Used internally to subclass all Handlebars functionality. This way no Handlebars objects are augmented and we aren't copying entire chunks of functionality.

#### Utils.isNode

Returns a boolean indicating whether the passed in object is a DOM node.

#### Utils.trackNode

Returns an object whose sole purpose is tracking DOM nodes. Comes with some helpful utilities attached.

#### Utils.domifyExpression

Transform anything passed in as the first argument into a DOM node. Handles `DOMBars.SafeString` instances and current nodes correctly.

#### Utils.textifyExpression

Transform anything passed in as the first argument into a text node. `DOMBars.SafeString` instances are transformed into DOM nodes and current DOM nodes are transformed into a string.

## Examples

### Subscribers

```js
// Set a custom subscription function just for the test.
DOMBars.subscribe = function (obj, name, fn) {
  // Every 2 seconds we will be turning the checkbox on and off again.
  window.setInterval(function () {
    obj[name] = !obj[name];
    fn();
  }, 2000);
};

// Generate a template.
var template = DOMBars.compile(
  '<input type="checkbox" checked="{{{test}}}">'
)({
  test: false
});

// Append the template directly to the body element and watch the magic happen.
document.body.appendChild(template);
```

### Helpers

```js
DOMBars.registerHelper('currentTime', function (options) {
  var node = document.createTextNode(new Date().toLocaleTimeString());

  // Update the time in 1 second.
  window.setTimeout(options.update, 1000);

  return node;
});

var template = DOMBars.compile('{{currentTime}}')();

document.body.appendChild(template);
```

## Plugins

* [node-dombarsify](https://github.com/blakeembrey/node-dombarsify) - DOMBars precompiler plugin for Browserify

## License

MIT
