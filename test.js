var hash = "igSBrdYKihT4nD5ggix/U4Snrpk+NjDT05xCZXK8=2345678912345678901";

;(async function() {

    var GUN = require('gun');
    var SEA = require('gun/sea');

    var pair_master;
    var pair_slave;

    var enforce_pair = false;

    if (!enforce_pair) {
        pair_master = await SEA.pair();
        pair_slave = await SEA.pair();
    }
    else {
        pair_master = {
            pub: 'C6HWH-uPo9I2p6mjXwfiqhjRfl139vwAA7Tc7F3D96g.wMURUl83fZAGtDnQ0fHSpIVzc9OmLGbKyZKcv06KI9A',
            priv: 'qNHbTGXOp6YoyICIq7C_e9g6Q3Wrh0pPFqFmi2iPHw4',
            epub: 'Qz8QvX7Wty6W-upWZYj5R-6dzCIutjs0G4Agrpxx2g0.KyD33PA0CtWiAvajJcdb--s6e1LEs12Tt681r4R9bsM',
            epriv: 'V8dSEd9eNU-FMoBwzxlMlBYWOBgp1hveImhpx-876Wo'
        };
        pair_slave = {
            pub: 'VIVbp2P8tGy4rggF79ncqqEmfSWAGaxsZmRIAkICKJg.APRx3zArF0rB4O8jZa7ZfeQtR2pd4x75Sa3_9gsMmyI',
            priv: 'yQgGsG6Yefy0sLW5_vpIYeV3UycpObI0NrHpJSxemvo',
            epub: 'dgO6ExzCTZfP8jHVx2lgUpMWYHt5nZWvUcbW76w2s20.p1Iu2FYUxI7A-tAGhkmdiT9SJJq4Zlafg9FG1KnFoZU',
            epriv: 'P0non47qwbLvrl1VjiazZyPEa7TdGy87AG5I8ALO7DA'
        }
    }
    
    var gunDC;
    if (process.env.INITIATOR) {
        gunDC = require("./index.js")(true, hash, pair_slave, enforce_pair ? pair_master : false);
    }
    else {
        gunDC = require("./index.js")(false, hash, pair_master, enforce_pair ? pair_slave : false);
    }

    gunDC.on("connected", function(socket) {

        socket.on("test", function(val) {
            console.log("test", val);
        });

        socket.on("disconnected", function() {
            console.log("socket disconnected", );
        });

        socket.emit("test", process.env.INITIATOR || false);
    });

})();