import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Product } from '../_models/IProduct';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(private http: HttpClient) { }

  getProducts() {
    const products: Product[] = [
      new Product({
        name: 'MO - Cadastre complet', minPrice: 2.30, metadata: {
          title: 'RE09 - Courbes de niveau 2010',
          shortDescription: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
          longDescription: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas dictum, nulla eu imperdiet rutrum, nunc quam lacinia lacus, a consectetur dolor ipsum ut risus. In lobortis eros eget ex rhoncus tristique. Sed sed lorem quam. Donec tristique auctor bibendum. Proin vel velit sit amet elit volutpat laoreet et sit amet ex. Phasellus eleifend, risus in porttitor ultricies, nisl leo accumsan eros, eget consectetur nibh quam vel risus. Sed consequat gravida odio sit amet rutrum. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Phasellus pellentesque lobortis nulla, sed lacinia est pharetra vel. Fusce et mollis lectus. Maecenas scelerisque urna imperdiet nisl viverra, ut pharetra elit malesuada. Cras id fermentum urna, ac lobortis magna. Ut elementum, ipsum ut rutrum cursus, enim ipsum ornare dui, laoreet efficitur neque nisi eu ipsum. Donec quis rutrum augue. Sed varius aliquam mi, lacinia vehicula purus laoreet at. Nulla feugiat cursus felis id luctus. ',
          imageLink: 'https://www.infogrips.ch/uploads/pics/e23adb5e2b.png',
          copyright: '',
          geocatLink: '#',
          legendLink: '#'
        }

      })
    ];

    return new BehaviorSubject<Product[]>(products);
  }
}
