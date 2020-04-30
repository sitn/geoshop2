import {Component, OnInit, Inject} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA, MatDialog} from '@angular/material/dialog';
import {IMetadata} from 'src/app/_models/IMetadata';

@Component({
    selector: 'gs2-dialog-metadata',
    templateUrl: './dialog-metadata.component.html',
    styleUrls: ['./dialog-metadata.component.scss']
})
export class DialogMetadataComponent implements OnInit {

    showLongDescription = false;

    constructor(
        public dialog: MatDialog,
        public dialogRef: MatDialogRef<DialogMetadataComponent>,
        @Inject(MAT_DIALOG_DATA) public data: IMetadata
    ) {
    }

    ngOnInit(): void {
    }

    openLegend(url: string) {
        this.dialog.open(DialogLegendComponent, {
            data: url,
            autoFocus: false,
            position: {right: '0'}
        });
    }

}

@Component({
    selector: 'gs2-dialog-legend',
    template: `<img [src]="data" alt="Légende">`,
    styles: [`
        img {
            background: white;
        }
    `]
})
export class DialogLegendComponent implements OnInit {

    constructor(@Inject(MAT_DIALOG_DATA) public data: string) {
    }

    ngOnInit(): void {
    }
}
