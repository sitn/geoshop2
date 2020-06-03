import {Component, HostBinding, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {ApiService} from '../../_services/api.service';
import {PHONE_REGEX} from '../../_helpers/regex';
import {Observable, Subject} from 'rxjs';
import {IIdentity} from '../../_models/IIdentity';
import {debounceTime, filter, map, mergeMap, startWith, switchMap, takeUntil} from 'rxjs/operators';
import {Product} from '../../_models/IProduct';
import {select, Store} from '@ngrx/store';
import {AppState, getUser, selectAllProducts, selectOrder} from '../../_store';
import {MatPaginator} from '@angular/material/paginator';
import {MatSort} from '@angular/material/sort';
import {MatTableDataSource} from '@angular/material/table';
import {MatAutocompleteSelectedEvent} from '@angular/material/autocomplete';
import {Order} from '../../_models/IOrder';

@Component({
  selector: 'gs2-new-order',
  templateUrl: './new-order.component.html',
  styleUrls: ['./new-order.component.scss']
})
export class NewOrderComponent implements OnInit, OnDestroy {

  private onDestroy$ = new Subject<boolean>();

  @HostBinding('class') class = 'main-container';
  @ViewChild(MatPaginator, {static: true}) paginator: MatPaginator;
  @ViewChild(MatSort, {static: true}) sort: MatSort;

  step1FormGroup: FormGroup;
  step2FormGroup: FormGroup;
  lastStepFormGroup: FormGroup;
  isSearchLoading = false;
  isCustomerSelected = false;

  currentOrder: Order;
  currentUser$ = this.store.select(getUser);
  orderTypes$ = this.apiService.getOrderTypes();
  filteredCustomers$: Observable<IIdentity[]> | undefined;

  // last step table attributes
  dataSource: MatTableDataSource<Product>;
  products: Product[] = [];
  displayedColumns: string[] = ['label', 'format', 'quantity', 'price', 'total'];

  get customerCtrl() {
    return this.step2FormGroup.get('customer');
  }

  constructor(private formBuilder: FormBuilder, private apiService: ApiService,
              private store: Store<AppState>) {

    this.store.pipe(
      takeUntil(this.onDestroy$),
      select(selectOrder),
      switchMap(x => this.apiService.getFullOrder(x)),
    ).subscribe(order => {
      this.currentOrder = order;
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
  }

  ngOnInit(): void {
    this.store.pipe(
      takeUntil(this.onDestroy$),
      select(selectAllProducts),
    ).subscribe(x => {
      this.products = x;
      this.dataSource = new MatTableDataSource<Product>(this.products);
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
    });
  }

  ngOnDestroy() {
    this.onDestroy$.next(true);
  }

  private createForms() {
    this.step1FormGroup = this.formBuilder.group({
      orderType: new FormControl(this.currentOrder.getOrderTypeId, Validators.required),
      title: new FormControl(this.currentOrder.title, Validators.required),
      description: new FormControl(this.currentOrder.description, Validators.required),
    });
    this.step2FormGroup = this.formBuilder.group({
      addressChoice: new FormControl(this.currentOrder.isOwnCustomer ? '1' : '2'),
      customer: new FormControl(null),
      info: new FormControl('', Validators.required),
      newClient: new FormControl(false),

      company_name: new FormControl(this.currentOrder.orderContact.company_name, Validators.required),
      first_name: new FormControl(this.currentOrder.orderContact.first_name, Validators.required),
      last_name: new FormControl(this.currentOrder.orderContact.last_name, Validators.required),
      email: new FormControl(this.currentOrder.orderContact.email, Validators.compose([Validators.required, Validators.email])),
      phone: new FormControl(this.currentOrder.orderContact.phone, Validators.pattern(PHONE_REGEX)),
      street: new FormControl(this.currentOrder.orderContact.street, Validators.required),
      street2: new FormControl(this.currentOrder.orderContact.street2, Validators.required),
      postcode: new FormControl(this.currentOrder.orderContact.postcode, Validators.required),
      city: new FormControl(this.currentOrder.orderContact.city, Validators.required),
      country: new FormControl(this.currentOrder.orderContact.country, Validators.required),
    });
    this.lastStepFormGroup = this.formBuilder.group({});

    this.updateDescription(this.currentOrder.getOrderTypeId.toString());
    this.updateForm2(this.currentOrder.getOrderTypeId.toString(),
      !this.currentOrder.isOwnCustomer && this.currentOrder.orderContact != null);
  }

  displayCustomer(customer: IIdentity) {
    return customer ?
      customer.company_name ? customer.company_name :
        customer.first_name ? customer.first_name : '' : '';
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
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
    this.step2FormGroup.get('country')?.setValue('');
  }

  updateDescription(orderTypeValue: number | string) {
    if (orderTypeValue.toString() === '1') {
      this.step1FormGroup.get('description')?.clearValidators();
    } else {
      this.step1FormGroup.get('description')?.setValidators(Validators.required);
    }
    this.step1FormGroup.get('description')?.updateValueAndValidity();
  }

  updateForm1(orderTypeValue: number | string) {
    this.updateDescription(orderTypeValue);

    this.step1FormGroup.get('title')?.setValue('');
    this.step1FormGroup.get('description')?.setValue('');

    this.step2FormGroup.reset();
    this.isCustomerSelected = false;
  }

  updateForm2(orderTypeValue: number | string, isNewClient = false) {
    // current user, disable required form controls
    if (orderTypeValue.toString() === '1') {
      this.step2FormGroup.get('info')?.clearValidators();
      this.step2FormGroup.get('info')?.updateValueAndValidity();

      this.step2FormGroup.get('company_name')?.clearValidators();
      this.step2FormGroup.get('company_name')?.updateValueAndValidity();
      this.step2FormGroup.get('first_name')?.clearValidators();
      this.step2FormGroup.get('first_name')?.updateValueAndValidity();
      this.step2FormGroup.get('last_name')?.clearValidators();
      this.step2FormGroup.get('last_name')?.updateValueAndValidity();
      this.step2FormGroup.get('email')?.clearValidators();
      this.step2FormGroup.get('email')?.updateValueAndValidity();
      this.step2FormGroup.get('phone')?.clearValidators();
      this.step2FormGroup.get('phone')?.updateValueAndValidity();
      this.step2FormGroup.get('street')?.clearValidators();
      this.step2FormGroup.get('street')?.updateValueAndValidity();
      this.step2FormGroup.get('street2')?.clearValidators();
      this.step2FormGroup.get('street2')?.updateValueAndValidity();
      this.step2FormGroup.get('postcode')?.clearValidators();
      this.step2FormGroup.get('postcode')?.updateValueAndValidity();
      this.step2FormGroup.get('city')?.clearValidators();
      this.step2FormGroup.get('city')?.updateValueAndValidity();
      this.step2FormGroup.get('country')?.clearValidators();
      this.step2FormGroup.get('country')?.updateValueAndValidity();
    } else {
      this.step2FormGroup.get('info')?.setValidators(Validators.required);
      this.step2FormGroup.get('info')?.updateValueAndValidity();

      this.step2FormGroup.get('company_name')?.setValidators(Validators.required);
      this.step2FormGroup.get('company_name')?.updateValueAndValidity();
      this.step2FormGroup.get('first_name')?.setValidators(Validators.required);
      this.step2FormGroup.get('first_name')?.updateValueAndValidity();
      this.step2FormGroup.get('last_name')?.setValidators(Validators.required);
      this.step2FormGroup.get('last_name')?.updateValueAndValidity();
      this.step2FormGroup.get('email')?.setValidators(Validators.compose([Validators.required, Validators.email]));
      this.step2FormGroup.get('email')?.updateValueAndValidity();
      this.step2FormGroup.get('phone')?.setValidators(Validators.pattern(PHONE_REGEX));
      this.step2FormGroup.get('phone')?.updateValueAndValidity();
      this.step2FormGroup.get('street')?.setValidators(Validators.required);
      this.step2FormGroup.get('street')?.updateValueAndValidity();
      this.step2FormGroup.get('street2')?.setValidators(Validators.required);
      this.step2FormGroup.get('street2')?.updateValueAndValidity();
      this.step2FormGroup.get('postcode')?.setValidators(Validators.required);
      this.step2FormGroup.get('postcode')?.updateValueAndValidity();
      this.step2FormGroup.get('city')?.setValidators(Validators.required);
      this.step2FormGroup.get('city')?.updateValueAndValidity();
      this.step2FormGroup.get('country')?.setValidators(Validators.required);
      this.step2FormGroup.get('country')?.updateValueAndValidity();
    }

    this.step2FormGroup.get('newClient')?.setValue(isNewClient);
  }

  resetForms() {
    this.isCustomerSelected = false;
    this.step1FormGroup.reset({
      orderType: this.currentOrder.getOrderTypeId,
      title: this.currentOrder.title,
      description: this.currentOrder.description,
    });
    this.step2FormGroup.reset({
      addressChoice: this.currentOrder.isOwnCustomer ? '1' : '2',
      customer: null,
      info: '',
      newClient: false,

      company_name: this.currentOrder.orderContact.company_name,
      first_name: this.currentOrder.orderContact.first_name,
      last_name: this.currentOrder.orderContact.last_name,
      email: this.currentOrder.orderContact.email,
      phone: this.currentOrder.orderContact.phone,
      street: this.currentOrder.orderContact.street,
      street2: this.currentOrder.orderContact.street2,
      postcode: this.currentOrder.orderContact.postcode,
      city: this.currentOrder.orderContact.city,
      country: this.currentOrder.orderContact.country,
    });

    this.updateDescription(this.currentOrder.getOrderTypeId.toString());
    this.updateForm2(this.currentOrder.getOrderTypeId.toString(),
      !this.currentOrder.isOwnCustomer && this.currentOrder.orderContact != null);
  }
}
