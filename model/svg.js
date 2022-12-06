/*
 *  BFH Hyper drive -- Track Editor
 *  Bachelor thesis (BTI3051) 22, Bern University of Applied Sciences
 *  Developer: Mac Müller
 *
 *  svg.js: SVG Service
 *
 */

// Properties required for SVG.
const XLINK = "http://www.w3.org/1999/xlink";
const SVG_LINK = "http://www.w3.org/2000/svg";

// Track Drawing Properties.
const DP = {
    LANE: "LANE", BORDER: "BORDER", START_BOX: "START_BOX", TYPE1: "TYPE1", TYPE2: "TYPE2", TYPE3: "TYPE3",
    HORIZONTAL: "HORIZONTAL", VERTICAL: "VERTICAL",
    INTER_LANE: "INTER_LANE", DOUBLE_UPPER: "DOUBLE_UPPER",
    LANE_WIDTH: 1, TYPE1_WIDTH: 0.4, TYPE2_WIDTH: 1, TYPE3_WIDTH: 1.6, START_BOX_SIZE: 9, BORDER_WIDTH: 10,
    CODE_OFFSET: 5, DASH_LENGTH: 10, DASHES_PRO_PART: 16, // 7 Bit dashes + 1 ending dashes.
    TYPE1_DISTANCE: 1.6, TYPE2_DISTANCE: 1.6, TYPE3_DISTANCE: 1.9,
    LOCATION_ID: 0,
    BLACK: "black", WHITE: "white", JUNCTION_LEFT: -1, JUNCTION_RIGHT: 1
};
// ENUM: Track types.
const TRACK_TYPE = { STRAIGHT: "STRAIGHT", CURVE: "CURVE", TO_THE_MIDDLE: "TO_THE_MIDDLE", JUNCTION: "JUNCTION",
    INTERSECTION: "INTERSECTION"};
// Paper width and height.
let paper;
// Coordination to draw.
let moveTo;
let drawTo;
// Variables for design the path (dash array).
let trackWidth;                 // The width of track.
let dashArray;                  // Dash array property of a path.
let referenceLength;            // Length of a reference path.
let locationIdCounter;          // Counter of location ID.
let svg;                        // SVG.

/** Helper svg element for debugging.
 * SVG is rotated so that the coordination x = y = 0 is in the left corner of svg-picture.
 {
    const rect = document.createElementNS(SVG_LINK, "rect");
    rect.setAttribute("width", "100%")
    rect.setAttribute("height", "100%")
    rect.setAttribute("fill", "pink")
    svg.append(rect)
    const circle = document.createElementNS(SVG_LINK, "circle");
    circle.setAttribute("cx", "0")
    circle.setAttribute("cy", "0")
    circle.setAttribute("r", "2")
    circle.setAttribute("fill", "blue")
    svg.append(circle)
    svg.setAttribute("transform", "scale(1,-1)")
}
*/

/**
 * Create a svg track piece.
 * @param type - String: type of track piece.
 * @param trackId - Number: track id.
 * @param lanes - Number: quantity of lanes.
 * @param paperW - Number: width of paper.
 * @param paperH - Number: height of paper.
 * @param rotation - Number: rotation value of SVG (0..3).
 * @returns {SVGElement} - HTML-Elements:SVG with created track piece.
 */
