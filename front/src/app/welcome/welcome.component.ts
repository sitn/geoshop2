import {Component, OnInit, ChangeDetectorRef, OnDestroy, HostBinding} from '@angular/core';
import {MediaMatcher} from '@angular/cdk/layout';
import {MapService} from '../_services/map.service';

@Component({
  selector: 'gs2-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss'],
})
export class WelcomeComponent implements OnInit, OnDestroy {

  @HostBinding('class') class = 'main-container';

  leftPositionForButtons = 30;
  isCatalogVisible = true;
  mobileQuery: MediaQueryList;

  private mobileQueryListener: () => void;

  constructor(changeDetectorRef: ChangeDetectorRef, media: MediaMatcher, private mapService: MapService) {
    this.mobileQuery = media.matchMedia('(max-width: 600px)');
    this.mobileQueryListener = () => changeDetectorRef.detectChanges();
    this.mobileQuery.addListener(this.mobileQueryListener);
  }

  ngOnInit() {

  }

  ngOnDestroy(): void {
    this.mobileQuery.removeListener(this.mobileQueryListener);
  }

  dragEnd(event: any) {
    this.mapService.resizeMap();
    this.leftPositionForButtons = event.sizes[0];
  }

  transitionEnd(event: number) {
    console.log(event);
    this.mapService.resizeMap();
    this.leftPositionForButtons = 10;
  }
}
