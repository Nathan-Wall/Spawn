# Simile

A small library which attempts to push prototypal inheritance to its natural conclusions in JavaScript
(for ECMAScript 5).

This library provides a few basic functions which are oriented toward making prototypal inheritence simple and straight-forward.

## Motivation

Simile is *prototypal* at its core.  The motivation behind simile is to provide a set of tools that grounds code in a prototypal pattern of thought.  Objects are stated to be `like` other objects, building correlations between objects, and diminishing the role of constructors.

## Getting Started

### Node

#### Installation

	npm install simile

Then...

	var simile = require('simile'),
		like = simile.like,
		forge = simile.forge;

	// ...

### Browser

#### Basic

Download `simile.js` and serve it in a `<script>` tag.

    <script type="text/javascript" src="path/to/simile.js"></script>
    <script type="text/javascript">
        var like = simile.like,
        	forge = simile.forge;
    </script>

Inside another script, you can use `secrets.create()` to create a secret coupler (see below).

#### AMD

It's also possible to import simile as an AMD module.

    require([ 'path/to/simile' ], function(simile) {
        var like = simile.like,
        	forge = simile.forge;
        // ...
    });

## Use

### Inheritance (`like`)

To create an object use `like`.

	var Pizza = like();
	// Pizza is an object which has no prototype -- it's not like anything else.

    Object.getPrototypeOf(Pizza); // => null

To create an object which inherits from another object, use `like` again.

	var CheesePizza = like(Pizza);
	// CheesePizza is like Pizza

An inheritance relationship is built: CheesePizza inherits from Pizza.

