poise
=====

A small, experimental library which attempts to push prototypal inheritance to its natural conclusions in JavaScript. For ECMAScript 5.

Example
-------

    var Vehicle = poise.Thing.beget({
      speed: 0,
    	accelleration: 10,
    	start: function() {
    		this.speed = this.accelleration;
    		console.log(this.name, 'started', this.speed);
    	},
    	stop: function() {
    		this.speed = 0;
    		console.log(this.name, 'stopped', this.speed);
    	},
    	accellerate: function() {
    		this.speed += this.accelleration;
    		console.log(this.name, this.speed);
    	}
    });
    
    // MiniVan inherits all of Vehicle's properties
    var MiniVan = Vehicle.beget({
    	accelleration: 6
    });
    
    // Racecar also inherits all of Vehicles properties, but it overrides the beget method.
    var Racecar = Vehicle.beget({
    	// Acts as a constructor
    	beget: function(name) {
            // Use this.base to call Vehicle's beget method.
    		var obj = this.base({ name: name });
    		obj.accelleration = Math.floor(Math.random() * 20 + 40);
    		return obj;
    	}
    });
    
    // peacockVan inherits from MiniVan
    var peacockVan = MiniVan.beget({
    	name: 'peacock'
    });
    
    peacockVan.start();       // => peacock started 6
    peacockVan.accellerate(); // => peacock 12
    peacockVan.accellerate(); // => peacock 18
    peacockVan.stop();        // => peacock stopped 0
    
    // wallaceCar inherits from Racecar
    var wallaceCar = Racecar.beget('wallace');
    // andyCar also inherits from Racecar
    var andyCar = Racecar.beget('andy');
    
    wallaceCar.start();       // => wallace started [random number]
    andyCar.start();          // => andy started [random number]
    
    wallaceCar.accellerate(); // => wallace [random number]
    andyCar.accellerate();    // => andy [random number]
    
    wallaceCar.accellerate(); // => wallace [random number]
    andyCar.accellerate();    // => andy [random number]
    
    wallaceCar.stop();        // => wallace [random number]
    andyCar.stop();           // => andy [random number]