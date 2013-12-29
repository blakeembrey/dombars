# dombars

DOMBars is an extension of [Handlebars.js](https://github.com/wycats/handlebars.js). It keeps almost all the same semantics of Handlebars, but generates DOM objects instead of string-based templates. This is an extremely powerful concept when you consider data binding and reactive programming. By creating DOM representations of a template, we can easily keep track of all the generated nodes and update only the specific content when data changes. All of this is possible without any special markup being added to your HTML and Handlebars templates.

## Installation

Installing DOMBars is simple. Multiple builds are provided in the `dist` directory, just add the required script to you site. Alternatively DOMBars is available on [npm](https://npmjs.org/package/dombars).

## Usage

The API is backward-compatible with Handlebars, but extends it with all the DOM-based functionality. Semantically, there is zero change; however, one thing to keep in mind is that helper functions generate DOM objects (not strings), so you can't just concatenate together and hope for the best. To achieve a similar effect, create a document fragment and return it instead.

### Getters

To provide a custom getter function, just set `DOMBars.get` to your desired function. The function accepts two arguments, the `object` and `property`.

### Subscribers

Subscriptions are used to achieve data binding. By default, the subscription is a no-op. To set up your own custom subscription function, set `DOMBars.subscribe` to the disired subsciber. The function itself accepts three arguments - `object`, `property` and `callback`. For example, to do data binding with Backbone.js:

```js
DOMBars.subscribe = function (object, property, callback) {
  object.on('change:' + property, callback);
};
```

You also need to provide an unsubscribe function under `DOMBars.unsubscribe`. This function accepts the same three arguments - `object`, `property` and `callback`. The callback is the same function that was passed in with `DOMBars.subscribe`. For example, to unsubscribe a subscription in Backbone.js:

```js
DOMBars.unsubscribe = function (object, property, callback) {
  object.off('change:' + property, callback);
};
```

### Unsubscribing

DOMBars templates automatically unsubscribe listeners when a change happens. However, to unsubscribe the root DOM element you need to call the `unsubscribe` method on the returned object. This is important since your listeners and helpers would otherwise not know to stop listening for changes, and would result in a fairly substantial memory leak over time.

For custom helpers that need to be unsubscribed, a function is made available to helper functions through the `unsubscribe` method. Pass in a function that needs to be called on unsubscription, and when the helper is destroyed the unsubscribe function will be called.

### Events

DOMBars will emit events during the contruction of every template. This allows the creation of some amazing plugins and optimized attaching of event listeners to the DOM, since you no longer need to do DOM traversal.

To listen to events, you can subscribe using the regular `DOMBars.on` or `DOMBars.once` for a callback that should only run once.

**createElement** (el)

Triggered any time an element in the template is created. This occurs before the element has any attributes or is appended to the DOM.

**createComment** (el)

Triggered any time a comment node is created from the template. This occurs before the comment has been appended to the DOM.

**setAttribute** (el, name, value)

Triggered when an attribute is set on an element in the template. This occurs before the attribute is set, so it is possible to read the previous attribute (if any).

**removeAttribute** (el, name)

Triggered when an attribute is removed from an element in the template. This occurs right before the attribute is removed.

**appendChild** (parent, child)

Triggered any time a child node is appended to the template. This occurs after the child has been appended to the parent, allowing access to the `parentNode` property.

### Helpers

#### Attributes

A helper can check the context in which it is being compiled by checking the boolean `attribute` property on the passed in `options`.

#### Block helpers

The `fn` and `inverse` properties of block helpers return an object the same as the root template function. This allows you to unsubscribe individual block helpers if you happen to call it multiple times.

### Utilities

DOMBars extends the built-in Handlebars utilities with some additional functionality.

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
document.body.appendChild(template.value);
```

### Helpers

```js
DOMBars.registerHelper('currentTime', function (options) {
  var node = document.createTextNode(new Date().toLocaleTimeString());

  var interval = window.setInterval(function () {
    node.textContent = new Date().toLocaleTimeString();
  }, 1000);

  // Use the unsubscribe method to completely remove helpers.
  options.unsubscribe(function () {
    window.clearInterval(interval);
  });

  return node;
});

var template = DOMBars.compile('{{currentTime}}')();

document.body.appendChild(template.value);
```

## Plugins

* [node-dombarsify](https://github.com/blakeembrey/node-dombarsify) - DOMBars precompiler plugin for Browserify

## License

MIT
