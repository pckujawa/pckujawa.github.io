"using strict";

var av = av || {};
// notes:
// when redrawing (or clearing out) things:
//      first, everyone has unrender called
//      then, everyone has render called on the new data
// this gives a chance for stuff like jsplumb edges between different viewer displays to get detached (in case the endpoints get deleted)
// visualizes an array with cells that we can point stuff at
av.ArrayViewer = function (args) {
    this.containerId = args.container;
    this.container = $('#'+args.container);
    this.renderContents = args.renderContents
        ? args.renderContents
        : function(d) { 
            if (d === Infinity) d = "&#8734;";
            if (d === undefined || d === "") d = "&nbsp;";
            return d;
          };

    this.render = function(data) {
        var html;
        if (data.length == 0) {
            html = "<div class='arr-empty'>[empty]</div>";
        } else {
            var pointers = "";
            var cells = "";
            for(var i = 0; i < data.length; i++) {
                pointers += "<td></td>";
                cells += sprintf(
                            "<td id='%s-cell%s'><div class='arr-index'>%s:</div>%s</div>",
                            this.containerId, i, i, this.renderContents( data[i] )
                        );
            }
            html = "<table class='arr-viewer' cellspacing=0>"
                 + "<tr class='arr-pointers'>" + pointers + "</tr>"
                 + "<tr class='arr-cells'>" + cells + "</tr></table>";
        }

        this.container.html(html);
    };
    this.clear = function() {
        this.container.html("");
    };
}
