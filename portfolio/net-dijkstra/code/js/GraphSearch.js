"using strict";
var v = [
    {'id': "vs", g:0, h:4, 'xcPos': 100, 'ycPos': 100},
    {'id': "v1", g:0, h:3, 'xcPos': 200, 'ycPos': 50},
    {'id': "v2", g:0, h:2, 'xcPos': 200, 'ycPos': 150},
    {'id': "v3", g:0, h:1, 'xcPos': 300, 'ycPos': 50},
    {'id': "vt", g:0, h:0, 'xcPos': 300, 'ycPos': 150}];
var edge = [
    {'source': v[0],'target': v[1], dist: 1},
    {'source': v[0],'target': v[2], dist: 2},
    {'source': v[1],'target': v[3], dist: 3},
    {'source': v[2],'target': v[4], dist: 4},
    {'source': v[2],'target': v[3], dist: 5},
    {'source': v[3],'target': v[4], dist: 1}];
var sIdx=0, tIdx=4;

var G = new av.GraphModel();
G.loadFromVertexEdgeArrays(v,edge);
// NOTE: Passing in the graphmodel this way means that it will not clear correctly (because it will not recreate G, it will have the same reference)

var myviz = new av.Visualizer({
    inputters: {
        graph: new av.HardcodedInputter(G),
        startNode: new av.HardcodedInputter(v[sIdx]),
        endNode: new av.HardcodedInputter(v[tIdx])
        // jspGraph: new av.JsPlumbGraphInputter({container: 'container-graph'})
    },
    varViewers: {
        // graph: new av.ConsoleViewer('graph'),
        // graph: [new av.ConsoleViewer('graph'), new av.ConsoleViewer('graph 2')],
        graph: [ //new av.ConsoleViewer('graph'),
            new av.JsPlumbGraphViewer({
            container: 'container-graph',
            renderVertexContents: function(v) {
                var data = ['<div class="'];
                if (v.active) { data.push('vertex_active '); }
                if (v.open) { data.push('vertex_in_open '); }
                if (v.closed) { data.push('vertex_in_closed '); }
                if (v.isChild) { data.push('vertex_is_child '); }
                //...
                data.push('">');
                data.push([v.id, v.h, v.g].join(' '));
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
//        open: new av.ConsoleViewer('open:'), //TODO new PriorityQueueViewer('open'),
//        closed: new av.ConsoleViewer('closed:'), //TODO new SetViewer('closed'),
//        current: new av.ConsoleViewer('current node:') //TODO new JsPlumbConnectorViewer({from: 'id of element to start arrow from'})
    },
    controls: "viz-controls",
    generateViz: function(viz) {
        //TODO: Call different functions depending on user selection (e.g. BFS, DFS, A*)
        var compareFunction = function (left, right) {
            // A*: uses g (distance travelled reach this node) plus h (guess as to distance to goal)
            var l = left.g + left.h,
                r = right.g + right.h;
            return r - l; // This is a reverse compare so that the lowest value has the highest priority
        };

        var V = viz.vars,
            G = V.graph,
            s = V.startNode,
            t = V.endNode;

        V.current = s;  viz.snapshot(1);
        if (V.current.id === t.id) { viz.snapshot(2); return; }
        V.open = new buckets.PriorityQueue(compareFunction); viz.snapshot(3); //TODO
        V.open.add(V.current); viz.snapshot(4);
        V.closed = new buckets.Set(function (vertex) {return String(vertex.id);}); viz.snapshot(5);

        // Add our own function to retrieve items (in the case that we revisit the node by a different path)
        V.open.get = function (vertex) {
            var x = _.find(V.open.heap.data, function (iterItem) { return iterItem.id === vertex.id; });
            return x;
        };
        // Extend existing methods to add attributes to vertices (makes rendering vertices easier)
        //  These seem to work, but I'm not 100% convinced that this is the right way to do it
        V.open.add = function (vertex) {
            vertex.open = true;
            return _.bind(buckets.PriorityQueue.prototype.add, V.open)(vertex); // Might need to bind 'this'
        };
        V.open.contains = function (vertex) {
            // var c = _.contains(V.open.heap.data, vertex); // Debug to see if this matches what we'd expect. It does, but it might be a little more brittle that using find, which allows us to specify that we're searching by id.
            var x = _.find(V.open.heap.data, function (iterItem) { return iterItem.id === vertex.id; });
            return !_.isUndefined(x);
        };
        V.closed.add = function (vertex) {
            vertex.closed = true;
            return _.bind(buckets.Set.prototype.add, V.closed)(vertex);
        };
        // var addSetCore = buckets.Set.prototype.add;
        // buckets.Set.prototype.add = function (vertex) {
        //     vertex.closed = true;
        //     return addSetCore(vertex);
        // };

        while (!V.open.isEmpty()) {
            viz.snapshot(6);
            V.current = V.open.dequeue(); V.current.active = true; V.current.open = false; viz.snapshot(7);
            if (V.current.id === t.id) {
                viz.snapshot(8);
                return;
            }
            V.closed.add(V.current); viz.snapshot(9);
            var children = G.getNeighbors(V.current);
            for (var childIdx = children.length - 1; childIdx >= 0; childIdx--) {
                V.child = children[childIdx]; viz.snapshot(10);
                V.child.isChild = true;
                V.child.g = V.current.g + G.edge(V.current, V.child).dist; //TODO rearrange snapshot #s
                var inOpen = V.open.contains(V.child); //FIXED BUG: seems to return true when it shouldn't.
                    // Uses compare function to check for equality (of priorities)!
                    // In other words, it can't handle duplicate priorities - need to rethink
                if (!V.closed.contains(V.child) && !inOpen) {
                    viz.snapshot(11);
                    V.open.add(V.child); viz.snapshot(12);
                } else if (inOpen) {
                    viz.snapshot(13);
                    var incumbent = V.open.get(V.child); viz.snapshot(14);
                    assertNotUndefined(incumbent, "we checked if the child was in OPEN, so it shouldn't be undefined here");
                    if (compareFunction(V.child, incumbent) > 0) { // reverse-compare, remember
                        viz.snapshot(15);
                        V.open.remove(incumbent); incumbent.open = false; viz.snapshot(16);
                        V.open.add(V.child); viz.snapshot(17);
                    }
                }
                V.child.isChild = false;
            }
            V.current.active = false;
        }
        // No solution found
        viz.snapshot(18);
        viz.snapshot(-1);
    }
});
