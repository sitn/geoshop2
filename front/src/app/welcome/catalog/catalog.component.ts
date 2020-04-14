import {Component, OnInit, ElementRef, ViewChild} from '@angular/core';
import {Product} from 'src/app/_models/IProduct';
import {ApiService} from 'src/app/_services/api.service';
import {MatDialog} from '@angular/material/dialog';
import {DialogMetadataComponent} from './dialog-metadata/dialog-metadata.component';
import {FormControl} from '@angular/forms';
import {BehaviorSubject, Observable} from 'rxjs';
import {map, mergeMap, scan, tap, throttleTime} from 'rxjs/operators';
import {CdkVirtualScrollViewport} from '@angular/cdk/scrolling';
import {AppState} from '../../_store';
import {Store} from '@ngrx/store';
import * as fromCart from '../../_store/cart/cart.action';

@Component({
  selector: 'gs2-catalog',
  templateUrl: './catalog.component.html',
  styleUrls: ['./catalog.component.scss']
})
export class CatalogComponent implements OnInit {

  // Infinity scrolling
  @ViewChild(CdkVirtualScrollViewport) viewport: CdkVirtualScrollViewport;
  batch = 20;
  offset = new BehaviorSubject<number | null>(null);
  infinite: Observable<Product[]>;
  total = 0;
  stepToLoadData = 0;
  readonly catalogItemHeight = 64;

  // Filtering
  catalogInputControl = new FormControl('');

  constructor(private apiService: ApiService, public dialog: MatDialog,
              private store: Store<AppState>,
              private elRef: ElementRef) {

    const batchMap = this.offset.pipe(
      throttleTime(500),
      mergeMap((n: number) => this.getBatch(n)),
      scan((acc, batch) => {
        return {...acc, ...batch};
      }, {})
    );

    this.infinite = batchMap.pipe(map(v => Object.values(v)));
  }

  ngOnInit(): void {
    const firstElement = this.elRef.nativeElement.children[0].clientHeight;
    const heightAvailable = this.elRef.nativeElement.clientHeight - firstElement - 10;

    const numberOfRowPossible = Math.trunc(heightAvailable / this.catalogItemHeight);
    const half = Math.trunc(numberOfRowPossible / 2);
    this.stepToLoadData = numberOfRowPossible - half;
    this.batch = numberOfRowPossible + half;
  }

  addToCart(product: Product) {
    console.log('add to cart', product);
    this.store.dispatch(fromCart.addProduct({product}));
  }

  getBatch(offset: number) {
    return this.apiService.getProducts(offset, this.batch)
      .pipe(
        tap(response => this.total = response.count),
        map((response) => response.results.map(x => new Product(x))),
        map(arr => {
          return arr.reduce((acc, cur) => {
            const id = cur.url;
            return {...acc, [id]: cur};
          }, {});
        })
      );
  }

  nextBatch(e: number, offset: number) {
    if (offset + 1 >= this.total) {
      return;
    }

    const end = this.viewport.getRenderedRange().end;
    const total = this.viewport.getDataLength();

    if (end === total) {
      this.offset.next(offset);
    }
  }

  trackByIdx(i: number) {
    return i;
  }

  openMetadata(product: Product) {
    this.dialog.open(DialogMetadataComponent, {
      width: '500px',
      data: product.metadata
    });
  }
}
