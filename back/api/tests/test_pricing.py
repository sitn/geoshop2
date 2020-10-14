from django.contrib.gis.geos import Polygon, Point
from djmoney.money import Money
from rest_framework.test import APITestCase
from api.models import Pricing, Product, PricingGeometry
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
                pricing_type="BY_OBJECT_NUMBER",
                unit_price=self.unit_price),
            Pricing(
                name="Par surface",
                pricing_type="BY_AREA",
                unit_price=self.unit_price),
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
                pricing=self.pricings[4]),
            Product(
                label="Produit facturé au Mb (non implémenté)",
                pricing=self.pricings[5]),
        ])

        self.order_geom = Polygon((
            (2528577.8382161376, 1193422.4003930448),
            (2542482.6542869355, 1193422.4329014618),
            (2542482.568523701, 1199018.36469272),
            (2528577.807487005, 1199018.324372703),
            (2528577.8382161376, 1193422.4003930448)
        ))

        self.pricing_area1 = PricingGeometry.objects.create(
            unit_price=Money(2, 'CHF'),
            pricing=self.pricings[4],
            geom=Polygon((
                (2537498, 1210000),
                (2533183, 1180000),
                (2520000, 1180000),
                (2520000, 1210000),
                (2537498, 1210000)
            ))
        )

        self.pricing_area2 = PricingGeometry.objects.create(
            unit_price=Money(4, 'CHF'),
            pricing=self.pricings[4],
            geom=Polygon((
                (2533183, 1180000),
                (2537498, 1210000),
                (2550000, 1210000),
                (2550000, 1180000),
                (2533183, 1180000)
            ))
        )

        self.building_pricing_geometry = PricingGeometry.objects.bulk_create([
            PricingGeometry(
                geom=Point(2559661.132097245, 1205773.4376192095)
            ),
            PricingGeometry(
                geom=Point(2554387.694597245, 1205539.0626192095)
            ),
            PricingGeometry(
                geom=Point(2557786.132097245, 1203781.2501192095)
            ),
            PricingGeometry(
                geom=Point(2533265.624642372, 1196165.5274033546)
            ),
            PricingGeometry(
                geom=Point(2534378.905892372, 1195403.8086533546)
            ),
            PricingGeometry(
                geom=Point(2535052.734017372, 1195081.5430283546)
            ),
            PricingGeometry(
                geom=Point(2536312.499642372, 1196341.3086533546)
            )
        ])

        for geom in self.building_pricing_geometry:
            geom.pricing = Pricing.objects.filter(
                name="Par nombre d'objets").first()
            geom.save()

    def test_free_price(self):
        free_price = self.products[0].pricing.get_price(self.order_geom)
        self.assertEqual(free_price[0], 0)

    def test_single_price(self):
        single_price = self.products[1].pricing.get_price(self.order_geom)
        self.assertEqual(single_price[0], self.unit_price)

    def test_by_object_price(self):
        number_of_objects = 4
        by_object_price = self.products[2].pricing.get_price(self.order_geom)
        self.assertGreater(by_object_price[0], Money(0, 'CHF'))
        self.assertEqual(by_object_price[0],
                         number_of_objects * self.unit_price)

    def test_by_area_price(self):
        by_area_price = self.products[3].pricing.get_price(self.order_geom)
        expected_price = (self.order_geom.area / 10000) * self.unit_price
        self.assertEqual(by_area_price[0], expected_price)

    def test_from_pricing_layer_price(self):
        from_pricing_layer_price = self.products[4].pricing.get_price(self.order_geom)
        pricing_part1 = self.pricing_area1.geom.intersection(self.order_geom)
        pricing_part2 = self.pricing_area2.geom.intersection(self.order_geom)
        expected_price_part1 = (
            pricing_part1.area / 10000) * self.pricing_area1.unit_price
        expected_price_part2 = (
            pricing_part2.area / 10000) * self.pricing_area2.unit_price
        self.assertEqual(
            from_pricing_layer_price[0].round(2),
            (expected_price_part1 + expected_price_part2).round(2))

    def test_manual_price(self):
        pass

    def test_undefined_price(self):
        pass
