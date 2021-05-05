import {Component, HostBinding, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {ApiService} from '../../_services/api.service';
import {PHONE_REGEX, IDE_REGEX} from '../../_helpers/regex';
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
import {Contact, IContact} from '../../_models/IContact';
import {Router} from '@angular/router';
import * as fromCart from '../../_store/cart/cart.action';
import {MatDialog, MatDialogRef} from '@angular/material/dialog';
import {ConfirmDialogComponent} from '../../_components/confirm-dialog/confirm-dialog.component';

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
  addressChoiceForm: FormGroup;
  contactFormGroup: FormGroup;
  orderItemFormGroup: FormGroup;
  invoiceContactsFormControls: { [key: string]: FormControl };

  isSearchLoading = false;
  isOrderPatchLoading = false;
  isCustomerSelected = false;
  isNewInvoiceContact = false;

  currentSelectedContact: Contact | undefined;
  currentOrder: Order;
  currentUser$ = this.store.select(getUser);
  orderTypes: IOrderType[] = [];
  filteredCustomers$: Observable<IContact[]> | undefined;

  // order item form: table's attributes
  allAvailableFormats: Set<string>;
  dataSource: MatTableDataSource<IOrderItem>;
  products: IProduct[] = [];
  displayedColumns: string[] = ['label', 'format', 'price'];

  get customerCtrl() {
    return this.contactFormGroup.get('customer');
  }

  get IsOrderTypePrivate() {
    return this.orderFormGroup?.get('orderType')?.value?.name === 'Privé';
  }

  get orderTypeCtrl() {
    return this.orderFormGroup?.get('orderType');
  }

  get emailDeliverCtrl() {
    return this.orderFormGroup?.get('emailDeliver');
  }

  get emailDeliverChoiceCtrl() {
    return this.orderFormGroup.get('emailDeliverChoice');
  }

  get IsAddressForCurrentUser() {
    return this.addressChoiceCtrl?.value === '1';
  }

  get addressChoiceCtrl() {
    return this.addressChoiceForm.get('addressChoice');
  }

  get buttonConfirmLabel() {
    return this.currentOrder.items.every(x => x.price_status !== 'PENDING') ?
      'Acheter maintenant' :
      'Demander un devis';
  }

  get isOrderHasPendingItem() {
    return this.currentOrder ?
      !this.currentOrder.isAllOrderItemCalculated :
      false;
  }

  constructor(private formBuilder: FormBuilder,
              private apiOrderService: ApiOrderService,
              private apiService: ApiService,
              private storeService: StoreService,
              private snackBar: MatSnackBar,
              private router: Router,
              private store: Store<AppState>,
              private dialog: MatDialog) {

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
      mergeMap(searchString => {
        this.isSearchLoading = true;
        return this.apiService.find<IContact>(searchString, 'contact');
      }),
      map(x => {
        this.isSearchLoading = false;
        return x ? x.results : [];
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
      ide_id: '',
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
      emailDeliverChoice: new FormControl('1'),
      emailDeliver: new FormControl('', Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$')),
      description: new FormControl('', Validators.required),
    });
    this.orderTypeCtrl?.valueChanges.subscribe(
      (choice) => {
        if (choice.name === 'Privé') {
          this.addressChoiceCtrl?.setValue('1');
        } else {
          this.addressChoiceCtrl?.setValue('2');
        }
      }
    );
    this.emailDeliverChoiceCtrl?.valueChanges.subscribe(
      (choice) => {
        if (choice === '1') {
          this.emailDeliverCtrl?.setValue('');
        }
      }
    );
    this.invoiceContactsFormControls = {
      first_name: new FormControl(null, Validators.required),
      last_name: new FormControl(null, Validators.required),
      email: new FormControl(null, Validators.compose(
        [Validators.required, Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$')])),
      company_name: new FormControl(),
      ide_id: new FormControl(null, Validators.compose(
        [Validators.pattern(IDE_REGEX)])),
      phone: new FormControl(null, Validators.pattern(PHONE_REGEX)),
      street: new FormControl(),
      street2: new FormControl(),
      postcode: new FormControl(),
      city: new FormControl(),
      country: new FormControl(),
      url: new FormControl(),
    };

    this.addressChoiceForm = new FormGroup({
      addressChoice: new FormControl('1')
    });
    this.addressChoiceCtrl?.valueChanges.subscribe((choice) => this.updateContactForm(choice));

    this.contactFormGroup = new FormGroup({
      customer: new FormControl(null),
      ...this.invoiceContactsFormControls
    });
    this.orderItemFormGroup = new FormGroup({
      formatsForAll: new FormControl(null)
    });
  }

  private updateForms(order: Order) {
    this.isCustomerSelected = order.HasInvoiceContact;

    this.orderFormGroup?.setValue({
      orderType: this.getOrderType(order.order_type),
      title: order.title,
      invoice_reference: order.invoice_reference,
      emailDeliver: order.email_deliver,
      emailDeliverChoice: order.email_deliver ? "2" : "1",
      description: order.description
    });

    if (order.HasInvoiceContact) {
      this.addressChoiceCtrl?.setValue('2');
      this.currentSelectedContact = order.invoiceContact;
    } else {
      this.addressChoiceCtrl?.setValue('1');
    }


    try {
      if (this.contactFormGroup) {
        this.contactFormGroup.setValue({
          customer: null,
          first_name: order.invoiceContact?.first_name || '',
          last_name: order.invoiceContact?.last_name || '',
          email: order.invoiceContact?.email || '',
          company_name: order.invoiceContact?.company_name || '',
          ide_id: order.invoiceContact?.ide_id || '',
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

    for (const attr in this.orderItemFormGroup.controls) {
      if (attr !== 'formatsForAll') {
        if (this.orderItemFormGroup.controls[attr]) {
          this.orderItemFormGroup.removeControl(attr);
        }
      }
    }

    this.allAvailableFormats = new Set();
    for (const item of order.items) {
      item.available_formats?.forEach(format => this.allAvailableFormats.add(format));
      const itemFormControl = new FormControl('', Validators.required);
      const controlName = this.getOrderItemControlName(item);
      this.orderItemFormGroup?.addControl(controlName, itemFormControl);

      if (item.data_format && item.available_formats &&
        item.available_formats.indexOf(item.data_format) > -1) {
          itemFormControl.setValue(item.data_format);
        }
      }

    // create table source only on order PUT, don't refresh table on PATCH
    if (this.isOrderPatchLoading) {
      this.isOrderPatchLoading = false;
    } else {
      this.dataSource = new MatTableDataSource(order.items);
    }

    this.updateDescription(this.orderFormGroup?.get('orderType')?.value);
    this.updateContactForm(this.addressChoiceCtrl?.value);
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
    this.currentSelectedContact = new Contact(iContact);
    for (const key in iContact) {
      if (this.contactFormGroup.contains(key)) {
        this.contactFormGroup.get(key)?.setValue(iContact[key]);
      }
    }

    this.contactFormGroup.markAsPristine();
  }

  resetCustomerSearch() {
    this.customerCtrl?.setValue('');
    this.isCustomerSelected = false;
    this.isNewInvoiceContact = false;
    this.currentSelectedContact = undefined;
    this.contactFormGroup.reset();
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
    const orderTypeValue = this.orderFormGroup?.get('orderType')?.value;
    this.updateDescription(orderTypeValue);
    const mandatoryContactOrders = ['Communal', 'Cantonal', 'Fédéral', 'Académique', 'Utilisateur permanent'];
    if (mandatoryContactOrders.indexOf(orderTypeValue.name) > -1) {
      // Force enable contact form because it's a public mandate
      this.addressChoiceCtrl?.setValue('2');
    } else {
      this.addressChoiceCtrl?.setValue('1');
    }
    this.contactFormGroup.reset();
    this.isCustomerSelected = false;
  }

  updateContactForm(addressChoice: string) {
    // current user, disable required form controls
    if (addressChoice === '1') {
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
      emailDeliver: this.currentOrder.email_deliver,
      emailDeliverChoice: this.currentOrder.email_deliver ? '2' : '1',
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
    this.updateContactForm(this.addressChoiceCtrl?.value);
  }

  orderTypeCompareWith(a: IOrderType, b: IOrderType) {
    return a && b && a.id === b.id;
  }

  createOrUpdateDraftOrder() {
    const invoiceContact = this.getInvoiceContact();

    // means the contact was updated
    if (!this.isNewInvoiceContact && this.contactFormGroup.valid && this.contactFormGroup.dirty && invoiceContact
      && this.currentSelectedContact) {

      let dialogRef: MatDialogRef<ConfirmDialogComponent> | null = this.dialog.open(ConfirmDialogComponent, {
        disableClose: false,
      });

      if (!dialogRef) {
        return;
      }

      dialogRef.componentInstance.noButtonTitle = 'Annuler';
      dialogRef.componentInstance.yesButtonTitle = 'Continuer';
      dialogRef.componentInstance.confirmMessage =
        `Le contact <b style='color:#26a59a;'>${this.currentSelectedContact.first_name} ${this.currentSelectedContact.last_name}</b> a été modifié. Voulez-vous continuer?`;
      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.apiOrderService.deleteContact(invoiceContact.Id).subscribe(confirmed => {
            if (confirmed) {
              invoiceContact.Id = -1;
              this._createOrUpdateDraftOrder(invoiceContact);
            }
          });
        }
        dialogRef = null;
      });
    } else {
      this._createOrUpdateDraftOrder(invoiceContact);
    }
  }

  private _createOrUpdateDraftOrder(invoiceContact: Contact | undefined) {
    this.currentOrder.title = this.orderFormGroup.get('title')?.value;
    this.currentOrder.invoice_reference = this.orderFormGroup.get('invoice_reference')?.value;
    this.currentOrder.email_deliver = this.orderFormGroup.get('emailDeliver')?.value;
    this.currentOrder.description = this.orderFormGroup.get('description')?.value;
    this.currentOrder.order_type = this.orderFormGroup.get('orderType')?.value.name;

    if (this.currentOrder.id === -1) {
      this.currentOrder.invoiceContact = invoiceContact;
      this.apiOrderService.createOrder(this.currentOrder.toPostAsJson, invoiceContact, this.IsAddressForCurrentUser)
      .subscribe(newOrder => {
        if (newOrder) {
          this.resetCustomerForm();
          this.storeService.addOrderToStore(new Order(newOrder as IOrder));
          this.stepper.next();
        }
      });
    } else {
      this.apiOrderService.updateOrder(this.currentOrder, invoiceContact, this.IsAddressForCurrentUser)
      .subscribe(newOrder => {
        if (newOrder) {
          this.resetCustomerForm();
          this.storeService.addOrderToStore(new Order(newOrder as IOrder));
          this.stepper.next();
        }
      });
    }
  }

  getProductLabel(orderItem: IOrderItem) {
    return Order.getProductLabel(orderItem);
  }

  getOrderItemControlName(orderItem: IOrderItem) {
    return `${orderItem.id}_${Order.getProductLabel(orderItem)}`;
  }

  updateAllDataFormats() {
    this.isOrderPatchLoading = true;
    const dataFormatName = this.orderItemFormGroup.get('formatsForAll')?.value || '';
    for (const item of this.currentOrder.items) {
      const availableFormats = item.available_formats || [];
      if (availableFormats.indexOf(dataFormatName) > -1) {
        item.data_format = dataFormatName;
      }
    }
    this.apiOrderService.updateOrderItemsDataFormats(this.currentOrder).subscribe(newOrder => {
      if (newOrder) {
        this.storeService.addOrderToStore(new Order(newOrder as IOrder));
      }
    });
  }

  updateDataFormat(orderItem: IOrderItem) {
    if (orderItem.id == null) {
      return;
    }

    const controlName = this.getOrderItemControlName(orderItem);
    const dataFormat = this.orderItemFormGroup.get(controlName)?.value;

    this.apiOrderService.updateOrderItemDataFormat(dataFormat, orderItem.id).subscribe(newOrderItem => {
      if (newOrderItem) {
        for (let i = 0; i < this.currentOrder.items.length; i++) {
          if (Order.getProductLabel(this.currentOrder.items[i]) === Order.getProductLabel(newOrderItem)) {
            this.currentOrder.items[i] = newOrderItem;
          }
        }
        this.storeService.addOrderToStore(this.currentOrder);
      }
    });
  }

  confirm() {
    if (this.orderItemFormGroup.valid) {
      this.apiOrderService.confirmOrder(this.currentOrder.id).subscribe(async confirmed => {
        if (confirmed) {
          this.store.dispatch(fromCart.deleteOrder());
          await this.router.navigate(['/account/orders']);
        }
      });
    }
  }

  resetCustomerForm() {
    if (this.currentSelectedContact) {
      for (const attr in this.currentSelectedContact) {
        if (this.currentSelectedContact[attr] != null && this.contactFormGroup.contains(attr)) {
          this.contactFormGroup.get(attr)?.reset(this.currentSelectedContact[attr]);
        }
      }
    }
  }

  deleteCurrentContact() {
    const contact = this.getInvoiceContact();

    if (this.isCustomerSelected && contact && contact.Id) {
      let dialogRef: MatDialogRef<ConfirmDialogComponent> | null = this.dialog.open(ConfirmDialogComponent, {
        disableClose: false,
      });

      if (!dialogRef) {
        return;
      }

      dialogRef.componentInstance.noButtonTitle = 'Annuler';
      dialogRef.componentInstance.yesButtonTitle = 'Supprimer';
      dialogRef.componentInstance.confirmMessage =
        `Etes-vous sûr de vouloir supprimer le contact <b style='color:#26a59a;'>${contact.first_name} ${contact.last_name}</b> ?`;
      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.apiOrderService.deleteContact(contact.Id).subscribe(confirmed => {
            if (confirmed) {
              this.clearCustomerForm();
              this.isCustomerSelected = false;
            }
          });
        }
        dialogRef = null;
      });
    }
  }
}
