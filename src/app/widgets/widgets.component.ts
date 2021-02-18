import { NgModule }      from '@angular/core';

import { PickerWidget } from './picker/picker';
import { ClockWidget } from './clock/clock';
import { ButtonsWidget } from './buttons/buttons';
import { HeaderWidget } from './header/header';
import { FooterWidget} from './footer/footer';
import { SettingsButtonsWidget } from './settingsButtons/settingsButtons';
import { PopoverPage } from './popover/popover';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CategoryFilterPage } from './category-filter/category-filter';
import { ButtonsPage } from './buttonsPage/buttonsPage';
import { ColorPickerModule } from 'ngx-color-picker';
import { RouterModule } from '@angular/router';
import { SettingsPage } from './settings/settings';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        IonicModule,
        RouterModule,
        ColorPickerModule
    ],
    declarations: [
        PickerWidget,
        ClockWidget,
        ButtonsWidget,
        SettingsButtonsWidget,
        HeaderWidget,
        FooterWidget,
        CategoryFilterPage,
        ButtonsPage,
        PopoverPage,
        SettingsPage,
    ],
    entryComponents: [
        CategoryFilterPage,
        ButtonsPage,
        PopoverPage,
        SettingsPage,
    ],
    exports:    [
        PickerWidget,
        ClockWidget,
        ButtonsWidget,
        SettingsButtonsWidget,
        HeaderWidget,
        FooterWidget,
        ColorPickerModule,
        CategoryFilterPage,
        ButtonsPage,
    ]
})
export class WidgetsComponent { }