function createSvg(type, trackId, lanes, paperW, paperH, rotation) {
    paper = {width: paperW, height: paperH};
    moveTo = {x: 0, y: 0};
    drawTo = {x: 0, y: 0};
    rotation = rotation? rotation: 0;
    dashArray = [];
    svg = document.createElementNS(SVG_LINK, "svg");
    svg.setAttribute("viewBox", "0 0 " + paper.width + " " + paper.height);
    svg.setAttribute("xmlns", SVG_LINK);
    svg.setAttribute("xmlns:xlink", XLINK);
    svg.setAttribute("width", "100%");
    svg.id = "trackId" + trackId.toString();
    svg.setAttribute("tracktype", type);
    trackWidth = lanes + (DP.START_BOX_SIZE * (lanes + 1)) + DP.BORDER_WIDTH*2;
    // reset.
    locationIdCounter = 0;
    let moveFunction;
    let addPath;
    let moveHeight = 1;
    let moveWidth = 1;

    switch (type) {
        case TRACK_TYPE.STRAIGHT:
            const STRAIGHT_MAX_ROTATION = 4;
            rotation = parseInt(rotation)%STRAIGHT_MAX_ROTATION;
            switch (rotation){
                case 0:
                    moveTo.y = (paper.height + trackWidth) / 2;
                    break;
                case 1:
                    moveTo.y = trackWidth;
                    break;
                case 2:
                    moveTo.y = paper.height;
                    break;
                case 3:
                    moveTo.y = (paper.width + trackWidth) / 2;
                    break;
                case 4:
                    moveTo.y = paper.width;
                    break;
                case 5:
                    moveTo.y = trackWidth;
                    break;
            }
            moveFunction = moveDistance => moveTo.y -= moveDistance;
            break;
        case TRACK_TYPE.CURVE:
            const CURVE_MAX_ROTATION = 4;
            rotation = rotation%CURVE_MAX_ROTATION;
            switch (rotation) {
                case 0:
                    moveTo.y = paper.height;
                    drawTo.x = (paper.width + trackWidth)/2;
                    break;
                case 1:
                    moveHeight = -1;
                    drawTo.x = (paper.width + trackWidth)/2;
                    drawTo.y = paper.height;
                    break;
                case 2:
                    moveHeight = -1;
                    moveWidth = -1;
                    moveTo.x = paper.width;
                    drawTo.x = (paper.width - trackWidth)/2;
                    drawTo.y = paper.height;
                    break;
                case 3:
                    moveWidth = -1;
                    moveTo.y = paper.height;
                    moveTo.x = paper.width;
                    drawTo.x = (paper.width - trackWidth)/2;
                    break;
            }
            moveFunction = (moveDistance) => {
                moveTo.y -= moveDistance * moveHeight;
                drawTo.x -= moveDistance * moveWidth;
            }
            break;
        case TRACK_TYPE.INTERSECTION:
            rotation = DP.HORIZONTAL;
            moveTo.y = (paper.height + trackWidth) / 2;

            moveFunction = (moveDistance) => {
                moveTo.y -= moveDistance;
            }
            addPath = createPath(type, rotation, trackId, moveFunction);

            svg.append(addPath(DP.BORDER, DP.BORDER_WIDTH, true));
            // Add border top.
            for (let lane = 1; lane < lanes*2+1; lane++) {
                // Start box.
                svg.append(addPath(DP.START_BOX, DP.START_BOX_SIZE, true));

                svg.append(addPath(DP.LANE, DP.LANE_WIDTH, true, lane));
                svg.append(addPath(DP.INTER_LANE, 0, false, lane));
                if (rotation === DP.HORIZONTAL) {
                    svg.append(addPath(DP.TYPE3, 0, false, lane));
                }
                // Type 1.
                svg.append(addPath(DP.TYPE1, DP.TYPE1_DISTANCE, false, lane));
                svg.append(addPath(DP.TYPE2, DP.TYPE1_DISTANCE, false, lane));

                // Intersection double upper code.
                svg.append(addPath(DP.TYPE1, DP.TYPE1_DISTANCE*2, false, lane, true));
                svg.append(addPath(DP.TYPE2, DP.TYPE1_DISTANCE*2, false, lane, true));

                svg.append(addPath(DP.TYPE1, DP.TYPE1_DISTANCE*-1, false));
                svg.append(addPath(DP.TYPE2, DP.TYPE1_DISTANCE*-1, false));

                svg.append(addPath(DP.TYPE1, DP.TYPE1_DISTANCE*-2, false, lane, true));
                svg.append(addPath(DP.TYPE2, DP.TYPE1_DISTANCE*-2, false, lane, true));

                if(lane === lanes){
                    svg.append(addPath(DP.START_BOX, DP.START_BOX_SIZE, true));
                    svg.append(addPath(DP.BORDER, DP.BORDER_WIDTH, true));

                    rotation = DP.VERTICAL;
                    addPath = createPath(type, rotation, trackId, moveFunction);
                     moveTo.y = (paper.width + trackWidth) / 2;
                     moveTo.x = paper.height;
                    svg.append(addPath(DP.BORDER, DP.BORDER_WIDTH, true));
                }
            }
            svg.append(addPath(DP.START_BOX, DP.START_BOX_SIZE, true));
            svg.append(addPath(DP.BORDER, DP.BORDER_WIDTH, true));
            rotation = 0;
            break;
        case TRACK_TYPE.JUNCTION:
            moveHeight = 1;
            moveWidth = 1;
            const JUNCTION_MAX_ROTATION = 4;
            rotation = rotation%JUNCTION_MAX_ROTATION;
            const halfTrackWidth = DP.BORDER_WIDTH + DP.START_BOX_SIZE*(Math.floor(lanes/2)) + (DP.LANE_WIDTH*Math.floor((lanes+1)/2));
            switch (rotation) {
                case 0:
                    moveTo.y = paper.height - halfTrackWidth;
                    drawTo.x = (paper.width + DP.START_BOX_SIZE)/2;
                    break;
                case 1:
                    moveHeight = -1;
                    moveTo.y = paper.height;
                    moveTo.x = (paper.width + DP.START_BOX_SIZE)/2;
                    drawTo.y = (paper.height - DP.START_BOX_SIZE)/2;
                    break;
                case 2:
                    moveHeight = -1;
                    moveTo.y = halfTrackWidth;
                    drawTo.x = (paper.width + DP.START_BOX_SIZE)/2;
                    drawTo.y = paper.height;
                    break;
                case 3:
                    moveHeight = -1;
                    moveWidth = -1;
                    moveTo.y = paper.height;
                    moveTo.x = (paper.width - DP.START_BOX_SIZE)/2;
                    drawTo.y = (paper.height - DP.START_BOX_SIZE)/2;
                    drawTo.x = paper.width;
                    break;
            }
            switch (rotation%2){
                case 0:
                    moveFunction = (moveDistance) => {
                        moveTo.y -= moveDistance * moveHeight;
                        drawTo.x -= moveDistance * moveWidth;
                    }
                    break;
                case 1:
                    moveFunction = (moveDistance) => {
                        moveTo.x -= moveDistance * moveWidth;
                        drawTo.y -= moveDistance * moveHeight;
                    }
                    break;
            }

            addPath = createPath(type, rotation, trackId, moveFunction);
            let addPathWithLocationID = createPath(type, rotation, DP.LOCATION_ID, moveFunction);

            svg.append(addPath(DP.START_BOX, DP.START_BOX_SIZE, true));
            for (let lane = 1; lane < lanes+1; lane++) {
                // Lane.
                svg.append(addPath(DP.LANE, DP.LANE_WIDTH, true, lane));

                // Draw overall with type 1 upper of the lane.
                // !this path will be referenced to create other lines.
                svg.append(addPath(DP.TYPE1, DP.TYPE1_DISTANCE, false, lane, true));

                // Track ID with type 2 (upper).
                svg.append(addPath(DP.TYPE2, DP.TYPE2_DISTANCE, false, lane));

                // Draw overall with type 1 under of the lane.
                svg.append(addPath(DP.TYPE1, DP.TYPE1_DISTANCE*-1, false, lane));

                // Location ID with type 2.
                svg.append(addPathWithLocationID(DP.TYPE2, DP.TYPE2_DISTANCE*-1, false, lane));

                // Draw type 3 under of the lane.
                svg.append(addPath(DP.TYPE3, DP.TYPE3_DISTANCE*-1, false, lane));

                // Start box.
                svg.append(addPath(DP.START_BOX, DP.START_BOX_SIZE, true, lane));
                    if (lane === Math.ceil(lanes/2)) {
                        svg.append(addPath(DP.BORDER, DP.BORDER_WIDTH, true));

                        switch (rotation){
                            case 0:
                                moveTo.y = paper.height - halfTrackWidth;
                                moveTo.x = paper.width;
                                drawTo.x = (paper.width - DP.START_BOX_SIZE)/2;
                                moveWidth = -1;
                                break;
                            case 1:
                                moveTo.y = 0;
                                moveTo.x = (paper.width + DP.START_BOX_SIZE)/2;
                                drawTo.y = (paper.height + DP.START_BOX_SIZE)/2;
                                moveHeight = 1;
                                break;
                            case 2:
                                moveTo.x = paper.width;
                                moveTo.y = halfTrackWidth;
                                drawTo.x = (paper.width - DP.START_BOX_SIZE)/2;
                                moveWidth = -1;
                                break;
                            case 3:
                                moveTo.y = 0;
                                moveTo.x = (paper.width - DP.START_BOX_SIZE)/2;
                                drawTo.y = (paper.height + DP.START_BOX_SIZE)/2;
                                moveWidth = -1;
                                moveHeight = 1;
                                break;
                        }
                        svg.append(addPath(DP.START_BOX, DP.START_BOX_SIZE, true));
                    }
            }
            svg.append(addPath(DP.BORDER, DP.BORDER_WIDTH, true));
            let verticalFlag = 3;
            switch (rotation){
                case 0:
                    moveTo.y = paper.height;
                    moveFunction = moveDistance => moveTo.y -= moveDistance;
                    break;
                case 1:
                    moveTo.y = (paper.width+DP.START_BOX_SIZE)/2 + halfTrackWidth;
                    moveFunction = moveDistance => moveTo.y -= moveDistance;
                    break;
                case 2:
                    moveHeight = -1;
                    moveTo.y = 0;
                    moveFunction = moveDistance => moveTo.y += moveDistance;
                    break;
                case 3:
                    verticalFlag++;
                    moveTo.y = (paper.width-DP.START_BOX_SIZE)/2 - halfTrackWidth;
                    moveFunction = moveDistance => moveTo.y += moveDistance;
                    break;
            }
            moveTo.x = 0;
            switch (rotation%2){
                case 0:
                    addPath = createPath(TRACK_TYPE.STRAIGHT, moveHeight, trackId, moveFunction);
                    addPathWithLocationID = createPath(TRACK_TYPE.STRAIGHT, moveHeight, DP.LOCATION_ID, moveFunction);
                    break;
                case 1:
                    addPath = createPath(TRACK_TYPE.STRAIGHT, verticalFlag, trackId, moveFunction);
                    addPathWithLocationID = createPath(TRACK_TYPE.STRAIGHT, verticalFlag, DP.LOCATION_ID, moveFunction);
                    break;
            }

            svg.append(addPath(DP.BORDER, DP.BORDER_WIDTH, true));
            for (let lane = lanes+1 ; lane < lanes + (lanes/2) +1; lane++) {
                // Start box.
                svg.append(addPath(DP.START_BOX, DP.START_BOX_SIZE, true, lane));
                // Lane.
                svg.append(addPath(DP.LANE, DP.LANE_WIDTH, true, lane));

                // Draw overall with type 1 upper of the lane.
                // !this path will be referenced to create other lines.
                svg.append(addPath(DP.TYPE1, DP.TYPE1_DISTANCE, false, lane, true));

                // Track ID with type 2.
                svg.append(addPath(DP.TYPE2, DP.TYPE2_DISTANCE, false, lane));

                // Draw overall with type 1 under of the lane.
                svg.append(addPath(DP.TYPE1, DP.TYPE1_DISTANCE *-1, false, lane));

                // Location ID with type 2.
                svg.append(addPathWithLocationID(DP.TYPE2, DP.TYPE2_DISTANCE *-1, false, lane));

                // Draw type 3 under of the lane.
                svg.append(addPath(DP.TYPE3, DP.TYPE3_DISTANCE*-1, false, lane));
            }
            break;
        case TRACK_TYPE.TO_THE_MIDDLE:
            const MIDDLE_MAX_ROTATION = 4;
            rotation = rotation%MIDDLE_MAX_ROTATION;
            switch (rotation) {
                case 0:
                    moveTo.y = paper.height;
                    drawTo.y = (paper.height +trackWidth) / 2;
                    drawTo.x = paper.width;
                    break
                case 1:
                    moveTo.y = trackWidth;
                    drawTo.y = (paper.height +trackWidth) / 2;
                    drawTo.x = paper.width;
                    break;
                case 2:
                    moveTo.y = (paper.height +trackWidth) / 2;
                    drawTo.x = paper.width;
                    drawTo.y = paper.height;
                    break;
                case 3:
                    moveTo.y = (paper.height +trackWidth) / 2;
                    drawTo.x = paper.width;
                    drawTo.y = trackWidth;
                    break;
            }
            moveFunction = (moveDistance) => {
                moveTo.y -= moveDistance;
                drawTo.y -= moveDistance;
            }

        break;
    }
    if (type === TRACK_TYPE.STRAIGHT || type === TRACK_TYPE.CURVE || type === TRACK_TYPE.TO_THE_MIDDLE){
        addPath = createPath(type, rotation, trackId, moveFunction);
        const addPathWithLocationID = createPath(type, rotation, DP.LOCATION_ID, moveFunction);
        // Add border top.
        svg.append(addPath(DP.BORDER, DP.BORDER_WIDTH, true));
        for (let lane = 1; lane < lanes+1; lane++) {

            // Start box.
            svg.append(addPath(DP.START_BOX, DP.START_BOX_SIZE, true, lane));

            // Lane.
            svg.append(addPath(DP.LANE, DP.LANE_WIDTH, true, lane));

            // Draw overall with type 1 upper of the lane.
            // !this path will be referenced to create other lines.
            svg.append(addPath(DP.TYPE1, DP.TYPE1_DISTANCE, false, lane, true));

            // Track ID with type 2 (upper).
            svg.append(addPath(DP.TYPE2, DP.TYPE2_DISTANCE, false, lane, true));

            // Draw overall with type 1 under of the lane.
            svg.append(addPath(DP.TYPE1, DP.TYPE1_DISTANCE*-1, false, lane));

            // Location ID with type 2.
            svg.append(addPathWithLocationID(DP.TYPE2, DP.TYPE2_DISTANCE*-1, false, lane));

            // Draw type 3 under of the lane.
            svg.append(addPath(DP.TYPE3, DP.TYPE3_DISTANCE*-1, false, lane));
        }
        // Add Start box and border bottom to the end.
        svg.append(addPath(DP.START_BOX, DP.START_BOX_SIZE, true));
        svg.append(addPath(DP.BORDER, DP.BORDER_WIDTH, true));
    }
    svg.setAttribute("rotation", rotation);
    return svg;
}

