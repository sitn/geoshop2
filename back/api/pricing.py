from django.contrib.gis.db.models.functions import Area, Intersection

class ProductPriceCalculator():
    """
    Price calculation methods. Pass one of the value defined in
    models.Pricing.PricingType class to the get price method.
    """

    @classmethod
    def get_price(cls, pricing_type, **kwargs):
        """
        Will call any of the methods listed below depending on the price type
        """
        method_name = '_get_{}_price'.format(pricing_type)
        method = getattr(cls, method_name, lambda: '{} is not defined'.format(method_name.lower()))
        return method(**kwargs)

    @staticmethod
    def _get_free_price():
        return 0

    @staticmethod
    def _get_single_price(**kwargs):
        unit_price = kwargs.get('unit_price')
        return unit_price

    @staticmethod
    def _get_by_area_price(**kwargs):
        polygon = kwargs.get('polygon')
        unit_price = kwargs.get('unit_price')
        area = Area(polygon)
        return unit_price * area

    @staticmethod
    def _get_from_pricing_layer_price(**kwargs):
        polygon = kwargs.get('polygon')
        unit_price = kwargs.get('unit_price')
        area = Area(polygon)
        return 'TODO_FROM_PRICING_LAYER'

    @staticmethod
    def _get_manual_price(**kwargs):
        return 'TODO_MANUAL'
