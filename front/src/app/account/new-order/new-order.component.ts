import {Component, HostBinding, OnInit, ViewChild} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {ApiService} from '../../_services/api.service';
import {PHONE_REGEX} from '../../_helpers/regex';
import {Observable} from 'rxjs';
import {IIdentity} from '../../_models/IIdentity';
import {map, startWith} from 'rxjs/operators';
import {Product} from '../../_models/IProduct';
import {Store} from '@ngrx/store';
import {AppState, selectAllProducts} from '../../_store';
import {MatPaginator} from '@angular/material/paginator';
import {MatSort} from '@angular/material/sort';
import {MatTableDataSource} from '@angular/material/table';

@Component({
  selector: 'gs2-new-order',
  templateUrl: './new-order.component.html',
  styleUrls: ['./new-order.component.scss']
})
export class NewOrderComponent implements OnInit {

  @HostBinding('class') class = 'main-container dark-background';
  @ViewChild(MatPaginator, {static: true}) paginator: MatPaginator;
  @ViewChild(MatSort, {static: true}) sort: MatSort;

  step1FormGroup: FormGroup;
  step2FormGroup: FormGroup;
  lastStepFormGroup: FormGroup;

  orderTypes$ = this.apiService.getOrderTypes();
  customers = new Array<IIdentity>();
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

    this.apiService.getCustomers().subscribe(x => this.customers = x);

    this.filteredCustomers$ = this.step2FormGroup.get('customer')?.valueChanges.pipe(
      startWith(''),
      map(value => typeof value === 'string' || value == null ? value : value.username),
      map(state => state ? this.filterCustomer(state) : this.customers.slice())
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
      info: new FormControl('', Validators.required),
      email: new FormControl('', Validators.compose([Validators.required, Validators.email])),
      phone: new FormControl('', Validators.pattern(PHONE_REGEX)),
    });
    this.step2FormGroup = this.formBuilder.group({
      customer: new FormControl('', Validators.required)
    });
    this.lastStepFormGroup = this.formBuilder.group({});
  }

  private filterCustomer(value: string) {
    const filterValue = value.toLowerCase();

    return this.customers.filter(state => {
      if (!state) {
        return true;
      }
      const address = state.street || '' + state.street2 || '' + state.city + state.postcode;
      return address.toLowerCase().indexOf(filterValue) > -1;
    });
  }

  displayCustomer(customer: IIdentity) {
    return customer && customer.username ? customer.username : '';
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

}
