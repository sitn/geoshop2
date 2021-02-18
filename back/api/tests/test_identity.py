from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

UserModel = get_user_model()

class ItentityViewsTests(APITestCase):
    """
    Test Identities
    """

    def setUp(self):
        self.userPublic = UserModel.objects.create_user(
            username="public_user",
            password="testPa$$word",
        )
        self.userPublic.identity.is_public = True
        self.userPublic.identity.save()
        self.userPrivate = UserModel.objects.create_user(
            username="private_user",
            password="testPa$$word",
        )

    def test_view_public(self):
        """
        Tests that only public identities are visible
        """
        url = reverse('identity-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.data['count'], 1, 'Only one public identity is visible')

    def test_view_private(self):
        self.client.login(username='private_user', password='testPa$$word')
        url = reverse('identity-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.data['count'], 2, 'The two identities are visible')

