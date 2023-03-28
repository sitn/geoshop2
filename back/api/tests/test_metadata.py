from django.urls import reverse
from django.contrib.auth.models import Group
from rest_framework import status
from rest_framework.test import APITestCase
from api.tests.factories import BaseObjectsFactory
from django.contrib.auth.models import Permission

class MetadataTests(APITestCase):
    """
    Test Metadata
    """

    def setUp(self):
        self.config = BaseObjectsFactory()

    def test_view_public(self):
        """
        Tests that only public Metadata is visible
        """
        url = reverse('metadata-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.data['count'], 1, 'Only one public metadata is visible')

    def test_view_private(self):
        self.client.login(
            username=self.config.private_username,
            password=self.config.password
        )
        internal_group = Group.objects.get(name='internal')
        permission = Permission.objects.get(codename='view_internal')
        internal_group.permissions.add(permission)
        internal_group.save()
        self.config.user_private.groups.add(internal_group)
        self.config.user_private.save()
        self.assertEqual(self.config.user_private.has_perm('api.view_internal'), True)
        url = reverse('metadata-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.data['count'], 2, 'The two metadatas are visible')
