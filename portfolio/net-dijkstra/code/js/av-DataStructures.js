"using strict";
var av = av || {};
av.PriorityQueue = function (unique, sortprop){

    this.unique = unique || false;
    this.sortprop = sortprop || 'dist';
    this.list = [];

    this.sortme = function (){
        //this.list.sort();
    }

    this.enqueue = function (e){
        if (this.unique && this.contains(e)) { return false; }
        this.list.push(e);
        //this.sortme();
        return true;
    };

    this.dequeue = function (){
        if (this.list.length <= 0) { return null; }
        var min = this.list[0];
        for (var i = 0; i < this.list.length; i++) {
            if (parseInt(this.list[i][this.sortprop], 10) < parseInt(min[this.sortprop], 10)) {
                min = this.list[i];
            }
        }
        this.remove(min);
        return min;
    };

    this.remove = function (obj){
        for (var i = 0; i < this.list.length; i++) {
            if (this.list[i] === obj) {
                this.list.splice(i,1);
                break;
            }
        }
    };

    this.removeat =  function (index){
        this.list.splice(index,1);
    };

    this.contains = function (obj) {
        for (var i = 0; i < this.list.length; i++) {
            if (this.list[i] === obj) {
                return true;
            }
        }
        return false;
    };

    this.size = function(){
        return this.list.length;
    };
};