"using strict";
var av = av || {};

av.Visualizer = function (args) {
    this.vars = {};
    this.frames = [];
    this.current = 0;
    this.generatedAndNotYetCleared = false;
    this.pseudocode = args.pseudocode;
    this.varViewers = args.varViewers; // TODO Convert all to arrays if not already to ease acting on viewers
    this.inputters = args.inputters;
    this.generateViz = args.generateViz;

    $("#" + args.controls).html(
        '<input type=submit value="eXecute" id="generate" accesskey="x">' + // Alt+E is used by chrome
        '<input type=submit value="reset" id="clear">' +
        '<input type=submit value="&lt; Prev" id="prev" accesskey="p">' +
        '<input type=submit value="Next &gt" id="next" accesskey="n">' +
        '<input type=submit value="Last &gt&gt" id="last">'
    );

    // click event dispatcher sets "this" to be the DOM element that was clicked
    var self = this;
    this.$nextButton = $("#next");
    this.$nextButton.click(function(){ self.nextFrame() ;} );
    this.$prevButton = $("#prev");
    this.$prevButton.click(function(){ self.prevFrame() ;} );
    $("#clear").click(function(){ self.clear()     ;} );
    $("#generate").click(function(){ self.generate()  ;} );
    this.$lastButton = $('#last').click( function () { self.goToLastFrame(); });

    this.generate = function() {
        //TODO: Add checkbox/flag for whether or not to clear when generate is clicked.
        //  One situation where we don't want to clear is if the user drew a graph
        // and wants to reuse it but maybe with different values.
        // By default the first run doesn't clear a drawn graph (because it doesn't clear at all), but subsequent calls will.
        if (this.generatedAndNotYetCleared) {
            this.clear();
        }

        // every variable that has a varViewer registered should exist
        // in the .vars object, so that "with (viz.vars) { ... }" always
        // captures the relevant variables
        for (var v in this.varViewers)
            this.vars[v] = undefined;


        // Get input from inputters and place in vars objects
        for (var inp in this.inputters) {
            if (this.inputters.hasOwnProperty(inp)) {
                this.vars[inp] = this.inputters[inp].getInput();
            }
        }

        this.generateViz(this);
        this.generatedAndNotYetCleared = true;
        this.showFrame();
    };

    this.clear = function() {
        //TODO If the .vars attribute holds references and they've been modified,
        //  e.g. by adding .seen to a vertex, then we need a way to clear the
        //  models in the inputters. Either that or make sure inputters only return copies. #discuss

        // // We call unrender to do things like remove attributes from vertices (.active, etc)
        // //  If we didn't, calling generate again would give us the same vertices
        // this._actOnViewers(this.varViewers, 'unrender');
        this._actOnViewers(this.varViewers, 'clear');
        this._actOnInputters(this.inputters, 'clear'); // Inputter can optionally implement .clear
        this.highlightPseudocode(-1);
        this.frames.length = 0; // http://stackoverflow.com/questions/1232040/how-to-empty-an-array-in-javascript
        this.current = 0;
        this.vars = {};
        this._checkAndSetPrevNextButtonState();
        this.generatedAndNotYetCleared = false;
    };

    this.snapshot = function (codeline) {
        // When we take a snapshot, we must copy all variables. If we didn't, the algo would be making modifications to supposedly 'frozen' values. Bugs may exist here when the variables have shared references or are other complicated, nested objects, so be warned.
        var frame = { "_line": codeline };
        for (var v in this.varViewers) {
            frame[v] = av.clone( this.vars[v] );
        }
        this.frames.push(frame);
    };

    this.showFrame = function () {
        var frame = this.frames[this.current];
        if (_.isUndefined(frame)) {
            throw Error('showFrame called but the current frame is undefined');
        }
        this._actOnViewers(this.varViewers, 'unrender');
        this._actOnViewers(this.varViewers, 'render');
        this.highlightPseudocode( frame._line );
        this._checkAndSetPrevNextButtonState();
    };

    this._checkAndSetPrevNextButtonState = function () {
        var that = this;
        this.$prevButton.attr('disabled', that.current <= 0);
        // if (this.current <= 0) {
        //     this.$prevButton.attr('disabled', true);
        // } else {
        //     this.$prevButton.attr('disabled', false);
        // }

        _.each([this.$nextButton, this.$lastButton], function ($button) {
            $button.attr('disabled', that.current >= that.frames.length-1);
        });

        // this.$nextButton.attr('disabled', that.current >= that.frames.length-1);
        // this.$lastButton.attr('disabled', that.current >= that.frames.length-1);
        // if (this.current >= this.frames.length-1) {
        //     this.$nextButton.attr('disabled', true);
        // } else {
        //     this.$nextButton.attr('disabled', false);
        // }
    };
    this._checkAndSetPrevNextButtonState(); // call on init

    /**
        Iterates through viewers (and single next layer of sub-viewers, if array) and calls the function by the name of the argument string on each.
      */
    this._actOnViewers = function (viewers, strAction) {
        var frame = this.frames[this.current];
        if (_.isUndefined(frame)) {return;}
        for (var v in viewers) {
            if (!viewers.hasOwnProperty(v)) {continue;}
            // TODO: viewers should handle undefined vars in their own fashion,
            //  (e.g. teardown, ignore)
            if (frame[v] === undefined && strAction === 'render') {
                // Log.w('there is an undefined variable in the frame by the name: ' + v);
                // NOTE: We're ok with having a viewer for a nonexistent variable because the var
                //  will probably show up later (e.g. in the scope of a loop)
                continue;
            }
            if (_.isArray(viewers[v])) {
                // NOTE: I tried to do this recursively but was having problems closing around the name
                //  of the variable (it was getting overwritten by the recursive calls)
                this._actOnSubViewers(viewers[v], strAction, v);
            } else {
                viewers[v].hasOwnProperty(strAction) &&
                    av.executeFunctionByName(strAction, viewers[v], frame[v]);
            }
        }
    };

    this._actOnSubViewers = function (viewers, strAction, varName) {
        var frame = this.frames[this.current];
        for (var v in viewers) {
            if (!viewers.hasOwnProperty(v)) {continue;}
            viewers[v].hasOwnProperty(strAction) &&
                av.executeFunctionByName(strAction, viewers[v], frame[varName]);
        }
    };

    this._actOnInputters = function (inputters, strAction) {
        for (var attr in inputters) {
            if (!inputters.hasOwnProperty(attr)) {continue;}
            // #discuss having inputters be arrays a la viewers - seems like an invitation to conflict
            inputters[attr].hasOwnProperty(strAction) &&
                av.executeFunctionByName(strAction, inputters[attr]);
        }
    };

    this.highlightPseudocode = function (codelineOneIndexed) {
        var $lines = $("#" + this.pseudocode + " .pseudocode-line");
        $lines.removeClass("highlighted");
        if (codelineOneIndexed > 0) {
            var $line = $("#" + this.pseudocode + " .pseudocode-line:eq(" + (codelineOneIndexed-1) + ")");
            $line.addClass("highlighted");
        }
    };

    this.nextFrame = function() {
        this.current = this.current < this.frames.length ?
            this.current + 1:
            this.frames.length - 1;
        this.showFrame();
    };

    this.prevFrame = function() {
        this.current = this.current > 0 ?
            this.current - 1:
            0;
        this.showFrame();
    };

    this.goToLastFrame = function () {
        this.current = this.frames.length - 1;
        this.showFrame();
    };
};
