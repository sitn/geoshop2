import {Directive, ViewContainerRef} from '@angular/core';

@Directive({
  selector: '[gs2WidgetHost]'
})
export class WidgetHostDirective {

  constructor(public viewContainerRef: ViewContainerRef) { }

}
