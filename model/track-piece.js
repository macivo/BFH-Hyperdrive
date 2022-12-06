/*
 *  BFH Hyper drive -- Track Editor
 *  Bachelor thesis (BTI3051) 22, Bern University of Applied Sciences
 *  Developer: Mac Müller
 *
 *  track-piece.js: Track piece service - manage data and listener of each track piece
 *
 */
import svg from "../model/svg.js"
import util from "./util.js";
import track from "../controller/track.js";

/**
 * Create a track piece and functions.
 * @param id - Number: track id.
 * @returns {HTMLDivElement} - HTML-Element: a track piece with rotation- and delete-function.
 */
function makeTrackPiece(id){
    const trackPiece = document.createElement("div");
    trackPiece.className = "trackPiece";
    trackPiece.setAttribute("status", "empty");

    const delButton = document.createElement("button");
    delButton.className = "deleteButton";
    delButton.innerText = "X";
    delButton.addEventListener("click", function(){
        const svg = trackPiece.getElementsByTagName("svg");
        if(svg.length !== 0) {
            track.removeID(parseInt(svg[0].id.match(/\d+/)));
            trackPiece.setAttribute("status", "empty");
            document.getElementById("nextId").setAttribute("value", parseInt(svg[0].id.match(/\d+/)));
            svg[0].remove();
        }
    });

    const rotationButton = document.createElement("button");
    rotationButton.className = "rotationButton";
    rotationButton.addEventListener("click", function(){
         const svg = trackPiece.getElementsByTagName("svg").item(0);
         setRotation(svg);
    });

    trackPiece.append(delButton, rotationButton);
    trackPiece.setAttribute("draggable", "true");
    trackPiece.addEventListener('dragstart', handleDragStart);
    trackPiece.addEventListener('dragover', handleDragOver);
    trackPiece.addEventListener('dragenter', handleDragEnter);
    trackPiece.addEventListener('dragleave', handleDragLeave);
    trackPiece.addEventListener('dragend', handleDragEnd);
    trackPiece.addEventListener('drop', handleDrop);
    trackPiece.addEventListener('addSVG', createSvg);
    return trackPiece;
}

/**
 * Listeners of mouse events.
 *
 */
let dragSrcEl;
function createSvg(e) {
    // Add image to track piece.
    this.prepend(svg.getSvg(e.detail.name, e.detail.id,
        util.getSetting().Lanes, util.getSetting().PaperWidth, util.getSetting().PaperHeight));
    this.setAttribute("status", "occupied");
}
function handleDragStart(e) {
    dragSrcEl = this;
    e.dataTransfer.setData('text/html', this.firstChild.outerHTML);
    e.dataTransfer.effectAllowed = 'move';
    this.style.opacity = '0.4';
}
function handleDragEnd(e) {
    this.removeAttribute("style");
    let items = document.querySelectorAll('.editorBoard .trackPiece');
    items.forEach(function (item) {
        item.classList.remove('over');
    });
}
function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation(); // stops the browser from redirecting.
    }
    if (dragSrcEl !== this) {
        const svgOuterHTML = e.dataTransfer.getData('text/html');
        if (this.childElementCount === 2){
            this.prepend(dragSrcEl.firstChild.cloneNode(true));
            dragSrcEl.firstChild.remove();
        } else if (dragSrcEl.childElementCount === 2) {
            dragSrcEl.prepend(this.firstChild.cloneNode(true));
            this.firstChild.remove();
        } else {
            dragSrcEl.firstChild.outerHTML = this.firstChild.outerHTML;
            this.firstChild.outerHTML = svgOuterHTML;
        }
        const status = dragSrcEl.getAttribute("status");
        dragSrcEl.setAttribute("status", this.getAttribute("status"));
        this.setAttribute("status", status);
    }
    return false;
}
function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    } return false;
}
function handleDragEnter(e) {
    this.classList.add('over');
}
function handleDragLeave(e) {
    this.classList.remove('over');
}
// END: Listeners of mouse events.

/**
 * Set or change the rotation of a track piece.
 * @param setSvg - HTML-Elements: SVG-Graphic.
 */
function setRotation(setSvg){
    if(setSvg === null) return;
    const reg = /\d+/;
    setSvg.outerHTML = svg.getSvg(setSvg.getAttribute("tracktype"), parseInt(setSvg.id.match(reg)),
        util.getSetting().Lanes,
        util.getSetting().PaperWidth, util.getSetting().PaperHeight,
        parseInt(setSvg.getAttribute("rotation"))+1).outerHTML
}

/**
 *  Public interface
 **/
export default {
    makeTrackPiece: function (id) {
        return makeTrackPiece(id);
    }
}