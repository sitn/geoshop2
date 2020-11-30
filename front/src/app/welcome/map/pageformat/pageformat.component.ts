import { Component, OnInit, Inject } from '@angular/core';
import {ConfigService} from 'src/app/_services/config.service';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {IPageFormatDialogData} from '../../../_models/IPageFormatDialog';

@Component({
  selector: 'gs2-pageformat',
  templateUrl: './pageformat.component.html',
  styleUrls: ['./pageformat.component.scss']
})
export class PageformatComponent implements OnInit {

  constructor(
    public dialog: MatDialog,
    public dialogRef: MatDialogRef<PageformatComponent>,
    @Inject(MAT_DIALOG_DATA) public data: IPageFormatDialogData,
    private configService: ConfigService

  ) { }

  ngOnInit(): void {
    this.data.selectedPageFormat = this.configService.config.pageformats[0];
    this.data.selectedPageFormatScale = 1000;
    this.data.rotationPageFormat = 0;
  }

  onNoClick(): void {
    this.dialogRef.close();
  }
}
