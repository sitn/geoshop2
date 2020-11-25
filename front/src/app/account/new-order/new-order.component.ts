import { Component, HostBinding, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../_services/api.service';
import { PHONE_REGEX } from '../../_helpers/regex';
import { Observable, of, Subject } from 'rxjs';
import { IIdentity } from '../../_models/IIdentity';
import { debounceTime, filter, map, mergeMap, startWith, switchMap, takeUntil } from 'rxjs/operators';
import { Product } from '../../_models/IProduct';
import { select, Store } from '@ngrx/store';
import { AppState, getUser, selectOrder, selectAllProducts } from '../../_store';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { IOrder, IOrderType, Order, IOrderItem } from '../../_models/IOrder';
import { ApiOrderService } from '../../_services/api-order.service';
import { MatStepper } from '@angular/material/stepper';
import { StoreService } from '../../_services/store.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { IApiResponseError } from '../../_models/IApi';

@Component({
  selector: 'gs2-new-order',
  templateUrl: './new-order.component.html',
  styleUrls: ['./new-order.component.scss']
})
export class NewOrderComponent implements OnInit, OnDestroy {

  private onDestroy$ = new Subject<boolean>();

  @HostBinding('class') class = 'main-container';
  @ViewChild(MatSort, { static: true }) sort: MatSort;
  @ViewChild('stepper') stepper: MatStepper;

  step1FormGroup: FormGroup;
  step2FormGroup: FormGroup;
  newContactControls: { [key: string]: FormControl; };
  lastStepFormGroup: FormGroup;
  isSearchLoading = false;
  isCustomerSelected = false;

  currentOrder: Order;
  currentUser$ = this.store.select(getUser);
  orderTypes: IOrderType[] = [];
  filteredCustomers$: Observable<IIdentity[]> | undefined;

  // last step table attributes
  dataSource: MatTableDataSource<IOrderItem>;
  products: Product[] = [];
  displayedColumns: string[] = ['label', 'format', 'price'];

  get customerCtrl() {
    return this.step2FormGroup.get('customer');
  }

  constructor(private formBuilder: FormBuilder,
    private apiOrderService: ApiOrderService,
    private apiService: ApiService,
    private storeService: StoreService,
    private snackBar: MatSnackBar,
    private store: Store<AppState>) {

    this.store.pipe(
      takeUntil(this.onDestroy$),
      select(selectOrder),
      switchMap(x => !x.id || x.id > -1 ? of(x) : this.apiOrderService.getFullOrder(x)),
    ).subscribe(order => {
      this.currentOrder = order instanceof Order ? order : new Order(order);
      this.apiOrderService.getOrderTypes().subscribe(orderTypes => {
        this.orderTypes = orderTypes;

        this.createForms();

        this.filteredCustomers$ = this.step2FormGroup.get('customer')?.valueChanges.pipe(
          debounceTime(500),
          startWith(''),
          filter(x => typeof x === 'string' && x.length > 2),
          mergeMap(email => {
            this.isSearchLoading = true;
            return this.apiService.find<IIdentity>(email, 'identity');
          }),
          map(x => {
            this.isSearchLoading = false;
            return x.results;
          })
        );
      });
    });

  }

  ngOnInit(): void {
    this.store.select(selectAllProducts).subscribe((cartProducts) => {
      this.products = cartProducts;
    });
  }

  ngOnDestroy() {
    this.onDestroy$.next(true);
  }

  private getOrderType(id: string | number) {
    return this.orderTypes.find(x => typeof id === 'number' ?
      id === x.id : id === x.name);
  }

  private createForms() {
    this.newContactControls = {
      company_name: new FormControl(this.currentOrder.invoiceContact?.company_name, Validators.required),
      first_name: new FormControl(this.currentOrder.invoiceContact?.first_name, Validators.required),
      last_name: new FormControl(this.currentOrder.invoiceContact?.last_name, Validators.required),
      email: new FormControl(this.currentOrder.invoiceContact?.email, Validators.compose(
        [Validators.required, Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$')])),
      phone: new FormControl(this.currentOrder.invoiceContact?.phone, Validators.pattern(PHONE_REGEX)),
      street: new FormControl(this.currentOrder.invoiceContact?.street, Validators.required),
      street2: new FormControl(this.currentOrder.invoiceContact?.street2),
      postcode: new FormControl(this.currentOrder.invoiceContact?.postcode, Validators.required),
      city: new FormControl(this.currentOrder.invoiceContact?.city, Validators.required),
      country: new FormControl(this.currentOrder.invoiceContact?.country, Validators.required),
    };
    this.step1FormGroup = this.formBuilder.group({
      orderType: new FormControl(this.getOrderType(this.currentOrder.getOrderTypeId), Validators.required),
      title: new FormControl(this.currentOrder.title, Validators.required),
      description: new FormControl(this.currentOrder.description, Validators.required),
    });
    this.step2FormGroup = this.formBuilder.group({
      addressChoice: new FormControl(this.currentOrder.isOwnCustomer ? '1' : '2'),
      customer: new FormControl(null),
      newClient: new FormControl(false),

      ...this.newContactControls
    });
    this.lastStepFormGroup = this.formBuilder.group({});
    this.dataSource = new MatTableDataSource(this.currentOrder.items);
    this.currentOrder.items.forEach((item) => {
      let itemFormControl = new FormControl(item.data_format, Validators.required)
      this.lastStepFormGroup.addControl(item.product, itemFormControl);
    });

    this.updateDescription(this.step1FormGroup?.get('orderType')?.value);
    this.updateForm2();
  }

  displayCustomer(customer: IIdentity) {
    return customer ?
      customer.company_name ? customer.company_name :
        customer.first_name ? customer.first_name : '' : '';
  }

  updateCustomerForm(event: MatAutocompleteSelectedEvent) {
    this.isCustomerSelected = true;

    const identity: IIdentity = event.option.value;
    this.step2FormGroup.get('company_name')?.setValue(identity.company_name);
    this.step2FormGroup.get('first_name')?.setValue(identity.first_name);
    this.step2FormGroup.get('last_name')?.setValue(identity.last_name);
    this.step2FormGroup.get('email')?.setValue(identity.email);
    this.step2FormGroup.get('phone')?.setValue(identity.phone);
    this.step2FormGroup.get('street')?.setValue(identity.street);
    this.step2FormGroup.get('street2')?.setValue(identity.street2);
    this.step2FormGroup.get('postcode')?.setValue(identity.postcode);
    this.step2FormGroup.get('city')?.setValue(identity.city);
    this.step2FormGroup.get('country')?.setValue(identity.country);
  }

  cleanCustomerForm() {
    this.customerCtrl?.setValue('');
    this.isCustomerSelected = false;

    this.step2FormGroup.get('company_name')?.setValue('');
    this.step2FormGroup.get('first_name')?.setValue('');
    this.step2FormGroup.get('last_name')?.setValue('');
    this.step2FormGroup.get('email')?.setValue('');
    this.step2FormGroup.get('phone')?.setValue('');
    this.step2FormGroup.get('street')?.setValue('');
    this.step2FormGroup.get('street2')?.setValue('');
    this.step2FormGroup.get('postcode')?.setValue('');
    this.step2FormGroup.get('city')?.setValue('');
    this.step2FormGroup.get('country')?.setValue('Suisse');
  }

  updateDescription(orderType: IOrderType) {
    if (orderType && orderType.id === 1) {
      this.step1FormGroup.get('description')?.clearValidators();
    } else {
      this.step1FormGroup.get('description')?.setValidators(Validators.required);
    }
    this.step1FormGroup.get('description')?.updateValueAndValidity();
  }

  updateForm1() {
    this.updateDescription(this.step1FormGroup?.get('orderType')?.value);

    this.step1FormGroup.get('title')?.setValue('');
    this.step1FormGroup.get('description')?.setValue('');

    this.step2FormGroup.reset();
    this.isCustomerSelected = false;
  }

  updateForm2(isNewClient = false) {
    // current user, disable required form controls

    if (this.step2FormGroup.get('addressChoice')?.value === '1') {
      for (const key of Object.keys(this.newContactControls)) {
        this.step2FormGroup.removeControl(key);
        this.step2FormGroup.get(key)?.updateValueAndValidity();
      }
    } else {
      for (const key of Object.keys(this.newContactControls)) {
        this.step2FormGroup.addControl(key, this.newContactControls[key]);
      }
    }

    this.step2FormGroup.get('newClient')?.setValue(isNewClient);
  }

  resetForms() {
    this.isCustomerSelected = false;
    this.step1FormGroup.reset({
      orderType: this.getOrderType(this.currentOrder.getOrderTypeId),
      title: this.currentOrder.title,
      description: this.currentOrder.description,
    });
    this.step2FormGroup.reset({
      addressChoice: this.currentOrder.isOwnCustomer ? '1' : '2',
      customer: null,
      newClient: false,

      company_name: this.currentOrder.invoiceContact?.company_name,
      first_name: this.currentOrder.invoiceContact?.first_name,
      last_name: this.currentOrder.invoiceContact?.last_name,
      email: this.currentOrder.invoiceContact?.email,
      phone: this.currentOrder.invoiceContact?.phone,
      street: this.currentOrder.invoiceContact?.street,
      street2: this.currentOrder.invoiceContact?.street2,
      postcode: this.currentOrder.invoiceContact?.postcode,
      city: this.currentOrder.invoiceContact?.city,
      country: this.currentOrder.invoiceContact?.country,
    });

    this.updateDescription(this.step1FormGroup?.get('orderType')?.value);
    this.updateForm2();
  }

  orderTypeCompareWith(a: IOrderType, b: IOrderType) {
    return a && b && a.id === b.id;
  }

  createOrUpdateDraftOrder() {
    this.currentOrder.title = this.step1FormGroup.get('title')?.value;
    this.currentOrder.description = this.step1FormGroup.get('description')?.value;
    this.currentOrder.order_type = this.step1FormGroup.get('orderType')?.value['name'];

    this.apiOrderService.updateOrPostOrder(this.currentOrder, this.products).subscribe(newOrder => {
      if ((newOrder as IApiResponseError).error) {
        this.snackBar.open(
          (newOrder as IApiResponseError).message, 'Ok', { panelClass: 'notification-error' });
      } else {
        this.storeService.addOrderToStore(new Order(newOrder as IOrder));
        this.stepper.next();
      }
    });
  }

  updateDataFormat(orderItem: IOrderItem) {
    const data_format = this.lastStepFormGroup.get(orderItem.product)?.value;
    let orderItemId = orderItem.id || null
    if (orderItemId === null) {
      return
    }
    this.apiOrderService.updateOrderItemDataFormat(data_format, orderItemId).subscribe(newOrderItem => {
      if ((newOrderItem as IApiResponseError).error) {
        this.snackBar.open(
          (newOrderItem as IApiResponseError).message, 'Ok', { panelClass: 'notification-error '}
        )
      }
    });
  }

  confirm() {
    console.log('currentOrder', this.currentOrder);
  }
}
