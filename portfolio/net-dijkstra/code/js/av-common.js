"using strict";
var av = av || {};

av.setContainerFromOverloadedArgs = function (obj, args) {
    // Set attributes on the object: $container and sContainerIdSansHash
    // Allow args to be:
    //   string: interpret as id of container (whether or not # is present)
    //   jquery selector: ... for the container
    //   other object: has a .container that is one of the above
    var containerIdOrSelector;
    if (_.has(args, 'container')) {
        containerIdOrSelector = args.container;
    } else {
        containerIdOrSelector = args;
    }
    if (_.isString(containerIdOrSelector)) {
        obj.sContainerIdSansHash = containerIdOrSelector[0] == '#' ?
            containerIdOrSelector.slice(1) : containerIdOrSelector;
        obj.$container = $('#' + obj.sContainerIdSansHash);
    }
    else if (containerIdOrSelector instanceof jQeury) {
        obj.$container = containerIdOrSelector;
        obj.sContainerIdSansHash = containerIdOrSelector.attr('id'); // doesn't include hash in Chrome test
    }
};

// https://gist.github.com/965603
av.stacktrace = function (caller) {
  function st2(f) {
    return !f ? [] :
        st2(f.caller).concat([f.toString().split('(')[0].substring(9) + '(' + Array.prototype.slice.call(f.arguments).join(',') + ')']);
  }
  return st2(caller || arguments.callee.caller);
};

if (_.isUndefined(av.require)) {
    // The difference between assert and require are that assert is for checking your own code and require is for validating callers' code (so it wouldn't get removed in production, unlike assert)
    av.require = function (test, message) {
        if (!test) {
            throw Error(message);
        }
    };
}

if (_.isUndefined(av.assert)) {
    av.assert = function(test, message) {
        if (!test) {
            // console.error(message + ': test was ' + test);
            throw Error(message + ': assertion failed. Check the previous stack trace call.'); // so we can get a stack trace
        }
    };
    av.assertIdentical = function(first, second, message) {
        assert(first === second, message);
    };
    av.assertNotUndefined = function(item, message) {
        assert(!_.isUndefined(item), message);
    };
}

if (av.Log === undefined) {
    var Log = av.Log = {
        // TODO implied sprintf args
        log: function (message, showStackTrace) {
            console.log(message);
            if (showStackTrace) {
                console.log('  stack trace on next line');
                console.log(stacktrace(arguments.callee.caller));
            }
        },
        l: function (message) {console.log(message);}, // Takes advantage of how console logs complex objs
        i: function (message) {Log.log('INFO: '+message);}, // informational messages: Log.i("info")
        d: function (message) {Log.log('DEBUG: '+message);}, // debug messages: Log.d("debug")
        w: function (message) {Log.log('WARNING: '+ message, true);},
        e: function (message) {console.error(message);},
        each: function () {
            // Log each arg on a separate console line so objs get a nice repr
            // NOTE: _.each(arguments, console.log); doesn't work, in case you were wondering
            _.each(arguments, function (arg) {
                console.log(arg);
            });
        }
    };
}

av.executeFunctionByName = function (functionName, context /*, args */) {
    // http://stackoverflow.com/a/4351575/116891  http://stackoverflow.com/questions/359788/how-to-execute-a-javascript-function-when-i-have-its-name-as-a-string
    var args = Array.prototype.slice.call(arguments, 2);
    var namespaces = functionName.split(".");
    var func = namespaces.pop();
    for (var i = 0; i < namespaces.length; i++) {
        context = context[namespaces[i]];
    }
    return context[func].apply(context, args);
};

// http://davidwalsh.name/javascript-clone
// importantly:
//  * plain data (integers, strings) not promoted to objects
//  * arrays not promoted to objects (thus they retain their .length property)
// remains to be seen whether objects get cloned nicely (retaining their methods)
av.clone = function (src) {
    function mixin(dest, source, copyFunc) {
        var name, s, i, empty = {};
        for(name in source){
            // the (!(name in empty) || empty[name] !== s) condition avoids copying properties in "source"
            // inherited from Object.prototype.  For example, if dest has a custom toString() method,
            // don't overwrite it with the toString() method that source inherited from Object.prototype
            s = source[name];
            if(!(name in dest) || (dest[name] !== s && (!(name in empty) || empty[name] !== s))){
                dest[name] = copyFunc ? copyFunc(s) : s;
            }
        }
        return dest;
    }

    if(!src || typeof src != "object" || Object.prototype.toString.call(src) === "[object Function]"){
        // null, undefined, any non-object, or function
        return src; // anything
    }
    if(src.nodeType && "cloneNode" in src){
        // DOM Node
        return src.cloneNode(true); // Node
    }
    if(src instanceof Date){
        // Date
        return new Date(src.getTime()); // Date
    }
    if(src instanceof RegExp){
        // RegExp
        return new RegExp(src);   // RegExp
    }
    var r, i, l;
    if(src instanceof Array){
        // array
        r = [];
        for(i = 0, l = src.length; i < l; ++i){
            if(i in src){
                r.push(av.clone(src[i]));
            }
        }
        // we don't clone functions for performance reasons
        // UNCOMMENTED by MJR
    }
    else if(typeof source === 'function'){
        // function
        r = function(){ return src.apply(this, arguments); };
    }
    else{
        // generic objects
        r = src.constructor ? new src.constructor() : {}; //BUG Doesn't handle CSSStyleDeclaration types
    }
    return mixin(r, src, av.clone);

};

