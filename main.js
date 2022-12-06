/*
 *  BFH Hyper drive -- Track Editor
 *  Bachelor thesis (BTI3051) 22, Bern University of Applied Sciences
 *  Developer: Mac Müller
 *
 *  main.js contains
 *  - Import: List of controllers (templates)
 *  - Registration: All controllers muss be registered to the router.js
 *  - Init Function of this web app
 *  - Navigate to home page
 *
 */

import router from "./router.js";
import home from "./controller/home.js";
import dgt from "./controller/digital-twin.js";
import setting from "./controller/setting.js";
import util from "./model/util.js";

router.register("/home", home);
router.register("/digital-twin", dgt);
router.register("/setting", setting);
util.init();

/**
 * Go Home page.
 */
router.go("/home");