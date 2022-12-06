/*
 *  BFH Hyper drive -- Track Editor
 *  Bachelor thesis (BTI3051) 22, Bern University of Applied Sciences
 *  Developer: Mac Müller
 *
 *  track.js: Extra Controller for the editor board of home.js
 *
 */
import util from "../model/util.js";
import trackPiece from "../model/track-piece.js";
import svg from "../model/svg.js";

const editorBoard = document.createElement("div"); // Editor board.
const uniqueTrackID = new Set();    // Controller for unique track id.

/**
 * Create an editors board, if not exits.
 * Set the width of board.
 * @returns {HTMLDivElement} - HTML-Element: editors board.
 */
function getEditorBoard() {
    if (editorBoard.innerHTML === "") {
        for (let i = 0; i < util.getSetting().Column * util.getSetting().Row; i++) {
            editorBoard.append(trackPiece.makeTrackPiece(i));
        }
        setBoardStyle();
    }
    svg.setPaper(util.getSetting().PaperWidth, util.getSetting().PaperHeight);
    return editorBoard;
}

/**
 * Set grid layout of editor board from board-setting.
 */
function setBoardStyle() {
    editorBoard.className = "editorBoard";
    let boardHeight = 57; // 57vh 100vw
    const boardWidth = 100;
    let gridBoxHeight = boardHeight / util.getSetting().Row;
    let gridBoxWidth = gridBoxHeight * util.getSetting().PaperWidth / util.getSetting().PaperHeight;
    let gridBoxWidthPixel = gridBoxWidth * document.documentElement.clientHeight / boardWidth * util.getSetting().Column;

    if (gridBoxWidthPixel > (document.documentElement.clientWidth)) {
        boardHeight = boardHeight * (document.documentElement.clientWidth - boardWidth) / gridBoxWidthPixel;
        gridBoxHeight = boardHeight / util.getSetting().Row;
        gridBoxWidth = gridBoxHeight * util.getSetting().PaperWidth / util.getSetting().PaperHeight;
    }
    editorBoard.style.gridTemplateRows = "repeat(" + util.getSetting().Row + ", " + gridBoxHeight + "vh)";
    editorBoard.style.gridTemplateColumns = "repeat(" + util.getSetting().Column + ", " + gridBoxWidth + "vh)";
}

/**
 * Control of the unique track ID for the board.
 * @param id - Number: track id.
 * @param name - String: type of track.
 * @returns emptySlot - HTML-Element: Track piece which has been added.
 */
function addTrackPiece(id, name) {
    let trackPieces = Array.from(document.querySelectorAll('.editorBoard .trackPiece'));
    let emptySlot = trackPieces.find(trackP => trackP.getAttribute("status") === "empty");

    if (typeof (emptySlot) !== "undefined") {
        if (uniqueTrackID.has(id)) {
            util.showNotice("Error: This id already exits. New track piece has not been added");
            document.getElementById("nextId").setAttribute("value", Math.max(...uniqueTrackID)+1);
            return null;
        } else {
            uniqueTrackID.add(id)
            emptySlot.dispatchEvent(new CustomEvent('addSVG', {detail: {"id": id, "name": name}}));
            document.getElementById("nextId").setAttribute("value", Math.max(...uniqueTrackID)+1);
            return emptySlot;
        }
    } else {
        util.showNotice("Error: Board already full!!");
        return null;
    }
}

/**
 * Add SVG to an available track piece.
 * @param svg - SVGElement: track piece SVG.
 * @returns emptySlot - HTML-Element: Track piece which has been added.
 */
function addSVG(svg) {
    let trackPieces = Array.from(editorBoard.children);
    let emptySlot = trackPieces.find((trackP) => {
        return trackP.getAttribute("status") === "empty";
    });

    if (typeof (emptySlot) != "undefined") {
        let trackID = parseInt(svg.id.match(/\d+/));
        if (uniqueTrackID.has(trackID)) {
            util.showNotice("Error: This track ID is already assigned, the ID will be changed to next variable value.");
            while (uniqueTrackID.has(trackID)) {
                trackID++;
            }
            svg.id = "trackId" + trackID;
        }
        uniqueTrackID.add(trackID);
        emptySlot.prepend(svg);
        return emptySlot.setAttribute("status", "occupied");
    } else {
        util.showNotice("Error: Board already full!!")
        return null;
    }
}

