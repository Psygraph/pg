
function dialog() {
    page.call(this, "dialog");
}

dialog.prototype = Object.create(page.prototype);
dialog.prototype.constructor = dialog;

dialog.prototype.update = function(show) {
}
dialog.prototype.settings = function() {
}
dialog.prototype.help = function() {
    return "Modal dialog.";
}

UI.dialog = new dialog();
//# sourceURL=dialog.js
