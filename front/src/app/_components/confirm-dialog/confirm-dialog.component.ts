import {Component, OnInit} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';

@Component({
  selector: 'gs2-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.scss']
})
export class ConfirmDialogComponent implements OnInit {

  public confirmMessage: string;

  constructor(public dialogRef: MatDialogRef<ConfirmDialogComponent>) {
  }

  ngOnInit(): void {
  }

}
