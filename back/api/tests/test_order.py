from django.urls import reverse
from django.core import mail

from djmoney.money import Money
from rest_framework import status
from rest_framework.test import APITestCase
from api.models import Contact, OrderItem, Order, Metadata, Product
from api.tests.factories import BaseObjectsFactory


class OrderTests(APITestCase):
    """
    Test Orders
    """

    def setUp(self):
        self.config = BaseObjectsFactory(self.client)
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
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.config.client_token)
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
                "product": "Produit gratuit"}]
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
                "product": "Produit forfaitaire"}]
        }
        url = reverse('order-detail', kwargs={'pk':order_id})
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, response.content)
        response = self.client.delete(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, response.content)


    def test_post_order_quote(self):
        # POST an order
        url = reverse('order-list')
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.config.client_token)
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
        self.config.user_private.identity.subscribed = True
        self.config.user_private.identity.save()
        self.order_data['order_type'] = 'Utilisateur permanent'

        url = reverse('order-list')
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.config.client_token)
        response = self.client.post(url, self.order_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        order_id = response.data['id']

        data = {
            "items": [
                {
                    "product": "MO",
                    "data_format": "Geobat NE complet (DXF)"
                }
            ]
        }
        # Check price is 0
        url = reverse('order-detail', kwargs={'pk':order_id})
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.data['processing_fee'], '0.00', 'Check price is 0')
        self.assertEqual(response.data['total_without_vat'], '0.00', 'Check price is 0')
        url = reverse('order-confirm', kwargs={'pk':order_id})
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED, response.content)
        order = Order.objects.get(pk=order_id)
        self.assertIsNotNone(order.download_guid, "Check order has a GUID")
        self.assertIsNotNone(order.date_ordered, "Check order has a date")

    def test_post_order_contact_subscribed(self):
        self.config.contact.subscribed = True
        self.config.contact.save()
        self.order_data['invoice_contact'] = self.config.contact.id
        self.order_data['order_type'] = 'Utilisateur permanent'

        url = reverse('order-list')
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.config.client_token)
        response = self.client.post(url, self.order_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        order_id = response.data['id']

        data = {
            "items": [
                {
                    "product": "MO",
                    "data_format": "Geobat NE complet (DXF)"
                }
            ]
        }
        # Check price is 0
        url = reverse('order-detail', kwargs={'pk':order_id})
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.data['processing_fee'], '0.00', 'Check price is 0')
        self.assertEqual(response.data['total_without_vat'], '0.00', 'Check price is 0')
        url = reverse('order-confirm', kwargs={'pk':order_id})
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED, response.content)
        order = Order.objects.get(pk=order_id)
        self.assertIsNotNone(order.download_guid, "Check order has a GUID")
        self.assertIsNotNone(order.date_ordered, "Check order has a date")


    def test_patch_put_order_items(self):
        url = reverse('order-list')
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.config.client_token)
        response = self.client.post(url, self.order_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        self.assertEqual(response.data['status'], Order.OrderStatus.DRAFT, 'status is DRAFT')
        order_id = response.data['id']
        # PATCH order with a product
        data1 = {
            "items": [
                {
                    "product": "Produit forfaitaire"
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
                    "product": "Produit forfaitaire"
                },{
                    "product": "Produit gratuit"
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
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.config.client_token)
        response = self.client.post(url, self.order_data, format='json')
        order = Order.objects.get(pk=response.data['id'])
        oi1 = OrderItem.objects.create(order=order, product=self.config.products['free'], data_format=self.config.formats['geobat'])
        oi2 = OrderItem.objects.create(order=order, product=self.config.products['single'], data_format=self.config.formats['rhino'])
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
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.config.client_token)
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


    def test_order_item_validation(self):
        """
        Tests email is sent when a product needs validation
        """
        url = reverse('order-list')
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.config.client_token)
        self.order_data['order_type'] = 'Utilisateur permanent'
        response = self.client.post(url, self.order_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        order_id = response.data['id']

        approval_needed_metadata = Metadata.objects.create(
            id_name='01_approval_generic',
            modified_user=self.config.user_private,
            accessibility=Metadata.MetadataAccessibility.APPROVAL_NEEDED
        )
        approval_needed_metadata.contact_persons.set([
            self.config.user_private.identity
        ])
        approval_needed_metadata.save()

        Product.objects.create(
            label="Données sensibles",
            pricing=self.config.pricings['free'],
            metadata=approval_needed_metadata,
            status=Product.ProductStatus.PUBLISHED,
            provider=self.config.provider
        )

        data = {
            "items": [
                {
                    "product": "Données sensibles",
                    "data_format": "DXF"
                },
                {
                    "product": "MO",
                    "data_format": "Geobat NE complet (DXF)"
                }
            ]
        }
        url = reverse('order-detail', kwargs={'pk': order_id})
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        url = reverse('order-confirm', kwargs={'pk': order_id})
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED, response.content)
        self.assertEqual(len(mail.outbox), 2, 'An email has been sent to the validator and one to admin')
        order = Order.objects.get(pk=order_id)
        item = order.items.first()
        self.assertEqual(OrderItem.OrderItemStatus.VALIDATION_PENDING, item.status, 'Item is waiting for validation')
        self.assertGreater(len(item.token), 0, 'item has token')
        self.assertIsNotNone(order.download_guid, "Check order has a GUID")
        self.assertIsNotNone(order.date_ordered, "Check order has a date")

        url = reverse('orderitem_validate', kwargs={'token': item.token})
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        data = {
            "is_validated": True
        }
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED, response.content)
        order = Order.objects.get(pk=order_id)
        item = order.items.first()
        self.assertEqual(OrderItem.OrderItemStatus.PENDING, item.status, 'Item is ready for extraction')
