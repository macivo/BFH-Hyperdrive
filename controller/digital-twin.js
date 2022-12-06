/*
 *  BFH Hyper drive -- Track Editor
 *  Bachelor thesis (BTI3051) 22, Bern University of Applied Sciences
 *  Developer: Mac Müller
 *
 *  digital-twin.js: Display and control the real physical of cars and track on the web app
 *  For the best performance
 *  The data type in this file should be the object
 *  ==> Notation O(1) by reading/writing
 *
 *  These functions were very complex
 *  It was developed in a limited time
 *  Codes could be redeveloped in the future.
 *
 */
import track from "./track.js";
import mqtt from "../model/mqtt.js";
import svg from "../model/svg.js";

let dtFunction;                 // Cars controller.
const cars = {}                 // Information of the cars for the animation.
const directionOf = {};         // Information of neighbors of all track pieces.
const DIRECTION = {RIGHT: "RIGHT", LEFT: "LEFT", UPPER: "UPPER", UNDER: "UNDER"}; // Enum Direction.
const TRACK_TYPE = {STRAIGHT:"STRAIGHT", CURVE:"CURVE", INTERSECTION:"INTERSECTION", // Enum Track Type.
    JUNCTION:"JUNCTION", TO_THE_MIDDLE:"TO_THE_MIDDLE"}
const junctionLaneFindHelper = { x:{}, y:{}, z:{}, junctionLanes:0, laneBeforeJunction:0}; // Helper to define a lane in function.
const lastAnimate = {} // Helper to find direction of cars. Saving the last track piece.


/**
 * Generate a view for digital-twin.
 * @param template - Object: template.
 * @returns {*} - Object: a generated view.
 */
function renderDT(template) {
    const digitalTwin = template.getElementById("digital-twin");

    // Reset the navigation setting's page.
    const setting = document.querySelector(".setting");
    setting.setAttribute("isClicked", "false");
    setting.getElementsByTagName('span').item(0).innerText = "Setting";

    // Get the drawn nodes from editors board.
    const dtBoard = document.createElement("div");
    dtBoard.innerHTML = track.getEditorBoard().innerHTML;
    dtBoard.className = "dtBoard";

    dtBoard.style.gridTemplateColumns = track.getEditorBoard().style.gridTemplateColumns;
    dtBoard.style.gridTemplateRows = track.getEditorBoard().style.gridTemplateRows;
    const columns = parseInt(dtBoard.style.gridTemplateColumns.match(/\d+/)[0]);
    dtBoard.childNodes.forEach((child, index) => {
        child.className = "dtTrackPiece";
        child.querySelector(".deleteButton").remove();
        child.querySelector(".rotationButton").remove();
        // Save the information of surrounded track pieces.
        if (child.getAttribute("status") !== "empty") {
            const id = child.querySelector("svg").getAttribute("id");
            directionOf[id] = {};
                if (index > 0 && index % columns !== 0) {
                    if (dtBoard.childNodes[index - 1].getAttribute("status") !== "empty") {
                        directionOf[id][dtBoard.childNodes[index - 1].querySelector("svg")
                            .getAttribute("id")] = DIRECTION.LEFT;
                        directionOf[id][DIRECTION.LEFT] = dtBoard.childNodes[index - 1].querySelector("svg")
                            .getAttribute("id")
                    }
                }
                if (index !== dtBoard.childNodes.length - 1 && index % columns !== columns - 1) {
                    if (dtBoard.childNodes[index + 1].getAttribute("status") !== "empty") {
                        directionOf[id][dtBoard.childNodes[index + 1].querySelector("svg")
                            .getAttribute("id")] = DIRECTION.RIGHT;
                        directionOf[id][DIRECTION.RIGHT] = dtBoard.childNodes[index + 1].querySelector("svg")
                            .getAttribute("id")
                    }
                }
                if (index >= columns) {
                    if (dtBoard.childNodes[index - columns].getAttribute("status") !== "empty") {
                        directionOf[id][dtBoard.childNodes[index - columns].querySelector("svg")
                            .getAttribute("id")] = DIRECTION.UPPER;
                        directionOf[id][DIRECTION.UPPER] = dtBoard.childNodes[index - columns].querySelector("svg")
                            .getAttribute("id")
                    }
                }
                if (index + columns <= dtBoard.childNodes.length - 1) {
                    if (dtBoard.childNodes[index + columns].getAttribute("status") !== "empty") {
                        directionOf[id][dtBoard.childNodes[index + columns].querySelector("svg")
                            .getAttribute("id")] = DIRECTION.UNDER;
                        directionOf[id][DIRECTION.UNDER] = dtBoard.childNodes[index + columns].querySelector("svg")
                            .getAttribute("id")
                    }
                }
        }
    });

    track.getEditorBoard().style.gridTemplateColumns
    digitalTwin.append(dtBoard);

    dtFunction = template.getElementById("controller");
    // dtFunction losses all cars after switching to another page.
    // All cars will be added again after return to digital-twin page.
    if (dtFunction.childElementCount === 0) {
        if (Object.keys(cars).length === 0) {
            const noCar = document.createElement("p");
            noCar.innerText = "Waiting for connection to the car..";
            dtFunction.append(noCar);
        } else {
            Object.keys(cars).forEach(carName => {
                dtFunction.append(addCar(carName));
                mqtt.subscribeCar(carName);
            });
        }

    }
    mqtt.init(eventListener);
    return template;
}

