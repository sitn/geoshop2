from django.contrib.gis.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.postgres.search import SearchVectorField
from django.utils.translation import gettext_lazy as _
from djmoney.models.fields import MoneyField


class Copyright(models.Model):
    description = models.TextField(blank=True)

    class Meta:
        db_table = 'copyright'
        verbose_name = _('copyright')


class Document(models.Model):
    name = models.CharField(_('name'), max_length=80, blank=True)
    link = models.CharField(_('link'), max_length=2000, blank=True)

    class Meta:
        db_table = 'document'
        verbose_name = _('document')


class Format(models.Model):
    name = models.CharField(_('name'), max_length=30, blank=True)

    class Meta:
        db_table = 'format'
        verbose_name = _('format')


class OrderType(models.Model):
    name = models.CharField(_('name'), max_length=30, blank=True)

    class Meta:
        db_table = 'order_type'
        verbose_name = _('order type')
        verbose_name_plural = _('order types')


class Identity(AbstractUser):
    """
    Extends User model. All Identities are users but all the users can login.
    """
    street = models.CharField(_('street'), max_length=100, blank=True)
    street2 = models.CharField(_('street2'), max_length=100, blank=True)
    postcode = models.PositiveIntegerField(_('postcode'), blank=True, null=True)
    city = models.CharField(_('city'), max_length=50, blank=True)
    country = models.CharField(_('country'), max_length=50, blank=True)
    company_name = models.CharField(_('company_name'), max_length=50, blank=True)
    phone = models.CharField(_('name'), max_length=50, blank=True)
    sap_id = models.BigIntegerField(_('sap_id'), blank=True, null=True)
    contract_accepted = models.DateField(_('contract_accepted'), blank=True, null=True)

    class Meta:
        db_table = 'identity'
        verbose_name = _('identity')


class Metadata(models.Model):
    name = models.CharField(_('name'), max_length=50, blank=True)
    description_short = models.CharField(_('description_short'), max_length=500, blank=True)
    description_long = models.TextField(_('description_long'), blank=True)
    geocat_link = models.CharField(_('geocat_link'), max_length=2000, blank=True)
    legend_link = models.CharField(_('legend_link'), max_length=2000, blank=True)
    image_link = models.CharField(_('image_link'), max_length=2000, blank=True)
    copyright = models.ForeignKey(Copyright, models.DO_NOTHING, verbose_name=_('copyright'), blank=True, null=True)
    documents = models.ManyToManyField(Document, verbose_name=_('documents'), blank=True)
    contact_persons = models.ManyToManyField(Identity, verbose_name=_('contact_persons'), blank=True)
    validations_needed = models.ManyToManyField(OrderType, verbose_name=_('validations_needed'), blank=True)

    class Meta:
        db_table = 'metadata'
        verbose_name = _('metadata')


