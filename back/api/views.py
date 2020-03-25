from django.contrib.auth.models import User, Group
from rest_framework import routers
from .models import (
    Copyright,
    Document, 
    Format,
    Identity,
    Metadata,
    Order,
    OrderItem,
    OrderType,
    Pricing,
    Product,
    ProductFormat)
from rest_framework import viewsets, permissions
from rest_framework.views import APIView
from .serializers import (
    CopyrightSerializer,
    DocumentSerializer, 
    FormatSerializer,
    IdentitySerializer,
    MetadataSerializer,
    OrderDigestSerializer,
    OrderSerializer,
    OrderItemSerializer,
    OrderTypeSerializer,
    PricingSerializer,
    ProductSerializer,
    ProductFormatSerializer,
    UserSerializer, GroupSerializer)
from .permissions import IsOwner

class APIRootView(routers.APIRootView):
    """
    The available ressources are listed below. These are special ressources:

    [/token](/token): JWT generation

    [/token/refresh](/token/refresh): JWT refresh
    """

from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.pagination import LimitOffsetPagination


class MultiSerializerViewSet(viewsets.ModelViewSet):
    serializers = { 
        'default': None,
    }

    def get_serializer_class(self):
            return self.serializers.get(self.action,
                        self.serializers['default'])


class UserViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows users to be viewed or edited.
    """
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]


class GroupViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows groups to be viewed or edited.
    """
    queryset = Group.objects.all()
    serializer_class = GroupSerializer
    permission_classes = [permissions.IsAdminUser]


class CopyrightViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Copyright to be viewed or edited.
    """
    queryset = Copyright.objects.all()
    serializer_class = CopyrightSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class DocumentViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Document to be viewed or edited.
    """
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class FormatViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Format to be viewed or edited.
    """
    queryset = Format.objects.all()
    serializer_class = FormatSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class IdentityViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Identity to be viewed or edited.
    """
    queryset = Identity.objects.all()
    serializer_class = IdentitySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class MetadataViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Metadata to be viewed or edited.
    """
    queryset = Metadata.objects.all()
    serializer_class = MetadataSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class OrderViewSet(MultiSerializerViewSet):
    """
    API endpoint that allows Orders to be viewed or edited.
    """
    queryset = Order.objects.all()
    serializers = {
        'default':  OrderSerializer,
        'list':    OrderDigestSerializer,
    }
    permission_classes = [IsOwner]


class OrderItemViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows OrderItem to be viewed or edited.
    """
    queryset = OrderItem.objects.all()
    serializer_class = OrderItemSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class OrderTypeViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows OrderType to be viewed or edited.
    """
    queryset = OrderType.objects.all()
    serializer_class = OrderTypeSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class PricingViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Pricing to be viewed or edited.
    """
    queryset = Pricing.objects.all()
    serializer_class = PricingSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class ProductViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Product to be viewed or edited.
    """
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class ProductFormatViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows ProductFormat to be viewed or edited.
    """
    queryset = ProductFormat.objects.all()
    serializer_class = ProductFormatSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
