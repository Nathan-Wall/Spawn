Spawn
=====

A small, experimental library which attempts to push prototypal inheritance to its natural conclusions in JavaScript
(for ECMAScript 5).

This library provides a few basic functions which are oriented toward making prototypal inheritence simple and straight-forward.

Inheritance (`beget`)
---------------------

To create an object use `beget`.

	var Pizza = beget();
	// Pizza is an object which has no prototype.

    Object.getPrototypeOf(Pizza); // => null

To create an object which inherits from another object, use `beget` again.

	var CheesePizza = beget(Pizza);
	// CheesePizza inherits from Pizza

The `beget` method accepts one optional argument, a map of properties to add to the new object.

	var PepperoniPizza = beget(Pizza, {
		toppings: [ 'pepperoni' ]
	});
	PepperoniPizza.toppings; // => [ 'pepperoni' ]

	var MediumPepperoniPizza = beget(PepperoniPizza, {
		diameter: frozen('22cm')
	});
	MediumPepperoniPizza.diameter; // => '22cm'
	MediumPepperoniPizza.toppings; // => [ 'pepperoni' ]

These properties are non-enumerable.

	MediumPepperoniPizza.slices = 8;

	for(var key in MediumPepperoniPizza) {
		console.log(key);
	}
	// Only logs 'slices'. The other properties ('diameter', 'toppings') are not logged because
	// they are non-enumerable.

These properties are, however, writable and configurable (by default).

	MediumPepperoniPizza.diameter = '20cm';
	delete MediumPepperoniPizza.toppings;

	MediumPepperoniPizza.diameter; // => '20cm'
	MediumPepperoniPizza.toppings; // => undefined

Properties inherit a false writable or configurable state.

    FrozenPizza = beget(PepperoniPizza, Object.freeze({
        thaw: function() { console.log('thawing!'); }
    }));

    FrozenPizza.thaw = 1;    // Error: `thaw` is non-writable
    delete FrozenPizza.thaw; // Error: `thaw` is non-configurable

`beget` is like `Object.create`, except it has an easier, cleaner
syntax with (we feel) reasonable defaults for the property descriptors.

	var beget = Function.prototype.call.bind(Unit.beget);

	var John = beget(Mike, {
		firstName: 'John'
	});
	John.getName(); // => 'John Campbell'

Like `Object.create`, `beget` can be used on `null` to create an object with no inheritance.

	var x = beget(null);
	'hasOwnProperty' in x; // => false
	// x does not inherit from Object (or anything)

`sealed` and `frozen`
---------------------

A property can be set to be non-configurable or non-writable using `sealed` and `frozen`. The former makes a property non-configurable, while the latter makes a property both non-configurable and non-writable.

    var Canine = beget(),
        Fox = beget(Canine, {
            color: sealed('red'),
            trait: frozen('sneaky')
        });

    // `color` is writable
    Fox.color = 'gray';
    // But it is not configurable
    Object.defineProperty(Fox, 'color', { enumerable: true }); // Error
    // And `trait` is neither writable nor configurable
    Fox.trait = 'lazy'; // Error
    Object.defineProperty(Fox, 'trait', { enumerable: true }); // Error

`spawn`
-----

`spawn` is `beget + construct`. It calls `beget` on the first argument and passes any other arguments to an object's `construct` method (if present).

	var Person = beget(null, {
		construct: function(firstName, lastName) {
            this.firstName = firstName;
            this.lastName = lastName;
		},
		getName: function() {
			return this.firstName + ' ' + this.lastName;
		}
	});
	var Mike = spawn(Person, 'Mike', 'Campbell');
	Mike.getName(); // => 'Mike Campbell'

`extend`
------

`extend` can be used to extend the properties of an object.

	var Santa = beget();
	extend(Santa, {
		speak: function() {
			return 'Ho ho ho!';
		}
	});
	Santa.speak(); // => 'Ho ho ho!'

Properties added with `extend` are non-enumerable.

`mixin`
-----

`mixin` can be used to mix one object into another. It differs from `extend` in two ways: (1) properties remain enumerable if they are enumerable on the mixin, and (2) inherited properties are mixed in (up to a common parent).

	var Santa = beget();
	mixin(Santa, {
		speak: function() {
			return 'Ho ho ho!';
		}
	});

	var descriptor = Object.getOwnPropertyDescriptor(Santa, 'speak');
	descriptor.enumerable;   // => true
	descriptor.writable;     // => true
	descriptor.configurable; // => true

    var Holidayer = beget(null, {
        shout: function() {
            return 'Merry Christmas!';
        }
    });

    var Elf = beget(Holidayer, {
        makeToys: function() {
            return 'Fa la la!';
        }
    });

	mixin(Santa, Elf);
    Santa.shout();    // => 'Merry Christmas!'
    Santa.makeToys(); // => 'Fa la la!'

`inherits`
----------

The `inherits` function can be used to check inheritance
(`instanceof` will not work because there are no constructors).

	inherits(PepperoniPizza, Pizza);            // => true
	inherits(MediumPepperoniPizza, Pizza);      // => true
	inherits(PepperoniPizza, Santa);            // => false

clone
-----

The `clone` function makes a deep clone of an object.
It creates a new object with the same prototype and then clones all **own** properties
(with the same recursive algorithm) to the new object.

copy
----

The `copy` function makes a shallow copy of an object.
It creates a new object with the same prototype and then copies over **own** properties to the new object.
Unlike `clone`, `copy` does not make a new object for each property; it simply copies the reference to the same object.

Example
-------

	var Vehicle = beget(null, {
        construct: function(name) {
            this.name = name;
        },
		speed: 0,
		acceleration: 10,
		start: function() {
			this.speed = this.acceleration;
			console.log(this.name, 'started', this.speed);
		},
		stop: function() {
			this.speed = 0;
			console.log(this.name, 'stopped', this.speed);
		},
		accelerate: function() {
			this.speed += this.acceleration;
			console.log(this.name, this.speed);
		}
	});

	// MiniVan inherits all of Vehicle's properties
	var MiniVan = beget(Vehicle, {
		acceleration: 6
	});

	// Racecar also inherits all of Vehicle's properties, but it overrides `construct`.
	var Racecar = beget(Vehicle, {
		construct: function(name) {
            Vehicle.construct.call(this, name);
			this.acceleration = Math.floor(Math.random() * 20 + 40);
		}
	});

	// peacockVan inherits from MiniVan
	var peacockVan = spawn(MiniVan, 'peacock');

	peacockVan.start();       // => peacock started 6
	peacockVan.accelerate();  // => peacock 12
	peacockVan.accelerate();  // => peacock 18
	peacockVan.stop();        // => peacock stopped 0

	// wallaceCar inherits from Racecar
	var wallaceCar = spawn(Racecar, 'wallace');
	// andyCar also inherits from Racecar
	var andyCar = spawn(Racecar, 'andy');

	wallaceCar.start();       // => wallace started [random number]
	andyCar.start();          // => andy started [random number]

	wallaceCar.accelerate();  // => wallace [random number]
	andyCar.accelerate();     // => andy [random number]

	wallaceCar.accelerate();  // => wallace [random number]
	andyCar.accelerate();     // => andy [random number]

	wallaceCar.stop();        // => wallace [random number]
	andyCar.stop();           // => andy [random number]