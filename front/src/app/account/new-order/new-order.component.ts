import {Component, HostBinding, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {ApiService} from '../../_services/api.service';
import {PHONE_REGEX} from '../../_helpers/regex';
import {Observable, Subject} from 'rxjs';
import {IIdentity} from '../../_models/IIdentity';
import {debounceTime, filter, map, mergeMap, startWith, switchMap, takeUntil} from 'rxjs/operators';
import {IProduct} from '../../_models/IProduct';
import {select, Store} from '@ngrx/store';
import {AppState, getUser, selectOrder, selectAllProduct} from '../../_store';
import {MatSort} from '@angular/material/sort';
import {MatTableDataSource} from '@angular/material/table';
import {MatAutocompleteSelectedEvent} from '@angular/material/autocomplete';
import {IOrder, IOrderType, Order, IOrderItem} from '../../_models/IOrder';
import {ApiOrderService} from '../../_services/api-order.service';
import {MatStepper} from '@angular/material/stepper';
import {StoreService} from '../../_services/store.service';
import {MatSnackBar} from '@angular/material/snack-bar';
import {IApiResponseError} from '../../_models/IApi';
import {Contact, IContact} from '../../_models/IContact';
import {GeoshopUtils} from '../../_helpers/GeoshopUtils';
import {updateOrder} from '../../_store/cart/cart.action';
import {Router} from '@angular/router';

@Component({
  selector: 'gs2-new-order',
  templateUrl: './new-order.component.html',
  styleUrls: ['./new-order.component.scss']
})
export class NewOrderComponent implements OnInit, OnDestroy {

  private onDestroy$ = new Subject<boolean>();

  @HostBinding('class') class = 'main-container';
  @ViewChild(MatSort, {static: true}) sort: MatSort;
  @ViewChild('stepper') stepper: MatStepper;

  orderFormGroup: FormGroup;
  contactFormGroup: FormGroup;
  orderItemFormGroup: FormGroup;
  invoiceContactsFormControls: { [key: string]: FormControl };

  isSearchLoading = false;
  isCustomerSelected = false;
  isNewInvoiceContact = false;

  currentOrder: Order;
  currentUser$ = this.store.select(getUser);
  orderTypes: IOrderType[] = [];
  filteredCustomers$: Observable<IContact[]> | undefined;

  // order item form: table's attributes
  dataSource: MatTableDataSource<IOrderItem>;
  products: IProduct[] = [];
  displayedColumns: string[] = ['label', 'format', 'price'];

  get customerCtrl() {
    return this.contactFormGroup.get('customer');
  }

  get IsOrderTypePrivate() {
    return this.orderFormGroup?.get('orderType')?.value?.name === 'Privé';
  }

  get IsAddressForCurrentUser() {
    return this.contactFormGroup?.get('addressChoice')?.value === '1';
  }

  get buttonConfirmLabel() {
    return this.currentOrder.items.every(x => x.price_status !== 'PENDING') ?
      'Acheter maintenant' :
      'Demander un devis';
  }

  get isOrderHasPendingItem() {
    return this.currentOrder ?
      this.currentOrder.items.findIndex(x => x.price_status === 'PENDING') > -1 :
      false;
  }

  constructor(private formBuilder: FormBuilder,
              private apiOrderService: ApiOrderService,
              private apiService: ApiService,
              private storeService: StoreService,
              private snackBar: MatSnackBar,
              private router: Router,
              private store: Store<AppState>) {

    this.createForms();
  }

  ngOnInit(): void {
    this.store.pipe(
      takeUntil(this.onDestroy$),
      select(selectAllProduct)
    ).subscribe((cartProducts: IProduct[]) => {
      this.products = cartProducts;
    });

    this.apiOrderService.getOrderTypes()
      .pipe(takeUntil(this.onDestroy$))
      .subscribe(orderTypes => this.orderTypes = orderTypes);

    this.filteredCustomers$ = this.contactFormGroup.get('customer')?.valueChanges.pipe(
      debounceTime(500),
      startWith(''),
      filter(x => typeof x === 'string' && x.length > 2),
      mergeMap(email => {
        this.isSearchLoading = true;
        return this.apiService.find<IContact>(email, 'contact');
      }),
      map(x => {
        this.isSearchLoading = false;
        return x.results;
      })
    );

    this.store.pipe(
      takeUntil(this.onDestroy$),
      select(selectOrder),
      switchMap(x => this.apiOrderService.getFullOrder(x)),
    ).subscribe(order => {
      if (order) {
        this.currentOrder = order;
        this.updateForms(this.currentOrder);
      }
    });
  }

  ngOnDestroy() {
    this.onDestroy$.next(true);
  }

  private getInvoiceContact() {
    const iContact: IContact = {
      first_name: '',
      last_name: '',
      email: '',
      company_name: '',
      url: '',
      city: '',
      country: '',
      postcode: '',
      phone: '',
      sap_id: '',
      street: '',
      street2: '',
    };

    for (const attr in iContact) {
      if (this.contactFormGroup.controls[attr]) {
        iContact[attr] = this.contactFormGroup.controls[attr].value;
      }
    }

    return iContact.first_name && iContact.last_name && iContact.email ?
      new Contact(iContact) :
      undefined;
  }

  private getOrderType(id: string | number) {
    return this.orderTypes.find(x => typeof id === 'number' ?
      id === x.id : id === x.name) || {
      id: 1,
      name: 'Privé'
    };
  }

  private createForms() {
    this.orderFormGroup = this.formBuilder.group({
      orderType: new FormControl(null, Validators.required),
      title: new FormControl('', Validators.required),
      invoice_reference: new FormControl(''),
      description: new FormControl('', Validators.required),
    });

    this.invoiceContactsFormControls = {
      first_name: new FormControl(null, Validators.required),
      last_name: new FormControl(null, Validators.required),
      email: new FormControl(null, Validators.compose(
        [Validators.required, Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$')])),
      company_name: new FormControl(),
      phone: new FormControl(null, Validators.pattern(PHONE_REGEX)),
      street: new FormControl(),
      street2: new FormControl(),
      postcode: new FormControl(),
      city: new FormControl(),
      country: new FormControl(),
      url: new FormControl(),
    };
    this.contactFormGroup = this.formBuilder.group({
      addressChoice: new FormControl('2'),
      customer: new FormControl(null),
      ...this.invoiceContactsFormControls
    });

    this.orderItemFormGroup = this.formBuilder.group({});
  }

  private updateForms(order: Order) {
    this.isCustomerSelected = order.HasInvoiceContact;

    this.orderFormGroup?.setValue({
      orderType: this.getOrderType(order.order_type),
      title: order.title,
      invoice_reference: order.invoice_reference,
      description: order.description
    });

    try {
      if (this.contactFormGroup) {
        this.contactFormGroup.setValue({
          addressChoice: order.HasInvoiceContact ? '2' : '1',
          customer: null,
          first_name: order.invoiceContact?.first_name || '',
          last_name: order.invoiceContact?.last_name || '',
          email: order.invoiceContact?.email || '',
          company_name: order.invoiceContact?.company_name || '',
          phone: order.invoiceContact?.phone || '',
          street: order.invoiceContact?.street || '',
          street2: order.invoiceContact?.street2 || '',
          postcode: order.invoiceContact?.postcode || '',
          city: order.invoiceContact?.city || '',
          country: order.invoiceContact?.country || '',
          url: order.invoiceContact?.url || '',
        });
      }
    } catch {

    }

    this.dataSource = new MatTableDataSource(order.items);
    order.items.forEach((item) => {
      const itemFormControl = new FormControl(item.data_format, Validators.required);
      this.orderItemFormGroup?.addControl(Order.getProductLabel(item), itemFormControl);
    });

    this.updateDescription(this.orderFormGroup?.get('orderType')?.value);
    this.updateContactForm();
  }

  displayCustomer(customer: IIdentity) {
    return customer ?
      customer.company_name ? customer.company_name :
        customer.first_name ? customer.first_name : '' : '';
  }

  updateCustomerForm(event: MatAutocompleteSelectedEvent) {
    this.isCustomerSelected = true;
    this.isNewInvoiceContact = false;

    const iContact: IContact = event.option.value;
    for (const key in iContact) {
      if (this.contactFormGroup.contains(key)) {
        this.contactFormGroup.get(key)?.setValue(iContact[key]);
      }
    }
  }

  clearCustomerForm() {
    this.customerCtrl?.setValue('');
    this.isCustomerSelected = true;
    this.isNewInvoiceContact = true;

    for (const key in this.invoiceContactsFormControls) {
      if (key === 'country') {
        this.contactFormGroup.get(key)?.setValue('Suisse');
      } else {
        this.contactFormGroup.get(key)?.setValue('');
      }
    }
  }

  updateDescription(orderType: IOrderType) {
    if (orderType && orderType.id === 1) {
      this.orderFormGroup.get('description')?.clearValidators();
    } else {
      this.orderFormGroup.get('description')?.setValidators(Validators.required);
    }
    this.orderFormGroup.get('description')?.updateValueAndValidity();
  }

  clearForms() {
    this.updateDescription(this.orderFormGroup?.get('orderType')?.value);

    this.orderFormGroup.get('title')?.setValue('');
    this.orderFormGroup.get('invoice_reference')?.setValue('');
    this.orderFormGroup.get('description')?.setValue('');

    this.contactFormGroup.reset();
    this.isCustomerSelected = false;
  }

  updateContactForm(isNewClient = false) {
    // current user, disable required form controls

    if (this.contactFormGroup.get('addressChoice')?.value === '1') {
      for (const key in this.invoiceContactsFormControls) {
        if (this.invoiceContactsFormControls[key]) {
          this.contactFormGroup.removeControl(key);
          this.contactFormGroup.get(key)?.updateValueAndValidity();
        }
      }
    } else {
      for (const key in this.invoiceContactsFormControls) {
        if (this.invoiceContactsFormControls[key]) {
          this.contactFormGroup.addControl(key, this.invoiceContactsFormControls[key]);
          this.contactFormGroup.get(key)?.updateValueAndValidity();
        }
      }
    }
  }

  resetForms() {
    this.isCustomerSelected = this.currentOrder.HasInvoiceContact;
    this.orderFormGroup.reset({
      orderType: this.getOrderType(this.currentOrder.order_type),
      title: this.currentOrder.title,
      invoice_reference: this.currentOrder.invoice_reference,
      description: this.currentOrder.description,
    });
    this.contactFormGroup.reset({
      addressChoice: this.currentOrder.HasInvoiceContact ? '2' : '1',
      customer: null,
    });

    for (const key in this.invoiceContactsFormControls) {
      if (this.currentOrder.invoiceContact && this.currentOrder.invoiceContact.hasOwnProperty(key)) {
        this.contactFormGroup.get(key)?.setValue(this.currentOrder.invoiceContact[key]);
      }
    }

    this.updateDescription(this.orderFormGroup?.get('orderType')?.value);
    this.updateContactForm();
  }

  orderTypeCompareWith(a: IOrderType, b: IOrderType) {
    return a && b && a.id === b.id;
  }

  createOrUpdateDraftOrder() {
    this.currentOrder.title = this.orderFormGroup.get('title')?.value;
    this.currentOrder.invoice_reference = this.orderFormGroup.get('invoice_reference')?.value;
    this.currentOrder.description = this.orderFormGroup.get('description')?.value;
    this.currentOrder.order_type = this.orderFormGroup.get('orderType')?.value.name;
    const invoiceContact = this.getInvoiceContact();

    if (this.currentOrder.id === -1) {
      this.currentOrder.invoiceContact = invoiceContact;
      this.apiOrderService.createOrder(this.currentOrder.toPostAsJson).subscribe(newOrder => {
        if ((newOrder as IApiResponseError).error) {
          this.snackBar.open(
            (newOrder as IApiResponseError).message, 'Ok', {panelClass: 'notification-error'});
        } else {
          this.storeService.addOrderToStore(new Order(newOrder as IOrder));
          this.stepper.next();
        }
      });
    } else {
      this.apiOrderService.updateOrder(this.currentOrder, invoiceContact).subscribe(newOrder => {
        if ((newOrder as IApiResponseError).error) {
          this.snackBar.open(
            (newOrder as IApiResponseError).message, 'Ok', {panelClass: 'notification-error'});
        } else {
          this.storeService.addOrderToStore(new Order(newOrder as IOrder));
          this.stepper.next();
        }
      });
    }
  }

  getProductLabel(orderItem: IOrderItem) {
    return Order.getProductLabel(orderItem);
  }

  updateDataFormat(orderItem: IOrderItem) {
    const dataFormat = this.orderItemFormGroup.get(Order.getProductLabel(orderItem))?.value;
    const orderItemId = orderItem.id || null;
    if (orderItemId === null) {
      return;
    }
    this.apiOrderService.updateOrderItemDataFormat(dataFormat, orderItemId).subscribe(newOrderItem => {
      if ((newOrderItem as IApiResponseError).error) {
        this.snackBar.open(
          (newOrderItem as IApiResponseError).message, 'Ok', {panelClass: 'notification-error '}
        );
      } else {
        for (let i = 0; i < this.currentOrder.items.length; i++) {
          if (Order.getProductLabel(this.currentOrder.items[i]) === Order.getProductLabel(newOrderItem as IOrderItem)) {
            this.currentOrder.items[i] = newOrderItem as IOrderItem;
          }
        }
        this.storeService.addOrderToStore(this.currentOrder);
      }
    });
  }

  confirm() {
    this.apiOrderService.confirmOrder(this.currentOrder.id).subscribe(newOrder => {
      if (newOrder && (newOrder as IApiResponseError).error) {
        this.snackBar.open(
          (newOrder as IApiResponseError).message, 'Ok', {panelClass: 'notification-error'}
        );
      } else {
        if (newOrder) {
          this.storeService.addOrderToStore(new Order(newOrder as IOrder));
        }
        this.router.navigate(['/account/orders']);
      }
    });
  }
}
