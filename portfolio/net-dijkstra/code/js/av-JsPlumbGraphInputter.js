"using strict";
var av = av || {};

av.JsPlumbGraphInputter = function (args) {
    var that = this;
    this.vtxId = 1; // counter for unique vtx ids
    this.sCurrentMode = null;
    av.setContainerFromOverloadedArgs(this, args);

    if (_.has(args, 'edges')) {
        this.enableEdgeLabeling = true; // Need to remember because clearing removes the 'click' binding it seems
        this.edgeLabelAttribute = args.edgeLabel;
        if (args.edges === 'numeric') {
            this.edgeMapFunc = Number;
        }
        av.enableJsPlumbEdgeLabeling();
    }

    av.JsPlumbUtils.init();

    this.activateMode = function (sMode, $graph, $verts) {
        $graph = $graph || this.$container;
        $verts = $verts || $graph.find('.vertex, .vertex-locked');
        var prevMode = this.currentMode; // need to undo prev mode's changes
        switch(sMode) {
            case 'delete':
                $verts.filter('.vertex'); // I think this will remove the .locked elements
                this.currentMode = av.graph.deleteMode;
                break;
            case 'create':
                this.currentMode = av.graph.createMode;
                break;
            case 'move':
                this.currentMode = av.graph.moveMode;
                break;
            default: break;
        }
        // #discuss Not sure about what guarantees we should make about the order of run/undo being called
        if (!_.isUndefined(prevMode)) {
            prevMode.undoOnVertexOrVs($verts);
            prevMode.undoOnGraph($graph);
        }
        this.currentMode.inputter = this;
        this.currentMode.runOnGraph($graph);
        this.currentMode.runOnVertexOrVs($verts);
    };

    this.injectModeSelectors = function () {
        // Set up underscore to accept 'mustache-style' templates
        // #discuss We need to be consistent about this because it's a global _ setting
        _.templateSettings = { interpolate : /\{\{(.+?)\}\}/g };
        tModeHtml = _.template('<label><input type="radio" name="av-mode-selector" value="{{value}}">{{text}}</input></label>');

        // Build up
        this.$modeContainer = $('<form action="" id="av-graph-mode-container">').
            append(tModeHtml({value: 'create', text:'Create and connect vertices'})).
            append(tModeHtml({value: 'move', text:'Move them'})).
            append(tModeHtml({value: 'delete', text:'<img src="http://openclipart.org/image/30px/svg_to_png/110/molumen_red_square_error_warning_icon.png" alt="delete">'}));

        // Subscribe to changes
        // Should pick up newly-injected radiobuttons
        this.$modeContainer.on('change', ':radio', function (e) {  // see http://api.jquery.com/on/ re delegated events ('radio')
            var target = e.target; // event source was a particular radiobutton
            console.log(target.value + ' checked changed, checked=' + target.checked); // e.g. 'delete checked changed, checked=true'
            var sSelectedMode = target.value;
            that.activateMode(sSelectedMode);
        });

        // Add to page
        this.$modeContainer.insertBefore(this.$container);
    };
    this.injectModeSelectors();

    this.makeVertex = function (vertex) {
        locked = false;
        var $vtx = av.JsPlumbUtils.makeVertex(this.$container, vertex, locked);
        // Apply current mode to new vtx
        this.currentMode.runOnVertexOrVs($vtx);
    };

    /**
        Returns a graph model from user input.
     */
    this.getInput = function () {
        // TODO: associate with a particular jsplumb workspace
        var labelsAndEdges = jsPlumb.select().getLabel(),
            vertices = av.JsPlumbUtils.getVertices(this.$container.selector),
            edges = [];
        for (var lIdx = labelsAndEdges.length - 1; lIdx >= 0; lIdx--) {
            var item = labelsAndEdges[lIdx],
                edgeLabel = item[0],
                connection = item[1],
                edge = {id: connection.id, source: connection.sourceId, target: connection.targetId};

            if (_.isFunction(this.edgeMapFunc)) {
                edgeLabel = this.edgeMapFunc(edgeLabel);
            }
            edge[this.edgeLabelAttribute || 'label'] = edgeLabel;
            edges.push(edge);
        }

        var g = new av.GraphModel();
        g.loadFromVertexEdgeArrays(vertices, edges);
        return g;
    };

    this.clear = function () {
        av.JsPlumbUtils.clear();
        this.$container.empty();
        // Need to re-bind click event for labeling now
        if (this.enableEdgeLabeling) {
            av.enableJsPlumbEdgeLabeling();
        }
    };

    jsPlumb.bind('ready', function () {
        //DEBUG helper
        // that.makeVertex({ id: 'v'+that.vtxId, h: 0, xcPos: 50, ycPos: 20 }); that.vtxId++;
        // that.makeVertex({ id: 'v'+that.vtxId, h: 0, xcPos: 200, ycPos: 20 }); that.vtxId++;
        // that.makeVertex({ id: 'v'+that.vtxId, h: 0, xcPos: 200, ycPos: 150 }); that.vtxId++;
        // that.makeVertex({ id: 'v'+that.vtxId, h: 0, xcPos: 400, ycPos: 20 }); that.vtxId++;
        // jsPlumb.connect({ source: 'v1', target: 'v2', label:'5' });
        // jsPlumb.connect({ source: 'v2', target: 'v4', label:'2' });
        // jsPlumb.connect({ source: 'v1', target: 'v3', label:'1' });
        // jsPlumb.connect({ source: 'v3', target: 'v2', label:'3' });

        // // Listen for changes in mode on container
        // that.$container.on('modeChanged.av', function (e) { // Notice the namespaced event name
        //     av.Log.d('modeChanged on container');
        // });

        // Doesn't work, unfortunately. Probably done before listener is attached. // that.$modeContainer.find("[value='create']").attr('checked', true); // default mode

        // handler for new edges
        // TODO: Change so we are only bound to this graph, not all jsPlumb graphs
        jsPlumb.bind("beforeDrop", function (data) {
            return (data.sourceId != data.targetId);
        });

    });
};


