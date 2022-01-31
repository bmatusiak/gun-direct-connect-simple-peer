module.exports = function(options, secret_hash, pair_me, pair_them) {
    var initiator = options.initiator;

    var EventEmitter = require('events');
    var app_emitter = new EventEmitter();
    var SIDE_1 = initiator ? "peer1" : "peer2";
    var SIDE_2 = initiator ? "peer2" : "peer1";

    app_emitter.initiator = initiator;
    var auth = false;
    app_emitter.auth = function(auth_fn) {
        auth = auth_fn;
    };

    var $log = app_emitter.emit.bind(app_emitter, "debug");


    var hotp = require('hotp');

    var GUN = options.GUN;
    var SEA = GUN.SEA;

    var $crypto = require('crypto');

    var Peer = require('simple-peer');

    var wrtc = options.wrtc;
    var gun = options.gun;

    var topt_options = {
        timeStep: 5,
        algorithm: "sha256",
        digits: 8,
        get time() {
            return new Date(GUN.state()).getTime() / 1000;
        }
    };
    var hotp_options = { algorithm: topt_options.algorithm, digits: topt_options.digits };
    var interval = 1000;



    var signalData;
    var peer;
    var last_tx, lt_rx;
    var run_tx = false;
    var run_rx = false;
    /*
        
    */
    var hash_alias = $crypto.createHash('sha256').update(secret_hash).digest().toString("hex");

    function peerSetup() {

        if (!peer || peer.destroyed) {
            signalData = [];
            peer = peer_factory(function($signalData) {
                if ($signalData.length)
                    signalData = $signalData;
            });
        }
        return peer;
    }
    async function loop() {

        if (!pair_me)
            pair_me = await SEA.pair();

        peerSetup();

        if (!run_tx && !peer.$connected) {
            (async function() {

                var newToken = false;
                var token = parseInt(hotp.totp(hash_alias, topt_options));

                if (token != lt_rx) {
                    newToken = true;
                    lt_rx = token;
                }
                if (newToken && signalData.length) {
                    $log("new token with data");
                    run_tx = true;
                    var $t, t;
                    if (peer.pair) {
                        $t = JSON.stringify({ signals: signalData });
                        t = await SEA.encrypt($t, await SEA.secret(peer.pair.epub, pair_me));
                    }
                    else {
                        $t = JSON.stringify({ pair: { pub: pair_me.pub, epub: pair_me.epub } });
                        t = data_stringify($t);
                    }

                    var $token = $crypto.createHash('sha256').update(hotp(hash_alias, token, hotp_options) + secret_hash).digest().toString("hex");
                    gun.get($token).get(hash_alias).get("tx").get(SIDE_1).put(t, function() {
                        run_tx = false;
                        $log(SIDE_1, "put tx", t);
                    });
                }
            })();
        }
        if (!run_rx && !peer.$connected) {
            run_rx = true;

            (async function() {
                var token = parseInt(hotp.totp(hash_alias, topt_options));

                var $token = $crypto.createHash('sha256').update(hotp(hash_alias, token, hotp_options) + secret_hash).digest().toString("hex");
                gun.get($token).get(hash_alias).get("tx").get(SIDE_2).once(async function(data, index) {
                    run_rx = false;
                    if (!data || last_tx == data) {
                        run_rx = false;
                        return;
                    }
                    last_tx = data;
                    var msg_decrypted = false;
                    var d = data;
                    if (peer.pair) {
                        if (data.indexOf("SEA") == 0) {
                            d = await SEA.decrypt(d, await SEA.secret(peer.pair.epub, pair_me));
                            msg_decrypted = true;
                        }
                    }
                    else {
                        if (data.indexOf("JSON") == 0)
                            d = data_parse(d);

                        d = JSON.parse(d);
                    }

                    $log(SIDE_1, "get", d, index);

                    if (!d.ack) {
                        var $t, t;
                        var doAck = function() {
                            var token = parseInt(hotp.totp(hash_alias, topt_options));
                            var $token = $crypto.createHash('sha256').update(hotp(hash_alias, token, hotp_options) + secret_hash).digest().toString("hex");

                            if (t)
                                gun.get($token).get(hash_alias).get("tx").get(SIDE_1).put(t, function() {
                                    $log(SIDE_1, "put tx-ack", $t);
                                    peerSetup();

                                    if (d.signals) {
                                        for (var i in d.signals) {
                                            peer.signal(d.signals[i]);
                                        }
                                    }
                                });
                        };
                        if (d.signals && msg_decrypted) {
                            $t = JSON.stringify({ ack: 1, clear: true });
                            t = await SEA.encrypt($t, await SEA.secret(peer.pair.epub, pair_me));
                            doAck();
                        }
                        else if (d.pair && !peer.pair) {
                            var complete_ack = function() {
                                peer.pair = d.pair;
                                $t = JSON.stringify({ ack: 1, pair: { pub: pair_me.pub, epub: pair_me.epub } });
                                t = data_stringify($t);
                                doAck();
                            };

                            if (!auth) {
                                complete_ack();
                            }
                            else
                                auth(d.pair, complete_ack);

                        }


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
                                    if (!auth) {
                                        peer.pair = d.pair;
                                    }
                                    else {
                                        auth(d.pair, function() {
                                            peer.pair = d.pair;
                                        })
                                    }
                                }
                            }
                        }
                    }

                });
            })();
        }
    }
    var mainLoopInt = setInterval(loop, interval);
    setTimeout(loop, 10);


    function peer_factory(signaler) {
        $log("webrtc: setup");

        var peer = new Peer({ initiator: initiator, wrtc: wrtc });

        if (pair_them)
            peer.pair = pair_them;

        var socket = new EventEmitter();

        socket._emit = socket.emit;
        socket.emit = function(key, value) {
            (async function() {
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
            $log(SIDE_1, "error", e);
        });


        peer.on("close", function() {
            if (peer.$connected)
                socket._emit("disconnected");

            $log(SIDE_1, "closed");
            peer.$connected = false;
        });

        peer.on('signal', data => {
            signals.push(data);
        });

        peer.once("_iceComplete", function() {
            $log("webrtc: ready");
            if (signals.length) {
                signaler(signals);
                signals = [];
            }
        });

        peer.on('connect', () => {
            $log("connected to", SIDE_2);
            peer.$connected = true;

            var interval_id = setInterval(async function() {
                if (!peer.$connected || peer.destroyed) {
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

            if (data.ping) {
                last_ping = new Date().getTime();
            }

            if (data.message) {
                $log("RECV:", data.message, data.data)
                socket._emit(data.message, data.data);
            }
        });

        var ping_interval = setInterval(function() {

            var check_last_ping = new Date().getTime();
            if (peer.$connected && last_ping != 0) {
                var time_sense = check_last_ping - last_ping;
                if (time_sense > (10 * 1000)) {
                    $log(time_sense);
                    peer.destroy();
                    clearInterval(ping_interval);
                }
            }
            if (peer.destroyed)
                clearInterval(ping_interval);
        }, 1000);

        return peer;
    }

    app_emitter.destroy = function() {
        clearInterval(mainLoopInt);
        if (peer) {
            peer.socket.emit("closing");
            setTimeout(async function() {
                peer.destroy();
                peer = null;
                signalData = null;
                last_tx = null;
                lt_rx = null;
                run_tx = null;
                run_rx = null;
            }, 1000);
        }
    };

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