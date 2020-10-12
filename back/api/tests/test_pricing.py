from django.contrib.gis.geos import Polygon
from djmoney.money import Money
from rest_framework.test import APITestCase
from api.models import Pricing, Product
from api.pricing import ProductPriceCalculator


class PricingTests(APITestCase):
    """
    Test Pricings
    """

    def setUp(self):
        self.base_fee = Money(50, 'CHF')
        self.unit_price = Money(150, 'CHF')
        self.pricings = Pricing.objects.bulk_create([
            Pricing(
                name="Gratuit",
                pricing_type="FREE"),
            Pricing(
                name="Forfait",
                pricing_type="SINGLE",
                unit_price=self.unit_price),
            Pricing(
                name="Par nombre d'objets",
                pricing_type="BY_OBJECT_NUMBER"),
            Pricing(
                name="Par surface",
                pricing_type="BY_AREA"),
            Pricing(
                name="Par couche géométrique",
                pricing_type="FROM_PRICING_LAYER"),
            Pricing(
                name="Style de prix non connu de l'application",
                pricing_type="VERY_FUNNY")
        ])

        self.products = Product.objects.bulk_create([
            Product(
                label="Produit gratuit",
                pricing=self.pricings[0]),
            Product(
                label="Maquette 3D",
                pricing=self.pricings[1]),
            Product(
                label="Bâtiments 3D",
                pricing=self.pricings[2]),
            Product(
                label="Produit vendu au m²",
                pricing=self.pricings[3]),
            Product(
                label="MO",
                pricing=self.pricings[1]),
            Product(
                label="Produit facturé au Mb (non implémenté)",
                pricing=self.pricings[1]),
        ])

        self.geom = Polygon((
            (2528577.8382161376, 1193422.4003930448),
            (2542482.6542869355, 1193422.4329014618),
            (2542482.568523701, 1199018.36469272),
            (2528577.807487005, 1199018.324372703),
            (2528577.8382161376, 1193422.4003930448)
        ))

    def test_free_price(self):
        free_price = self.products[0].pricing.get_price(self.geom)
        self.assertEqual(free_price[0], 0)

    def test_single_price(self):
        single_price = self.products[1].pricing.get_price(self.geom)
        self.assertEqual(single_price[0], self.unit_price)