av.JsPlumbUtils = {

    // Only looking at unlocked vertices
    // Returns array of vertex objects
    getVertices: function (containerString) {
        // TODO: Figure out jquery way to use a selector and find sub-classes
        var verticesSelector = $( sprintf('%s .vertex', containerString) ),
            vtxObjs = [],
            vtxObj = null;
        _.each(verticesSelector, function (vtx) {
            // Note: css positions are strings with units, e.g. left="245px"
            // BUG: the clone function (in common.js) doesn't work on CSSStyleDeclaration types (vtx.style), so don't include it in the object
            vtxObj = {id: vtx.id, xcPos: vtx.style.left, ycPos: vtx.style.top};
            vtxObjs.push(vtxObj);
        });
        return vtxObjs;
    },

    // copied from test-interface2.html ; data element given id by spaulding "we'll need this to update the vertex costs"
    makeVertex: function ($container, vertex, locked, renderVertexContentsCallback) {
        var newdiv = document.createElement('div');
        var divid = vertex.id;

        $newdiv = $(newdiv);
        if (renderVertexContentsCallback) {
             var result = renderVertexContentsCallback(vertex,$newdiv);
             if (!_.isUndefined(result)){
                $newdiv.html(result);
             }
        } else {
            $newdiv.html(vertex.id); // i don't think .text() correctly displays infinities
        }

        $newdiv.attr('id', divid);
        var vclass = locked ? 'vertex-locked' : 'vertex';
        $newdiv.addClass(vclass);

        //TODO use x and y positions as center of div by shifting based off of bounding box of div. Might need to be done after appending (not sure when sizing occurs)
        var pos = $container.position();
        // TODO: change from DOM to jquery style for better interop
        newdiv.style.left = (vertex.xcPos + pos.left) + 'px';
        newdiv.style.top = (vertex.ycPos + pos.top) + 'px';
        newdiv.style.position = 'absolute'; // relative results in problems with multiple vtcs :(

        $container.append(newdiv);

        // It's odd, but we need to make this vx draggable before changing its mode or else 'move' mode won't work
        jsPlumb.draggable($newdiv, {containment: "parent"});
        jsPlumb.setDraggable($newdiv, false);

        return $newdiv; // Caller can use/abuse if she needs to, e.g. for adding events
    },

    makeConnection: function (src,tgt) {
        jsPlumb.connect({
            source:src,
            target:tgt
        });
    },

    drawGraph: function(container,G){
        var v = G.getVertices();
        var e = G.getEdges();

        for(i = 0; i < v.length; ++i){
            this.makeVertex(container,v[i],false);
        }
        for(i = 0; i < e.length; ++i){
            this.makeConnection(e[i].source.id, e[i].target.id);
        }
    },

    _inited: false,
    init: function () {
        if (av.JsPlumbUtils._inited) { return; }
        av.JsPlumbUtils._inited = true;
        jsPlumb.bind('ready', function() {
            jsPlumb.importDefaults({
                Connector: ["Straight", {stub: 2}],
                PaintStyle:{ lineWidth: 1, strokeStyle:"gray" },
                // HoverPaintStyle: { strokeStyle:"red" },
                // ConnectorZIndex:-1, // Hides hover effect but also 'click' event so edges cannot be labeled
                Endpoint: "Blank",
                EndpointStyle:{ fillStyle:"black" },
                ConnectionOverlays: [
                    [ "PlainArrow", {width: 8, length:8, location:1, id:"arrow" } ]
                ],
                // Anchors: [ "RightMiddle", "TopCenter" ]
                Anchor: "Continuous"
            });
        });
    },

    clear: function () {
// http://jsplumb.org/doc/usage.html
// Removes every Endpoint managed by this instance of jsPlumb, deleting all Connections. This is the same as jsPlumb.reset(), effectively, but it does not clear out the event listeners list.
// jsPlumb.removeEveryEndpoint();

// Deletes the given Endpoint and all its Connections.
// jsPlumb.deleteEndpoint(endpoint);

// Removes every endpoint, detaches every connection, and clears the event listeners list. Returns jsPlumb instance to its initial state.
// jsPlumb.reset();
        // jsPlumb.removeEveryEndpoint(); // v1.3.14
        jsPlumb.reset(); // v1.3.16+
        //NOTE: Doesn't seem to reset jsplumb defaults, so we don't need to re-import
    }
};

