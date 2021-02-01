import { Component, ViewChild, ElementRef } from '@angular/core';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {IonTabBar, NavController} from '@ionic/angular';

@Component({
    selector: 'footer',
    template: `
        <ion-footer>
            <ion-tab-bar #tabBar *ngIf="showFooter">
                <ion-tab-button tab="home" routerLink="/pages/home" routerDirection="root" routerLinkActive="active">
                    <ion-icon name="calendar"></ion-icon>
                    <ion-label>Home</ion-label>
                </ion-tab-button>

                <ion-tab-button tab="stopwatch" routerLink="/pages/stopwatch" routerDirection="root" routerLinkActive="active">
                    <ion-icon name="stopwatch"></ion-icon>
                    <ion-label>Stopwatch</ion-label>
                </ion-tab-button>

                <ion-tab-button tab="timer" routerLink="/pages/timer" routerDirection="root" routerLinkActive="active">
                    <ion-icon name='notifications'></ion-icon>
                    <ion-label>Timer</ion-label>
                </ion-tab-button>

                <ion-tab-button tab="counter" routerLink="/pages/counter" routerDirection="root" routerLinkActive="active">
                    <ion-icon name="bar-chart"></ion-icon>
                    <ion-label>Counter</ion-label>
                </ion-tab-button>

                <ion-tab-button tab="note" routerLink="/pages/note" routerDirection="root" routerLinkActive="active">
                    <ion-icon name="mic"></ion-icon>
                    <ion-label>Note</ion-label>
                </ion-tab-button>
            </ion-tab-bar>
        </ion-footer>
    `,
    styles: [`
        input {
            outline: 0 none; /* turn off button highlight */
        }
        .tabbar {
            justify-content: center;
        }
        .tab-button {
            max-width: 200px;
        }
        ion-footer{
            position: inherit;
        }
    `],
})

export class FooterWidget {
    @ViewChild(IonTabBar, {static:false}) tabBar: IonTabBar;
    navCtrl: NavController;
    showFooter = true;
    
    constructor(
    ) {
    }
    onClick(activeTab:string) {
        this.tabBar.selectedTab = activeTab;
        //this.navCtrlpush(["/pages/"+activeTab]);
    }
}
