"using strict";
var av = av || {};
av.bestFirstGraphSearch = function (visualizer, frontierEvalFunc, vertexEqualsFunc, parentAssignmentFunc) {
    var viz = visualizer,
        V = viz.vars,
        _s = av.getSnapshotHelper(_.bind(viz.snapshot, viz)),
        G = V.graph,
        explored = V.explored = new av.AnnotatingSet('inExplored'),
        frontier = V.frontier = av.createFrontierDataStructure(frontierEvalFunc, parentAssignmentFunc);
    V.child = null;
    V.activeVertex = null; // Vertex being explored
    frontier.add(V.startVertex);        _s(4);
    while (!frontier.isEmpty()) {
        V.activeVertex = frontier.next();       _s(6);
        explored.add(V.activeVertex);           _s();
        if ( vertexEqualsFunc(V.activeVertex, V.finishVertex)) {        _s(9);
            return; // All done
        }
        var children = G.neighbors(V.activeVertex);
        V.child = null;
        for (var childIdx = children.length - 1; childIdx >= 0; childIdx--) {
            V.child = children[childIdx];                   _s(10);
            V.activeEdge = G.edge(V.activeVertex, V.child);
            V.child.currentParent = V.activeVertex;
            V.child.currentParentEdge = V.activeEdge;       _s();
            if (explored.contains(V.child)) {       _s(12);
                continue;
            }
            if (frontier.contains(V.child)) {       _s(14);
                var replaced = frontier.replaceIfBetter(V.child);       _s();
                continue;
            } else {                        _s(16);
                frontier.add(V.child);      _s();
            }
        }
    }       _s(18);
    _s(-1);
};

av.BestFirstPriorityQueue = function (evalFunc, parentAssignmentFunc, membershipAttribute) {
    this.f = evalFunc;
    this.parenter = parentAssignmentFunc;
    this.membershipAttribute = membershipAttribute || 'inQueue';
    this.ds = new av.PriorityQueue(true, 'dist');
    this.add = function (item) {
        if (!this.ds.enqueue(item)) { return false; }
        this.parenter(item, item.currentParent, item.currentParentEdge);
        item[this.membershipAttribute] = true;
    };
    this.isEmpty = function () {
        return this.ds.size() === 0;
    };
    this.next = function () {
        var item = this.ds.dequeue();
        item[this.membershipAttribute] = false;
        return item;
    };
    this.contains = function (item) {
        return this.ds.contains(item);
    };
    this.replaceIfBetter = function (item) {
        if (!this.contains(item)) {
            return this.add(item);
        }
        // //NOTE: the way I'm currently doing it, item === incumbent, so score is never better
        // var incumbent = _(this.ds.list).where({id: item.id})[0];
        // if (this.score(incumbent) <= this.score(item)) {
        //     return false;
        // }
        var incumbent = item;
        this.ds.remove(incumbent);
        incumbent[this.membershipAttribute] = false;
        return this.add(item);
    };
    this.score = function (item) {
        return this.f(item);
    };
};

av.createFrontierDataStructure = function (frontierEvalFunc, parentAssignmentFunc) {
    return new av.BestFirstPriorityQueue(frontierEvalFunc, parentAssignmentFunc, 'inFrontier');
};

av.getSnapshotHelper = function (vizSnapshotFunc) {
    var prevNumber = 0;
    return function inner (lineNumberOrNothing) {
        if (_.isNumber(lineNumberOrNothing)) {
            prevNumber = lineNumberOrNothing;
            vizSnapshotFunc(lineNumberOrNothing);
        } else {
            prevNumber++;
            vizSnapshotFunc(prevNumber);
        }
    };
};

av.AnnotatingSet = function (membershipAttribute) {
    this.membershipAttribute = membershipAttribute;
    this.ds = []; // Data store
    this.add = function (value) {
        value[this.membershipAttribute] = true;
        this.ds.push(value);
    };
    this.contains = function (value) {
        return _(this.ds).contains(value);
    };
};

av.AnnotatingQueue = function (membershipAttribute) {
    this.membershipAttribute = membershipAttribute;
    this.ds = []; // Data store
    this.add = function (value) {
        value[this.membershipAttribute] = true;
        this.ds.push(value);
    };
    this.next = function () {
        var value = this.ds.shift();
        value[this.membershipAttribute] = false;
        return value;
    };
};


