
from django.contrib import admin
from django.urls import include, path, re_path
from django.conf.urls import url
from django.views.generic import TemplateView
from api.routers import GeoshopRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView
)
from api import views
from django.utils.translation import gettext_lazy as _

admin.site.site_header = _("GeoShop Administration")
admin.site.site_title = _("GeoShop Admin")

router = GeoshopRouter()
router.register(r'contact', views.ContactViewSet, basename='contact')
router.register(r'copyright', views.CopyrightViewSet)
router.register(r'document', views.DocumentViewSet)
router.register(r'format', views.FormatViewSet)
router.register(r'identity', views.IdentityViewSet, basename='identity')
router.register(r'metadata', views.MetadataViewSet)
router.register(r'order', views.OrderViewSet, basename='order')
router.register(r'orderitem', views.OrderItemViewSet)
router.register(r'ordertype', views.OrderTypeViewSet)
router.register(r'product', views.ProductViewSet)
router.register(r'productformat', views.ProductFormatViewSet)
router.register(r'pricing', views.PricingViewSet)
router.register_additional_route_to_root('token', 'token_obtain_pair')
router.register_additional_route_to_root('token/refresh', 'token_refresh')
router.register_additional_route_to_root('token/verify', 'token_verify')
router.register_additional_route_to_root('auth/change', 'auth_change_user')
router.register_additional_route_to_root('auth/current', 'auth_current_user')
router.register_additional_route_to_root('auth/password', 'auth_password')
router.register_additional_route_to_root('auth/password/confirm', 'auth_password_confirm')
router.register_additional_route_to_root('auth/register', 'auth_register')

# Wire up our API using automatic URL routing.
# Additionally, we include login URLs for the browsable API.
urlpatterns = [
    # this url is used to generate email content
    re_path(r'^auth/reset/(?P<uidb64>[0-9A-Za-z_\-]+)/(?P<token>[0-9A-Za-z]{1,13}-[0-9A-Za-z]{1,20})/$',
            TemplateView.as_view(),
            name='password_reset_confirm'),
    path('auth/change/', views.UserChangeView.as_view(), name='auth_change_user'),
    path('auth/current/', views.CurrentUserView.as_view(), name='auth_current_user'),
    path('auth/password/', views.PasswordResetView.as_view(), name='auth_password'),
    path('auth/password/confirm', views.PasswordResetConfirmView.as_view(), name='auth_password_confirm'),
    path('auth/verify-email/', views.VerifyEmailView.as_view(), name='auth_verify_email'),
    re_path(r'^auth/account-confirm-email/(?P<key>[-:\w]+)/$', TemplateView.as_view(),
            name='account_confirm_email'),
    path('auth/register/', views.RegisterView.as_view(), name='auth_register'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('session-auth/', include('rest_framework.urls', namespace='rest_framework')),
    path('admin/', admin.site.urls, name='admin'),
    path('', include(router.urls)),
]
