"using strict";
var av = av || {};

av.JsPlumbGraphViewer = function (args) {
    av.setContainerFromOverloadedArgs(this, args);
    this.cssClass = args.cssClass;
    this.label = args.label;
    var skip = function () { };
    this.renderVertexContents = args.renderVertexContents || skip;
    this.unrenderVertexContents = args.unrenderVertexContents || skip;
    this.renderEdgeLabel = args.renderEdgeLabel;
    this.renderEdgeStyle = args.renderEdgeStyle || skip;

    //this.unrenderEdge = args.unrenderEdge || skip;

    av.JsPlumbUtils.init();

    this.updateVertexPos = function(G){
        var vs = G.getVertices();
        var posdata = {};
        for (var i = vs.length - 1; i >= 0; i--) {
            var el = document.getElementById(vs[i].id);
            var pos = this.$container.position();
            if (el !== null) {
                //alert("updating " + vs[i].id + " left=" + el.style.left + " top=" + el.style.top);
                vpos = {};
                vpos.xcPos = parseInt(el.style.left,10) - pos.left;
                vpos.ycPos = parseInt(el.style.top,10) - pos.top;
                posdata[vs[i].id] = vpos;
            } //else { alert(vs[i].id + " has no div"); }
        }
        return posdata;
    };

    this.render = function (G) {
        this.previousGraph = G; // for use in unrendering
        // data should be a graph
        // draw the graph in full every time (what about remembering user-moved nodes?)
        var posdata = this.updateVertexPos(G);
        this.clear();
        var vertices = G.getVertices();
        var edges = G.getEdges();
        for (var i = vertices.length - 1; i >= 0; i--) {
            var cv = vertices[i];
            if (posdata[cv.id]) {
                // If the vx has already set its positions (particularly on init), don't replace them
                cv.xcPos = cv.xcPos || posdata[cv.id].xcPos;
                cv.ycPos = cv.ycPos || posdata[cv.id].ycPos;
            }
            this.makeVertex(cv);
        }
        if (_.isArray(edges)) {
            for (i = edges.length-1; i >= 0; i--) {
                this.makeEdge(edges[i], G.directed);
            }
        }
    };

    this.unrender = function () {
        G = this.previousGraph;
        if (!G) { return; }

        // Iterate through Vs and Es and call user function for unrendering
        // For example, user might want to remove 'seen' class from a vertex
        //  and then add it to a different vertex in the render function
        var vertices = G.getVertices();
        var edges = G.getEdges();
        for (var i = 0; i < vertices.length; i++) {
            this.unrenderVertexContents(vertices[i]);
        }
        //if (_.isArray(edges)) {
        //    for (i = 0; i < edges.length; i++) {
                //this.unrenderEdgeStyle(edges[i]);
                //this.unrenderEdgeLable(edges[i]);
        //    }
        //}
    };

    this.clear = function () {
        av.JsPlumbUtils.clear();
        this.$container.empty();
        this.previousGraph = null;
    };

    this.makeVertex = function (vertex) {
        av.JsPlumbUtils.makeVertex(this.$container, vertex, true, this.renderVertexContents);
    };

    this.makeEdge = function (edge, directed) {
        // I think the following may be causing an error, "jsPlumb function failed : TypeError: Cannot read property 'left' of null"
        var con = jsPlumb.connect({
                source:edge.source.id,
                target:edge.target.id
            }),
            userStyle = this.renderEdgeStyle(edge) || {},
            style = _.defaults(userStyle, con.paintStyleInUse);

        con.setPaintStyle(style);
        if (!directed) {
            con.removeOverlay("arrow"); // ID of overlay
        }

        // User can give us a function and we use the return value as the label,
        //  or she can give us a string, in which case we will query that property
        //  on the edge and put that in the label
        var userFuncOrAttribute = this.renderEdgeLabel,
            newLabel; // undefined
        if (_.isFunction(userFuncOrAttribute)) {
            newLabel = userFuncOrAttribute(edge);
        } else if (_.isString(userFuncOrAttribute)) {
            if (_.has(edge, userFuncOrAttribute)) {
                newLabel = edge[userFuncOrAttribute];
            }
            // else {
            //     Log.i(sprintf('in av.JsPlumbGraphViewer.makeEdge, I tried to grab the property "%s" but the edge object didnt have it!', userFuncOrAttribute));
            // }
        } else {
            newLabel = edge.label;
        }
        if (!_.isUndefined(newLabel)) {
            newLabel = _.escape(newLabel);
            con.setLabel({ label: newLabel, cssClass: "edge-label" });
        }
    };

    this.setUserInteraction = function (enabled) {
        unlocked = 'vertex';
        locked = 'vertex-locked';
        if (enabled) {
            vs = $('.'+locked);
            vs.removeClass(locked);
            vs.addClass(unlocked);
        }
        else {
            vs = $('.'+unlocked);
            vs.removeClass(unlocked);
            vs.addClass(locked);
        }
    };
};