/**
 * Create a path for SVG.
 * @param trackType - String: Type of track piece.
 * @param rotation - Number: Value of defined rotation-type.
 * @param trackId - Number: Track ID, only block type 2 needed.
 * @param moveFunction - Function: a function to define path-attribute of next path.
 * @returns {function(*, *, *, *, *): SVGPathElement} - HTML-Elements: SVG path.
 */
function createPath(trackType, rotation, trackId, moveFunction) {
    /**
     * @param pathType - String: Type of path.
     * @param lane - String: Lane number and the position to draw the code.
     * @param markedAsReference - Boolean: The fist of Type1, will be referenced to create other dash arrays.
     */
    return function (pathType, moveDistance, move, lane, markedAsReference){
        if(move){
            moveFunction(moveDistance/2);
        } else {
            moveFunction(DP.LANE_WIDTH/2*-1 - moveDistance);
        }
        let path = document.createElementNS(SVG_LINK, "path");
        path.setAttribute("stroke", DP.BLACK);
        path.setAttribute("fill", "none");
        let binaryCodeFlip = 0;
        const ADJUST_ANGLE = 5;

        switch (trackType){
            case TRACK_TYPE.STRAIGHT:
                if(rotation >= 3){
                    path.setAttribute("d", "M" + moveTo.y + " " + paper.height + " V 0");
                    if(rotation > 3 ) binaryCodeFlip = 1;
                } else {
                    path.setAttribute("d", "M" + moveTo.x + " " + moveTo.y + " H " + paper.width);
                }
                if(rotation < 0) binaryCodeFlip = 1;
                break;
            case TRACK_TYPE.CURVE:
                binaryCodeFlip = rotation%2;
                path.setAttribute("d", "M" + moveTo.x + " " + moveTo.y + " " +
                    "A " + (drawTo.x-moveTo.x-ADJUST_ANGLE) + " " + (moveTo.y-drawTo.y-ADJUST_ANGLE) +
                    " 0 0 "+binaryCodeFlip+" " + drawTo.x + " " + drawTo.y);
                break;
            case TRACK_TYPE.TO_THE_MIDDLE:
                let shift = 0;
                if(markedAsReference === true){
                    switch (rotation){
                        case 1:
                        case 2:
                            shift = -1;
                            break;
                        default:
                            shift = 1;
                    }
                }
                path.setAttribute("d", "M" + (moveTo.x + shift) + " " + moveTo.y + " " +
                    "Q " + (paper.width/4) + " " +  (moveTo.y) + " " + (drawTo.x/2) + " " + (moveTo.y-((moveTo.y-drawTo.y)/2)).toFixed(1)
                    + " T " + drawTo.x + " "+ drawTo.y
                );
                break;
            case TRACK_TYPE.INTERSECTION:
                switch (rotation) {
                    case DP.HORIZONTAL:
                        path.setAttribute("d", "M" + moveTo.x + " " + moveTo.y + " H " + paper.width);
                        break;
                    case DP.VERTICAL:
                        path.setAttribute("d", "M" + moveTo.y + " " + moveTo.x + " V 0");
                        break;
                }
                break;
            case TRACK_TYPE.JUNCTION:
                switch (rotation){
                    case 0:
                        if(moveTo.x === 0){
                            path.setAttribute("d", "M" + moveTo.x + " " + moveTo.y + " " +
                                "A " + (drawTo.x-moveTo.x-5) + " " + (moveTo.y-drawTo.y-5) +
                                " 0 0 0 " + drawTo.x + " " + drawTo.y);
                        } else {
                            binaryCodeFlip = 1;
                            path.setAttribute("d", "M" + moveTo.x + " " + moveTo.y + " " +
                                "A " + (drawTo.x-moveTo.x+5) + " " + (moveTo.y-drawTo.y-5) +
                                " 0 0 1 " + drawTo.x + " " + drawTo.y);
                        }
                        break;
                    case 1:
                        if(moveTo.y === 0){
                            binaryCodeFlip = 1;
                            path.setAttribute("d", "M" + moveTo.x + " " + moveTo.y + " " +
                                "A " + (drawTo.x-moveTo.x+ADJUST_ANGLE) + " " + (moveTo.y-drawTo.y+ADJUST_ANGLE) +
                                " 0 0 1 " + drawTo.x + " " + drawTo.y);
                        } else {
                            path.setAttribute("d", "M" + moveTo.x + " " + moveTo.y + " " +
                                "A " + (drawTo.x-moveTo.x+ADJUST_ANGLE) + " " + (moveTo.y-drawTo.y-ADJUST_ANGLE) +
                                " 0 0 0 " + drawTo.x + " " + drawTo.y);
                        }
                        break;
                    case 2:
                        if(moveTo.x === 0){
                            binaryCodeFlip = 1;
                            path.setAttribute("d", "M" + moveTo.x + " " + moveTo.y + " " +
                                "A " + (drawTo.x-moveTo.x-ADJUST_ANGLE) + " " + (moveTo.y-drawTo.y+ADJUST_ANGLE) +
                                " 0 0 1 " + drawTo.x + " " + drawTo.y);
                        } else {
                            path.setAttribute("d", "M" + moveTo.x + " " + moveTo.y + " " +
                                "A " + (drawTo.x-moveTo.x+ADJUST_ANGLE) + " " + (moveTo.y-drawTo.y+ADJUST_ANGLE) +
                                " 0 0 0 " + drawTo.x + " " + drawTo.y);
                        }
                        break;
                    case 3:
                        if(moveTo.y === 0){
                            path.setAttribute("d", "M" + moveTo.x + " " + moveTo.y + " " +
                                "A " + (drawTo.x-moveTo.x-ADJUST_ANGLE) + " " + (moveTo.y-drawTo.y+ADJUST_ANGLE) +
                                " 0 0 0 " + drawTo.x + " " + drawTo.y);
                        } else {
                            binaryCodeFlip = 1;
                            path.setAttribute("d", "M" + moveTo.x + " " + moveTo.y + " " +
                                "A " + (drawTo.x-moveTo.x-ADJUST_ANGLE) + " " + (moveTo.y-drawTo.y-ADJUST_ANGLE) +
                                " 0 0 1 " + drawTo.x + " " + drawTo.y);
                        }
                        break;
                }
                break;
        }
        switch (pathType) {
            case DP.BORDER:
                path.setAttribute("stroke-width", DP.BORDER_WIDTH);
                break;
            case DP.START_BOX:
                path.setAttribute("stroke-width", DP.START_BOX_SIZE);
                break;
            case DP.LANE:
                path.setAttribute("stroke-width", DP.LANE_WIDTH);
                path.setAttribute("id", "trackId"+trackId+"Lane"+lane);
                break;
            case DP.INTER_LANE:
            case DP.TYPE1:
                path.setAttribute("stroke-width", DP.TYPE1_WIDTH);
                break;
            case DP.TYPE2:
                path.setAttribute("stroke-width", DP.TYPE2_WIDTH);
                break;
            case DP.TYPE3:
                path.setAttribute("stroke-width", DP.TYPE3_WIDTH);
                break;
        }
        if(trackType === TRACK_TYPE.INTERSECTION){
            path.setAttribute("stroke-dasharray", createDashArrayCodeIntersection(path, pathType ,rotation, markedAsReference, lane));
        } else {
            path.setAttribute("stroke-dasharray", createDashArrayCode(path, pathType, lane, trackId, markedAsReference, binaryCodeFlip));
        }

        if(move){
            moveFunction(moveDistance/2);
        } else {
            moveFunction(DP.LANE_WIDTH/2 - (moveDistance*-1));
        }
        return path;
    }
}

