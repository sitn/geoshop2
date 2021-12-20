import {Component, OnInit, Inject} from '@angular/core';
import {ConfigService} from 'src/app/_services/config.service';
import {MatDialogRef, MAT_DIALOG_DATA, MatDialog} from '@angular/material/dialog';
import {IMetadata} from 'src/app/_models/IMetadata';

@Component({
  selector: 'gs2-dialog-metadata',
  templateUrl: './dialog-metadata.component.html',
  styleUrls: ['./dialog-metadata.component.scss']
})
export class DialogMetadataComponent implements OnInit {

  showLongDescription = false;
  mediaUrl: String | undefined;

  constructor(
    public dialog: MatDialog,
    public dialogRef: MatDialogRef<DialogMetadataComponent>,
    @Inject(MAT_DIALOG_DATA) public data: IMetadata,
    private configService: ConfigService
  ) {
    this.mediaUrl = this.configService.config?.mediaUrl;
  }

  ngOnInit(): void {
  }
}
