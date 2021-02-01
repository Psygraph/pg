import {Location} from '@angular/common';
import {
    Attribute,
    ComponentFactoryResolver,
    ComponentRef,
    Directive,
    ElementRef,
    EventEmitter,
    Injector,
    NgZone,
    OnDestroy,
    OnInit,
    Optional,
    Output,
    SkipSelf,
    ViewContainerRef
} from '@angular/core';
import {ActivatedRoute, ChildrenOutletContexts, OutletContext, PRIMARY_OUTLET, Router} from '@angular/router';
import {BehaviorSubject, Observable} from 'rxjs';
import {distinctUntilChanged, filter, switchMap} from 'rxjs/operators';

import {AnimationBuilder, IonRouterOutlet} from '@ionic/angular';
import {Config} from '@ionic/angular';
import {NavController} from '@ionic/angular';

import {StackController} from '@ionic/angular/directives/navigation/stack-controller';
import {RouteView, getUrl} from '@ionic/angular/directives/navigation/stack-utils';

@Directive({
    selector: 'ion-router-outlet', exportAs: 'outlet', inputs: ['animated', 'animation', 'swipeGesture']
})
export class CustomRouterOutlet extends IonRouterOutlet implements OnDestroy, OnInit   {
    constructor(
        protected _parentContexts: ChildrenOutletContexts,
        protected _location: ViewContainerRef,
        protected _resolver: ComponentFactoryResolver,
        @Attribute('name') name: string,
        @Optional() @Attribute('tabs') tabs: string,
        protected _config: Config,
        protected _navCtrl: NavController,
        commonLocation: Location,
        elementRef: ElementRef,
        router: Router,
        zone: NgZone,
        activatedRoute: ActivatedRoute,
        @SkipSelf() @Optional() readonly parentOutlet?: CustomRouterOutlet
    ) {
        super(_parentContexts, _location, _resolver, name, tabs, _config, _navCtrl, commonLocation, elementRef, router, zone, activatedRoute);
    }
    
    activateWith(activatedRoute: ActivatedRoute, resolver: ComponentFactoryResolver | null) {
        super.activateWith(activatedRoute, resolver);
    }
    
}