/** IMPORTANCE: Upper Path or longer path from type1 must be drawn first.
 * (It will be used as a reference to draw the under path).
 * This function create stroke-dasharray for each type of path.
 *
 * @param path - SVGPathElement: path, which needs to set stroke-dasharray attribute.
 * @param type - String: Type of code.
 * @param laneNumber - Number: lane number.
 * @param trackID - Number: track id.
 * @param isReferenced - Boolean: if this path will be used as a reference to calculate other paths.
 * @param flip - Boolean: if the binary of track id or location id need to be reverted.
 * @returns {string} - value of stroke-dasharray for the path.
 */
function createDashArrayCode(path, type, laneNumber, trackID, isReferenced, flip){
    let pathLength = path.getTotalLength() - DP.START_BOX_SIZE*2 - DP.CODE_OFFSET;
    // Reserve 4 dashes: (2 dashes for beginning with Type 3).
    pathLength -= 2 * DP.DASH_LENGTH;
    // First and last of 2 dashes, need special treat.
    const FIRST_DASH = 2;
    // Calculator for dash type2 and type3.
    let dashCalculator = 0;
    // The index of leftover from partitions.
    const LEFTOVER_PART = Math.floor((dashArray.length-FIRST_DASH) /DP.DASHES_PRO_PART) * DP.DASHES_PRO_PART + 1;

    // Start dash array with blank.
    let dashArrayString = "0";
    switch (type){
        case DP.START_BOX:
            dashArrayString = DP.START_BOX_SIZE +", " + (path.getTotalLength()-DP.START_BOX_SIZE*2);
            break;
        case DP.LANE:
            dashArrayString = "0, "+ DP.START_BOX_SIZE +", " + (path.getTotalLength()-DP.START_BOX_SIZE*2)
                + ", " + DP.START_BOX_SIZE;
            break;
        case DP.TYPE1:
            // Upper path must be a referenced path.
            let partition = Math.floor(pathLength/(DP.DASH_LENGTH*DP.DASHES_PRO_PART));
            let restOfPartition = pathLength % (DP.DASH_LENGTH*DP.DASHES_PRO_PART) + DP.CODE_OFFSET; // do not change!!
            if (!partition) {
                console.log("path is too short to write a code");
                return "";
            }
            if (isReferenced) {
                dashArray = [];
                referenceLength = pathLength;

                dashArray.push(DP.START_BOX_SIZE + DP.CODE_OFFSET);
                for (let i = 0; i < partition * DP.DASHES_PRO_PART; i++) {
                    dashArray.push(DP.DASH_LENGTH);
                }
                dashArray.push(DP.DASH_LENGTH);

                while (restOfPartition >= DP.DASH_LENGTH*2){
                    dashArray.push(DP.DASH_LENGTH);
                    dashArray.push(DP.DASH_LENGTH);
                    restOfPartition -= DP.DASH_LENGTH*2;
                }
                restOfPartition /= 2;
                dashArray[0] += restOfPartition;
                dashArray.push(DP.START_BOX_SIZE + DP.CODE_OFFSET + restOfPartition);

            } else if (referenceLength > pathLength) {
                let difference = (pathLength)*100/(referenceLength)/100;
                dashArray.forEach(((value, index) => {
                        if(index%2 === 0) {
                            dashArray[index] *= difference;
                        }
                        if(index%2 === 1) {
                            dashArray[index] *= difference;
                }}));
                referenceLength = pathLength;
            }
            dashArray.forEach(dash => { dashArrayString += ", " + dash});
            break;
        case DP.TYPE2:
            let trackIDString = toBinary(trackID);
            if (flip === 1) trackIDString = trackIDString.split("").reverse().join("");

            dashArray.forEach((value, index) => {
                let shiftIndexModPartition = (index+(DP.DASHES_PRO_PART-FIRST_DASH)) % DP.DASHES_PRO_PART;
                if(index < FIRST_DASH || index > LEFTOVER_PART){
                    dashCalculator += value;
                } else {
                    if (shiftIndexModPartition === 0 && trackID === DP.LOCATION_ID) {
                        trackIDString = toBinary(++locationIdCounter);
                        const lane = svg.querySelector("[id$='Lane"+ laneNumber+"']");
                        lane.setAttribute("locationId",
                            (lane.getAttribute("locationId") === null)?
                                locationIdCounter:
                                lane.getAttribute("locationId")+","+locationIdCounter);
                        if (flip === 1) trackIDString = trackIDString.split("").reverse().join("");
                    }
                    if (shiftIndexModPartition%2 === 1 &&
                        shiftIndexModPartition < trackIDString.length*2 &&
                        trackIDString.charAt(Math.floor(shiftIndexModPartition/2)) === "1"){
                        if (dashCalculator > 0){
                            dashArrayString += ", " + dashCalculator;
                            dashCalculator = 0;
                        }
                        dashArrayString += ", " + value;
                    } else {
                        dashCalculator += value;
                    }
                }
            });
            dashArrayString += ", " + dashCalculator;
            dashCalculator = 0;
            break;

        case DP.TYPE3:
            if (referenceLength > pathLength) {
                let restOfPartition = pathLength % (DP.DASH_LENGTH*DP.DASHES_PRO_PART);
                let difference = referenceLength-pathLength;
                difference /= ((dashArray.length-2) + Math.ceil(restOfPartition/DP.DASH_LENGTH));
                dashArray.forEach(((value, index) => {
                    if(index === 0){
                        dashArray[index] -= difference * Math.ceil(restOfPartition/DP.DASH_LENGTH);
                    } else if (index === dashArray.length-1){
                        dashArray[index] -= difference * Math.ceil(restOfPartition/DP.DASH_LENGTH);
                    } else if (index >= 0){
                        if(index%2 === 0) {
                            dashArray[index] -= difference;
                        }
                        if(index%2 === 1) {
                            dashArray[index] -= difference;
                        }
                    }
                }));
            }
            dashArray.forEach((value, index) => {
                if(index < FIRST_DASH || index > LEFTOVER_PART){
                    dashArrayString += ", " + value;
                } else {
                    switch ((index+(DP.DASHES_PRO_PART-FIRST_DASH+1)) % DP.DASHES_PRO_PART){
                        case 0:
                            if (dashCalculator > 0){
                                dashArrayString += ", " + dashCalculator;
                                dashCalculator = 0;
                            }
                            dashArrayString += ", " + value;
                            break;
                        default:
                            dashCalculator += value;
                            break;
                    }
                }
            });
            break;
    }
    return dashArrayString;
}