/**
 * Get SVG of the track (contains all track pieces in one SVG).
 * @returns {SVGSVGElement} - SVGElement: track SVG.
 */
function getTrackSVG() {
    return svg.getTrack(editorBoard, {column: util.getSetting().Column, row: util.getSetting().Row});
}

/**
 * Get shared the track from MQTT.
 * @returns {*[]} - Object - information of shared track.
 */
function getShareTrack(){
    let trackPieces = editorBoard.querySelectorAll(".trackPiece");
    const shareTrack = [];
    trackPieces.forEach(trackPiece =>{
        if (trackPiece.getAttribute("status") === "empty"){
            shareTrack.push("empty");
        } else {
            const svg = trackPiece.querySelector("svg");
            let lanesSVG = svg.querySelectorAll("[id*='Lane']").length;
            switch (svg.getAttribute("tracktype")){
                case "JUNCTION":
                    lanesSVG = lanesSVG - (lanesSVG/3);
                    break;
                case "INTERSECTION":
                    lanesSVG /=2;
                    break;
            }
            shareTrack.push({
                trackType: svg.getAttribute("tracktype"),
                trackId: svg.getAttribute("id").match(/\d+/)[0],
                width: parseInt(svg.getAttribute("viewBox").split(" ")[2]),
                height: parseInt(svg.getAttribute("viewBox").split(" ")[3]),
                rotation: parseInt(svg.getAttribute("rotation")),
                lanes: lanesSVG
            })
        }
    });
    return shareTrack;
}

/**
 * Share the track via MQTT
 */
function setShareTrack() {
    if (util.getSetting().shareTrack === undefined) {
        util.showNotice("Error: No connection or shared track.");
        return;
    }
    const savedTrack =  util.getSetting().shareTrack.track;
    const row = util.getSetting().shareTrack.row;
    const column = util.getSetting().shareTrack.column;
        util.getSetting().Row = row;
        util.getSetting().Column = column;
        editorBoard.innerHTML = "";
        uniqueTrackID.clear();
        getEditorBoard();
        savedTrack.forEach((value, index) =>{
            if (value !== "empty"){
                editorBoard.childNodes[index].prepend(
                    getSVG(value.trackType, value.trackId, value.lanes, value.width, value.height, value.rotation)
                )
                editorBoard.childNodes[index].setAttribute("status", "occupied");
                uniqueTrackID.add(value.trackId);
            }
        });
        util.showNotice("Shared track added.");
}

/**
 * Get a track piece as SVG.
 * @param trackType - String: type of track piece.
 * @param trackId - Number: track id.
 * @param lanes- Number: quantity of lanes.
 * @param width - Number: width of paper.
 * @param height - Number: height of paper.
 * @param rotation - Number: rotation value of SVG (0..3).
 * @returns {SVGElement} - HTML-Elements:SVG with created track piece.
 */
function getSVG(trackType, trackId, lanes, width, height, rotation) {
    return svg.getSvg(trackType, trackId, lanes, width, height, rotation);
}

/**
 *  Public interface
 **/
export default {
    getEditorBoard: function () {
        return getEditorBoard();
    },
    addTrackPiece: function (id, name) {
        addTrackPiece(id, name);
    },
    resetEditorBoard: function () {
        editorBoard.innerHTML = "";
        uniqueTrackID.clear();
    },
    getTrackSVG: function () {
        return getTrackSVG();
    },
    getShareTrack: function (){
        return getShareTrack()
    },
    setShareTrack: function (){
        setShareTrack();
    },
    addSVG: function (svg) {
        addSVG(svg);
    },
    getMaxID: function () {
        return uniqueTrackID.size > 0 ? Math.max(...uniqueTrackID) : 0;
    },
    addID: function (id){
        uniqueTrackID.add(parseInt(id))
    },
    removeID: function (id){
        uniqueTrackID.delete(id)
    }
}