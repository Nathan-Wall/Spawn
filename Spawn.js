var Spawn = (function() {

	'use strict';

	var // The prototypical object from which all Spawns inherit.
		// Basically, this object provides Spawns with Object.prototype properties, but it also
		// allows all spawned objects' prototype to be modified directly with Spawn.newProp = value;
		// We use the syntax below (instead of simply Spawn = { }) so that spawns have the name "Spawn" when logged.
		Spawn = (function Spawn() { }).prototype,

		beget = function beget(/* proto, props */) {

			var proto = arguments[0] != null ? Object(arguments[0]) : null,
				props = arguments[1] != null ? Object(arguments[1]) : null;

			return Object.create(proto, props ? propsToDescriptors(props, proto) : undefined);

		},

		lazyBind = Function.prototype.bind.bind(Function.prototype.call),
		lazyTie = Function.prototype.bind.bind(Function.prototype.apply),
		slice = lazyBind(Array.prototype.slice),
		isPrototypeOf = lazyBind(Object.prototype.isPrototypeOf),
		hasOwn = lazyBind(Object.prototype.hasOwnProperty),

		// Creates a wrapper function with the same length as the original.
		createWrapper = (function() {

			// Let's memoize wrapper generators to avoid using eval too often.
			var generators = { },

				numGenerators = 0;

			return function createWrapper(original, f) {

				var length = original.length,
					args = [ ],
					generator = generators[length];

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

					// Limit the number of generators which are cached to preserve memory in the unusual case that
					// someone creates many generators. We don't go to lengths to make the cache drop old, unused
					// values as there really shouldn't be a need for so many generators in the first place.
					if (numGenerators < 64) {
						generators[length] = generator;
						numGenerators++;
					}

				}

				return generator(f, original);

			};

		})(),


		invert = function invert(f/*, length*/) {
			var length = arguments[1];
			return createWrapper(f, function wrapper() {
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

		isA = invert(isPrototypeOf, 2),

		reBase = /\.\s*base\b/,

		propsToDescriptors = function propsToDescriptors(props, base) {

			var desc = { },

				baseIsObject = Object(base) === base;

			getUncommonPropertyNames(props, base).forEach(function(name) {

				var d = Object.getOwnPropertyDescriptor(props, name);
				d.enumerable = false;

				if (// Only Spawns are magicWrapped to allow a special base method.
					baseIsObject && Spawn && isA(base, Spawn)
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

			function contextualizedMethod() {
				return doF(null, [ this ].concat(args, slice(arguments)));
			}

			contextualizedMethod.original = f;
			return contextualizedMethod;

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

			for (var i = 1; i < arguments.length; i++) {
				mixinWith = Object(arguments[i]);
				getUncommonPropertyNames(mixinWith, mixinWhat).forEach(function(name) {
					var whatDesc = getPropertyDescriptor(mixinWhat, name),
						withDesc = getPropertyDescriptor(mixinWith, name);
					if (!whatDesc || whatDesc.configurable) {
						// If mixinWhat does not already have the property, or if mixinWhat
						// has the property and it's configurable, add it as is.
						Object.defineProperty(mixinWhat, name, withDesc);
					} else if (whatDesc.writable && 'value' in withDesc) {
						// If the property is writable and the withDesc has a value, write the value.
						mixinWhat[name] = withDesc.value;
					}
				});
			}

			return mixinWhat;

		},

		extend = function extend(extendWhat/*, extendWith1, extendWith2 */) {

			var extendWith;

			if (Object(extendWhat) != extendWhat)
				throw new TypeError('Cannot call extend on a non-object: ' + extendWhat);

			for (var i = 1; i < arguments.length; i++) {
				extendWith = Object(arguments[i]);
				Object.defineProperties(extendWhat, propsToDescriptors(extendWith, extendWhat));
			}

			return extendWhat;

		};

	if (typeof SpawnExports == 'object') {
		extend(SpawnExports, {
			beget: beget,
			lazyBind: lazyBind,
			lazyTie: lazyTie,
			slice: slice,
			isPrototypeOf: isPrototypeOf,
			hasOwn: hasOwn,
			createWrapper: createWrapper,
			invert: invert,
			isA: isA,
			propsToDescriptors: propsToDescriptors,
			magicWrap: magicWrap,
			contextualize: contextualize,
			getUncommonPropertyNames: getUncommonPropertyNames,
			getPropertyDescriptor: getPropertyDescriptor,
			extend: extend,
			mixin: mixin
		});
	}

	return extend(Spawn, {

		beget: contextualize(beget),
		hatch: function hatch() {
			// hatch is identical to beget, but doesn't take the properties argument.
			// This allows for overriding hatch to accept instantiation arguments.
			return beget(this);
		},
		cast: function cast(value) {
			if (!isA(this, Spawn)) throw new TypeError('cast can only be called on a Spawn.');
			if (isA(value, this)) return value;
			if (typeof this.hatch == 'function') return this.hatch(value);
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