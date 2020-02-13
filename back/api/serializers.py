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

from rest_framework import serializers
from rest_framework_gis.serializers import GeoModelSerializer


class UserSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = User
        fields = ['url', 'username', 'email', 'groups']


class GroupSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Group
        fields = ['url', 'name']


class CopyrightSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Copyright
        fields = '__all__'


class DocumentSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Document
        fields = '__all__'


class FormatSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Format
        fields = '__all__'


class OrderTypeSerializer(GeoModelSerializer):
    class Meta:
        model = OrderType
        fields = '__all__'


class IdentitySerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Identity
        fields = '__all__'


class MetadataSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Metadata
        fields = '__all__'


class OrderSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Order
        fields = '__all__'


class OrderItemSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = OrderItem
        fields = '__all__'


class PricingSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Pricing
        fields = '__all__'


class ProductSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'


class ProductFormatSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = ProductFormat
        fields = '__all__'
