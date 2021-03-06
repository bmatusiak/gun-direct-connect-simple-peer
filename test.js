;
(async function() {

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

        var sendInt = setInterval(function() {

            socket.emit("time", new Date().getTime() , function(value_cb){
                console.log("callback_called!", value_cb);
            });

        }, 1000);
        
        var cb_logID = 0;
        socket.on("time", function(val, callback) {
            console.log("time from socket", val);
            callback(++cb_logID);
        });

        socket.on("disconnected", function() {
            console.log("socket disconnected", );
            clearInterval(sendInt);
        });

        // socket.on("test", function(val) {
        //     console.log("test", val);
        // });

        // socket.emit("test", process.env.INITIATOR || false);

        // setTimeout(function() {
        //     if (gunDC.initiator)
        //         gunDC.destroy();
        // }, 10 * 1000);

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

    gunDC.on("debug", console.log);
    
    process.stdin.resume(); //so the program will not close instantly

    function exitHandler(options, exitCode) {
        // if (options.cleanup){
        //   console.log('clean');
        // } 
        // if (exitCode || exitCode === 0)  console.log("exitCode",exitCode);
        if (options.exit) {
            gunDC.destroy();
            setTimeout(process.exit,1000);
            // process.exit();
        }
    }

    //do something when app is closing
    process.on('exit', exitHandler.bind(null, { cleanup: true }));
    //catches ctrl+c event
    process.on('SIGINT', exitHandler.bind(null, { exit: true }));
    // catches "kill pid" (for example: nodemon restart)
    process.on('SIGUSR1', exitHandler.bind(null, { exit: true }));
    process.on('SIGUSR2', exitHandler.bind(null, { exit: true }));
    //catches uncaught exceptions
    process.on('uncaughtException', exitHandler.bind(null, { exit: true }));
})();