av.OtherUtil = {
    toggleVertexLock: function(tag,locked){
        var ClassRegLocked = new RegExp('(\\s|^)'+'vertex-locked'+'(\\s|$)');
        var ClassRegUnlocked = new RegExp('(\\s|^)'+'vertex'+'(\\s|$)');
        var el = document.getElementById(tag);
        if (el) {
            if (el.className.match(ClassRegLocked)) {
                el.className=el.className.replace(ClassRegLocked,'');
            }
            if (el.className.match(ClassRegUnlocked)) {
                el.className=el.className.replace(ClassRegUnlocked,'');
            }
            if (locked) {
                el.className += el.className ? ' vertex-locked' : 'vertex-locked';
            } else {
                el.className += el.className ? ' vertex' : 'vertex';
            }
        }
    },

    lockGraph: function(){
        graph_lock = true;
        var cs = jsPlumb.getConnections();
        var vertices = {};
        for (var i = 0; i < cs.length; i++) {
            vertices[cs[i].sourceId] = true;
            vertices[cs[i].targetId] = true;
        }
        for (var tag in vertices) {
            this.toggleVertexLock(tag,true);
        }
    },

    setVertexData: function(tag,d){
        var el = document.getElementById(tag + 'd');
        if (d === Infinity) d = "&#8734;";
        if (d === 'inf') d = "&#8734;";
        if (d === undefined || d === "") d = "&nbsp;";
        el.innerHTML = d;
    },

    convertPseudoCode: function(container)
    {
        var con = document.getElementById(container);
        var code = con.childNodes[1];
        var lines = code.innerHTML.split(/\r\n|\r|\n/);
        con.innerHTML = '';
        this.addPseudoCodeHeader(con,lines[0]);
        for (var i = 1; i < lines.length; i++) {
            this.addPseudoCodeLine(con,i,lines[i]);
        }
    },

    addPseudoCodeHeader: function(con,text){
        var linediv = document.createElement('div');
        var divLine = 'codeheader';

        linediv.setAttribute('id', divLine);
        linediv.setAttribute('class', "pseudocode-header");
        linediv.innerHTML = text.replace(/\s/g, '&nbsp;');
        con.appendChild(linediv);
    },

    addPseudoCodeLine: function(con, num, text){
        var linediv = document.createElement('div');
        var bpdiv = document.createElement('div');
        var lnumdiv = document.createElement('div');
        var textdiv = document.createElement('div');

        var divLine = 'l' + num;
        var divBreakPoint = 'b' + num;
        var divLineNum = 'n' + num;
        var divText = 't' + num;

        linediv.setAttribute('id', divLine);
        bpdiv.setAttribute('id', divBreakPoint);
        lnumdiv.setAttribute('id', divLineNum);
        textdiv.setAttribute('id', divText);

        linediv.setAttribute('class', "pseudocode-line linewrapper");
        bpdiv.setAttribute('class', "break-point");
        lnumdiv.setAttribute('class', "pseudocode-line-number");
        textdiv.setAttribute('class', "pseudocode-line-text");

        lnumdiv.innerHTML = num;
        textdiv.innerHTML = text.replace(/\s/g, '&nbsp;');
        con.appendChild(linediv);
        linediv.appendChild(bpdiv);
        linediv.appendChild(lnumdiv);
        linediv.appendChild(textdiv);
        //el.innerHTML += '<br />';

        //$("#" + divBreakPoint).click(function(e) { av.Highlighting.toggleBreakPoint(divBreakPoint); });

        //$("#" + divText).click(function(e) { av.Highlighting.toggleCodeHighlight(divText); });
    }
};

