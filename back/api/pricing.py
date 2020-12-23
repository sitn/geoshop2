import logging
from django.contrib.gis.db.models.functions import Area, Intersection
from django.db.models import ExpressionWrapper, F, Sum
from djmoney.models.fields import MoneyField
from djmoney.money import Money
from django.utils.translation import gettext_lazy as _

from .helpers import send_email_to_admin

LOGGER = logging.getLogger(__name__)


class ProductPriceCalculator():
    """
    Price calculation methods. Pass one of the value defined in
    models.Pricing.PricingType class to the get price method.
    """

    @classmethod
    def get_price(cls, **kwargs):
        """
        Will call any of the methods listed below depending on the price type
        """
        pricing_instance = kwargs.get('pricing_instance')
        method_name = '_get_{}_price'.format(pricing_instance.pricing_type.lower())
        method = getattr(cls, method_name, cls._get_undefined_price)
        return method(**kwargs)

    @classmethod
    def _get_undefined_price(cls, **kwargs):
        pricing_instance = kwargs.get('pricing_instance')
        LOGGER.info('%s PRICING IS NOT DEFINED', pricing_instance.pricing_type)
        send_email_to_admin(
            _('PRICING NOT DEFINED'),
            _('{} is not defined in pricing module.').format(pricing_instance.pricing_type)
        )
        return cls._get_manual_price(**kwargs)

    @staticmethod
    def _get_free_price(**kwargs):
        return 0

    @staticmethod
    def _get_single_price(**kwargs):
        pricing_instance = kwargs.get('pricing_instance')
        return pricing_instance.unit_price

    @staticmethod
    def _get_by_object_number_price(**kwargs):
        """
        The objects have all to be in PricingGeometry.
        The objects have to be completely inside of the polygon (within).
        The Unit price is taken on the pricing instance, not
        the pricing area instance
        """
        pricing_instance = kwargs.get('pricing_instance')
        pricing_geometry_instance = pricing_instance.pricinggeometry_set
        polygon = kwargs.get('polygon')
        unit_price = pricing_instance.unit_price
        nbr_objects = pricing_geometry_instance.filter(
            pricing=pricing_instance.id
        ).filter(geom__within=polygon).count()
        return unit_price * nbr_objects


    @staticmethod
    def _get_by_area_price(**kwargs):
        """
        The area is expected to be in hectares
        """
        polygon = kwargs.get('polygon')
        pricing_instance = kwargs.get('pricing_instance')
        unit_price = pricing_instance.unit_price
        area = polygon.area / 10000
        return unit_price * area

    @staticmethod
    def _get_from_pricing_layer_price(**kwargs):
        """
        The area is expected to be in hectares
        As the price may vary from one polygon to
        the other, it has to be taken in the
        pricing layer
        """
        polygon = kwargs.get('polygon')
        pricing_instance = kwargs.get('pricing_instance')
        pricing_geometry_instance = pricing_instance.pricinggeometry_set
        total = pricing_geometry_instance.filter(
            pricing=pricing_instance.id
        ).filter(
            geom__intersects=polygon
        ).aggregate(sum=ExpressionWrapper(Sum(
            (Area(Intersection('geom', polygon))/10000)*F('unit_price')
        ), output_field=MoneyField()))

        return Money(total['sum'], pricing_instance.unit_price_currency)

    @staticmethod
    def _get_manual_price(**kwargs):
        return None
