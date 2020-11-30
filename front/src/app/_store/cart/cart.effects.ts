import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {tap} from 'rxjs/operators';
import {ApiOrderService} from '../../_services/api-order.service';
import {MatSnackBar, MatSnackBarRef} from '@angular/material/snack-bar';
import {deleteOrder} from './cart.action';
import {MapService} from '../../_services/map.service';
import {StoreService} from '../../_services/store.service';

@Injectable()
export class CartEffects {
  private snackBarRef: MatSnackBarRef<any>;


  constructor(
    private action$: Actions,
    private apiOrderService: ApiOrderService,
    private mapService: MapService,
    private storeService: StoreService,
    private snackBar: MatSnackBar,
  ) {
  }

  deleteOrder$ = createEffect(() =>
      this.action$.pipe(
        ofType(deleteOrder),
        tap(() => {
          this.storeService.IsLastDraftAlreadyLoadedOrChecked = false;
          this.mapService.eraseDrawing();
        })
      ), {
      dispatch: false
    }
  );
}
