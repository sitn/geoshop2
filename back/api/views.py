import json
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

from rest_framework import filters, generics, views, viewsets, permissions, status, mixins
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.renderers import TemplateHTMLRenderer
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
LANG = getattr(settings, 'LANGUAGE_CODE')


class CopyrightViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows Copyright to be viewed.
    """
    queryset = Copyright.objects.all()
    serializer_class = CopyrightSerializer


class ContactViewSet(mixins.CreateModelMixin,
                     mixins.RetrieveModelMixin,
                     mixins.DestroyModelMixin,
                     mixins.ListModelMixin,
                     viewsets.GenericViewSet):
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


class DocumentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows Document to be viewed.
    """
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer


class DataFormatViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows Format to be viewed.
    """
    queryset = DataFormat.objects.all()
    serializer_class = DataFormatSerializer


class IdentityViewSet(viewsets.ReadOnlyModelViewSet):
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

    def get_queryset(self):
        user = self.request.user
        return Identity.objects.filter(Q(user_id=user.id) | Q(is_public=True))


class MetadataViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows Metadata to be viewed.
    """
    queryset = Metadata.objects.all()
    serializer_class = MetadataSerializer
    template_name = "metadata.html"
    lookup_field = 'id_name'

    @action(detail=True, renderer_classes=[TemplateHTMLRenderer])
    def html(self, request, *args, **kwargs):
        response = super(MetadataViewSet, self).retrieve(request, *args, **kwargs)
        response['Access-Control-Allow-Origin'] = '*'
        response['Content-Security-Policy'] = 'frame-ancestors *'
        return response

    def get_serializer_context(self):
        context = super(MetadataViewSet, self).get_serializer_context()
        context.update({"request": self.request})
        return context


class MetadataContactViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows MetadataContact to be viewed.
    """
    queryset = MetadataContact.objects.all()
    serializer_class = MetadataContactSerializer


class MultiSerializerMixin():
    serializers = {
        'default': None,
    }

    def get_serializer_class(self):
        return self.serializers.get(self.action,
                                    self.serializers['default'])


class OrderItemViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows OrderItem to be viewed.
    """
    serializer_class = OrderItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return OrderItem.objects.filter(order__client_id=user.id)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        order = instance.order
        if order.status not in [Order.OrderStatus.DRAFT, Order.OrderStatus.PENDING]:
            return Response(
                {"detail": _("This orderitem cannot be deleted anymore.")},
                status=status.HTTP_403_FORBIDDEN
            )
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
            if Path(settings.MEDIA_ROOT, instance.extract_result.name).is_file():
                return Response({
                    'download_link' : instance.extract_result.url})
            return Response(
                {"detail": _("Zip does not exist")},
                status=status.HTTP_200_OK)
        return Response(status=status.HTTP_404_NOT_FOUND)


class OrderTypeViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows OrderType to be viewed.
    """
    queryset = OrderType.objects.all()
    serializer_class = OrderTypeSerializer


class OrderViewSet(MultiSerializerMixin, viewsets.ModelViewSet):
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

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status != Order.OrderStatus.DRAFT:
            return Response(
                {"detail": _("This order cannot be deleted anymore.")},
                status=status.HTTP_403_FORBIDDEN
            )
        response = super(OrderViewSet, self).destroy(request, *args, **kwargs)
        return response

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
            if Path(settings.MEDIA_ROOT, instance.extract_result.name).is_file():
                return Response({
                    'download_link' : instance.extract_result.url})
            return Response(
                {"detail": _("Full zip is not ready")},
                status=status.HTTP_200_OK)
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
        response = self.list(request, *args, **kwargs)
        if response.data == []:
            return Response(status=status.HTTP_204_NO_CONTENT)
        self.queryset.update(status=Order.OrderStatus.IN_EXTRACT)
        return response


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
        """Allows to upload a file and destroys existing one or cancel orderitem"""
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            instance = self.get_object()
            serializer.update(instance, serializer.validated_data)
            return Response(status=status.HTTP_202_ACCEPTED)
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


class ProductFormatViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows ProductFormat to be viewed.
    """
    queryset = ProductFormat.objects.all()
    serializer_class = ProductFormatSerializer


class ProductViewSet(MultiSerializerMixin, viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows Product to be viewed.

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
    ts_field = 'ts'

    def get_queryset(self):
        return self.querysets.get(self.action, self.querysets['default'])


class PricingViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows Pricing to be viewed.
    """
    queryset = Pricing.objects.all()
    serializer_class = PricingSerializer


class RegisterView(generics.CreateAPIView):
    """
    API endpoint that allows users to register.
    """
    queryset = UserModel.objects.all().order_by('-date_joined')
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        response = super(RegisterView, self).post(request, *args, **kwargs)
        user = UserModel.objects.get(pk=response.data['id'])
        user.is_active = False
        user.save()

        admin_text_content = json.dumps(response.data)
        text_content = render_to_string('create_user_email_' + LANG + '.txt', request=request)

        send_email_to_admin(_('Geoshop - New user request'), admin_text_content)
        send_email_to_identity(_('Geoshop - New account pending'), text_content, user.identity)

        return Response({'detail': _('Your data was successfully submitted')}, status=status.HTTP_200_OK)


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

        admin_text_content = render_to_string('change_user_admin_email_' + LANG + '.txt', context, request=request)
        text_content = render_to_string('change_user_email_' + LANG + '.txt', context, request=request)

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


class VerifyUsernameView(views.APIView):
    """
    Verifies if username is available
    """
    permission_classes = [permissions.AllowAny]
    allowed_methods = ['GET']

    #TODO
    pass
