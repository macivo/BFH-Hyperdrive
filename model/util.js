/*
 *  BFH Hyper drive -- Track Editor
 *  Bachelor thesis (BTI3051) 22, Bern University of Applied Sciences
 *  Developer: Mac Müller
 *
 *  util:   Store the data for each browser session,
 *          any global functions and users stored data could also be declared here.
 *
 */
import setting from "../application-setting.js";
import track from "../controller/track.js";

let settingData = {}; // Setting of editors board.
/**
 * Init: Get the application-settings from application-setting.js.
 */
function init(){
    Object.assign(settingData, setting.get());
    settingData.trackPieces = [];
    if(settingData.Lanes%2 !== 0) Math.floor(--settingData.Lanes);
    settingData.setMQTT = function (MQTTHost, MQTTPort, MQTTBasePath, MQTTUsername, MQTTPassword){
        settingData.MQTTHost = MQTTHost;
        settingData.MQTTPort = parseInt(MQTTPort);
        settingData.MQTTBasepath = MQTTBasePath;
        settingData.MQTTUsername = MQTTUsername;
        settingData.MQTTPassword = MQTTPassword;
        showNotice("MQTT Client settings saved");
    }
    settingData.setBoard = function (column, row) {
        settingData.Column = column;
        settingData.Row = row;
        showNotice("SAVED: Board was reset!");
    }
    settingData.setLane = function (lanes) {
        settingData.Lanes = lanes;
        showNotice("SAVED");
    }
}

/**
 * Import track or track pieces.
 * @param file FileList: A list of files from input.
 */
function importSVG(file){
    Array.from(file.files).forEach(svgFile => {
        let reader = new FileReader();
        reader.onload = ev => {
            const svgText = atob(ev.target.result.replace(/data:image\/svg\+xml;base64,/, ''));
            const parser = new DOMParser();
            const svg = parser.parseFromString(svgText, "image/svg+xml").firstChild;
            const paperProp = svg.getAttribute("viewBox").split(" ");
            const paperHeight = parseInt(paperProp.pop());
            const paperWidth = parseInt(paperProp.pop());

            if (paperHeight === settingData.PaperHeight && paperWidth === settingData.PaperWidth){
                track.addSVG(svg);
                const BEGIN_BOX_WIDTH = "9";
                settingData.Lanes = Array.from(svg.childNodes).filter(path =>
                    path.getAttribute && path.getAttribute("stroke-width") === BEGIN_BOX_WIDTH).length-1;
                showNotice("Track piece added");

            } else if (paperHeight % settingData.PaperHeight === 0 && paperWidth % settingData.PaperWidth === 0){
                settingData.Row = paperHeight/settingData.PaperHeight;
                settingData.Column = paperWidth/settingData.PaperWidth;
                track.resetEditorBoard();
                const editorBoard = track.getEditorBoard();
                svg.childNodes.forEach(child => {
                    if (child.localName === "svg"){
                        child.setAttribute("width", "100%");
                        child.removeAttribute("height");
                        if(child.getAttribute("transform") !== null){
                            child.setAttribute("transform", child.getAttribute("transform").split(" translate")[0]);
                        }
                        const trackPiece = editorBoard.childNodes[parseInt(child.getAttribute("boardPosition"))];
                        trackPiece.prepend(child);
                        trackPiece.setAttribute("status", "occupied");
                        track.addID(parseInt(child.id.match(/\d+/)));
                    }
                });
                showNotice("Track added");
            } else {
                showNotice("Error: Wrong SVG format, please check format / setting.");
            }
        }
        reader.readAsDataURL(svgFile);
    });
}

/**
 * Save each track pieces with SVG format to users local-directory.
 */
function saveTrackPieces(){
    track.getEditorBoard().childNodes.forEach(trackPiece => {
        if (trackPiece.getAttribute("status") === "occupied") {
            const svg = (new XMLSerializer()).serializeToString(trackPiece.firstChild);
            let a = document.createElement("a");
            a.href = "data:image/svg+xml; charset=utf8, " + encodeURIComponent(svg.replace(/></g, '>\n\r<'));
            a.download = trackPiece.firstChild.getAttribute("tracktype")+"_"+trackPiece.firstChild.id+".svg";
            a.click();
        }
    });
    showNotice("Track pieces exported");
}

/**
 * Save track with SVG format to users local-directory.
 */
function saveTrack(){
    const svg = (new XMLSerializer()).serializeToString(track.getTrackSVG());
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    const yyyy = today.getFullYear();
    let a = document.createElement('a');
    a.href = "data:image/svg+xml; charset=utf8, " + encodeURIComponent(svg.replace(/></g, '>\n\r<'));
    a.download = "track_"+dd+mm+yyyy+".svg";
    a.click();
    showNotice("Track exported");
}

/**
 * Show notification.
 * @param text - String: error text.
 */
function showNotice(text) {
    const SHOW_TIME = 9000;
    const notice = document.createElement("p");
    notice.innerText = text;
    notice.id = "notice";
    notice.className = text.includes("Error")? "errorText": "notification";
    const noticeCheck = document.getElementById(notice.id)
    if (noticeCheck === null) {
        document.getElementsByTagName("main").item(0).prepend(notice);
        setTimeout(()=>{
            if (document.getElementById(notice.id) !== null) document.getElementById(notice.id).remove();
        }, SHOW_TIME);
    } else {
        if (noticeCheck.innerText.includes(text)) return;
        noticeCheck.innerText += " :: "+text;
    }
}

/**
 *  Public interface
 **/
export default {
    init: function () {
        init();
    },
    getSetting: function (){
        return settingData;
    },
    import: function (file){
        importSVG(file);
    },
    saveTrackPieces: function (){
        saveTrackPieces();
    },
    saveTrack: function (){
        saveTrack();
    },
    showNotice:function (errorText){
        showNotice(errorText);
    },
    saveShareTrack: function (data){
        settingData.shareTrack = data;
    }
}