/**
 * Intersection Track Piece (Crossing) needs a special design.
 * This function create stroke-dasharray for each type of path.
 * @param path - SVGPathElement: path, which needs to set stroke-dasharray attribute.
 * @param type - String: Type of code.
 * @param orientation - String: orientation HORIZONTAL or VERTICAL.
 * @param doubleUpper - Boolean: double upper path need a special treat.
 * @param lane - Number: number of lane.
 * @returns {string} - value of stroke-dasharray for the path.
 */
function createDashArrayCodeIntersection (path, type ,orientation, doubleUpper, lane) {
    let pathLength = path.getTotalLength();
    const beginPartitionLength = DP.DASH_LENGTH * 8;
    const endPartitionLength = DP.DASH_LENGTH * 3;

    const centerDashLength = pathLength
        - ((beginPartitionLength+endPartitionLength+DP.DASH_LENGTH*2)
        + (DP.CODE_OFFSET + DP.START_BOX_SIZE)) *2;

    let dashArrayString = "0";
    switch (type){
        case DP.BORDER:
            dashArrayString = ((pathLength-trackWidth)/2+DP.BORDER_WIDTH)
                + ", " + (trackWidth-DP.BORDER_WIDTH*2) + ", " + ((pathLength-trackWidth)/2+DP.BORDER_WIDTH);
            break;
        case DP.START_BOX:
            dashArrayString = DP.START_BOX_SIZE + ", " + (pathLength-DP.START_BOX_SIZE*2) + ", " + DP.START_BOX_SIZE;
            break;
        case DP.INTER_LANE:
            dashArrayString += ", " + DP.START_BOX_SIZE + ", "
                + (pathLength-DP.START_BOX_SIZE*2) + ", " + DP.START_BOX_SIZE;
            break;
        case DP.LANE:
            switch (orientation){
                case DP.HORIZONTAL:
                    dashArrayString += ", " + DP.START_BOX_SIZE;
                    dashArrayString += ", " + (DP.CODE_OFFSET + beginPartitionLength);
                    dashArrayString += ", " + DP.DASH_LENGTH;
                    dashArrayString += ", " + endPartitionLength;
                    dashArrayString += ", " + DP.DASH_LENGTH;
                    dashArrayString += ", " + centerDashLength;
                    dashArrayString += ", " + DP.DASH_LENGTH;
                    dashArrayString += ", " + endPartitionLength;
                    dashArrayString += ", " + DP.DASH_LENGTH;
                    dashArrayString += ", " + (DP.CODE_OFFSET + beginPartitionLength);
                    dashArrayString += ", " + (DP.START_BOX_SIZE);
                    break;
                case DP.VERTICAL:
                    dashArrayString += ", " + DP.START_BOX_SIZE;
                    dashArrayString += ", " + DP.CODE_OFFSET;
                    dashArrayString += ", " + DP.DASH_LENGTH;
                    dashArrayString += ", " + DP.DASH_LENGTH;
                    dashArrayString += ", " + DP.DASH_LENGTH;
                    dashArrayString += ", " + DP.DASH_LENGTH;
                    dashArrayString += ", " + DP.DASH_LENGTH;
                    dashArrayString += ", " + DP.DASH_LENGTH;
                    dashArrayString += ", " + (centerDashLength + (beginPartitionLength*2) - (DP.DASH_LENGTH*2));
                    dashArrayString += ", " + DP.DASH_LENGTH;
                    dashArrayString += ", " + DP.DASH_LENGTH;
                    dashArrayString += ", " + DP.DASH_LENGTH;
                    dashArrayString += ", " + DP.DASH_LENGTH;
                    dashArrayString += ", " + DP.DASH_LENGTH;
                    dashArrayString += ", " + DP.DASH_LENGTH;
                    dashArrayString += ", " + DP.CODE_OFFSET;
                    dashArrayString += ", " + DP.START_BOX_SIZE;
                    break;
            }
            path.setAttribute("locationid", lane);
            break;
        case DP.TYPE1:
            switch (orientation){
                case DP.HORIZONTAL:
                    let dashCounter = pathLength - centerDashLength;
                    if (doubleUpper === DP.DOUBLE_UPPER) {
                        dashArrayString += ", " + (DP.CODE_OFFSET + DP.START_BOX_SIZE + beginPartitionLength);
                        for (let i = 0; i < 5 ; i++) {
                            dashArrayString += ", " + DP.DASH_LENGTH;
                        }
                        dashArrayString += ", " + (centerDashLength);
                        for (let i = 0; i < 6 ; i++) {
                            dashArrayString += ", " + DP.DASH_LENGTH;
                        }
                        dashArrayString += (DP.CODE_OFFSET + DP.START_BOX_SIZE + beginPartitionLength);
                    } else {
                        dashArrayString += ", " + (DP.CODE_OFFSET + DP.START_BOX_SIZE);
                        for (let i = 0; i < Math.floor(dashCounter/DP.DASH_LENGTH)-1; i++) {
                            if (i === (Math.floor(Math.floor(dashCounter/DP.DASH_LENGTH)/2))-1) {
                                dashArrayString += ", " + (centerDashLength);
                            }
                            dashArrayString += ", " + DP.DASH_LENGTH;
                        }
                        dashArrayString += ", " + (DP.CODE_OFFSET + DP.START_BOX_SIZE);
                    }
                    break;
                case DP.VERTICAL:
                    dashArrayString += ", " + (DP.START_BOX_SIZE + DP.CODE_OFFSET);
                    dashArrayString += ", " + DP.DASH_LENGTH;
                    dashArrayString += ", " + DP.DASH_LENGTH;
                    dashArrayString += ", " + DP.DASH_LENGTH;
                    dashArrayString += ", " + DP.DASH_LENGTH;
                    dashArrayString += ", " + DP.DASH_LENGTH;
                    dashArrayString += ", " + DP.DASH_LENGTH;
                    dashArrayString += ", " + DP.DASH_LENGTH;
                    dashArrayString += ", " + (centerDashLength + beginPartitionLength*2 - DP.DASH_LENGTH*4);
                    dashArrayString += ", " + DP.DASH_LENGTH;
                    dashArrayString += ", " + DP.DASH_LENGTH;
                    dashArrayString += ", " + DP.DASH_LENGTH;
                    dashArrayString += ", " + DP.DASH_LENGTH;
                    dashArrayString += ", " + DP.DASH_LENGTH;
                    dashArrayString += ", " + DP.DASH_LENGTH;
                    dashArrayString += ", " + DP.DASH_LENGTH;
                    dashArrayString += ", " + (DP.START_BOX_SIZE + DP.CODE_OFFSET);
                    break;
            }
            break;
        case DP.TYPE2:
            switch (orientation){
                case DP.HORIZONTAL:
                    dashArrayString += ", " + (
                        ((DP.CODE_OFFSET + DP.START_BOX_SIZE)) + (DP.DASH_LENGTH*12) + centerDashLength +
                            endPartitionLength
                    );
                    dashArrayString += ", " + DP.DASH_LENGTH;
                    dashArrayString += ", " + (DP.CODE_OFFSET + DP.START_BOX_SIZE) + beginPartitionLength;
                    break;
                case DP.VERTICAL:
                    dashArrayString += ", " + (DP.START_BOX_SIZE + DP.CODE_OFFSET +(DP.DASH_LENGTH*4));
                    dashArrayString += ", " + DP.DASH_LENGTH;
                    dashArrayString += ", " + (centerDashLength + (beginPartitionLength*2) + (DP.DASH_LENGTH*5)
                    + DP.START_BOX_SIZE + DP.CODE_OFFSET);
                    break;
            }
            break;
        case DP.TYPE3:
            dashArrayString += ", " + (((DP.CODE_OFFSET + DP.START_BOX_SIZE)) + (DP.DASH_LENGTH * 10));
            dashArrayString += ", " + DP.DASH_LENGTH;
            dashArrayString += ", " + DP.DASH_LENGTH * 2;
            dashArrayString += ", " + centerDashLength;
            dashArrayString += ", " + DP.DASH_LENGTH * 2;
            dashArrayString += ", " + DP.DASH_LENGTH;
            dashArrayString += ", " + (((DP.CODE_OFFSET + DP.START_BOX_SIZE)) + (DP.DASH_LENGTH * 10));
            break;
    }
    return dashArrayString;
}

