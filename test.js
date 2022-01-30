;(async function() {

    var GUN = require('gun');
    var SEA = require('gun/sea');
    var wrtc = require('wrtc');

    var peers = ["https://www.peersocial.io/gun", "https://onlykey.herokuapp.com/gun", "https://gun-manhattan.herokuapp.com/gun"];

    var gun = GUN({ peers: peers });

    var pair_master;
    var pair_slave;

    var enforce_pair = true;
    
    var secret_hash;
    
    if (!enforce_pair) {
        pair_master = await SEA.pair();
        pair_slave = await SEA.pair();
        secret_hash = "igSBrdYKihT4nD5ggix/U4Snrpk+NjDT05xCZXK8=2345678912345678901"; // pre-determin key
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
        };
        secret_hash = await SEA.secret(pair_slave.epub, pair_master)
    }
    
    

    var gunDC;
    if (process.env.INITIATOR) {
        gunDC = require("./index.js")({ wrtc: wrtc, initiator: true, gun: gun, GUN: GUN }, secret_hash, pair_slave);
    }
    else {
        gunDC = require("./index.js")({ wrtc: wrtc, initiator: false, gun: gun, GUN: GUN }, secret_hash, pair_master);
    }

    gunDC.on("connected", function(socket) {
        console.log("connected");

        socket.on("test", function(val) {
            console.log("test", val);
        });
        
        var sendInt = setInterval(function(){
            
            socket.emit("time", new Date().getTime());
            
        },1000)
        
        socket.on("time", function(val) {
            console.log("time from socket", val);
        });

        socket.on("disconnected", function() {
            console.log("socket disconnected", );
            clearInterval(sendInt);
        });

        socket.emit("test", process.env.INITIATOR || false);
        
        setTimeout(function(){
            if(gunDC.initiator)
                gunDC.destroy();
        },10 * 1000);
        
    });


    if (enforce_pair)
        gunDC.auth(function(pair, pass) {
            console.log("auth", pair);
            // if (enforce_pair) {
                if (gunDC.initiator) {
                    if (pair.epub == pair_master.epub) {
                        pass();
                    }
                }
                else {
                    if (pair.epub == pair_slave.epub) {
                        pass();
                    }
                }
            // }else{
            //     pass();
            // }
    
        });

    gunDC.on("debug", console.log)
    
})();