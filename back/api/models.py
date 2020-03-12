import uuid
from django.contrib.gis.db import models
from django.contrib.auth.models import User
from djmoney.models.fields import MoneyField
from django.contrib.postgres.search import SearchVectorField
from django.utils.translation import gettext_lazy as _


class Copyright(models.Model):
    description = models.TextField(blank=True)

    class Meta:
        db_table = 'copyright'


class Document(models.Model):
    name = models.CharField(max_length=80, blank=True)
    link = models.CharField(max_length=2000, blank=True)

    class Meta:
        db_table = 'document'


class Format(models.Model):
    name = models.CharField(max_length=30, blank=True)

    class Meta:
        db_table = 'format'

class OrderType(models.Model):
    name = models.CharField(max_length=30, blank=True)

    class Meta:
        db_table = 'order_type'
        verbose_name = _('order type')
        verbose_name_plural = _('order types')


class Identity(User):
    street = models.CharField(max_length=100, blank=True)
    street2 = models.CharField(max_length=100, blank=True)
    postcode = models.PositiveIntegerField(blank=True, null=True)
    city = models.CharField(max_length=50, blank=True)
    country = models.CharField(max_length=50, blank=True)
    company_name = models.CharField(max_length=50, blank=True)
    phone = models.TextField(blank=True)
    sap_id = models.BigIntegerField(blank=True, null=True)
    contract_accepted = models.DateField(blank=True, null=True)

    class Meta:
        db_table = 'identity'
        verbose_name = _('identity')


class Metadata(models.Model):
    name = models.CharField(max_length=50, blank=True)
    description_short = models.CharField(max_length=500, blank=True)
    description_long = models.TextField(blank=True)
    geocat_link = models.CharField(max_length=2000, blank=True)
    legend_link = models.CharField(max_length=2000, blank=True)
    image_link = models.CharField(max_length=2000, blank=True)
    copyright = models.ForeignKey(Copyright, models.DO_NOTHING, blank=True, null=True)
    documents = models.ManyToManyField(Document, blank=True)
    contact_persons = models.ManyToManyField(Identity, blank=True)
    validations_needed = models.ManyToManyField(OrderType, blank=True)

    class Meta:
        db_table = 'metadata'


class Order(models.Model):
    """
    processing_fee should default to the maximum of base fees in the order but can then be edited mannually
    """

    class OrderStatus(models.TextChoices):
        DRAFT = 'DRAFT', _('Draft')
        PENDING = 'PENDING', _('Pending')
        READY = 'READY', _('Ready')
        PARTIALLY_DELIVERED = 'PARTIALLY_DELIVERED', _('Partially delivered')
        PROCESSED = 'PROCESSED', _('Processed')
        DOWNLOADED = 'DOWNLOADED', _('Downloaded')
        ARCHIVED = 'ARCHIVED', _('Archived')
        REJECTED = 'REJECTED', _('Rejected')

    title = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    processing_fee = MoneyField(max_digits=14, decimal_places=2, default_currency='CHF', null=True)
    total_cost = MoneyField(max_digits=14, decimal_places=2, default_currency='CHF', null=True)
    part_vat = MoneyField(max_digits=14, decimal_places=2, default_currency='CHF', null=True)
    geom = models.PolygonField(srid=2056)
    client = models.ForeignKey(User, models.DO_NOTHING, blank=True)
    order_contact = models.ForeignKey(Identity, models.DO_NOTHING, blank=True, related_name='order_contact', null=True)
    invoice_contact = models.ForeignKey(Identity, models.DO_NOTHING, blank=True, related_name='invoice_contact', null=True)
    invoice_reference = models.CharField(max_length=255, blank=True)
    order_type = models.ForeignKey(OrderType, models.DO_NOTHING, blank=True, null=True)
    status = models.CharField(max_length=20, choices=OrderStatus.choices, default=OrderStatus.DRAFT)
    date_ordered = models.DateTimeField(blank=True, null=True)
    date_downloaded = models.DateTimeField(blank=True, null=True)
    date_processed = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'order'
        verbose_name = _('order')

    def __str__(self):
        return '%s - %s' % (self.id, self.title)


class OrderItem(models.Model):
    order = models.ForeignKey(Order, models.DO_NOTHING, blank=True, null=True)
    product = models.ForeignKey('Product', models.DO_NOTHING, blank=True, null=True)
    format = models.ForeignKey(Format, models.DO_NOTHING, blank=True, null=True)
    last_download = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'order_item'


class Pricing(models.Model):
    product = models.ForeignKey('Product', models.DO_NOTHING, blank=True, null=True)
    price_type = models.CharField(max_length=50, blank=True)
    base_fee = MoneyField(max_digits=14, decimal_places=2, default_currency='CHF', null=True)
    price = MoneyField(max_digits=14, decimal_places=2, default_currency='CHF', null=True)

    class Meta:
        db_table = 'pricing'


class Product(models.Model):

    class ProductStatus(models.TextChoices):
        DRAFT = 'DRAFT', _('Draft')
        PUBLISHED = 'PUBLISHED', _('Published')
        DEPRECATED = 'DEPRECATED', _('Deprecated')

    metadata = models.ForeignKey(Metadata, models.DO_NOTHING, blank=True, null=True)
    label = models.CharField(max_length=250, blank=True)
    status = models.CharField(max_length=10, choices=ProductStatus.choices, default=ProductStatus.DRAFT)
    group = models.ForeignKey('self', models.DO_NOTHING, null=True)
    order = models.BigIntegerField(blank=True, null=True)
    ts = SearchVectorField(null=True)

    class Meta:
        db_table = 'product'

    def __str__(self):
        return self.label

class ProductField(models.Model):

    class ProductFieldType(models.TextChoices):
        REAL = 'REAL', 'Real'
        DATE = 'DATE', 'Date'
        CHAR = 'CHAR', 'Character'
        VARCHAR = 'VARCHAR', 'Varying character'
        INT = 'INT', 'Integer'
        BIGINT = 'BIGINT', 'Big integer'
        FLOAT = 'FLOAT', 'Floating number'

    db_name = models.CharField(max_length=50, blank=True)
    export_name = models.CharField(max_length=50, blank=True)
    field_type = models.CharField(max_length=10, choices=ProductFieldType.choices, blank=True)
    field_length = models.SmallIntegerField()
    product = models.ForeignKey(Product, on_delete=models.CASCADE)

    class Meta:
        db_table = 'product_field'


class ProductFormat(models.Model):
    product = models.OneToOneField(Product, models.DO_NOTHING, primary_key=True)
    format = models.ForeignKey(Format, models.DO_NOTHING)
    is_manual = models.BooleanField(default=False) # extraction manuelle ou automatique

    class Meta:
        db_table = 'product_format'
        unique_together = (('product', 'format'),)
