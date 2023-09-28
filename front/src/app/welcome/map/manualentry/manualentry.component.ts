import { Component, OnInit, Inject } from '@angular/core';
import {MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA} from '@angular/material/legacy-dialog';
import {IManualEntryDialogData} from '../../../_models/IManualEntryDialog';
import {MatLegacyTabChangeEvent as MatTabChangeEvent} from '@angular/material/legacy-tabs';

@Component({
  selector: 'gs2-manualentry',
  templateUrl: './manualentry.component.html',
  styleUrls: ['./manualentry.component.scss']
})
export class ManualentryComponent implements OnInit {

  constructor(
    public dialogRef: MatDialogRef<ManualentryComponent>,
    @Inject(MAT_DIALOG_DATA) public data: IManualEntryDialogData,
  ) { }

  ngOnInit(): void { }

  onNoClick(): void {
    this.dialogRef.close();
  }

  tabChanged(tabChangeEvent: MatTabChangeEvent): void {
    this.data.activeTab = tabChangeEvent.index;
  }
}
