/*
 *  BFH Hyper drive -- Track Editor
 *  Bachelor thesis (BTI3051) 22, Bern University of Applied Sciences
 *  Developer: Mac Müller
 *
 *  home.js: Homepage
 *
 */
import track from "./track.js";
import router from "../router.js";

/**
 * Generate a view for Homepage.
 * @param template - Object: template.
 * @returns {*} - Object: a generated view.
 */
function renderHome (template) {
    const editor = template.getElementById("editor");
    editor.append(track.getEditorBoard());

    const editorFunction = template.getElementById("editorFunction");
    editorFunction.append(createEditorTools());

    // Navigation's Toggle Switch.
    const setting = document.querySelector(".setting");
    setting.setAttribute("isClicked", "false");

    let navi = document.querySelector(".naviClick");
    navi.onclick = function (){
        if(navi.getAttribute("isChecked") === "true"){
            router.go("/home");
            navi.setAttribute("isChecked", "false");
        } else {
            router.go("/digital-twin");
            navi.setAttribute("isChecked", "true");
        }
    }

    setting.onclick = function (){
        if (setting.getAttribute("isClicked") === "false") {
            setting.querySelector("span").innerText = "CLOSE(X)";
            setting.setAttribute("isClicked", "true");
            router.go("/setting");
        } else {
            setting.querySelector("span").innerText = "Setting";
            setting.setAttribute("isClicked", "false");
            if (navi.getAttribute("isChecked") === "true") {
                router.go("/digital-twin");
            } else {
                router.go("/home");
            }
        }
    }

    return template;
}

/**
 * Create the editors tools. User uses this tool to generate a track-piece.
 * @returns {HTMLDivElement} - HTML-Elements: all tools.
 */
function createEditorTools(){
    const editorTools = document.createElement("div");
    editorTools.className = "editorTools";

    // 1 to 127 numbers are allowed as Track ID by Anki Overdrive.
    const MIN_ID = "1";
    const MAX_ID = "127";
    const trackTypes = {
        STRAIGHT:"STRAIGHT", CURVE:"CURVE", INTERSECTION:"INTERSECTION",
        JUNCTION:"JUNCTION", TO_THE_MIDDLE:"TO_THE_MIDDLE"
    }
    const tools = document.createElement("div");
    tools.className = "tool"

    const type = document.createElement("img");
    type.className = "selectedType"
    type.setAttribute("src", "src/pics/STRAIGHT.svg");
    type.setAttribute("alt", "selectedType pic");
    type.setAttribute("name", "STRAIGHT");
    type.setAttribute("draggable", "false");
    type.setAttribute("ondragstart", "return false;");

    const dropUpContent = document.createElement("div");
    dropUpContent.className = "dropUp-content"
    Object.values(trackTypes).forEach(type => dropUpContent.append(createTrackPieceOptionType(type)));

    const divForm = document.createElement("div");
    const form = document.createElement("form");
    const idLabel = document.createElement("label");
    const idInput = document.createElement("input");

    idLabel.setAttribute("for", "id");
    idLabel.innerText = "Track ID";
    idInput.id = "nextId";
    idInput.setAttribute("type", "number");
    idInput.setAttribute("name", "id");
    idInput.setAttribute("value", track.getMaxID()+1);
    idInput.setAttribute("min", MIN_ID);
    idInput.setAttribute("max", MAX_ID);
    const addButton = document.createElement("button");
    addButton.innerText = "+";
    addButton.addEventListener("click", function (){
        track.addTrackPiece(parseInt(idInput.value),
            document.getElementsByClassName("selectedType").item(0).getAttribute("name"));
    });
    form.append(idLabel, idInput);
    divForm.append(form, addButton);
    tools.append(type, dropUpContent, divForm);

    editorTools.append(tools);
    return editorTools;
}

/**
 * Helper function to create a track type options.
 * @param typeName - String: name of track type.
 * @returns {HTMLImageElement} - image with click listener.
 */
function createTrackPieceOptionType(typeName){
    const option = document.createElement("img");
    option.setAttribute("src", "src/pics/"+ typeName +".svg");
    option.setAttribute("alt", typeName + "pic");
    option.setAttribute("name", typeName);
    option.setAttribute("draggable", "false");
    option.setAttribute("ondragstart", "return false;");
    option.addEventListener("click", function (){
        const selected = document.getElementsByClassName("selectedType").item(0);
        selected.setAttribute("src", this.getAttribute("src"));
        selected.setAttribute("name", this.getAttribute("name"));
    });
    return option;
}

/**
 *  Public interface
 **/
export default {
    getTitle: function () {
        return "Track Editor";
    },
    render: function () {
        const template = document.querySelector("#tpl-home").cloneNode(true);
        return renderHome(template.content);
    }
}