/**
 * Observer: Create a new car controller, and add to the dtFunction(Cars controller section).
 * @param carName - String: name of car.
 */
function makeCars(carName) {
    if (cars[carName] === undefined) {
        if (dtFunction.firstChild.childNodes.length === 0) {
            dtFunction.innerHTML = '';
        }
        cars[carName] = {name: carName, animation: {}, last:{}}
        dtFunction.append(addCar(carName));
        mqtt.subscribeCar(carName);
    }
}


/**
 * Observer: Function to update the car's animation.
 * @param message - Paho.MQTT.Message: mqtt-message.
 */
function update(message) {
    const carName = message.destinationName.toString().split("/", 3).pop()
    const updateTo = message.destinationName.toString().split("/").pop();
    const value = JSON.parse(message.payloadString);
    const car = cars[carName];
    switch (updateTo) {
        case "track_location_id":
            if (car.traceLocationID !== undefined) {
                car.last.traceLocationID = car.traceLocationID;
            }
            car.traceLocationID = value.value;
            break;
        case "track_piece_id":
            const TID = "trackId";
            car.tracePieceID = TID+value.value;
            break;
        case "speed":
            car.speed = parseInt(value.value);
            break;
        case "ANKI_VEHICLE_MSG_V2C_LOCALIZATION_TRANSITION_UPDATE":
            car.offset = value.offset;
            doAnimation(car);
            // Reset after animation.
            car.traceLocationID = undefined;
            car.last.traceLocationID = undefined;
            break;
    }
}

/**
 * This function manages the animation.
 * Do error correction if Track Location ID or Track Piece ID is missed.
 * @param carInfo - Object: saved car's information from MQTT-Subscribe.
 */
