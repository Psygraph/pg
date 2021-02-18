import {Component} from '@angular/core';
import {Config, ModalController, NavParams} from '@ionic/angular';

@Component({
    selector: 'page-category-filter',
    templateUrl: 'category-filter.html',
    styleUrls: ['./category-filter.scss'],
})
export class CategoryFilterPage {
    ios: boolean;
    categories: [];
    activeCategory: '';
    
    constructor(private config: Config, public modalCtrl: ModalController, public navParams: NavParams) {
    }
    ionViewWillEnter() {
        this.ios = this.config.get('mode') === `ios`;
        // passed in array of track names that should be excluded (unchecked)
        this.categories = this.navParams.get('categories');
        this.activeCategory = this.navParams.get('activeCategory');
    }
    selectCategory(cat) {
        this.activeCategory = cat;
        this.apply();
    }
    apply() {
        // Pass back the new category
        this.dismiss(this.activeCategory);
    }
    dismiss(data= "") {
        // using the injected ModalController this page
        // can "dismiss" itself and pass back data
        this.modalCtrl.dismiss(data);
    }
}
