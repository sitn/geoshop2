import { IMetadata } from './IMetadata';

export interface IProduct {
    name: string;
    minPrice: number;
    metadata: IMetadata;
}

export class Product {
    public readonly name: string;
    public readonly metadata: IMetadata;
    private minPrice: number;

    public get Price() {
        return this.minPrice ? `dès CHF ${this.minPrice}` : `Gratuit`;
    }

    constructor(args: IProduct) {
        this.name = args.name;
        this.minPrice = args.minPrice;
        this.metadata = args.metadata;
    }
}
