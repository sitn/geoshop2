from django.core import mail
from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Polygon, Point
from djmoney.money import Money
from rest_framework.test import APITestCase
from api.models import Pricing, Product, PricingGeometry, Order, OrderItem

UserModel = get_user_model()


class PricingTests(APITestCase):
    """
    Test Pricings
    """

    def setUp(self):
        rincevent = UserModel.objects.create_user(
            username='rincevent', password='rincevent')
        rincevent.identity.email = 'admin@admin.com'
        rincevent.identity.save()
        self.base_fee = Money(50, 'CHF')
        self.unit_price = Money(150, 'CHF')
        self.pricings = Pricing.objects.bulk_create([
            Pricing(
                name="Gratuit", # 0
                pricing_type="FREE"),
            Pricing(
                name="Forfait", # 1
                pricing_type="SINGLE",
                unit_price=self.unit_price,
                base_fee=Money(20, 'CHF')),
            Pricing(
                name="Par nombre d'objets", # 2
                pricing_type="BY_OBJECT_NUMBER",
                unit_price=self.unit_price),
            Pricing(
                name="Par surface", # 3
                pricing_type="BY_AREA",
                unit_price=self.unit_price,
                base_fee=Money(50, 'CHF')),
            Pricing(
                name="Par couche géométrique", # 4
                pricing_type="FROM_PRICING_LAYER"),
            Pricing(
                name="Devis manuel", # 5
                pricing_type="MANUAL"),
            Pricing(
                name="Style de prix non connu de l'application", #6
                pricing_type="YET_UNKNOWN_PRICING")
        ])

        self.products = Product.objects.bulk_create([
            Product(
                label="Produit gratuit",
                pricing=self.pricings[0]),
            Product(
                label="Produit forfaitaire",
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
                label="Maquette 3D",
                pricing=self.pricings[5]),
            Product(
                label="Produit facturé au Mb (non implémenté)",
                pricing=self.pricings[6]),
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

        self.order = Order.objects.create(
            client=rincevent,
            title="Test pricing order",
            geom=self.order_geom
        )

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
        manual_price = self.products[5].pricing.get_price(self.order_geom)
        self.assertIsNone(manual_price[0], 'Manual price has None price when pricing is called')
        order_item = OrderItem.objects.create(
            order=self.order,
            product=self.products[5]
        )
        self.order.save()
        self.assertEqual(self.order.status, Order.OrderStatus.DRAFT)
        self.assertEqual(order_item.price_status, OrderItem.PricingStatus.PENDING, 'princing status stays pending')

        # Client asks for a quote bescause order item pricing status is PENDING
        self.order.confirm()
        # An email is sent to admins, asking them to set a manual price
        self.assertEqual(len(mail.outbox), 1, 'An email has been sent to admins')
        self.assertEqual(self.order.status, Order.OrderStatus.PENDING, 'Order status is now pending')
        # An admin sets price manually, this is normally done in admin interface
        order_item.set_price(
            price=self.unit_price,
            base_fee=self.base_fee,
        )
        order_item.save()
        # The admin confirms he's done with the quote
        self.order.quote_done()
        self.assertEqual(len(mail.outbox), 2, 'An email has been sent to the client')
        self.assertEqual(self.order.status, Order.OrderStatus.QUOTE_DONE, 'Order status has quote done')
        self.assertEqual(order_item.price_status, OrderItem.PricingStatus.CALCULATED, 'Price is calculated')
        self.order.confirm()
        self.assertEqual(self.order.status, Order.OrderStatus.READY, 'Order is ready for Extract')

    def test_undefined_price(self):
        undefined_price = self.products[6].pricing.get_price(self.order_geom)
        self.assertIsNone(undefined_price[0])
        self.assertLogs('pricing', level='ERROR')
        self.assertEqual(len(mail.outbox), 1, 'An email has been sent to admins')

    def test_base_fee(self):
        orderitem1 = OrderItem.objects.create(
            order=self.order,
            product=self.products[1]
        )
        orderitem2 = OrderItem.objects.create(
            order=self.order,
            product=self.products[3]
        )
        self.order.save()
        orderitem1.set_price()
        orderitem1.save()
        orderitem2.set_price()
        orderitem2.save()
        self.order.set_price()
        self.assertEqual(self.order.processing_fee, Money(50, 'CHF'), 'Base fee is correct')