av.aStarViz = new av.Visualizer({
    pseudocode: "container-pseudocode",
    controls: "viz-controls",
    inputters: {
        graph: new av.JsPlumbGraphInputter({container: 'container-graph',
            edges: 'numeric', edgeLabel: 'dist'}),
        hs: new av.DelimitedTextToArrayInputter(
            new av.PromptInputter('h values separated by spaces in increasing order'),
            'whitespace',
            function (value) { return Number(value); }
        )
        // startNode: new PaletteInputter('Start Vertex', '../img/startVertexPalette.png'), // returns selector?
        // startNode: new av.PromptInputter('Start vertex id'),
        // endNode: new av.PromptInputter('End vertex id')
    },
    varViewers: {
        graph: [ //new av.ConsoleViewer('graph'),
            new av.JsPlumbGraphViewer({
            container: 'container-graph',
            renderVertexContents: function(v) {
                var data = ['<div class="'];
                if (v.active) { data.push('vertex_active '); }
                if (v.inFrontier) { data.push('vertex_in_open '); }
                if (v.inExplored) { data.push('vertex_in_closed '); }
                if (v.isChild) { data.push('vertex_is_child '); }
                if (v.start) {data.push('vertex-start ');}
                if (v.finish) {data.push('vertex-finish ');}
                //...
                data.push('">');
                data.push(v.id + ', h=' + v.h + ', g=' + v.g);
                data.push('</div>');
                return data.join('');
            },
            renderEdgeLabel: 'dist',
            renderEdgeStyle: function (edge) {
                if (edge.highlighted) {return {strokeStyle: 'yellow'};}
            }
        })]
        //TODO startNode: new CssViewer('dropshadow: 5px'),
        //TODO endNode: new HighlightViewer(),
//        child: new av.ConsoleViewer('child:'), //TODO maybe highlight the node or the edge (temporarily)
//        frontier: new av.ConsoleViewer('frontier:'), //TODO new PriorityQueueViewer('frontier'),
//        explored: new av.ConsoleViewer('explored:'), //TODO new SetViewer('explored'),
//        current: new av.ConsoleViewer('current node:') //TODO new JsPlumbConnectorViewer({from: 'id of element to start arrow from'})
    },
    generateViz: function(viz) {
        var V = viz.vars,
            G = V.graph,
            vs = G.V(),
            vsAndHs = _.zipShortest(vs, V.hs);

        // Assign h values to vertex objs
        for (var idx = vsAndHs.length - 1; idx >= 0; idx--) {
            var vh = vsAndHs[idx];
            vh[0].h = vh[1];
        }

        // Assign start and finish vertices
        var $vstart = $('.vertex-start'),
            $vfin   = $('.vertex-finish');
        if ($vstart[0] && $vfin[0]) {
            V.startVertex = _(vs).where({id: $vstart[0].id})[0];
            V.finishVertex = _(vs).where({id: $vfin[0].id})[0];
            // Set variables so that when they're re-rendered the css class can be re-added (lame)
            //  Double-lame - the vertices only affect the 'data' div, so outlining and coloring doesn't get the whole vertex
            V.startVertex.start = true;
            V.finishVertex.finish = true;
        } else {
            alert('Please refresh, then specify a start vertex and a finish vertex.');
            throw Error('user didnt specify start/end vertices');
        }

        var frontierEvalFunc = function (vertex) {
            return vertex.g + vertex.h;
        };
        var vertexEqualsFunc = function (v1, v2) {
            return v1.id === v2.id;
        };
        var parentAssignmentFunc = function (child, parent, edge) {
            if (child.start) {
                child.g = 0;
                return;
            }
            var oldParent = child.bestParent,
                newG,
                oldG = oldParent ? child.g : 999888777; // If had parent, should have g
            newG = parent.g + edge['dist'];
            if (newG < oldG) {
                child.bestParent = parent;
                child.g = newG;
            }
        };
        av.bestFirstGraphSearch(viz, frontierEvalFunc, vertexEqualsFunc, parentAssignmentFunc);
    }
});