function doAnimation(carInfo) {
    if (!carInfo.tracePieceID) return;
    let scale;
    let revert;
    const OLD = "Old";
    const LANE = "LANE";
    const revertLane = (reverse, total)=> total+1-reverse;

    let trackPieceSVG = document.getElementById(carInfo.tracePieceID);
    let trackType = trackPieceSVG.getAttribute("tracktype");
    if(lastAnimate[carInfo.name] === undefined){
        switch (trackType){
            case "STRAIGHT":
            case "TO_THE_MIDDLE":
                if (carInfo.last.traceLocationID > carInfo.traceLocationID) {
                    lastAnimate[carInfo.name] = directionOf[carInfo.tracePieceID][DIRECTION.RIGHT];
                } else if (carInfo.last.traceLocationID < carInfo.traceLocationID) {
                    lastAnimate[carInfo.name] = directionOf[carInfo.tracePieceID][DIRECTION.LEFT];
                } else {
                    lastAnimate[carInfo.name] = carInfo.tracePieceID;
                    lastAnimate[carInfo.name + LANE] = parseInt(trackPieceSVG
                        .querySelector("[locationid*='"+carInfo.traceLocationID+"']")
                        .id.match(/\d+/g)[1]);
                    return;
                }
                break;
            default:
                return;
        }
    }

    // Error correction: if the track piece ID was not updated, find the next.
    if (lastAnimate[carInfo.name] === carInfo.tracePieceID) {
        const track = directionOf[carInfo.tracePieceID];
        let fromDirection= track[lastAnimate[carInfo.name + OLD]];
        let totalLanes = trackPieceSVG.querySelectorAll("[id*='Lane']").length; /// wildcard *
        const maxRotation = 3;
        const junctionTotalLanes = totalLanes - (totalLanes / maxRotation); // only for junction-type.
        const rotation = trackPieceSVG.getAttribute("rotation");
        lastAnimate[carInfo.name] = carInfo.tracePieceID;
        switch (trackType) {
            case TRACK_TYPE.STRAIGHT:
            case TRACK_TYPE.TO_THE_MIDDLE:
                switch (fromDirection) {
                    case DIRECTION.LEFT:
                        carInfo.tracePieceID = track[DIRECTION.RIGHT];
                        break;
                    case DIRECTION.RIGHT:
                        carInfo.tracePieceID = track[DIRECTION.LEFT];
                        break;
                }
                break;
            case TRACK_TYPE.CURVE:
                switch (rotation){
                    case "0":
                        switch (fromDirection) {
                            case DIRECTION.LEFT:
                                carInfo.tracePieceID = track[DIRECTION.UPPER];
                                break;
                            case DIRECTION.UPPER:
                                carInfo.tracePieceID = track[DIRECTION.LEFT];
                                break;
                        }
                        break;
                    case "1":
                        switch (fromDirection) {
                            case DIRECTION.LEFT:
                                carInfo.tracePieceID = track[DIRECTION.UNDER];
                                break;
                            case DIRECTION.UNDER:
                                carInfo.tracePieceID = track[DIRECTION.LEFT];
                                break;
                        }
                        break;
                    case "2":
                        switch (fromDirection) {
                            case DIRECTION.RIGHT:
                                carInfo.tracePieceID = track[DIRECTION.UNDER];
                                break;
                            case DIRECTION.UNDER:
                                carInfo.tracePieceID = track[DIRECTION.RIGHT];
                                break;
                        }
                        break;
                    case "3":
                        switch (fromDirection) {
                            case DIRECTION.RIGHT:
                                carInfo.tracePieceID = track[DIRECTION.UPPER];
                                break;
                            case DIRECTION.UPPER:
                                carInfo.tracePieceID = track[DIRECTION.RIGHT];
                                break;
                        }
                }
                break;
            case TRACK_TYPE.JUNCTION:
                switch (rotation) {
                    case "0":
                        switch (fromDirection) {
                            case DIRECTION.LEFT:
                                if (junctionLaneFindHelper.laneBeforeJunction > junctionTotalLanes / 2) {
                                    carInfo.tracePieceID = track[DIRECTION.UPPER];
                                } else {
                                    carInfo.tracePieceID = track[DIRECTION.RIGHT];
                                }
                                break;
                            case DIRECTION.RIGHT:
                                if (junctionLaneFindHelper.laneBeforeJunction > junctionTotalLanes / 2) {
                                    carInfo.tracePieceID = track[DIRECTION.UPPER];
                                } else {
                                    carInfo.tracePieceID = track[DIRECTION.LEFT];
                                }
                                break;
                            case DIRECTION.UPPER:
                                if (junctionLaneFindHelper.laneBeforeJunction > junctionTotalLanes / 2) {
                                    carInfo.tracePieceID = track[DIRECTION.LEFT];
                                } else {
                                    carInfo.tracePieceID = track[DIRECTION.RIGHT];
                                }
                                break;
                        }
                        break;
                    case "1":
                        switch (fromDirection) {
                            case DIRECTION.UPPER:
                                if(junctionLaneFindHelper.laneBeforeJunction > junctionTotalLanes/ 2) {
                                    carInfo.tracePieceID = track[DIRECTION.LEFT];
                                } else {
                                    carInfo.tracePieceID = track[DIRECTION.UNDER];
                                }
                                break;
                            case DIRECTION.UNDER:
                                if(junctionLaneFindHelper.laneBeforeJunction > junctionTotalLanes / 2) {
                                    carInfo.tracePieceID = track[DIRECTION.LEFT];
                                } else {
                                    carInfo.tracePieceID = track[DIRECTION.UPPER];
                                }
                                break;
                            case DIRECTION.LEFT:
                                if (junctionLaneFindHelper.laneBeforeJunction > junctionTotalLanes / 2) {
                                    carInfo.tracePieceID = track[DIRECTION.UPPER];
                                } else {
                                    carInfo.tracePieceID = track[DIRECTION.UNDER];
                                }
                                break;
                        }
                        break;
                    case "2":
                        switch (fromDirection){
                            case DIRECTION.LEFT:
                                if (junctionLaneFindHelper.laneBeforeJunction > junctionTotalLanes / 2) {
                                    carInfo.tracePieceID = track[DIRECTION.RIGHT];
                                } else {
                                    carInfo.tracePieceID = track[DIRECTION.UNDER];
                                }
                                break;
                            case DIRECTION.RIGHT:
                                if (junctionLaneFindHelper.laneBeforeJunction > junctionTotalLanes / 2) {
                                    carInfo.tracePieceID = track[DIRECTION.LEFT];
                                } else {
                                    carInfo.tracePieceID = track[DIRECTION.UNDER];
                                }
                        }
                        break;
                    case "3":
                        switch (fromDirection) {
                            case DIRECTION.UPPER:
                                if(junctionLaneFindHelper.laneBeforeJunction > junctionTotalLanes / 2) {
                                    carInfo.tracePieceID = track[DIRECTION.UNDER];
                                } else {
                                    carInfo.tracePieceID = track[DIRECTION.RIGHT];
                                }
                                break;
                            case DIRECTION.UNDER:
                                if(junctionLaneFindHelper.laneBeforeJunction > junctionTotalLanes / 2) {
                                    carInfo.tracePieceID = track[DIRECTION.UPPER];
                                } else {
                                    carInfo.tracePieceID = track[DIRECTION.RIGHT];
                                }
                                break;
                            case DIRECTION.RIGHT:
                                if (junctionLaneFindHelper.laneBeforeJunction > junctionTotalLanes / 2) {
                                    carInfo.tracePieceID = track[DIRECTION.UPPER];
                                } else {
                                    carInfo.tracePieceID = track[DIRECTION.UNDER];
                                }
                                break;
                        }
                        break;
                }
                break;
            case "INTERSECTION":
                switch (fromDirection){
                    case DIRECTION.UPPER:
                        carInfo.tracePieceID = track[DIRECTION.UNDER];
                        break;
                    case DIRECTION.UNDER:
                        carInfo.tracePieceID = track[DIRECTION.UPPER];
                        break;
                    case DIRECTION.LEFT:
                        carInfo.tracePieceID = track[DIRECTION.RIGHT];
                        break;
                    case DIRECTION.RIGHT:
                        carInfo.tracePieceID = track[DIRECTION.LEFT];
                        break;
                }
                break;
        }
    }

    trackPieceSVG = document.getElementById(carInfo.tracePieceID);
    trackType = trackPieceSVG.getAttribute("tracktype");
    const rotation = trackPieceSVG.getAttribute("rotation");

    // Save the previous lane before the junction.
    junctionLaneFindHelper.laneBeforeJunction = lastAnimate[carInfo.name + LANE];

    // Select a lane to animate.
    if (carInfo.traceLocationID === undefined) {
        const fromDirection= directionOf[carInfo.tracePieceID][lastAnimate[carInfo.name]];
        let lastLane = lastAnimate[carInfo.name + LANE];
        const normalTotalLanes = trackPieceSVG.querySelectorAll("[id*='Lane']").length; /// wildcard *
        const junctionSetLanes = normalTotalLanes - (normalTotalLanes / 3); // only for junction-type.
        const intersectionSetLanes = normalTotalLanes/2; // only for intersection-type.
        let toAnimateLane = lastLane;
        switch (trackType){
            case (TRACK_TYPE.CURVE):
                switch (rotation) {
                    case "1":
                        if (fromDirection === DIRECTION.LEFT) {
                            toAnimateLane = revertLane(lastLane, normalTotalLanes);
                        }
                        break;
                    case "2":
                        toAnimateLane = revertLane(lastLane, normalTotalLanes);
                        break;
                    case "3":
                        if (fromDirection === DIRECTION.UPPER) {
                            toAnimateLane = revertLane(lastLane, normalTotalLanes);
                        }
                }
            break;
            case (TRACK_TYPE.JUNCTION):
                if(junctionLaneFindHelper.junctionLanes !== junctionSetLanes){
                        setJunctionLaneHelper(junctionSetLanes);
                }
                switch (rotation) {
                    case "0":
                        switch (fromDirection){
                            case DIRECTION.LEFT:
                            toAnimateLane = junctionLaneFindHelper.x[lastLane];
                            break;
                            case DIRECTION.UPPER:
                                toAnimateLane = junctionLaneFindHelper.y[lastLane];
                            break;
                            case DIRECTION.RIGHT:
                                toAnimateLane = junctionLaneFindHelper.z[lastLane];
                            break;
                        }
                        break;
                    case "1":
                        switch (fromDirection){
                            case DIRECTION.LEFT:
                                toAnimateLane = junctionLaneFindHelper.y[revertLane(lastLane, junctionSetLanes)];
                                break;
                            case DIRECTION.UPPER:
                                toAnimateLane = junctionLaneFindHelper.z[lastLane];
                                break;
                            case DIRECTION.UNDER:
                                toAnimateLane = junctionLaneFindHelper.x[lastLane];
                                break;
                        }
                        break;
                    case "2":
                        switch (fromDirection) {
                            case DIRECTION.UNDER:
                                toAnimateLane = junctionLaneFindHelper.y[lastLane];
                                break;
                            case DIRECTION.LEFT:
                                toAnimateLane = junctionLaneFindHelper.x[revertLane(lastLane, junctionSetLanes)];
                                break;
                            case DIRECTION.RIGHT:
                                toAnimateLane = junctionLaneFindHelper.z[revertLane(lastLane, junctionSetLanes)];
                        }
                        break;
                    case "3":
                        switch (fromDirection) {
                            case DIRECTION.RIGHT:
                                toAnimateLane = junctionLaneFindHelper.y[revertLane(lastLane, junctionSetLanes)];
                                break;
                            case DIRECTION.UPPER:
                                toAnimateLane = junctionLaneFindHelper.z[revertLane(lastLane, junctionSetLanes)];
                                break;
                            case DIRECTION.UNDER:
                                toAnimateLane = junctionLaneFindHelper.x[revertLane(lastLane, junctionSetLanes)];
                                break;
                        }
                }
            break;
            case (TRACK_TYPE.INTERSECTION):
                if (fromDirection === DIRECTION.UPPER || fromDirection === DIRECTION.UNDER){
                    toAnimateLane = lastLane + intersectionSetLanes
                }
            break;
        }
        carInfo.traceLocationID = parseInt(document.getElementById(carInfo.tracePieceID+"Lane"+toAnimateLane)
            .getAttribute("locationid").split(",")[0]);
        lastAnimate[carInfo.name + LANE] = toAnimateLane;
    }

    // Set animation path.
    const lane = trackPieceSVG.querySelector("[locationid*='"+carInfo.traceLocationID+"']");
    carInfo.animation.path = lane.getAttribute("d");
    carInfo.animation.duration = Math.floor(lane.getTotalLength()*1000 / carInfo.speed);

    // Set animation's direction.
    if (lastAnimate[carInfo.name]) {
        const trackType = document.getElementById(carInfo.tracePieceID).getAttribute("tracktype");
        const fromDirection = directionOf[carInfo.tracePieceID][lastAnimate[carInfo.name]]
        switch (trackType) {
            case "STRAIGHT":
            case "TO_THE_MIDDLE":
                switch (fromDirection) {
                    case "RIGHT":
                        scale = "scale(1,1)"
                        revert = true;
                        break;
                }
                break;
            case "CURVE":
                switch (fromDirection){
                    case "UPPER":
                    case "UNDER":
                        scale = "scale(1,-1)"
                        revert = true;
                        break;
                }
                break
            case "JUNCTION":
                const rotation = document.getElementById(carInfo.tracePieceID).getAttribute("rotation");
                switch (fromDirection) {
                    case "UPPER":
                        switch (rotation) {
                            case "1":
                                if (carInfo.animation.path.split(" ")[2] === "V"
                                    || carInfo.animation.path.split(" ")[2] === "H") {
                                    revert = true;
                                    scale = "scale(1,-1)";
                                } else {
                                    scale = "scale(-1,1)";
                                }
                                break;
                            case "3":
                                if (carInfo.animation.path.split(" ")[2] === "V"
                                    || carInfo.animation.path.split(" ")[2] === "H") {
                                    revert = true;
                                    scale = "scale(1,-1)";
                                } else {
                                    scale = "scale(-1,1)";
                                }
                                break;
                            default:
                                revert = true;
                                scale = "scale(1,-1)"
                        }
                        break;
                    case "RIGHT":
                        const normalTotalLanes = trackPieceSVG.querySelectorAll("[id*='Lane']").length; /// wildcard *
                        const junctionSetLanes = normalTotalLanes - (normalTotalLanes / 3);
                        const laneId = parseInt(lane.id.match(/\d+/g)[1]);
                        switch (rotation) {
                            case "2":
                                if (laneId > junctionSetLanes) {
                                    revert = true;
                                    scale = "scale(1,-1)"
                                } else {
                                    scale = "scale(-1,1)"
                                }
                                break;
                            case "0": //Do not delete
                                if (laneId > junctionSetLanes) {
                                    revert = true;
                                    scale = "scale(1,1)"
                                }
                                break;
                            default:
                                revert = true;
                                scale = "scale(1,1)"
                        }
                        break;
                    case "LEFT":
                        switch (rotation) {
                            case "1":
                                revert = true;
                                scale = "scale(1,1)";
                                break;
                        }
                        break;
                    case DIRECTION.UNDER:
                        switch (rotation){
                            case "2":
                                revert = true;
                                scale = "scale(1,-1)";
                                break;
                        }
                }
            break;
            case TRACK_TYPE.INTERSECTION:
                switch (fromDirection){
                    case "RIGHT":
                        revert = true;
                        scale = "scale(1,1)";
                        break;
                    case DIRECTION.UPPER:
                        revert = true;
                        scale = "scale(1,1)";
                }
        }
    }

    // Save last animation's information for the next animation.
    lastAnimate[carInfo.name + OLD] = lastAnimate[carInfo.name];
    lastAnimate[carInfo.name] = carInfo.tracePieceID;

    lastAnimate[carInfo.name + LANE] = parseInt(lane.id.match(/\d+/g)[1]);
    // Set lane back to the normal lanes range for some track types.
    if (lastAnimate[carInfo.name + OLD] !== undefined){
        const fromDirection= directionOf[carInfo.tracePieceID][lastAnimate[carInfo.name + OLD]];
        let lastLane = lastAnimate[carInfo.name + LANE];
        const normalTotalLanes = trackPieceSVG.querySelectorAll("[id*='Lane']").length; /// wildcard *
        const junctionSetLanes = normalTotalLanes - (normalTotalLanes / 3); // only for junction-type.
        const intersectionSetLanes = normalTotalLanes/2;
        trackType = trackPieceSVG.getAttribute("tracktype");
        switch (trackType) {
            case (TRACK_TYPE.CURVE):
                switch (rotation) {
                    case "1":
                        if (fromDirection === DIRECTION.UPPER) lastAnimate[carInfo.name + LANE]
                            = revertLane(lastLane, normalTotalLanes);
                        break;
                    case "2":
                        lastAnimate[carInfo.name + LANE] = revertLane(lastLane, normalTotalLanes);
                        break;
                    case "3":
                        if (fromDirection === DIRECTION.RIGHT) lastAnimate[carInfo.name + LANE]
                            = revertLane(lastLane, normalTotalLanes);
                }
                break;
            case (TRACK_TYPE.JUNCTION):
                const animatedLane = lastAnimate[carInfo.name + LANE];
                lastAnimate[carInfo.name + LANE] = junctionLaneFindHelper.laneBeforeJunction;
                switch (rotation){
                    case "0":
                    case "3":
                        if (animatedLane <= junctionSetLanes && animatedLane > junctionSetLanes/2) {
                            lastAnimate[carInfo.name + LANE] =
                                revertLane(junctionLaneFindHelper.laneBeforeJunction, junctionSetLanes);
                        }
                        break;
                    case "1":
                    case "2":
                        if (animatedLane <= junctionSetLanes/2) {
                            lastAnimate[carInfo.name + LANE] =
                                revertLane(junctionLaneFindHelper.laneBeforeJunction, junctionSetLanes);
                        }
                        break;
                }
                break;
            case (TRACK_TYPE.INTERSECTION):
                if (fromDirection === DIRECTION.UPPER || fromDirection === DIRECTION.UNDER){
                    lastAnimate[carInfo.name + LANE] = lastLane - intersectionSetLanes
                }
                break;
        }
    }

    document.getElementsByClassName(carInfo.name + "_tracePiece")[0].innerText = "Track Piece: "
        + lane.id.match(/\d+/g)[0];
    document.getElementsByClassName(carInfo.name + "_traceLocation")[0].innerText = "Track Location: "
        + carInfo.traceLocationID;
    svg.updateDTCar(carInfo, scale, revert);
}

