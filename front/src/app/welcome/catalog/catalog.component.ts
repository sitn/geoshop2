import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Product } from 'src/app/_models/IProduct';
import { MatTableDataSource } from '@angular/material/table';
import { ApiService } from 'src/app/_services/api.service';
import { MatDialog } from '@angular/material/dialog';
import { IMetadata } from 'src/app/_models/IMetadata';
import { DialogMetadataComponent } from './dialog-metadata/dialog-metadata.component';

@Component({
  selector: 'gs2-catalog',
  templateUrl: './catalog.component.html',
  styleUrls: ['./catalog.component.scss']
})
export class CatalogComponent implements OnInit {

  products: Product[] = [];
  filteredProducts: Product[] = [];
  displayedColumns: string[] = ['name', 'help', 'cart'];
  dataSource = new MatTableDataSource(this.products);

  constructor(private apiService: ApiService, public dialog: MatDialog) {
  }

  ngOnInit(): void {
    this.apiService.getProducts().subscribe((products) => {
      this.products = products;
      this.filteredProducts = this.products.slice(0);
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredProducts = filterValue.length > 0 ?
      this.products.filter(x => x.name.toLowerCase().indexOf(filterValue) > -1) :
      this.products.slice(0);
  }

  openMetadata(product: Product) {
    const dialogRef = this.dialog.open(DialogMetadataComponent, {
      width: '500px',
      data: product.metadata
    });
  }

}
