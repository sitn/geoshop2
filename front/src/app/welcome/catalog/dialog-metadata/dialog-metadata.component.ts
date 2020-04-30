import {Component, OnInit, Inject} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {IMetadata} from 'src/app/_models/IMetadata';

@Component({
    selector: 'gs2-dialog-metadata',
    templateUrl: './dialog-metadata.component.html',
    styleUrls: ['./dialog-metadata.component.scss']
})
export class DialogMetadataComponent implements OnInit {

    showLongDescription = false;

    constructor(
        public dialogRef: MatDialogRef<DialogMetadataComponent>,
        @Inject(MAT_DIALOG_DATA) public data: IMetadata
    ) {
    }

    ngOnInit(): void {
    }

}
