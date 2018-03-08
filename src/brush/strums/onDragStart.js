import {mouse} from "d3-selection";
import h from "../../util/height";
import {keys} from "d3-collection";

const dimensionsForPoint = (config, pc, xscale, p) => {
    const dims = {i: -1, left: undefined, right: undefined};
    keys(config.dimensions).some((dim, i)=> {
        if (xscale(dim) < p[0]) {
            dims.i = i;
            dims.left = dim;
            dims.right = keys(config.dimensions)[
            pc.getOrderedDimensionKeys().indexOf(dim) + 1
                ];
            return false;
        }
        return true;
    });

    if (dims.left === undefined) {
        // Event on the left side of the first axis.
        dims.i = 0;
        dims.left = pc.getOrderedDimensionKeys()[0];
        dims.right = pc.getOrderedDimensionKeys()[1];
    } else if (dims.right === undefined) {
        // Event on the right side of the last axis
        dims.i = keys(config.dimensions).length - 1;
        dims.right = dims.left;
        dims.left = pc.getOrderedDimensionKeys()[
        keys(config.dimensions).length - 2];
    }

    return dims;
}

// First we need to determine between which two axes the sturm was started.
// This will determine the freedom of movement, because a strum can
// logically only happen between two axes, so no movement outside these axes
// should be allowed.
const onDragStart = (state, config, pc, xscale) => function() {
    console.log(state.strumRect);
    let p = mouse(state.strumRect.node());

    p[0] = p[0] - config.margin.left;
    p[1] = p[1] - config.margin.top;

    const dims = dimensionsForPoint(config, pc, xscale, p);
    const strum = {
        p1: p,
        dims: dims,
        minX: xscale(dims.left),
        maxX: xscale(dims.right),
        minY: 0,
        maxY: h(config),
    };


    // Make sure that the point is within the bounds
    strum.p1[0] = Math.min(Math.max(strum.minX, p[0]), strum.maxX);
    strum.p2 = strum.p1.slice();

    state.strums[dims.i] = strum;
    state.strums.active = dims.i;
    // First we need to determine between which two axes the sturm was started.
    // This will determine the freedom of movement, because a strum can
    // logically only happen between two axes, so no movement outside these axes
    // should be allowed.
    // return function() {
    //     let p = mouse(state.strumRect.node()),
    //         dims,
    //         strum;
    //
    //     console.log(strum);
    //     p[0] = p[0] - config.margin.left;
    //     p[1] = p[1] - config.margin.top;
    //
    //     (dims = dimensionsForPoint(config, pc, xscale, p)),
    //         (strum = {
    //             p1: p,
    //             dims: dims,
    //             minX: xscale(dims.left),
    //             maxX: xscale(dims.right),
    //             minY: 0,
    //             maxY: h(config),
    //         });
    //
    //     strums[dims.i] = strum;
    //     strums.active = dims.i;
    //
    //     // Make sure that the point is within the bounds
    //     strum.p1[0] = Math.min(Math.max(strum.minX, p[0]), strum.maxX);
    //     strum.p2 = strum.p1.slice();
    // };
}

export default onDragStart
