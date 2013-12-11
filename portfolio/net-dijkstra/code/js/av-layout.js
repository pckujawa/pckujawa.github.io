"use strict";
var av = av || {};

av.layoutUsingSpringy = function (graphModel, containerWidth, containerHeight, setModelCallback) {
    console.log('started layoutUsingSpringy');
    // Pull nodes and edges from graph model
    var nodes = graphModel.getVertices(),
        edges = graphModel.getEdges();
    // Create springy graph
    var sGraph = new Springy.Graph();
    _.each(nodes, function (v) {
        // av.assert(_.isString(v.id), "v.id isn't a string");
        v.data = {}; // needed for Springy to accept as a 'Node'
        sGraph.addNode(v);
    });
    _.each(edges, function (e) {
        sGraph.newEdge(e.source, e.target);
    });
    av.Log.each('springy graph is', sGraph);
    // Use Springy to layout
    // TODO play with params to get a quick layout
    //  NOTES: stuff that makes it slower: increasing damping
    var stiffness = 640;
    var repulsion = 480.0;
    var damping = 0.5;
    var layout = new Springy.Layout.ForceDirected(sGraph, stiffness, repulsion, damping);
    var startTime = Date.now();
    layout.start(undefined, function () {
        av.Log.each('in springy layout done callback with time taken:', Date.now() - startTime);
        // What does springy layout do to indicate positioning?
        // A: It has a nodePoints attr which is an obj with keys of node.id and a p (position) attr with x and y attrs. It also calculates a bounding box to allow a reference for x and y.
        // How do we map the layout to our position system (xcPos, ycPos)?
        // A: Use the container extents and layout's bbox extents to find the multiplier and offset.
        // Prefixes: l: layout (e.g. posn relative to layout algo); c: container
        var idToCPosition = {},
            bbox = layout.getBoundingBox(),
            bl = bbox.bottomleft,
            tr = bbox.topright,
            lx1 = tr.x,
            ly0 = tr.y,
            lx0 = bl.x,
            ly1 = bl.y,
            cxFromLXMult = containerWidth / (lx1 - lx0),
            cyFromLYMult = containerHeight / (ly1 - ly0);
        function containerPosnFromLayoutPosn (point) {
            var cp = {};
            cp.x = cxFromLXMult * (point.x - lx0);
            cp.y = cyFromLYMult * (point.y - ly0);
            return cp;
        }
        _.each(nodes, function (v) {
            idToCPosition[v.id] = containerPosnFromLayoutPosn(layout.nodePoints[v.id].p);
        });
        av.Log.each('Converted from layout points', layout.nodePoints, 'to container points', idToCPosition);

        graphModel.mutateVertices(function (vs) {
            _.each(vs, function (v) {
                var lPos = idToCPosition[v.id];
                v.xcPos = lPos.x;
                v.ycPos = lPos.y;
            });
        });
        setModelCallback(graphModel);
    });
};