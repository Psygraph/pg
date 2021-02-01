import { Component, ViewChild, ElementRef } from '@angular/core';

@Component({
    selector: 'settingsButtons',
    templateUrl: 'settingsButtons.html',
    styleUrls: ['./settingsButtons.scss'],
})
export class SettingsButtonsWidget {
    @ViewChild('cancel', {static:true}) cancel: ElementRef;
    @ViewChild('apply',  {static:true}) apply: ElementRef;
    @ViewChild('ok', {static:true})     ok: ElementRef;
    
    hasText   = true;
    hasApply  = true;
    hasOK     = true;
    hasCancel = true;

    onCancel = () => {};
    onApply  = () => {};
    onOK     = () => {};

    hasApplyAll = true;
    applyAll = false;
    
    constructor() {}

}
