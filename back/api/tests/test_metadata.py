from django.urls import reverse
from django.contrib.auth.models import Group
from rest_framework import status
from rest_framework.test import APITestCase
from api.models import Metadata
from api.tests.factories import BaseObjectsFactory


class OrderTests(APITestCase):
    """
    Test Orders
    """

    def setUp(self):
        self.config = BaseObjectsFactory(self.client)

    def test_view_public(self):
        """
        Tests that only public Metadata is visible
        """
        url = reverse('metadata-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.data['count'], 1, 'Only one public metadata is visible')

    def test_view_private(self):
        self.config.user_private
        self.client.login(
            username=self.config.private_username,
            password=self.config.password
        )
        internal_group = Group.objects.get(name='internal')
        self.config.user_private.groups.add(internal_group)
        self.config.user_private.save()
        url = reverse('metadata-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.data['count'], 2, 'The two metadatas are visible')
