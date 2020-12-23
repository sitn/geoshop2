from pathlib import Path
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.debug import sensitive_post_parameters
from django.utils.translation import gettext_lazy as _

from rest_framework import filters, generics, views, viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import MultiPartParser

from allauth.account.views import ConfirmEmailView

from .models import (
    Contact, Copyright, Document, DataFormat, Identity, Metadata, MetadataContact,
    Order, OrderItem, OrderType, Pricing, Product,
    ProductFormat, UserChange)

from .serializers import (
    ContactSerializer, CopyrightSerializer, DocumentSerializer, DataFormatSerializer,
    ExtractOrderSerializer,
    ExtractOrderItemSerializer, UserIdentitySerializer, MetadataIdentitySerializer,
    MetadataSerializer, MetadataContactSerializer, OrderDigestSerializer,
    OrderSerializer, OrderItemSerializer, OrderTypeSerializer,
    PasswordResetSerializer, PasswordResetConfirmSerializer,
    PricingSerializer, ProductSerializer, ProductDigestSerializer,
    ProductFormatSerializer, RegisterSerializer, UserChangeSerializer,
    VerifyEmailSerializer)

from .helpers import send_email_to_admin, send_email_to_identity

from .faker import generate_fake_order
from .filters import FullTextSearchFilter

from .permissions import ExtractGroupPermission

sensitive_post_parameters_m = method_decorator(
    sensitive_post_parameters(
        'password', 'old_password', 'new_password1', 'new_password2'
    )
)

UserModel = get_user_model()


class CopyrightViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Copyright to be viewed or edited.
    """
    queryset = Copyright.objects.all()
    serializer_class = CopyrightSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class ContactViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Contacts to be viewed, searched or edited.
    """
    search_fields = ['first_name', 'last_name', 'company_name']
    filter_backends = [filters.SearchFilter]
    serializer_class = ContactSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Contact.objects.filter(belongs_to=user.id)


class CurrentUserView(views.APIView):
    """
    API endpoint that allows users to register.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        ser = UserIdentitySerializer(user, context={'request': request})
        return Response(ser.data)


class DocumentViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Document to be viewed or edited.
    """
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class DataFormatViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Format to be viewed or edited.
    """
    queryset = DataFormat.objects.all()
    serializer_class = DataFormatSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class IdentityViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Identity to be viewed.
    Only retrieves the current user or "public" identities.
    Authentication is mandatory to access this ressource.

    You can search an identity with `?search=` param.
    Searchable properties are:
     - email
    """
    search_fields = ['email']
    filter_backends = [filters.SearchFilter]
    serializer_class = MetadataIdentitySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        return Identity.objects.filter(Q(user_id=user.id) | Q(is_public=True))


class MetadataViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Metadata to be viewed or edited.
    """
    queryset = Metadata.objects.all()
    serializer_class = MetadataSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_serializer_context(self):
        context = super(MetadataViewSet, self).get_serializer_context()
        context.update({"request": self.request})
        return context


class MetadataContactViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows MetadataContact to be viewed or edited.
    """
    queryset = MetadataContact.objects.all()
    serializer_class = MetadataContactSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class MultiSerializerViewSet(viewsets.ModelViewSet):
    serializers = {
        'default': None,
    }

    def get_serializer_class(self):
        return self.serializers.get(self.action,
                                    self.serializers['default'])


class OrderItemViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows OrderItem to be viewed or edited.
    """
    queryset = OrderItem.objects.all()
    serializer_class = OrderItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return OrderItem.objects.filter(order__client_id=user.id)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        order = instance.order
        response = super(OrderItemViewSet, self).destroy(request, *args, **kwargs)
        order.set_price()
        return response

    @action(detail=True, methods=['get'])
    def download_link(self, request, pk=None):
        """
        Returns the download link
        """
        instance = self.get_object()
        if instance.extract_result:
            instance.last_download = timezone.now()
            instance.save()
            file_url = getattr(settings, 'DOCUMENT_BASE_URL') + getattr(
                settings, 'FORCE_SCRIPT_NAME') + instance.extract_result.url
            if Path(settings.MEDIA_ROOT, instance.extract_result.name).is_file():
                return Response({
                    'download_link' : file_url})
            return Response(
                {"detail": _("Zip does not exist")},
                status=status.HTTP_204_NO_CONTENT)
        return Response(status=status.HTTP_404_NOT_FOUND)


class OrderTypeViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows OrderType to be viewed or edited.
    """
    queryset = OrderType.objects.all()
    serializer_class = OrderTypeSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class OrderViewSet(MultiSerializerViewSet):
    """
    API endpoint that allows Orders to be viewed or edited.
    Only orders that belong to current authenticated user are shown.

    You can search an order with `?search=` param.
    Searchable properties are:
     - title
     - description

    `PUT` or `PATCH` on the items property will behave the same.
    The route will check for each product name if is is already present in existing items list.
    If yes, no action is taken, if no, product is added.
    If an existing product is present in the list of items but the
    `PUT` or `PATCH` data doesn't mention it, then the existing item is deleted.

    To modify or delete an existing item, please use `/orderitem/` endpoint.
    """
    search_fields = ['title', 'description']
    filter_backends = [filters.SearchFilter]
    serializers = {
        'default':  OrderSerializer,
        'list':    OrderDigestSerializer,
    }
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Order.objects.filter(client_id=user.id)

    def update(self, request, pk=None, *args, **kwargs):
        queryset = self.get_queryset()
        order = get_object_or_404(queryset, pk=pk)
        if order.status == Order.OrderStatus.DRAFT:
            return super(OrderViewSet, self).update(request, pk, *args, **kwargs)
        raise PermissionDenied(detail='Order status is not DRAFT.')

    @action(detail=False, methods=['get'])
    def last_draft(self, request):
        """
        Returns the last saved order having a "DRAFT" status. If there's no DRAFT, returns a 204.
        """
        user = self.request.user
        last_draft = Order.objects.filter(client_id=user.id, status=Order.OrderStatus.DRAFT).first()
        if last_draft:
            serializer = OrderSerializer(last_draft, context={'request': request}, partial=True)
            return Response(serializer.data)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'])
    def confirm(self, request, pk=None):
        """
        Confirms order meaning it can not be edited anymore by user.
        """
        order = self.get_object()
        if order.status not in [Order.OrderStatus.DRAFT, Order.OrderStatus.PENDING]:
            raise PermissionDenied(detail='Order status is not DRAFT or PENDING')
        items = order.items.all()
        if not items:
            raise ValidationError(detail="This order has no item")
        for item in items:
            if not item.data_format:
                raise ValidationError(detail="One or more items don't have data_format")
        order.confirm()
        order.save()
        return Response(status=status.HTTP_202_ACCEPTED)

    @action(detail=True, methods=['get'])
    def download_link(self, request, pk=None):
        """
        Returns the download link
        """
        instance = self.get_object()
        if instance.extract_result:
            for item in instance.items.all():
                item.last_download = timezone.now()
                item.save()
            file_url = getattr(settings, 'DOCUMENT_BASE_URL') + getattr(
                settings, 'FORCE_SCRIPT_NAME') + instance.extract_result.url
            if Path(settings.MEDIA_ROOT, instance.extract_result.name).is_file():
                return Response({
                    'download_link' : file_url})
            return Response(
                {"detail": _("Full zip is not ready")},
                status=status.HTTP_204_NO_CONTENT)
        return Response(status=status.HTTP_404_NOT_FOUND)


class ExtractOrderFake(views.APIView):
    """
    Generates a fake order for testing purposes
    """
    permission_classes = [ExtractGroupPermission]

    def get(self, request):
        """
        Generates a fake order for testing purposes
        """
        generate_fake_order()
        return Response(
            {"detail": _("Fake orders have been generated")},
            status=status.HTTP_201_CREATED)



class ExtractOrderView(generics.ListAPIView):
    """
    API endpoint that allows Orders to be fetched by Extract
    """
    serializer_class = ExtractOrderSerializer
    permission_classes = [ExtractGroupPermission]
    queryset = Order.objects.filter(status=Order.OrderStatus.READY).all()
    pagination_class = None

    def get(self, request, *args, **kwargs):
        """
        Once fetched by extract, status changes
        """
        data = self.list(request, *args, **kwargs)
        self.queryset.update(status=Order.OrderStatus.IN_EXTRACT)
        return data


