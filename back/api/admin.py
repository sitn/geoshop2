from django.contrib.gis import admin

# Register your models here.
from .models import (
    Copyright,
    Document, 
    Format,
    Identity,
    Metadata,
    Order,
    OrderItem,
    Pricing,
    Product,
    ProductFormat)

# Register your models here.
admin.site.register(Copyright)
admin.site.register(Document)
admin.site.register(Format)
admin.site.register(Identity)
admin.site.register(Metadata)
admin.site.register(Order, admin.OSMGeoAdmin)
admin.site.register(OrderItem)
admin.site.register(Pricing)
admin.site.register(Product)
admin.site.register(ProductFormat)
