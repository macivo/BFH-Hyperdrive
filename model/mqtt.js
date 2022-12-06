/*
 *  BFH Hyper drive -- Track Editor
 *  Bachelor thesis (BTI3051) 22, Bern University of Applied Sciences
 *  Developer: Mac Müller
 *
 *  mqtt.js: MQTT Service
 *
 */
import util from "./util.js";

const TOPIC = {     // List of all topics to subscribe or public.
    "status": "Anki/WebClient/S/Status",
    "hostStatus": "Anki/Host/host/S/HostStatus",
    "hostCars": "Anki/Host/host/S/Cars",
    "hostConnect": "Anki/Host/host/I",
    "Car": "Anki/Car/",
    "ShareTrack":"Anki/WebClient/E/Share"
}
let client;     // MQTT-Client.
let host;       // Status of Anki-Overdrive Host.
let cars = {};  // Object for control an TOPIC.hostCars.
let eventFire;  // EventListener save as eventFire.

/**
 * Init MQTT-Client, create a connection to MQTT-Broker.
 * @param eventListener - Function for MQTT-Subscribe actions.
 */
function init(eventListener){
    eventFire = eventListener;
    const setting = util.getSetting();
    client = new Paho.MQTT.Client(setting.MQTTHost, setting.MQTTPort, "/"+setting.MQTTBasePath, setting.MQTTClientID+Date.now());
    const connectOption = {
        userName: setting.MQTTUsername,
        password: setting.MQTTPassword,
        onSuccess: onConnect,
    };
    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;
    client.connect(connectOption);
}

/**
 * Callback-function: if MQTT-Client is connected.
 */
function onConnect() {
    client.subscribe(TOPIC.status);
    client.subscribe(TOPIC.hostStatus);
    client.subscribe(TOPIC.hostCars);
    client.subscribe(TOPIC.ShareTrack);
    client.send(TOPIC.status, JSON.stringify({ "online": true }), 0, false);
    connectHost();
}

/**
 * Callback-function: if MQTT-Client has lost connection.
 */
function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
        util.showNotice("Error: No connection to MQTT please reload the pages")
        console.log("onConnectionLost:"+responseObject.errorMessage);
    }
}

/**
 * Callback-function: if a MQTT-Message from subscribed topics has published.
 * @param message - Paho.MQTT.Message: mqtt-message.
 */
function onMessageArrived(message) {
    switch (message.destinationName) {
        case TOPIC.status:
            eventFire("MQTTClientOK", message);
            break;
        case TOPIC.ShareTrack:
            if (eventFire) eventFire("shareTrack", message);
            util.saveShareTrack(JSON.parse(message.payloadString));
            break;
        case TOPIC.hostStatus:
            host = JSON.parse(message.payloadString);
            break;
        case TOPIC.hostCars:
            if(message.retained === true) break;
            Promise.resolve(JSON.parse(message.payloadString)).then((carsArray)=>{
                carsArray.forEach((x) => {
                    if(typeof cars[x] === "undefined") cars[x] = {};
                    eventFire("makeCars", x);
                });
            });
            break;
        default:
            eventFire("update", message);
            break;
    }
}

/**
 * Publish a MQTT-Message: notify to Anki-Overdrive-Host to find the cars.
 */
function connectHost(){
    client.send(TOPIC.hostConnect, JSON.stringify({ "connecting": true }), 0, false);
}

/**
 * Publish a MQTT-Message: change speed of a car.
 * @param carName - String: name of car.
 * @param speed - Integer/String: value of speed 200 till 1250.
 */
function changeSpeed(carName, speed){
    const STANDARD_ACCELERATION = 1000;
    client.send(TOPIC.Car+carName+'/I', JSON.stringify({
        speed: Number(speed),
        acceleration: STANDARD_ACCELERATION
    }), 0, false);
}

/**
 * Change the lane of car.
 * @param carName - String: name of car.
 * @param offset - Number: offset value.
 */
function changeLane(carName, offset){
    client.send(TOPIC.Car+carName+'/I', JSON.stringify({
        lane: Number(offset),
    }), 0, false);
}

/**
 * Send bridge command to host to edit configuration file of broker.
 * @param host - String: host-address.
 * @param port - String: port-number.
 * @param username - String: optional username.
 * @param password - String: optional password.
 */
function sendBridgeCmd(host, port, username, password){
    client.send(TOPIC.hostConnect, JSON.stringify({
        "bridge": true,
        "host": host,
        "port": port,
        "username": username,
        "password": password
    }), 0, false);
}

/**
 * Share track via MQTT.
 * @param track - SVG: track.
 */
function shareTrack(track) {
    client.send(TOPIC.ShareTrack, JSON.stringify({
        row: util.getSetting().Row,
        column: util.getSetting().Column,
        track: track
    }), 0, true);
}

/**
 *  Public interface
 **/
export default {
    init: function (eventListener) {
        init(eventListener);
    },
    getHostStatus: function (){
        return host;
    },
    connectHost: function () {
        connectHost();
    },
    getClientStatus: function () {
        return client.isConnected();
    },
    changeSpeed: function (carName, speed) {
        changeSpeed(carName, speed);
    },
    changeLane: function (carName, offset) {
        changeLane(carName, offset);
    },
    subscribeCar: function (carName){
        client.subscribe(TOPIC.Car+carName+"/E/track_piece_id");
        client.subscribe(TOPIC.Car+carName+"/E/track_location_id");
        client.subscribe(TOPIC.Car+carName+"/E/speed");
        client.subscribe(TOPIC.Car+carName+"/E/Messages/ANKI_VEHICLE_MSG_V2C_LOCALIZATION_TRANSITION_UPDATE");
    },
    shareTrack: function (track){
        shareTrack(track);
    },
    setBridge: function (host, port, username, password){
        sendBridgeCmd(host, port, username, password);
    }

}
