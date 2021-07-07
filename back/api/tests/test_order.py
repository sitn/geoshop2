from django.urls import reverse
from django.core import management, mail
from django.contrib.auth import get_user_model

from djmoney.money import Money
from rest_framework import status
from rest_framework.test import APITestCase
from api.models import Contact, OrderType, DataFormat, Pricing, Product, OrderItem, Order


UserModel = get_user_model()

class OrderTests(APITestCase):
    """
    Test Orders
    """

    def setUp(self):
        self.order_data = {
            'order_type': 'Privé',
            'items': [],
            'title': 'Test 1734',
            'description': 'Nice order',
            'geom': {
                'type': 'Polygon',
                'coordinates': [
                    [
                        [
                            2528577.8382161376,
                            1193422.4003930448
                        ],
                        [
                            2542482.6542869355,
                            1193422.4329014618
                        ],
                        [
                            2542482.568523701,
                            1199018.36469272
                        ],
                        [
                            2528577.807487005,
                            1199018.324372703
                        ],
                        [
                            2528577.8382161376,
                            1193422.4003930448
                        ]
                    ]
                ]
            },
        }
        management.call_command('fixturize')
        self.userPrivate = UserModel.objects.create_user(
            username="private_user_order",
            password="testPa$$word",
        )
        self.orderTypePrivate = OrderType.objects.create(
            name="Privé",
        )
        self.formats = DataFormat.objects.bulk_create([
            DataFormat(name="Geobat NE complet (DXF)"),
            DataFormat(name="Rhino 3DM"),
        ])
        self.pricing_free = Pricing.objects.create(
            name="Gratuit",
            pricing_type="FREE"
        )
        self.pricing_manual = Pricing.objects.create(
            name="Manuel",
            pricing_type="MANUAL"
        )
        self.products = Product.objects.bulk_create([
            Product(
                label="MO - Cadastre complet (Format A4-A3-A2-A1-A0)",
                pricing=self.pricing_free,
                free_when_subscribed=True),
            Product(
                label="Maquette 3D",
                pricing=self.pricing_manual),
        ])
        self.contact = Contact.objects.create(
            first_name='Jean',
            last_name='Doe',
            email='test3@admin.com',
            postcode=2000,
            city='Lausanne',
            country='Suisse',
            company_name='Marine de Colombier',
            phone='+41 00 787 29 16',
            belongs_to=self.userPrivate
        )
        url = reverse('token_obtain_pair')
        resp = self.client.post(url, {'username':'private_user_order', 'password':'testPa$$word'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue('access' in resp.data)
        self.token = resp.data['access']

    def get_order_item(self):
        url = reverse('orderitem-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_post_order_auto_price(self):
        """
        Tests POST of an order
        """
        url = reverse('order-list')
        response = self.client.post(url, self.order_data, format='json')
        # Forbidden if not logged in
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED, response.content)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token)
        response = self.client.post(url, self.order_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        # Last draft view
        url = reverse('order-last-draft')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertTrue('id' in response.data)
        order_id = response.data['id']
        contact_id = Contact.objects.filter(email='test3@admin.com').first().id

        # Update
        data = {
            "invoice_contact": contact_id
        }

        url = reverse('order-detail', kwargs={'pk':order_id})
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.data['invoice_contact'], contact_id, 'Check contact is updated')

        # Update
        data = {
            "items": [{
                "product": "MO - Cadastre complet (Format A4-A3-A2-A1-A0)"}]
        }

        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.data['items'][0]['product'], data['items'][0]['product'], 'Check product')
        self.assertEqual(
            response.data['items'][0]['price_status'], OrderItem.PricingStatus.CALCULATED, 'Check price is calculated')
        self.assertIsNotNone(response.data['items'][0]['available_formats'], 'Check available formats are present')

        order_item_id = response.data['items'][0]['id']
        # Confirm order without format should not work
        url = reverse('order-confirm', kwargs={'pk':order_id})
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.content)

        # Choose format
        data = {
            "data_format": "Geobat NE complet (DXF)"
        }
        url = reverse('orderitem-detail', kwargs={'pk':order_item_id})
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.data['status'], OrderItem.OrderItemStatus.PENDING, 'status is PENDING')


        # Confirm order with format should work
        url = reverse('order-confirm', kwargs={'pk':order_id})
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED, response.content)
        # Confirm order that's already confirmed, should not work
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, response.content)
        # Edit order that's already confirmed, should not work
        data = {
            "items": [{
                "product": "Maquette 3D"}]
        }
        url = reverse('order-detail', kwargs={'pk':order_id})
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, response.content)
        response = self.client.delete(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, response.content)


    def test_post_order_quote(self):
        # POST an order
        url = reverse('order-list')
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token)
        response = self.client.post(url, self.order_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        order_id = response.data['id']
        # PATCH order with a product needing quote
        data = {
            "items": [
                {
                    "product": "Maquette 3D",
                    "data_format": "Rhino 3DM"
                }
            ]
        }
        # Check price is PENDIND and no price is given
        url = reverse('order-detail', kwargs={'pk':order_id})
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        ordered_item = response.data['items'][0]
        self.assertEqual(ordered_item['product'], data['items'][0]['product'], 'Check product')
        self.assertEqual(ordered_item['price_status'], OrderItem.PricingStatus.PENDING, 'Check quote is needed')
        self.assertIsNone(response.data['processing_fee'], 'Check quote is needed')
        self.assertIsNone(response.data['total_without_vat'], 'Check quote is needed')
        self.assertIsNone(response.data['part_vat'], 'Check quote is needed')
        self.assertIsNone(response.data['total_with_vat'], 'Check quote is needed')

        # Ask for a quote
        url = reverse('order-confirm', kwargs={'pk':order_id})
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED, response.content)
        self.assertEqual(len(mail.outbox), 1, 'An email has been sent to admins')

        # Admin sets the quote
        quoted_order = Order.objects.get(pk=order_id)
        quoted_orderitem = OrderItem.objects.get(pk=ordered_item['id'])
        quoted_orderitem.set_price(price=Money(400, 'CHF'), base_fee=Money(150, 'CHF'))
        quoted_orderitem.save()
        is_quote_ok = quoted_order.quote_done()
        self.assertTrue(is_quote_ok, 'Quote done successfully')

        # Client sees the quote
        url = reverse('order-detail', kwargs={'pk':order_id})
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.data['status'], Order.OrderStatus.QUOTE_DONE, 'Check quote has been done')
        self.assertEqual(response.data['processing_fee'], '150.00', 'Check price is ok')
        self.assertEqual(response.data['total_without_vat'], '550.00', 'Check price is ok')
        url = reverse('order-confirm', kwargs={'pk':order_id})
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED, response.content)

    def test_post_order_subscribed(self):
        sub_user = UserModel.objects.get(username='private_user_order')
        sub_user.identity.subscribed = True
        sub_user.identity.save()

        url = reverse('order-list')
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token)
        response = self.client.post(url, self.order_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        order_id = response.data['id']

        data = {
            "items": [
                {
                    "product": "MO - Cadastre complet (Format A4-A3-A2-A1-A0)",
                    "data_format": "Geobat NE complet (DXF)"
                }
            ]
        }
        # Check price is PENDIND and no price is given
        url = reverse('order-detail', kwargs={'pk':order_id})
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.data['processing_fee'], '0.00', 'Check price is 0')
        self.assertEqual(response.data['total_without_vat'], '0.00', 'Check price is 0')
        url = reverse('order-confirm', kwargs={'pk':order_id})
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED, response.content)


    def test_patch_put_order_items(self):
        url = reverse('order-list')
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token)
        response = self.client.post(url, self.order_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        self.assertEqual(response.data['status'], Order.OrderStatus.DRAFT, 'status is DRAFT')
        order_id = response.data['id']
        # PATCH order with a product
        data1 = {
            "items": [
                {
                    "product": "Maquette 3D"
                }
            ]
        }
        url = reverse('order-detail', kwargs={'pk':order_id})
        response = self.client.patch(url, data1, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.data['status'], Order.OrderStatus.DRAFT, 'status is DRAFT')
        self.assertEqual(len(response.data['items']), 1, 'One product is present')
        data2 = {
            "items": [
                {
                    "product": "Maquette 3D"
                },{
                    "product": "MO - Cadastre complet (Format A4-A3-A2-A1-A0)"
                }
            ]
        }
        response = self.client.patch(url, data2, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(len(response.data['items']), 2, 'Two products are present')
        response = self.client.patch(url, data1, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(len(response.data['items']), 2, 'Two products are still present')
        response = self.client.put(url, self.order_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(len(response.data['items']), 0, 'No product is present')


    def test_delete_order(self):
        url = reverse('order-list')
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token)
        response = self.client.post(url, self.order_data, format='json')
        order = Order.objects.get(pk=response.data['id'])
        oi1 = OrderItem.objects.create(order=order, product=self.products[0], data_format=self.formats[0])
        oi2 = OrderItem.objects.create(order=order, product=self.products[1], data_format=self.formats[1])
        oi1.set_price()
        oi1.save()
        oi2.set_price(price=Money(400, 'CHF'), base_fee=Money(150, 'CHF'))
        oi2.price_status = OrderItem.PricingStatus.CALCULATED
        oi2.save()
        url = reverse('order-detail', kwargs={'pk':order.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT, response.content)


    def test_order_geom_is_valid(self):
        url = reverse('order-list')
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token)
        self.order_data['geom'] = {
            'type': 'Polygon',
            'coordinates': [
                [[2545488, 1203070],
                 [2545605, 1211390],
                 [2557441, 1202601],
                 [2557089, 1210921],
                 [2545488, 1203070]]
            ]}
        response = self.client.post(url, self.order_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        self.assertEqual(len(mail.outbox), 1, 'An email has been sent to admins')
