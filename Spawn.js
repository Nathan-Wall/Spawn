var Spawn = (function(Object, String, Error, TypeError) {

	'use strict';

	var eval = eval,
		create = Object.create,
		keys = Object.keys,
		getOwnPropertyNames = Object.getOwnPropertyNames,
		getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor,
		defineProperty = Object.defineProperty,
		getPrototypeOf = Object.getPrototypeOf,
		isExtensible = Object.isExtensible,

		lazyBind = Function.prototype.bind.bind(Function.prototype.call),
		lazyTie = Function.prototype.bind.bind(Function.prototype.apply),

		slice = lazyBind(Array.prototype.slice),
		push = lazyBind(Array.prototype.push),
		pushAll = lazyTie(Array.prototype.push),
		forEach = lazyBind(Array.prototype.forEach),
		some = lazyBind(Array.prototype.some),
		reverse = lazyBind(Array.prototype.reverse),
		contact = lazyBind(Array.prototype.concat),

		join = lazyBind(String.prototype.join),

		call = lazyBind(Function.prototype.call),
		apply = lazyBind(Function.prototype.apply),

		isPrototypeOf = lazyBind(Object.prototype.isPrototypeOf),
		hasOwn = lazyBind(Object.prototype.hasOwnProperty),
		getTagOf = lazyBind(Object.prototype.toString),

		// Returns a clone of an object's own properties without a [[Prototype]].
		own = function own(obj) {
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

			return create(proto, props != null ? propsToDescriptors(own(props), proto) : null);

		},

		spawn = function spawn(obj/*, ...args */) {
			// spawn is beget + construct.

			var O = create(obj),
				construct = O.construct;

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
					f = typeof arguments[2] != 'undefined' ? arguments[2] : arguments[1],

				if (length < 0) length = 0;
				length = length >>> 0;
				if (length > MAX_WRAPPER_LENGTH)
					throw new Error('Maximum length allowed is ' + MAX_WRAPPER_LENGTH + ': ' + length);

				var args = [ ],
					generator = generators[length];

				if (typeof f != 'function')
					throw new TypeError('Function expected: ' + f);

				if (!generator) {

					for (var i = 0; i < length; i++)
						push(args, '$' + i);

					generator = eval(
						'(function(f, original) {'
							+ 'var wrapper = function ' + original.name + '(' + join(args, ',') + ') {'
								+ 'return apply(f, this, arguments);'
							+ '};'
							+ 'wrapper.original = original;'
							+ 'return wrapper;'
						+ '})'
					);

					if (numGenerators < MAX_CACHED_GENERATORS) {
						generators[length] = generator;
						numGenerators++;
					}

				}

				return generator(f, original);

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
				return concatUncommonNames(from, compareWith)
					.filter(function(u) {
						if (namesMap[u]) return false;
						namesMap[u] = true;
						return true;
					});
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

				forEach(getUncommonPropertyNames(mixinWith, mixinWhat), (function(name) {

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
				forEach(keys(descriptors), (function(name) {

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

		copy = function copy(copyWhat/*, ...mixinWith */) {
			// Performs a simple shallow copy intended specifically for objects.
			// For a generic deep clone, use clone.

			if (Object(copyWhat) != copyWhat)
				throw new TypeError('Cannot copy a non-object:' + copyWhat);

			// This algorithm simply creates a new object with the same prototype and then mixes in the own properties.
			// It will also mixin any uncommon properties from other arguments.
			var args = [ create(getPrototypeOf(copyWhat)) ];
			pushAll(args, arguments);
			return apply(mixin, null, args);

		},

		clone = (function() {
			// Performs a deep clone. For a shallow copy, use either the copy method or Object.create.
			// In order to permit objects do define a self cloning method which is utilized by this clone function,
			// there are two steps that must be taken: (1) Define clone.$selfClone with a property name or Symbol
			// (if Symbols are available) which can be used to retrieve the clone method. (2) Define the self cloning
			// method on each object which can self clone using the same property name or symbol.

			var $selfClone,

				clone = function clone(input) {
					$selfClone = clone.$selfClone;
					return structuredClone(input, [ ]);
				},

				structuredClone = function structuredClone(input, memory) {
					// This algorithm is loosely based on the HTML5 internal structured cloning algorithm, but there are
					// some slight deviations.
					// http://www.w3.org/TR/html5/common-dom-interfaces.html#safe-passing-of-structured-data
					// TODO: It may be worthwhile to reevaluate whether there should be deviations in the algorithm or not.

					var pair, output, selfClone;

					if (
						some(memory, function(u) {
							var pair = u;
							return input === pair.source;
						})
					) return pair.destination;

					if (typeof input != 'object' || input === null)
						return input;

					switch(getTagOf(input)) {

						case 'Boolean':		output = new Boolean(Value(input)); break;
						case 'Number':		output = new Number(+input); break;
						case 'String':		output = new String(String(input)); break;
						case 'Date':		output = new Date(+input); break;
						case 'RegExp':		output = new RegExp(String(input)); break;
						// case File: break;
						// case Blob: break;
						// case FileList: break;
						case 'Array':	 	output = new Array(input.length); break;
						//case TypedArray: break;

						case 'Function':
							throw new DataCloneError('Functions cannot be cloned.');

						case 'Object':
						case 'Error':
						case 'Math':
						default:
							// This currently deviates from the internal structured cloning algorithm specification.
							// To follow the standard, it should just be: output = new Object(); break;

							// An object can define its own clone method.
							if($selfClone && (selfClone = input[$selfClone]) && typeof selfClone == 'function') {
								output = call(selfClone, input);
								// If the object cloned itself, it should take care of copying over the correct own
								// properties as well. We leave that up to the object to do internally.
								return output;
							}

							// If input has a cloneNode method, use it.
							// Unfortunately, this assumes anything with a "cloneNode" method (and other duck-type
							// constraints, such as the "nodeType" property) wants to be cloned using that method,
							// which may not be the case. For better integrity, the [[Class]] of input could be
							// checked against known HTML/XML DOM Nodes. However, the list of possible [[Class]]
							// values would be rather large and may not be able to be exhaustive. I'm unsure if
							// there is a better approach. Checking instanceof Node is no good because we have to
							// support nodes from other frames.
							else if('nodeType' in input
									&& 'ownerDocument' in input
									&& typeof input.cloneNode == 'function'
								) output = input.cloneNode(true);

							// Create an object with the same prototype as input.
							else output = create(getPrototypeOf(input));

							break;

					}

					push(memory, {
						source: input,
						destination: output
					});

					forEach(getOwnPropertyNames(input), function(key) {

						var inputDesc = own(getOwnPropertyDescriptor(input, key)),
							clonedPropertyValue;

						if (inputDesc.value) {
							// Clone the property value for a deep clone.
							clonedPropertyValue = structuredClone(inputDesc.value, memory);
							defineProperty(output, key, {
								value: clonedPropertyValue,
								enumerable: inputDesc.enumerable,
								writable: inputDesc.writable,
								configurable: inputDesc.configurable
							});
						} else {
							// For getters and setters we just copy over the descriptor. We expect getters and setters
							// to be smart enough to work with their given context to produce reasonable values in the
							// event that they are copied to other objects.
							defineProperty(output, key, inputDesc);
						}

					});

					return output;

				};

			return clone;

		})(),

		cast = function cast(obj, value) {
			if (inherits(value, this))
				return value;
			else
				return spawn(obj, value);
		};

	return beget(null, {

		beget: beget,
		spawn: spawn,

		frozen: frozen,
		sealed: sealed,

		inherits: inherits,
		extend: extend,
		mixin: mixin,

		copy: copy,
		clone: clone,
		cast: cast

	});

})(Object, String, Error, TypeError);

// Export if `exports` is present.
if (typeof exports != 'undefined' && Object(exports) === exports)
	Spawn.mixin(exports, Spawn);