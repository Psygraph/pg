
function getWindowDims(current) {
    current = typeof(current)!="undefined" ? current : true;
    var win = {};
    if(!current && (
        Math.abs(window.orientation)==90 ||
        Math.abs(window.orientation)==-90 )) {
        win.width  = $(window).height(); 
        win.height = $(window).width();
    }
    else {
        // these are "pre-rotated"
        win.width  = $(window).width();
        win.height = $(window).height();
    }
    return win;
}