/**
 * Create vector values of lane numbers of junction track piece.
 * @param lanes - Number: must be a number of lanes-setting!
 */
function setJunctionLaneHelper(lanes){
    junctionLaneFindHelper.junctionLanes = lanes;
    Object.keys(junctionLaneFindHelper).forEach((key)=>{
        switch (key){
            case "x":
                for (let i = 1; i < lanes+1 ; i++) {
                    if (i <= lanes/2){
                        junctionLaneFindHelper.x[i] = lanes+i;
                    } else {
                        junctionLaneFindHelper.x[i] = i-(lanes/2);
                    }
                }
                break;
            case "y":
                for (let i = 1; i < lanes+1 ; i++) {
                    if (i <= lanes/2){
                        junctionLaneFindHelper.y[i] = lanes+1-i;
                    } else {
                        junctionLaneFindHelper.y[i] = i - (lanes/2);
                    }
                }
                break;
            case "z":
                for (let i = 1; i < lanes+1 ; i++) {
                    if (i <= lanes/2){
                        junctionLaneFindHelper.z[i] = lanes+i;
                    } else {
                        junctionLaneFindHelper.z[i] = i;
                    }
                }
        }
    });
    //console.log(junctionLaneFindHelper);
}

/**
 * EventListener for mqtt-subscribe in mqtt.js.
 * @param evenName - String: name of observer function.
 * @param value - Paho.MQTT.Message or String: mqtt-message or cars name.
 */