/**
 * Convert an integer number to binary.
 * @param int - Number: Track ID or Track Location ID.
 * @returns {string} - String: strings of 7-digit binary code.
 */
function toBinary(int) {
    const BINARY_BASE = 2;
    const str = int.toString(BINARY_BASE);
    return str.padStart(7, "0");
}

/**
 * Draw a car on digital-twins board.
 * @param carInfo - Object: information of the car.
 * @param scale - String: setting for transformation of animation.
 * @param revert - Boolean: set the car driving backward.
 */
function drawDigitalTwinCar(carInfo, scale, revert){

    const trackPieceSVG = document.getElementById(carInfo.tracePieceID);
    const car = document.createElementNS(SVG_LINK, "image");
    car.setAttribute("href", "src/pics/bfh_car.svg");
    car.setAttribute("width", "100");
    car.setAttribute("height", "100");
    car.setAttribute("id", carInfo.name);
    if (scale){
        car.setAttribute("transform", scale+" translate(-50, -50)");
    } else {
        car.setAttribute("transform", "scale(-1,1) translate(-50, -50)");
    }
    const animation = document.createElementNS(SVG_LINK, "animateMotion");
    animation.setAttribute("path", carInfo.animation.path);
    animation.setAttribute("rotate", "auto");
    animation.setAttribute("fill", "freeze");
    animation.setAttribute("dur", (carInfo.animation.duration) + "ms");
    animation.onend = () => { car.remove() }

    if(revert === true) {
        animation.setAttribute("keyPoints", "1;0");
        animation.setAttribute("keyTimes", "0;1");
    }

    const oldCar = document.getElementById(carInfo.name);
    if (oldCar !== null){
        document.querySelector("#"+carInfo.name).remove();
    }

    car.append(animation);
    trackPieceSVG.append(car);
    animation.setAttribute("begin", trackPieceSVG.getCurrentTime()+"s");
}

