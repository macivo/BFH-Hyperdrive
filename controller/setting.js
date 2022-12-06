/*
 *  BFH Hyper drive -- Track Editor
 *  Bachelor thesis (BTI3051) 22, Bern University of Applied Sciences
 *  Developer: Mac Müller
 *
 *  setting.js: Setting page
 *
 */
import util from "../model/util.js";
import track from "./track.js";
import mqtt from "../model/mqtt.js";
const carsSet = new Set(); // Unique control
/**
 * Generate a view for Setting page.
 * @param template - Object: template.
 * @returns {*} - HTMLCollections: a generated view.
 */
function renderSetting(template) {
    // Track Setting.
    const lanes = template.getElementById("lanes");
    const LANE = {MAX: 13, MIN:0};
    lanes.setAttribute("value", util.getSetting().Lanes);
    template.getElementById("trackSetting").addEventListener("click", function () {
        let lanesQuantity = parseInt(lanes.value)
        if (lanesQuantity < LANE.MAX
            && lanesQuantity > LANE.MIN
            && lanesQuantity%2 === 0){
            util.getSetting().setLane(lanesQuantity);
        } else {
            util.showNotice("Error: The number of lanes must be an odd number between 2 and 12.");
        }
    });

    // MQTT setting.
    const MQTTHost = template.getElementById("MQTTHost");
    const MQTTPort = template.getElementById("MQTTPort");
    const MQTTBasePath = template.getElementById("MQTTBasePath");
    const MQTTUsername = template.getElementById("MQTTUsername");
    const MQTTPassword = template.getElementById("MQTTPassword");
    MQTTHost.setAttribute("value", util.getSetting().MQTTHost);
    MQTTPort.setAttribute("value", util.getSetting().MQTTPort.toString());
    MQTTBasePath.setAttribute("value", util.getSetting().MQTTBasePath);
    MQTTUsername.setAttribute("value", util.getSetting().MQTTUsername);
    MQTTPassword.setAttribute("value", util.getSetting().MQTTPassword);
    template.getElementById("MQTTSave").addEventListener("click", function () {
        util.getSetting().setMQTT(MQTTHost.value, MQTTPort.value, MQTTBasePath.value, MQTTUsername.value, MQTTPassword.value);
    });

    // Editor setting.
    const GRID = {MIN:0, MAX:20};
    const editorColumn = template.getElementById("editorColumn");
    const editorRow = template.getElementById("editorRow");
    editorColumn.setAttribute("value", util.getSetting().Column);
    editorRow.setAttribute("value", util.getSetting().Row);
    editorColumn.setAttribute("min", GRID.MIN);
    editorColumn.setAttribute("max", GRID.MAX);
    editorRow.setAttribute("min", GRID.MIN);
    editorRow.setAttribute("max", GRID.MAX);
    template.getElementById("boardSetting").addEventListener("click", function () {
        if (editorColumn.value > GRID.MAX || editorRow.value > GRID.MAX
        || editorColumn.value <= GRID.MIN || editorRow.value <= GRID.MIN){
            util.showNotice("Error: Please enter a value between 1 to 20");
            return;
        }
        util.getSetting().setBoard(editorColumn.value, editorRow.value);
        track.resetEditorBoard();
    });

    // Connection testing.
    template.getElementById("refreshStatus").addEventListener("click", function () {
        mqtt.init(eventListener);
        setTimeout(function (){
            document.getElementsByClassName("mqttStatus")[0].innerText =
                mqtt.getClientStatus() === true ? " connected" : " no connection to MQTT broker!";
        }, 3000);
    });

    // Import Export Print.
    template.getElementById("exportTrack").addEventListener("click", function () {
        util.saveTrack();
    });
    template.getElementById("import").addEventListener("click", function () {
        const files = document.getElementById("fileImport");
        if(files.value === ""){
            files.click();
        } else {
            util.import(files);
        }
    });
    template.getElementById("saveTrackPieces").addEventListener("click", function () {
        util.saveTrackPieces();
    });

    // MQTT Bridge setting.
    const MQTTBridgeHost = template.getElementById("MQTTBridgeHost");
    const MQTTBridgePort = template.getElementById("MQTTBridgePort");
    const MQTTBridgeUsername = template.getElementById("MQTTBridgeUsername");
    const MQTTBridgePassword = template.getElementById("MQTTBridgePassword");
    MQTTBridgeHost.setAttribute("value", util.getSetting().MQTTHost);
    MQTTBridgePort.setAttribute("value", util.getSetting().MQTTPort.toString());
    MQTTBridgeUsername.setAttribute("value", util.getSetting().MQTTUsername);
    MQTTBridgePassword.setAttribute("value", util.getSetting().MQTTPassword);
    template.getElementById("MQTTBridge").addEventListener("click", function () {
        mqtt.init(eventListener);
        setTimeout(function (){
            mqtt.setBridge(MQTTBridgeHost.value, MQTTBridgePort.value, MQTTBridgeUsername.value, MQTTBridgePassword.value);
            util.showNotice("sent");
        }, 3000);

    });
    template.getElementById("shareTrack").addEventListener("click", function () {
        util.showNotice("Waiting..");
        mqtt.init(eventListener);
        setTimeout(function (){
            mqtt.shareTrack(track.getShareTrack());
            mqtt.getClientStatus() === true ?
                util.showNotice("Sharing") : util.showNotice("Error: no connection to MQTT broker!");
        }, 3000);
    });
    template.getElementById("getShareTrack").addEventListener("click", function () {
        util.showNotice("Waiting..");
        mqtt.init(eventListener);
        setTimeout(function (){
            track.setShareTrack();
        }, 3000);
    });
 return template;
}

/**
 * EventListener for the MQTT-Subscribe in mqtt.js.
 * @param evenName - String: name of observer function.
 * @param value - Paho.MQTT.Message or String: mqtt-message or cars name.
 */
function eventListener(evenName, value){
    switch (evenName){
        case "makeCars":
            if (carsSet.has(value)){
            } else {
                carsSet.add(value);
            } // no break
        case "MQTTClientOK":
            document.getElementsByClassName("mqttStatus")[0].innerText =
                mqtt.getClientStatus() === true ? " connected" : " failed!";
            document.getElementsByClassName("hostStatus")[0].innerText =
                mqtt.getHostStatus() &&
                mqtt.getHostStatus().value === true ? " online" : " offline!";
            document.getElementsByClassName("carsStatus")[0].innerText = " "+ carsSet.size.toString() + " cars connected";
            break;
        case "shareTrack":
            util.showNotice("Track has been shared.");
            break;
    }
}

/**
 *  Public interface
 **/
export default {
    getTitle: function () {
        return "Setting";
    },
    render: function () {
        const template = document.querySelector("#tpl-setting").cloneNode(true);
        return renderSetting(template.content);
    }
}