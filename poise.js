var poise = (function() {

	'use strict';

	var hasOwn = Function.prototype.call.bind(Object.prototype.hasOwnProperty),

		// The prototypical object from which all spawns inherit.
		// Basically, this object provides spawns with Object.prototype properties, but it also
		// allows all spawned objects' prototype to be modified directly with
		// Object.getPrototypeOf(spawnedObject).newProp = value;
		PROTO = { },

		beget = function beget(/* proto, props */) {

			var proto = arguments[0] != null ? Object(arguments[0]) : null,
				props = arguments[1] != null ? Object(arguments[1]) : null;

			return Object.create(proto, props ? propsToDescriptors(props, proto) : undefined);

		},

		reBase = /\.\s*base\b/,

		propsToDescriptors = function propsToDescriptors(props, proto) {

			var desc = { };

			Object.getOwnPropertyNames(props).forEach(function(name) {

				var d = Object.getOwnPropertyDescriptor(props, name);
				//d.enumerable = false;

				if (
					hasOwn(d, 'value')
					&& typeof d.value == 'function'
					&& typeof proto[name] == 'function'
					&& reBase.test(d.value.toString())
				) {
					d.value = magicWrap(d.value, proto[name]);
				}

				desc[name] = d;

			});

			return desc;

		},

		magicWrap = function magicWrap(f, baseF) {

			return createWrapper(f, function magicWrapped() {

				var O = Object(this),
					NONEXISTANT = { },
					oldBase = NONEXISTANT,
					changed = false,
					ret;

				if (!hasOwn(O, 'base') || Object.getOwnPropertyDescriptor(O, 'base').writable) {
					if (hasOwn(O, 'base')) {
						oldBase = O.base;
					}
					O.base = baseF;
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

		},

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

					for(var i = 0; i < length; i++)
						args.push('$' + i);

					generator = eval('(function(f, original) { var wrapper = function ' + original.name + '(' + args.join(',') + ') { return f.apply(this, arguments); }; wrapper.original = original; return wrapper; })');

					// Limit the number of generators which are cached to preserve memory in the unusual case that someone
					// creates many generators. We don't go to lengths to make the cache drop old, unused values as there
					// really shouldn't be a need for so many generators in the first place.
					if (numGenerators < 64) {
						generators[length] = generator;
						numGenerators++;
					}

				}

				return generator(f, original);

			};

		})(),

		spawn = function spawn(props) {
			return beget(PROTO, props);
		},

		Thing = spawn({

			base: function base() {
				throw new Error('base method called outside of magic method.');
			},

			beget: function beget(props) {
				return poise.beget(this, props);
			}

		}),

		poise = spawn({

			hasOwn: hasOwn,
			spawn: spawn,
			beget: beget,

			Thing: Thing

		});

	return poise;

})();