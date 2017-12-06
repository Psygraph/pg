// INITIALIZE JQUERY DATEBOX
var jtopts = {
    'en': {
        setDateButtonLabel: "Set Date",
        setTimeButtonLabel: "Set Time",
        setDurationButtonLabel: "Set Duration",
        todayButtonLabel: "Jump to Today",
        titleDateDialogLabel: "Set Date",
        titleTimeDialogLabel: "Set Time",
        daysOfWeek: [
            "Sunday", "Monday", "Tuesday", "Wednesday",
            "Thursday", "Friday", "Saturday"
        ],
        daysOfWeekShort: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
        monthsOfYear: [
            "January", "February", "March",
            "April", "May", "June",
            "July", "August", "September",
            "October", "November", "December"
        ],
        monthsOfYearShort: [
            "Jan", "Feb", "Mar",
            "Apr", "May", "Jun",
            "Jul", "Aug", "Sep",
            "Oct", "Nov", "Dec"
        ],
        durationLabel: ["Days", "Hours", "Minutes", "Seconds"],
        durationDays: ["Day", "Days"],
        tooltip: "Open Duration Picker",
        nextMonth: "Next Month",
        prevMonth: "Previous Month",
        timeFormat: 24, //12
        headerFormat: "%A, %B %-d, %Y",
        dateFieldOrder: ["m", "d", "y"],
        timeFieldOrder: ["h", "i", "a"],
        slideFieldOrder: ["y", "m", "d"],
        dateFormat: "%j:%H:%M:%S", // "%j:%H:%M:%S",
        useArabicIndic: false,
        isRTL: false,
        calStartDay: 0,
        clearButton: "clear",
        durationOrder: ["d", "h", "i", "s"],
        meridiem: ["AM", "PM"],
        timeOutput: "%k:%M", // 12hr: "%l:%M %p", 24hr: "%k:%M",
        durationFormat: "%Dd:%Dl:%DM:%DS", //"%Dd %DA, %Dl:%DM:%DS",
        calDateListLabel: "Other Dates",
        calHeaderFormat: "%B %Y",
        tomorrowButtonLabel: "Jump to Tomorrow"
    }
};

//jQuery.extend(jQuery.jtsage.datebox.prototype.options.lang, jtopts);
//jQuery.extend(jQuery.jtsage.datebox.prototype.options, {useLang: 'en'});

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