The `like` function accepts a second optional argument, a map of properties to add to the new object.

	var PepperoniPizza = like(Pizza, {
		toppings: [ 'pepperoni' ]
	});
	PepperoniPizza.toppings; // => [ 'pepperoni' ]

	var MediumPepperoniPizza = like(PepperoniPizza, {
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

Properties can be added with a false writable or configurable state.

    FrozenPizza = like(PepperoniPizza, Object.freeze({
        thaw: function() { console.log('thawing!'); }
    }));

    FrozenPizza.thaw = 1;    // Error: `thaw` is non-writable
    delete FrozenPizza.thaw; // Error: `thaw` is non-configurable

`like` is like `Object.create`, except it has an easier, cleaner
syntax with reasonable defaults for the property descriptors.

	var John = like(Mike, {
		firstName: 'John'
	});
	John.getName(); // => 'John Campbell'

Like `Object.create`, `like` can be used on `null` to create an object with no inheritance.

	var x = like(null);
	'hasOwnProperty' in x; // => false
	// x does not inherit from Object (or anything)

### `forge`

`forge` is `like` + `init`. It calls `like` on the first argument and passes any other arguments to an object's `init` method (if present).

	var Person = like(null, {
		init: function(firstName, lastName) {
            this.firstName = firstName;
            this.lastName = lastName;
		},
		getName: function() {
			return this.firstName + ' ' + this.lastName;
		}
	});
	var Mike = forge(Person, 'Mike', 'Campbell');
	Mike.getName(); // => 'Mike Campbell'

### `isLike`

The `isLike` function can be used to check inheritance
(`instanceof` will not work because you're not checking against a constructor).

	isLike(PepperoniPizza, Pizza);            // => true
	isLike(MediumPepperoniPizza, Pizza);      // => true
	isLike(PepperoniPizza, Santa);            // => false
	isLike(Pizza, PepperoniPizza);            // => false

Note the last example above in particular.  Although `PepperoniPizza` is like `Pizza`, `Pizza` is not like `PepperoniPizza`.  This is because `PepperoniPizza` inherits `Pizza`'s properties, but `Pizza` doesn't  inherit `PepperoniPizza`'s properties.

### `sealed` and `frozen`

A property can be set to be non-configurable or non-writable using `sealed` and `frozen`. The former makes a property non-configurable, while the latter makes a property both non-configurable and non-writable.

    var Canine = like(),
        Fox = like(Canine, {
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

### `extend`

`extend` can be used to extend the properties of an object.

	var Santa = like();
	extend(Santa, {
		speak: function() {
			return 'Ho ho ho!';
		}
	});
	Santa.speak(); // => 'Ho ho ho!'

Properties added with `extend` are non-enumerable.

### `mixin`

`mixin` can be used to mix one object into another. It differs from `extend` in two ways: (1) properties remain enumerable if they are enumerable on the mixin, and (2) inherited properties are mixed in (up to a common parent).

	var Santa = like();
	mixin(Santa, {
		speak: function() {
			return 'Ho ho ho!';
		}
	});

	var descriptor = Object.getOwnPropertyDescriptor(Santa, 'speak');
	descriptor.enumerable;   // => true
	descriptor.writable;     // => true
	descriptor.configurable; // => true

    var Holidayer = like(null, {
        shout: function() {
            return 'Merry Christmas!';
        }
    });

    var Elf = like(Holidayer, {
        makeToys: function() {
            return 'Fa la la!';
        }
    });

	mixin(Santa, Elf);
    Santa.shout();    // => 'Merry Christmas!'
    Santa.makeToys(); // => 'Fa la la!'

### `adapt`

`adapt` will convert a regular JavaScript-style constructor to a simile-style prototype.

    var List = adapt(Array);

    var toppings = forge(List);
    toppings.push('Pepperoni');
    toppings.push('Cheese');
    toppings.push('Guacomole');

    toppings.join(', '); // => 'Pepperoni, Cheese, Guacomole'

Note that this doesn't really work for other built-ins in ES5 due to a lack of [@@create](http://people.mozilla.org/~jorendorff/es6-draft.html#sec-well-known-symbols-and-intrinsics). Simile will be modified to support this in ES6, when available, but for ES5 users, avoid using `adapt` for built-ins for now.

It still works great for user-land constructors!

    // Code from some other library...
    function Person(name) {
    	this.name = name;
    }
    Person.prototype.sayHi = function() {
    	return 'Hello, my name is ' + this.name;
    };

    // You want to use the simile-style
    var SPerson = adapt(Person);

    var paul = forge(SPerson, 'Paul');
    paul.sayHi(); // => 'Hello, my name is Paul'

### `toConstructor`

`toConstructor` is the inverse of `adapt`.  It takes a simile-style prototype and converts it to a regular JavaScript-style constructor.

    var Person = like(null, {
    	init: function(name) {
    		this.name = name;
    	},
    	sayHi: function() {
    		return 'Hello, my name is ' + this.name;
    	}
    });

    var CPerson = toConstructor(Person);

    var sally = new CPerson('Sally');
    sally.sayHi(); // => 'Hello, my name is Sally'

### Private Properties

[Secrets](http://github.com/joijs/tempo/Secrets) or [WeakMaps](http://github.com/joijs/tempo/Harmonize) can be used alongside simile to associate private state with objects.

    var Purse = (function() {

        var $ = createSecret();

        return like(null, {

            init: function(balance) {
                if (Object(this) !== this)
                    throw new TypeError('Object expected');
                $(this).balance = balance | 0;
            },

            deposit: function deposit(from, amount) {
                if (!('balance' in $(this)))
                    throw new TypeError('Deposit must be called on a Purse.');
                if (!('balance' in $(from))
                    throw new TypeError('Another Purse is required to make a deposit.');
                $(from).balance -= amount;
                $(this).balance += amount;
            },

            get balance() {
                return $(this).balance;
            }

        });

    })();

    var sally = forge(Purse, 100),
        jane = forge(Purse, 250);

    sally.deposit(jane, 50);
    console.log(
        sally.balance, // => 150
        jane.balance   // => 200
    );

### Example

	var Vehicle = like(null, {
        init: function(name) {
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
	var MiniVan = like(Vehicle, {
		acceleration: 6
	});

	// Racecar also inherits all of Vehicle's properties, but it overrides `init`.
	var Racecar = like(Vehicle, {
		init: function(name) {
            Vehicle.init.call(this, name);
			this.acceleration = Math.floor(Math.random() * 20 + 40);
		}
	});

	// peacockVan inherits from MiniVan
	var peacockVan = forge(MiniVan, 'peacock');

	peacockVan.start();       // => peacock started 6
	peacockVan.accelerate();  // => peacock 12
	peacockVan.accelerate();  // => peacock 18
	peacockVan.stop();        // => peacock stopped 0

	// wallaceCar inherits from Racecar
	var wallaceCar = forge(Racecar, 'wallace');
	// andyCar also inherits from Racecar
	var andyCar = forge(Racecar, 'andy');

	wallaceCar.start();       // => wallace started [random number]
	andyCar.start();          // => andy started [random number]

	wallaceCar.accelerate();  // => wallace [random number]
	andyCar.accelerate();     // => andy [random number]

	wallaceCar.accelerate();  // => wallace [random number]
	andyCar.accelerate();     // => andy [random number]

	wallaceCar.stop();        // => wallace [random number]
	andyCar.stop();           // => andy [random number]

---

<p xmlns:dct="http://purl.org/dc/terms/" xmlns:vcard="http://www.w3.org/2001/vcard-rdf/3.0#">
    <a rel="license"
       href="http://creativecommons.org/publicdomain/zero/1.0/">
        <img src="http://i.creativecommons.org/p/zero/1.0/88x31.png" style="border-style: none;" alt="CC0" />
    </a>
    <br />
    To the extent possible under law,
    <a rel="dct:publisher" href="http://github.com/Nathan-Wall"><span property="dct:title">Nathan Wall</span></a>
    has waived all copyright and related or neighboring rights to
    <span property="dct:title">Simile</span>.

    This work is published from:
    <span property="vcard:Country" datatype="dct:ISO3166" content="US">
      United States
    </span>.
</p>
