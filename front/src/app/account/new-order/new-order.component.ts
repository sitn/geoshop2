import {Component, HostBinding, OnInit, ViewChild} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {ApiService} from '../../_services/api.service';
import {PHONE_REGEX} from '../../_helpers/regex';
import {Observable} from 'rxjs';
import {IIdentity} from '../../_models/IIdentity';
import {debounceTime, filter, map, mergeMap, startWith} from 'rxjs/operators';
import {Product} from '../../_models/IProduct';
import {Store} from '@ngrx/store';
import {AppState, getUser, selectAllProducts} from '../../_store';
import {MatPaginator} from '@angular/material/paginator';
import {MatSort} from '@angular/material/sort';
import {MatTableDataSource} from '@angular/material/table';
import {MatAutocompleteSelectedEvent} from '@angular/material/autocomplete';
import {MatSelectChange} from '@angular/material/select';
import {MatRadioChange} from '@angular/material/radio';

@Component({
  selector: 'gs2-new-order',
  templateUrl: './new-order.component.html',
  styleUrls: ['./new-order.component.scss']
})
export class NewOrderComponent implements OnInit {

  @HostBinding('class') class = 'main-container';
  @ViewChild(MatPaginator, {static: true}) paginator: MatPaginator;
  @ViewChild(MatSort, {static: true}) sort: MatSort;

  step1FormGroup: FormGroup;
  step2FormGroup: FormGroup;
  lastStepFormGroup: FormGroup;
  isSearchLoading = false;
  isCustomerSelected = false;

  addressChoice: string;
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
  }

  ngOnInit(): void {
    this.store.select(selectAllProducts).subscribe(x => {
      this.products = x;
      this.dataSource = new MatTableDataSource<Product>(this.products);
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
    });
  }

  private createForms() {
    this.step1FormGroup = this.formBuilder.group({
      orderType: new FormControl('', Validators.required),
      title: new FormControl('', Validators.required),
      description: new FormControl('', Validators.required),
    });
    this.step2FormGroup = this.formBuilder.group({
      addressChoice: new FormControl(''),
      customer: new FormControl(null),
      info: new FormControl('', Validators.required),
      newClient: new FormControl(false),

      company_name: new FormControl('', Validators.required),
      first_name: new FormControl('', Validators.required),
      last_name: new FormControl('', Validators.required),
      email: new FormControl('', Validators.compose([Validators.required, Validators.email])),
      phone: new FormControl('', Validators.pattern(PHONE_REGEX)),
      street: new FormControl('', Validators.required),
      street2: new FormControl('', Validators.required),
      postcode: new FormControl('', Validators.required),
      city: new FormControl('', Validators.required),
      country: new FormControl('', Validators.required),
    });
    this.lastStepFormGroup = this.formBuilder.group({});
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

  updateForm1(event: MatSelectChange) {
    if (event.value === 1) {
      this.step1FormGroup.get('description')?.clearValidators();
    } else {
      this.step1FormGroup.get('description')?.setValidators(Validators.required);
    }

    this.step1FormGroup.get('title')?.setValue('');
    this.step1FormGroup.get('description')?.setValue('');

    this.step2FormGroup.reset();
    this.isCustomerSelected = false;

    this.step1FormGroup.get('description')?.updateValueAndValidity();
  }

  updateForm2(event: MatRadioChange) {
    // current user, disable required form controls
    if (event.value === '1') {
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

    this.step2FormGroup.get('newClient')?.setValue(false);
  }
}