av.enableJsPlumbEdgeLabeling = function () {
    // TODO: Change so we are only bound to this graph, not all jsPlumb graphs
    jsPlumb.ready(function() {
        jsPlumb.Defaults.HoverPaintStyle = { strokeStyle:"red" };
        // handler for events on connections (edges)
        jsPlumb.bind("click", function (con, ev) {
            // Convention - us means unsafe string, s means safe string
            var usInput = prompt("Label this edge", con.getLabel()),
                sInput = _.escape(usInput); // Is this sufficient?

            con.setLabel({
                label:    sInput, // Must be a string, I believe
                cssClass: "edge-label",
                location: 0.5
            });
        });
    });
};

av.graph = av.graph || {};

av.graph.createMode = {
    inputter: null, // Must be set so we can make vertices and such
    runOnVertexOrVs: function ($vtx) {
        av.assert(!_.isUndefined($vtx), "$vtx was undef");
        //  Edge creation:
        var $vertices = $vtx;
        // Need to disable dragging or vertex can't be a source
        jsPlumb.setDraggable($vertices, false);
        jsPlumb.makeSource($vertices, {
            anchor: ["Perimeter", {shape:"circle"} ]
        });
        jsPlumb.makeTarget( $vertices, {
            connector: "Straight",
            // detachable: false,
            anchor: ["Perimeter", {shape:"circle"} ],
            dropOptions: {hoverClass: "av-vertex-drag-onto"} //TODO: prefix with av- in CSS
        });
    },
    undoOnVertexOrVs: function ($vtx) {
        jsPlumb.unmakeSource($vtx);
    },
    runOnGraph: function ($graph) {
        av.assert(!_.isUndefined($graph), "$graph was undef");
        var inputter = this.inputter;
        if (inputter === null) {throw "Set inputter before using create mode.";}
        // Make vertices when user clicks within container
        $graph.click(function (e) {
            // only make a new node for clicks on the container, not its children
            //  otherwise, we'll get triggered when clicking the delete icon, for instance
            if ( !$(e.target).is($graph) ) {
                return;
            }
            // Can't rely on the following values staying the same (injected DOM, etc), so query them every time
            var cPos = $graph.position();
            cPos.width = $graph.width();
            cPos.height = $graph.height();
            // GRRRRR: There are lots of issues with using relative position when there are
            //  multiple elements. But absolute positioning is not ideal :(
            // var v = new VertexModel({id: 'v'+inputter.vtxId, xcPos: e.offsetX-10, ycPos: e.offsetY-10}); // relative (clientX, pageX, and screenX are all not what we want)
            var v = { id: 'v'+inputter.vtxId,
                xcPos: e.pageX - cPos.left,
                ycPos: e.pageY - cPos.top
            };
            // Bound within container
            if (v.xcPos < 0) {v.xcPos = 0;}
            else if (v.xcPos > cPos.width) {v.xcPos = cPos.width;}
            if (v.ycPos < 0) {v.ycPos = 0;}
            else if (v.ycPos > cPos.height) {v.ycPos = cPos.height;}

            inputter.makeVertex(v);
            inputter.vtxId++;
        });
    },
    undoOnGraph: function ($graph) {
        $graph.off('click');
    }
};

av.graph.moveMode = {
    inputter: null, // Must be set so we can make vertices and such
    runOnVertexOrVs: function ($vtx) {
        // Need to disable being a source or vertex can't be dragged
        jsPlumb.unmakeSource($vtx);
        // NOTE: vxs must have been created and set .draggable already
        jsPlumb.setDraggable($vtx, true);
        // Disable creation of new vtcs
        this.inputter.$container.off('click');
    },
    undoOnVertexOrVs: function ($vtx) {
        jsPlumb.setDraggable($vtx, false);
    },
    runOnGraph: function ($graph) {},
    undoOnGraph: function ($graph) {}
};

av.graph.deleteMode = {
    runOnVertexOrVs: function ($vtx) {},
    undoOnVertexOrVs: function ($vtx) {},
    runOnGraph: function ($graph) {
        // Override the graph's click handler completely.
        $graph.click(function (e) {
            var target = e.target; // Vtx, blank space, or edge (or misc)
            if ($(target).is('.vertex')) { // .hasClass() also works
                jsPlumb.removeAllEndpoints(target);
                $(target).remove();
            }
        });
        // Instead of addding class to all vertices, just add to container and have CSS to descendent selection
        $graph.addClass('av-vertex-delete');
    },
    undoOnGraph: function ($graph) {
        $graph.removeClass('av-vertex-delete');
    }
};

av.graph.iMode = { // interface
    // inputter: null, // Must be set for FOO reason
    runOnVertexOrVs: function ($vtx) {

    },
    undoOnVertexOrVs: function ($vtx) {

    },
    runOnGraph: function ($graph) {

    },
    undoOnGraph: function ($graph) {

    }
};