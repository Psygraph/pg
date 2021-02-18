import {Page} from './page';
import {pg} from '../pg';
import {pgUtil} from '../util';
import {pgUI} from '../ui';
import {pgFile} from '../file';

import * as $ from 'jquery';

export class Categories extends Page {
    allSounds = [];
    allTexts = [];
    charLimit = 64;
    initSettingsCB = null;
    
    constructor(opts) {
        super('categories', opts);
    }
    init(opts) {
        super.init(opts);
        this.initSettingsCB = opts.initSettingsCB;
        if(this.allSounds.length==0) {
            if (pgUtil.isWebBrowser) {
                this.allSounds.push({name: 'default', value: 'default.mp3'});
                this.allSounds.push({name: 'alarm', value: 'alarm.mp3'});
                this.allSounds.push({name: 'bell', value: 'bell.mp3'});
                this.allSounds.push({name: 'bike', value: 'bike.mp3'});
                this.allSounds.push({name: 'birds', value: 'birds.mp3'});
                this.allSounds.push({name: 'crickets', value: 'crickets.mp3'});
                this.allSounds.push({name: 'hyoshigi', value: 'hyoshigi.mp3'});
                this.allSounds.push({name: 'mokugyo', value: 'mokugyo.mp3'});
                this.allSounds.push({name: 'singingBowl', value: 'singingBowl.mp3'});
                this.allSounds.push({name: 'taiko', value: 'taiko.mp3'});
                this.allTexts.push({name: 'default', value: 'default.xml'});
                this.allTexts.push({name: 'biblical', value: 'biblical.xml'});
                this.allTexts.push({name: 'einstein', value: 'einstein.xml'});
                this.allTexts.push({name: 'lojong', value: 'lojong.xml'});
                this.allTexts.push({name: 'twain', value: 'twain.xml'});
                this.allTexts.push({name: 'xkcd', value: 'xkcd.xml'});
            } else {
                pgFile.listDir(pgUtil.mediaURL, 'mp3', this.addFilenames.bind(this, this.allSounds));
                pgFile.listDir(pgUtil.mediaURL, 'xml', this.addFilenames.bind(this, this.allTexts));
            }
        }
    }
    getCategories() {
        return pg.categories;
    }
    setCategories(cats) {
        const cat = pgUI.category();
        pg.setCategories(cats);
        pgUI.setCurrentCategory(cat);
        // update all page data to reflect changed categories
        for(let page of pg.pages) {
            if(pgUI[page]) {
                pgUI[page].setPageData(pgUI[page].getPageData());
                pgUI[page].savePageData();
            }
        }
    }
    getPageData() {
        let data = pg.getCategoryData();
        data.categories = pg.categories;
        for(let cat of pg.categories) {
            if (!('sound' in data[cat])) {
                data[cat].sound = 'default.mp3';
            }
            if (!('text' in data[cat])) {
                data[cat].text = 'default.xml';
            }
            if (!('color' in data[cat]) || !Array.isArray(data[cat].color)) {
                data[cat].color = [255, 255, 255];
            }
        }
        return data;
    }
    getAllCategoriesNV() {
        let catNV = [];
        for (let i = 0; i < pg.categories.length; i++) {
            let cat = pg.categories[i];
            catNV.push({
                name: cat, value: cat
            });
        }
        return catNV;
    }
    getAllSoundsNV() {
        return this.allSounds;
    }
    getAllTextsNV() {
        return this.allTexts;
    }
    addFilenames(prop, strings) {
        for (var i = 0; i < strings.length; i++) {
            if (!(strings[i] in prop.map(a => a.value))) {
                prop.push({
                    name: pgUtil.removeExt(strings[i]), value: strings[i],
                });
            }
        }
        this.initSettingsCB(true);
    }
    updateView(show) {
        super.updateView(show);
        if (show) {
            this.initSettingsCB(true);
        } else {
            this.initSettingsCB(false);
        }
    }
    
    getFileURL(id) {
        //var dlg = printCheckbox("encode", "Encode", false) + "<br/>";
        // $("#encode").prop('checked')
        pgUI.showDialog({
            title: 'Enter the URL of a file:',
            true: 'OK',
            false: 'Cancel'
        }, '<input id="fileURL" type="text">/media/foo.bar</input>', function(ok) {
            if (ok) {
                var o = $('#fileURL').val();
                var menu = $('#' + id);
                menu.append(new Option(o, o));
                menu.val(o);
                menu.selectmenu('refresh');
            }
        });
    }
}

/*
updateCategory() {
    var category = $("#categories_category").val();
    if (category !== pgUI.category()) {
        //this.updateSettings("apply");
        pgUI.gotoCategory(category);
    }
}

updateSettings(doClose) {
    if(doClose!=="cancel") {

       // get the category data
       var data = getPageData();
       data = this.update(false, data);
       pmtime = pgUtil.getCurrentTime();
       if(doClose==="applyAll") {

       }
       else {

           if(!pgUtil.equal(catData, newCatData)) {
               var cmtime = pgUtil.getCurrentTime();
               this.localPG.setCategoryData(category, cmtime, newCatData);
           }
           pg.setPageData(pmtime, data, "preferences", "Uncategorized");
       }
   }
   if(doClose==="OK" || doClose==="cancel")
       gotoPage( pgUI.page() );
};
*/
