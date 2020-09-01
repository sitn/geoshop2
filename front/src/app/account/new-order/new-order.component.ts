import {Component, HostBinding, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {ApiService} from '../../_services/api.service';
import {PHONE_REGEX} from '../../_helpers/regex';
import {Observable, of, Subject} from 'rxjs';
import {IIdentity} from '../../_models/IIdentity';
import {debounceTime, filter, map, mergeMap, startWith, switchMap, takeUntil} from 'rxjs/operators';
import {Product} from '../../_models/IProduct';
import {select, Store} from '@ngrx/store';
import {AppState, getUser, selectOrder} from '../../_store';
import {MatPaginator} from '@angular/material/paginator';
import {MatSort} from '@angular/material/sort';
import {MatTableDataSource} from '@angular/material/table';
import {MatAutocompleteSelectedEvent} from '@angular/material/autocomplete';
import {IOrder, IOrderType, Order} from '../../_models/IOrder';
import {ApiOrderService} from '../../_services/api-order.service';
import {MatStepper} from '@angular/material/stepper';
import {StoreService} from '../../_services/store.service';
import {MatSnackBar} from '@angular/material/snack-bar';
import {IApiResponseError} from '../../_models/IApi';

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
  @ViewChild('stepper') stepper: MatStepper;

  step1FormGroup: FormGroup;
  step2FormGroup: FormGroup;
  lastStepFormGroup: FormGroup;
  isSearchLoading = false;
  isCustomerSelected = false;

  currentOrder: Order;
  currentUser$ = this.store.select(getUser);
  orderTypes: IOrderType[] = [];
  filteredCustomers$: Observable<IIdentity[]> | undefined;

  // last step table attributes
  dataSource: MatTableDataSource<Product>;
  products: Product[] = [];
  displayedColumns: string[] = ['label', 'format', 'quantity', 'price', 'total'];

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
    // this.store.pipe(
    //   takeUntil(this.onDestroy$),
    //   select(selectAllProducts),
    // ).subscribe(x => {
    //   this.products = x;
    //   this.dataSource = new MatTableDataSource<Product>(this.products);
    //   this.dataSource.paginator = this.paginator;
    //   this.dataSource.sort = this.sort;
    // });
  }

  ngOnDestroy() {
    this.onDestroy$.next(true);
  }

  private getOrderType(id: string | number) {
    return this.orderTypes.find(x => typeof id === 'number' ?
      id === x.id : id === x.name);
  }

  private createForms() {
    this.step1FormGroup = this.formBuilder.group({
      orderType: new FormControl(this.getOrderType(this.currentOrder.getOrderTypeId), Validators.required),
      title: new FormControl(this.currentOrder.title, Validators.required),
      description: new FormControl(this.currentOrder.description, Validators.required),
    });
    this.step2FormGroup = this.formBuilder.group({
      addressChoice: new FormControl(this.currentOrder.isOwnCustomer ? '1' : '2'),
      customer: new FormControl(null),
      info: new FormControl('', Validators.required),
      newClient: new FormControl(false),

      company_name: new FormControl(this.currentOrder.orderContact?.company_name, Validators.required),
      first_name: new FormControl(this.currentOrder.orderContact?.first_name, Validators.required),
      last_name: new FormControl(this.currentOrder.orderContact?.last_name, Validators.required),
      email: new FormControl(this.currentOrder.orderContact?.email, Validators.compose(
        [Validators.required, Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$')])),
      phone: new FormControl(this.currentOrder.orderContact?.phone, Validators.pattern(PHONE_REGEX)),
      street: new FormControl(this.currentOrder.orderContact?.street, Validators.required),
      street2: new FormControl(this.currentOrder.orderContact?.street2),
      postcode: new FormControl(this.currentOrder.orderContact?.postcode, Validators.required),
      city: new FormControl(this.currentOrder.orderContact?.city, Validators.required),
      country: new FormControl(this.currentOrder.orderContact?.country, Validators.required),
    });
    this.lastStepFormGroup = this.formBuilder.group({});

    this.updateDescription(this.step1FormGroup?.get('orderType')?.value);
    this.updateForm2(this.step1FormGroup?.get('orderType')?.value,
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

  updateForm2(orderType: IOrderType, isNewClient = false) {
    // current user, disable required form controls
    if (orderType && orderType.id === 1) {
      this.step2FormGroup.get('info')?.clearValidators();
      this.step2FormGroup.get('info')?.updateValueAndValidity();

      this.step2FormGroup.get('company_name')?.clearValidators();
      this.step2FormGroup.get('company_name')?.updateValueAndValidity();
      this.step2FormGroup.get('first_name')?.clearValidators();
      this.step2FormGroup.get('first_name')?.updateValueAndValidity();
      this.step2FormGroup.get('last_name')?.clearValidators();
      this.step2FormGroup.get('last_name')?.updateValueAndValidity();
      this.step2FormGroup.get('email')?.setValidators(Validators.compose([Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$')]));
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
      this.step2FormGroup.get('email')?.setValidators(Validators.compose([Validators.required, Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$')]));
      this.step2FormGroup.get('email')?.updateValueAndValidity();
      this.step2FormGroup.get('phone')?.setValidators(Validators.pattern(PHONE_REGEX));
      this.step2FormGroup.get('phone')?.updateValueAndValidity();
      this.step2FormGroup.get('street')?.setValidators(Validators.required);
      this.step2FormGroup.get('street')?.updateValueAndValidity();
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
      orderType: this.getOrderType(this.currentOrder.getOrderTypeId),
      title: this.currentOrder.title,
      description: this.currentOrder.description,
    });
    this.step2FormGroup.reset({
      addressChoice: this.currentOrder.isOwnCustomer ? '1' : '2',
      customer: null,
      info: '',
      newClient: false,

      company_name: this.currentOrder.orderContact?.company_name,
      first_name: this.currentOrder.orderContact?.first_name,
      last_name: this.currentOrder.orderContact?.last_name,
      email: this.currentOrder.orderContact?.email,
      phone: this.currentOrder.orderContact?.phone,
      street: this.currentOrder.orderContact?.street,
      street2: this.currentOrder.orderContact?.street2,
      postcode: this.currentOrder.orderContact?.postcode,
      city: this.currentOrder.orderContact?.city,
      country: this.currentOrder.orderContact?.country,
    });

    this.updateDescription(this.step1FormGroup?.get('orderType')?.value);
    this.updateForm2(this.step1FormGroup?.get('orderType')?.value,
      !this.currentOrder.isOwnCustomer && this.currentOrder.orderContact != null);
  }

  orderTypeCompareWith(a: IOrderType, b: IOrderType) {
    return a && b && a.id === b.id;
  }

  createOrUpdateDraftOrder() {
    this.currentOrder.title = this.step1FormGroup.get('title')?.value;
    this.currentOrder.description = this.step1FormGroup.get('description')?.value;
    this.currentOrder.orderType = this.step1FormGroup.get('orderType')?.value;

    this.apiOrderService.updateOrPostOrder(this.currentOrder, this.products).subscribe(newOrder => {
      if ((newOrder as IApiResponseError).error) {
        this.snackBar.open((newOrder as IApiResponseError).message, 'Ok', {panelClass: 'notification-error'});
      } else {
        this.storeService.addOrderToStore(new Order(newOrder as IOrder));
        this.stepper.next();
      }
    });
  }
}