/**
 * Crate a track from all track pieces.
 * @param board - Object: all track pieces from the Editor.
 * @param grid - Object: Grid properties of board.
 * @returns {SVGSVGElement} - SVG: track.
 */
function createTrackSVG(board, grid){
    const svg = document.createElementNS(SVG_LINK, "svg");
    if(!paper.width || !paper.height) return svg;
    svg.setAttribute("viewBox", "0 0 " + (paper.width*grid.column) + " " + (paper.height*grid.row));
    svg.setAttribute("xmlns", SVG_LINK);
    svg.setAttribute("xmlns:xlink", XLINK);
    svg.setAttribute("width", "100%");
    let node = 0;
    for (let row = 0; row < grid.row; row++){
        for (let column = 0; column < grid.column; column++) {
            if (board.childNodes[node].getAttribute("status") === "occupied"){
                const childSVG = board.childNodes[node].firstChild.cloneNode(true);
                childSVG.setAttribute("width", paper.width);
                childSVG.setAttribute("height", paper.height);
                childSVG.setAttribute("x", column*paper.width);
                childSVG.setAttribute("y", row*paper.height);
                childSVG.setAttribute("boardPosition", node);
                if (childSVG.getAttribute("transform")){
                    switch (childSVG.getAttribute("transform")){
                        case "scale(1 -1)":
                            childSVG.setAttribute("transform", childSVG.getAttribute("transform")
                            + " " + "translate(0 -" + ((row*paper.height*2)+paper.height)+")");
                            break;
                        case "scale(-1 1)":
                            childSVG.setAttribute("transform", childSVG.getAttribute("transform")
                                + " " + "translate(-" + ((column*paper.width*2)+paper.width) + " 0)");
                            break;
                        case "scale(-1 -1)":
                            childSVG.setAttribute("transform", childSVG.getAttribute("transform")
                                + " " + "translate(-"
                                + ((column*paper.width*2)+paper.width) +
                                " -"
                                + ((row*paper.height*2)+paper.height)+")");
                            break;
                    }
                }
                svg.append(childSVG);
            }
            node++;
        }
    }
    return svg;
}

/**
 *  Public interface
 **/
export default {
    getSvg: function (type, trackId, lanes, paperW, paperH, rotation) {
        return createSvg(type, trackId, lanes, paperW, paperH, rotation);
    },
    updateDTCar: function (carInfo, scale, revert) {
        drawDigitalTwinCar(carInfo, scale, revert);
    },
    carStop: function (carName) {
        const oldCar = document.querySelector("#dt_" + carName);
        if (oldCar !== null) oldCar.remove();
    },
    getTrack: function (board, grid) {
        return createTrackSVG(board, grid);
    },
    setPaper: function (paperWidth, paperHeight){
        paper = {width: paperWidth, height: paperHeight}
    },
    TRACK_TYPE: TRACK_TYPE,
}
