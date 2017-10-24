/*
 * JTSage-DateBox
 * For: jqm; With: flipbox
 * Date: 2017-01-23T18:24:11.144Z
 * http://dev.jtsage.com/DateBox/
 * https://github.com/jtsage/jquery-mobile-datebox
 *
 * Copyright 2010, 2017 JTSage. and other contributors
 * Released under the MIT license.
 * https://github.com/jtsage/jquery-mobile-datebox/blob/master/LICENSE.txt
 *
 */

(function($) {
    $.widget("jtsage.datebox", {
        initSelector: "input[data-role='datebox']",
        options: {
            version: "4.1.0",
            jqmVersion: "1.4.5",
            bootstrapVersion: "3.3.7",
            jqmuiWidgetVersion: "1.11.4",
            theme: false,
            themeDefault: "a",
            themeHeader: "a",
            themeSetButton: "a",
            themeCloseButton: "a",
            mode: false,
            transition: "fade",
            useAnimation: true,
            hideInput: false,
            hideContainer: false,
            lockInput: true,
            zindex: "1100",
            clickEvent: "vclick",
            clickEventAlt: "click",
            useKinetic: true,
            defaultValue: false,
            showInitialValue: false,
            linkedField: false,
            linkedFieldFormat: "%J",
            popupPosition: false,
            popupButtonPosition: "left",
            popupForceX: false,
            popupForceY: false,
            useModal: true,
            useModalTheme: "b",
            useInline: false,
            useInlineBlind: false,
            useHeader: true,
            useImmediate: false,
            useButton: true,
            buttonIcon: false,
            useFocus: false,
            useSetButton: true,
            useCancelButton: false,
            useTodayButton: false,
            useTomorrowButton: false,
            useClearButton: false,
            useCollapsedBut: false,
            usePlaceholder: false,
            beforeOpenCallback: false,
            beforeOpenCallbackArgs: [],
            openCallback: false,
            openCallbackArgs: [],
            closeCallback: false,
            closeCallbackArgs: [],
            startOffsetYears: false,
            startOffsetMonths: false,
            startOffsetDays: false,
            afterToday: false,
            beforeToday: false,
            notToday: false,
            maxDays: false,
            minDays: false,
            maxYear: false,
            minYear: false,
            blackDates: false,
            blackDatesRec: false,
            blackDays: false,
            whiteDates: true,
            minHour: false,
            maxHour: false,
            minTime: false,
            maxTime: false,
            maxDur: false,
            minDur: false,
            minuteStep: 1,
            minuteStepRound: 0,
            rolloverMode: {
                m: true,
                d: true,
                h: true,
                i: true,
                s: true
            },
            useLang: "default",
            lang: {
                "default": {
                    setDateButtonLabel: "Set Date",
                    setTimeButtonLabel: "Set Time",
                    setDurationButtonLabel: "Set Duration",
                    todayButtonLabel: "Jump to Today",
                    tomorrowButtonLabel: "Jump to Tomorrow",
                    titleDateDialogLabel: "Set Date",
                    titleTimeDialogLabel: "Set Time",
                    daysOfWeek: [ "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" ],
                    daysOfWeekShort: [ "Su", "Mo", "Tu", "We", "Th", "Fr", "Sa" ],
                    monthsOfYear: [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ],
                    monthsOfYearShort: [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ],
                    durationLabel: [ "Days", "Hours", "Minutes", "Seconds" ],
                    durationDays: [ "Day", "Days" ],
                    timeFormat: 24,
                    headerFormat: "%A, %B %-d, %Y",
                    tooltip: "Open Date Picker",
                    nextMonth: "Next Month",
                    prevMonth: "Previous Month",
                    dateFieldOrder: [ "m", "d", "y" ],
                    timeFieldOrder: [ "h", "i", "a" ],
                    slideFieldOrder: [ "y", "m", "d" ],
                    dateFormat: "%Y-%m-%d",
                    useArabicIndic: false,
                    isRTL: false,
                    calStartDay: 0,
                    clearButton: "Clear",
                    cancelButton: "Cancel",
                    durationOrder: [ "d", "h", "i", "s" ],
                    meridiem: [ "AM", "PM" ],
                    timeOutput: "%k:%M",
                    durationFormat: "%Dd %DA, %Dl:%DM:%DS",
                    calDateListLabel: "Other Dates",
                    calHeaderFormat: "%B %Y"
                }
            },
            themeDateToday: "b",
            themeDayHigh: "b",
            themeDatePick: "b",
            themeDateHigh: "b",
            themeDateHighAlt: "b",
            themeDateHighRec: "b",
            themeDate: "a",
            themeButton: "a",
            themeInput: "",
            themeClearButton: "a",
            themeCancelButton: "a",
            themeTomorrowButton: "a",
            themeTodayButton: "a",
            buttonIconDate: "calendar",
            buttonIconTime: "clock",
            disabledState: "ui-state-disabled",
            calNextMonthIcon: "plus",
            calPrevMonthIcon: "minus",
            btnCls: " ui-corner-all ui-btn ui-btn-",
            icnCls: " ui-btn-icon-notext ui-icon-",
            s: {
                cal: {
                    prevMonth: "{text}",
                    nextMonth: "{text}",
                    botButton: "<a href='#' class='{cls} {icon}' role='button'>{text}</a>"
                }
            },
            validHours: false,
            flen: {
                y: 25,
                m: 24,
                d: 40,
                h: 24,
                i: 30
            },
            durationStep: 1,
            durationSteppers: {
                d: 1,
                h: 1,
                i: 1,
                s: 1
            }
        },
        _getLongOptions: function(element) {
            var key, temp, returnObj = {}, prefix = "datebox", prefixLength = 7;
            for (key in element.data()) {
                if (key.substr(0, prefixLength) === prefix && key.length > prefixLength) {
                    temp = key.substr(prefixLength);
                    temp = temp.charAt(0).toLowerCase() + temp.slice(1);
                    if (temp !== "options") {
                        returnObj[temp] = element.data(key);
                    }
                }
            }
            return returnObj;
        },
        _setOption: function() {
            $.Widget.prototype._setOption.apply(this, arguments);
            this.refresh();
        },
        getOption: function(opt) {
            var i18nTester = this.__(opt);
            if (i18nTester !== "Err:NotFound") {
                return i18nTester;
            } else {
                return this.options[opt];
            }
        },
        _enhanceDate: function() {
            $.extend(this._date.prototype, {
                copy: function(adjust, override) {
                    adjust = $.extend([ 0, 0, 0, 0, 0, 0, 0 ], adjust);
                    override = $.extend([ 0, 0, 0, 0, 0, 0, 0 ], override);
                    return new Date(override[0] > 0 ? override[0] : this.get(0) + adjust[0], override[1] > 0 ? override[1] : this.get(1) + adjust[1], override[2] > 0 ? override[2] : this.get(2) + adjust[2], override[3] > 0 ? override[3] : this.get(3) + adjust[3], override[4] > 0 ? override[4] : this.get(4) + adjust[4], override[5] > 0 ? override[5] : this.get(5) + adjust[5], override[6] > 0 ? override[5] : this.get(6) + adjust[6]);
                },
                adj: function(type, amount) {
                    if (typeof amount !== "number" || typeof type !== "number") {
                        throw new Error("Invalid Arguments");
                    }
                    switch (type) {
                      case 0:
                        this.setD(0, this.get(0) + amount);
                        break;

                      case 1:
                        this.setD(1, this.get(1) + amount);
                        break;

                      case 2:
                        this.setD(2, this.get(2) + amount);
                        break;

                      case 3:
                        amount *= 60;

                      case 4:
                        amount *= 60;

                      case 5:
                        amount *= 1e3;

                      case 6:
                        this.setTime(this.getTime() + amount);
                        break;
                    }
                    return this;
                },
                setD: function(type, amount) {
                    switch (type) {
                      case 0:
                        this.setFullYear(amount);
                        break;

                      case 1:
                        this.setMonth(amount);
                        break;

                      case 2:
                        this.setDate(amount);
                        break;

                      case 3:
                        this.setHours(amount);
                        break;

                      case 4:
                        this.setMinutes(amount);
                        break;

                      case 5:
                        this.setSeconds(amount);
                        break;

                      case 6:
                        this.setMilliseconds(amount);
                        break;
                    }
                    return this;
                },
                get: function(type) {
                    switch (type) {
                      case 0:
                        return this.getFullYear();

                      case 1:
                        return this.getMonth();

                      case 2:
                        return this.getDate();

                      case 3:
                        return this.getHours();

                      case 4:
                        return this.getMinutes();

                      case 5:
                        return this.getSeconds();

                      case 6:
                        return this.getMilliseconds();
                    }
                    return false;
                },
                get12hr: function() {
                    if (this.get(3) === 0) {
                        return 12;
                    }
                    if (this.get(3) < 13) {
                        return this.get(3);
                    }
                    return this.get(3) - 12;
                },
                iso: function() {
                    var arr = [ 0, 0, 0 ], i = 0;
                    for (i = 0; i < 3; i++) {
                        arr[i] = this.get(i);
                        if (i === 1) {
                            arr[i]++;
                        }
                        if (arr[i] < 10) {
                            arr[i] = "0" + String(arr[i]);
                        }
                    }
                    return arr.join("-");
                },
                comp: function() {
                    return parseInt(this.iso().replace(/-/g, ""), 10);
                },
                getEpoch: function() {
                    return Math.floor(this.getTime() / 1e3);
                },
                getArray: function() {
                    var arr = [ 0, 0, 0, 0, 0, 0 ], i = 0;
                    for (i = 0; i < 6; i++) {
                        arr[i] = this.get(i);
                    }
                    return arr;
                },
                setFirstDay: function(day) {
                    this.setD(2, 1).adj(2, day - this.getDay());
                    if (this.get(2) > 10) {
                        this.adj(2, 7);
                    }
                    return this;
                },
                setDWeek: function(type, num) {
                    if (type === 4) {
                        return this.setD(1, 0).setD(2, 1).setFirstDay(4).adj(2, -3).adj(2, (num - 1) * 7);
                    }
                    return this.setD(1, 0).setD(2, 1).setFirstDay(type).adj(2, (num - 1) * 7);
                },
                getDWeek: function(type) {
                    var t1, t2;
                    switch (type) {
                      case 0:
                        t1 = this.copy([ 0, -1 * this.getMonth() ]).setFirstDay(0);
                        return Math.floor((this.getTime() - (t1.getTime() + (this.getTimezoneOffset() - t1.getTimezoneOffset()) * 6e4)) / 6048e5) + 1;

                      case 1:
                        t1 = this.copy([ 0, -1 * this.getMonth() ]).setFirstDay(1);
                        return Math.floor((this.getTime() - (t1.getTime() + (this.getTimezoneOffset() - t1.getTimezoneOffset()) * 6e4)) / 6048e5) + 1;

                      case 4:
                        if (this.getMonth() === 11 && this.getDate() > 28) {
                            return 1;
                        }
                        t1 = this.copy([ 0, -1 * this.getMonth() ], true).setFirstDay(4).adj(2, -3);
                        t2 = Math.floor((this.getTime() - (t1.getTime() + (this.getTimezoneOffset() - t1.getTimezoneOffset()) * 6e4)) / 6048e5) + 1;
                        if (t2 < 1) {
                            t1 = this.copy([ -1, -1 * this.getMonth() ]).setFirstDay(4).adj(2, -3);
                            return Math.floor((this.getTime() - t1.getTime()) / 6048e5) + 1;
                        }
                        return t2;

                      default:
                        return 0;
                    }
                }
            });
        },
        _ord: {
            "default": function(num) {
                var ending = num % 10;
                if (num > 9 && num < 21 || ending > 3) {
                    return "th";
                }
                return [ "th", "st", "nd", "rd" ][ending];
            }
        },
        _customformat: {
            "default": function() {
                return false;
            }
        },
        _formatter: function(format, date, allowArIn) {
            var w = this, o = this.options, tmp, dur = 0;
            if (typeof allowArIn === "undefined") {
                allowArIn = true;
            }
            if (o.mode.substr(0, 4) === "dura") {
                dur = w._dur(this.theDate.getTime() - this.initDate.getTime());
                if (!format.match(/%Dd/)) {
                    dur[1] += dur[0] * 24;
                }
                if (!format.match(/%Dl/)) {
                    dur[2] += dur[1] * 60;
                }
                if (!format.match(/%DM/)) {
                    dur[3] += dur[2] * 60;
                }
            }
            format = format.replace(/%(D|X|0|-)*([1-9a-zA-Z])/g, function(match, pad, oper) {
                if (pad === "X") {
                    if (typeof w._customformat[o.mode] !== "undefined") {
                        return w._customformat[o.mode](oper, date, o);
                    }
                    return match;
                }
                if (pad === "D") {
                    switch (oper) {
                      case "d":
                        return dur[0];

                      case "l":
                        return w._zPad(dur[1]);

                      case "M":
                        return w._zPad(dur[2]);

                      case "S":
                        return w._zPad(dur[3]);

                      case "A":
                        return w.__("durationDays")[dur[0] === 1 ? 0 : 1];

                      default:
                        return match;
                    }
                }
                switch (oper) {
                  case "a":
                    return w.__("daysOfWeekShort")[date.getDay()];

                  case "A":
                    return w.__("daysOfWeek")[date.getDay()];

                  case "b":
                    return w.__("monthsOfYearShort")[date.getMonth()];

                  case "B":
                    return w.__("monthsOfYear")[date.getMonth()];

                  case "C":
                    return parseInt(date.getFullYear() / 100);

                  case "d":
                    return w._zPad(date.getDate(), pad);

                  case "H":
                  case "k":
                    return w._zPad(date.getHours(), pad);

                  case "I":
                  case "l":
                    return w._zPad(date.get12hr(), pad);

                  case "m":
                    return w._zPad(date.getMonth() + 1, pad);

                  case "M":
                    return w._zPad(date.getMinutes(), pad);

                  case "p":
                  case "P":
                    tmp = w.__("meridiem")[date.get(3) < 12 ? 0 : 1].toUpperCase();
                    return oper === "P" ? tmp.toLowerCase() : tmp;

                  case "s":
                    return date.getEpoch();

                  case "S":
                    return w._zPad(date.getSeconds(), pad);

                  case "u":
                    return w._zPad(date.getDay() + 1, pad);

                  case "w":
                    return date.getDay();

                  case "y":
                    return w._zPad(date.getFullYear() % 100);

                  case "Y":
                    return date.getFullYear();

                  case "E":
                    return date.getFullYear() + 543;

                  case "V":
                    return w._zPad(date.getDWeek(4), pad);

                  case "U":
                    return w._zPad(date.getDWeek(0), pad);

                  case "W":
                    return w._zPad(date.getDWeek(1), pad);

                  case "o":
                    if (typeof w._ord[o.useLang] !== "undefined") {
                        return w._ord[o.useLang](date.getDate());
                    }
                    return w._ord["default"](date.getDate());

                  case "j":
                    tmp = new Date(date.getFullYear(), 0, 1);
                    tmp = "000" + String(Math.ceil((date - tmp) / 864e5) + 1);
                    return tmp.slice(-3);

                  case "J":
                    return date.toJSON();

                  case "G":
                    tmp = date.getFullYear();
                    if (date.getDWeek(4) === 1 && date.getMonth() > 0) {
                        return tmp + 1;
                    }
                    if (date.getDWeek(4) > 51 && date.getMonth() < 11) {
                        return tmp - 1;
                    }
                    return tmp;

                  case "g":
                    tmp = date.getFullYear % 100;
                    if (date.getDWeek(4) === 1 && date.getMonth() > 0) {
                        ++tmp;
                    }
                    if (date.getDWeek(4) > 51 && date.getMonth() < 11) {
                        --tmp;
                    }
                    return w._zpad(tmp);

                  default:
                    return match;
                }
            });
            if (w.__("useArabicIndic") === true && allowArIn === true) {
                format = w._dRep(format);
            }
            return format;
        },
        _minStepFix: function() {
            var newMinute = this.theDate.get(4), mstep = this.options.minuteStep, roundDirection = this.options.minStepRound, remainder = newMinute % mstep;
            if (mstep > 1 && remainder > 0) {
                if (roundDirection < 0) {
                    newMinute = newMinute - remainder;
                } else if (roundDirection > 0) {
                    newMinute = newMinute + (mstep - remainder);
                } else {
                    if (newMinute % mstep < mstep / 2) {
                        newMinute = newMinute - remainder;
                    } else {
                        newMinute = newMinute + (mstep - remainder);
                    }
                }
                this.theDate.setMinutes(newMinute);
            }
        },
        _check: function() {
            var td, year, month, date, i, tihm, w = this, o = this.options, now = this.theDate;
            w.dateOK = true;
            if (typeof o.mode === "undefined") {
                return true;
            }
            if (o.afterToday) {
                td = new w._date();
                if (now < td) {
                    now = td;
                }
            }
            if (o.beforeToday) {
                td = new w._date();
                if (now > td) {
                    now = td;
                }
            }
            if (o.maxDays !== false) {
                td = new w._date();
                td.adj(2, o.maxDays);
                if (now > td) {
                    now = td;
                }
            }
            if (o.minDays !== false) {
                td = new w._date();
                td.adj(2, -1 * o.minDays);
                if (now < td) {
                    now = td;
                }
            }
            if (o.minHour !== false) {
                if (now.get(3) < o.minHour) {
                    now.setD(3, o.minHour);
                }
            }
            if (o.maxHour !== false) {
                if (now.get(3) > o.maxHour) {
                    now.setD(3, o.maxHour);
                }
            }
            if (o.minTime !== false) {
                td = new w._date();
                tihm = o.minTime.split(":");
                td.setD(3, tihm[0]).setD(4, tihm[1]);
                if (now < td) {
                    now = td;
                }
            }
            if (o.maxTime !== false) {
                td = new w._date();
                tihm = o.maxTime.split(":");
                td.setD(3, tihm[0]).setD(4, tihm[1]);
                if (now > td) {
                    now = td;
                }
            }
            if (o.maxYear !== false) {
                td = new w._date(o.maxYear, 11, 31);
                if (now > td) {
                    now = td;
                }
            }
            if (o.minYear !== false) {
                td = new w._date(o.minYear, 0, 1);
                if (now < td) {
                    now = td;
                }
            }
            if (o.mode.substr(0, 4) === "time" || o.mode.substr(0, 3) === "dur") {
                if (o.mode === "timeflipbox" && o.validHours !== false) {
                    if ($.inArray(now.get(3), o.validHours) < 0) {
                        w.dateOK = false;
                    }
                }
            } else {
                if (o.blackDatesRec !== false) {
                    year = now.get(0);
                    month = now.get(1);
                    date = now.get(2);
                    for (i = 0; i < o.blackDatesRec.length; i++) {
                        if ((o.blackDatesRec[i][0] === -1 || o.blackDatesRec[i][0] === year) && (o.blackDatesRec[i][1] === -1 || o.blackDatesRec[i][1] === month) && (o.blackDatesRec[i][2] === -1 || o.blackDatesRec[i][2] === date)) {
                            w.dateOK = false;
                        }
                    }
                }
                if (o.blackDates !== false) {
                    if ($.inArray(now.iso(), o.blackDates) > -1) {
                        w.dateOK = false;
                    }
                }
                if (o.blackDays !== false) {
                    if ($.inArray(now.getDay(), o.blackDays) > -1) {
                        w.dateOK = false;
                    }
                }
                if (o.whiteDates !== false) {
                    if ($.inArray(w.theDate.iso(), o.whiteDates) > -1) {
                        w.dateOK = true;
                        now = w.theDate;
                    }
                }
            }
            w.theDate = now;
        },
        _fixstepper: function(order) {
            var step = this.options.durationSteppers, actual = this.options.durationStep;
            if ($.inArray("d", order) > -1) {
                step.d = actual;
            }
            if ($.inArray("h", order) > -1) {
                step.d = 1;
                step.h = actual;
            }
            if ($.inArray("i", order) > -1) {
                step.h = 1;
                step.i = actual;
            }
            if ($.inArray("s", order) > -1) {
                step.i = 1;
                step.s = actual;
            }
        },
        _parser: {
            "default": function() {
                return false;
            }
        },
        _makeDate: function(str) {
            var i, exp_temp, exp_format, grbg, w = this, o = this.options, defVal = this.options.defaultValue, adv = w.__fmt(), exp_input = null, exp_names = [], date = new w._date(), d = {
                year: -1,
                mont: -1,
                date: -1,
                hour: -1,
                mins: -1,
                secs: -1,
                week: false,
                wtyp: 4,
                wday: false,
                yday: false,
                meri: 0
            };
            str = $.trim(w.__("useArabicIndic") === true && typeof str !== "undefined" ? w._dRep(str, -1) : str);
            if (typeof o.mode === "undefined") {
                return date;
            }
            if (typeof w._parser[o.mode] !== "undefined") {
                return w._parser[o.mode].apply(w, [ str ]);
            }
            if (o.mode === "durationbox" || o.mode === "durationflipbox") {
                adv = adv.replace(/%D([a-z])/gi, function(match, oper) {
                    switch (oper) {
                      case "d":
                      case "l":
                      case "M":
                      case "S":
                        return "(" + match + "|[0-9]+)";

                      default:
                        return ".+?";
                    }
                });
                adv = new RegExp("^" + adv + "$");
                exp_input = adv.exec(str);
                exp_format = adv.exec(w.__fmt());
                if (exp_input === null || exp_input.length !== exp_format.length) {
                    if (typeof defVal === "number" && defVal > 0) {
                        return new w._date((w.initDate.getEpoch() + parseInt(defVal, 10)) * 1e3);
                    }
                    return new w._date(w.initDate.getTime());
                }
                exp_temp = w.initDate.getEpoch();
                for (i = 1; i < exp_input.length; i++) {
                    grbg = parseInt(exp_input[i], 10);
                    if (exp_format[i].match(/^%Dd$/i)) {
                        exp_temp = exp_temp + grbg * 86400;
                    }
                    if (exp_format[i].match(/^%Dl$/i)) {
                        exp_temp = exp_temp + grbg * 3600;
                    }
                    if (exp_format[i].match(/^%DM$/i)) {
                        exp_temp = exp_temp + grbg * 60;
                    }
                    if (exp_format[i].match(/^%DS$/i)) {
                        exp_temp = exp_temp + grbg;
                    }
                }
                return new w._date(exp_temp * 1e3);
            }
            if (adv === "%J") {
                date = new w._date(str);
                if (isNaN(date.getDate())) {
                    date = new w._date();
                }
                return date;
            }
            adv = adv.replace(/%(0|-)*([a-z])/gi, function(match, pad, oper) {
                exp_names.push(oper);
                switch (oper) {
                  case "p":
                  case "P":
                  case "b":
                  case "B":
                    return "(" + match + "|.+?)";

                  case "H":
                  case "k":
                  case "I":
                  case "l":
                  case "m":
                  case "M":
                  case "S":
                  case "V":
                  case "U":
                  case "u":
                  case "W":
                  case "d":
                    return "(" + match + "|[0-9]{" + (pad === "-" ? "1," : "") + "2})";

                  case "j":
                    return "(" + match + "|[0-9]{3})";

                  case "s":
                    return "(" + match + "|[0-9]+)";

                  case "g":
                  case "y":
                    return "(" + match + "|[0-9]{2})";

                  case "E":
                  case "G":
                  case "Y":
                    return "(" + match + "|[0-9]{1,4})";

                  default:
                    exp_names.pop();
                    return ".+?";
                }
            });
            adv = new RegExp("^" + adv + "$");
            exp_input = adv.exec(str);
            exp_format = adv.exec(w.__fmt());
            if (exp_input === null || exp_input.length !== exp_format.length) {
                if (defVal !== false && defVal !== "") {
                    switch (typeof defVal) {
                      case "object":
                        if ($.isFunction(defVal.getDay)) {
                            date = defVal;
                        } else {
                            if (defVal.length === 3) {
                                date = w._pa(defVal, o.mode.substr(0, 4) === "time" ? date : false);
                            }
                        }
                        break;

                      case "number":
                        date = new w._date(defVal * 1e3);
                        break;

                      case "string":
                        if (o.mode.substr(0, 4) === "time") {
                            exp_temp = $.extend([ 0, 0, 0 ], defVal.split(":")).slice(0, 3);
                            date = w._pa(exp_temp, date);
                        } else {
                            exp_temp = $.extend([ 0, 0, 0 ], defVal.split("-")).slice(0, 3);
                            exp_temp[1]--;
                            date = w._pa(exp_temp, false);
                        }
                        break;
                    }
                }
                if (isNaN(date.getDate())) {
                    date = new w._date();
                }
            } else {
                for (i = 1; i < exp_input.length; i++) {
                    grbg = parseInt(exp_input[i], 10);
                    switch (exp_names[i - 1]) {
                      case "s":
                        return new w._date(parseInt(exp_input[i], 10) * 1e3);

                      case "Y":
                      case "G":
                        d.year = grbg;
                        break;

                      case "E":
                        d.year = grbg - 543;
                        break;

                      case "y":
                      case "g":
                        if (o.afterToday || grbg < 38) {
                            d.year = 2e3 + grbg;
                        } else {
                            d.year = 1900 + grbg;
                        }
                        break;

                      case "m":
                        d.mont = grbg - 1;
                        break;

                      case "d":
                        d.date = grbg;
                        break;

                      case "H":
                      case "k":
                      case "I":
                      case "l":
                        d.hour = grbg;
                        break;

                      case "M":
                        d.mins = grbg;
                        break;

                      case "S":
                        d.secs = grbg;
                        break;

                      case "u":
                        d.wday = grbg - 1;
                        break;

                      case "w":
                        d.wday = grbg;
                        break;

                      case "j":
                        d.yday = grbg;
                        break;

                      case "V":
                        d.week = grbg;
                        d.wtyp = 4;
                        break;

                      case "U":
                        d.week = grbg;
                        d.wtyp = 0;
                        break;

                      case "W":
                        d.week = grbg;
                        d.wtyp = 1;
                        break;

                      case "p":
                      case "P":
                        grbg = new RegExp("^" + exp_input[i] + "$", "i");
                        d.meri = grbg.test(w.__("meridiem")[0]) ? -1 : 1;
                        break;

                      case "b":
                        exp_temp = $.inArray(exp_input[i], w.__("monthsOfYearShort"));
                        if (exp_temp > -1) {
                            d.mont = exp_temp;
                        }
                        break;

                      case "B":
                        exp_temp = $.inArray(exp_input[i], w.__("monthsOfYear"));
                        if (exp_temp > -1) {
                            d.mont = exp_temp;
                        }
                        break;
                    }
                }
                if (d.meri !== 0) {
                    if (d.meri === -1 && d.hour === 12) {
                        d.hour = 0;
                    }
                    if (d.meri === 1 && d.hour !== 12) {
                        d.hour = d.hour + 12;
                    }
                }
                date = new w._date(w._n(d.year, 0), w._n(d.mont, 0), w._n(d.date, 1), w._n(d.hour, 0), w._n(d.mins, 0), w._n(d.secs, 0), 0);
                if (d.year < 100 && d.year !== -1) {
                    date.setFullYear(d.year);
                }
                if (d.mont > -1 && d.date > -1 || d.hour > -1 && d.mins > -1 && d.secs > -1) {
                    return date;
                }
                if (d.week !== false) {
                    date.setDWeek(d.wtyp, d.week);
                    if (d.date > -1) {
                        date.setDate(d.date);
                    }
                }
                if (d.yday !== false) {
                    date.setD(1, 0).setD(2, 1).adj(2, d.yday - 1);
                }
                if (d.wday !== false) {
                    date.adj(2, d.wday - date.getDay());
                }
            }
            return date;
        },
        _event: function(e, p) {
            var tmp, w = $(this).data("jtsage-datebox"), o = $(this).data("jtsage-datebox").options;
            if (!e.isPropagationStopped()) {
                switch (p.method) {
                  case "close":
                    if (typeof p.closeCancel === "undefined") {
                        p.closeCancel = false;
                    }
                    w.cancelClose = p.closeCancel;
                    w.close();
                    break;

                  case "open":
                    w.open();
                    break;

                  case "set":
                    if (typeof p.value === "object") {
                        w.theDate = p.value;
                        w._t({
                            method: "doset"
                        });
                    } else {
                        $(this).val(p.value);
                        if (o.linkedField !== false) {
                            $(o.linkedField).val(w.callFormat(o.linkedFieldFormat, w.theDate, false));
                        }
                        $(this).trigger("change");
                    }
                    break;

                  case "doset":
                    tmp = "_" + w.options.mode + "DoSet";
                    if ($.isFunction(w[tmp])) {
                        w[tmp].apply(w, []);
                    } else {
                        w._t({
                            method: "set",
                            value: w._formatter(w.__fmt(), w.theDate),
                            date: w.theDate
                        });
                    }
                    break;

                  case "dooffset":
                    if (p.type) {
                        w._offset(p.type, p.amount, true);
                    }
                    break;

                  case "dorefresh":
                    w.refresh();
                    break;

                  case "doclear":
                    $(this).val("").trigger("change");
                    break;

                  case "clear":
                    $(this).trigger("change");
                    break;
                }
            }
        },
        _build: {
            "default": function() {
                this.d.headerText = "Error";
                if (this.d.intHTML !== false) {
                    this.d.intHTML.remove().empty();
                }
                this.d.intHTML = $("<div class='ui-body-b'><h2 style='text-align:center'" + " class='bg-danger'>Unknown Mode</h2></div>");
            },
            timeflipbox: function() {
                this._build.flipbox.apply(this);
            },
            durationflipbox: function() {
                this._build.flipbox.apply(this);
            },
            flipbox: function() {
                var i, y, hRow, tmp, hRowIn, stdPos, controlButtons, w = this, o = this.options, g = this.drag, cDurS = {}, normDurPositions = [ "d", "h", "i", "s" ], dur = o.mode === "durationflipbox" ? true : false, uid = "ui-datebox-", flipBase = $("<div class='ui-overlay-shadow'><ul></ul></div>"), ctrl = $("<div>", {
                    "class": uid + "flipcontent"
                }), ti = w.theDate.getTime() - w.initDate.getTime(), themeType = "" + (w.baseMode === "jqm" ? "ui-body-" : "") + (w.baseMode === "bootstrap" ? "bg-" : ""), cDur = w._dur(ti < 0 ? 0 : ti), currentTerm, currentText;
                if (ti < 0) {
                    w.lastDuration = 0;
                    if (dur) {
                        w.theDate.setTime(w.initDate.getTime());
                    }
                } else {
                    if (dur) {
                        w.lastDuration = ti / 1e3;
                    }
                }
                if (typeof w.d.intHTML !== "boolean") {
                    w.d.intHTML.empty().remove();
                } else {
                    w.d.input.on("datebox", function(e, p) {
                        if (p.method === "postrefresh") {
                            w._fbox_pos();
                        }
                    });
                }
                w.d.headerText = w._grabLabel() !== false ? w._grabLabel() : o.mode === "flipbox" ? w.__("titleDateDialogLabel") : w.__("titleTimeDialogLabel");
                w.d.intHTML = $("<span>");
                $(document).one("popupafteropen", function() {
                    w._fbox_pos();
                });
                w.fldOrder = o.mode === "flipbox" ? w.__("dateFieldOrder") : dur ? w.__("durationOrder") : w.__("timeFieldOrder");
                if (!dur) {
                    w._check();
                    w._minStepFix();
                } else {
                    if (o.minDur !== false && w.theDate.getEpoch() - w.initDate.getEpoch() < o.minDur) {
                        w.theDate = new Date(w.initDate.getTime() + o.minDur * 1e3);
                        w.lastDuration = o.minDur;
                        cDur = w._dur(o.minDur * 1e3);
                    }
                    if (o.maxDur !== false && w.theDate.getEpoch() - w.initDate.getEpoch() > o.maxDur) {
                        w.theDate = new Date(w.initDate.getTime() + o.maxDur * 1e3);
                        w.lastDuration = o.maxDur;
                        cDur = w._dur(o.maxDur * 1e3);
                    }
                }
                if (o.mode === "flipbox") {
                    $(w._spf("<div class='{cls}'><h4>{text}</h4></div>", {
                        cls: uid + "header",
                        text: w._formatter(w.__("headerFormat"), w.theDate)
                    })).appendTo(w.d.intHTML);
                }
                if (dur) {
                    w._fixstepper(w.fldOrder);
                    tmp = $(w._spf("<div class='{cls}'></div>", {
                        cls: uid + "header" + " ui-grid-" + [ "a", "b", "c", "d", "e" ][w.fldOrder.length - 2] + " row"
                    }));
                    for (y = 0; y < w.fldOrder.length; y++) {
                        $(w._spf("<div class='{cls}'>{text}</div>", {
                            text: w.__("durationLabel")[$.inArray(w.fldOrder[y], normDurPositions)],
                            cls: uid + "fliplab" + " ui-block-" + [ "a", "b", "c", "d", "e" ][y] + " col-xs-" + 12 / w.fldOrder.length
                        })).appendTo(tmp);
                    }
                    tmp.appendTo(w.d.intHTML);
                    w.dateOK = true;
                    cDurS.d = w._fbox_series(cDur[0], 64, "d", false);
                    cDurS.h = w._fbox_series(cDur[1], 64, "h", cDur[0] > 0);
                    cDurS.i = w._fbox_series(cDur[2], 60, "i", cDur[0] > 0 || cDur[1] > 0);
                    cDurS.s = w._fbox_series(cDur[3], 60, "s", cDur[0] > 0 || cDur[1] > 0 || cDur[2] > 0);
                    ctrl.addClass(uid + "flipcontentd");
                    for (y = 0; y < w.fldOrder.length; y++) {
                        stdPos = w.fldOrder[y];
                        currentTerm = cDur[$.inArray(stdPos, normDurPositions)];
                        hRow = flipBase.clone().data({
                            field: stdPos,
                            amount: o.durationSteppers[stdPos]
                        });
                        hRowIn = hRow.find("ul");
                        for (i in cDurS[stdPos]) {
                            $(w._spf("<li class='{cls}'><span>{text}</span></li>", {
                                text: cDurS[stdPos][i][0],
                                cls: themeType + (cDurS[stdPos][i][1] !== currentTerm ? o.themeDate : o.themeDatePick)
                            })).appendTo(hRowIn);
                        }
                        hRow.appendTo(ctrl);
                    }
                }
                for (y = 0; y < w.fldOrder.length && !dur; y++) {
                    currentTerm = w.fldOrder[y];
                    hRow = flipBase.clone().data({
                        field: currentTerm,
                        amount: currentTerm === "i" ? o.minuteStep : 1
                    });
                    hRowIn = hRow.find("ul");
                    if (typeof w._fbox_mktxt[currentTerm] === "function") {
                        for (i = -1 * o.flen[currentTerm]; i < o.flen[currentTerm] + 1; i++) {
                            $(w._spf("<li class='{cls}'><span>{text}</span></li>", {
                                cls: themeType + (i !== 0 ? o.themeDate : o.themeDatePick),
                                text: w._fbox_mktxt[currentTerm].apply(w, [ currentTerm === "i" ? i * o.minuteStep : i ])
                            })).appendTo(hRowIn);
                        }
                        hRow.appendTo(ctrl);
                    }
                    if (currentTerm === "a" && w.__("timeFormat") === 12) {
                        currentText = $("<li class='" + themeType + o.themeDate + "'><span></span></li>");
                        tmp = w.theDate.get(3) > 11 ? [ o.themeDate, o.themeDatePick, 2, 5 ] : [ o.themeDatePick, o.themeDate, 2, 3 ];
                        for (i = -1 * tmp[2]; i < tmp[3]; i++) {
                            if (i < 0 || i > 1) {
                                currentText.clone().appendTo(hRowIn);
                            } else {
                                $(w._spf("<li class='{cls}'><span>{text}</span></li>", {
                                    cls: themeType + tmp[i],
                                    text: w.__("meridiem")[i]
                                })).appendTo(hRowIn);
                            }
                        }
                        hRow.appendTo(ctrl);
                    }
                }
                w.d.intHTML.append(ctrl);
                $("<div>", {
                    "class": uid + "flipcenter ui-overlay-shadow"
                }).css("pointerEvents", "none").appendTo(w.d.intHTML);
                if (o.useSetButton || o.useClearButton || o.useCancelButton || o.useTodayButton || o.useTomorrowButton) {
                    controlButtons = $("<div>", {
                        "class": uid + "controls"
                    });
                    if (o.useSetButton) {
                        controlButtons.append(w._stdBtn.close.apply(w, [ o.mode === "flipbox" ? w.__("setDateButtonLabel") : dur ? w.__("setDurationButtonLabel") : w.__("setTimeButtonLabel") ]));
                    }
                    if (o.useTodayButton) {
                        controlButtons.append(w._stdBtn.today.apply(w));
                    }
                    if (o.useTomorrowButton) {
                        controlButtons.append(w._stdBtn.tomorrow.apply(w));
                    }
                    if (o.useClearButton) {
                        controlButtons.append(w._stdBtn.clear.apply(w));
                    }
                    if (o.useCancelButton) {
                        controlButtons.append(w._stdBtn.cancel.apply(w));
                    }
                    w._controlGroup(controlButtons).appendTo(w.d.intHTML);
                }
                if (w.wheelExists) {
                    w.d.intHTML.on("mousewheel", ".ui-overlay-shadow", function(e, d) {
                        e.preventDefault();
                        w._offset($(this).data("field"), (d < 0 ? 1 : -1) * $(this).data("amount"));
                    });
                }
                w.d.intHTML.on(g.eStart, "ul", function(e, f) {
                    if (!g.move) {
                        if (typeof f !== "undefined") {
                            e = f;
                        }
                        g.move = true;
                        g.target = $(this).find("li").first();
                        g.pos = parseInt(g.target.css("marginTop").replace(/px/i, ""), 10);
                        g.start = e.type.substr(0, 5) === "touch" ? e.originalEvent.changedTouches[0].pageY : e.pageY;
                        g.end = false;
                        g.direc = dur ? -1 : 1;
                        g.velocity = 0;
                        g.time = Date.now();
                        e.stopPropagation();
                        e.preventDefault();
                    }
                });
            }
        },
        _drag: {
            "default": function() {
                return false;
            },
            timeflipbox: function() {
                this._drag.flipbox.apply(this);
            },
            durationflipbox: function() {
                this._drag.flipbox.apply(this);
            },
            flipbox: function() {
                var w = this, o = this.options, g = this.drag;
                $(document).on(g.eMove, function(e) {
                    if (g.move && o.mode.slice(-7) === "flipbox") {
                        g.end = e.type.substr(0, 5) === "touch" ? e.originalEvent.changedTouches[0].pageY : e.pageY;
                        g.target.css("marginTop", g.pos + g.end - g.start + "px");
                        g.elapsed = Date.now() - g.time;
                        g.velocity = .8 * (100 * (g.end - g.start) / (1 + g.elapsed)) + .2 * g.velocity;
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    }
                });
                $(document).on(g.eEnd, function(e) {
                    var eachItem, delta, currentPosition, goodPosition, totalMove, numberFull, goodGuess;
                    if (g.move && o.mode.slice(-7) === "flipbox") {
                        if (g.velocity < 15 && g.velocity > -15 || !o.useKinetic) {
                            g.move = false;
                            if (g.end !== false) {
                                e.preventDefault();
                                e.stopPropagation();
                                g.tmp = g.target.parent().parent();
                                w._offset(g.tmp.data("field"), parseInt((g.start - g.end) / (g.target.outerHeight() - 2), 10) * g.tmp.data("amount") * g.direc);
                            }
                            g.start = false;
                            g.end = false;
                        } else {
                            g.move = false;
                            g.start = false;
                            g.end = false;
                            g.tmp = g.target.parent().parent();
                            eachItem = g.target.outerHeight();
                            delta = -(g.velocity * .8) * Math.exp(-g.elapsed / 325) * 8 * -1;
                            currentPosition = parseInt(g.target.css("marginTop").replace(/px/i, ""), 10);
                            goodPosition = parseInt(currentPosition + delta, 10);
                            totalMove = g.pos - goodPosition;
                            numberFull = Math.round(totalMove / eachItem);
                            goodGuess = numberFull * g.tmp.data("amount") * g.direc;
                            g.target.animate({
                                marginTop: goodPosition
                            }, parseInt(1e4 / g.velocity) + 1e3, function() {
                                w._offset(g.tmp.data("field"), goodGuess);
                            });
                            e.preventDefault();
                            e.stopPropagation();
                        }
                    }
                });
            }
        },
        _offset: function(mode, amount, update) {
            var w = this, o = this.options, now = this.theDate, ok = false, tempBad, bad = false, monthEnd = 32 - w.theDate.copy([ 0 ], [ 0, 0, 32, 13 ]).getDate(), dPart = false;
            mode = (mode || "").toLowerCase();
            dPart = $.inArray(mode, [ "y", "m", "d", "h", "i", "s" ]);
            if (typeof update === "undefined") {
                update = true;
            }
            if (mode !== "a" && (typeof o.rolloverMode[mode] === "undefined" || o.rolloverMode[mode] === true)) {
                ok = dPart;
            } else {
                switch (mode) {
                  case "y":
                    ok = 0;
                    break;

                  case "m":
                    if (w._btwn(now.get(1) + amount, -1, 12)) {
                        ok = 1;
                    } else {
                        tempBad = now.get(1) + amount;
                        if (tempBad < 0) {
                            bad = [ 1, 12 + tempBad ];
                        } else {
                            bad = [ 1, tempBad % 12 ];
                        }
                    }
                    break;

                  case "d":
                    if (w._btwn(now.get(2) + amount, 0, monthEnd + 1)) {
                        ok = 2;
                    } else {
                        tempBad = now.get(2) + amount;
                        if (tempBad < 1) {
                            bad = [ 2, monthEnd + tempBad ];
                        } else {
                            bad = [ 2, tempBad % monthEnd ];
                        }
                    }
                    break;

                  case "h":
                    if (w._btwn(now.get(3) + amount, -1, 24)) {
                        ok = 3;
                    } else {
                        tempBad = now.get(3) + amount;
                        if (tempBad < 0) {
                            bad = [ 3, 24 + tempBad ];
                        } else {
                            bad = [ 3, tempBad % 24 ];
                        }
                    }
                    break;

                  case "i":
                    if (w._btwn(now.get(4) + amount, -1, 60)) {
                        ok = 4;
                    } else {
                        tempBad = now.get(4) + amount;
                        if (tempBad < 0) {
                            bad = [ 4, 59 + tempBad ];
                        } else {
                            bad = [ 4, tempBad % 60 ];
                        }
                    }
                    break;

                  case "s":
                    if (w._btwn(now.get(5) + amount, -1, 60)) {
                        ok = 5;
                    }
                    break;

                  case "a":
                    w._offset("h", (amount > 0 ? 1 : -1) * 12, false);
                    break;
                }
            }
            if (ok !== false) {
                w.theDate.adj(ok, amount);
            } else {
                w.theDate.setD(bad[0], bad[1]);
            }
            if (update === true) {
                w.refresh();
            }
            if (o.useImmediate) {
                w._t({
                    method: "doset"
                });
            }
            if (w.calBackDate !== false) {
                w._t({
                    method: "displayChange",
                    selectedDate: w.calBackDate,
                    shownDate: w.theDate,
                    thisChange: mode,
                    thisChangeAmount: amount
                });
            }
            w._t({
                method: "offset",
                type: mode,
                amount: amount,
                newDate: w.theDate
            });
        },
        _startOffset: function(date) {
            var o = this.options;
            if (o.startOffsetYears !== false) {
                date.adj(0, o.startOffsetYears);
            }
            if (o.startOffsetMonths !== false) {
                date.adj(1, o.startOffsetMonths);
            }
            if (o.startOffsetDays !== false) {
                date.adj(2, o.startOffsetDays);
            }
            return date;
        },
        getTheDate: function() {
            if (this.calBackDate !== false) {
                return this.calBackDate;
            }
            return this.theDate;
        },
        getLastDur: function() {
            return this.lastDuration;
        },
        dateVisible: function() {
            return this.calDateVisible;
        },
        setTheDate: function(newDate) {
            if (typeof newDate === "object") {
                this.theDate = newDate;
            } else {
                this.theDate = this._makeDate(newDate);
            }
            this.refresh();
            this._t({
                method: "doset"
            });
        },
        parseDate: function(format, strdate) {
            var retty, w = this;
            w.fmtOver = format;
            retty = w._makeDate(strdate);
            w.fmtOver = false;
            return retty;
        },
        callFormat: function(format, date, allowArIn) {
            if (typeof allowArIn === "undefined") {
                allowArIn = false;
            }
            return this._formatter(format, date, allowArIn);
        },
        refresh: function() {
            var w = this, o = this.options;
            if (typeof w._build[o.mode] === "undefined") {
                w._build["default"].apply(w, []);
            } else {
                w._build[o.mode].apply(w, []);
            }
            if (w.__("useArabicIndic") === true) {
                w._doIndic();
            }
            w.d.mainWrap.append(w.d.intHTML);
            w._t({
                method: "postrefresh"
            });
        },
        applyMinMax: function(refresh, override) {
            var todayClean, fromEl, fromElDate, daysRaw, w = this, o = this.options, today = new this._date(), lod = 24 * 60 * 60 * 1e3;
            todayClean = w._pa([ 0, 0, 0 ], today);
            if (typeof refresh === "undefined") {
                refresh = true;
            }
            if (typeof override === "undefined") {
                override = true;
            }
            if ((override === true || o.minDays === false) && typeof w.d.input.attr("min") !== "undefined") {
                fromEl = w.d.input.attr("min").split("-");
                fromElDate = new w._date(fromEl[0], fromEl[1] - 1, fromEl[2], 0, 0, 0, 0);
                daysRaw = (fromElDate.getTime() - todayClean.getTime()) / lod;
                o.minDays = parseInt(daysRaw * -1, 10);
            }
            if ((override === true || o.maxDays === false) && typeof w.d.input.attr("max") !== "undefined") {
                fromEl = w.d.input.attr("max").split("-");
                fromElDate = new w._date(fromEl[0], fromEl[1] - 1, fromEl[2], 0, 0, 0, 0);
                daysRaw = (fromElDate.getTime() - todayClean.getTime()) / lod;
                o.maxDays = parseInt(daysRaw, 10);
            }
            if (refresh === true) {
                w._t({
                    method: "refresh"
                });
            }
        },
        _dur: function(ms) {
            var theDuration = [ ms / (60 * 60 * 1e3 * 24), ms / (60 * 60 * 1e3) % 24, ms / (60 * 1e3) % 60, ms / 1e3 % 60 ];
            $.each(theDuration, function(index, value) {
                if (value < 0) {
                    theDuration[index] = 0;
                } else {
                    theDuration[index] = Math.floor(value);
                }
            });
            return theDuration;
        },
        __: function(val) {
            var o = this.options, lang = o.lang[o.useLang], mode = o[o.mode + "lang"], oride = "override" + val.charAt(0).toUpperCase() + val.slice(1);
            if (typeof o[oride] !== "undefined") {
                return o[oride];
            }
            if (typeof lang !== "undefined" && typeof lang[val] !== "undefined") {
                return lang[val];
            }
            if (typeof mode !== "undefined" && typeof mode[val] !== "undefined") {
                return mode[val];
            }
            if (typeof o.lang["default"][val] !== "undefined") {
                return o.lang["default"][val];
            }
            return "Err:NotFound";
        },
        __fmt: function() {
            var w = this, o = this.options;
            if (typeof w.fmtOver !== "undefined" && w.fmtOver !== false) {
                return w.fmtOver;
            }
            switch (o.mode) {
              case "timebox":
              case "timeflipbox":
                return w.__("timeOutput");

              case "durationbox":
              case "durationflipbox":
                return w.__("durationFormat");

              default:
                return w.__("dateFormat");
            }
        },
        _zPad: function(number, pad) {
            if (typeof pad !== "undefined" && pad === "-") {
                return String(number);
            }
            return (number < 10 ? "0" : "") + String(number);
        },
        _dRep: function(oper, direction) {
            var ch, i, start = 48, end = 57, adder = 1584, newString = "";
            if (direction === -1) {
                start += adder;
                end += adder;
                adder = -1584;
            }
            for (i = 0; i < oper.length; i++) {
                ch = oper.charCodeAt(i);
                if (ch >= start && ch <= end) {
                    newString = newString + String.fromCharCode(ch + adder);
                } else {
                    newString = newString + String.fromCharCode(ch);
                }
            }
            return newString;
        },
        _doIndic: function() {
            var w = this;
            w.d.intHTML.find("*").each(function() {
                if ($(this).children().length < 1) {
                    $(this).text(w._dRep($(this).text()));
                } else if ($(this).hasClass("ui-datebox-slideday")) {
                    $(this).html(w._dRep($(this).html()));
                }
            });
            w.d.intHTML.find("input").each(function() {
                $(this).val(w._dRep($(this).val()));
            });
        },
        _n: function(val, def) {
            return val < 0 ? def : val;
        },
        _pa: function(arr, date) {
            if (typeof date === "boolean") {
                return new this._date(arr[0], arr[1], arr[2], 0, 0, 0, 0);
            }
            return new this._date(date.get(0), date.get(1), date.get(2), arr[0], arr[1], arr[2], 0);
        },
        _btwn: function(value, low, high) {
            return value > low && value < high;
        },
        _grabLabel: function() {
            var inputPlaceholder, inputTitle, w = this, o = this.options, tmp = false;
            if (typeof o.overrideDialogLabel === "undefined") {
                inputPlaceholder = w.d.input.attr("placeholder");
                inputTitle = w.d.input.attr("title");
                if (typeof inputPlaceholder !== "undefined") {
                    return inputPlaceholder;
                }
                if (typeof inputTitle !== "undefined") {
                    return inputTitle;
                }
                tmp = $(document).find("label[for='" + w.d.input.attr("id") + "']").text();
                return tmp === "" ? false : tmp;
            }
            return o.overrideDialogLabel;
        },
        _t: function(obj) {
            this.d.input.trigger("datebox", obj);
        },
        _spf: function(text, repl) {
            if (!$.isArray(repl) && !$.isPlainObject(repl)) {
                return text;
            }
            return text.replace(/{(.+?)}/g, function(match, oper) {
                return repl[oper];
            });
        },
        baseMode: "jqm",
        _stdBtn: {
            cancel: function() {
                var w = this, o = this.options;
                return $("<a href='#' role='button'>" + w.__("cancelButton") + "</a>").addClass("ui-btn ui-btn-" + o.themeCancelButton + " ui-icon-delete ui-btn-icon-left ui-shadow ui-corner-all").on(o.clickEventAlt, function(e) {
                    e.preventDefault();
                    w._t({
                        method: "close",
                        closeCancel: true
                    });
                });
            },
            clear: function() {
                var w = this, o = this.options;
                return $("<a href='#' role='button'>" + w.__("clearButton") + "</a>").addClass("ui-btn ui-btn-" + o.themeClearButton + " ui-icon-delete ui-btn-icon-left ui-shadow ui-corner-all").on(o.clickEventAlt, function(e) {
                    e.preventDefault();
                    w.d.input.val("");
                    w._t({
                        method: "clear"
                    });
                    w._t({
                        method: "close",
                        closeCancel: true
                    });
                });
            },
            close: function(txt, trigger) {
                var w = this, o = this.options;
                if (typeof trigger === "undefined") {
                    trigger = false;
                }
                return $("<a href='#' role='button'>" + txt + "</a>").addClass("ui-btn ui-btn-" + o.themeSetButton + " ui-icon-check ui-btn-icon-left ui-shadow ui-corner-all" + (w.dateOK === true ? "" : " ui-state-disabled")).on(o.clickEventAlt, function(e) {
                    e.preventDefault();
                    if (w.dateOK === true) {
                        if (trigger === false) {
                            w._t({
                                method: "set",
                                value: w._formatter(w.__fmt(), w.theDate),
                                date: w.theDate
                            });
                        } else {
                            w._t(trigger);
                        }
                        w._t({
                            method: "close"
                        });
                    }
                });
            },
            today: function() {
                var w = this, o = this.options;
                return $("<a href='#' role='button'>" + w.__("todayButtonLabel") + "</a>").addClass("ui-btn ui-btn-" + o.themeTodayButton + " ui-icon-navigation ui-btn-icon-left ui-shadow ui-corner-all").on(o.clickEventAlt, function(e) {
                    e.preventDefault();
                    w.theDate = w._pa([ 0, 0, 0 ], new w._date());
                    w.calBackDate = false;
                    w._t({
                        method: "doset"
                    });
                });
            },
            tomorrow: function() {
                var w = this, o = this.options;
                return $("<a href='#' role='button'>" + w.__("tomorrowButtonLabel") + "</a>").addClass("ui-btn ui-btn-" + o.themeTomorrowButton + " ui-icon-navigation ui-btn-icon-left ui-shadow ui-corner-all").on(o.clickEventAlt, function(e) {
                    e.preventDefault();
                    w.theDate = w._pa([ 0, 0, 0 ], new w._date()).adj(2, 1);
                    w.calBackDate = false;
                    w._t({
                        method: "doset"
                    });
                });
            }
        },
        _destroy: function() {
            var w = this, o = this.options, button = this.d.wrap.find("a");
            w.d.wrap.removeClass("ui-input-has-clear");
            button.remove();
            if (o.lockInput) {
                w.d.input.removeAttr("readonly");
            }
            w.d.input.off("datebox").off("focus.datebox").off("blur.datebox").off("change.datebox");
            w.d.mainWrap.popup("destroy");
            $(document).off(w.drag.eMove).off(w.drag.eEnd).off(w.drag.eEndA);
        },
        _create: function() {
            $(document).trigger("dateboxcreate");
            var w = this, o = $.extend(this.options, this._getLongOptions(this.element), this.element.data("options")), thisTheme = o.theme === false ? $.mobile.getInheritedTheme(this.element) : o.theme, trans = o.useAnimation ? o.transition : "none", d = {
                input: this.element,
                wrap: this.element.parent(),
                mainWrap: $("<div>", {
                    "class": "ui-datebox-container ui-overlay-shadow " + "ui-corner-all ui-datebox-hidden " + trans + " ui-body-" + thisTheme
                }).css("zIndex", o.zindex),
                intHTML: false
            }, evtid = ".datebox" + this.uuid, touch = typeof window.ontouchstart !== "undefined", drag = {
                eStart: "touchstart" + evtid + " mousedown" + evtid,
                eMove: "touchmove" + evtid + " mousemove" + evtid,
                eEnd: "touchend" + evtid + " mouseup" + evtid,
                eEndA: true ? [ "mouseup", "touchend", "touchcanel", "touchmove" ].join(evtid + " ") + evtid : "mouseup" + evtid,
                move: false,
                start: false,
                end: false,
                pos: false,
                target: false,
                delta: false,
                tmp: false
            };
            $.extend(w, {
                d: d,
                drag: drag,
                touch: touch
            });
            if (o.usePlaceholder !== false) {
                if (o.usePlaceholder === true && w._grabLabel() !== "") {
                    w.d.input.attr("placeholder", w._grabLabel());
                }
                if (typeof o.usePlaceholder === "string") {
                    w.d.input.attr("placeholder", o.usePlaceholder);
                }
            }
            o.theme = thisTheme;
            w.cancelClose = false;
            w.calBackDate = false;
            w.calDateVisible = true;
            w.disabled = false;
            w.runButton = false;
            w._date = window.Date;
            w._enhanceDate();
            w.baseID = w.d.input.attr("id");
            w.initDate = new w._date();
            w.initDate.setMilliseconds(0);
            w.theDate = o.defaultValue ? w._makeDate() : w.d.input.val() !== "" ? w._makeDate(w.d.input.val()) : new w._date();
            if (w.d.input.val() === "") {
                w._startOffset(w.theDate);
            }
            w.initDone = false;
            if (o.showInitialValue) {
                w.d.input.val(w._formatter(w.__fmt(), w.theDate));
            }
            if (o.useButton) {
                if (o.mode !== false) {
                    w.d.wrap.addClass("ui-input-has-clear");
                    if (o.buttonIcon === false) {
                        if (o.mode.substr(0, 4) === "time" || o.mode.substr(0, 3) === "dur") {
                            o.buttonIcon = o.buttonIconTime;
                        } else {
                            o.buttonIcon = o.buttonIconDate;
                        }
                    }
                    $("<a href='#' class='ui-input-clear ui-btn ui-icon-" + o.buttonIcon + " ui-btn-icon-notext ui-corner-all'></a>").attr("title", w.__("tooltip")).text(w.__("tooltip")).appendTo(w.d.wrap).on(o.clickEvent, function(e) {
                        e.preventDefault();
                        if (o.useFocus) {
                            w.d.input.focus();
                        } else {
                            if (!w.disabled) {
                                w._t({
                                    method: "open"
                                });
                            }
                        }
                    });
                }
            }
            if (o.hideInput) {
                w.d.wrap.hide();
            }
            if (o.hideContainer) {
                w.d.wrap.parent().hide();
            }
            w.d.input.on("focus.datebox", function() {
                w.d.input.addClass("ui-focus");
                if (w.disabled === false && o.useFocus) {
                    w._t({
                        method: "open"
                    });
                }
            }).on("blur.datebox", function() {
                w.d.input.removeClass("ui-focus");
            }).on("change.datebox", function() {
                w.theDate = w._makeDate(w.d.input.val());
                w.refresh();
            }).on("datebox", w._event);
            if (o.lockInput) {
                w.d.input.attr("readonly", "readonly");
            }
            if (typeof $.event.special.mousewheel !== "undefined") {
                w.wheelExists = true;
            }
            if (w.d.input.is(":disabled")) {
                w.disable();
            }
            w.applyMinMax(false, false);
            if (o.useInline || o.useInlineBlind) {
                w.open();
            }
            $(document).trigger("dateboxaftercreate");
        },
        open: function() {
            var w = this, o = this.options, popopts = {
                transition: o.useAnimation ? o.transition : "none"
            }, basepop = {
                history: false,
                transition: o.useAnimation ? o.transition : "none"
            };
            if (o.useFocus && w.fastReopen === true) {
                w.d.input.blur();
                return false;
            }
            w.theDate = w._makeDate(w.d.input.val());
            w.calBackDate = false;
            if (w.d.input.val() === "") {
                w._startOffset(w.theDate);
            }
            w.d.input.blur();
            if (typeof w._build[o.mode] === "undefined") {
                w._build["default"].apply(w, []);
            } else {
                w._build[o.mode].apply(w, []);
            }
            if (typeof w._drag[o.mode] !== "undefined") {
                w._drag[o.mode].apply(w, []);
            }
            w._t({
                method: "refresh"
            });
            if (w.__("useArabicIndic") === true) {
                w._doIndic();
            }
            if ((o.useInline || o.useInlineBlind) && w.initDone === false) {
                w.d.mainWrap.append(w.d.intHTML);
                if (o.hideContainer) {
                    if (o.useHeader) {
                        w.d.mainWrap.prepend($("<div class='ui-header ui-bar-" + o.themeHeader + "'>" + "<h1 class='ui-title'>" + w.d.headerText + "</h1>" + "</div>"));
                    }
                    w.d.wrap.parent().after(w.d.mainWrap);
                } else {
                    w.d.wrap.parent().append(w.d.mainWrap);
                }
                w.d.mainWrap.removeClass("ui-datebox-hidden ui-overlay-shadow");
                if (o.useInline) {
                    w.d.mainWrap.addClass("ui-datebox-inline").css("zIndex", "auto");
                    if (!o.hideInput && !o.hideContainer) {
                        w.d.mainWrap.addClass("ui-datebox-inline-has-input");
                    }
                    setTimeout(function(w) {
                        return function() {
                            w._t({
                                method: "postrefresh"
                            });
                        };
                    }(w), 100);
                    return true;
                } else {
                    w.d.mainWrap.addClass("ui-datebox-inline ui-datebox-inline-has-input").css("zIndex", "auto");
                    w.d.mainWrap.hide();
                }
                w.initDone = false;
                w._t({
                    method: "postrefresh"
                });
            }
            if (o.useInlineBlind) {
                if (w.initDone) {
                    w.refresh();
                    w.d.mainWrap.slideDown();
                    w._t({
                        method: "postrefresh"
                    });
                } else {
                    w.initDone = true;
                }
                return true;
            }
            if (w.d.intHTML.is(":visible")) {
                return false;
            }
            w.d.mainWrap.empty();
            if (o.useHeader) {
                w.d.mainWrap.append($("<a href='#'>Close</a>").addClass("ui-btn-" + o.popupButtonPosition + " ui-link ui-btn ui-btn-" + (o.themeCloseButton === false ? o.themeHeader : o.themeCloseButton) + " ui-icon-delete " + "ui-btn-icon-notext ui-shadow ui-corner-all").on(o.clickEventAlt, function(e) {
                    e.preventDefault();
                    w._t({
                        method: "close",
                        closeCancel: true
                    });
                }));
                w.d.mainWrap.append($("<div class='ui-header ui-bar-" + o.themeHeader + "'>" + "<h1 class='ui-title'>" + w.d.headerText + "</h1>" + "</div>"));
            }
            w.d.mainWrap.append(w.d.intHTML).css("zIndex", o.zindex);
            w._t({
                method: "postrefresh"
            });
            if (o.popupPosition !== false) {
                popopts.positionTo = o.popupPosition;
            } else {
                if (typeof w.baseID !== "undefined") {
                    popopts.positionTo = "#" + w.baseID;
                } else {
                    popopts.positionTo = "window";
                }
            }
            if (o.popupForceX !== false && o.popupForceY !== false) {
                popopts.x = parseInt(o.popupForceX, 10);
                popopts.y = parseInt(o.popupForceY, 10);
                popopts.positionTo = "origin";
            }
            if (o.useModal) {
                basepop.overlayTheme = o.useModalTheme;
                basepop.dismissible = false;
            }
            if (o.openCallback !== false) {
                if (!$.isFunction(o.openCallback)) {
                    if (typeof window[o.openCallback] === "function") {
                        o.openCallback = window[o.openCallback];
                    }
                }
                basepop.afteropen = function() {
                    w._t({
                        method: "postrefresh"
                    });
                    if (o.openCallback.apply(w, $.merge([ {
                        custom: w.customCurrent,
                        initDate: w.initDate,
                        date: w.theDate,
                        duration: w.lastDuration
                    } ], o.openCallbackArgs)) === false) {
                        w._t({
                            method: "close"
                        });
                    }
                };
            } else {
                basepop.afteropen = function() {
                    w._t({
                        method: "postrefresh"
                    });
                };
            }
            if (o.closeCallback !== false) {
                if (!$.isFunction(o.closeCallback)) {
                    if (typeof window[o.closeCallback] === "function") {
                        o.closeCallback = window[o.closeCallback];
                    }
                }
                basepop.afterclose = function() {
                    o.closeCallback.apply(w, $.merge([ {
                        custom: w.customCurrent,
                        initDate: w.initDate,
                        date: w.theDate,
                        duration: w.lastDuration,
                        cancelClose: w.cancelClose
                    } ], o.closeCallbackArgs));
                };
            }
            if (o.beforeOpenCallback !== false) {
                if (!$.isFunction(o.beforeOpenCallback)) {
                    if (typeof window[o.beforeOpenCallback] === "function") {
                        o.beforeOpenCallback = window[o.beforeOpenCallback];
                    }
                }
                if (o.beforeOpenCallback.apply(w, $.merge([ {
                    custom: w.customCurrent,
                    initDate: w.initDate,
                    date: w.theDate,
                    duration: w.lastDuration
                } ], o.beforeOpenCallbackArgs)) === false) {
                    return false;
                }
            }
            w.d.mainWrap.removeClass("ui-datebox-hidden").popup(basepop).popup("open", popopts);
        },
        close: function() {
            var w = this, o = this.options;
            w.calBackDate = false;
            if (o.useInlineBlind) {
                w.d.mainWrap.slideUp();
                return true;
            }
            if (o.useInline || w.d.intHTML === false) {
                return true;
            }
            w.d.mainWrap.popup("close");
            $(document).off(w.drag.eMove).off(w.drag.eEnd).off(w.drag.eEndA);
            if (o.useFocus) {
                w.fastReopen = true;
                setTimeout(function(t) {
                    return function() {
                        t.fastReopen = false;
                    };
                }(w), 300);
            }
        },
        disable: function() {
            var w = this;
            w.d.input.attr("disabled", true);
            w.d.wrap.addClass("ui-state-disabled").blur();
            w.disabled = true;
            w.d.mainWrap.addClass("ui-state-disabled");
            w._t({
                method: "disable"
            });
        },
        enable: function() {
            var w = this;
            w.d.input.attr("disabled", false);
            w.d.wrap.removeClass("ui-state-disabled");
            w.disabled = false;
            w.d.mainWrap.removeClass("ui-state-disabled");
            w._t({
                method: "enable"
            });
        },
        _controlGroup: function(element) {
            var o = this.options;
            if (o.useCollapsedBut) {
                element.controlgroup({
                    type: "horizontal"
                });
                element.addClass("ui-datebox-collapse");
            } else {
                element.controlgroup();
            }
            return element;
        },
        _fbox_pos: function() {
            var fixer, element, first, w = this, parentHeight = this.d.intHTML.find(".ui-datebox-flipcontent").innerHeight();
            w.d.intHTML.find(".ui-datebox-flipcenter").each(function() {
                element = $(this);
                element.css("top", (parentHeight / 2 - element.innerHeight() / 2 - 3) * -1);
            });
            w.d.intHTML.find("ul").each(function() {
                element = $(this);
                parentHeight = element.parent().innerHeight();
                first = element.find("li").first();
                fixer = element.find("li").last().offset().top - element.find("li").first().offset().top;
                first.css("marginTop", ((fixer - parentHeight) / 2 + first.outerHeight()) * -1);
            });
        },
        _fbox_series: function(middle, side, type, neg) {
            var nxt, prv, o = this.options, maxval = type === "h" ? 24 : 60, ret = [ [ middle.toString(), middle ] ];
            for (var i = 1; i <= side; i++) {
                nxt = middle + i * o.durationSteppers[type];
                prv = middle - i * o.durationSteppers[type];
                ret.unshift([ nxt.toString(), nxt ]);
                if (prv > -1) {
                    ret.push([ prv.toString(), prv ]);
                } else {
                    if (neg) {
                        ret.push([ (maxval + prv).toString(), prv ]);
                    } else {
                        ret.push([ "", -1 ]);
                    }
                }
            }
            return ret;
        },
        _fbox_mktxt: {
            y: function(i) {
                return this.theDate.get(0) + i;
            },
            m: function(i) {
                var testDate = this.theDate.copy([ 0 ], [ 0, 0, 1 ]).adj(1, i);
                return this.__("monthsOfYearShort")[testDate.get(1)];
            },
            d: function(i) {
                var w = this, o = this.options;
                if (o.rolloverMode === false || typeof o.rolloverMode.d !== "undefined" && o.rolloverMode.d === false) {
                    var today = this.theDate.get(2), lastDate = 32 - w.theDate.copy([ 0 ], [ 0, 0, 32, 13 ]).getDate(), tempDate = today + i;
                    if (tempDate < 1) {
                        return lastDate + tempDate;
                    } else {
                        if (tempDate % lastDate > 0) {
                            return tempDate % lastDate;
                        } else {
                            return lastDate;
                        }
                    }
                }
                return this.theDate.copy([ 0, 0, i ]).get(2);
            },
            h: function(i) {
                var testDate = this.theDate.copy([ 0, 0, 0, i ]);
                return this.__("timeFormat") === 12 ? testDate.get12hr() : testDate.get(3);
            },
            i: function(i) {
                return this._zPad(this.theDate.copy([ 0, 0, 0, 0, i ]).get(4));
            }
        }
    });
})(jQuery);