function eventListener(evenName, value) {
    switch (evenName) {
        case "makeCars":
            makeCars(value);
            break;
        case "update":
            update(value)
            break;
    }
}

/**
 * Create a car controller.
 * @param carName - String: name of car.
 * @returns {HTMLDivElement} - HTML-Elements: car controller.
 */
function addCar(carName) {
    const carController = document.createElement("div");
    carController.className = "carController";
    const carNameP = document.createElement("p");
    carNameP.className = "name";
    carNameP.innerText = "Name: " + carName;

    const img = document.createElement("img");
    img.setAttribute("src", "src/pics/car.png");
    img.setAttribute("alt", "car pic");

    const form = document.createElement("form");
    form.submit(function() { return false; });
    const speedLabel = document.createElement("label");
    const speedInput = document.createElement("input");
    speedLabel.innerText = "Speed: "
    speedInput.setAttribute("value", "0");
    speedInput.setAttribute("type", "number");
    speedInput.addEventListener("keyup", ({key}) => {
        event.preventDefault();
        if (key === "Enter") {
            mqtt.changeSpeed(carName, speedInput.value)
        }
    })
    form.append(speedLabel, speedInput);

    const speedUpdateBtt = document.createElement("button");
    speedUpdateBtt.innerText = "update";
    speedUpdateBtt.addEventListener("click", function () {
        mqtt.changeSpeed(carName, speedInput.value)
        if (speedInput.value === "0") {
            svg.carStop(carName);
        }
    });

    const lane = document.createElement("p");
    lane.className = carName + "_lane";
    lane.innerText = "Lane: 0";

    const tracePiece = document.createElement("p");
    tracePiece.className = carName + "_tracePiece";
    tracePiece.innerText = "Track Piece: 0";

    const traceLocation = document.createElement("p");
    traceLocation.className = carName + "_traceLocation";
    traceLocation.innerText = "Track Location: 0";

    const MOVE_VALUE = 10;
    const moveLeftBtt = document.createElement("button");
    moveLeftBtt.innerText = "Move Left";
    moveLeftBtt.addEventListener("click", function () {
        mqtt.changeLane(carName, parseInt(cars[carName].offset)-MOVE_VALUE);
    });

    const moveRightBtt = document.createElement("button");
    moveRightBtt.innerText = "Move Right";
    moveRightBtt.addEventListener("click", function () {
        mqtt.changeLane(carName, parseInt(cars[carName].offset)+MOVE_VALUE);
    });

    carController.append(carNameP, img, form, speedUpdateBtt, tracePiece, traceLocation,
        moveRightBtt, moveLeftBtt);
    return carController;
}

/**
 *  Public interface
 **/
export default {
    getTitle: function () {
        return "Digital Twin";
    },
    render: function () {
        const template = document.querySelector("#tpl-digital-twin").cloneNode(true);
        return renderDT(template.content);
    }
}