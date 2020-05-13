from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils.decorators import method_decorator
from django.views.decorators.debug import sensitive_post_parameters
from django.utils.translation import gettext_lazy as _

from rest_framework import filters, generics, views, viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from allauth.account.views import ConfirmEmailView

from .models import (
    Copyright, Document, Format, Identity, Metadata, MetadataContact,
    Order, OrderItem, OrderType, Pricing, Product,
    ProductFormat)

from .serializers import (
    CopyrightSerializer, DocumentSerializer, FormatSerializer,
    IdentitySerializer, MetadataIdentitySerializer,
    MetadataSerializer, MetadataContactSerializer, OrderDigestSerializer,
    OrderSerializer, OrderItemSerializer, OrderTypeSerializer,
    PasswordResetSerializer, PasswordResetConfirmSerializer,
    PricingSerializer, ProductSerializer,
    ProductFormatSerializer, RegisterSerializer,
    VerifyEmailSerializer)

from .filters import FullTextSearchFilter

from .permissions import IsOwner

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


class CurrentUserView(views.APIView):
    """
    API endpoint that allows users to register.
    """
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request, *args, **kwargs):
        ser = IdentitySerializer(request.user, context={'request': request})
        return Response(ser.data)

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
        return Identity.objects.filter(Q(id=user.id) | Q(is_public=True))


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
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


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

    @action(detail=False, methods=['get'])
    def last_draft(self, request):
        """
        Returns the last saved order having a "DRAFT" status. If there's no DRAFT, returns a 204.
        """
        user = self.request.user
        last_draft = Order.objects.filter(client_id=user.id, status=Order.OrderStatus.DRAFT).first()
        if last_draft:
            serializer = OrderSerializer(last_draft, context={'request': request})
            return Response(serializer.data)
        return Response(status=status.HTTP_204_NO_CONTENT)


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


class ProductViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Product to be viewed or edited.
    
    You can search a product with `?search=` param.
    Searchable properties are:
     - label
    """
    queryset = Product.objects.all()
    filter_backends = (FullTextSearchFilter,)
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    ts_field = 'ts'


class RegisterView(generics.CreateAPIView):
    """
    API endpoint that allows users to register.
    """
    queryset = UserModel.objects.all().order_by('-date_joined')
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


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
