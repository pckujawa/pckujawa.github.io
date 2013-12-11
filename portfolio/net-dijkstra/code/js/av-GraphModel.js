"using strict";
if (_ === undefined) { throw Error("GraphModel uses underscore.js and it doesn't seem to be referenced.");}
var av = av || {};

av.GraphModel = function (directed) {
    //TODO #discuss accepting attributes like 'from' and 'to' for edges (shorter and somewhat intuitive). Also, some libraries use 'links' instead of 'edges'. And we could accept 'node' as well as 'vertex'.

    if(_.isUndefined(directed)) { directed = true; }
    this.directed = directed;

    this._validateEdge = function (e, sAttr) {
        /// Verify that edge has spec'd attr (i.e. 'source' or 'target') and, if it's a string, replace it with an object whose id is that string
        av.require(e !== null, "Got a null edge. Null edges are ok, but don't try to validate them.");
        if (!e[sAttr]) { throw Error('in loadFromVertexEdgeArrays, this edge has no "'+sAttr+'" attribute');}
        // #discuss maybe we should allow non-string ids in VMs, e.g. numbers
        if (_.isString(e[sAttr])) {e[sAttr] = {id: e[sAttr]};} // wrap
        if (!e[sAttr].id) { throw Error('in loadFromVertexEdgeArrays, this edge has no "'+sAttr+'.id" attribute');}
    };

    this.loadFromAdjIdMatrixAndVertexObjs = function (adj, vtxs) {
        // :param adj: {'string row/source ids' => {'string col/target ids' => edgeObj} }
        var that = this;
        _.each(vtxs, function (v) {
            av.require(_.has(v, 'id'), "Each vertex must have an id attribute.");
        });
        _.each(adj, function (oTgtIdsToEdgeObjs, sSrcId) {
            _.each(oTgtIdsToEdgeObjs, function (oEdge, sTgtId) {
                that._validateEdge(oEdge, 'source');
                that._validateEdge(oEdge, 'target');
            });
        });
        // Ensure that we set all undef edges to null
        // #discuss Maybe we should be ok with undef edges, even though they could indicate a dev error (it took me a while to figure out why I was getting errors because I wasn't init'ing to null)
        _.each(vtxs, function (v1) {
            _.each(vtxs, function (v2) {
                if (_.isUndefined(adj[v1.id][v2.id])) {
                    adj[v1.id][v2.id] = null;
                }
            });
        });
        this.vertices = vtxs;
        this.adjMatrix = adj;
        return this; // allow chaining, e.g. var G = new av.GraphModel().loadFrom(...);
    };

    this.loadFromVertexEdgeArrays = function (vertices, edges) {
        /// vertices[i] is a vertex model
        /// edges[i] = {source: 'vtxId', target: 'vtxId2'} or
        ///            {source: vtxModel, target: vtxModel}
        this.vertices = vertices;
        this.adjMatrix = {}; // row=source, col=target (only matters for digraphs)

        // Initialize rows and columns, ix'd by vertex id
        for (var r = vertices.length - 1; r >= 0; r--) {
            var rid = vertices[r].id;
            this.adjMatrix[rid] = {};
            for (var c = vertices.length - 1; c >= 0; c--) {
                var cid = vertices[c].id;
                this.adjMatrix[rid][cid] = null;
            }
        }

        // Put edges in the matrix at row=edge.source.id, col=edge.target.id
        for (var i = edges.length - 1; i >= 0; i--) {
            var e = edges[i];
            this._validateEdge(e, 'target');
            this._validateEdge(e, 'source');
            this.adjMatrix[e.source.id][e.target.id] = e;
        }
        return this;
    };

    this.loadFromSmartObject = function (o) {
        // Overloading: pass in an object whose values are one or more of:
        // 1. vKeyCanBeAnything: {id: 'v1', edges: ['v2', 'v3'], ...}: Fully specified model (with .edges[] attr). Note, .id is used instead of key.
        // 2. vFoo: {id: 'v4', ...}: "Naked" model (without .edges attr)
        // 3. v3: ['v1', 'v2']: Array of edge ids (possibly empty) - key indicates id of src vtx
        // 4. edges: { v3: ['v1', 'v2'] }: If there is an 'edges' key, it is treated as an object with values all like 3. This is useful when you want to use method 2 and not mutate your VM by adding the .edges attr
        // NOTE: Edges can only be arrays of ids as strings (as of 18Apr2013). Would be nice to have them also be objects (e.g. to assign weights)

        var vtxIdToEdgeIdsMap = {},
            vtxIdToModelsMap = {},
            edgesObj;
        // Build up maps of vtx id to edge ids and models
        _.each(o, function (value, key) {
            if (_.isArray(value)) { // Case 3
                // vtx.id=key -> [edge ids]
                vtxIdToEdgeIdsMap[key] = value;
                vtxIdToModelsMap[key] = {id: key}; // implied vtx model
            } else {
                av.assert(_.isObject(value));
                if (key == 'edges') { // Case 4
                    edgesObj = value; // more processing to do later
                } else {
                    // Cases 1 and 2
                    av.assert(_.has(value, 'id'));
                    var edges = value['edges'] || []; // explicitly set no edges if none specified
                    // vtx.id -> [edge ids]
                    vtxIdToEdgeIdsMap[value.id] = edges;
                    vtxIdToModelsMap[value.id] = value; // explicit vtx model
                }
            }
        });
        // Finish Case 4: add edges from 'edges' attr if present
        _.each(edgesObj, function (value, key) {
            vtxIdToEdgeIdsMap[key] = value;
            if (_.isUndefined(vtxIdToModelsMap[key])) {
                vtxIdToModelsMap[key] = {id: key};
            }
        });

        // Make sure all edges point to vertex models (create if necessary)
        _.chain(vtxIdToEdgeIdsMap).values().flatten().each(function (vtxId) {
            vtxIdToModelsMap[vtxId] = vtxIdToModelsMap[vtxId] || {id: vtxId};
        });

        // Now we know which models to use and which edges to connect, so do it
        var vs = _.values(vtxIdToModelsMap),
            edges = [];
        _.each(vtxIdToEdgeIdsMap, function (aEdgeIds, srcVtxId) {
            var newEdges = _.map(aEdgeIds, function (tgtVtxId) {
                // Note: we can either use just the ids or the entire VMs as the edge endpoints
                return {source: vtxIdToModelsMap[srcVtxId], target: vtxIdToModelsMap[tgtVtxId]};
            });
            edges = edges.concat(newEdges);
        });
        this.loadFromVertexEdgeArrays(vs, edges);
        return this;
    };

    this.loadFromVerticesWithEdgeInfo = function (vertices) {
        // NOTE (Pat): this is kind of a stupid fn as is because the edge objs need to specify 'source' even though that should be implied.
        // Example:
// var v1edge = {source: 'v1', target: 'v2'};
// var inVs = [
//     {id: 'v1', edges: [v1edge] }, // array of edges
//     {id: 'v2'}
// ];
// target.loadFromVerticesWithEdgeInfo(inVs);
        var edges = _.chain(vertices).
            // tap(function (o) {Log.log(o);}).
            pluck('edges').
            compact(). // remove falsy values (e.g. values are undefined if .edges is not present in a vtx)
            flatten().
            value();
        //TODO pluck 'edge' object if present
        this.loadFromVertexEdgeArrays(vertices, edges);
        return this;
    };

    // e.g. input: { 'a': {}, 'a->b': {weight: 2}}
    this.loadFromDotToObjectMap = function (dotToObjMap) {
        throw "Not implemented";
        // Augment user-supplied objects with implicit properties, e.g. 'id', 'sourceId'/'source', ...
        // Find unique vertices and create adj matrix container (will hold edge objects)
            // Can we use vertex objects as indices, or just the ids? Pros/cons?
    };

    this._argAsVertex = function (arg) {
        if (_.isString(arg)) { arg = {id: arg}; }
        return arg;
    };

    this.adj = this.neighbors = this.getNeighbors = function(s) {
        s = this._argAsVertex(s);
        var out = _.pluck(this.getOutgoingEdges(s),'target');
        var ine = [];
        if (!this.directed) {
            ine = _.pluck(this.getIncomingEdges(s),'source');
        }
        var allNs = _.union(out,ine);
        // Now get actual vertex objects
        var actualVs = _(this.vertices).filter(function (v) {
            return _(allNs).where({id: v.id}).length > 0;
        });
        return actualVs;
    };

    this.fanout = this.getOutgoingEdges = function(s) {
        s = this._argAsVertex(s);
        var e = [];
        for (var c = this.vertices.length - 1; c >= 0; c--) {
            var cid = this.vertices[c].id;
            if (this.adjMatrix[s.id][cid] !== null){
                e.push(this.adjMatrix[s.id][cid]);
            }
        }

        return e;
    };

    this.fanin = this.getIncomingEdges = function(s) {
        s = this._argAsVertex(s);
        var e = [];
        for (var c = this.vertices.length - 1; c >= 0; c--) {
            var cid = this.vertices[c].id;
            if (this.adjMatrix[cid][s.id] !== null){
                e.push(this.adjMatrix[cid][s.id]);
            }
        }

        return e;
    };

    this.edge = function(s, t) {
        s = this._argAsVertex(s);
        t = this._argAsVertex(t);
        var e = this.adjMatrix[s.id][t.id];
        if (e === null && !this.directed){
            e = this.adjMatrix[t.id][s.id];
        }
        return e;
    };

    // Allow input of three arrays of possible different sizes
    // The sources will not be unique if there are multiple edges, e.g. a->b and a->c
    // There may be a source with no matching target (or vice-versa) - these are disconnected vertices
    // If edges have been supplied, they should only exist in indices with a source and a target
    // TODO
    // var slen = sources.length,
    //  tlen = targets.length,
    //  elen = _ edges.length,
    //  minlen = elen > 0 ? Math.min(slen, tlen, elen) : Math.min(slen, tlen),
    //  sdiff = slen - minlen,
    //  tdiff = tlen - minlen,
    //  ediff = elen - minlen;
    // for (var i = 0; i < minlen; i++) {

    // }

    /** return a shallow clcne of all vertex objects (as passed in) in no particular order
     */
    this.V = this.getVertices = function() {
        // shallow clone
        return _.clone(this.vertices);
    };

    /**
     * Return array of shallow clones of edge objects in no particular order
     */
    this.getEdges = function() {
        var edges = [];
        for (var r = this.vertices.length - 1; r >= 0; r--) {
           var rid = this.vertices[r].id;
           for (var c = this.vertices.length - 1; c >= 0; c--) {
               var cid = this.vertices[c].id;
               var e = this.adjMatrix[rid][cid];
               if (e !== null) {
                   edges.push(_.clone(e));
               }
           }
        }
        return edges;
    };

    this.mutateVertices = function (fn) {
        fn(this.vertices);
    };
};
