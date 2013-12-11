"using strict";
var av = av || {};

// can be used to display something plain like a string or int
av.BasicViewer = function (args) {
    this.container = $('#'+args.container);
    this.render = function(data) {
        this.container.html(data);
    };
    this.clear = function() {
        this.container.html("");
    };
};