av.Highlighting = {
    //tag is the id of the vertex
    //state 0 means no highlights, 1 = highlight, 2 = selected
    repaintVertex: function(tag, state) {
        if (!state) {state = '';}
        var ClassRegHighlighted = new RegExp('(\\s|^)'+'highlighted'+'(\\s|$)');
        var ClassRegSelected = new RegExp('(\\s|^)'+'selected'+'(\\s|$)');
        var el = document.getElementById(tag);
        if (el) {
            if (el.className.match(ClassRegHighlighted)) {
                el.className=el.className.replace(ClassRegHighlighted,'');
            }
            if (el.className.match(ClassRegSelected)) {
                el.className=el.className.replace(ClassRegSelected,'');
            }
            if (state === 'highlighted') {
                el.className += el.className ? ' highlighted' : 'highlighted';
            }
            if (state === 'selected') {
                el.className += el.className ? ' selected' : 'selected';
            }
        }
    },

    //deprecated will use the render method from vizulizer
    repaintEdge: function(src,tgt,highlighted){
        if(highlighted){
            jsPlumb.select({source:src, target:tgt}).setPaintStyle({ strokeStyle:"yellow", lineWidth:1.5 });
        } else {
            jsPlumb.select({source:src, target:tgt}).setPaintStyle({ strokeStyle:"black", lineWidth:1.5 });
        }
    },

    //deprecated will use the render method from vizulizer
    applyHighlights: function(frame) {
    //TODO: update to take 2 graph models and check for differences
    // will ideally update highlight type classes on the divs
    // will ideally make the absolute minimum calls to jsPlume and use
    // the render functions that the vizulizer is fed at creation
        for (var i = 0, vertex; vertex = graph_frames[frame].vertex[i]; i++){
            this.repaintVertex(vertex[0],vertex[1]);
            av.OtherUtil.setVertexData(vertex[0],vertex[2]);
        }

        for (var i = 0, edge; edge = graph_frames[frame].edge[i]; i++){
            this.repaintEdge(edge[0],edge[1],edge[2]);
        }
    },

    toggleBreakPoint: function(tag){
        //alert('called code highlight');
        var ClassRegHighlighted = new RegExp('(\\s|^)'+'on'+'(\\s|$)');
        var el = document.getElementById(tag);
        if (el) {
            if (el.className.match(ClassRegHighlighted)) {
                el.className=el.className.replace(ClassRegHighlighted,'');
            } else {
                el.className += el.className ? ' on' : 'on';
            }
        }
    },

    toggleCodeHighlight: function(tag){
        var ClassRegHighlighted = new RegExp('(\\s|^)'+'highlighted'+'(\\s|$)');
        var el = document.getElementById(tag);
        if (el) {
            if (el.className.match(ClassRegHighlighted)) {
                el.className=el.className.replace(ClassRegHighlighted,'');
            } else {
                el.className += el.className ? ' highlighted' : 'highlighted';
            }
        }
    }
};

av.HardcodedInputter = function (o) {
    this.getInput = function () {
        // Return a deep clone of the original object
        return o;
    };
};

av.PromptInputter = function (promptText, reprompt) {
    // Reprompt is for when the user resets the av: should execute prompt them for values again, or should it use the original values
    this.userInput = null;
    this.reprompt = _.isUndefined(reprompt) ? true : reprompt;
    this.getInput = function () {
        if (_.isNull(this.userInput) || this.reprompt) {
            this.userInput = prompt(promptText);
        }
        return this.userInput;
    };
};

av.DelimitedTextToArrayInputter = function (inputter, delimiter, mapFunc) {
    if (delimiter === 'whitespace') {
        delimiter = /\s+/g;
    }
    if (_.isString(delimiter)) {
        delimiter = RegExp(delimiter, 'g');
    }
    if (!_.isRegExp(delimiter)) {
        throw Error('DelimitedTextToArray.getInput ended up with a non-regex delimiter: '+delimiter);
    }
    this.delimiter = delimiter;
    this.getInput = function () {
        var rawInput = _.string.trim(inputter.getInput());
        if (!rawInput) { return []; }
        var arr = rawInput.split(this.delimiter);
        if (!_.isUndefined(mapFunc)) {
            arr = _.map(arr, mapFunc);
        }
        return arr;
    };
};

av.ConsoleViewer = function (args) {
    this.args = args;
    this.render = function (o) {
        console.log(this.args);
        console.log(o);
    };
    this.clear = function () {
        console.log('clear called');
    };
    this.unrender = function () {
        console.log('unrender called');
    };
};

// Underscore library addition - zip like python does, dominated by the shortest list
//  The default injects undefineds to match the length of the longest list.
_.mixin({
    zipShortest: function () {
        var args = Array.prototype.slice.call(arguments);
        var length = _.min(_.pluck(args, 'length')); // changed max to min
        var results = new Array(length);
        for (var i = 0; i < length; i++) {
            results[i] = _.pluck(args, "" + i);
        }
        return results;
    },
    deepClone: function (o) {
        return av.clone(o);
    },
    pluckToObject: function (list, propertyName) {
        /// like _.pluck, but instead of just returning a list of the property names, use them as keys in an object where the values are the original objects themselves
        /// Example:
        /// > vs = [{id: 'v1'}, {id: 'v2'}]
        /// > _.reduce(vs, function (memo, v) { memo[v.id] = v; return memo; }, {})
        /// Object {v1: Object, v2: Object}
        return _.object(_.pluck(list, propertyName), list);
        // Also works:
        // return _.reduce(list, function (memo, v) { memo[v[propertyName]] = v; return memo; }, {});
    }
});