class Product(models.Model):

    class ProductStatus(models.TextChoices):
        DRAFT = 'DRAFT', _('Draft')
        PUBLISHED = 'PUBLISHED', _('Published')
        DEPRECATED = 'DEPRECATED', _('Deprecated')

    metadata = models.ForeignKey(Metadata, models.DO_NOTHING, verbose_name=_('metadata'), blank=True, null=True)
    label = models.CharField(_('label'), max_length=250, blank=True)
    status = models.CharField(_('status'), max_length=10, choices=ProductStatus.choices, default=ProductStatus.DRAFT)
    group = models.ForeignKey('self', models.DO_NOTHING, verbose_name=_('group'), null=True)
    order = models.BigIntegerField(_('order'), blank=True, null=True)
    ts = SearchVectorField(null=True)

    class Meta:
        db_table = 'product'
        verbose_name = _('product')


    def __str__(self):
        return self.label


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

    title = models.CharField(_('title'), max_length=255, blank=True)
    description = models.TextField(_('description'), blank=True)
    processing_fee = MoneyField(_('processing_fee'), max_digits=14, decimal_places=2, default_currency='CHF', null=True)
    total_cost = MoneyField(_('total_cost'), max_digits=14, decimal_places=2, default_currency='CHF', null=True)
    part_vat = MoneyField(_('part_vat'), max_digits=14, decimal_places=2, default_currency='CHF', null=True)
    geom = models.PolygonField(_('geom'), srid=2056)
    client = models.ForeignKey(Identity, models.DO_NOTHING, verbose_name=_('client'), blank=True)
    order_contact = models.ForeignKey(Identity, models.DO_NOTHING, verbose_name=_('order_contact'), blank=True, related_name='order_contact', null=True)
    invoice_contact = models.ForeignKey(Identity, models.DO_NOTHING, verbose_name=_('invoice_contact'), blank=True, related_name='invoice_contact', null=True)
    invoice_reference = models.CharField(_('invoice_reference'), max_length=255, blank=True)
    order_type = models.ForeignKey(OrderType, models.DO_NOTHING, verbose_name=_('order_type'), blank=True, null=True)
    status = models.CharField(_('status'), max_length=20, choices=OrderStatus.choices, default=OrderStatus.DRAFT)
    date_ordered = models.DateTimeField(_('date_ordered'), blank=True, null=True)
    date_downloaded = models.DateTimeField(_('date_downloaded'), blank=True, null=True)
    date_processed = models.DateTimeField(_('date_processed'), blank=True, null=True)

    class Meta:
        db_table = 'order'
        verbose_name = _('order')

    def __str__(self):
        return '%s - %s' % (self.id, self.title)


class OrderItem(models.Model):
    order = models.ForeignKey(Order, models.DO_NOTHING, verbose_name=_('order'), blank=True, null=True)
    product = models.ForeignKey(Product, models.DO_NOTHING, verbose_name=_('product'), blank=True, null=True)
    format = models.ForeignKey(Format, models.DO_NOTHING, verbose_name=_('format'), blank=True, null=True)
    last_download = models.DateTimeField(_('last_download'), blank=True, null=True)

    class Meta:
        db_table = 'order_item'
        verbose_name = _('order_item')


class Pricing(models.Model):
    product = models.ForeignKey(Product, models.DO_NOTHING, verbose_name=_('product'), blank=True, null=True)
    price_type = models.CharField(_('price_type'), max_length=50, blank=True)
    base_fee = MoneyField(_('base_fee'), max_digits=14, decimal_places=2, default_currency='CHF', null=True)
    price = MoneyField(_('price'), max_digits=14, decimal_places=2, default_currency='CHF', null=True)

    class Meta:
        db_table = 'pricing'
        verbose_name = _('pricing')


class ProductField(models.Model):

    class ProductFieldType(models.TextChoices):
        REAL = 'REAL', 'Real'
        DATE = 'DATE', 'Date'
        CHAR = 'CHAR', 'Character'
        VARCHAR = 'VARCHAR', 'Varying character'
        INT = 'INT', 'Integer'
        BIGINT = 'BIGINT', 'Big integer'
        FLOAT = 'FLOAT', 'Floating number'

    db_name = models.CharField(_('db_name'), max_length=50, blank=True)
    export_name = models.CharField(_('export_name'), max_length=50, blank=True)
    field_type = models.CharField(_('field_type'), max_length=10, choices=ProductFieldType.choices, blank=True)
    field_length = models.SmallIntegerField(_('field_length'), )
    product = models.ForeignKey(Product, verbose_name=_('product'), on_delete=models.CASCADE)

    class Meta:
        db_table = 'product_field'
        verbose_name = _('product_field')


class ProductFormat(models.Model):
    product = models.OneToOneField(Product, models.DO_NOTHING, verbose_name=_('product'), primary_key=True)
    format = models.ForeignKey(Format, models.DO_NOTHING, verbose_name=_('format'))
    is_manual = models.BooleanField(_('is_manual'), default=False) # extraction manuelle ou automatique

    class Meta:
        db_table = 'product_format'
        unique_together = (('product', 'format'),)
        verbose_name = _('product_format')
