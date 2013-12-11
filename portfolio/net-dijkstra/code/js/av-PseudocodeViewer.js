"using strict";
var av = av || {};
av.PseudocodeViewer = function (args) {
    this.container = $('#'+args.container); // Assumes not prefixed by hash
    this.cssClass = args.cssClass;
    this.label = args.label;
    this.renderBreakPoints = args.renderBreakPoints;
    this.renderCodeLines = arge.renderCodeLines;

    this.render = function(PCM) {
    	//loop through model and add the divs to container
    };

    this.clear = function () {
        this.container.html('');
    }; 
};