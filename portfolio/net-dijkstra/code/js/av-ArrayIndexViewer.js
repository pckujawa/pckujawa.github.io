"using strict";

var av = av || {};
// notes:
// when redrawing (or clearing out) things:
//      first, everyone has unrender called
//      then, everyone has render called on the new data
// this gives a chance for stuff like jsplumb edges between different viewer displays to get detached (in case the endpoints get deleted)

// visualizes an array index variable that points into an existing array visualization
av.ArrayIndexViewer = function (args) {
    this.container = $('#'+args.container);
    this.arrows = args.arrows === undefined ? true : args.arrows;
    this.cssClass = args.cssClass;
    this.label = args.label;
    this.parents = _.isArray(args.parent) ? args.parent : [args.parent];

    this.render = function(data) {
        if (data === undefined)
            return;

        for (var i=0; i < this.parents.length; i++) {
            var parentid = sprintf("%s-cell%s", this.parents[i], data);

            if (this.arrows && this.arrows != "above")
                this._drawArrow(parentid);
            if (this.arrows == "above")
                this._drawAbove(this.parents[i], data, this.label);
            if (this.cssClass !== undefined)
                $("#" + parentid).addClass( this.cssClass );
        }
    };
    this._drawArrow = function(tgt) {
        jsPlumb.connect({
            source: this.container,
            target: tgt
        });
    };
    this._drawAbove = function(par, data, label) {
        var elt = $("#" + par + " .arr-pointers td:eq(" + data + ")");
        if (elt.html() === "") {
            elt.html(label);
            elt.addClass("active");
        } else
            elt.html( elt.html() + "," + label ); // e.g. "i,j"
    };

    this.unrender = function() {
        jsPlumb.select({source: this.container}).detach();
//      should we remove cssClass too?
    };
    this.clear = function() {
        jsPlumb.select({source: this.container}).detach();
    };
}
