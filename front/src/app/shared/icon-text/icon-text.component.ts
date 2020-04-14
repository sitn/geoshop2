import {Component, Input, OnInit} from '@angular/core';

@Component({
  selector: 'gs2-icon-text',
  templateUrl: './icon-text.component.html',
  styleUrls: ['./icon-text.component.scss']
})
export class IconTextComponent implements OnInit {

  @Input() matIconName = '';
  @Input() text = '';
  @Input() fontColor = 'palegreen';
  @Input() fontSize = 24;

  constructor() {
  }

  ngOnInit(): void {
  }

}
