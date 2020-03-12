from django.contrib.auth.models import User, Group
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
from rest_framework import viewsets
from api.serializers import (
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


class GroupViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows groups to be viewed or edited.
    """
    queryset = Group.objects.all()
    serializer_class = GroupSerializer


class CopyrightViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Copyright to be viewed or edited.
    """
    queryset = Copyright.objects.all()
    serializer_class = CopyrightSerializer


class DocumentViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Document to be viewed or edited.
    """
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer


class FormatViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Format to be viewed or edited.
    """
    queryset = Format.objects.all()
    serializer_class = FormatSerializer


class IdentityViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Identity to be viewed or edited.
    """
    queryset = Identity.objects.all()
    serializer_class = IdentitySerializer


class MetadataViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Metadata to be viewed or edited.
    """
    queryset = Metadata.objects.all()
    serializer_class = MetadataSerializer


class OrderViewSet(MultiSerializerViewSet):
    """
    API endpoint that allows Orders to be viewed or edited.
    """
    queryset = Order.objects.all()
    serializers = {
        'default':  OrderSerializer,
        'list':    OrderDigestSerializer,
    }


class OrderItemViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows OrderItem to be viewed or edited.
    """
    queryset = OrderItem.objects.all()
    serializer_class = OrderItemSerializer


class OrderTypeViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows OrderType to be viewed or edited.
    """
    queryset = OrderType.objects.all()
    serializer_class = OrderTypeSerializer


class PricingViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Pricing to be viewed or edited.
    """
    queryset = Pricing.objects.all()
    serializer_class = PricingSerializer


class ProductViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Product to be viewed or edited.
    """
    queryset = Product.objects.all()
    serializer_class = ProductSerializer


class ProductFormatViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows ProductFormat to be viewed or edited.
    """
    queryset = ProductFormat.objects.all()
    serializer_class = ProductFormatSerializer
