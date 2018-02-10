
function About() {
    Page.call(this, "about");

    // create the guesser
    this.AI = new pSeries([new pTDL(1,4), new pARMA(4,1)]);
    this.trials = new Arr();
    //this.scrollbar = tinyscrollbar($("#about_main")[0]);
}

About.prototype = Object.create(ButtonPage.prototype);
About.prototype.constructor = About;

About.prototype.update = function(show) {
    if(!show)
        return;
    this.trials = new Arr();
    this.resize();
};

About.prototype.settings = function() {
    if(arguments.length) {
    }
    else {
	    return {version:1};
    }
};

About.prototype.resize = function() {
    var head    = this.headerHeight();
    var foot    = 0;//$("#" + this.name + "_footer").outerHeight(true);
    var win     = pgUI.getWindowDims();
    var height  = win.height - (head);
    var width   = win.width;
    $("#aboutDiv").css({
            top:    head-1,
            height: height,
            position: "absolute"
    });
    //this.scrollbar.update();
};

About.prototype.start = function(restart) {
    //buttonPage.prototype.start.call(this,restart);
    this.press(1);
};
//about.prototype.stop = function() {
//};
About.prototype.reset = function() {
    this.press(-1);
};

About.prototype.press = function(value) {
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
        pgAudio.reward(false);
    }
    else {
        setFeedbackText("RANDOM", ratio);
        pgAudio.reward(true);
    }    
    function setFeedbackText(txt, ratio) {
        var html = "<p><h2>" + txt + "</h2></p>";
        html += "<p>Your score: "+(ratio.all*2*100).toFixed(2)+"</p>";
        if(ratio.someLen)
            html += "<p>Your recent ("+ratio.someLen+" trial) score: "+(ratio.some*2*100).toFixed(2)+"</p>";
        $("#feedback").html(html);
    }
};

UI.about = new About();
//# sourceURL=about.js
