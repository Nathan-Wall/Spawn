var Unit = (function() {

	'use strict';

	var // The prototypical object from which all Units inherit.
		// Basically, this object provides Units with Object.prototype properties, but it also
		// allows all units' prototype to be modified directly with Unit.newProp = value;
		// We use the syntax below (instead of simply Unit = { }) so that units have the name "Unit" when logged.
		Unit = (function Unit() { }).prototype,

		beget = function beget(/* proto, props */) {

			var proto = arguments[0] != null ? Object(arguments[0]) : null,
				props = arguments[1] != null ? Object(arguments[1]) : null;

			return Object.create(proto, props ? propsToDescriptors(props, proto) : undefined);

		},

		lazyBind = Function.prototype.bind.bind(Function.prototype.call),
		lazyTie = Function.prototype.bind.bind(Function.prototype.apply),
		slice = lazyBind(Array.prototype.slice),
		pushAll = lazyTie(Array.prototype.push),
		isPrototype = lazyBind(Object.prototype.isPrototypeOf),
		hasOwn = lazyBind(Object.prototype.hasOwnProperty),
		getTagOf = lazyBind(Object.prototype.toString),

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

				var original = arguments[0],
					length = typeof arguments[2] != 'undefined' ? arguments[1] : original.length,
					f = typeof arguments[2] != 'undefined' ? arguments[2] : arguments[1],

					args = [ ],
					generator = generators[length];

				if (length < 0) length = 0;
				length = length >>> 0;
				if (length > MAX_WRAPPER_LENGTH)
					throw new Error('Maximum length allowed is ' + MAX_WRAPPER_LENGTH + ': ' + length);

				if (typeof original != 'function')
					throw new TypeError('Function expected: ' + original);

				if (typeof f != 'function')
					throw new TypeError('Function expected: ' + f);

				if (!generator) {

					for (var i = 0; i < length; i++)
						args.push('$' + i);

					generator = eval(
						'(function(f, original) {'
							+ 'var wrapper = function ' + original.name + '(' + args.join(',') + ') {'
								+ 'return f.apply(this, arguments);'
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
				return f.apply(null, args.reverse());
			});
		},

		isA = invert(isPrototype, 2),

		reBase = /\.\s*base\b/,

		propsToDescriptors = function propsToDescriptors(props, base) {

			var desc = Object.create(null),

				baseIsObject = Object(base) === base;

			getUncommonPropertyNames(props, base).forEach(function(name) {

				var d = Object.getOwnPropertyDescriptor(props, name);
				d.enumerable = false;

				if (// Only Units are magicWrapped to allow a special base method.
					baseIsObject && Unit && isA(base, Unit)
					&& hasOwn(d, 'value')
					&& typeof d.value == 'function'
					&& typeof base[name] == 'function'
					&& reBase.test(d.value.toString())
				) d.value = magicWrap(d.value, base, name);

				desc[name] = d;

			});

			return desc;

		},

		magicWrap = (function() {

			var NONEXISTANT = { };

			return function magicWrap(f, base, method) {
				// Wrap a function with one which provides base[method] through this.base when called.

				return createWrapper(f, function magicWrapped() {

					var O = Object(this),
						oldBase = NONEXISTANT,
						changed = false,
						ret;

					if (!hasOwn(O, 'base') || Object.getOwnPropertyDescriptor(O, 'base').writable) {
						if (hasOwn(O, 'base')) {
							oldBase = O.base;
						}
						O.base = base[method];
						changed = true
					}

					// this is intended instead of O below, to allow calling in non-object context, such as null.
					ret = f.apply(this, arguments);

					if (changed) {
						if (oldBase === NONEXISTANT) delete O.base;
						else O.base = oldBase;
					}

					return ret;

				});
			};

		})(),

		contextualize = function contextualize(f/*, arg1, arg2, ... */) {
			// The opposite of lazyBind, this function returns a wrapper which calls f, passing the wrapper's context as
			// the first argument to f.

			if (typeof f != 'function')
				throw new TypeError('Function expected: ' + f);

			var doF = lazyTie(f),
				args = slice(arguments, 1);

			return createWrapper(f, f.length - 1, function contextualizedMethod() {
				return doF(null, [ this ].concat(args, slice(arguments)));
			});

		},

		getUncommonPropertyNames = (function() {
			return function getUncommonPropertyNames(from, compareWith) {
				var namesMap = Object.create(null);
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
					|| isA(compareWith, from)) return [ ];
				return Object.getOwnPropertyNames(from).concat(
					concatUncommonNames(Object.getPrototypeOf(from), compareWith));
			}
		})(),

		getPropertyDescriptor = function getPropertyDescriptor(obj, name) {
			if (Object(obj) !== obj) return undefined;
			return Object.getOwnPropertyDescriptor(obj, name)
				|| getPropertyDescriptor(Object.getPrototypeOf(obj), name);
		},

		mixin = function mixin(mixinWhat/*, mixinWith1, mixinWith2, ... */) {

			var mixinWith;

			if (Object(mixinWhat) != mixinWhat)
				throw new TypeError('Cannot mixin a non-object: ' + mixinWhat);

			if (!Object.isExtensible(mixinWhat))
				throw new Error('Cannot mixin on non-exensible object');

			for (var i = 1; i < arguments.length; i++) {

				mixinWith = Object(arguments[i]);

				getUncommonPropertyNames(mixinWith, mixinWhat).forEach(function(name) {

					var whatDesc = getPropertyDescriptor(mixinWhat, name),
						withDesc = getPropertyDescriptor(mixinWith, name);

					if (!whatDesc || whatDesc.configurable)
						// If mixinWhat does not already have the property, or if mixinWhat
						// has the property and it's configurable, add it as is.
						Object.defineProperty(mixinWhat, name, withDesc);
					else if (whatDesc.writable && 'value' in withDesc)
						// If the property is writable and the withDesc has a value, write the value.
						mixinWhat[name] = withDesc.value;

				});
			}

			return mixinWhat;

		},

		extend = function extend(extendWhat/*, extendWith1, extendWith2 */) {

			var extendWith, descriptors;

			if (Object(extendWhat) != extendWhat)
				throw new TypeError('Cannot call extend on a non-object: ' + extendWhat);

			if (!Object.isExtensible(extendWhat))
				throw new Error('Cannot extend non-exensible object');

			for (var i = 1; i < arguments.length; i++) {

				extendWith = Object(arguments[i]);

				descriptors = propsToDescriptors(extendWith, extendWhat);

				// We define these one at a time in case a property on extendWhat is non-configurable.
				Object.keys(descriptors).forEach(function(name) {

					var whatDesc = Object.getOwnPropertyDescriptor(extendWhat, name),
						withDesc = descriptors[name];

					if (!whatDesc || whatDesc.configurable)
						Object.defineProperty(extendWhat, name, withDesc);
					else if (whatDesc.writable && 'value' in withDesc)
						extendWhat[name] = withDesc.value;

				});

			}

			return extendWhat;

		},

		copy = function copy(copyWhat/*, mixin1, mixin2, ... */) {
			// Performs a simple shallow copy intended specifically for objects.
			// For a generic deep clone, use clone.

			if (Object(copyWhat) != copyWhat)
				throw new TypeError('Cannot copy a non-object:' + copyWhat);

			// This algorithm simply creates a new object with the same prototype and then mixes in the own properties.
			// It will also mixin any uncommon properties from other arguments.
			var args = [ Object.create(Object.getPrototypeOf(copyWhat)) ];
			pushAll(args, arguments);
			return mixin.apply(null, args);

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
						memory.some(function(u) {
							var pair = u;
							return input === pair.source;
						})
					) return pair.destination;

					if (typeof input != 'object' || input === null)
						return input;

					switch(getTagOf(input)) {

						case 'Boolean':		output = new Boolean(input.valueOf()); break;
						case 'Number':		output = new Number(input.valueOf()); break;
						case 'String':		output = new String(input.toString()); break;
						case 'Date':		output = new Date(input.getTime()); break;
						case 'RegExp':		output = new RegExp(input.toString()); break;
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
								output = selfClone.call(input);
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
							else output = Object.create(Object.getPrototypeOf(input));

							break;

					}

					memory.push({
						source: input,
						destination: output
					});

					Object.getOwnPropertyNames(input).forEach(function(key) {

						var inputDesc = Object.getOwnPropertyDescriptor(input, key),
							clonedPropertyValue;

						if (inputDesc.value) {
							// Clone the property value for a deep clone.
							clonedPropertyValue = structuredClone(inputDesc.value, memory);
							Object.defineProperty(output, key, {
								value: clonedPropertyValue,
								enumerable: inputDesc.enumerable,
								writable: inputDesc.writable,
								configurable: inputDesc.configurable
							});
						} else {
							// For getters and setters we just copy over the descriptor. We expect getters and setters
							// to be smart enough to work with their given context to produce reasonable values in the
							// event that they are copied to other objects.
							Object.defineProperty(output, key, inputDesc);
						}

					});

					return output;

				};

			return clone;

		})();

	if (typeof SpawnExports == 'object') {
		extend(SpawnExports, {
			beget: beget,
			lazyBind: lazyBind,
			lazyTie: lazyTie,
			slice: slice,
			isPrototype: isPrototype,
			hasOwn: hasOwn,
			getTagOf: getTagOf,
			createWrapper: createWrapper,
			invert: invert,
			isA: isA,
			propsToDescriptors: propsToDescriptors,
			magicWrap: magicWrap,
			contextualize: contextualize,
			getUncommonPropertyNames: getUncommonPropertyNames,
			getPropertyDescriptor: getPropertyDescriptor,
			extend: extend,
			mixin: mixin,
			copy: copy,
			clone: clone
		});
	}

	return extend(Unit, {

		beget: contextualize(beget),
		spawn: function spawn() {
			// spawn is identical to beget, but doesn't take the properties argument.
			// This allows for overriding spawn to accept instantiation arguments.
			return beget(this);
		},
		copy: contextualize(copy),
		clone: contextualize(clone),
		cast: function cast(value) {
			if (!isA(this, Unit)) throw new TypeError('cast can only be called on a Unit.');
			if (isA(value, this)) return value;
			if (typeof this.spawn == 'function') return this.spawn(value);
			else return beget(this);
		},

		isA: contextualize(isA),
		extend: contextualize(extend),
		mixin: contextualize(mixin),

		base: function base() {
			throw new Error('base method called outside of magic method.');
		}

	});

})();