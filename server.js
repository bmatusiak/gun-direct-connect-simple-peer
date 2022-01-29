var hash = "igSBrdYKihT4nD5ggix/U4Snrpk+NjDT05xCZXK8=2345678912345678901"
//   +(new Date().getTime());


;(async function() {
    
        
    var GUN = require('gun');
    var SEA = require('gun/sea');

    var pair_master = await SEA.pair();;

    var pair_slave = await SEA.pair();

    var gunDC;
    if (process.env.INITIATOR) {
        gunDC = require("./index.js")(true, hash, pair_slave);
    }
    else {
        gunDC = require("./index.js")(false, hash, pair_master);
    }

    gunDC.on("connected", function(socket) {

        socket.on("test", function(val) {
            console.log("test", val);
        });

        socket.emit("test", process.env.INITIATOR || false);
    });

})();