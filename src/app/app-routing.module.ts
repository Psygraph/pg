import { NgModule } from '@angular/core';
import {PreloadAllModules, RouterModule, Routes} from '@angular/router';

import { CommonModule } from '@angular/common';
import { FormsModule }  from '@angular/forms';
import { IonicModule }  from '@ionic/angular';

import { WidgetsComponent } from './widgets/widgets.component';
import { AboutPage }        from './pages/about/about';
import { LoginPage }        from './pages/login/login';
import { PreferencesPage }  from './pages/preferences/preferences';
import { CategoriesPage }   from './pages/categories/categories';
import { TutorialPage }     from './pages/tutorial/tutorial';

import { HomePage} from './pages/home/home';
import { StopwatchPage }    from './pages/stopwatch/stopwatch';
import { TimerPage }        from './pages/timer/timer';
import { CounterPage }      from './pages/counter/counter';
import { NotePage }         from './pages/note/note';
import { MapPage }          from './pages/map/map';
import { ListPage }         from './pages/list/list';
import { GraphPage }        from './pages/graph/graph';
import { DialogPage }         from './widgets/dialog/dialog';

const routes: Routes = [
    {
        path: 'pages/home',
        component: HomePage,
        //data:{ reuse:true },
    },
    {
        path: 'pages/stopwatch',
        component: StopwatchPage,
        //data:{ reuse:true },
    },
    {
        path: 'pages/timer',
        component: TimerPage,
        //data:{ reuse:true },
    },
    {
        path: 'pages/counter',
        component: CounterPage,
        //data:{ reuse:true },
    },
    {
        path: 'pages/note',
        component: NotePage,
        //data:{ reuse:true },
    },
    {
        path: 'pages/list',
        component: ListPage,
        //data:{ reuse:true },
    },
    {
        path: 'pages/graph',
        component: GraphPage,
        //data:{ reuse:true },
    },
    {
        path: 'pages/map',
        component: MapPage,
        //data:{ reuse:true },
    },
    {
        path: 'login',
        component: LoginPage,
        //data:{ reuse:true },
    },
    {
        path: 'preferences',
        component: PreferencesPage,
        //data:{ reuse:true },
    },
    {
        path: 'categories',
        component: CategoriesPage,
        //data:{ reuse:true },
    },
    {
        path: 'tutorial',
        component: TutorialPage,
        //data:{ reuse:true },
    },
    {
        path: 'about',
        component: AboutPage,
        //data:{ reuse:true },
    },
    /*
    {
        path: '**',
        redirectTo: 'pages/home', // this should really be a 404
        pathMatch: 'full'
    },
     */
];

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        IonicModule,
        WidgetsComponent,
        RouterModule.forRoot(routes, {preloadingStrategy: PreloadAllModules}),
        //HomeModule.forRoot(),
    ],
    declarations: [
        AboutPage,
        TutorialPage,
        PreferencesPage,
        CategoriesPage,
        LoginPage,
        HomePage,
        StopwatchPage,
        TimerPage,
        NotePage,
        CounterPage,
        MapPage,
        ListPage,
        GraphPage,
        DialogPage,
    ],
    entryComponents: [
        DialogPage,
    ],
    exports: [
        RouterModule,
        AboutPage,
        TutorialPage,
        CategoriesPage,
        LoginPage,
        HomePage,
        StopwatchPage,
        TimerPage,
        NotePage,
        CounterPage,
        MapPage,
        ListPage,
        GraphPage,
    ]
})
export class AppRoutingModule {}
