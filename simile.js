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

		like = function like(/* proto, props */) {

			var proto = arguments[0] != null ? Object(arguments[0]) : null,
				props = arguments[1] != null ? Object(arguments[1]) : null;

			return create(proto, props != null ? propsToDescriptors(own(props), proto) : undefined);

		},

		beget = function beget(obj/*, ...args */) {
			// beget is like + init.

			var O = create(obj),
				init = O.init;

			// TODO: Only pass own() versions of the objects to the initializer?
			if (typeof init == 'function')
				apply(init, O, slice(arguments, 1));

			return O;

		},

		isLike = function isLike(obj, proto) {
			return isPrototypeOf(proto, obj);
		},

		propsToDescriptors = function propsToDescriptors(props, base) {

			var desc = create(null);

			forEach(getUncommonPropertyNames(props, base), function(name) {
				var d = own(getOwnPropertyDescriptor(props, name));
				if (isLike(d.value, Descriptor))
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
					|| isLike(compareWith, from)) return [ ];
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
			return like(Descriptor, {
				value: value,
				enumerable: false,
				writable: true,
				configurable: false
			});
		},

		frozen = function frozen(value) {
			return like(Descriptor, {
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

		simile = like(null, {

			like: like,
			beget: beget,

			frozen: frozen,
			sealed: sealed,

			isLike: isLike,
			extend: extend,
			mixin: mixin

		});

	// Export for Node.
	if (typeof module == 'object' && typeof module.exports == 'object')
		module.exports = simile;

	// Export for AMD
	else if (typeof global.define == 'function' && global.define.amd)
		global.define(function() { return simile; });

	// Export as a global
	else
		global.simile = simile;

})(typeof global != 'undefined' && Object(global) === global ? global : typeof window != 'undefined' ? window : this, Object, String, Error, TypeError);