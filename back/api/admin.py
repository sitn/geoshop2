from django import forms
from django.conf import settings
from django.db import models
from django.contrib import messages
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth import get_user_model
from django.contrib.gis import admin
from django.http import HttpResponseRedirect
from django.utils.translation import gettext_lazy as _

from .helpers import send_geoshop_email
from .models import (
    Contact,
    Copyright,
    Document,
    DataFormat,
    Identity,
    Metadata,
    MetadataContact,
    Order,
    OrderItem,
    Pricing,
    Product,
    ProductFormat)

UserModel = get_user_model()

class CustomModelAdmin(admin.ModelAdmin):
    """
    This is just a cosmetic class adding custom CSS and Replacing CharField Widget by
    a TextField widget when Charfields are longer than 300 characters.
    """
    class Media:
        css = {
            'all': (settings.STATIC_URL + 'api/admin-extra.css ',)
        }

    def formfield_for_dbfield(self, db_field, **kwargs):
        formfield = super(CustomModelAdmin, self).formfield_for_dbfield(db_field, **kwargs)
        if isinstance(db_field, models.CharField):
            if db_field.max_length > 300:
                formfield.widget.attrs['rows'] = 5
                formfield.widget = forms.Textarea(attrs=formfield.widget.attrs)
        return formfield


class IdentityInline(admin.StackedInline):
    model = Identity


class MetadataContactInline(admin.StackedInline):
    raw_id_fields = ['contact_person']
    model = MetadataContact
    extra = 1


class MetadataAdmin(CustomModelAdmin):
    inlines = [MetadataContactInline]
    raw_id_fields = ['modified_user', 'documents']
    search_fields = ['name', 'id_name']
    list_display = ('id_name', 'name')
    readonly_fields = ('image_tag', 'legend_tag', 'documents', 'copyright')

    def get_form(self, request, obj=None, change=False, **kwargs):
        form = super(MetadataAdmin, self).get_form(request, obj, change, **kwargs)
        form.base_fields['modified_user'].initial = request.user.id
        return form


class OrderItemInline(admin.StackedInline):
    raw_id_fields = ['product']
    model = OrderItem
    extra = 0


class OrderAdmin(admin.OSMGeoAdmin):
    change_form_template = 'admin/api/order_change_form.html'
    inlines = [OrderItemInline]
    raw_id_fields = ['client']
    map_template = 'admin/gis/osm.html'
    ordering = ['-id']
    actions = ['quote']
    list_filter = ['status',]

    def response_change(self, request, obj):
        if "_quote-done" in request.POST:
            obj.save()
            is_quote_ok = obj.quote_done()
            if is_quote_ok:
                self.message_user(
                    request,
                    _("Quote has been successfully done and an email has been sent to client"))
            else:
                self.message_user(
                    request,
                    _("Order prices cannot be calculated! Client will not be notified!"), messages.ERROR)
            redirect_url = request.path
            return HttpResponseRedirect(redirect_url)
        return super().response_change(request, obj)


class ProductAdmin(CustomModelAdmin):
    raw_id_fields = ('metadata', 'group')
    exclude = ('ts',)
    search_fields = ['label']
    list_filter = ('status',)
    readonly_fields = ('thumbnail_tag',)


class AbstractIdentityAdmin(CustomModelAdmin):
    list_display = ['last_name', 'first_name', 'company_name', 'email']
    search_fields = ['first_name', 'last_name', 'company_name', 'email']


class PricingAdmin(CustomModelAdmin):
    list_display = ['id', 'name']


class UserAdmin(BaseUserAdmin):
    """Overrides BaseUserAdmin"""
    search_fields = ['username', 'identity__first_name', 'identity__last_name', 'identity__email']
    list_display = ['username', 'identity_first_name', 'identity_last_name', 'identity_email']
    inlines = [IdentityInline]
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        (_('Permissions'), {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        (_('Important dates'), {'fields': ('last_login', 'date_joined')}),
    )

    def identity_first_name(self, user):
        return user.identity.first_name

    def identity_last_name(self, user):
        return user.identity.last_name

    def identity_email(self, user):
        return user.identity.email

    def response_change(self, request, obj):
        if "_register-done" in request.POST:
            obj.save()
            if obj.is_active:
                send_geoshop_email(
                    _('Registration confirmation'),
                    recipient=obj.identity,
                    template_name='email_user_confirm',
                    template_data={
                        'messages': [_('Your account has been registered successfully.')]
                    }
                )
                self.message_user(
                    request,
                    _("User is registered and an email has been sent to client"))
            else:
                self.message_user(
                    request,
                    _("User is not active yet! Client will not be notified!"), messages.ERROR)
            redirect_url = request.path
            return HttpResponseRedirect(redirect_url)
        return super().response_change(request, obj)

admin.site.unregister(UserModel)
admin.site.register(UserModel, UserAdmin)

admin.site.register(Copyright)
admin.site.register(Document)
admin.site.register(DataFormat)
admin.site.register(Identity, AbstractIdentityAdmin)
admin.site.register(Contact, AbstractIdentityAdmin)
admin.site.register(Metadata, MetadataAdmin)
admin.site.register(MetadataContact)
admin.site.register(Order, OrderAdmin)
admin.site.register(OrderItem)
admin.site.register(Pricing, PricingAdmin)
admin.site.register(Product, ProductAdmin)
admin.site.register(ProductFormat)
