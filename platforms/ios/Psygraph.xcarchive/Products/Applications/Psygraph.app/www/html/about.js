
function about() {
    page.call(this, "about");

    // create the guesser
    this.AI = new pSeries([new pTDL(1,4), new pARMA(4,1)]);
    this.trials = new Arr();
};

about.prototype = Object.create(page.prototype);
about.prototype.constructor = about;

about.prototype.update = function(show) {
    if(!show)
        return;
    this.trials = new Arr();
    this.resize();
};

about.prototype.settings = function() {
    if(arguments.length) {
    }
    else {
	    return {version:1};
    }
};

about.prototype.resize = function() {
    var head    = $("#" + this.name + "_header").outerHeight(true);
    var foot    = $("#" + this.name + "_footer").outerHeight(true);
    var win     = getWindowDims();
    var height  = win.height - (head);
    var width   = win.width;
    $("#aboutDiv").css({
            top:    head-1, 
            height: height
            });
};

about.prototype.lever = function(arg) {
    if(arg=="left") {
        this.press(-1);
    }
    else if(arg=="right") {
        this.press(1);
    }
};

about.prototype.press = function(value) {
    var guess = this.AI.roundedOutput()[0];
    this.AI.input([value]);
    var correct = (guess == value);
    
    this.trials.push(correct?0:1);
    var len = this.trials.length;
    var ratio = {all: this.trials.sum()/len};
    var maLen = 10;
    if(len > maLen) {
        ratio.some    = Arr.fromArray(this.trials.slice(len-maLen,len)).sum()/maLen;
        ratio.someLen = maLen;
    }
    if(correct) {
        setFeedbackText("PREDICTED", ratio);
        pgAudio.giveFeedback(false);
    }
    else {
        setFeedbackText("RANDOM", ratio);
        pgAudio.giveFeedback(true);
    }    
    function setFeedbackText(txt, ratio) {
        var html = "<p><h2>" + txt + "</h2></p>";
        html += "<p>Your score: "+(ratio.all*2*100).toFixed(2)+"</p>";
        if(ratio.someLen)
            html += "<p>Your recent ("+ratio.someLen+" trial) score: "+(ratio.some*2*100).toFixed(2)+"</p>";
        $("#feedback").html(html);
    }
};

UI.about = new about();
//# sourceURL=about.js
