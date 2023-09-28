import {Component, OnInit, ElementRef, ViewChild} from '@angular/core';
import {IProduct} from 'src/app/_models/IProduct';
import {ApiService} from 'src/app/_services/api.service';
import {ConfigService} from 'src/app/_services/config.service';
import {MatDialog} from '@angular/material/dialog';
import {DialogMetadataComponent} from './dialog-metadata/dialog-metadata.component';
import {UntypedFormControl} from '@angular/forms';
import {BehaviorSubject, merge, Observable} from 'rxjs';
import {debounceTime, map, mergeMap, scan, switchMap, tap, throttleTime} from 'rxjs/operators';
import {CdkVirtualScrollViewport} from '@angular/cdk/scrolling';
import {AppState, selectOrder} from '../../_store';
import {Store} from '@ngrx/store';
import {MatSnackBar} from '@angular/material/snack-bar';
import {GeoshopUtils} from '../../_helpers/GeoshopUtils';
import {IOrder} from '../../_models/IOrder';
import {updateOrder} from '../../_store/cart/cart.action';

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
  infinite: Observable<IProduct[] | unknown[]>;
  total = 0;
  stepToLoadData = 0;
  readonly catalogItemHeight = 64;
  isSearchLoading = false;

  // Filtering
  catalogInputControl = new UntypedFormControl('');

  mediaUrl: String | undefined;
  order: IOrder;

  constructor(private apiService: ApiService,
              public dialog: MatDialog,
              private store: Store<AppState>,
              private elRef: ElementRef,
              private snackBar: MatSnackBar,
              private configService: ConfigService) {

    this.store.select(selectOrder).subscribe(x => this.order = x);

    const batchMap = this.offset.pipe(
      throttleTime(500),
      mergeMap((n: number) => this.getBatch(n)),
      scan((acc, batch) => {
        return {...acc, ...batch};
      }, {})
    );

    this.mediaUrl = this.configService.config?.mediaUrl;

    this.infinite = merge(
      batchMap.pipe(map(v => Object.values(v))),
      this.catalogInputControl.valueChanges.pipe(
        debounceTime(500),
        switchMap(inputText => {
          this.isSearchLoading = true;

          if (!inputText || inputText.length < 2) {
            return this.apiService.getProducts(0, this.batch)
              .pipe(
                map((response) => {
                  this.isSearchLoading = false;
                  this.total = response ? response.count : 0;
                  return response ? response.results : [];
                })
              );
          }

          return this.apiService.find<IProduct>(inputText, 'product').pipe(
            map(response => {
              this.isSearchLoading = false;
              this.total = response ? response.count : 0;
              return response ? response.results : [];
            })
          );
        })
      )
    );
  }

  ngOnInit(): void {
    const firstElement = this.elRef.nativeElement.children[0].clientHeight;
    const heightAvailable = this.elRef.nativeElement.clientHeight - firstElement - 10;

    const numberOfRowPossible = Math.trunc(heightAvailable / this.catalogItemHeight);
    const half = Math.trunc(numberOfRowPossible / 2);
    this.stepToLoadData = numberOfRowPossible - half;
    this.batch = numberOfRowPossible + half;
  }

  addToCart(product: IProduct) {
    const order = GeoshopUtils.deepCopyOrder(this.order);
    const itemsInCart = order.items.map(x => x.product_id);
    if (itemsInCart.indexOf(product.id) === -1) {
      order.items.push({
        product,
        product_id: product.id
      });
    } else {
      this.snackBar.open('Le produit est déjà dans le panier', 'Fermer', {duration: 3000});
    }
    this.store.dispatch(updateOrder({order}));
  }

  getBatch(offset: number) {
    return this.apiService.getProducts(offset, this.batch)
      .pipe(
        tap(response => this.total = response ? response.count : 0),
        map((response) => response ? response.results : []),
        map(arr => {
          return arr.reduce((acc, cur) => {
            const id = cur.label;
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

  openMetadata(product: IProduct) {
    this.apiService.loadMetadata(product.metadata)
      .subscribe(result => {
        if (result) {
          product.metadataObject = result;
          this.dialog.open(DialogMetadataComponent, {
            width: '60%',
            height: '90%',
            data: product.metadataObject,
            autoFocus: false,
          });
        } else {
          this.snackBar.open('Métadonnée indisponible pour le moment.', 'Fermer', {duration: 3000});
        }
      });
  }
}
