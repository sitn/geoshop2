import { Component, OnInit, Inject } from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {IPageFormatDialogData} from '../../../_models/IPageFormatDialog';

@Component({
  selector: 'gs2-pageformat',
  templateUrl: './pageformat.component.html',
  styleUrls: ['./pageformat.component.scss']
})
export class PageformatComponent implements OnInit {

  constructor(
    public dialogRef: MatDialogRef<PageformatComponent>,
    @Inject(MAT_DIALOG_DATA) public data: IPageFormatDialogData,
  ) { }

  ngOnInit(): void { }

  onNoClick(): void {
    this.dialogRef.close();
  }
}
