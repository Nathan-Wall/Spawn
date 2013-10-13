// TODO: Rename `beget` to `like` and `spawn` to `beget`?

(function(global, Object, String, Error, TypeError) {

	'use strict';

	var create = Object.create,
		keys = Object.keys,
		getOwnPropertyNames = Object.getOwnPropertyNames,
		getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor,
		defineProperty = Object.defineProperty,
		getPrototypeOf = Object.getPrototypeOf,
		isExtensible = Object.isExtensible,

		lazyBind = Function.prototype.bind.bind(Function.prototype.call),

		slice = lazyBind(Array.prototype.slice),
		push = lazyBind(Array.prototype.push),
		forEach = lazyBind(Array.prototype.forEach),
		some = lazyBind(Array.prototype.some),
		reverse = lazyBind(Array.prototype.reverse),
		contact = lazyBind(Array.prototype.concat),
		join = lazyBind(Array.prototype.join),
		filter = lazyBind(Array.prototype.filter),

		call = lazyBind(Function.prototype.call),
		apply = lazyBind(Function.prototype.apply),

		isPrototypeOf = lazyBind(Object.prototype.isPrototypeOf),
		hasOwn = lazyBind(Object.prototype.hasOwnProperty),
		getTagOf = lazyBind(Object.prototype.toString),

		replace = lazyBind(String.prototype.replace),

	 	// `eval` is reserved in strict mode.
	 	// Also, we want to use indirect eval so that implementations can take advantage
	 	// of memory & performance enhancements which are possible without direct eval.
		_eval = eval,

		// Returns a clone of an object's own properties without a [[Prototype]].
		own = function own(obj) {
			if (obj == null || getPrototypeOf(obj) == null)
				return obj;
			var O = create(null);
			forEach(getOwnPropertyNames(obj), function(key) {
				defineProperty(O, key,
					getOwnPropertyDescriptor(obj, key));
			});
			return O;
		},

		beget = function beget(/* proto, props */) {

			var proto = arguments[0] != null ? Object(arguments[0]) : null,
				props = arguments[1] != null ? Object(arguments[1]) : null;

			return create(proto, props != null ? propsToDescriptors(own(props), proto) : undefined);

		},

		spawn = function spawn(obj/*, ...args */) {
			// spawn is beget + construct.

			var O = create(obj),
				construct = O.construct;

			// TODO: Only pass own() versions of the objects to the constructor?
			if (typeof construct == 'function')
				apply(construct, O, slice(arguments, 1));

			return O;

		},

		// Creates a wrapper function with the same length as the original.
		createWrapper = (function() {

			// Let's memoize wrapper generators to avoid using eval too often.
			var generators = { },

				numGenerators = 0,

				// Let's limit length to 512 for now. If someone wants to up it, they can.
				MAX_WRAPPER_LENGTH = 512,

				// Limit the number of generators which are cached to preserve memory in the unusual case that
				// someone creates many generators. We don't go to lengths to make the cache drop old, unused
				// values as there really shouldn't be a need for so many generators in the first place.
				MAX_CACHED_GENERATORS = 64;

			return function createWrapper(/* original, length, f */$0, $1) {

				var original = arguments[0];

				if (typeof original != 'function')
					throw new TypeError('Function expected: ' + original);

				var length = typeof arguments[2] != 'undefined' ? arguments[1] : original.length,
					f = typeof arguments[2] != 'undefined' ? arguments[2] : arguments[1];

				if (length < 0) length = 0;
				length = length >>> 0;
				if (length > MAX_WRAPPER_LENGTH)
					throw new Error('Maximum length allowed is ' + MAX_WRAPPER_LENGTH + ': ' + length);

				var args = create(null),
					generator = generators[length];

				args.length = 0;

				if (typeof f != 'function')
					throw new TypeError('Function expected: ' + f);

				if (!generator) {

					for (var i = 0; i < length; i++)
						push(args, '$' + i);

					generator = _eval(
						'(function(wrapF, original, name, apply, _eval) {'
							+ '"use strict";'
							+ 'var wrapper = _eval("(function(wrapF, original, name, apply) {'
								+ 'return (function " + name + "_(' + join(args, ',') + ') {'
									+ 'return apply(wrapF, this, arguments);'
								+ '});'
							+ '})")(wrapF, original, name, apply);'
							+ 'wrapper.original = original;'
							+ 'return wrapper;'
						+ '})'
					);

					if (numGenerators < MAX_CACHED_GENERATORS) {
						generators[length] = generator;
						numGenerators++;
					}

				}

				return generator(f, original, replace(original.name, /\W/g, '_'), apply, _eval);

			};

		})(),

		invert = function invert(f/*, length*/) {
			var length = arguments[1];
			return createWrapper(f, length, function wrapper() {
				var args;
				if (length !== undefined) {
					args = slice(arguments, 0, length);
					args.length = length;
				} else {
					args = slice(arguments);
				}
				// TODO: Array.prototype.reverse seems to use Put(), which may cause problems(?) if Array.prototype[index] is changed
				// to a setter. Look into this and workarounds (possibly mention to ES-Discuss).
				return apply(f, null, reverse(args));
			});
		},

		inherits = invert(isPrototypeOf, 2),

		propsToDescriptors = function propsToDescriptors(props, base) {

			var desc = create(null);

			forEach(getUncommonPropertyNames(props, base), function(name) {
				var d = own(getOwnPropertyDescriptor(props, name));
				if (inherits(d.value, Descriptor))
					d = d.value;
				else
					d.enumerable = false;
				desc[name] = d;
			});

			return desc;

		},

		getUncommonPropertyNames = (function() {
			return function getUncommonPropertyNames(from, compareWith) {
				var namesMap = create(null);
				return filter(
					concatUncommonNames(from, compareWith),
					function(u) {
						if (namesMap[u]) return false;
						namesMap[u] = true;
						return true;
					}
				);
			};
			function concatUncommonNames(from, compareWith) {
				if (Object(from) != from
					|| from === compareWith
					|| inherits(compareWith, from)) return [ ];
				return contact(getOwnPropertyNames(from),
					concatUncommonNames(getPrototypeOf(from), compareWith));
			}
		})(),

		getPropertyDescriptor = function getPropertyDescriptor(obj, name) {
			if (Object(obj) !== obj) return undefined;
			return getOwnPropertyDescriptor(obj, name)
				|| getPropertyDescriptor(getPrototypeOf(obj), name);
		},

		Descriptor = create(null),

		sealed = function sealed(value) {
			return beget(Descriptor, {
				value: value,
				enumerable: false,
				writable: true,
				configurable: false
			});
		},

		frozen = function frozen(value) {
			return beget(Descriptor, {
				value: value,
				enumerable: false,
				writable: false,
				configurable: false
			});
		},

		mixin = function mixin(mixinWhat/*, ...mixinWith */) {

			var mixinWith;

			if (Object(mixinWhat) != mixinWhat)
				throw new TypeError('Cannot mixin a non-object: ' + mixinWhat);

			if (!isExtensible(mixinWhat))
				throw new Error('Cannot mixin on non-exensible object');

			for (var i = 1; i < arguments.length; i++) {

				mixinWith = Object(arguments[i]);

				forEach(getUncommonPropertyNames(mixinWith, mixinWhat), function(name) {

					var whatDesc = own(getPropertyDescriptor(mixinWhat, name)),
						withDesc = own(getPropertyDescriptor(mixinWith, name));

					if (!whatDesc || whatDesc.configurable)
						// If mixinWhat does not already have the property, or if mixinWhat
						// has the property and it's configurable, add it as is.
						defineProperty(mixinWhat, name, withDesc);
					else if (whatDesc.writable && 'value' in withDesc)
						// If the property is writable and the withDesc has a value, write the value.
						mixinWhat[name] = withDesc.value;

				});
			}

			return mixinWhat;

		},

		extend = function extend(extendWhat/*, ...extendWith */) {

			var extendWith, descriptors;

			if (Object(extendWhat) != extendWhat)
				throw new TypeError('Cannot call extend on a non-object: ' + extendWhat);

			if (!isExtensible(extendWhat))
				throw new Error('Cannot extend non-exensible object');

			for (var i = 1; i < arguments.length; i++) {

				extendWith = Object(arguments[i]);

				descriptors = propsToDescriptors(own(extendWith), extendWhat);

				// We define these one at a time in case a property on extendWhat is non-configurable.
				forEach(keys(descriptors), function(name) {

					var whatDesc = own(getOwnPropertyDescriptor(extendWhat, name)),
						withDesc = descriptors[name];

					if (!whatDesc || whatDesc.configurable)
						defineProperty(extendWhat, name, withDesc);
					else if (whatDesc.writable && 'value' in withDesc)
						extendWhat[name] = withDesc.value;

				});

			}

			return extendWhat;

		},

		Spawn = beget(null, {

			beget: beget,
			spawn: spawn,

			frozen: frozen,
			sealed: sealed,

			inherits: inherits,
			extend: extend,
			mixin: mixin

		});

	// Export for Node.
	if (typeof module == 'object' && typeof module.exports == 'object')
		module.exports = Spawn;

	// Export for AMD
	else if (typeof global.define == 'function' && global.define.amd)
		global.define(function() { return Spawn; });

	// Export as a global
	else
		global.Spawn = Spawn;

})(typeof global != 'undefined' && Object(global) === global ? global : typeof window != 'undefined' ? window : this, Object, String, Error, TypeError);