class ExtractOrderItemView(generics.UpdateAPIView):
    """
    API endpoint that allows Orders to be fetched by Extract
    """
    parser_classes = [MultiPartParser]
    serializer_class = ExtractOrderItemSerializer
    permission_classes = [ExtractGroupPermission]
    queryset = OrderItem.objects.all()
    http_method_names = ['put']

    def put(self, request, *args, **kwargs):
        """Only allows to upload a file and destroys existing one"""
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            instance = self.get_object()
            serializer.update(instance, serializer.validated_data)
            return Response(
                {"detail": _("File has been uploaded.")},
                status=status.HTTP_202_ACCEPTED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Copy from dj-rest-auth
class PasswordResetView(generics.GenericAPIView):
    """
    <b>SMTP Server needs to be configured before using this route</b>

    Returns the success/fail message.
    """
    serializer_class = PasswordResetSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        # Create a serializer with request.data
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        serializer.save()
        # Return the success message with OK HTTP status
        return Response(
            {"detail": _("Password reset e-mail has been sent.")},
            status=status.HTTP_200_OK
        )


# Copy from dj-rest-auth
class PasswordResetConfirmView(generics.GenericAPIView):
    """
    Password reset e-mail link is confirmed, therefore
    this resets the user's password.
    Accepts the following POST parameters: token, uid,
        new_password1, new_password2
    Returns the success/fail message.
    """
    serializer_class = PasswordResetConfirmSerializer
    permission_classes = [permissions.AllowAny]

    @sensitive_post_parameters_m
    def dispatch(self, *args, **kwargs):
        return super(PasswordResetConfirmView, self).dispatch(*args, **kwargs)

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"detail": _("Password has been reset with the new password.")}
        )


class ProductFormatViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows ProductFormat to be viewed or edited.
    """
    queryset = ProductFormat.objects.all()
    serializer_class = ProductFormatSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class ProductViewSet(MultiSerializerViewSet):
    """
    API endpoint that allows Product to be viewed or edited.

    You can search a product with `?search=` param.
    Searchable properties are:
     - label
    """
    querysets = {
        'default': Product.objects.all(),
        'list': Product.objects.filter(status=Product.ProductStatus.PUBLISHED)
    }
    filter_backends = (FullTextSearchFilter,)
    serializers = {
        'default':  ProductSerializer,
        'list':    ProductDigestSerializer,
    }
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    ts_field = 'ts'

    def get_queryset(self):
        return self.querysets.get(self.action, self.querysets['default'])


class PricingViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Pricing to be viewed or edited.
    """
    queryset = Pricing.objects.all()
    serializer_class = PricingSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class RegisterView(generics.CreateAPIView):
    """
    API endpoint that allows users to register.
    """
    queryset = UserModel.objects.all().order_by('-date_joined')
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class UserChangeView(generics.CreateAPIView):
    """
    API endpoint that allows users to submit profile changes.
    The changes are stored in a DB table and an email is
    sent to the admins.
    """
    queryset = UserChange.objects.all()
    serializer_class = UserChangeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):

        request.data['client'] = request.user.id

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        id_ = obj.id

        context = ({
            'id': id_,
            'username': request.user.username,
            'modified': {}
        })

        base_user = Identity.objects.values().get(user_id=request.user.id)

        for key in request.data:
            if key in base_user:
                request_value = request.data[key]
                if request_value != base_user[key]:
                    context['modified'][_(key)] = request_value

        lang = getattr(settings, 'LANGUAGE_CODE')
        admin_text_content = render_to_string('change_user_admin_email_'+lang+'.txt', context, request=request)
        text_content = render_to_string('change_user_email_'+lang+'.txt', context, request=request)

        send_email_to_admin(_('Geoshop - User change request'), admin_text_content)
        send_email_to_identity(_('Geoshop - User change request'), text_content, request.user.identity)

        return Response({'detail': _('Your data was successfully submitted')}, status=status.HTTP_200_OK)


class VerifyEmailView(views.APIView, ConfirmEmailView):
    permission_classes = (permissions.AllowAny,)
    allowed_methods = ('POST', 'OPTIONS', 'HEAD')

    def get_serializer(self, *args, **kwargs):
        return VerifyEmailSerializer(*args, **kwargs)

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.kwargs['key'] = serializer.validated_data['key']
        confirmation = self.get_object()
        confirmation.confirm(self.request)
        return Response({'detail': _('ok')}, status=status.HTTP_200_OK)
