import { Component } from '@angular/core';
import { PickerController } from "@ionic/angular";
import { PickerOptions } from '@ionic/core';

@Component({
    selector: 'picker',
    template: ``,
    styles: [``],
})
export class PickerWidget {
    data: any[] = [ [ "foo" ], [ "bar" ] ];
    selected: number[];

    constructor(private pickerController: PickerController) {}

    numColumns() { // number of columns to display on picker over lay
        return this.data.length;
    }
    numOptions(col:number) {  // number of items (or rows) to display on picker over lay
        return this.data[col].length;
    }
    async showPicker(data, selected, cb=(success, value:any, values) => {}) {
        this.data = data;
        this.selected = selected;
        let options: PickerOptions = {
            buttons: [{
                text: "Cancel",
                role: 'cancel',
                handler: doCallback.bind(this, false, cb)
            }, {
                text: 'OK',
                handler: doCallback.bind(this, true, cb)
            }],
            columns: this.getColumns(),
        };
        let picker = await this.pickerController.create(options);
        picker.present();
        function doCallback(success, cb, data) {
            let values = [];
            for (let col in data) {
                values.push(data[col].value);
            }
            cb(success, values, data);
        }
    }

    getColumns() {
        let columns=[];
        for(let i = 0; i < this.numColumns(); i++){
            columns.push({
                name:`${i}`,
                options: this.getColumnOptions(i, this.selected[i]),
                selectedIndex: this.selected[i],
            })
        }
        return columns;
    }
    getColumnOptions(columnIndex:number, selectedIndex:number){
        let options = [];
        for(let i=0;i < this.numOptions(columnIndex);i++){
            let name = this.data[columnIndex][i % this.numOptions(columnIndex)];
            options.push({
                text: name,
                value: i,
                selected: i==selectedIndex
            });
        }
        return options;
    }
}
/*
export interface PickerColumn {
    name: string;
    align?: string;
    selectedIndex?: number;
    prevSelected?: number;
    prefix?: string;
    suffix?: string;
    options: PickerColumnOption[];
    cssClass?: string | string[];
    columnWidth?: string;
    prefixWidth?: string;
    suffixWidth?: string;
    optionsWidth?: string;
    refresh?: () => void;
}
export interface PickerColumnOption {
    text?: string;
    value?: any;
    disabled?: boolean;
    duration?: number;
    transform?: string;
    selected?: boolean;
}
 */
