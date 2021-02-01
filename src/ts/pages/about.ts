import {pgUtil} from '../util';
import {pgAudio} from '../audio';
import {pgMath, pSeries, pTDL, pARMA} from '../pNode';
import {ButtonPage} from './page';

import * as $ from 'jquery';
import {pgNet} from '../net';

export class About extends ButtonPage {
    AI;
    trials;
    
    constructor(opts) {
        super('about', opts);
        // create the guesser
        this.AI = new pSeries([new pTDL(1, 4), new pARMA(4, 1)]);
        this.trials = [];
    }
    init(opts) {
        super.init(opts);
    }
    getPageData() {
        var data = super.getPageData();
        if (!('intro' in data)) {
            data.intro = true;
        }
        return data;
    }
    updateView(show) {
        super.updateView(show);
        this.setRunning(false);
        if (show) {
            this.trials = [];
        }
        // primary actions
    }
    start(restart = false, time = pgUtil.getCurrentTime()) {
        this.press(1);
    }
    reset() {
        this.press(-1);
    }
    press(value) {
        var guess = this.AI.roundedOutput()[0];
        this.AI.input([value]);
        var correct = (guess == value);
        
        this.trials.push(correct ? 0 : 1);
        var len = this.trials.length;
        var ratio = {all: pgMath.mean(this.trials), len: len, some: 0, someLen: 0};
        var maLen = 10;
        if (len > maLen) {
            ratio.some = pgMath.mean(this.trials.slice(len - maLen, len));
            ratio.someLen = maLen;
        }
        if (correct) {
            setFeedbackText('PREDICTED', ratio);
            pgAudio.reward(false);
        } else {
            setFeedbackText('RANDOM', ratio);
            pgAudio.reward(true);
        }
        function setFeedbackText(txt, ratio) {
            var html = '<p><h2>' + txt + '</h2></p>';
            html += '<p>Your score: ' + (ratio.all * 2 * 100).toFixed(2) + '</p>';
            if (ratio.someLen) {
                html += '<p>Your recent (' + ratio.someLen + ' trial) score: ' + (ratio.some * 2 * 100).toFixed(2) + '</p>';
            }
            $('#feedback').html(html);
        }
    }
}
