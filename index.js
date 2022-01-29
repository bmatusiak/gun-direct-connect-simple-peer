module.exports = function(initiator, hash, pair_me, pair_them) {

    var EventEmitter = require('events');
    var app_emitter = new EventEmitter();
    var SIDE_1 = initiator ? "peer1" : "peer2";
    var SIDE_2 = initiator ? "peer2" : "peer1";

    var PUB = hash; //initiator ? pair_me.pub + pair_them.pub : pair_them.pub + pair_me.pub;

    console.log(SIDE_1, PUB)

    var hotp = require('hotp');
    var GUN = require("./gun-connection.js");
    var SEA = GUN.SEA;

    var $crypto = require('crypto');

    var Peer = require('simple-peer');
    var wrtc = require('wrtc');

    var gun = GUN(!initiator);

    var topt_options = {
        timeStep: 5,
        algorithm: "sha256",
        digits: 8,
        get time() {
            return new Date(GUN.GUN.state()).getTime() / 1000;
        }
    };
    var hotp_options = { algorithm: topt_options.algorithm, digits: topt_options.digits };
    var interval = 1000;



    var signalData; // = [];
    // var signalData_NOUNCE; // = 0;
    var peer;
    /*
    events._emit = events.emit;

    events.emit = function(key, value) {
        (async function() {

            if (forbiddenMessages.indexOf(key) == -1 && peer && !peer.destroyed && peer.$connected) {
                var $t = JSON.stringify({
                    message: key,
                    data: value
                });
                var t = await SEA.encrypt($t, await SEA.secret(pair_them.epub, pair_me));
                peer.send(t);
            }
        })()
    }
    */
    // var forbiddenMessages = [
    //         "connect",
    //         "disconnected"
    //     ]


    var last_tx, lt_rx; //last_rx, lt_tx,
    var run_tx = false;
    var run_rx = false;

    process.stdin.resume(); //so the program will not close instantly

    function exitHandler(options, exitCode) {
        // if (options.cleanup){
        //   console.log('clean');
        // } 
        // if (exitCode || exitCode === 0) console.log("exitCode",exitCode);
        if (options.exit) {
            if (peer)
                peer.socket.emit("closing");
            setTimeout(async function() { process.exit(); }, 1000);
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



    function peerSetup() {

        if (!peer || peer.destroyed) {
            // signalData_NOUNCE = 0;
            signalData = [];
            peer = peer_factory(function($signalData) {
                if ($signalData.length)
                    signalData = $signalData;
                // ++signalData_NOUNCE;
            });
        }
        return
    }
    async function loop() {

        if (!pair_me)
            pair_me = await SEA.pair();

        peerSetup();
        // if (run_rx) return;

        if (!run_tx && !peer.$connected) {
            (async function() {
                var hash_alias = $crypto.createHash('sha256').update(PUB).digest().toString("hex");

                var newToken = false;
                var token = parseInt(hotp.totp(hash_alias, topt_options));

                if (token != lt_rx) {
                    // console.log("new token", typeof token, token);
                    newToken = true;
                    lt_rx = token;
                }
                if (newToken && signalData.length) {
                    run_tx = true;

                    var $t; // = JSON.stringify({ nounce: signalData_NOUNCE, signals: signalData });
                    // console.log($t)
                    var t;
                    if (peer.pair) {
                        $t = JSON.stringify({ signals: signalData });
                        t = await SEA.encrypt($t, await SEA.secret(peer.pair.epub, pair_me));
                    }
                    else {
                        $t = JSON.stringify({ pair: { pub: pair_me.pub, epub: pair_me.epub } });
                        t = data_stringify($t);
                    }

                    var $token = $crypto.createHash('sha256').update(hotp(hash_alias, token, hotp_options) + PUB).digest().toString("hex");
                    gun.get($token).get(hash_alias).get("tx").get(SIDE_1).put(t, function() {
                        run_tx = false;
                        console.log(SIDE_1, "put tx", t);
                        // ++signalData_NOUNCE;
                    });
                }
            })();
        }
        if (!run_rx && !peer.$connected) {
            (async function() {
                var hash_alias = $crypto.createHash('sha256').update(PUB).digest().toString("hex");

                // var newToken = false;
                var token = parseInt(hotp.totp(hash_alias, topt_options));

                // if (token != lt_tx) {
                //     // console.log("new token", typeof token, token);
                //     newToken = true;
                //     lt_tx = token;
                // }
                // if (newToken) {
                run_rx = true;

                var $token = $crypto.createHash('sha256').update(hotp(hash_alias, token, hotp_options) + PUB).digest().toString("hex");
                gun.get($token).get(hash_alias).get("tx").get(SIDE_2).once(async function(data, index) {
                    run_rx = false;
                    if (!data || last_tx == data) {
                        run_rx = false;
                        return;
                    }
                    last_tx = data;
                    var msg_decrypted = false;
                    var d = data;
                    // var sendPair = false;
                    if (peer.pair) {
                        if (data.indexOf("SEA") == 0){
                            d = await SEA.decrypt(d, await SEA.secret(peer.pair.epub, pair_me));
                            msg_decrypted = true;
                        }
                    }
                    else {
                        if (data.indexOf("JSON") == 0)
                            d = data_parse(d);

                        d = JSON.parse(d);
                    }

                    console.log(SIDE_1, "get", d, index);

                    if (!d.ack) {
                        var $t; // = JSON.stringify({ ack: 1, pair: { pub: pair_me.pub, epub: pair_me.epub } });
                        // console.log($t)
                        var t;

                        // if(d.pair && !pair_them){
                        //     pair_them = d.pair
                        // }

                        if (d.signals) {
                            $t = JSON.stringify({ ack: 1, clear: true });
                            t = await SEA.encrypt($t, await SEA.secret(peer.pair.epub, pair_me));
                        }
                        else if (d.pair && !peer.pair) {
                            peer.pair = d.pair;
                            $t = JSON.stringify({ ack: 1, pair: { pub: pair_me.pub, epub: pair_me.epub } });
                            t = data_stringify($t);
                        }

                        if (t)
                            gun.get($token).get(hash_alias).get("tx").get(SIDE_1).put(t, function() {
                                // run_tx = false;
                                console.log(SIDE_1, "put tx-ack", $t);
                                peerSetup();

                                if (d.signals) {
                                    for (var i in d.signals) {
                                        peer.signal(d.signals[i]);
                                    }
                                }
                                // ++signalData_NOUNCE;
                            });
                    }
                    else {
                        if (d.ack) {
                            if (peer.pair && msg_decrypted) {
                                if (d.clear) {
                                    signalData = [];
                                }
                            }
                            else {
                                if (d.pair && !peer.pair) {
                                    peer.pair = d.pair;
                                }
                            }
                        }
                    }

                });
                // }
            })();
        }
    }
    setInterval(loop, interval);
    loop();


    function peer_factory(signaler) {
        console.log("webrtc: setup");

        var peer = new Peer({ initiator: initiator, wrtc: wrtc });

        if (pair_them)
            peer.pair = pair_them;

        var socket = new EventEmitter();

        socket._emit = socket.emit;
        socket.emit = function(key, value) {
            (async function() {

                // if (forbiddenMessages.indexOf(key) == -1 && 
                if (!peer.destroyed && peer.$connected) {
                    var $t = JSON.stringify({
                        message: key,
                        data: value
                    });
                    var t = await SEA.encrypt($t, await SEA.secret(peer.pair.epub, pair_me));
                    peer.send(t);
                }
            })()
        }
        peer.socket = socket;

        socket.on("closing", function() {
            peer.destroy()
        });

        peer.$connected = false;

        var last_ping = 0;

        var signals = [];

        peer.on("error", function(e) {
            console.log(SIDE_1, "error", e);
        });


        peer.on("close", function() {
            console.log(SIDE_1, "closed");
            peer.$connected = false;

            socket.emit("disconnected");
        });

        peer.on('signal', data => {
            // console.log(SIDE_1, data)
            // when peer1 has signaling data, give it to peer2 somehow
            // putSignal(data)
            signals.push(data);
            // gun.get("simple-peer").get(hash_alias).get(SIDE_1).get("signal").get(signal_id).put(data_stringify(data))
        });

        peer.once("_iceComplete", function() {
            console.log("webrtc: ready");
            if (signals.length) {
                signaler(signals);
                signals = [];
            }
        });

        peer.on('connect', () => {
            // wait for 'connect' event before using the data channel
            console.log("connected to", SIDE_2);
            peer.$connected = true;

            var interval_id = setInterval(async function() {
                if (!peer.$connected) {
                    clearInterval(interval_id);
                }
                else {
                    var $t = JSON.stringify({ ping: (new Date().getTime()) });
                    var t = await SEA.encrypt($t, await SEA.secret(peer.pair.epub, pair_me));
                    peer.send(t);
                }
            }, 1000);

            app_emitter.emit("connected", socket, peer)

        });

        peer.on('data', async data => {

            if (data instanceof Buffer)
                data = data.toString("utf8")

            if (data.indexOf("SEA") >= 0)
                data = await SEA.decrypt(data, await SEA.secret(peer.pair.epub, pair_me));

            if (typeof data == "string")
                data = JSON.parse(data);

            // got a data channel message
            if (data.ping) {
                last_ping = new Date().getTime();
                // console.log('got ping from ', SIDE_2);
            }

            if (data.message) {
                console.log("RECV:", data.message, data.data)
                // if(forbiddenMessages.indexOf(data.message) == -1)
                socket._emit(data.message, data.data);
            }
        });

        var ping_interval = setInterval(function() {

            var check_last_ping = new Date().getTime();
            if (peer.$connected && last_ping != 0) {
                var time_sense = check_last_ping - last_ping;
                if (time_sense > (10 * 1000)) {
                    console.log(time_sense);
                    peer.destroy();
                    clearInterval(ping_interval);
                }
            }
        }, 1000);

        return peer;
    }

    return app_emitter;
};



function data_stringify(data) {
    return "JSON" + JSON.stringify(data);
}

function data_parse(data) {
    if (data)
        if (data.slice(0, 4) == "JSON") {
            return JSON.parse(data.slice(4));
        }
    else {
        return JSON.parse(data);
    }
}