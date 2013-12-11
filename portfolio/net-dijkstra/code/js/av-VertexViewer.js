"using strict";
var av = av || {};
// notes:
// when redrawing (or clearing out) things:
//      first, everyone has unrender called
//      then, everyone has render called on the new data
// this gives a chance for stuff like jsplumb edges between different viewer displays to get detached (in case the endpoints get deleted)

// What power should the viewer have? Do we want to modify the graph (edges, nodes) or just modify the data inside/pertaining to this node?
av.VertexViewer = function (args) {
    this.parent = args.parent; // TODO: not used (because vertex divs are given globally unique ids ????)
    this.cssClass = args.cssClass;
    this.depends = args.depends;
    this.label = args.label; // TODO: deprecated?

    this.render = function(vertexModel) {
        if (vertexModel && !_.isUndefined(this.cssClass)) {
            this.current = $("#" + vertexModel.id);
            this.current.addClass( this.cssClass );
        }
    };

    this.unrender = function() {
        if (!_.isUndefined(this.current))
            this.current.removeClass(this.cssClass);
    };

    this.clear = function() {};
};
