from itertools import islice
from django.core import mail
from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Polygon, Point
from djmoney.money import Money
from rest_framework.test import APITestCase
from api.models import Contact, Pricing, Product, PricingGeometry, Order, OrderItem, OrderType
from api.tests.factories import BaseObjectsFactory

UserModel = get_user_model()


class PricingTests(APITestCase):
    """
    Test Pricings
    """

    def setUp(self):
        self.config = BaseObjectsFactory()

        self.pricing_area1 = PricingGeometry.objects.create(
            unit_price=Money(2, 'CHF'),
            pricing=self.config.pricings['from_pricing_layer'],
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
            pricing=self.config.pricings['from_pricing_layer'],
            geom=Polygon((
                (2533183, 1180000),
                (2537498, 1210000),
                (2550000, 1210000),
                (2550000, 1180000),
                (2533183, 1180000)
            ))
        )

        # 4 points are located in order geom
        self.number_of_objects = 4
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
        free_price = self.config.products['free'].pricing.get_price(self.config.order.geom)
        self.assertEqual(free_price[0], 0)

    def test_single_price(self):
        single_price = self.config.products['single'].pricing.get_price(self.config.order.geom)
        self.assertEqual(single_price[0], self.config.unit_price)

    def test_by_object_price(self):
        by_object_price = self.config.products['by_number_objects'].pricing.get_price(self.config.order.geom)
        self.assertGreater(by_object_price[0], Money(0, 'CHF'))
        self.assertEqual(by_object_price[0],
                         self.number_of_objects * Money(1, 'CHF'))

    def test_by_area_price(self):
        by_area_price = self.config.products['by_area'].pricing.get_price(self.config.order.geom)
        expected_price = (self.config.order.geom.area / 10000) * self.config.unit_price
        self.assertEqual(by_area_price[0], expected_price)

    def test_from_pricing_layer_price(self):
        from_pricing_layer_price = self.config.products['from_pricing_layer'].pricing.get_price(self.config.order.geom)
        pricing_part1 = self.pricing_area1.geom.intersection(self.config.order.geom)
        pricing_part2 = self.pricing_area2.geom.intersection(self.config.order.geom)
        expected_price_part1 = (
            pricing_part1.area / 10000) * self.pricing_area1.unit_price
        expected_price_part2 = (
            pricing_part2.area / 10000) * self.pricing_area2.unit_price
        self.assertEqual(
            from_pricing_layer_price[0].round(2),
            (expected_price_part1 + expected_price_part2).round(2))

    def test_manual_price(self):
        manual_price = self.config.products['manual'].pricing.get_price(self.config.order.geom)
        self.assertIsNone(manual_price[0], 'Manual price has None price when pricing is called')
        order_item = OrderItem.objects.create(
            order=self.config.order,
            product=self.config.products['manual']
        )
        self.config.order.order_type = self.config.order_types['private']
        self.config.order.save()
        self.assertEqual(self.config.order.status, Order.OrderStatus.DRAFT)
        self.assertEqual(order_item.price_status, OrderItem.PricingStatus.PENDING, 'pricing status stays pending')

        # Client asks for a quote bescause order item pricing status is PENDING
        self.config.order.confirm()
        # An email is sent to admins, asking them to set a manual price
        self.assertEqual(len(mail.outbox), 1, 'An email has been sent to admins')
        self.assertEqual(self.config.order.status, Order.OrderStatus.PENDING, 'Order status is now pending')
        # An admin sets price manually, this is normally done in admin interface
        order_item.set_price(
            price=self.config.unit_price,
            base_fee=self.config.base_fee,
        )
        order_item.save()
        # The admin confirms he's done with the quote
        self.config.order.quote_done()
        self.assertEqual(len(mail.outbox), 2, 'An email has been sent to the client')
        self.assertEqual(self.config.order.status, Order.OrderStatus.QUOTE_DONE, 'Order status has quote done')
        self.assertEqual(order_item.price_status, OrderItem.PricingStatus.CALCULATED, 'Price is calculated')
        self.config.order.confirm()
        self.assertEqual(self.config.order.status, Order.OrderStatus.READY, 'Order is ready for Extract')

    def test_undefined_price(self):
        undefined_price = self.config.products['yet_unknown_pricing'].pricing.get_price(self.config.order.geom)
        self.assertIsNone(undefined_price[0])
        self.assertLogs('pricing', level='ERROR')
        self.assertEqual(len(mail.outbox), 1, 'An email has been sent to admins')

    def test_base_fee(self):
        orderitem1 = OrderItem.objects.create(
            order=self.config.order,
            product=self.config.products['single']
        )
        orderitem2 = OrderItem.objects.create(
            order=self.config.order,
            product=self.config.products['by_area']
        )
        self.config.order.order_type = self.config.order_types['private']
        self.config.order.save()
        orderitem1.set_price()
        orderitem1.save()
        orderitem2.set_price()
        orderitem2.save()
        self.config.order.set_price()
        self.assertEqual(self.config.order.processing_fee, Money(50, 'CHF'), 'Base fee is correct')

    def test_user_subscribed_to_product(self):
        self.config.user_private.identity.subscribed = True
        self.config.user_private.identity.save()
        self.config.products['by_area'].free_when_subscribed = True
        self.config.products['by_area'].save()
        orderitem2 = OrderItem.objects.create(
            order=self.config.order,
            product=self.config.products['by_area']
        )
        self.config.order.order_type = self.config.order_types['subscribed']
        self.config.order.save()
        orderitem2.set_price()
        orderitem2.save()
        self.config.order.set_price()
        self.assertEqual(self.config.order.processing_fee, Money(0, 'CHF'), 'Processing fee is free')
        self.assertEqual(self.config.order.total_with_vat, Money(0, 'CHF'), 'Order is free')

    def test_user_not_subscribed_to_product(self):
        self.config.user_private.identity.subscribed = True
        self.config.user_private.identity.save()
        self.config.products['by_area'].free_when_subscribed = False
        self.config.products['by_area'].save()
        orderitem2 = OrderItem.objects.create(
            order=self.config.order,
            product=self.config.products['by_area']
        )
        self.config.order.order_type = self.config.order_types['subscribed']
        self.config.order.save()
        orderitem2.set_price()
        orderitem2.save()
        self.config.order.set_price()
        self.config.order.save()
        self.assertEqual(self.config.order.status, Order.OrderStatus.DRAFT)
        self.assertEqual(orderitem2.price_status, OrderItem.PricingStatus.PENDING, 'pricing status stays pending')
        # Client asks for a quote bescause order item pricing status is PENDING
        self.config.order.confirm()

        # An email is sent to admins, asking them to set a manual price
        self.assertEqual(len(mail.outbox), 1, 'An email has been sent to admins')
        self.assertEqual(self.config.order.status, Order.OrderStatus.PENDING, 'Order status is now pending')

    def test_invoice_contact_subscribed_to_product(self):
        self.assertFalse(self.config.user_private.identity.subscribed)
        self.config.products['by_area'].free_when_subscribed = True
        self.config.products['by_area'].save()
        orderitem2 = OrderItem.objects.create(
            order=self.config.order,
            product=self.config.products['by_area']
        )
        contact = Contact.objects.create(
            first_name='Jean',
            last_name='Doe',
            email='test3@admin.com',
            postcode=2000,
            city='Lausanne',
            country='Suisse',
            belongs_to=self.config.user_private,
            subscribed=True
        )
        self.config.order.invoice_contact = contact
        self.config.order.order_type = self.config.order_types['subscribed']
        self.config.order.save()
        orderitem2.set_price()
        orderitem2.save()
        self.config.order.set_price()
        self.assertEqual(self.config.order.processing_fee, Money(0, 'CHF'), 'Processing fee is free')
        self.assertEqual(self.config.order.total_with_vat, Money(0, 'CHF'), 'Order is free')

    def test_public_order_is_free(self):
        orderitem2 = OrderItem.objects.create(
            order=self.config.order,
            product=self.config.products['by_area']
        )
        self.config.order.order_type = self.config.order_types['public']
        self.config.order.save()
        orderitem2.set_price()
        orderitem2.save()
        self.config.order.set_price()
        self.assertEqual(self.config.order.processing_fee, Money(0, 'CHF'), 'Processing fee is free')
        self.assertEqual(self.config.order.total_with_vat, Money(0, 'CHF'), 'Order is free')

    def test_max_price_needs_manual_quote(self):
        number_of_objects = 251
        bbox = self.config.order.geom.extent
        objs = (
            PricingGeometry(geom=Point(x, y), pricing=self.config.pricings['by_number_objects']) for x, y in zip(
                range(int(bbox[0]), int(bbox[2])), range(int(bbox[1]), int(bbox[3]))
            )
        )
        while True:
            batch = list(islice(objs, number_of_objects))
            if not batch:
                break
            PricingGeometry.objects.bulk_create(batch, number_of_objects)
        by_object_price = self.config.products['by_number_objects'].pricing.get_price(self.config.order.geom)
        self.assertIsNone(by_object_price[0], 'Price is None because max_price reached')

    def test_from_children_of_group_price(self):
        group_product = Product.objects.create(
            label="Réseau d'eau",
            metadata=self.config.metadata,
            pricing=self.config.pricings['from_children_of_group'],
            provider=self.config.provider
        )
        self.config.products['free'].group = group_product
        self.config.products['single'].group = group_product
        self.config.products['by_number_objects'].group = group_product
        self.config.products['free'].save()
        self.config.products['single'].save()
        self.config.products['by_number_objects'].save()
        orderitem1 = OrderItem.objects.create(
            order=self.config.order,
            product=group_product
        )
        self.config.order.order_type = self.config.order_types['private']
        self.config.order.save()
        orderitem1.set_price()
        orderitem1.save()
        self.config.order.set_price()
        self.assertEqual(self.config.order.processing_fee, Money(20, 'CHF'), 'Base fee is correct')
        self.assertEqual(self.config.order.total_without_vat,
                         self.number_of_objects * Money(1, 'CHF') + Money(150, 'CHF') + Money(20, 'CHF'))
