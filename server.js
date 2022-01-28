var hash = "igSBrdYKihT4nD5ggix/U4Snrpk+NjDT05xCZXK8=2345678912345678901"
//   +(new Date().getTime());



var pair_master = {
    pub: 'C6HWH-uPo9I2p6mjXwfiqhjRfl139vwAA7Tc7F3D96g.wMURUl83fZAGtDnQ0fHSpIVzc9OmLGbKyZKcv06KI9A',
    priv: 'qNHbTGXOp6YoyICIq7C_e9g6Q3Wrh0pPFqFmi2iPHw4',
    epub: 'Qz8QvX7Wty6W-upWZYj5R-6dzCIutjs0G4Agrpxx2g0.KyD33PA0CtWiAvajJcdb--s6e1LEs12Tt681r4R9bsM',
    epriv: 'V8dSEd9eNU-FMoBwzxlMlBYWOBgp1hveImhpx-876Wo'
};

var pair_slave = {
    pub: 'VIVbp2P8tGy4rggF79ncqqEmfSWAGaxsZmRIAkICKJg.APRx3zArF0rB4O8jZa7ZfeQtR2pd4x75Sa3_9gsMmyI',
    priv: 'yQgGsG6Yefy0sLW5_vpIYeV3UycpObI0NrHpJSxemvo',
    epub: 'dgO6ExzCTZfP8jHVx2lgUpMWYHt5nZWvUcbW76w2s20.p1Iu2FYUxI7A-tAGhkmdiT9SJJq4Zlafg9FG1KnFoZU',
    epriv: 'P0non47qwbLvrl1VjiazZyPEa7TdGy87AG5I8ALO7DA'
}


if(process.env.INITIATOR){
    require("./index.js")(true, pair_slave, pair_master);
}else{
    require("./index.js")(false,pair_master, pair_slave);
}